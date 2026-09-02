package com.yukcsca.agent.application;

import com.yukcsca.agent.domain.AgentContextType;
import com.yukcsca.agent.domain.AgentConversation;
import java.util.Optional;
import java.util.UUID;

public interface AgentConversationStore {
  AgentConversation save(AgentConversation conversation);

  Optional<AgentConversation> findById(UUID id);

  Optional<AgentConversation> findByAccountIdAndContextTypeAndContextId(
      UUID accountId, AgentContextType contextType, UUID contextId);
}
