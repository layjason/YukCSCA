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
@Table(name = "academic_revision")
public class AcademicRevision {
  @Id private UUID id;

  @Column(name = "package_id", nullable = false)
  private UUID packageId;

  @Column(name = "revision_number", nullable = false)
  private long revisionNumber;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private String content;

  @Column(name = "published_by_user_id", nullable = false)
  private UUID publishedByUserId;

  @Column(name = "published_at", nullable = false)
  private Instant publishedAt;

  protected AcademicRevision() {}

  public AcademicRevision(
      UUID packageId,
      long revisionNumber,
      String content,
      UUID publishedByUserId,
      Instant publishedAt) {
    this.id = UUID.randomUUID();
    this.packageId = packageId;
    this.revisionNumber = revisionNumber;
    this.content = content;
    this.publishedByUserId = publishedByUserId;
    this.publishedAt = publishedAt;
  }

  public UUID getId() {
    return id;
  }

  public UUID getPackageId() {
    return packageId;
  }

  public long getRevisionNumber() {
    return revisionNumber;
  }

  public String getContent() {
    return content;
  }

  public UUID getPublishedByUserId() {
    return publishedByUserId;
  }

  public Instant getPublishedAt() {
    return publishedAt;
  }
}
