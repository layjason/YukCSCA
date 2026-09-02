package com.yukcsca.agent.infrastructure;

import com.yukcsca.agent.application.AgentChatPort;
import com.yukcsca.agent.application.AgentDisabledException;

public class DisabledAgentChatPort implements AgentChatPort {
  @Override
  public boolean available() {
    return false;
  }

  @Override
  public AgentChatResult complete(AgentChatCommand command) {
    throw new AgentDisabledException();
  }
}
