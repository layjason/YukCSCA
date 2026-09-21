package com.yukcsca.agent.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.yukcsca.academic.application.PublishedLearningContextPort;
import com.yukcsca.academic.application.PublishedLearningContextPort.PublishedChunk;
import com.yukcsca.agent.application.AgentContentSearchPort;
import com.yukcsca.support.PostgresTestConfiguration;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Production ranking: Han queries with a query vector follow cosine, so PostgreSQL {@code simple}
 * ASCII tokens cannot promote a wrong chunk.
 */
@ActiveProfiles("test")
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class JdbcAgentContentSearchRankingIT {
  @Autowired JdbcTemplate jdbc;
  @Autowired PlatformTransactionManager transactions;

  @Test
  void hanQueryWithSharedAsciiTokenRanksVectorNeighborFirst() {
    UUID packageId = UUID.randomUUID();
    UUID revision = UUID.randomUUID();
    UUID actor = UUID.randomUUID();
    UUID goldId = UUID.randomUUID();
    UUID noiseId = UUID.randomUUID();
    seedParents(packageId, revision, actor);
    PublishedLearningContextPort learning = mock(PublishedLearningContextPort.class);
    List<PublishedChunk> chunks =
        List.of(
            new PublishedChunk(
                packageId, revision, "LESSON", goldId, 0, "zh-CN", "正弦函数", "正弦函数是直角三角形中对边与斜边的比。"),
            new PublishedChunk(
                packageId,
                revision,
                "LESSON",
                noiseId,
                0,
                "zh-CN",
                "ASCII sine",
                "sin x sin x sin x the opposite over hypotenuse"));
    when(learning.listPublishedChunks(revision)).thenReturn(chunks);
    JdbcAgentContentSearchAdapter adapter = adapter(learning, new TopicEmbeddingModel());
    adapter.ensureIndexed(revision);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from agent_content_chunk where package_revision_id = ? and embedding is not null",
                Integer.class,
                revision))
        .isEqualTo(2);
    List<UUID> ranked =
        adapter.search(revision, "什么是正弦函数 sin", "zh-CN", 3).stream()
            .map(AgentContentSearchPort.SearchHit::sourceId)
            .toList();
    assertThat(ranked).isNotEmpty();
    assertThat(ranked.getFirst()).isEqualTo(goldId);
    assertThat(ranked).contains(goldId);
  }

  private void seedParents(UUID packageId, UUID revision, UUID actor) {
    jdbc.update(
        "insert into user_account(id,email,display_name,role,created_at,updated_at) values (?,?,'Eval','STUDENT',now(),now())",
        actor,
        actor + "@example.invalid");
    jdbc.update(
        "insert into academic_package(id,subject,status,draft,created_at,updated_at) values (?,'MATHEMATICS','PUBLISHED','{}',now(),now())",
        packageId);
    jdbc.update(
        "insert into academic_revision(id,package_id,revision_number,content,published_by_user_id,published_at) values (?,?,1,'{}',?,now())",
        revision,
        packageId,
        actor);
    jdbc.update("update academic_package set active_revision_id=? where id=?", revision, packageId);
  }

  private JdbcAgentContentSearchAdapter adapter(
      PublishedLearningContextPort learning, EmbeddingModel model) {
    StaticListableBeanFactory beans = new StaticListableBeanFactory();
    beans.addBean("embedding", model);
    return new JdbcAgentContentSearchAdapter(
        jdbc,
        learning,
        beans.getBeanProvider(EmbeddingModel.class),
        Clock.systemUTC(),
        transactions,
        Runnable::run);
  }

  private static final class TopicEmbeddingModel implements EmbeddingModel {
    @Override
    public float[] embed(Document document) {
      return vector(document == null ? "" : document.getText());
    }

    @Override
    public EmbeddingResponse call(EmbeddingRequest request) {
      List<Embedding> results = new ArrayList<>();
      int index = 0;
      for (String text : request.getInstructions()) {
        results.add(new Embedding(vector(text), index++));
      }
      return new EmbeddingResponse(results);
    }

    private static float[] vector(String text) {
      float[] values = new float[AgentProperties.EMBEDDING_DIMENSIONS];
      String body = text == null ? "" : text.toLowerCase(Locale.ROOT);
      if (body.contains("正弦")) {
        values[0] = 1.0f;
      } else if (body.contains("sin")) {
        values[1] = 1.0f;
      } else {
        values[2] = 1.0f;
      }
      return values;
    }
  }
}
