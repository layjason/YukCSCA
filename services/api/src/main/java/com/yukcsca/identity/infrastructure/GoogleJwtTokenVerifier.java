package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.GoogleIdentity;
import com.yukcsca.identity.application.GoogleTokenVerifier;
import com.yukcsca.identity.application.InvalidCredentialException;
import com.yukcsca.identity.infrastructure.security.AuthProperties;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class GoogleJwtTokenVerifier implements GoogleTokenVerifier {
  private static final String GOOGLE_JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";

  private final NimbusJwtDecoder decoder;

  public GoogleJwtTokenVerifier(AuthProperties properties) {
    this.decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWK_SET_URI).build();
    this.decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefault(),
            new GoogleIssuerValidator(),
            new GoogleAudienceValidator(properties.googleClientId())));
  }

  @Override
  public GoogleIdentity verify(String credential) {
    try {
      Jwt jwt = decoder.decode(credential);
      String subject = required(jwt, "sub");
      String email = required(jwt, "email");
      Object verified = jwt.getClaims().get("email_verified");
      if (!Boolean.TRUE.equals(verified) && !"true".equalsIgnoreCase(String.valueOf(verified))) {
        throw new InvalidCredentialException("Google email is not verified.");
      }
      return new GoogleIdentity(
          subject, email, jwt.getClaimAsString("name"), jwt.getClaimAsString("picture"));
    } catch (JwtException exception) {
      throw new InvalidCredentialException("Google credential is invalid or expired.", exception);
    }
  }

  private static String required(Jwt jwt, String claim) {
    String value = jwt.getClaimAsString(claim);
    if (value == null || value.isBlank()) {
      throw new InvalidCredentialException("Google credential is missing claim: " + claim);
    }
    return value;
  }
}
