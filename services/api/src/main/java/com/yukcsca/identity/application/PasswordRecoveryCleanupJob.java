package com.yukcsca.identity.application;

import java.time.Clock;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordRecoveryCleanupJob {
  private final PasswordRecoveryClaimStore claims;
  private final CredentialAuthSettings settings;
  private final Clock clock;

  public PasswordRecoveryCleanupJob(
      PasswordRecoveryClaimStore claims, CredentialAuthSettings settings, Clock clock) {
    this.claims = claims;
    this.settings = settings;
    this.clock = clock;
  }

  @Scheduled(fixedDelayString = "${yukcsca.auth.credentials.cleanup-interval:1h}")
  @Transactional
  public void cleanup() {
    Instant now = clock.instant();
    claims.expirePendingBefore(now);
    claims.deleteCompletedBefore(now.minus(settings.pendingRetention()));
  }
}
