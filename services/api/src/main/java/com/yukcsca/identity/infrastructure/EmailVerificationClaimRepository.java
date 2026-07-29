package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.EmailVerificationClaimStore;
import com.yukcsca.identity.domain.EmailVerificationClaim;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationClaimRepository
    extends JpaRepository<EmailVerificationClaim, UUID>, EmailVerificationClaimStore {
  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select claim from EmailVerificationClaim claim "
          + "where claim.canonicalEmail = :canonicalEmail and claim.status = "
          + "com.yukcsca.identity.domain.EmailVerificationClaimStatus.PENDING")
  Optional<EmailVerificationClaim> findPendingForUpdateByCanonicalEmail(
      @Param("canonicalEmail") String canonicalEmail);

  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select claim from EmailVerificationClaim claim where claim.id = :id")
  Optional<EmailVerificationClaim> findForUpdateById(@Param("id") UUID id);

  @Override
  @Modifying(clearAutomatically = true)
  @Query(
      "update EmailVerificationClaim claim "
          + "set claim.status = com.yukcsca.identity.domain.EmailVerificationClaimStatus.EXPIRED, "
          + "claim.updatedAt = :now "
          + "where claim.status = com.yukcsca.identity.domain.EmailVerificationClaimStatus.PENDING "
          + "and claim.expiresAt <= :now")
  int expirePendingBefore(@Param("now") Instant now);

  @Override
  @Modifying(clearAutomatically = true)
  @Query(
      "delete from EmailVerificationClaim claim "
          + "where claim.status <> com.yukcsca.identity.domain.EmailVerificationClaimStatus.PENDING "
          + "and claim.updatedAt < :cutoff")
  int deleteCompletedBefore(@Param("cutoff") Instant cutoff);
}
