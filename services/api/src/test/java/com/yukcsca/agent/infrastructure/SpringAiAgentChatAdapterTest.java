package com.yukcsca.agent.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.yukcsca.agent.application.AgentChatPort.AgentChatCommand;
import com.yukcsca.agent.application.AgentChatPort.AuthorisedAskGrounding;
import com.yukcsca.agent.application.AgentChatPort.GroundedLocator;
import com.yukcsca.agent.application.AgentChatPort.TraceStep;
import com.yukcsca.agent.application.AgentContentSearchPort;
import com.yukcsca.agent.application.AgentProviderUnavailableException;
import com.yukcsca.agent.domain.AgentContextType;
import com.yukcsca.agent.domain.AgentTraceStepKind;
import com.yukcsca.agent.support.FakeChatModel;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.tool.ToolCallback;
import reactor.core.publisher.Flux;
import tools.jackson.databind.json.JsonMapper;

class SpringAiAgentChatAdapterTest {
  private final FakeChatModel chat = new FakeChatModel();
  private final JsonMapper json = JsonMapper.builder().build();
  private SpringAiAgentChatAdapter adapter;
  private RecordingSearch search;

  @BeforeEach
  void setUp() {
    chat.reset();
    search = new RecordingSearch();
    adapter = new SpringAiAgentChatAdapter(chat, search, properties());
  }

  @Test
  void lessonSurfaceIsMatchingGetterPlusSearchAndEvidence() {
    AgentChatCommand command = command(AgentContextType.LESSON, Duration.ofSeconds(8));
    AgentToolFacade tools = new AgentToolFacade(command, search);
    List<String> names =
        adapter.toolsFor(command, tools).stream()
            .map(callback -> callback.getToolDefinition().name())
            .toList();
    assertThat(names)
        .containsExactly("getLessonContext", "searchAuthorisedContent", "getRecentEvidence")
        .doesNotContain(
            "getItemContext", "getMistakeContext", "getRemediationContext", "getTermContext");
  }

  @Test
  void itemSurfaceDoesNotAttachLessonGetter() {
    AgentChatCommand command = command(AgentContextType.ITEM, Duration.ofSeconds(8));
    AgentToolFacade tools = new AgentToolFacade(command, search);
    List<String> names =
        adapter.toolsFor(command, tools).stream()
            .map(callback -> callback.getToolDefinition().name())
            .toList();
    assertThat(names)
        .containsExactly("getItemContext", "searchAuthorisedContent", "getRecentEvidence")
        .doesNotContain("getLessonContext");
  }

  @Test
  void schemaRetryDropsToolsAfterTheyAlreadyRan() {
    AgentChatCommand command = command(AgentContextType.LESSON, Duration.ofSeconds(8));
    AgentToolFacade tools = new AgentToolFacade(command, search);
    Instant deadline = Instant.now().plusSeconds(5);
    assertThat(adapter.attachableTools(command, tools, false, deadline)).isNotEmpty();
    tools.getLessonContext();
    assertThat(adapter.attachableTools(command, tools, true, deadline)).isEmpty();
  }

  @Test
  void toolBudgetRejectsAfterThreeInvocations() {
    AgentChatCommand command = command(AgentContextType.LESSON, Duration.ofSeconds(8));
    AgentToolFacade tools = new AgentToolFacade(command, search);
    List<ToolCallback> attached =
        adapter.attachableTools(command, tools, false, Instant.now().plusSeconds(5));
    assertThat(attached).isNotEmpty();
    ToolCallback callback = attached.getFirst();
    callback.call("{}");
    callback.call("{}");
    callback.call("{}");
    assertThat(callback.call("{}")).contains("tool budget exhausted; answer now");
  }

