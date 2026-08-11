package com.yukcsca.assessment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assessment_assistance_event")
public class AssessmentAssistanceEvent {
  @Id private UUID id;

  @Column(name = "session_id", nullable = false)
  private UUID sessionId;

  @Column(name = "item_attempt_id", nullable = false)
  private UUID itemAttemptId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(nullable = false, length = 32)
  private String kind;

  @Column(name = "tier_index", nullable = false)
  private int tierIndex;

  @Column(nullable = false, length = 16)
  private String strength;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  protected AssessmentAssistanceEvent() {}

  public AssessmentAssistanceEvent(
      UUID sessionId,
      UUID itemAttemptId,
      UUID accountId,
      int tierIndex,
      String strength,
      Instant now) {
    this.id = UUID.randomUUID();
    this.sessionId = sessionId;
    this.itemAttemptId = itemAttemptId;
    this.accountId = accountId;
    this.kind = "MATH_HINT";
    this.tierIndex = tierIndex;
    this.strength = strength;
    this.occurredAt = now;
  }

  public UUID getId() {
    return id;
  }

  public UUID getSessionId() {
    return sessionId;
  }

  public UUID getItemAttemptId() {
    return itemAttemptId;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public String getKind() {
    return kind;
  }

  public int getTierIndex() {
    return tierIndex;
  }

  public String getStrength() {
    return strength;
  }

  public Instant getOccurredAt() {
    return occurredAt;
  }
}
