package com.yukcsca.academic.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "student_terminology_preview_progress")
public class StudentTerminologyPreviewProgress {
  public static final String IN_PROGRESS = "IN_PROGRESS";
  public static final String PREVIEW_COMPLETE = "PREVIEW_COMPLETE";

  @Id private UUID id;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(name = "package_id", nullable = false)
  private UUID packageId;

  @Column(name = "resource_id", nullable = false)
  private UUID resourceId;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "last_revision_id")
  private UUID lastRevisionId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "required_term_ids", columnDefinition = "jsonb")
  private String requiredTermIdsJson;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected StudentTerminologyPreviewProgress() {}

  public StudentTerminologyPreviewProgress(
      UUID accountId,
      UUID packageId,
      UUID resourceId,
      String status,
      UUID lastRevisionId,
      String requiredTermIdsJson,
      Instant now) {
    this.id = UUID.randomUUID();
    this.accountId = accountId;
    this.packageId = packageId;
    this.resourceId = resourceId;
    this.status = status;
    this.lastRevisionId = lastRevisionId;
    this.requiredTermIdsJson = requiredTermIdsJson;
    this.updatedAt = now;
  }

  public void replace(String status, UUID lastRevisionId, String requiredTermIdsJson, Instant now) {
    this.status = status;
    this.lastRevisionId = lastRevisionId;
    this.requiredTermIdsJson = requiredTermIdsJson;
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

  public UUID getResourceId() {
    return resourceId;
  }

  public String getStatus() {
    return status;
  }

  public UUID getLastRevisionId() {
    return lastRevisionId;
  }

  public String getRequiredTermIdsJson() {
    return requiredTermIdsJson;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
