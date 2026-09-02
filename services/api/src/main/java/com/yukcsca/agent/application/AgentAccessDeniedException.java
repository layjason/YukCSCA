package com.yukcsca.agent.application;

public class AgentAccessDeniedException extends RuntimeException {
  public AgentAccessDeniedException() {
    super("The account cannot access agent resources.");
  }
}
