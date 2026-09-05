package com.yukcsca.agent.application;

import java.util.List;

public class AgentValidationException extends RuntimeException {
  private final List<AgentViolation> violations;

  public AgentValidationException(List<AgentViolation> violations) {
    super("Agent request validation failed.");
    this.violations = List.copyOf(violations);
  }

  public List<AgentViolation> violations() {
    return violations;
  }
}
