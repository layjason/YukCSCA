package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.CredentialAuthenticator;
import com.yukcsca.identity.domain.CredentialEmailOutbox;
import com.yukcsca.identity.domain.EmailVerificationClaim;
import com.yukcsca.identity.domain.PolicyAcceptance;
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
public class CredentialAuthService {
  private final CredentialAuthSettings settings;
  private final VerificationTokenCodec tokenCodec;
  private final PasswordPolicy passwordPolicy;
  private final PasswordHasher passwordHasher;
  private final CredentialIdentifierRateLimiter identifierRateLimiter;
  private final CanonicalEmailLock emailLock;
  private final EmailVerificationClaimStore claims;
  private final CredentialEmailOutboxStore outbox;
  private final UserAccountStore users;
  private final CredentialAuthenticatorStore authenticators;
  private final PolicyAcceptanceStore policyAcceptances;
  private final SessionService sessions;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public CredentialAuthService(
      CredentialAuthSettings settings,
      VerificationTokenCodec tokenCodec,
      PasswordPolicy passwordPolicy,
      PasswordHasher passwordHasher,
      CredentialIdentifierRateLimiter identifierRateLimiter,
      CanonicalEmailLock emailLock,
      EmailVerificationClaimStore claims,
      CredentialEmailOutboxStore outbox,
      UserAccountStore users,
      CredentialAuthenticatorStore authenticators,
      PolicyAcceptanceStore policyAcceptances,
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
    this.policyAcceptances = policyAcceptances;
    this.sessions = sessions;
    this.securityEvents = securityEvents;
    this.clock = clock;
  }

  @Transactional
  public void startRegistration(String email) {
    requireEnrollmentReady();
    String canonicalEmail = canonicalize(email);
    identifierRateLimiter.check("registration", canonicalEmail);
    emailLock.lock(canonicalEmail);
    Instant now = clock.instant();

    if (users.findByCanonicalEmailForUpdate(canonicalEmail).isEmpty()
        && claims.findPendingForUpdateByCanonicalEmail(canonicalEmail).isEmpty()) {
      createClaimAndDelivery(canonicalEmail, now);
    }
    securityEvents.recordWithinTransaction(
        SecurityEventType.CREDENTIAL_REGISTRATION_REQUESTED, null);
  }

  @Transactional
  public void resendVerification(String email) {
    requireEnrollmentReady();
    String canonicalEmail = canonicalize(email);
    identifierRateLimiter.check("resend", canonicalEmail);
    emailLock.lock(canonicalEmail);
    Instant now = clock.instant();

    if (users.findByCanonicalEmailForUpdate(canonicalEmail).isPresent()) {
      return;
    }
    claims
        .findPendingForUpdateByCanonicalEmail(canonicalEmail)
        .filter(claim -> claim.canResendAt(now))
        .ifPresent(
            current -> {
              current.supersede(now);
              claims.flush();
              createClaimAndDelivery(canonicalEmail, now);
            });
  }

  @Transactional(noRollbackFor = CredentialVerificationException.class)
  public CredentialVerificationOutcome completeVerification(
      String rawToken,
      String password,
      String termsVersion,
      String privacyNoticeVersion,
      boolean termsAccepted,
      boolean privacyNoticeAcknowledged) {
    requireCompletionReady();
    identifierRateLimiter.check("verification", rawToken);
    verifyPolicy(termsVersion, privacyNoticeVersion, termsAccepted, privacyNoticeAcknowledged);
    UUID claimId = tokenCodec.claimIdFrom(rawToken).orElseThrow(this::verificationRejected);
    EmailVerificationClaim claim =
        claims.findForUpdateById(claimId).orElseThrow(this::verificationRejected);
    Instant now = clock.instant();
    if (!claim.canConsumeAt(now)
        || !MessageDigest.isEqual(
            claim.getTokenHash().getBytes(StandardCharsets.US_ASCII),
            tokenCodec.hash(rawToken).getBytes(StandardCharsets.US_ASCII))) {
      securityEvents.recordWithinTransaction(
          SecurityEventType.CREDENTIAL_VERIFICATION_REJECTED, null);
      throw new CredentialVerificationException();
    }

    String canonicalEmail = claim.getCanonicalEmail();
    emailLock.lock(canonicalEmail);
    UserAccount existing = users.findByCanonicalEmailForUpdate(canonicalEmail).orElse(null);
    if (existing != null) {
      if (authenticators.findByUserId(existing.getId()).isPresent()) {
        throw verificationRejected();
      }
      claim.completeWithGoogleCollision(now);
      securityEvents.recordWithinTransaction(
          SecurityEventType.CREDENTIAL_VERIFICATION_GOOGLE_COLLISION, existing.getId());
      return CredentialVerificationOutcome.SIGN_IN_WITH_GOOGLE;
    }

    String normalizedPassword = passwordPolicy.validateAndNormalize(password);
    UserAccount account = users.save(UserAccount.createCredentialUser(canonicalEmail, now));
    authenticators.save(
        new CredentialAuthenticator(account, passwordHasher.hash(normalizedPassword), now));
    policyAcceptances.save(new PolicyAcceptance(account, termsVersion, privacyNoticeVersion, now));
    claim.completeWithAccount(now);
    securityEvents.recordWithinTransaction(
        SecurityEventType.CREDENTIAL_VERIFICATION_SUCCEEDED, account.getId());
    return CredentialVerificationOutcome.CREDENTIAL_ACCOUNT_CREATED;
  }

