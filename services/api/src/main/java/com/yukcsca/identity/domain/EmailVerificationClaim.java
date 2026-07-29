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
@Table(name = "email_verification_claim")
public class EmailVerificationClaim {
  @Id private UUID id;

  @Column(name = "canonical_email", nullable = false, length = 320)
  private String canonicalEmail;

  @Column(name = "token_hash", nullable = false, unique = true, length = 64)
  private String tokenHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private EmailVerificationClaimStatus status;

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

  protected EmailVerificationClaim() {}

  public EmailVerificationClaim(
      UUID id,
      String canonicalEmail,
      String tokenHash,
      Instant expiresAt,
      Instant resendAvailableAt,
      Instant now) {
    this.id = id;
    this.canonicalEmail = canonicalEmail;
    this.tokenHash = tokenHash;
    this.status = EmailVerificationClaimStatus.PENDING;
    this.expiresAt = expiresAt;
    this.resendAvailableAt = resendAvailableAt;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public boolean canResendAt(Instant now) {
    return status == EmailVerificationClaimStatus.PENDING && !resendAvailableAt.isAfter(now);
  }

  public boolean canConsumeAt(Instant now) {
    return status == EmailVerificationClaimStatus.PENDING && expiresAt.isAfter(now);
  }

  public void supersede(Instant now) {
    requirePending();
    status = EmailVerificationClaimStatus.SUPERSEDED;
    updatedAt = now;
  }

  public void completeWithAccount(Instant now) {
    complete(EmailVerificationClaimStatus.ACCOUNT_CREATED, now);
  }

  public void completeWithGoogleCollision(Instant now) {
    complete(EmailVerificationClaimStatus.GOOGLE_COLLISION, now);
  }

  public UUID getId() {
    return id;
  }

  public String getCanonicalEmail() {
    return canonicalEmail;
  }

  public String getTokenHash() {
    return tokenHash;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  private void complete(EmailVerificationClaimStatus completedStatus, Instant now) {
    requirePending();
    status = completedStatus;
    consumedAt = now;
    updatedAt = now;
  }

  private void requirePending() {
    if (status != EmailVerificationClaimStatus.PENDING) {
      throw new IllegalStateException("Only a pending verification claim can transition.");
    }
  }
}
