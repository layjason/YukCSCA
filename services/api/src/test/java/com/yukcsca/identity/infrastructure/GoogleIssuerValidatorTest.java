package com.yukcsca.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class GoogleIssuerValidatorTest {
  private final GoogleIssuerValidator validator = new GoogleIssuerValidator();

  @Test
  void acceptsBothGoogleIssuerForms() {
    assertThat(validator.validate(token("accounts.google.com")).hasErrors()).isFalse();
    assertThat(validator.validate(token("https://accounts.google.com")).hasErrors()).isFalse();
  }

  @Test
  void rejectsAnotherIssuer() {
    assertThat(validator.validate(token("https://example.com")).hasErrors()).isTrue();
  }

  private Jwt token(String issuer) {
    Instant now = Instant.now();
    return new Jwt(
        "token",
        now,
        now.plusSeconds(60),
        Map.of("alg", "RS256"),
        Map.of("iss", issuer, "sub", "subject"));
  }
}
