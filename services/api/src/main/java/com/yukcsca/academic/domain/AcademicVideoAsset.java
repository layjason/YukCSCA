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

/**
 * One optional reviewed short-video asset. Bytes live in object storage under {@code storageKey}
 * (video) and {@code captionsKey} (WebVTT); shape metadata stays null until the worker validates
 * the bytes. State transitions: AWAITING_VALIDATION -> DRAFT | REJECTED; DRAFT -> REVIEWED;
 * REVIEWED -> RETIRED (system-managed on replacement publish).
 */
@Entity
@Table(name = "academic_video_asset")
public class AcademicVideoAsset {
  @Id private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private VideoAssetSource source;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private VideoAssetStatus status;

  @Column(name = "explanation_language", nullable = false, length = 16)
  private String explanationLanguage;

  @Column(name = "media_type", nullable = false, length = 32)
  private String mediaType;

  @Column(name = "storage_key", nullable = false, length = 500)
  private String storageKey;

  @Column(name = "captions_key", length = 500)
  private String captionsKey;

  @Column(name = "byte_size")
  private Long byteSize;

  @Column(name = "duration_seconds")
  private Integer durationSeconds;

  @Column private Integer width;

  @Column private Integer height;

  @Column(length = 64)
  private String sha256;

  @Column(name = "captions_available", nullable = false)
  private boolean captionsAvailable;

  /** Upload-probe rejection reasons as a JSON array of {path, code} objects. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private String rejection;

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

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected AcademicVideoAsset() {}

  public AcademicVideoAsset(
      VideoAssetSource source,
      String explanationLanguage,
      String storageKey,
      String origin,
      String provider,
      String sourceLocator,
      String permissionReference,
      UUID authorUserId,
      Instant now) {
    this.id = UUID.randomUUID();
    this.source = source;
    this.status = VideoAssetStatus.AWAITING_VALIDATION;
    this.explanationLanguage = explanationLanguage;
    this.mediaType = "video/mp4";
    this.storageKey = storageKey;
    this.origin = origin;
    this.provider = provider;
    this.sourceLocator = sourceLocator;
    this.permissionReference = permissionReference;
    this.authorUserId = authorUserId;
    this.captionsAvailable = false;
    this.createdAt = now;
    this.updatedAt = now;
  }

  /** Worker result for a validated upload or a succeeded render: playable shape metadata. */
  public void markValidated(
      String storageKey,
      long byteSize,
      int durationSeconds,
      int width,
      int height,
      String sha256,
      boolean captionsAvailable,
      String captionsKey,
      Instant now) {
    this.status = VideoAssetStatus.DRAFT;
    this.storageKey = storageKey;
    this.byteSize = byteSize;
    this.durationSeconds = durationSeconds;
    this.width = width;
    this.height = height;
    this.sha256 = sha256;
    if (captionsAvailable) {
      this.captionsAvailable = true;
      this.captionsKey = captionsKey;
    }
    this.updatedAt = now;
  }

  public void markRejected(String rejectionJson, Instant now) {
    this.status = VideoAssetStatus.REJECTED;
    this.rejection = rejectionJson;
    this.updatedAt = now;
  }

  public void replaceCaptions(String captionsKey, Instant now) {
    this.captionsAvailable = true;
    this.captionsKey = captionsKey;
    this.updatedAt = now;
  }

  public void markReviewed(UUID reviewerUserId, Instant now) {
    this.status = VideoAssetStatus.REVIEWED;
    this.reviewedByUserId = reviewerUserId;
    this.reviewedAt = now;
    this.updatedAt = now;
  }

  /** System-managed transition when a replacement publishes; never called by admins. */
  public void retire(Instant now) {
    this.status = VideoAssetStatus.RETIRED;
    this.updatedAt = now;
  }

  public boolean hasValidatedBytes() {
    return byteSize != null && durationSeconds != null && width != null && height != null;
  }

  public UUID getId() {
    return id;
  }

  public VideoAssetSource getSource() {
    return source;
  }

  public VideoAssetStatus getStatus() {
    return status;
  }

  public String getExplanationLanguage() {
    return explanationLanguage;
  }

  public String getMediaType() {
    return mediaType;
  }

  public String getStorageKey() {
    return storageKey;
  }

  public String getCaptionsKey() {
    return captionsKey;
  }

  public Long getByteSize() {
    return byteSize;
  }

  public Integer getDurationSeconds() {
    return durationSeconds;
  }

  public Integer getWidth() {
    return width;
  }

  public Integer getHeight() {
    return height;
  }

  public String getSha256() {
    return sha256;
  }

  public boolean isCaptionsAvailable() {
    return captionsAvailable;
  }

  public String getRejection() {
    return rejection;
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

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
