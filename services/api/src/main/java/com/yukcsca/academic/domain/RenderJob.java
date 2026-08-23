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
 * One asynchronous render or upload-validation job on the PostgreSQL-polled queue. RENDER_SCENE
 * jobs snapshot the scene specification and its registry version at enqueue; workers claim through
 * a visibility timeout ({@code visibleAfter}) with FOR UPDATE SKIP LOCKED and retry within the
 * attempts bound before failing terminally.
 */
@Entity
@Table(name = "render_job")
public class RenderJob {
  @Id private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private RenderJobKind kind;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private RenderJobState state;

  @Column(name = "scene_specification_id")
  private UUID sceneSpecificationId;

  @Column(name = "video_asset_id")
  private UUID videoAssetId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "scene_snapshot", columnDefinition = "jsonb")
  private String sceneSnapshot;

  @Column(name = "registry_version", length = 40)
  private String registryVersion;

  @Column(nullable = false)
  private int attempts;

  @Enumerated(EnumType.STRING)
  @Column(name = "error_code", length = 40)
  private RenderJobErrorCode errorCode;

  @Column(name = "error_detail", length = 500)
  private String errorDetail;

  @Column(name = "visible_after", nullable = false)
  private Instant visibleAfter;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected RenderJob() {}

  public RenderJob(RenderJobKind kind, UUID sceneSpecificationId, UUID videoAssetId, Instant now) {
    this.id = UUID.randomUUID();
    this.kind = kind;
    this.state = RenderJobState.QUEUED;
    this.sceneSpecificationId = sceneSpecificationId;
    this.videoAssetId = videoAssetId;
    this.attempts = 0;
    this.visibleAfter = now;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void attachSnapshot(String sceneSnapshotJson, String registryVersion, Instant now) {
    this.sceneSnapshot = sceneSnapshotJson;
    this.registryVersion = registryVersion;
    this.updatedAt = now;
  }

  public void attachAsset(UUID videoAssetId, Instant now) {
    this.videoAssetId = videoAssetId;
    this.updatedAt = now;
  }

  public void succeed(UUID videoAssetId, Instant now) {
    this.state = RenderJobState.SUCCEEDED;
    this.videoAssetId = videoAssetId;
    this.errorCode = null;
    this.errorDetail = null;
    this.visibleAfter = now;
    this.updatedAt = now;
  }

  public void fail(RenderJobErrorCode code, String detail, Instant now) {
    this.state = RenderJobState.FAILED;
    this.errorCode = code;
    this.errorDetail = detail;
    this.visibleAfter = now;
    this.updatedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public RenderJobKind getKind() {
    return kind;
  }

  public RenderJobState getState() {
    return state;
  }

  public UUID getSceneSpecificationId() {
    return sceneSpecificationId;
  }

  public UUID getVideoAssetId() {
    return videoAssetId;
  }

  public String getSceneSnapshot() {
    return sceneSnapshot;
  }

  public String getRegistryVersion() {
    return registryVersion;
  }

  public int getAttempts() {
    return attempts;
  }

  public RenderJobErrorCode getErrorCode() {
    return errorCode;
  }

  public String getErrorDetail() {
    return errorDetail;
  }

  public Instant getVisibleAfter() {
    return visibleAfter;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
