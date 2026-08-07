package com.yukcsca.academic.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_content_progress")
public class StudentContentProgress {
  @Id private UUID id;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(name = "package_id", nullable = false)
  private UUID packageId;

  @Column(nullable = false, length = 32)
  private String subject;

  @Column(name = "resource_id", nullable = false)
  private UUID resourceId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private StudentContentProgressStatus status;

  @Column(name = "resume_block_index")
  private Integer resumeBlockIndex;

  @Column(name = "last_revision_id")
  private UUID lastRevisionId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected StudentContentProgress() {}

  public StudentContentProgress(
      UUID accountId,
      UUID packageId,
      String subject,
      UUID resourceId,
      StudentContentProgressStatus status,
      Integer resumeBlockIndex,
      UUID lastRevisionId,
      Instant now) {
    this.id = UUID.randomUUID();
    this.accountId = accountId;
    this.packageId = packageId;
    this.subject = subject;
    this.resourceId = resourceId;
    this.status = status;
    this.resumeBlockIndex = resumeBlockIndex;
    this.lastRevisionId = lastRevisionId;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void replace(
      StudentContentProgressStatus status,
      Integer resumeBlockIndex,
      UUID lastRevisionId,
      Instant now) {
    this.status = status;
    this.resumeBlockIndex = resumeBlockIndex;
    this.lastRevisionId = lastRevisionId;
    this.updatedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public UUID getPackageId() {
    return packageId;
  }

  public String getSubject() {
    return subject;
  }

  public UUID getResourceId() {
    return resourceId;
  }

  public StudentContentProgressStatus getStatus() {
    return status;
  }

  public Integer getResumeBlockIndex() {
    return resumeBlockIndex;
  }

  public UUID getLastRevisionId() {
    return lastRevisionId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
