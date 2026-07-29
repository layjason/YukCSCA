package com.yukcsca.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "password_recovery_claim")
public class PasswordRecoveryClaim {
  @Id private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "canonical_email", nullable = false, length = 320)
  private String canonicalEmail;

  @Column(name = "token_hash", nullable = false, unique = true, length = 64)
  private String tokenHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private PasswordRecoveryClaimStatus status;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "resend_available_at", nullable = false)
  private Instant resendAvailableAt;

  @Column(name = "consumed_at")
  private Instant consumedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected PasswordRecoveryClaim() {}

  public PasswordRecoveryClaim(
      UUID id,
      UUID userId,
      String canonicalEmail,
      String tokenHash,
      Instant expiresAt,
      Instant resendAvailableAt,
      Instant now) {
    this.id = id;
    this.userId = userId;
    this.canonicalEmail = canonicalEmail;
    this.tokenHash = tokenHash;
    this.status = PasswordRecoveryClaimStatus.PENDING;
    this.expiresAt = expiresAt;
    this.resendAvailableAt = resendAvailableAt;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public boolean canResendAt(Instant now) {
    return status == PasswordRecoveryClaimStatus.PENDING && !resendAvailableAt.isAfter(now);
  }

  public boolean canConsumeAt(Instant now) {
    return status == PasswordRecoveryClaimStatus.PENDING && expiresAt.isAfter(now);
  }

  public void supersede(Instant now) {
    requirePending();
    status = PasswordRecoveryClaimStatus.SUPERSEDED;
    updatedAt = now;
  }

  public void consume(Instant now) {
    requirePending();
    status = PasswordRecoveryClaimStatus.CONSUMED;
    consumedAt = now;
    updatedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public UUID getUserId() {
    return userId;
  }

  public String getCanonicalEmail() {
    return canonicalEmail;
  }

  public String getTokenHash() {
    return tokenHash;
  }

  private void requirePending() {
    if (status != PasswordRecoveryClaimStatus.PENDING) {
      throw new IllegalStateException("Only a pending password-recovery claim can transition.");
    }
  }
}
