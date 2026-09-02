package com.yukcsca.agent.application;

public class AgentBudgetExceededException extends RuntimeException {
  private final long retryAfterSeconds;

  public AgentBudgetExceededException(long retryAfterSeconds) {
    super("The daily Ask budget has been reached.");
    this.retryAfterSeconds = retryAfterSeconds;
  }

  public long retryAfterSeconds() {
    return retryAfterSeconds;
  }
}