  @Test
  void studentStepsDedupesToolNamesAndKeepsPerToolLocators() {
    AgentChatCommand command = command(AgentContextType.LESSON, Duration.ofSeconds(8));
    GroundedLocator lesson = command.grounding().currentLocators().getFirst();
    UUID searchSource = UUID.randomUUID();
    GroundedLocator searched =
        new GroundedLocator(
            AgentContextType.LESSON, searchSource, "Other lesson", 2, command.packageRevisionId());
    search.hits =
        List.of(
            new AgentContentSearchPort.SearchHit(
                searched.sourceKind(),
                searched.sourceId(),
                searched.label(),
                searched.blockIndex(),
                searched.packageRevisionId(),
                "union excerpt",
                1.0));
    AgentToolFacade tools = new AgentToolFacade(command, search);
    tools.getLessonContext();
    tools.getLessonContext();
    tools.getLessonContext();
    tools.getLessonContext();
    tools.searchAuthorisedContent("union");
    List<TraceStep> steps = adapter.studentSteps(command, tools);
    assertThat(steps).hasSize(3);
    assertThat(steps.get(0).kind()).isEqualTo(AgentTraceStepKind.TOOL);
    assertThat(steps.get(0).label()).isEqualTo("Looked at this lesson");
    assertThat(steps.get(0).label()).doesNotContain("getLessonContext");
    assertThat(steps.get(0).locators()).containsExactly(lesson);
    assertThat(steps.get(0).locators()).doesNotContain(searched);
    assertThat(steps.get(1).label()).isEqualTo("Searched this package for “union”");
    assertThat(steps.get(1).label()).doesNotContain("searchAuthorisedContent");
    assertThat(steps.get(1).locators()).containsExactly(searched);
    assertThat(steps.get(1).locators()).doesNotContain(lesson);
    assertThat(steps.get(2).kind()).isEqualTo(AgentTraceStepKind.MODEL);
    assertThat(steps.get(2).label()).isEqualTo("Wrote the text answer");
  }

  @Test
  void retrievedAuthorisedHitsCannotBeDowngradedToDerivedProvenance() {
    assertThat(
            SpringAiAgentChatAdapter.groundedKind(
                com.yukcsca.agent.domain.AgentAnswerKind.DERIVED_EXPLANATION, true))
        .isEqualTo(com.yukcsca.agent.domain.AgentAnswerKind.REVIEWED_SOURCE);
    assertThat(
            SpringAiAgentChatAdapter.groundedKind(
                com.yukcsca.agent.domain.AgentAnswerKind.INSUFFICIENT_EVIDENCE, true))
        .isEqualTo(com.yukcsca.agent.domain.AgentAnswerKind.INSUFFICIENT_EVIDENCE);
    assertThat(
            SpringAiAgentChatAdapter.groundedKind(
                com.yukcsca.agent.domain.AgentAnswerKind.DERIVED_EXPLANATION, false))
        .isEqualTo(com.yukcsca.agent.domain.AgentAnswerKind.DERIVED_EXPLANATION);
  }

  @Test
  void searchHitsFillLocatorsWhenTheModelOmitsCopyableIds() {
    GroundedLocator current =
        new GroundedLocator(
            AgentContextType.LESSON,
            UUID.randomUUID(),
            "Quadratic identities",
            0,
            UUID.randomUUID());
    GroundedLocator searched =
        new GroundedLocator(
            AgentContextType.TERMINOLOGY,
            UUID.randomUUID(),
            "Union",
            null,
            current.packageRevisionId());
    assertThat(
            SpringAiAgentChatAdapter.groundedLocators(
                List.of(),
                List.of(searched),
                List.of(current),
                com.yukcsca.agent.domain.AgentAnswerKind.DERIVED_EXPLANATION))
        .containsExactly(searched);
    assertThat(
            SpringAiAgentChatAdapter.groundedLocators(
                List.of(),
                List.of(),
                List.of(current),
                com.yukcsca.agent.domain.AgentAnswerKind.DERIVED_EXPLANATION))
        .isEmpty();
    assertThat(
            SpringAiAgentChatAdapter.groundedLocators(
                List.of(),
                List.of(),
                List.of(current),
                com.yukcsca.agent.domain.AgentAnswerKind.REVIEWED_SOURCE))
        .containsExactly(current);
  }

