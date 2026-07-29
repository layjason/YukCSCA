package com.yukcsca.identity.application;

public class CredentialRateLimitException extends RuntimeException {
  private final long retryAfterSeconds;

  public CredentialRateLimitException(long retryAfterSeconds) {
    super("Credential request limit exceeded.");
    this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
  }

  public long retryAfterSeconds() {
    return retryAfterSeconds;
  }
}
