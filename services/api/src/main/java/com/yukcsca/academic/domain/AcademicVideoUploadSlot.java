package com.yukcsca.academic.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Short-lived presigned upload slot for one finished video. The slot-to-asset link is persisted at
 * first confirm and survives expiry so a confirm replay always returns the same asset (CR-08).
 */
@Entity
@Table(name = "academic_video_upload_slot")
public class AcademicVideoUploadSlot {
  @Id private UUID id;

  @Column(name = "explanation_language", nullable = false, length = 16)
  private String explanationLanguage;

  @Column(name = "storage_key", nullable = false, length = 500)
  private String storageKey;

  @Column(name = "max_byte_size", nullable = false)
  private long maxByteSize;

  @Column(name = "asset_id")
  private UUID assetId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  protected AcademicVideoUploadSlot() {}

  public AcademicVideoUploadSlot(
      String explanationLanguage,
      String storageKey,
      long maxByteSize,
      Instant createdAt,
      Duration ttl) {
    this.id = UUID.randomUUID();
    this.explanationLanguage = explanationLanguage;
    this.storageKey = storageKey;
    this.maxByteSize = maxByteSize;
    this.createdAt = createdAt;
    this.expiresAt = createdAt.plus(ttl);
  }

  public void linkAsset(UUID assetId) {
    this.assetId = assetId;
  }

  public boolean isExpired(Instant now) {
    return now.isAfter(expiresAt);
  }

  public UUID getId() {
    return id;
  }

  public String getExplanationLanguage() {
    return explanationLanguage;
  }

  public String getStorageKey() {
    return storageKey;
  }

  public long getMaxByteSize() {
    return maxByteSize;
  }

  public UUID getAssetId() {
    return assetId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }
}
