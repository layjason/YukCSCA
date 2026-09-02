package com.yukcsca.agent.application;

public class AgentDisabledException extends RuntimeException {
  public AgentDisabledException() {
    super("Ask is unavailable.");
  }
}
