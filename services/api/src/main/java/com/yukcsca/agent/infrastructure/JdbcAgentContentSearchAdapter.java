package com.yukcsca.agent.infrastructure;

import com.yukcsca.academic.application.PublishedLearningContextPort;
import com.yukcsca.academic.application.PublishedLearningContextPort.PublishedChunk;
import com.yukcsca.agent.application.AgentContentSearchPort;
import com.yukcsca.agent.domain.AgentContextType;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class JdbcAgentContentSearchAdapter implements AgentContentSearchPort {
  private static final Logger LOGGER = LoggerFactory.getLogger(JdbcAgentContentSearchAdapter.class);
  private static final int EMBEDDING_DIM = AgentProperties.EMBEDDING_DIMENSIONS;
  private static final Duration QUERY_EMBED_TIMEOUT = Duration.ofMillis(1500);
  private static final ExecutorService QUERY_EMBED_EXECUTOR =
      Executors.newThreadPerTaskExecutor(
          Thread.ofVirtual().name("agent-query-embed-", 0).factory());

  private final JdbcTemplate jdbc;
  private final PublishedLearningContextPort learning;
  private final ObjectProvider<EmbeddingModel> embeddings;
  private final Clock clock;
  private final TransactionTemplate requiresNew;
  private final Executor indexExecutor;
  private final Set<UUID> lexicalReady = ConcurrentHashMap.newKeySet();
  private final Set<UUID> embeddingsReady = ConcurrentHashMap.newKeySet();
  private final Set<UUID> embeddingInFlight = ConcurrentHashMap.newKeySet();
  private final ConcurrentHashMap<String, Set<String>> allowedKeys = new ConcurrentHashMap<>();

  public JdbcAgentContentSearchAdapter(
      JdbcTemplate jdbc,
      PublishedLearningContextPort learning,
      ObjectProvider<EmbeddingModel> embeddings,
      Clock clock,
      PlatformTransactionManager transactionManager,
      @Qualifier("agentContentIndexExecutor") Executor indexExecutor) {
    this.jdbc = jdbc;
    this.learning = learning;
    this.embeddings = embeddings;
    this.clock = clock;
    this.requiresNew = new TransactionTemplate(transactionManager);
    this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    this.indexExecutor = indexExecutor;
  }

  @Override
  public void ensureIndexed(UUID packageRevisionId) {
    if (packageRevisionId == null) return;
    if (!lexicalReady.contains(packageRevisionId)) {
      requiresNew.executeWithoutResult(status -> indexLexical(packageRevisionId));
    }
    scheduleEmbed(packageRevisionId);
  }

  @Override
  public void scheduleEnsureIndexed(UUID packageRevisionId) {
    if (packageRevisionId == null) return;
    if (lexicalReady.contains(packageRevisionId)) {
      if (!embeddingsReady.contains(packageRevisionId)) {
        scheduleEmbed(packageRevisionId);
      }
      return;
    }
    indexExecutor.execute(
        () -> {
          try {
            ensureIndexed(packageRevisionId);
          } catch (RuntimeException exception) {
            LOGGER.warn("agent.index.failed revisionId={}", packageRevisionId);
          }
        });
  }

  @Override
  public List<SearchHit> search(
      UUID packageRevisionId, String query, String explanationLanguage, int limit) {
    if (packageRevisionId == null || query == null || query.isBlank()) return List.of();
    String language =
        explanationLanguage == null || explanationLanguage.isBlank() ? "en" : explanationLanguage;
    int capped = Math.max(1, Math.min(limit, 8));
    Optional<EmbeddingModel> model = Optional.ofNullable(embeddings.getIfAvailable());
    String vector = null;
    if (model.isPresent() && hasStoredEmbeddings(packageRevisionId)) {
      vector = embedQueryOrNull(model.get(), query, packageRevisionId);
    }
    List<SearchHit> hits = new ArrayList<>();
    jdbc.query(
        """
        select source_kind, source_id, block_index, label, body, package_revision_id,
               ts_rank(search_tsv, websearch_to_tsquery('simple', ?)) as lex,
               case
                 when embedding is null or ? is null then 0
                 else 1 - (embedding <=> cast(? as vector))
               end as vec
          from agent_content_chunk
         where package_revision_id = ?
           and explanation_language = ?
           and (
             search_tsv @@ websearch_to_tsquery('simple', ?)
             or (? is not null and embedding is not null)
           )
         order by (
           0.5 * ts_rank(search_tsv, websearch_to_tsquery('simple', ?))
           + 0.5 * case
             when embedding is null or ? is null then 0
             else 1 - (embedding <=> cast(? as vector))
           end
         ) desc
         limit ?
        """,
        rs -> {
          while (rs.next()) {
            AgentContextType kind = parseKind(rs.getString("source_kind"));
            if (kind == null) continue;
            int block = rs.getInt("block_index");
            Integer blockIndex = rs.wasNull() ? null : block;
            double score = rs.getDouble("lex") + rs.getDouble("vec");
            hits.add(
                new SearchHit(
                    kind,
                    rs.getObject("source_id", UUID.class),
                    rs.getString("label"),
                    blockIndex,
                    rs.getObject("package_revision_id", UUID.class),
                    clip(rs.getString("body"), 600),
                    score));
          }
          return null;
        },
        query,
        vector,
        vector,
        packageRevisionId,
        language,
        query,
        vector,
        query,
        vector,
        vector,
        capped);
    return authoriseHits(packageRevisionId, language, hits);
  }

  private void indexLexical(UUID packageRevisionId) {
    Integer existing =
        jdbc.queryForObject(
            "select count(*) from agent_content_chunk where package_revision_id = ?",
            Integer.class,
            packageRevisionId);
    if (existing != null && existing > 0) {
      lexicalReady.add(packageRevisionId);
      return;
    }
    Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
    for (PublishedChunk chunk : learning.listPublishedChunks(packageRevisionId)) {
      jdbc.update(
          """
          insert into agent_content_chunk (
            id, package_id, package_revision_id, source_kind, source_id, block_index,
            explanation_language, label, body, search_tsv, embedding, created_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, to_tsvector('simple', ?), null, ?)
          on conflict do nothing
          """,
          UUID.randomUUID(),
          chunk.packageId(),
          chunk.packageRevisionId(),
          chunk.sourceKind(),
          chunk.sourceId(),
          chunk.blockIndex(),
          chunk.explanationLanguage(),
          clip(chunk.label(), 120),
          chunk.body(),
          chunk.body(),
          Timestamp.from(now));
    }
    lexicalReady.add(packageRevisionId);
  }

  private List<SearchHit> authoriseHits(
      UUID packageRevisionId, String language, List<SearchHit> hits) {
    if (hits.isEmpty()) return List.of();
    Set<String> allowed = allowedKeys(packageRevisionId, language);
    List<SearchHit> authorised = new ArrayList<>();
    for (SearchHit hit : hits) {
      if (allowed.contains(chunkKey(hit.sourceKind().name(), hit.sourceId(), hit.blockIndex()))) {
        authorised.add(hit);
      }
    }
    return List.copyOf(authorised);
  }

  private Set<String> allowedKeys(UUID packageRevisionId, String language) {
    String cacheKey = packageRevisionId + ":" + language;
    Set<String> cached = allowedKeys.get(cacheKey);
    if (cached != null) {
      return cached;
    }
    Set<String> allowed = new HashSet<>();
    for (PublishedChunk chunk : learning.listPublishedChunks(packageRevisionId)) {
      if (!language.equals(chunk.explanationLanguage())) continue;
      allowed.add(chunkKey(chunk.sourceKind(), chunk.sourceId(), chunk.blockIndex()));
    }
    if (!allowed.isEmpty()) {
      allowedKeys.putIfAbsent(cacheKey, Set.copyOf(allowed));
      return allowedKeys.get(cacheKey);
    }
    return allowed;
  }

  private static String chunkKey(String sourceKind, UUID sourceId, Integer blockIndex) {
    return sourceKind + ":" + sourceId + ":" + blockIndex;
  }

  private void scheduleEmbed(UUID packageRevisionId) {
    if (!embeddingInFlight.add(packageRevisionId)) {
      return;
    }
    indexExecutor.execute(
        () -> {
          try {
            embedMissing(packageRevisionId);
          } catch (RuntimeException exception) {
            LOGGER.warn(
                "agent.index.embedFailed revisionId={} cause={}",
                packageRevisionId,
                exception.getClass().getSimpleName());
          } finally {
            embeddingInFlight.remove(packageRevisionId);
          }
        });
  }

  private boolean hasStoredEmbeddings(UUID packageRevisionId) {
    if (embeddingsReady.contains(packageRevisionId)) {
      return true;
    }
    Integer count =
        jdbc.queryForObject(
            """
            select count(*) from agent_content_chunk
             where package_revision_id = ? and embedding is not null
            """,
            Integer.class,
            packageRevisionId);
    if (count != null && count > 0) {
      embeddingsReady.add(packageRevisionId);
      return true;
    }
    return false;
  }

  private void embedMissing(UUID packageRevisionId) {
    EmbeddingModel model = embeddings.getIfAvailable();
    if (model == null) return;
    List<ChunkRow> pending =
        requiresNew.execute(
            status ->
                jdbc.query(
                    """
                    select id, body from agent_content_chunk
                     where package_revision_id = ? and embedding is null
                    """,
                    (rs, rowNum) ->
                        new ChunkRow(rs.getObject("id", UUID.class), rs.getString("body")),
                    packageRevisionId));
    if (pending == null || pending.isEmpty()) return;
    List<String> texts = new ArrayList<>(pending.size());
    for (ChunkRow row : pending) {
      texts.add(row.body() == null ? "" : row.body());
    }
    EmbeddingResponse response;
    try {
      response = embedDocuments(model, texts);
    } catch (RuntimeException exception) {
      LOGGER.warn(
          "agent.index.embedFailed revisionId={} cause={} message={}",
          packageRevisionId,
          exception.getClass().getSimpleName(),
          clip(exception.getMessage(), 160));
      return;
    }
    if (response.getResults().size() != pending.size()) {
      LOGGER.warn("agent.index.embedFailed revisionId={} cause=sizeMismatch", packageRevisionId);
      return;
    }
    List<ChunkEmbedding> ready = new ArrayList<>(pending.size());
    for (int i = 0; i < pending.size(); i++) {
      ready.add(
          new ChunkEmbedding(
              pending.get(i).id(), vectorLiteral(fit(response.getResults().get(i).getOutput()))));
    }
    requiresNew.executeWithoutResult(
        status -> {
          for (ChunkEmbedding row : ready) {
            jdbc.update(
                "update agent_content_chunk set embedding = cast(? as vector) where id = ?",
                row.vector(),
                row.id());
          }
        });
    embeddingsReady.add(packageRevisionId);
    LOGGER.info("agent.index.embedded revisionId={} count={}", packageRevisionId, ready.size());
  }

  private String embedQueryOrNull(EmbeddingModel model, String text, UUID packageRevisionId) {
    Future<String> future =
        QUERY_EMBED_EXECUTOR.submit(() -> vectorLiteral(embedQuery(model, text)));
    try {
      return future.get(QUERY_EMBED_TIMEOUT.toNanos(), TimeUnit.NANOSECONDS);
    } catch (TimeoutException exception) {
      future.cancel(true);
      LOGGER.warn("agent.search.embedQueryTimeout revisionId={}", packageRevisionId);
      return null;
    } catch (RuntimeException exception) {
      LOGGER.warn(
          "agent.search.embedQueryFailed revisionId={} cause={}",
          packageRevisionId,
          exception.getClass().getSimpleName());
      return null;
    } catch (Exception exception) {
      if (exception instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      LOGGER.warn(
          "agent.search.embedQueryFailed revisionId={} cause={}",
          packageRevisionId,
          exception.getClass().getSimpleName());
      return null;
    }
  }

  private static EmbeddingResponse embedDocuments(EmbeddingModel model, List<String> texts) {
    if (model instanceof VoyageEmbeddingModel voyage) {
      return voyage.embedWithInputType(texts, "document");
    }
    return model.call(new EmbeddingRequest(texts, null));
  }

  private float[] embedQuery(EmbeddingModel model, String text) {
    EmbeddingResponse response;
    if (model instanceof VoyageEmbeddingModel voyage) {
      response = voyage.embedWithInputType(List.of(text == null ? "" : text), "query");
    } else {
      response = model.call(new EmbeddingRequest(List.of(text == null ? "" : text), null));
    }
    if (response.getResults().isEmpty()) {
      return new float[EMBEDDING_DIM];
    }
    return fit(response.getResults().getFirst().getOutput());
  }

  private static float[] fit(float[] output) {
    if (output.length == EMBEDDING_DIM) return output;
    float[] padded = new float[EMBEDDING_DIM];
    System.arraycopy(output, 0, padded, 0, Math.min(output.length, EMBEDDING_DIM));
    return padded;
  }

  private static String vectorLiteral(float[] values) {
    StringBuilder builder = new StringBuilder(values.length * 8);
    builder.append('[');
    for (int i = 0; i < values.length; i++) {
      if (i > 0) builder.append(',');
      builder.append(String.format(Locale.ROOT, "%.6f", values[i]));
    }
    builder.append(']');
    return builder.toString();
  }

  private static AgentContextType parseKind(String raw) {
    if (raw == null) return null;
    try {
      return AgentContextType.valueOf(raw);
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private static String clip(String value, int max) {
    if (value == null) return "";
    return value.length() <= max ? value : value.substring(0, max);
  }

  private record ChunkRow(UUID id, String body) {}

  private record ChunkEmbedding(UUID id, String vector) {}
}
