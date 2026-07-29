package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.AuthSession;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface AuthSessionStore {
  Optional<AuthSession> findForUpdateByTokenHash(String tokenHash);

  AuthSession save(AuthSession session);

  int revokeActiveFamily(UUID familyId, Instant revokedAt);

  int revokeActiveForUser(UUID userId, Instant revokedAt);

  int deleteExpiredAndOldRevoked(Instant now, Instant revokedBefore);
}
