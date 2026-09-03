package com.yukcsca.agent.infrastructure;

import com.yukcsca.academic.application.PublishedLearningContextPort;
import com.yukcsca.academic.application.PublishedLearningContextPort.PublishedChunk;
import com.yukcsca.agent.application.AgentContentSearchPort;
import com.yukcsca.agent.domain.AgentContextType;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class JdbcAgentContentSearchAdapter implements AgentContentSearchPort {
  private static final Logger LOGGER = LoggerFactory.getLogger(JdbcAgentContentSearchAdapter.class);
  private static final int EMBEDDING_DIM = 1536;

  private final JdbcTemplate jdbc;
  private final PublishedLearningContextPort learning;
  private final ObjectProvider<EmbeddingModel> embeddings;
  private final Clock clock;
  private final TransactionTemplate requiresNew;

  public JdbcAgentContentSearchAdapter(
      JdbcTemplate jdbc,
      PublishedLearningContextPort learning,
      ObjectProvider<EmbeddingModel> embeddings,
      Clock clock,
      PlatformTransactionManager transactionManager) {
    this.jdbc = jdbc;
    this.learning = learning;
    this.embeddings = embeddings;
    this.clock = clock;
    this.requiresNew = new TransactionTemplate(transactionManager);
    this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  @Override
  public void ensureIndexed(UUID packageRevisionId) {
    if (packageRevisionId == null) return;
    requiresNew.executeWithoutResult(status -> indexLexical(packageRevisionId));
    try {
      embedMissing(packageRevisionId);
    } catch (RuntimeException exception) {
      LOGGER.warn("agent.index.embedFailed revisionId={}", packageRevisionId);
    }
  }

  @Override
  public List<SearchHit> search(
      UUID packageRevisionId, String query, String explanationLanguage, int limit) {
    if (packageRevisionId == null || query == null || query.isBlank()) return List.of();
    try {
      ensureIndexed(packageRevisionId);
    } catch (RuntimeException exception) {
      LOGGER.warn("agent.index.failed revisionId={}", packageRevisionId);
    }
    String language =
        explanationLanguage == null || explanationLanguage.isBlank() ? "en" : explanationLanguage;
    int capped = Math.max(1, Math.min(limit, 8));
    Optional<EmbeddingModel> model = Optional.ofNullable(embeddings.getIfAvailable());
    String vector = model.map(value -> vectorLiteral(embed(value, query))).orElse(null);
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
  }

  private List<SearchHit> authoriseHits(
      UUID packageRevisionId, String language, List<SearchHit> hits) {
    if (hits.isEmpty()) return List.of();
    Set<String> allowed = new HashSet<>();
    for (PublishedChunk chunk : learning.listPublishedChunks(packageRevisionId)) {
      if (!language.equals(chunk.explanationLanguage())) continue;
      allowed.add(chunkKey(chunk.sourceKind(), chunk.sourceId(), chunk.blockIndex()));
    }
    List<SearchHit> authorised = new ArrayList<>();
    for (SearchHit hit : hits) {
      if (allowed.contains(chunkKey(hit.sourceKind().name(), hit.sourceId(), hit.blockIndex()))) {
        authorised.add(hit);
      }
    }
    return List.copyOf(authorised);
  }

  private static String chunkKey(String sourceKind, UUID sourceId, Integer blockIndex) {
    return sourceKind + ":" + sourceId + ":" + blockIndex;
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
    List<ChunkEmbedding> ready = new ArrayList<>();
    for (ChunkRow row : pending) {
      try {
        ready.add(new ChunkEmbedding(row.id(), vectorLiteral(embed(model, row.body()))));
      } catch (RuntimeException exception) {
        LOGGER.warn("agent.index.embedChunkFailed chunkId={}", row.id());
      }
    }
    if (ready.isEmpty()) return;
    requiresNew.executeWithoutResult(
        status -> {
          for (ChunkEmbedding row : ready) {
            jdbc.update(
                "update agent_content_chunk set embedding = cast(? as vector) where id = ?",
                row.vector(),
                row.id());
          }
        });
    LOGGER.info("agent.index.embedded revisionId={} count={}", packageRevisionId, ready.size());
  }

  private float[] embed(EmbeddingModel model, String text) {
    var response = model.call(new EmbeddingRequest(List.of(text == null ? "" : text), null));
    if (response.getResults().isEmpty()) {
      return new float[EMBEDDING_DIM];
    }
    float[] output = response.getResults().getFirst().getOutput();
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
