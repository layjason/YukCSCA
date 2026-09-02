package com.yukcsca.agent.infrastructure;

import com.yukcsca.agent.application.AgentConversationStore;
import com.yukcsca.agent.domain.AgentConversation;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentConversationRepository
    extends JpaRepository<AgentConversation, UUID>, AgentConversationStore {}
