package com.yukcsca.identity.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class AuthPropertiesTest {
  @Test
  void rejectsInsecureSameSiteNoneCookie() {
    assertThatThrownBy(
            () ->
                new AuthProperties(
                    "google-client",
                    "01234567890123456789012345678901",
                    "https://api.example",
                    "https://app.example",
                    false,
                    "None",
                    Duration.ofMinutes(15),
                    Duration.ofDays(30)))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Secure");
  }

  @Test
  void rejectsNonPositiveTokenLifetime() {
    assertThatThrownBy(
            () ->
                new AuthProperties(
                    "google-client",
                    "01234567890123456789012345678901",
                    "https://api.example",
                    "https://app.example",
                    true,
                    "Lax",
                    Duration.ZERO,
                    Duration.ofDays(30)))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("TTL");
  }
}
