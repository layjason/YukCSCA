package com.yukcsca.agent.application;

import com.yukcsca.agent.infrastructure.AgentProperties;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Component;

/** Kill switch for Ask. Production uses configuration; tests may force disable. */
@Component
public class AgentEnablement {
  private final AgentProperties properties;
  private final AtomicBoolean forceDisabled = new AtomicBoolean(false);

  public AgentEnablement(AgentProperties properties) {
    this.properties = properties;
  }

  public boolean enabled() {
    return properties.enabled() && !forceDisabled.get();
  }

  public void setForceDisabled(boolean value) {
    forceDisabled.set(value);
  }
}
