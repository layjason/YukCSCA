package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.UserAccount;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class AccessTokenService {
  private final JwtEncoder encoder;
  private final AuthSettings properties;
  private final Clock clock;

  public AccessTokenService(JwtEncoder encoder, AuthSettings properties, Clock clock) {
    this.encoder = encoder;
    this.properties = properties;
    this.clock = clock;
  }

  public IssuedAccessToken issue(UserAccount user) {
    Instant now = clock.instant();
    Instant expiry = now.plus(properties.accessTokenTtl());
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(properties.issuer())
            .subject(user.getId().toString())
            .issuedAt(now)
            .expiresAt(expiry)
            .claim("roles", List.of(user.getRole().name()))
            .claim("email", user.getEmail())
            .build();
    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
    String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    return new IssuedAccessToken(token, properties.accessTokenTtl().toSeconds());
  }

  public record IssuedAccessToken(String value, long expiresInSeconds) {}
}
