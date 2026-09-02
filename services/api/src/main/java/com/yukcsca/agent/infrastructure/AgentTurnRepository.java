package com.yukcsca.agent.infrastructure;

import com.yukcsca.agent.application.AgentTurnStore;
import com.yukcsca.agent.domain.AgentTurn;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentTurnRepository extends JpaRepository<AgentTurn, UUID>, AgentTurnStore {}
