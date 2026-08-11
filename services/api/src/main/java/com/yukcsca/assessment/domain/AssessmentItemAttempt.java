package com.yukcsca.assessment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "assessment_item_attempt")
public class AssessmentItemAttempt {
  @Id private UUID id;

  @Column(name = "session_id", nullable = false)
  private UUID sessionId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(name = "item_order", nullable = false)
  private int itemOrder;

  @Column(name = "question_id", nullable = false)
  private UUID questionId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private ItemAttemptStatus status;

  @Column(name = "selected_option_key", length = 40)
  private String selectedOptionKey;

  @Column private Boolean correct;

  @Column(name = "strong_assistance", nullable = false)
  private boolean strongAssistance;

  @Column(name = "disclosed_tier_count", nullable = false)
  private int disclosedTierCount;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "question_copy_json", nullable = false, columnDefinition = "jsonb")
  private String questionCopyJson;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "locked_at")
  private Instant lockedAt;

  protected AssessmentItemAttempt() {}

  public AssessmentItemAttempt(
      UUID sessionId,
      UUID accountId,
      int itemOrder,
      UUID questionId,
      String questionCopyJson,
      Instant now) {
    this.id = UUID.randomUUID();
    this.sessionId = sessionId;
    this.accountId = accountId;
    this.itemOrder = itemOrder;
    this.questionId = questionId;
    this.status = ItemAttemptStatus.OPEN;
    this.selectedOptionKey = null;
    this.correct = null;
    this.strongAssistance = false;
    this.disclosedTierCount = 0;
    this.questionCopyJson = questionCopyJson;
    this.createdAt = now;
    this.updatedAt = now;
    this.lockedAt = null;
  }

  public void discloseTier(int tierIndex, boolean strong, Instant now) {
    this.disclosedTierCount = Math.max(this.disclosedTierCount, tierIndex + 1);
    if (strong) this.strongAssistance = true;
    this.updatedAt = now;
  }

  public void selectAnswer(String optionKey, Instant now) {
    this.selectedOptionKey = optionKey;
    this.updatedAt = now;
  }

  public void lock(boolean isCorrect, Instant now) {
    this.status = ItemAttemptStatus.LOCKED;
    this.correct = isCorrect;
    this.lockedAt = now;
    this.updatedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public UUID getSessionId() {
    return sessionId;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public int getItemOrder() {
    return itemOrder;
  }

  public UUID getQuestionId() {
    return questionId;
  }

  public ItemAttemptStatus getStatus() {
    return status;
  }

  public String getSelectedOptionKey() {
    return selectedOptionKey;
  }

  public Boolean getCorrect() {
    return correct;
  }

  public boolean isStrongAssistance() {
    return strongAssistance;
  }

  public int getDisclosedTierCount() {
    return disclosedTierCount;
  }

  public String getQuestionCopyJson() {
    return questionCopyJson;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public Instant getLockedAt() {
    return lockedAt;
  }
}
