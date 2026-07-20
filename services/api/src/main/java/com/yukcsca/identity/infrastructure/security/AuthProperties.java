package com.yukcsca.identity.infrastructure.security;

import com.yukcsca.identity.application.AuthSettings;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("yukcsca.auth")
public record AuthProperties(
    @NotBlank String googleClientId,
    @NotBlank String jwtSecret,
    @NotBlank String issuer,
    @NotBlank String webOrigin,
    boolean cookieSecure,
    @NotBlank @Pattern(regexp = "Strict|Lax|None") String cookieSameSite,
    @NotNull Duration accessTokenTtl,
    @NotNull Duration refreshTokenTtl)
    implements AuthSettings {
  public AuthProperties {
    if ("None".equals(cookieSameSite) && !cookieSecure) {
      throw new IllegalArgumentException("SameSite=None requires a Secure refresh cookie");
    }
    requirePositive(accessTokenTtl, "Access-token TTL");
    requirePositive(refreshTokenTtl, "Refresh-token TTL");
  }

  private static void requirePositive(Duration duration, String name) {
    if (duration != null && (duration.isZero() || duration.isNegative())) {
      throw new IllegalArgumentException(name + " must be positive");
    }
  }
}