  @Test
  void authorisedLocatorMatchAcceptsSourceIdWithoutExactBlockIndex() {
    GroundedLocator authorised =
        new GroundedLocator(
            AgentContextType.LESSON,
            UUID.randomUUID(),
            "Quadratic identities",
            2,
            UUID.randomUUID());
    SpringAiAgentChatAdapter.StructuredLocator requested =
        new SpringAiAgentChatAdapter.StructuredLocator(
            "lesson", authorised.sourceId(), "Quadratic identities", null, null);
    assertThat(SpringAiAgentChatAdapter.matchAuthorised(requested, List.of(authorised)))
        .isEqualTo(authorised);
  }

  @Test
  void longCurrentObjectIsClippedInTheUserPrompt() {
    String excerpt = "set ".repeat(800);
    AgentChatCommand command =
        new AgentChatCommand(
            UUID.randomUUID(),
            UUID.randomUUID(),
            AgentContextType.LESSON,
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            "en",
            "en",
            "Explain this lesson",
            null,
            List.of(),
            new AuthorisedAskGrounding("Basic sets", excerpt, "", false, List.of()),
            Duration.ofSeconds(8));
    adapter.complete(command);
    assertThat(chat.lastUserText()).contains("<current_object>");
    assertThat(chat.lastUserText()).contains("[clipped; matching getter has the rest]");
    assertThat(chat.lastUserText().length()).isLessThan(excerpt.length() + 500);
  }

  @Test
  void learnerEvidenceIsSeparateFromCurrentObjectInTheUserPrompt() {
    AgentChatCommand command =
        new AgentChatCommand(
            UUID.randomUUID(),
            UUID.randomUUID(),
            AgentContextType.LESSON,
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            "en",
            "en",
            "Why did I make this mistake?",
            null,
            List.of(),
            new AuthorisedAskGrounding(
                "Quadratic identities",
                "current lesson",
                "MISCONCEPTION objective=123",
                false,
                List.of()),
            Duration.ofSeconds(8));

    adapter.complete(command);

    assertThat(chat.lastUserText()).contains("<current_object>\ncurrent lesson");
    assertThat(chat.lastUserText()).contains("<recent_evidence>\nMISCONCEPTION objective=123");
  }

  @Test
  void stableSystemPrefixIsIdenticalAcrossExplanationLanguages() {
    String english = adapter.systemPrompt(command(AgentContextType.LESSON, Duration.ofSeconds(8)));
    String chinese =
        adapter.systemPrompt(
            new AgentChatCommand(
                UUID.randomUUID(),
                UUID.randomUUID(),
                AgentContextType.LESSON,
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "MATHEMATICS",
                "zh-CN",
                "zh-CN",
                "解释这个概念",
                null,
                List.of(),
                new AuthorisedAskGrounding("Quadratic identities", "x^2 + 1", "", false, List.of()),
                Duration.ofSeconds(8)));

    assertThat(english).isEqualTo(chinese);
    assertThat(english).doesNotContain("zh-CN");
    assertThat(adapter.sessionContext(command(AgentContextType.LESSON, Duration.ofSeconds(8))))
        .contains("Answer in explanation language: en");
  }

  @Test
  void promptOrderIsSystemSessionContextPriorTurnsThenQuestion() {
    AgentChatCommand command =
        new AgentChatCommand(
            UUID.randomUUID(),
            UUID.randomUUID(),
            AgentContextType.LESSON,
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            "en",
            "en",
            "What is the next step?",
            null,
            List.of(
                new com.yukcsca.agent.application.AgentChatPort.PriorTurn(
                    "Why is this identity true?", null, "REVIEWED_SOURCE", "Because \\(x^2+1\\).")),
            new AuthorisedAskGrounding(
                "Quadratic identities",
                "current lesson",
                "MISCONCEPTION objective=123",
                false,
                List.of()),
            Duration.ofSeconds(8));

    adapter.complete(command);

    List<String> messages = chat.lastMessages();
    assertThat(messages.getFirst()).startsWith("SYSTEM:");
    assertThat(messages.get(1)).startsWith("USER:").contains("<session_context>");
    assertThat(messages.get(1)).contains("<current_object>");
    assertThat(messages.get(1)).contains("Why is this identity true?");
    assertThat(messages.get(1)).doesNotContain("What is the next step?");
    assertThat(messages.get(2)).startsWith("ASSISTANT:").contains("Because");
    assertThat(messages.getLast()).startsWith("USER:").contains("What is the next step?");
    assertThat(messages.getLast()).contains("<recent_evidence>");
    assertThat(messages.getLast()).doesNotContain("<session_context>");
    assertThat(chat.lastSystemText()).doesNotContain("Answer in explanation language");
    assertNoConsecutiveUserMessages(messages);
  }

