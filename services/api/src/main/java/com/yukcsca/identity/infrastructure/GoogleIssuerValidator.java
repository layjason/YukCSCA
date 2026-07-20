package com.yukcsca.identity.infrastructure;

import java.util.Set;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public final class GoogleIssuerValidator implements OAuth2TokenValidator<Jwt> {
  private static final Set<String> VALID_ISSUERS =
      Set.of("accounts.google.com", "https://accounts.google.com");
  private static final OAuth2Error INVALID_ISSUER =
      new OAuth2Error("invalid_token", "Google token issuer is invalid.", null);

  @Override
  public OAuth2TokenValidatorResult validate(Jwt token) {
    String issuer = token.getClaimAsString("iss");
    return VALID_ISSUERS.contains(issuer)
        ? OAuth2TokenValidatorResult.success()
        : OAuth2TokenValidatorResult.failure(INVALID_ISSUER);
  }
}
