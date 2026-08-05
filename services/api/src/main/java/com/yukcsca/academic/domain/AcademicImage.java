package com.yukcsca.academic.domain;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "academic_image")
public class AcademicImage {
  @Id private UUID id;

  @Column(name = "media_type", nullable = false, length = 32)
  private String mediaType;

  @Basic(fetch = FetchType.LAZY)
  @Column(nullable = false, columnDefinition = "bytea")
  private byte[] content;

  @Column(name = "byte_size", nullable = false)
  private long byteSize;

  @Column(nullable = false)
  private int width;

  @Column(nullable = false)
  private int height;

  @Column(nullable = false, length = 64)
  private String sha256;

  @Column(name = "sanitization_status", nullable = false, length = 32)
  private String sanitizationStatus;

  @Column(nullable = false, length = 32)
  private String origin;

  @Column(length = 200)
  private String provider;

  @Column(name = "source_locator", length = 2000)
  private String sourceLocator;

  @Column(name = "permission_reference", length = 1000)
  private String permissionReference;

  @Column(name = "author_user_id", nullable = false)
  private UUID authorUserId;

  @Column(name = "reviewed_by_user_id")
  private UUID reviewedByUserId;

  @Column(name = "reviewed_at")
  private Instant reviewedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected AcademicImage() {}

  public AcademicImage(
      String mediaType,
      byte[] content,
      int width,
      int height,
      String sha256,
      String origin,
      String provider,
      String sourceLocator,
      String permissionReference,
      UUID authorUserId,
      Instant createdAt) {
    this.id = UUID.randomUUID();
    this.mediaType = mediaType;
    this.content = content.clone();
    this.byteSize = content.length;
    this.width = width;
    this.height = height;
    this.sha256 = sha256;
    this.sanitizationStatus = "REENCODED";
    this.origin = origin;
    this.provider = provider;
    this.sourceLocator = sourceLocator;
    this.permissionReference = permissionReference;
    this.authorUserId = authorUserId;
    this.createdAt = createdAt;
  }

  public void markReviewed(UUID reviewerId, Instant reviewedAt) {
    if (reviewedByUserId != null) return;
    this.reviewedByUserId = reviewerId;
    this.reviewedAt = reviewedAt;
  }

  public UUID getId() {
    return id;
  }

  public String getMediaType() {
    return mediaType;
  }

  public byte[] getContent() {
    return content.clone();
  }

  public long getByteSize() {
    return byteSize;
  }

  public int getWidth() {
    return width;
  }

  public int getHeight() {
    return height;
  }

  public String getSha256() {
    return sha256;
  }

  public boolean isSanitized() {
    return "REENCODED".equals(sanitizationStatus);
  }

  public String getOrigin() {
    return origin;
  }

  public String getProvider() {
    return provider;
  }

  public String getSourceLocator() {
    return sourceLocator;
  }

  public String getPermissionReference() {
    return permissionReference;
  }

  public UUID getAuthorUserId() {
    return authorUserId;
  }

  public UUID getReviewedByUserId() {
    return reviewedByUserId;
  }

  public Instant getReviewedAt() {
    return reviewedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
