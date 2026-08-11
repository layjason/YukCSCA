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
@Table(name = "assessment_session")
public class AssessmentSession {
  @Id private UUID id;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(nullable = false, length = 32)
  private String subject;

  @Column(name = "package_id", nullable = false)
  private UUID packageId;

  @Column(name = "package_revision_id", nullable = false)
  private UUID packageRevisionId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AssessmentSessionPurpose purpose;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AssessmentSessionStatus status;

  @Column(name = "set_id")
  private UUID setId;

  @Column(name = "mistake_id")
  private UUID mistakeId;

  @Column(name = "lesson_resource_id")
  private UUID lessonResourceId;

  @Column(name = "exam_language", nullable = false, length = 16)
  private String examLanguage;

  @Column(name = "feedback_mode", nullable = false, length = 16)
  private String feedbackMode;

  @Column(name = "plan_task_id")
  private UUID planTaskId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "set_title_json", columnDefinition = "jsonb")
  private String setTitleJson;

  @Column(name = "strong_hints_disabled", nullable = false)
  private boolean strongHintsDisabled;

  @Column(name = "max_tier_disclosed", nullable = false)
  private int maxTierDisclosed;

  @Column(name = "strong_used", nullable = false)
  private boolean strongUsed;

  @Column(name = "language_assist_used", nullable = false)
  private boolean languageAssistUsed;

  @Column(name = "checkpoint_passed")
  private Boolean checkpointPassed;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "submitted_at")
  private Instant submittedAt;

  protected AssessmentSession() {}

  public AssessmentSession(
      UUID accountId,
      String subject,
      UUID packageId,
      UUID packageRevisionId,
      AssessmentSessionPurpose purpose,
      UUID setId,
      UUID mistakeId,
      UUID lessonResourceId,
      String examLanguage,
      String feedbackMode,
      String setTitleJson,
      boolean strongHintsDisabled,
      Instant now) {
    this.id = UUID.randomUUID();
    this.accountId = accountId;
    this.subject = subject;
    this.packageId = packageId;
    this.packageRevisionId = packageRevisionId;
    this.purpose = purpose;
    this.status = AssessmentSessionStatus.IN_PROGRESS;
    this.setId = setId;
    this.mistakeId = mistakeId;
    this.lessonResourceId = lessonResourceId;
    this.examLanguage = examLanguage;
    this.feedbackMode = feedbackMode;
    this.planTaskId = null;
    this.setTitleJson = setTitleJson;
    this.strongHintsDisabled = strongHintsDisabled;
    this.maxTierDisclosed = 0;
    this.strongUsed = false;
    this.languageAssistUsed = false;
    this.checkpointPassed = null;
    this.createdAt = now;
    this.updatedAt = now;
    this.submittedAt = null;
  }

  public void recordAssistance(int tierIndex, boolean strong, Instant now) {
    this.maxTierDisclosed = Math.max(this.maxTierDisclosed, tierIndex + 1);
    if (strong) this.strongUsed = true;
    this.updatedAt = now;
  }

  public void markSubmitted(Boolean checkpointPassed, Instant now) {
    this.status = AssessmentSessionStatus.SUBMITTED;
    this.checkpointPassed = checkpointPassed;
    this.submittedAt = now;
    this.updatedAt = now;
  }

  public void markCancelled(Instant now) {
    this.status = AssessmentSessionStatus.CANCELLED;
    this.updatedAt = now;
  }

  public void touch(Instant now) {
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

  public AssessmentSessionPurpose getPurpose() {
    return purpose;
  }

  public AssessmentSessionStatus getStatus() {
    return status;
  }

  public UUID getSetId() {
    return setId;
  }

  public UUID getMistakeId() {
    return mistakeId;
  }

  public UUID getLessonResourceId() {
    return lessonResourceId;
  }

  public String getExamLanguage() {
    return examLanguage;
  }

  public String getFeedbackMode() {
    return feedbackMode;
  }

  public UUID getPlanTaskId() {
    return planTaskId;
  }

  public String getSetTitleJson() {
    return setTitleJson;
  }

  public boolean isStrongHintsDisabled() {
    return strongHintsDisabled;
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

  public Boolean getCheckpointPassed() {
    return checkpointPassed;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public Instant getSubmittedAt() {
    return submittedAt;
  }
}
