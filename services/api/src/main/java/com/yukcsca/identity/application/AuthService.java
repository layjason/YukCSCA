package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.AuthIdentity;
import com.yukcsca.identity.domain.AuthProvider;
import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.domain.UserAccount;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final GoogleTokenVerifier googleTokenVerifier;
  private final AuthIdentityStore identityRepository;
  private final UserAccountStore userRepository;
  private final CanonicalEmailLock emailLock;
  private final SecurityEventService securityEvents;
  private final FirstAdminProvisioner firstAdmin;
  private final Clock clock;

  public AuthService(
      GoogleTokenVerifier googleTokenVerifier,
      AuthIdentityStore identityRepository,
      UserAccountStore userRepository,
      CanonicalEmailLock emailLock,
      SecurityEventService securityEvents,
      FirstAdminProvisioner firstAdmin,
      Clock clock) {
    this.googleTokenVerifier = googleTokenVerifier;
    this.identityRepository = identityRepository;
    this.userRepository = userRepository;
    this.emailLock = emailLock;
    this.securityEvents = securityEvents;
    this.firstAdmin = firstAdmin;
    this.clock = clock;
  }

  @Transactional
  public UserAccount loginWithGoogle(String credential) {
    try {
      GoogleIdentity verified = googleTokenVerifier.verify(credential);
      UserAccount account =
          identityRepository
              .findByProviderAndProviderSubject(AuthProvider.GOOGLE, verified.subject())
              .map(AuthIdentity::getUser)
              .orElseGet(() -> createGoogleUser(verified));
      return firstAdmin.recognize(account);
    } catch (InvalidCredentialException | AuthConflictException exception) {
      securityEvents.record(SecurityEventType.GOOGLE_LOGIN_REJECTED, null);
      throw exception;
    }
  }

  @Transactional(readOnly = true)
  public UserAccount requireUser(UUID userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new InvalidCredentialException("Authenticated user no longer exists."));
  }

  private UserAccount createGoogleUser(GoogleIdentity identity) {
    String canonicalEmail = identity.email().trim().toLowerCase(java.util.Locale.ROOT);
    emailLock.lock(canonicalEmail);
    if (userRepository.findByCanonicalEmailForUpdate(canonicalEmail).isPresent()) {
      throw new AuthConflictException(
          "An account already exists for this email and must be linked explicitly.");
    }
    Instant now = clock.instant();
    String displayName =
        identity.displayName() == null || identity.displayName().isBlank()
            ? "YukCSCA user"
            : identity.displayName();
    UserAccount user =
        userRepository.save(
            UserAccount.createGoogleUser(identity.email(), displayName, identity.avatarUrl(), now));
    identityRepository.save(new AuthIdentity(user, AuthProvider.GOOGLE, identity.subject(), now));
    return user;
  }
}
