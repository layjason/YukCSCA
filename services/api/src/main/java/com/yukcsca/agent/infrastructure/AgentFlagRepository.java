package com.yukcsca.agent.infrastructure;

import com.yukcsca.agent.application.AgentFlagStore;
import com.yukcsca.agent.domain.AgentFlag;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentFlagRepository extends JpaRepository<AgentFlag, UUID>, AgentFlagStore {}
