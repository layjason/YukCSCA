package com.yukcsca.assessment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assessment_objective_evidence")
public class AssessmentObjectiveEvidence {
  @Id private UUID id;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(nullable = false, length = 32)
  private String subject;

  @Column(name = "package_id", nullable = false)
  private UUID packageId;

  @Column(name = "objective_id", nullable = false)
  private UUID objectiveId;

  @Column(nullable = false, length = 40)
  private String signal;

  @Column(name = "source_session_id", nullable = false)
  private UUID sourceSessionId;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  protected AssessmentObjectiveEvidence() {}

  public AssessmentObjectiveEvidence(
      UUID accountId,
      String subject,
      UUID packageId,
      UUID objectiveId,
      UUID sourceSessionId,
      Instant now) {
    this.id = UUID.randomUUID();
    this.accountId = accountId;
    this.subject = subject;
    this.packageId = packageId;
    this.objectiveId = objectiveId;
    this.signal = "CHECKPOINT_PASSED";
    this.sourceSessionId = sourceSessionId;
    this.occurredAt = now;
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

  public UUID getObjectiveId() {
    return objectiveId;
  }

  public String getSignal() {
    return signal;
  }

  public UUID getSourceSessionId() {
    return sourceSessionId;
  }

  public Instant getOccurredAt() {
    return occurredAt;
  }
}
