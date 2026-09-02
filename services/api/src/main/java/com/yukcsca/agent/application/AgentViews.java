package com.yukcsca.agent.application;

import com.yukcsca.agent.domain.AgentAnswerKind;
import com.yukcsca.agent.domain.AgentContextType;
import com.yukcsca.agent.domain.AgentTraceStepKind;
import com.yukcsca.agent.domain.AgentTurnStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AgentViews {
  private AgentViews() {}

  public record AvailabilityView(boolean available, String unavailableCode) {}

  public record ConversationView(
      UUID id,
      AgentContextType contextType,
      UUID contextId,
      String subject,
      UUID packageId,
      UUID packageRevisionId,
      UUID sessionId,
      UUID itemId,
      String explanationLanguage,
      String examLanguage,
      List<TurnView> turns,
      Instant createdAt,
      Instant updatedAt) {}

  public record ConversationStartResult(ConversationView conversation, boolean created) {}

  public record TurnView(
      UUID id,
      AgentTurnStatus status,
      String questionText,
      String quote,
      Instant createdAt,
      AgentAnswerKind kind,
      String body,
      List<LocatorView> locators,
      List<StepView> steps,
      List<String> suggestedFollowUps,
      Integer latencyMs) {}

  public record LocatorView(
      AgentContextType sourceKind,
      UUID sourceId,
      String label,
      Integer blockIndex,
      UUID packageRevisionId) {}

  public record StepView(
      AgentTraceStepKind kind, String label, List<LocatorView> locators, int latencyMs) {}
}
