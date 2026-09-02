package com.yukcsca.agent.application;

import com.yukcsca.agent.domain.AgentTurn;
import com.yukcsca.agent.domain.AgentTurnStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentTurnStore {
  AgentTurn save(AgentTurn turn);

  Optional<AgentTurn> findById(UUID id);

  Optional<AgentTurn> findByConversationIdAndIdempotencyKey(
      UUID conversationId, UUID idempotencyKey);

  Optional<AgentTurn> findFirstByConversationIdAndStatus(
      UUID conversationId, AgentTurnStatus status);

  List<AgentTurn> findTop20ByConversationIdOrderByCreatedAtDesc(UUID conversationId);

  long countByAccountIdAndCreatedAtGreaterThanEqual(UUID accountId, Instant since);
}
