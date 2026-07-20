package com.yukcsca.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class GoogleAudienceValidatorTest {
  private final GoogleAudienceValidator validator = new GoogleAudienceValidator("expected-client");

  @Test
  void acceptsExpectedAudience() {
    Jwt jwt = token(List.of("expected-client"));
    assertThat(validator.validate(jwt).hasErrors()).isFalse();
  }

  @Test
  void rejectsDifferentAudience() {
    Jwt jwt = token(List.of("other-client"));
    assertThat(validator.validate(jwt).hasErrors()).isTrue();
  }

  private Jwt token(List<String> audience) {
    Instant now = Instant.now();
    return new Jwt(
        "token",
        now,
        now.plusSeconds(60),
        Map.of("alg", "RS256"),
        Map.of("aud", audience, "sub", "subject"));
  }
}
