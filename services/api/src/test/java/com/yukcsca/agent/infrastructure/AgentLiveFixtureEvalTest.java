package com.yukcsca.agent.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.yukcsca.agent.application.AgentChatPort.AgentChatCommand;
import com.yukcsca.agent.application.AgentChatPort.AgentChatResult;
import com.yukcsca.agent.application.AgentChatPort.AuthorisedAskGrounding;
import com.yukcsca.agent.application.AgentChatPort.GroundedLocator;
import com.yukcsca.agent.application.AgentContentSearchPort;
import com.yukcsca.agent.application.AgentProviderUnavailableException;
import com.yukcsca.agent.domain.AgentAnswerKind;
import com.yukcsca.agent.domain.AgentContextType;
import com.yukcsca.agent.support.FakeChatModel;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class AgentLiveFixtureEvalTest {
  private final FakeChatModel chat = new FakeChatModel();
  private final JsonMapper json = JsonMapper.builder().build();
  private SpringAiAgentChatAdapter adapter;

  @BeforeEach
  void setUp() {
    chat.reset();
    adapter =
        new SpringAiAgentChatAdapter(
            chat,
            new AgentContentSearchPort() {
              @Override
              public void ensureIndexed(UUID packageRevisionId) {}

              @Override
              public List<SearchHit> search(
                  UUID packageRevisionId, String query, String explanationLanguage, int limit) {
                return List.of();
              }
            },
            new AgentProperties(
                true,
                "",
                "https://api.x.ai",
                "fake-chat",
                "fake-embed",
                "",
                "",
                40,
                Duration.ofSeconds(8),
                "vs011-v6"));
  }

  @Test
  void thinkingEmptyContentIsUnreadableAnswerNotAFakeBody() throws IOException {
    String envelope = fixture("thinking-empty-content.json");
    String content = json.readTree(envelope).path("content").asText("");
    assertThat(content).isEmpty();
    chat.setRawContent(content);
    assertThatThrownBy(() -> adapter.complete(command()))
        .isInstanceOf(AgentProviderUnavailableException.class)
        .satisfies(
            thrown -> {
              AgentProviderUnavailableException unavailable =
                  (AgentProviderUnavailableException) thrown;
              assertThat(unavailable.kind())
                  .isEqualTo(AgentProviderUnavailableException.Kind.ANSWER_FORMAT);
              assertThat(unavailable.causeToken()).isEqualTo("answer-format-exhausted");
              assertThat(unavailable.getMessage())
                  .isEqualTo(AgentProviderUnavailableException.DETAIL_ANSWER_FORMAT);
            });
  }

  @Test
  void invalidLatexJsonFromLiveAskIsRepairedToInlineKatex() throws IOException {
    chat.setRawContent(fixture("invalid-latex-json.txt"));
    AgentChatResult result = adapter.complete(command());
    assertThat(result.kind()).isEqualTo(AgentAnswerKind.DERIVED_EXPLANATION);
    assertThat(result.body()).contains("\\(x \\ne 2\\)");
    assertThat(result.body()).doesNotContain("Unrecognized character escape");
  }

  @Test
  void dollarDelimitedLiveJsonBecomesStoredKatex() throws IOException {
    chat.setRawContent(fixture("dollar-math.json"));
    AgentChatResult result = adapter.complete(command());
    assertThat(result.body()).contains("\\(x \\ne 2\\)");
    assertThat(result.body()).doesNotContain("$x");
  }

  @Test
  void unicodeLiveJsonIsWrappedAsInlineKatex() throws IOException {
    chat.setRawContent(fixture("unicode-math.json"));
    AgentChatResult result = adapter.complete(command());
    assertThat(result.body()).contains("\\(").contains("\\ne").contains("\\)");
    assertThat(result.body()).doesNotContain("x≠2");
  }

  private static String fixture(String name) throws IOException {
    String path = "/agent/fixtures/" + name;
    try (InputStream stream = AgentLiveFixtureEvalTest.class.getResourceAsStream(path)) {
      if (stream == null) {
        throw new IOException("missing fixture " + path);
      }
      return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
    }
  }

  private static AgentChatCommand command() {
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
        "What does this question mean?",
        null,
        List.of(),
        new AuthorisedAskGrounding("Quadratic identities", "x^2 + 1", "", false, List.of(locator)),
        Duration.ofSeconds(8));
  }
}
