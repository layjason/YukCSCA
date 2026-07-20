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
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public AuthService(
      GoogleTokenVerifier googleTokenVerifier,
      AuthIdentityStore identityRepository,
      UserAccountStore userRepository,
      SecurityEventService securityEvents,
      Clock clock) {
    this.googleTokenVerifier = googleTokenVerifier;
    this.identityRepository = identityRepository;
    this.userRepository = userRepository;
    this.securityEvents = securityEvents;
    this.clock = clock;
  }

  @Transactional
  public UserAccount loginWithGoogle(String credential) {
    try {
      GoogleIdentity verified = googleTokenVerifier.verify(credential);
      return identityRepository
          .findByProviderAndProviderSubject(AuthProvider.GOOGLE, verified.subject())
          .map(AuthIdentity::getUser)
          .orElseGet(() -> createGoogleUser(verified));
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
    if (userRepository.findByEmailIgnoreCase(identity.email()).isPresent()) {
      throw new AuthConflictException(
          "An account already exists for this email and must be linked explicitly.");
    }
    Instant now = clock.instant();
    int separator = identity.email().indexOf('@');
    String fallbackName = separator > 0 ? identity.email().substring(0, separator) : "YukCSCA user";
    String displayName =
        identity.displayName() == null || identity.displayName().isBlank()
            ? fallbackName
            : identity.displayName();
    UserAccount user =
        userRepository.save(
            UserAccount.createGoogleUser(identity.email(), displayName, identity.avatarUrl(), now));
    identityRepository.save(new AuthIdentity(user, AuthProvider.GOOGLE, identity.subject(), now));
    return user;
  }
}
