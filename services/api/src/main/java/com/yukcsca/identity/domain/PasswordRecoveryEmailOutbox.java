package com.yukcsca.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "password_recovery_email_outbox")
public class PasswordRecoveryEmailOutbox {
  @Id private UUID id;

  @Column(name = "claim_id", nullable = false, unique = true)
  private UUID claimId;

  @Column(name = "recipient_email", nullable = false, length = 320)
  private String recipientEmail;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private PasswordRecoveryEmailOutboxStatus status;

  @Column(name = "attempt_count", nullable = false)
  private int attemptCount;

  @Column(name = "next_attempt_at", nullable = false)
  private Instant nextAttemptAt;

  @Column(name = "sent_at")
  private Instant sentAt;

  @Column(name = "terminal_category", length = 64)
  private String terminalCategory;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected PasswordRecoveryEmailOutbox() {}

  public PasswordRecoveryEmailOutbox(UUID claimId, String recipientEmail, Instant now) {
    this.id = UUID.randomUUID();
    this.claimId = claimId;
    this.recipientEmail = recipientEmail;
    this.status = PasswordRecoveryEmailOutboxStatus.QUEUED;
    this.nextAttemptAt = now;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void markSent(Instant now) {
    status = PasswordRecoveryEmailOutboxStatus.SENT;
    sentAt = now;
    updatedAt = now;
  }

  public void markFailure(Instant now, int maxAttempts, Duration retryBase) {
    attemptCount += 1;
    updatedAt = now;
    if (attemptCount >= maxAttempts) {
      status = PasswordRecoveryEmailOutboxStatus.TERMINAL_FAILURE;
      terminalCategory = "PROVIDER_FAILURE";
      return;
    }
    long multiplier = 1L << Math.min(attemptCount - 1, 10);
    nextAttemptAt = now.plus(retryBase.multipliedBy(multiplier));
  }

  public void markTerminal(Instant now, String category) {
    status = PasswordRecoveryEmailOutboxStatus.TERMINAL_FAILURE;
    terminalCategory = category;
    updatedAt = now;
  }

  public UUID getClaimId() {
    return claimId;
  }

  public String getRecipientEmail() {
    return recipientEmail;
  }

  public PasswordRecoveryEmailOutboxStatus getStatus() {
    return status;
  }

  public int getAttemptCount() {
    return attemptCount;
  }
}
