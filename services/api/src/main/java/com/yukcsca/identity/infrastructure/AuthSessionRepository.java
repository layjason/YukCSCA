package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.AuthSessionStore;
import com.yukcsca.identity.domain.AuthSession;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID>, AuthSessionStore {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select session from AuthSession session join fetch session.user where session.tokenHash = :tokenHash")
  Optional<AuthSession> findForUpdateByTokenHash(@Param("tokenHash") String tokenHash);

  @Modifying(clearAutomatically = true)
  @Query(
      "update AuthSession session set session.revokedAt = :revokedAt "
          + "where session.familyId = :familyId and session.revokedAt is null")
  int revokeActiveFamily(@Param("familyId") UUID familyId, @Param("revokedAt") Instant revokedAt);

  @Override
  @Modifying(flushAutomatically = true)
  @Query(
      "update AuthSession session set session.revokedAt = :revokedAt "
          + "where session.user.id = :userId and session.revokedAt is null "
          + "and session.expiresAt > :revokedAt")
  int revokeActiveForUser(@Param("userId") UUID userId, @Param("revokedAt") Instant revokedAt);

  @Modifying(clearAutomatically = true)
  @Query(
      "delete from AuthSession session where session.expiresAt < :now "
          + "or (session.revokedAt is not null and session.revokedAt < :revokedBefore)")
  int deleteExpiredAndOldRevoked(
      @Param("now") Instant now, @Param("revokedBefore") Instant revokedBefore);
}
