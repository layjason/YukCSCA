package com.yukcsca.agent.application;

import com.yukcsca.agent.domain.AgentTrace;

public interface AgentTraceStore {
  AgentTrace save(AgentTrace trace);
}
