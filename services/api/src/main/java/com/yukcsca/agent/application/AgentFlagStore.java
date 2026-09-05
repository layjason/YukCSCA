package com.yukcsca.agent.application;

import com.yukcsca.agent.domain.AgentFlag;

public interface AgentFlagStore {
  AgentFlag save(AgentFlag flag);
}
