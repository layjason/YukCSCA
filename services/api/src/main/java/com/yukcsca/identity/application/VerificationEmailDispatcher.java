package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.CredentialEmailOutbox;
import com.yukcsca.identity.domain.EmailVerificationClaim;
import com.yukcsca.identity.domain.SecurityEventType;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VerificationEmailDispatcher {
  private static final int MAX_BATCH = 20;

  private final CredentialEmailOutboxStore outbox;
  private final EmailVerificationClaimStore claims;
  private final VerificationTokenCodec tokens;
  private final VerificationEmailSender sender;
  private final CredentialAuthSettings settings;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public VerificationEmailDispatcher(
      CredentialEmailOutboxStore outbox,
      EmailVerificationClaimStore claims,
      VerificationTokenCodec tokens,
      VerificationEmailSender sender,
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

  private void dispatch(CredentialEmailOutbox delivery, Instant now) {
    EmailVerificationClaim claim = claims.findById(delivery.getClaimId()).orElse(null);
    if (claim == null || !claim.canConsumeAt(now)) {
      delivery.markTerminal(now, "CLAIM_UNAVAILABLE");
      securityEvents.recordWithinTransaction(
          SecurityEventType.CREDENTIAL_VERIFICATION_DELIVERY_FAILED, null);
      return;
    }
    String token = tokens.tokenFor(claim.getId());
    String url =
        settings.verificationWebOrigin()
            + "/verify-email#token="
            + encode(token)
            + "&email="
            + encode(delivery.getRecipientEmail());
    try {
      sender.send(new VerificationEmail(delivery.getRecipientEmail(), url));
      delivery.markSent(now);
      securityEvents.recordWithinTransaction(
          SecurityEventType.CREDENTIAL_VERIFICATION_DELIVERY_SENT, null);
    } catch (RuntimeException providerFailure) {
      delivery.markFailure(now, settings.deliveryMaxAttempts(), settings.deliveryRetryBase());
      securityEvents.recordWithinTransaction(
          SecurityEventType.CREDENTIAL_VERIFICATION_DELIVERY_FAILED, null);
    }
  }

  private static String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
