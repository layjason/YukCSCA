package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.AuthSession;
import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.domain.UserAccount;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionService {
  private final AuthSessionStore sessionRepository;
  private final RefreshTokenCodec tokenCodec;
  private final AuthSettings properties;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public SessionService(
      AuthSessionStore sessionRepository,
      RefreshTokenCodec tokenCodec,
      AuthSettings properties,
      SecurityEventService securityEvents,
      Clock clock) {
    this.sessionRepository = sessionRepository;
    this.tokenCodec = tokenCodec;
    this.properties = properties;
    this.securityEvents = securityEvents;
    this.clock = clock;
  }

  @Transactional
  public SessionToken create(UserAccount user) {
    return issue(user, UUID.randomUUID(), clock.instant());
  }

  @Transactional(noRollbackFor = InvalidCredentialException.class)
  public SessionToken rotate(String rawToken) {
    Instant now = clock.instant();
    AuthSession existing =
        sessionRepository
            .findForUpdateByTokenHash(tokenCodec.hash(rawToken))
            .orElseThrow(
                () -> {
                  securityEvents.record(SecurityEventType.REFRESH_REJECTED, null);
                  return new InvalidCredentialException("Refresh session is invalid.");
                });

    if (!existing.isActiveAt(now)) {
      if (existing.isRevoked()) {
        sessionRepository.revokeActiveFamily(existing.getFamilyId(), now);
        securityEvents.record(SecurityEventType.REFRESH_REUSE_DETECTED, existing.getUser().getId());
      } else {
        securityEvents.record(SecurityEventType.REFRESH_REJECTED, existing.getUser().getId());
      }
      throw new InvalidCredentialException("Refresh session is expired, revoked, or reused.");
    }

    String successorToken = tokenCodec.generate();
    AuthSession successor =
        new AuthSession(
            existing.getUser(),
            tokenCodec.hash(successorToken),
            existing.getFamilyId(),
            now.plus(properties.refreshTokenTtl()),
            now);
    existing.rotateAt(now, successor.getId());
    sessionRepository.save(successor);
    return new SessionToken(successorToken, existing.getUser());
  }

  @Transactional
  public UUID revoke(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) return null;
    return sessionRepository
        .findForUpdateByTokenHash(tokenCodec.hash(rawToken))
        .map(
            session -> {
              session.revokeAt(clock.instant());
              return session.getUser().getId();
            })
        .orElse(null);
  }

  @Transactional
  public int revokeAllForUser(UUID userId) {
    return sessionRepository.revokeActiveForUser(userId, clock.instant());
  }

  private SessionToken issue(UserAccount user, UUID familyId, Instant now) {
    String rawToken = tokenCodec.generate();
    sessionRepository.save(
        new AuthSession(
            user,
            tokenCodec.hash(rawToken),
            familyId,
            now.plus(properties.refreshTokenTtl()),
            now));
    return new SessionToken(rawToken, user);
  }

  public record SessionToken(String rawToken, UserAccount user) {}
}
