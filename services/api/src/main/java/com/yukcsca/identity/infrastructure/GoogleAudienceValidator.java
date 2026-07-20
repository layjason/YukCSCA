package com.yukcsca.identity.infrastructure;

import java.util.Objects;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public final class GoogleAudienceValidator implements OAuth2TokenValidator<Jwt> {
  private static final OAuth2Error INVALID_AUDIENCE =
      new OAuth2Error("invalid_token", "Google token audience does not match YukCSCA.", null);

  private final String clientId;

  public GoogleAudienceValidator(String clientId) {
    this.clientId = Objects.requireNonNull(clientId);
  }

  @Override
  public OAuth2TokenValidatorResult validate(Jwt token) {
    return token.getAudience().contains(clientId)
        ? OAuth2TokenValidatorResult.success()
        : OAuth2TokenValidatorResult.failure(INVALID_AUDIENCE);
  }
}
