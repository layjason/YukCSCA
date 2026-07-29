package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.PasswordRecoveryClaim;
import com.yukcsca.identity.domain.PasswordRecoveryEmailOutbox;
import com.yukcsca.identity.domain.SecurityEventType;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordRecoveryEmailDispatcher {
  private static final int MAX_BATCH = 20;

  private final PasswordRecoveryEmailOutboxStore outbox;
  private final PasswordRecoveryClaimStore claims;
  private final PasswordRecoveryTokenCodec tokens;
  private final PasswordRecoveryEmailSender sender;
  private final CredentialAuthSettings settings;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public PasswordRecoveryEmailDispatcher(
      PasswordRecoveryEmailOutboxStore outbox,
      PasswordRecoveryClaimStore claims,
      PasswordRecoveryTokenCodec tokens,
      PasswordRecoveryEmailSender sender,
      CredentialAuthSettings settings,
      SecurityEventService securityEvents,
      Clock clock) {
    this.outbox = outbox;
    this.claims = claims;
    this.tokens = tokens;
    this.sender = sender;
    this.settings = settings;
    this.securityEvents = securityEvents;
    this.clock = clock;
  }

  @Scheduled(fixedDelayString = "${yukcsca.auth.credentials.dispatch-interval:5s}")
  @Transactional
  public void dispatchDue() {
    if (!settings.enabled()) return;
    Instant now = clock.instant();
    outbox.findDueForUpdate(now, MAX_BATCH).forEach(delivery -> dispatch(delivery, now));
  }

  private void dispatch(PasswordRecoveryEmailOutbox delivery, Instant now) {
    PasswordRecoveryClaim claim = claims.findById(delivery.getClaimId()).orElse(null);
    if (claim == null || !claim.canConsumeAt(now)) {
      delivery.markTerminal(now, "CLAIM_UNAVAILABLE");
      securityEvents.recordWithinTransaction(
          SecurityEventType.PASSWORD_RECOVERY_DELIVERY_FAILED, null);
      return;
    }
    String token = tokens.tokenFor(claim.getId());
    String url =
        settings.verificationWebOrigin()
            + "/reset-password#token="
            + encode(token)
            + "&email="
            + encode(delivery.getRecipientEmail());
    try {
      sender.send(new PasswordRecoveryEmail(delivery.getRecipientEmail(), url));
      delivery.markSent(now);
      securityEvents.recordWithinTransaction(
          SecurityEventType.PASSWORD_RECOVERY_DELIVERY_SENT, null);
    } catch (RuntimeException providerFailure) {
      delivery.markFailure(now, settings.deliveryMaxAttempts(), settings.deliveryRetryBase());
      securityEvents.recordWithinTransaction(
          SecurityEventType.PASSWORD_RECOVERY_DELIVERY_FAILED, null);
    }
  }

  private static String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
