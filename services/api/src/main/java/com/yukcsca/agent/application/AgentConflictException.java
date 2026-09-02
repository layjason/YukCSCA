package com.yukcsca.agent.application;

public class AgentConflictException extends RuntimeException {
  private final String code;

  public AgentConflictException(String code, String message) {
    super(message);
    this.code = code;
  }

  public String code() {
    return code;
  }
}
