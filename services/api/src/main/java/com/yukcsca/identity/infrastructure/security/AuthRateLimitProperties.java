package com.yukcsca.identity.infrastructure.security;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("yukcsca.auth.rate-limit")
public record AuthRateLimitProperties(
    @Positive int requests, @NotNull Duration window, @Positive int maxClients) {
  public AuthRateLimitProperties {
    if (window != null && (window.isZero() || window.isNegative())) {
      throw new IllegalArgumentException("Rate-limit window must be positive");
    }
  }
}