  @Transactional(noRollbackFor = InvalidCredentialException.class)
  public CredentialSession authenticate(String email, String password) {
    String canonicalEmail = canonicalize(email);
    identifierRateLimiter.check("login", canonicalEmail);
    emailLock.lock(canonicalEmail);
    String normalizedPassword = passwordPolicy.normalizeForAuthentication(password);
    UserAccount account = users.findByEmailIgnoreCase(canonicalEmail).orElse(null);
    CredentialAuthenticator authenticator =
        account == null ? null : authenticators.findByUserId(account.getId()).orElse(null);
    String candidateHash =
        authenticator == null ? passwordHasher.dummyHash() : authenticator.getPasswordHash();
    boolean matches = passwordHasher.matches(normalizedPassword, candidateHash);

    if (authenticator == null || !matches) {
      securityEvents.recordWithinTransaction(SecurityEventType.CREDENTIAL_LOGIN_REJECTED, null);
      throw new InvalidCredentialException("Email or password is invalid.");
    }
    if (passwordHasher.needsUpgrade(authenticator.getPasswordHash())) {
      authenticator.replacePasswordHash(passwordHasher.hash(normalizedPassword), clock.instant());
    }
    SessionService.SessionToken session = sessions.create(account);
    securityEvents.recordWithinTransaction(
        SecurityEventType.CREDENTIAL_LOGIN_SUCCEEDED, account.getId());
    return new CredentialSession(account, session.rawToken());
  }

  private void createClaimAndDelivery(String canonicalEmail, Instant now) {
    UUID claimId = UUID.randomUUID();
    String token = tokenCodec.tokenFor(claimId);
    EmailVerificationClaim claim =
        new EmailVerificationClaim(
            claimId,
            canonicalEmail,
            tokenCodec.hash(token),
            now.plus(settings.claimTtl()),
            now.plus(settings.resendCooldown()),
            now);
    claims.save(claim);
    outbox.save(new CredentialEmailOutbox(claimId, canonicalEmail, now));
  }

  private void verifyPolicy(
      String termsVersion,
      String privacyNoticeVersion,
      boolean termsAccepted,
      boolean privacyNoticeAcknowledged) {
    if (!termsAccepted
        || !privacyNoticeAcknowledged
        || !settings.termsVersion().equals(termsVersion)
        || !settings.privacyNoticeVersion().equals(privacyNoticeVersion)) {
      throw new CredentialPolicyException();
    }
  }

  private CredentialVerificationException verificationRejected() {
    securityEvents.recordWithinTransaction(
        SecurityEventType.CREDENTIAL_VERIFICATION_REJECTED, null);
    return new CredentialVerificationException();
  }

  private void requireEnrollmentReady() {
    requireCompletionReady();
    if (!settings.enabled() || isBlank(settings.mailFrom())) {
      throw new CredentialConfigurationException(
          "Credential registration is temporarily unavailable.");
    }
  }

  private void requireCompletionReady() {
    if (isBlank(settings.verificationSecret())
        || settings.verificationSecret().getBytes(StandardCharsets.UTF_8).length < 32
        || !isAllowedWebOrigin(settings.verificationWebOrigin())
        || isBlank(settings.termsVersion())
        || isBlank(settings.privacyNoticeVersion())) {
      throw new CredentialConfigurationException(
          "Credential registration is temporarily unavailable.");
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

  public record CredentialSession(UserAccount account, String rawRefreshToken) {}
}
