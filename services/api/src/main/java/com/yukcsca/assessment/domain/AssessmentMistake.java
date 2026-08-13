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
@Table(name = "assessment_mistake")
public class AssessmentMistake {
  @Id private UUID id;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(nullable = false, length = 32)
  private String subject;

  @Column(name = "package_id", nullable = false)
  private UUID packageId;

  @Column(name = "package_revision_id", nullable = false)
  private UUID packageRevisionId;

  @Column(name = "question_id", nullable = false)
  private UUID questionId;

  @Column(name = "exam_language", nullable = false, length = 16)
  private String examLanguage;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private MistakeStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "error_cause", length = 40)
  private ErrorCause errorCause;

  @Column(name = "private_note", length = 2000)
  private String privateNote;

  @Column(name = "error_count", nullable = false)
  private int errorCount;

  @Column(name = "last_attempt_id")
  private UUID lastAttemptId;

  @Column(name = "last_session_id")
  private UUID lastSessionId;

  @Column(name = "source_set_id")
  private UUID sourceSetId;

  @Column(name = "max_tier_disclosed", nullable = false)
  private int maxTierDisclosed;

  @Column(name = "strong_used", nullable = false)
  private boolean strongUsed;

  @Column(name = "language_assist_used", nullable = false)
  private boolean languageAssistUsed;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "attempt_question_json", nullable = false, columnDefinition = "jsonb")
  private String attemptQuestionJson;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "latest_response_json", nullable = false, columnDefinition = "jsonb")
  private String latestResponseJson;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "outline_item_ids", nullable = false, columnDefinition = "jsonb")
  private String outlineItemIdsJson;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "objective_ids", nullable = false, columnDefinition = "jsonb")
  private String objectiveIdsJson;

  @Column(name = "next_due_at")
  private Instant nextDueAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected AssessmentMistake() {}

  public AssessmentMistake(
      UUID accountId,
      String subject,
      UUID packageId,
      UUID packageRevisionId,
      UUID questionId,
      String examLanguage,
      UUID lastAttemptId,
      UUID lastSessionId,
      UUID sourceSetId,
      int maxTierDisclosed,
      boolean strongUsed,
      String attemptQuestionJson,
      String latestResponseJson,
      String outlineItemIdsJson,
      String objectiveIdsJson,
      Instant now) {
    this.id = UUID.randomUUID();
    this.accountId = accountId;
    this.subject = subject;
    this.packageId = packageId;
    this.packageRevisionId = packageRevisionId;
    this.questionId = questionId;
    this.examLanguage = examLanguage;
    this.status = MistakeStatus.OPEN;
    this.errorCause = null;
    this.privateNote = null;
    this.errorCount = 1;
    this.lastAttemptId = lastAttemptId;
    this.lastSessionId = lastSessionId;
    this.sourceSetId = sourceSetId;
    this.maxTierDisclosed = maxTierDisclosed;
    this.strongUsed = strongUsed;
    this.languageAssistUsed = false;
    this.attemptQuestionJson = attemptQuestionJson;
    this.latestResponseJson = latestResponseJson;
    this.outlineItemIdsJson = outlineItemIdsJson;
    this.objectiveIdsJson = objectiveIdsJson;
    this.nextDueAt = null;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void recordIncorrectAttempt(
      UUID attemptId,
      UUID sessionId,
      UUID packageRevisionId,
      int maxTierDisclosed,
      boolean strongUsed,
      String latestResponseJson,
      Instant now) {
    if (attemptId != null && attemptId.equals(this.lastAttemptId)) {
      // Idempotent: same attempt does not increment error count.
      this.updatedAt = now;
      return;
    }
    this.errorCount += 1;
    this.lastAttemptId = attemptId;
    this.lastSessionId = sessionId;
    this.packageRevisionId = packageRevisionId;
    this.maxTierDisclosed = Math.max(this.maxTierDisclosed, maxTierDisclosed);
    this.strongUsed = this.strongUsed || strongUsed;
    this.latestResponseJson = latestResponseJson;
    this.status = MistakeStatus.OPEN;
    this.updatedAt = now;
  }

  /**
   * Failed revalidation on an alternate question: increment error count and reopen, but keep the
   * original attempt copy and latest response so the notebook identity does not switch items.
   */
  public void recordFailedRevalidation(UUID attemptId, UUID sessionId, Instant now) {
    if (attemptId != null && attemptId.equals(this.lastAttemptId)) {
      this.updatedAt = now;
      return;
    }
    this.errorCount += 1;
    this.lastAttemptId = attemptId;
    this.lastSessionId = sessionId;
    this.status = MistakeStatus.OPEN;
    this.updatedAt = now;
  }

  public void markAwaitingRevalidation(Instant now) {
    this.status = MistakeStatus.AWAITING_REVALIDATION;
    this.updatedAt = now;
  }

  public void markRemediationInProgress(Instant now) {
    if (this.status != MistakeStatus.OPEN) {
      return;
    }
    this.status = MistakeStatus.REMEDIATION_IN_PROGRESS;
    this.updatedAt = now;
  }

  public void markRevalidationPassed(Instant now) {
    this.status = MistakeStatus.REVALIDATION_PASSED;
    this.updatedAt = now;
  }

  public void markRevalidationFailed(Instant now) {
    this.status = MistakeStatus.OPEN;
    this.updatedAt = now;
  }

  public void updateAnnotation(ErrorCause errorCause, String privateNote, Instant now) {
    this.errorCause = errorCause;
    this.privateNote = privateNote;
    this.updatedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public String getSubject() {
    return subject;
  }

  public UUID getPackageId() {
    return packageId;
  }

  public UUID getPackageRevisionId() {
    return packageRevisionId;
  }

  public UUID getQuestionId() {
    return questionId;
  }

  public String getExamLanguage() {
    return examLanguage;
  }

  public MistakeStatus getStatus() {
    return status;
  }

  public ErrorCause getErrorCause() {
    return errorCause;
  }

  public String getPrivateNote() {
    return privateNote;
  }

  public int getErrorCount() {
    return errorCount;
  }

  public UUID getLastAttemptId() {
    return lastAttemptId;
  }

  public UUID getLastSessionId() {
    return lastSessionId;
  }

  public UUID getSourceSetId() {
    return sourceSetId;
  }

  public int getMaxTierDisclosed() {
    return maxTierDisclosed;
  }

  public boolean isStrongUsed() {
    return strongUsed;
  }

  public boolean isLanguageAssistUsed() {
    return languageAssistUsed;
  }

  public String getAttemptQuestionJson() {
    return attemptQuestionJson;
  }

  public String getLatestResponseJson() {
    return latestResponseJson;
  }

  public String getOutlineItemIdsJson() {
    return outlineItemIdsJson;
  }

  public String getObjectiveIdsJson() {
    return objectiveIdsJson;
  }

  public Instant getNextDueAt() {
    return nextDueAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
