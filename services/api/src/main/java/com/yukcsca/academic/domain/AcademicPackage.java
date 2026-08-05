package com.yukcsca.academic.domain;

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
@Table(name = "academic_package")
public class AcademicPackage {
  @Id private UUID id;

  @Column(nullable = false, unique = true, length = 32)
  private String subject;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AcademicPackageStatus status;

  @Column(name = "draft_revision", nullable = false)
  private long draftRevision;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private String draft;

  @Column(name = "active_revision_id")
  private UUID activeRevisionId;

  @Column(name = "has_unpublished_changes", nullable = false)
  private boolean hasUnpublishedChanges;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected AcademicPackage() {}

  public AcademicPackage(String emptyDraft, Instant now) {
    this.id = UUID.randomUUID();
    this.subject = "MATHEMATICS";
    this.status = AcademicPackageStatus.DRAFT;
    this.draftRevision = 0;
    this.draft = emptyDraft;
    this.hasUnpublishedChanges = false;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void replaceDraft(String replacement, Instant now) {
    draft = replacement;
    draftRevision++;
    hasUnpublishedChanges = true;
    updatedAt = now;
  }

  public void activateRevision(UUID revisionId, String reviewedDraft, Instant now) {
    activeRevisionId = revisionId;
    draft = reviewedDraft;
    status = AcademicPackageStatus.PUBLISHED;
    hasUnpublishedChanges = false;
    updatedAt = now;
  }

  public void archive(Instant now) {
    status = AcademicPackageStatus.ARCHIVED;
    updatedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public String getSubject() {
    return subject;
  }

  public AcademicPackageStatus getStatus() {
    return status;
  }

  public long getDraftRevision() {
    return draftRevision;
  }

  public String getDraft() {
    return draft;
  }

  public UUID getActiveRevisionId() {
    return activeRevisionId;
  }

  public boolean hasUnpublishedChanges() {
    return hasUnpublishedChanges;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
