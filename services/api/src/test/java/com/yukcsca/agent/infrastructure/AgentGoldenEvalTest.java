package com.yukcsca.agent.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.agent.application.AgentChatPort.AgentChatCommand;
import com.yukcsca.agent.application.AgentChatPort.AgentChatResult;
import com.yukcsca.agent.application.AgentChatPort.AuthorisedAskGrounding;
import com.yukcsca.agent.application.AgentChatPort.GroundedLocator;
import com.yukcsca.agent.application.AgentChatPort.PriorTurn;
import com.yukcsca.agent.application.AgentContentSearchPort;
import com.yukcsca.agent.domain.AgentAnswerKind;
import com.yukcsca.agent.domain.AgentContextType;
import com.yukcsca.agent.support.FakeChatModel;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class AgentGoldenEvalTest {
  private final FakeChatModel chat = new FakeChatModel();
  private final JsonMapper json = JsonMapper.builder().build();
  private SpringAiAgentChatAdapter adapter;

  @BeforeEach
  void setUp() {
    chat.reset();
    AgentProperties properties =
        new AgentProperties(
            true,
            "",
            "https://api.x.ai",
            "fake-chat",
            "fake-embed",
            40,
            Duration.ofSeconds(8),
            "vs011-v1");
    AgentContentSearchPort search =
        new AgentContentSearchPort() {
          @Override
          public void ensureIndexed(UUID packageRevisionId) {}

          @Override
          public List<SearchHit> search(
              UUID packageRevisionId, String query, String explanationLanguage, int limit) {
            return List.of();
          }
        };
    adapter = new SpringAiAgentChatAdapter(chat, search, properties, json);
  }

  @Test
  void reviewedSourceUsesCurrentLocatorsAndStudentLanguageSteps() {
    AgentChatResult result = adapter.complete(command("Why is this identity true?", "en"));
    assertThat(result.kind()).isEqualTo(AgentAnswerKind.REVIEWED_SOURCE);
    assertThat(result.body()).contains("reviewed text");
    assertThat(result.locators()).isNotEmpty();
    assertThat(result.steps())
        .allSatisfy(step -> assertThat(step.label()).doesNotContain("getLessonContext"));
    assertThat(result.suggestedFollowUps()).isNotEmpty();
  }

  @Test
  void officialClaimWithoutSourcesIsInsufficient() {
    AgentChatResult result =
        adapter.complete(command("Is this the official CSCA admissions scoring rule?", "en"));
    assertThat(result.kind()).isEqualTo(AgentAnswerKind.INSUFFICIENT_EVIDENCE);
  }

  @Test
  void thinPublicMathIsDerivedExplanation() {
    AgentChatResult result = adapter.complete(command("what is b in this formula?", "en"));
    assertThat(result.kind()).isEqualTo(AgentAnswerKind.DERIVED_EXPLANATION);
  }

  @Test
  void indonesianLabelsDoNotExposeRawToolNames() {
    AgentChatResult result = adapter.complete(command("Jelaskan blok ini", "id"));
    assertThat(result.steps())
        .allSatisfy(step -> assertThat(step.label()).doesNotContain("getLessonContext"));
  }

  @Test
  void chineseLabelsPreserveExamLanguageAndDoNotCopyStem() {
    String stem = "已知函数 f(x)=x^2";
    UUID sourceId = UUID.randomUUID();
    UUID revision = UUID.randomUUID();
    GroundedLocator locator =
        new GroundedLocator(AgentContextType.LESSON, sourceId, "Quadratic identities", 0, revision);
    AgentChatResult result =
        adapter.complete(
            command("请解释这个恒等式", "zh-CN", "zh-CN", stem + " 且 f(1)=1", List.of(), List.of(locator)));
    assertThat(chat.lastSystemText()).contains("zh-CN");
    assertThat(chat.lastSystemText()).contains("Do not restate a Chinese exam stem");
    assertThat(result.steps())
        .allSatisfy(step -> assertThat(step.label()).doesNotContain("getLessonContext"));
    assertThat(result.steps().getFirst().label()).isEqualTo("查看了当前内容");
    assertThat(result.body()).doesNotContain(stem);
  }

  @Test
  void hallucinatedLocatorsAreDroppedAndAuthorisedOnesAreKept() {
    UUID sourceId = UUID.randomUUID();
    UUID revision = UUID.randomUUID();
    GroundedLocator authorised =
        new GroundedLocator(AgentContextType.LESSON, sourceId, "Quadratic identities", 0, revision);
    UUID hallucinatedId = UUID.randomUUID();
    chat.setLocatorsJson(
        """
        [{"sourceKind":"LESSON","sourceId":"%s","label":"Quadratic identities","blockIndex":0,"packageRevisionId":"%s"},{"sourceKind":"LESSON","sourceId":"%s","label":"Hallucinated","blockIndex":9,"packageRevisionId":"%s"}]
        """
            .formatted(sourceId, revision, hallucinatedId, UUID.randomUUID()));
    AgentChatResult result =
        adapter.complete(
            command(
                "Why is this identity true?",
                "en",
                "en",
                "x^2 + 1",
                List.of(),
                List.of(authorised)));
    assertThat(result.locators()).containsExactly(authorised);
    assertThat(result.locators()).noneMatch(locator -> hallucinatedId.equals(locator.sourceId()));
  }

  @Test
  void emptyAuthorisedSetDropsAllModelLocators() {
    UUID hallucinatedId = UUID.randomUUID();
    chat.setLocatorsJson(
        """
        [{"sourceKind":"LESSON","sourceId":"%s","label":"Hallucinated","blockIndex":0,"packageRevisionId":"%s"}]
        """
            .formatted(hallucinatedId, UUID.randomUUID()));
    AgentChatResult result =
        adapter.complete(
            command("Why is this identity true?", "en", "en", "x^2 + 1", List.of(), List.of()));
    assertThat(result.locators()).noneMatch(locator -> hallucinatedId.equals(locator.sourceId()));
  }

  @Test
  void priorTurnsAndStudentTextAreXmlDelimited() {
    adapter.complete(
        command(
            "What is the next step?",
            "en",
            "en",
            "x^2 + 1",
            List.of(
                new PriorTurn(
                    "Why is this identity true?", null, "REVIEWED_SOURCE", "Because x^2+1.")),
            List.of(
                new GroundedLocator(
                    AgentContextType.LESSON,
                    UUID.randomUUID(),
                    "Quadratic identities",
                    0,
                    UUID.randomUUID()))));
    assertThat(chat.lastUserText()).contains("<student_question>");
    assertThat(chat.lastUserText()).contains("<prior_turns>");
    assertThat(chat.lastUserText()).contains("Why is this identity true?");
    assertThat(chat.lastUserText()).contains("<current_object>");
  }

  private AgentChatCommand command(String question, String explanationLanguage) {
    UUID sourceId = UUID.randomUUID();
    UUID revision = UUID.randomUUID();
    GroundedLocator locator =
        new GroundedLocator(AgentContextType.LESSON, sourceId, "Quadratic identities", 0, revision);
    return command(question, explanationLanguage, "en", "x^2 + 1", List.of(), List.of(locator));
  }

  private AgentChatCommand command(
      String question,
      String explanationLanguage,
      String examLanguage,
      String excerpt,
      List<PriorTurn> priorTurns,
      List<GroundedLocator> locators) {
    UUID sourceId = locators.isEmpty() ? UUID.randomUUID() : locators.getFirst().sourceId();
    UUID revision =
        locators.isEmpty() ? UUID.randomUUID() : locators.getFirst().packageRevisionId();
    return new AgentChatCommand(
        UUID.randomUUID(),
        UUID.randomUUID(),
        AgentContextType.LESSON,
        sourceId,
        UUID.randomUUID(),
        revision,
        "MATHEMATICS",
        explanationLanguage,
        examLanguage,
        question,
        null,
        priorTurns,
        new AuthorisedAskGrounding("Quadratic identities", excerpt, false, locators),
        Duration.ofSeconds(8));
  }
}