  @Test
  void firstTurnSendsOneUserMessageWithSessionContext() {
    adapter.complete(command(AgentContextType.LESSON, Duration.ofSeconds(8)));
    List<String> messages = chat.lastMessages();
    assertThat(messages).hasSize(2);
    assertThat(messages.getFirst()).startsWith("SYSTEM:");
    assertThat(messages.getLast()).startsWith("USER:");
    assertThat(messages.getLast()).contains("<session_context>");
    assertThat(messages.getLast()).contains("<student_question>");
    assertNoConsecutiveUserMessages(messages);
  }

  @Test
  void answerBodyPolicyNormalizesDisplayAndBareMath() {
    assertThat(SpringAiAgentChatAdapter.normalizeBody("Use \\[x^2\\] here."))
        .isEqualTo("Use \\(x^2\\) here.");
    assertThat(SpringAiAgentChatAdapter.normalizeBody("The restriction is x≠2."))
        .contains("\\(x \\ne 2\\)");
    assertThat(SpringAiAgentChatAdapter.normalizeBody("See π/2 next.")).contains("\\(\\pi /2\\)");
    assertThat(
            SpringAiAgentChatAdapter.validBody(
                SpringAiAgentChatAdapter.normalizeBody("Use \\[x^2\\] here.")))
        .isTrue();
    assertThat(
            SpringAiAgentChatAdapter.validBody(
                SpringAiAgentChatAdapter.normalizeBody("The restriction is x≠2.")))
        .isTrue();
    assertThat(SpringAiAgentChatAdapter.normalizeBody("The function f(x)=1/(x-2)."))
        .isEqualTo("The function \\(f(x)=1/(x-2)\\).");
    assertThat(
            SpringAiAgentChatAdapter.validBody(
                SpringAiAgentChatAdapter.normalizeBody("The function f(x)=1/(x-2).")))
        .isTrue();
    assertThat(SpringAiAgentChatAdapter.normalizeBody("定义域不含 π/2 的点"))
        .contains("\\(\\pi /2\\)")
        .contains("的点")
        .doesNotContain("的点\\)")
        .doesNotContain("\\(\\pi /2 的点");
    assertThat(SpringAiAgentChatAdapter.normalizeBody("x≠2时函数无定义"))
        .isEqualTo("\\(x \\ne 2\\)时函数无定义");
    assertThat(
            SpringAiAgentChatAdapter.validBody(
                SpringAiAgentChatAdapter.normalizeBody("定义域不含 π/2 的点")))
        .isTrue();
    assertThat(SpringAiAgentChatAdapter.normalizeBody("# Domain\nThe excluded value is x≠2."))
        .doesNotContain("# Domain")
        .contains("**Domain**")
        .contains("\\(x \\ne 2\\)");
    assertThat(
            SpringAiAgentChatAdapter.validBody(
                SpringAiAgentChatAdapter.normalizeBody("# Domain\nThe excluded value is x≠2.")))
        .isTrue();
    assertThat(SpringAiAgentChatAdapter.validBody("Use \\(x^2 here.")).isFalse();
    assertThat(SpringAiAgentChatAdapter.validBody("Use \\(x^2\\) here.")).isTrue();
    assertThat(SpringAiAgentChatAdapter.validBody("# A heading\nAnswer.")).isFalse();
    assertThat(SpringAiAgentChatAdapter.normalizeBody("当然，本课需要掌握的词语如下： 1. 集合 2. 列举法 1.1 并集"))
        .isEqualTo("当然，本课需要掌握的词语如下：\n1. 集合\n2. 列举法\n1.1 并集");
    assertThat(
            SpringAiAgentChatAdapter.normalizeBody(
                "I have 5 apples and in 2026 we will visit room 102."))
        .isEqualTo("I have 5 apples and in 2026 we will visit room 102.");
    assertThat(SpringAiAgentChatAdapter.normalizeBody("The excluded value is $x \\ne 2$."))
        .isEqualTo("The excluded value is \\(x \\ne 2\\).");
    assertThat(SpringAiAgentChatAdapter.normalizeBody("The set contains $1, 2, 4$ and $5$."))
        .isEqualTo("The set contains \\(1, 2, 4\\) and \\(5\\).");
    assertThat(
            SpringAiAgentChatAdapter.validBody(
                SpringAiAgentChatAdapter.normalizeBody("The excluded value is $x \\ne 2$.")))
        .isTrue();
    assertThat(SpringAiAgentChatAdapter.normalizeBody("Cost is $5 today."))
        .isEqualTo("Cost is $5 today.");
  }

