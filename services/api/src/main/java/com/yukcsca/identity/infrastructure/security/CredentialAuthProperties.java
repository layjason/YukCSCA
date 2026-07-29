package com.yukcsca.identity.infrastructure.security;

import com.yukcsca.identity.application.CredentialAuthSettings;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("yukcsca.auth.credentials")
public record CredentialAuthProperties(
    boolean enabled,
    String verificationSecret,
    String verificationWebOrigin,
    String termsVersion,
    String privacyNoticeVersion,
    String mailFrom,
    @NotNull Duration claimTtl,
    @NotNull Duration pendingRetention,
    @NotNull Duration resendCooldown,
    @Positive int identifierRequests,
    @NotNull Duration identifierWindow,
    @Positive int maxIdentifiers,
    @NotNull Duration deliveryRetryBase,
    @Positive int deliveryMaxAttempts,
    @NotNull Duration dispatchInterval,
    @NotNull Duration cleanupInterval)
    implements CredentialAuthSettings {
  public CredentialAuthProperties {
    requirePositive(claimTtl, "Verification claim TTL");
    requirePositive(pendingRetention, "Pending-claim retention");
    requirePositive(resendCooldown, "Resend cooldown");
    requirePositive(identifierWindow, "Identifier rate-limit window");
    requirePositive(deliveryRetryBase, "Delivery retry base");
    requirePositive(dispatchInterval, "Delivery dispatch interval");
    requirePositive(cleanupInterval, "Credential cleanup interval");
  }

  private static void requirePositive(Duration duration, String name) {
    if (duration != null && (duration.isZero() || duration.isNegative())) {
      throw new IllegalArgumentException(name + " must be positive");
    }
  }
}
