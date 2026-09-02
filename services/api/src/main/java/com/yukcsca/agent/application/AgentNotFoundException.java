package com.yukcsca.agent.application;

public class AgentNotFoundException extends RuntimeException {
  public AgentNotFoundException() {
    super("Agent resource not found.");
  }

  public AgentNotFoundException(String message) {
    super(message);
  }
}
