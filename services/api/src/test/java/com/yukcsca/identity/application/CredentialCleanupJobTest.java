package com.yukcsca.identity.application;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class CredentialCleanupJobTest {
  private static final Instant NOW = Instant.parse("2026-07-28T00:00:00Z");

  @Test
  void expiresPendingClaimsAndDeletesCompletedClaimsAfterRetention() {
    EmailVerificationClaimStore claims = mock(EmailVerificationClaimStore.class);
    CredentialAuthSettings settings = mock(CredentialAuthSettings.class);
    when(settings.pendingRetention()).thenReturn(Duration.ofHours(24));
    CredentialCleanupJob job =
        new CredentialCleanupJob(claims, settings, Clock.fixed(NOW, ZoneOffset.UTC));

    job.cleanup();

    verify(claims).expirePendingBefore(NOW);
    verify(claims).deleteCompletedBefore(NOW.minus(Duration.ofHours(24)));
  }
}
