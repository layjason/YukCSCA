package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.PasswordRecoveryClaimStore;
import com.yukcsca.identity.domain.PasswordRecoveryClaim;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordRecoveryClaimRepository
    extends JpaRepository<PasswordRecoveryClaim, UUID>, PasswordRecoveryClaimStore {
  @Override
  @Query("select claim.canonicalEmail from PasswordRecoveryClaim claim where claim.id = :id")
  Optional<String> findCanonicalEmailById(@Param("id") UUID id);

  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select claim from PasswordRecoveryClaim claim "
          + "where claim.userId = :userId and claim.status = "
          + "com.yukcsca.identity.domain.PasswordRecoveryClaimStatus.PENDING")
  Optional<PasswordRecoveryClaim> findPendingForUpdateByUserId(@Param("userId") UUID userId);

  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select claim from PasswordRecoveryClaim claim where claim.id = :id")
  Optional<PasswordRecoveryClaim> findForUpdateById(@Param("id") UUID id);

  @Override
  @Modifying(clearAutomatically = true)
  @Query(
      "update PasswordRecoveryClaim claim "
          + "set claim.status = com.yukcsca.identity.domain.PasswordRecoveryClaimStatus.EXPIRED, "
          + "claim.updatedAt = :now "
          + "where claim.status = com.yukcsca.identity.domain.PasswordRecoveryClaimStatus.PENDING "
          + "and claim.expiresAt <= :now")
  int expirePendingBefore(@Param("now") Instant now);

  @Override
  @Modifying(clearAutomatically = true)
  @Query(
      "delete from PasswordRecoveryClaim claim "
          + "where claim.status <> com.yukcsca.identity.domain.PasswordRecoveryClaimStatus.PENDING "
          + "and claim.updatedAt < :cutoff")
  int deleteCompletedBefore(@Param("cutoff") Instant cutoff);
}
