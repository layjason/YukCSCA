package com.yukcsca.agent.application;

public class AgentProviderUnavailableException extends RuntimeException {
  public AgentProviderUnavailableException() {
    super("The Ask provider is temporarily unavailable.");
  }

  public AgentProviderUnavailableException(Throwable cause) {
    super("The Ask provider is temporarily unavailable.", cause);
  }
}
