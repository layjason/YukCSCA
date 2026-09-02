package com.yukcsca.agent.application;

import com.yukcsca.agent.domain.AgentAnswerKind;
import com.yukcsca.agent.domain.AgentContextType;
import com.yukcsca.agent.domain.AgentTraceStepKind;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * Application port for the first learning-agent adapter (ADR-0004). Infrastructure implements this
 * with Spring AI; tests use a fake ChatModel/EmbeddingModel.
 */
public interface AgentChatPort {
  boolean available();

  AgentChatResult complete(AgentChatCommand command);

  record AgentChatCommand(
      UUID accountId,
      UUID conversationId,
      AgentContextType contextType,
      UUID contextId,
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      String explanationLanguage,
      String examLanguage,
      String questionText,
      String quote,
      List<PriorTurn> recentTurns,
      AuthorisedAskGrounding grounding,
      Duration timeout) {}

  record PriorTurn(String questionText, String quote, String kind, String body) {}

  record AuthorisedAskGrounding(
      String currentObjectLabel,
      String currentObjectExcerpt,
      boolean openScoredItem,
      List<GroundedLocator> currentLocators) {}

  record GroundedLocator(
      AgentContextType sourceKind,
      UUID sourceId,
      String label,
      Integer blockIndex,
      UUID packageRevisionId) {}

  record AgentChatResult(
      AgentAnswerKind kind,
      String body,
      List<GroundedLocator> locators,
      List<TraceStep> steps,
      List<String> suggestedFollowUps,
      boolean lowConfidence,
      int tokenUsage,
      String modelVersion) {}

  record TraceStep(
      AgentTraceStepKind kind, String label, List<GroundedLocator> locators, int latencyMs) {}
}
