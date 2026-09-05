package com.yukcsca.agent.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.agent.application.AgentChatPort.AgentChatCommand;
import com.yukcsca.agent.application.AgentChatPort.AuthorisedAskGrounding;
import com.yukcsca.agent.application.AgentChatPort.GroundedLocator;
import com.yukcsca.agent.application.AgentContentSearchPort;
import com.yukcsca.agent.domain.AgentContextType;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class AgentToolFacadeTest {
  @Test
  void recentEvidenceDoesNotDumpTheLessonExcerpt() {
    String excerpt = "Module 1 recap: sets, union, intersection, quadratic inequalities.";
    AgentChatCommand command = command(excerpt);
    AgentToolFacade tools = new AgentToolFacade(command, emptySearch());
    String evidence = tools.getRecentEvidence();
    assertThat(evidence).contains("No separate evidence snapshot.");
    assertThat(evidence).doesNotContain(excerpt);
    assertThat(evidence).doesNotContain("quadratic inequalities");
    assertThat(tools.locatorsFor("getRecentEvidence")).isEmpty();
  }

  @Test
  void searchCapsHitsAtThreeAndKeepsJavaAuthorisationPath() {
    AtomicInteger seenLimit = new AtomicInteger();
    List<AgentContentSearchPort.SearchHit> hits = new ArrayList<>();
    UUID revision = UUID.randomUUID();
    for (int index = 0; index < 5; index++) {
      hits.add(
          new AgentContentSearchPort.SearchHit(
              AgentContextType.LESSON,
              UUID.randomUUID(),
              "Hit " + index,
              index,
              revision,
              "excerpt-" + index,
              1.0));
    }
    AgentContentSearchPort search =
        new AgentContentSearchPort() {
          @Override
          public void ensureIndexed(UUID packageRevisionId) {}

          @Override
          public List<SearchHit> search(
              UUID packageRevisionId, String query, String explanationLanguage, int limit) {
            seenLimit.set(limit);
            return hits;
          }
        };
    AgentToolFacade tools = new AgentToolFacade(command("current excerpt"), search);
    String body = tools.searchAuthorisedContent("union");
    assertThat(seenLimit.get()).isEqualTo(3);
    assertThat(tools.retrievedLocators()).hasSize(3);
    assertThat(body).contains("Hit 0").contains("Hit 2").doesNotContain("Hit 3");
    assertThat(body)
        .contains("\"sourceKind\":\"LESSON\"")
        .contains("\"sourceId\":\"" + hits.get(0).sourceId() + "\"")
        .contains("\"blockIndex\":0")
        .contains("\"packageRevisionId\":\"" + revision + "\"")
        .contains("\"excerpt\":\"excerpt-0\"");
    assertThat(tools.lastSearchQuery()).isEqualTo("union");
  }

  @Test
  void lessonGetterOnItemContextDoesNotDumpTheExcerpt() {
    AgentChatCommand command = command("lesson dump");
    AgentToolFacade tools = new AgentToolFacade(command, emptySearch());
    assertThat(tools.getItemContext()).contains("Not the current context.");
    assertThat(tools.getItemContext()).doesNotContain("lesson dump");
    assertThat(tools.locatorsFor("getItemContext")).isEmpty();
  }

  private static AgentChatCommand command(String excerpt) {
    UUID sourceId = UUID.randomUUID();
    UUID revision = UUID.randomUUID();
    GroundedLocator locator =
        new GroundedLocator(AgentContextType.LESSON, sourceId, "Quadratic identities", 0, revision);
    return new AgentChatCommand(
        UUID.randomUUID(),
        UUID.randomUUID(),
        AgentContextType.LESSON,
        sourceId,
        UUID.randomUUID(),
        revision,
        "MATHEMATICS",
        "en",
        "en",
        "hello, who are you",
        null,
        List.of(),
        new AuthorisedAskGrounding("Quadratic identities", excerpt, "", false, List.of(locator)),
        Duration.ofSeconds(8));
  }

  private static AgentContentSearchPort emptySearch() {
    return new AgentContentSearchPort() {
      @Override
      public void ensureIndexed(UUID packageRevisionId) {}

      @Override
      public List<SearchHit> search(
          UUID packageRevisionId, String query, String explanationLanguage, int limit) {
        return List.of();
      }
    };
  }
}