  @Test
  void jsonLatexEscapesAreRepairedBeforeSchemaParse() {
    String raw =
        """
        {"kind":"DERIVED_EXPLANATION","body":"The excluded value is \\(x \\ne 2\\).","locators":[],"suggestedFollowUps":[],"lowConfidence":false}
        """;
    String repaired = SpringAiAgentChatAdapter.repairJsonLatexEscapes(raw);
    assertThat(repaired).contains("\\\\(x \\\\ne 2\\\\)");
    chat.setMode(FakeChatModel.Mode.LATEX_JSON);
    var result = adapter.complete(command(AgentContextType.LESSON, Duration.ofSeconds(8)));
    assertThat(result.kind())
        .isEqualTo(com.yukcsca.agent.domain.AgentAnswerKind.DERIVED_EXPLANATION);
    assertThat(result.body()).contains("\\(x \\ne 2\\)");
  }

  @Test
  void dollarDelimitedMathInJsonBecomesInlineKatex() {
    chat.setMode(FakeChatModel.Mode.DOLLAR_MATH);
    var result = adapter.complete(command(AgentContextType.LESSON, Duration.ofSeconds(8)));
    assertThat(result.body()).contains("\\(x \\ne 2\\)");
    assertThat(result.body()).doesNotContain("$x");
  }

  @Test
  void systemPromptAsksForDollarMathNotJsonBackslashParen() {
    String system = adapter.systemPrompt(command(AgentContextType.LESSON, Duration.ofSeconds(8)));
    assertThat(system).contains("$formula$");
    assertThat(system).doesNotContain("delimited as \\(formula\\)");
    assertThat(system).contains("you MUST call searchAuthorisedContent");
    assertThat(system).contains("even if they do not say “search” or name the tool");
    assertThat(system).contains("kind MUST be REVIEWED_SOURCE");
    assertThat(system).contains("Prefer answering now over another getter call");
  }

