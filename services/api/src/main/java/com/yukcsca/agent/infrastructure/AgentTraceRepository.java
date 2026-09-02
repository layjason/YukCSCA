package com.yukcsca.agent.infrastructure;

import com.yukcsca.agent.application.AgentTraceStore;
import com.yukcsca.agent.domain.AgentTrace;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentTraceRepository extends JpaRepository<AgentTrace, UUID>, AgentTraceStore {}
