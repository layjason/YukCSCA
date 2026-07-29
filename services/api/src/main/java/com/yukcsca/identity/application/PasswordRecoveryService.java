package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.CredentialAuthenticator;
import com.yukcsca.identity.domain.PasswordRecoveryClaim;
import com.yukcsca.identity.domain.PasswordRecoveryEmailOutbox;
import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.domain.UserAccount;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordRecoveryService {
  private final CredentialAuthSettings settings;
  private final PasswordRecoveryTokenCodec tokenCodec;
  private final PasswordPolicy passwordPolicy;
  private final PasswordHasher passwordHasher;
  private final CredentialIdentifierRateLimiter identifierRateLimiter;
  private final CanonicalEmailLock emailLock;
  private final PasswordRecoveryClaimStore claims;
  private final PasswordRecoveryEmailOutboxStore outbox;
  private final UserAccountStore users;
  private final CredentialAuthenticatorStore authenticators;
  private final SessionService sessions;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public PasswordRecoveryService(
      CredentialAuthSettings settings,
      PasswordRecoveryTokenCodec tokenCodec,
      PasswordPolicy passwordPolicy,
      PasswordHasher passwordHasher,
      CredentialIdentifierRateLimiter identifierRateLimiter,
      CanonicalEmailLock emailLock,
      PasswordRecoveryClaimStore claims,
      PasswordRecoveryEmailOutboxStore outbox,
      UserAccountStore users,
      CredentialAuthenticatorStore authenticators,
      SessionService sessions,
      SecurityEventService securityEvents,
      Clock clock) {
    this.settings = settings;
    this.tokenCodec = tokenCodec;
    this.passwordPolicy = passwordPolicy;
    this.passwordHasher = passwordHasher;
    this.identifierRateLimiter = identifierRateLimiter;
    this.emailLock = emailLock;
    this.claims = claims;
    this.outbox = outbox;
    this.users = users;
    this.authenticators = authenticators;
    this.sessions = sessions;
    this.securityEvents = securityEvents;
    this.clock = clock;
  }

  @Transactional
  public void requestRecovery(String email) {
    requireRecoveryReady();
    String canonicalEmail = canonicalize(email);
    identifierRateLimiter.check("password-recovery-request", canonicalEmail);
    emailLock.lock(canonicalEmail);
    Instant now = clock.instant();

    UserAccount account = users.findByCanonicalEmailForUpdate(canonicalEmail).orElse(null);
    if (account != null && authenticators.findByUserId(account.getId()).isPresent()) {
      claims
          .findPendingForUpdateByUserId(account.getId())
          .ifPresentOrElse(
              current -> {
                if (current.canResendAt(now)) {
                  current.supersede(now);
                  claims.flush();
                  createClaimAndDelivery(account, canonicalEmail, now);
                }
              },
              () -> createClaimAndDelivery(account, canonicalEmail, now));
    }
    securityEvents.recordWithinTransaction(SecurityEventType.PASSWORD_RECOVERY_REQUESTED, null);
  }

  @Transactional(noRollbackFor = {PasswordRecoveryException.class, PasswordPolicyException.class})
  public void completeRecovery(String rawToken, String password) {
    requireRecoveryReady();
    identifierRateLimiter.check("password-recovery-complete", rawToken);
    UUID claimId = tokenCodec.claimIdFrom(rawToken).orElseThrow(this::recoveryRejected);
    String canonicalEmail =
        claims.findCanonicalEmailById(claimId).orElseThrow(this::recoveryRejected);

    emailLock.lock(canonicalEmail);
    PasswordRecoveryClaim claim =
        claims.findForUpdateById(claimId).orElseThrow(this::recoveryRejected);
    Instant now = clock.instant();
    if (!claim.canConsumeAt(now)
        || !MessageDigest.isEqual(
            claim.getTokenHash().getBytes(StandardCharsets.US_ASCII),
            tokenCodec.hash(rawToken).getBytes(StandardCharsets.US_ASCII))) {
      throw recoveryRejected();
    }

    UserAccount account =
        users
            .findByCanonicalEmailForUpdate(claim.getCanonicalEmail())
            .filter(candidate -> candidate.getId().equals(claim.getUserId()))
            .orElseThrow(this::recoveryRejected);
    CredentialAuthenticator authenticator =
        authenticators.findForUpdateByUserId(account.getId()).orElseThrow(this::recoveryRejected);
    String normalizedPassword;
    try {
      normalizedPassword = passwordPolicy.validateAndNormalize(password);
    } catch (PasswordPolicyException rejectedPassword) {
      securityEvents.recordWithinTransaction(SecurityEventType.PASSWORD_RECOVERY_REJECTED, null);
      throw rejectedPassword;
    }

    authenticator.replacePasswordHash(passwordHasher.hash(normalizedPassword), now);
    claim.consume(now);
    sessions.revokeAllForUser(account.getId());
    securityEvents.recordWithinTransaction(
        SecurityEventType.PASSWORD_RECOVERY_SUCCEEDED, account.getId());
  }

  private void createClaimAndDelivery(UserAccount account, String canonicalEmail, Instant now) {
    UUID claimId = UUID.randomUUID();
    String token = tokenCodec.tokenFor(claimId);
    PasswordRecoveryClaim claim =
        new PasswordRecoveryClaim(
            claimId,
            account.getId(),
            canonicalEmail,
            tokenCodec.hash(token),
            now.plus(settings.claimTtl()),
            now.plus(settings.resendCooldown()),
            now);
    claims.save(claim);
    outbox.save(new PasswordRecoveryEmailOutbox(claimId, canonicalEmail, now));
  }

  private PasswordRecoveryException recoveryRejected() {
    securityEvents.recordWithinTransaction(SecurityEventType.PASSWORD_RECOVERY_REJECTED, null);
    return new PasswordRecoveryException();
  }

  private void requireRecoveryReady() {
    if (!settings.enabled()
        || isBlank(settings.verificationSecret())
        || settings.verificationSecret().getBytes(StandardCharsets.UTF_8).length < 32
        || !isAllowedWebOrigin(settings.verificationWebOrigin())
        || isBlank(settings.mailFrom())) {
      throw new PasswordRecoveryConfigurationException();
    }
  }

  private static String canonicalize(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private static boolean isAllowedWebOrigin(String value) {
    if (isBlank(value)) return false;
    try {
      URI origin = URI.create(value);
      boolean secure = "https".equalsIgnoreCase(origin.getScheme());
      boolean localHttp =
          "http".equalsIgnoreCase(origin.getScheme())
              && ("localhost".equalsIgnoreCase(origin.getHost())
                  || "127.0.0.1".equals(origin.getHost()));
      return (secure || localHttp)
          && origin.getHost() != null
          && origin.getUserInfo() == null
          && (origin.getPath() == null || origin.getPath().isEmpty())
          && origin.getQuery() == null
          && origin.getFragment() == null;
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }
}