  @Test
  void suggestedFollowUpsAndSearchQueriesNormalizeMathToStoredKatex() {
    assertThat(SpringAiAgentChatAdapter.normalizeInlineMath("What if $x \\ne 2$?"))
        .isEqualTo("What if \\(x \\ne 2\\)?");
    assertThat(SpringAiAgentChatAdapter.normalizeInlineMath("How about A ∩ B?"))
        .isEqualTo("How about \\(A \\cap B\\)?");
    assertThat(SpringAiAgentChatAdapter.normalizeInlineMath("\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"))
        .isEqualTo("\\(\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\)");
    assertThat(SpringAiAgentChatAdapter.normalizeInlineMath("x^2 - 5x + 6 = 0"))
        .isEqualTo("\\(x^2 - 5x + 6 = 0\\)");
    assertThat(SpringAiAgentChatAdapter.normalizeInlineMath("“\\frac{1}{2}”"))
        .isEqualTo("“\\(\\frac{1}{2}\\)”");
    assertThat(SpringAiAgentChatAdapter.normalizeInlineMath("“x^2 - 4 = 0”"))
        .isEqualTo("“\\(x^2 - 4 = 0\\)”");
    assertThat(SpringAiAgentChatAdapter.normalizeInlineMath("Budget is $5 today and $10 tomorrow."))
        .isEqualTo("Budget is $5 today and $10 tomorrow.");
    assertThat(SpringAiAgentChatAdapter.normalizeInlineMath("解集是 $ (2,3) $。"))
        .isEqualTo("解集是 \\((2,3)\\)。");
    assertThat(SpringAiAgentChatAdapter.normalizeInlineMath("Version 2 = Beta"))
        .isEqualTo("Version 2 = Beta");
  }

  @Test
  void hostFailureIsProviderUnavailableNotUnreadableAnswer() {
    chat.setMode(FakeChatModel.Mode.ERROR);
    assertThatThrownBy(
            () -> adapter.complete(command(AgentContextType.LESSON, Duration.ofSeconds(8))))
        .isInstanceOf(AgentProviderUnavailableException.class)
        .satisfies(
            thrown -> {
              AgentProviderUnavailableException unavailable =
                  (AgentProviderUnavailableException) thrown;
              assertThat(unavailable.kind())
                  .isEqualTo(AgentProviderUnavailableException.Kind.PROVIDER);
              assertThat(unavailable.getMessage())
                  .isEqualTo(AgentProviderUnavailableException.DETAIL_PROVIDER);
            });
  }

  @Test
  void invalidJsonExhaustionIsUnreadableAnswer() {
    chat.setMode(FakeChatModel.Mode.INVALID_JSON);
    assertThatThrownBy(
            () -> adapter.complete(command(AgentContextType.LESSON, Duration.ofSeconds(8))))
        .isInstanceOf(AgentProviderUnavailableException.class)
        .satisfies(
            thrown -> {
              AgentProviderUnavailableException unavailable =
                  (AgentProviderUnavailableException) thrown;
              assertThat(unavailable.kind())
                  .isEqualTo(AgentProviderUnavailableException.Kind.ANSWER_FORMAT);
              assertThat(unavailable.causeToken()).isEqualTo("answer-format-exhausted");
            });
  }

  @Test
  void acceptsRelaxedGatewayShapeWithoutTreatingValidAnswerAsUnreadable() {
    chat.setRawContent(
        "{kind: 'explanation', body: 'The answer is $x \\\\ne 2$.'"
            + ", locators: ['Quadratic identities'], suggestedFollowUps: 'Try another example',"
            + " lowConfidence: false,}");

    var result = adapter.complete(command(AgentContextType.LESSON, Duration.ofSeconds(8)));

    assertThat(result.kind())
        .isEqualTo(com.yukcsca.agent.domain.AgentAnswerKind.DERIVED_EXPLANATION);
    assertThat(result.body()).contains("\\(x \\ne 2\\)");
    assertThat(result.suggestedFollowUps()).containsExactly("Try another example");
    assertThat(result.locators()).isEmpty();
  }

  @Test
  void acceptsUsefulPlainTextWhenGatewayIgnoresJsonObjectMode() {
    chat.setRawContent("The denominator cannot be zero, so exclude x = 2.");

    var result = adapter.complete(command(AgentContextType.LESSON, Duration.ofSeconds(8)));

    assertThat(result.kind())
        .isEqualTo(com.yukcsca.agent.domain.AgentAnswerKind.DERIVED_EXPLANATION);
    assertThat(result.body()).contains("denominator cannot be zero");
    assertThat(result.locators()).isEmpty();
  }

