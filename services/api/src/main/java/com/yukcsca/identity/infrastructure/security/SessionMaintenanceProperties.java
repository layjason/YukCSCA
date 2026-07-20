package com.yukcsca.identity.infrastructure.security;

import com.yukcsca.identity.application.SessionMaintenanceSettings;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("yukcsca.auth.session-maintenance")
public record SessionMaintenanceProperties(
    @NotNull Duration cleanupInterval, @NotNull Duration retention)
    implements SessionMaintenanceSettings {
  public SessionMaintenanceProperties {
    requirePositive(cleanupInterval, "Cleanup interval");
    requirePositive(retention, "Session retention");
  }

  private static void requirePositive(Duration duration, String name) {
    if (duration != null && (duration.isZero() || duration.isNegative())) {
      throw new IllegalArgumentException(name + " must be positive");
    }
  }
}
