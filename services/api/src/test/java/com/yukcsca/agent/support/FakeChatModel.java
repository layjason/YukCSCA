package com.yukcsca.agent.support;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

@Component
@Primary
@Profile("test")
public class FakeChatModel implements ChatModel {
  public enum Mode {
    REVIEWED,
    DERIVED,
    INSUFFICIENT,
    INVALID_JSON,
    LATEX_JSON,
    DOLLAR_MATH,
    ERROR
  }

  private final AtomicReference<Mode> mode = new AtomicReference<>(Mode.REVIEWED);
  private final AtomicInteger calls = new AtomicInteger();
  private final AtomicReference<String> locatorsJson = new AtomicReference<>("[]");
  private final AtomicReference<String> lastUserText = new AtomicReference<>("");
  private final AtomicReference<String> lastSystemText = new AtomicReference<>("");
  private final AtomicReference<List<String>> lastMessages = new AtomicReference<>(List.of());
  private final AtomicReference<String> rawContent = new AtomicReference<>();

  public void setMode(Mode value) {
    mode.set(value);
  }

  public void setRawContent(String value) {
    rawContent.set(value);
  }

  public void setLocatorsJson(String value) {
    locatorsJson.set(value == null || value.isBlank() ? "[]" : value);
  }

  public int calls() {
    return calls.get();
  }

  public String lastUserText() {
    return lastUserText.get();
  }

  public String lastSystemText() {
    return lastSystemText.get();
  }

  public List<String> lastMessages() {
    return lastMessages.get();
  }

  public void reset() {
    mode.set(Mode.REVIEWED);
    calls.set(0);
    locatorsJson.set("[]");
    lastUserText.set("");
    lastSystemText.set("");
    lastMessages.set(List.of());
    rawContent.set(null);
  }

  @Override
  public ChatResponse call(Prompt prompt) {
    calls.incrementAndGet();
    List<Message> instructions =
        prompt.getInstructions() == null ? List.of() : prompt.getInstructions();
    lastUserText.set(
        instructions.stream()
            .filter(UserMessage.class::isInstance)
            .map(message -> ((UserMessage) message).getText())
            .collect(Collectors.joining("\n")));
    lastSystemText.set(
        instructions.stream()
            .filter(SystemMessage.class::isInstance)
            .map(message -> ((SystemMessage) message).getText())
            .findFirst()
            .orElse(""));
    List<String> labeled = new ArrayList<>();
    for (Message message : instructions) {
      labeled.add(message.getMessageType().name() + ":" + message.getText());
    }
    lastMessages.set(List.copyOf(labeled));
    String raw = rawContent.get();
    if (raw != null) {
      return response(raw);
    }
    return switch (mode.get()) {
      case ERROR -> throw new IllegalStateException("provider-down");
      case INVALID_JSON -> response("not-json");
      case LATEX_JSON ->
          response(
              """
              {"kind":"DERIVED_EXPLANATION","body":"The excluded value is \\(x \\ne 2\\).","locators":[],"suggestedFollowUps":["Next step"],"lowConfidence":false}
              """);
      case DOLLAR_MATH ->
          response(json("DERIVED_EXPLANATION", "The excluded value is $x \\\\ne 2$."));
      case DERIVED -> response(json("DERIVED_EXPLANATION", "Assistance — public mathematics."));
      case INSUFFICIENT ->
          response(json("INSUFFICIENT_EVIDENCE", "Reviewed sources do not support that claim."));
      case REVIEWED -> response(reviewed(prompt));
    };
  }

  @Override
  public Flux<ChatResponse> stream(Prompt prompt) {
    return Flux.just(call(prompt));
  }

  @Override
  public ChatOptions getDefaultOptions() {
    return ChatOptions.builder().model("fake-chat").build();
  }

  private String reviewed(Prompt prompt) {
    String contents = prompt.getUserMessage() == null ? "" : prompt.getUserMessage().getText();
    if (contains(contents, "official")
        || contains(contents, "admission")
        || contains(contents, "scoring")) {
      return json("INSUFFICIENT_EVIDENCE", "Reviewed sources do not support that claim.");
    }
    if (contains(contents, "what is b") || contains(contents, "derived")) {
      return json("DERIVED_EXPLANATION", "Assistance — public mathematics.");
    }
    return json("REVIEWED_SOURCE", "From this lesson, the reviewed text supports the answer.");
  }

  private static boolean contains(String haystack, String needle) {
    return haystack.toLowerCase().contains(needle);
  }

  private String json(String kind, String body) {
    return """
        {"kind":"%s","body":"%s","locators":%s,"suggestedFollowUps":["Ask about the next step"],"lowConfidence":false}
        """
        .formatted(kind, body, locatorsJson.get());
  }

  private static ChatResponse response(String text) {
    return ChatResponse.builder()
        .generations(List.of(new Generation(new AssistantMessage(text))))
        .metadata(ChatResponseMetadata.builder().usage(new DefaultUsage(12, 7)).build())
        .build();
  }
}