  @Test
  void greetingIsAnsweredBrieflyWithoutProviderOrTools() {
    AgentChatCommand command =
        new AgentChatCommand(
            UUID.randomUUID(),
            UUID.randomUUID(),
            AgentContextType.LESSON,
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            "zh-CN",
            "en",
            "hello, who are you",
            null,
            List.of(),
            new AuthorisedAskGrounding(
                "Basic sets and inequalities", "module dump", "", false, List.of()),
            Duration.ofSeconds(8));

    var result = adapter.complete(command);

    assertThat(result.kind())
        .isEqualTo(com.yukcsca.agent.domain.AgentAnswerKind.DERIVED_EXPLANATION);
    assertThat(result.body())
        .isEqualTo("你好！我是 YukCSCA Ask，负责帮助你理解当前内容 “Basic sets and inequalities”。你可以问我一个具体问题。");
    assertThat(result.body()).doesNotContain("集合基础");
    assertThat(result.locators()).isEmpty();
    assertThat(result.tokenUsage()).isZero();
    assertThat(chat.calls()).isZero();
  }

  @Test
  void wholeTurnTimeoutDoesNotWaitOutAHungModel() {
    ChatModel slow =
        new ChatModel() {
          @Override
          public ChatResponse call(Prompt prompt) {
            try {
              Thread.sleep(5_000);
            } catch (InterruptedException exception) {
              Thread.currentThread().interrupt();
              throw new IllegalStateException(exception);
            }
            return ChatResponse.builder()
                .generations(List.of(new Generation(new AssistantMessage("{}"))))
                .build();
          }

          @Override
          public Flux<ChatResponse> stream(Prompt prompt) {
            return Flux.just(call(prompt));
          }

          @Override
          public ChatOptions getDefaultOptions() {
            return ChatOptions.builder().model("slow-chat").build();
          }
        };
    SpringAiAgentChatAdapter hung = new SpringAiAgentChatAdapter(slow, search, properties());
    Instant started = Instant.now();
    assertThatThrownBy(
            () -> hung.complete(command(AgentContextType.LESSON, Duration.ofMillis(200))))
        .isInstanceOf(AgentProviderUnavailableException.class)
        .satisfies(
            thrown ->
                assertThat(((AgentProviderUnavailableException) thrown).kind())
                    .isEqualTo(AgentProviderUnavailableException.Kind.TIMEOUT));
    assertThat(Duration.between(started, Instant.now())).isLessThan(Duration.ofSeconds(2));
  }

  private static void assertNoConsecutiveUserMessages(List<String> messages) {
    String previous = "";
    for (String message : messages) {
      if (message.startsWith("USER:") && previous.startsWith("USER:")) {
        throw new AssertionError("consecutive USER messages: " + previous + " then " + message);
      }
      previous = message;
    }
  }

  private static AgentProperties properties() {
    return new AgentProperties(
        true,
        "",
        "https://api.x.ai",
        "fake-chat",
        "fake-embed",
        "",
        "",
        40,
        Duration.ofSeconds(8),
        "vs011-v6");
  }

  private static AgentChatCommand command(AgentContextType contextType, Duration timeout) {
    UUID sourceId = UUID.randomUUID();
    UUID revision = UUID.randomUUID();
    GroundedLocator locator =
        new GroundedLocator(contextType, sourceId, "Quadratic identities", 0, revision);
    return new AgentChatCommand(
        UUID.randomUUID(),
        UUID.randomUUID(),
        contextType,
        sourceId,
        UUID.randomUUID(),
        revision,
        "MATHEMATICS",
        "en",
        "en",
        "Why is this identity true?",
        null,
        List.of(),
        new AuthorisedAskGrounding("Quadratic identities", "x^2 + 1", "", false, List.of(locator)),
        timeout);
  }

  private static final class RecordingSearch implements AgentContentSearchPort {
    private List<SearchHit> hits = List.of();

    @Override
    public void ensureIndexed(UUID packageRevisionId) {}

    @Override
    public List<SearchHit> search(
        UUID packageRevisionId, String query, String explanationLanguage, int limit) {
      return hits.size() <= limit ? hits : hits.subList(0, limit);
    }
  }
}
