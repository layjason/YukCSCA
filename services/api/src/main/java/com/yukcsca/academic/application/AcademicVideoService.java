package com.yukcsca.academic.application;

import com.yukcsca.academic.application.SceneSpecificationValidator.Compiled;
import com.yukcsca.academic.domain.AcademicAudit;
import com.yukcsca.academic.domain.AcademicVideoAsset;
import com.yukcsca.academic.domain.AcademicVideoUploadSlot;
import com.yukcsca.academic.domain.RenderJob;
import com.yukcsca.academic.domain.RenderJobKind;
import com.yukcsca.academic.domain.RenderJobState;
import com.yukcsca.academic.domain.SceneSpecification;
import com.yukcsca.academic.domain.VideoAssetSource;
import com.yukcsca.academic.domain.VideoAssetStatus;
import com.yukcsca.academic.infrastructure.MediaStorageProperties;
import com.yukcsca.identity.application.CurrentAccount;
import com.yukcsca.identity.application.CurrentAccountRole;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Admin-facing reviewed-video use cases (VS-010B): upload slots with idempotent confirm, scene
 * specification compilation against the reviewed template registry, render-job enqueue with
 * active-job conflict recovery, asset reads, review playback grants, caption authoring, and the
 * human review transition. Students never reach this service.
 */
@Service
public class AcademicVideoService {
  private static final Logger LOGGER = LoggerFactory.getLogger(AcademicVideoService.class);
  static final long MAX_VIDEO_BYTES = 209_715_200L;
  private static final Set<String> EXPLANATION_LANGUAGES = Set.of("id", "en", "zh-CN");
  private static final Set<String> ORIGINS = Set.of("YUKCSCA_ORIGINAL", "LICENSED", "OPEN_LICENSE");
  private static final Duration TRANSIENT_OBJECT_RETENTION = Duration.ofHours(24);

  private final AcademicVideoStore videos;
  private final AcademicVideoUploadSlotStore slots;
  private final SceneSpecificationStore specifications;
  private final RenderJobStore jobs;
  private final AcademicAuditStore audits;
  private final CurrentAuthenticationService authentication;
  private final SceneSpecificationValidator sceneValidator;
  private final WebVttValidator captionsValidator;
  private final MediaStoragePort storage;
  private final MediaObjectCleanupStore cleanup;
  private final MediaStorageProperties storageProperties;
  private final JsonMapper json;
  private final Clock clock;

  public AcademicVideoService(
      AcademicVideoStore videos,
      AcademicVideoUploadSlotStore slots,
      SceneSpecificationStore specifications,
      RenderJobStore jobs,
      AcademicAuditStore audits,
      CurrentAuthenticationService authentication,
      SceneSpecificationValidator sceneValidator,
      WebVttValidator captionsValidator,
      MediaStoragePort storage,
      MediaObjectCleanupStore cleanup,
      MediaStorageProperties storageProperties,
      JsonMapper json,
      Clock clock) {
    this.videos = videos;
    this.slots = slots;
    this.specifications = specifications;
    this.jobs = jobs;
    this.audits = audits;
    this.authentication = authentication;
    this.sceneValidator = sceneValidator;
    this.captionsValidator = captionsValidator;
    this.storage = storage;
    this.cleanup = cleanup;
    this.storageProperties = storageProperties;
    this.json = json;
    this.clock = clock;
  }

  @Transactional
  public VideoUploadSlotSnapshot createUploadSlot(UUID actorId, String explanationLanguage) {
    requireAdmin(actorId);
    if (explanationLanguage == null || !EXPLANATION_LANGUAGES.contains(explanationLanguage)) {
      throw validation("explanationLanguage", AcademicViolationCode.UNSUPPORTED);
    }
    Instant now = now();
    AcademicVideoUploadSlot slot =
        new AcademicVideoUploadSlot(
            explanationLanguage,
            "video-uploads/" + UUID.randomUUID(),
            MAX_VIDEO_BYTES,
            now,
            storageProperties.uploadSlotTtl());
    slots.save(slot);
    cleanup.schedule(
        slot.getStorageKey(),
        now.plus(TRANSIENT_OBJECT_RETENTION),
        MediaObjectCleanupStore.Reason.STAGING);
    MediaStoragePort.Presigned presigned =
        storage.presignPut(slot.getStorageKey(), storageProperties.uploadSlotTtl());
    return new VideoUploadSlotSnapshot(
        slot.getId(), explanationLanguage, presigned.url(), MAX_VIDEO_BYTES, slot.getExpiresAt());
  }

  /**
   * Idempotent slot confirmation: once a confirm has succeeded, replay returns the same asset even
   * after slot expiry because the slot-to-asset link is persisted at first confirm (CR-08).
   * SLOT_EXPIRED applies only to a first confirm after expiry.
   */
  @Transactional
  public AcademicVideoAssetSnapshot confirmUpload(
      UUID actorId, UUID slotId, ImageProvenanceCommand provenance) {
    requireAdmin(actorId);
    AcademicVideoUploadSlot slot =
        slots
            .findByIdForUpdate(slotId)
            .orElseThrow(() -> new AcademicNotFoundException("Upload slot not found."));
    if (slot.getAssetId() != null) {
      AcademicVideoAsset asset = requireAssetForUpdate(slot.getAssetId());
      // A worker crash can exhaust a VALIDATE_UPLOAD job while the asset remains
      // AWAITING_VALIDATION. Confirm replay keeps the same idempotent asset and restarts only that
      // terminal processing attempt, so the upload is not stranded without a new public API.
      if (asset.getStatus() == VideoAssetStatus.AWAITING_VALIDATION) {
        RenderJob latest = jobs.findLatestByVideoAssetId(asset.getId()).orElse(null);
        if ((latest == null || latest.getState() == RenderJobState.FAILED)
            && cleanup.reserveValidationRetry(asset.getStorageKey(), now())) {
          jobs.save(new RenderJob(RenderJobKind.VALIDATE_UPLOAD, null, asset.getId(), now()));
        }
      }
      LOGGER.info("video.upload.confirmed replay=true slotId={} assetId={}", slotId, asset.getId());
      return assetSnapshot(asset);
    }
    if (slot.isExpired(now())) {
      throw new AcademicConflictException(
          "SLOT_EXPIRED", "The upload slot expired before the first confirmation.");
    }
    if (!storage.objectExists(slot.getStorageKey())) {
      throw new AcademicConflictException(
          "SLOT_PENDING", "The upload slot has no uploaded bytes yet.");
    }
    validateProvenance(provenance);
    Instant now = now();
    AcademicVideoAsset asset =
        new AcademicVideoAsset(
            VideoAssetSource.UPLOADED,
            slot.getExplanationLanguage(),
            slot.getStorageKey(),
            provenance.origin(),
            trimToNull(provenance.provider()),
            trimToNull(provenance.sourceLocator()),
            trimToNull(provenance.permissionReference()),
            actorId,
            now);
    videos.save(asset);
    slot.linkAsset(asset.getId());
    slots.save(slot);
    jobs.save(new RenderJob(RenderJobKind.VALIDATE_UPLOAD, null, asset.getId(), now));
    audit(
        actorId, "VIDEO_UPLOAD_CONFIRMED", "ACADEMIC_VIDEO", asset.getId(), "SUCCEEDED", null, now);
    return assetSnapshot(asset);
  }

  @Transactional
  public SceneSpecificationSnapshot createSceneSpecification(UUID actorId, JsonNode input) {
    requireAdmin(actorId);
    Compiled compiled = sceneValidator.compile(input);
    SceneSpecification specification =
        new SceneSpecification(
            compiled.explanationLanguage(),
            compiled.registryVersion(),
            compiled.segmentsJson(),
            actorId,
            now());
    specifications.save(specification);
    return specificationSnapshot(specification, null);
  }

  @Transactional
  public SceneSpecificationSnapshot replaceSceneSpecification(
      UUID actorId, UUID id, JsonNode input) {
    requireAdmin(actorId);
    SceneSpecification specification = requireSpecificationForUpdate(id);
    Compiled compiled = sceneValidator.compile(input);
    specification.replace(
        compiled.explanationLanguage(), compiled.registryVersion(), compiled.segmentsJson(), now());
    specifications.save(specification);
    return specificationSnapshot(specification, latestJob(id).orElse(null));
  }

  @Transactional(readOnly = true)
  public SceneSpecificationSnapshot getSceneSpecification(UUID actorId, UUID id) {
    requireAdmin(actorId);
    SceneSpecification specification = requireSpecification(id);
    return specificationSnapshot(specification, latestJob(id).orElse(null));
  }

  @Transactional(readOnly = true)
  public SceneTemplateRegistryView listSceneTemplates(UUID actorId) {
    requireAdmin(actorId);
    return new SceneTemplateRegistryView(
        SceneTemplateRegistry.VERSION,
        SceneTemplateRegistry.ACTIONS.stream().map(SceneTemplateActionView::from).toList());
  }

  @Transactional
  public RenderJobSnapshot createRenderJob(UUID actorId, UUID sceneSpecificationId) {
    requireAdmin(actorId);
    // Serialize enqueue against another enqueue and against script replacement. The database
    // partial unique index remains the last line of defence for one active job per specification.
    SceneSpecification specification = requireSpecificationForUpdate(sceneSpecificationId);
    List<RenderJob> active =
        jobs.findBySceneSpecificationIdAndStateIn(
            sceneSpecificationId, List.of(RenderJobState.QUEUED, RenderJobState.RUNNING));
    if (!active.isEmpty()) {
      throw new RenderJobConflictException(jobSnapshot(active.get(0)));
    }
    Instant now = now();
    RenderJob job = new RenderJob(RenderJobKind.RENDER_SCENE, specification.getId(), null, now);
    job.attachSnapshot(snapshotJson(specification), specification.getRegistryVersion(), now);
    jobs.save(job);
    audit(actorId, "RENDER_JOB_ENQUEUED", "RENDER_JOB", job.getId(), "SUCCEEDED", null, now);
    return jobSnapshot(job);
  }

  @Transactional(readOnly = true)
  public RenderJobSnapshot getRenderJob(UUID actorId, UUID jobId) {
    requireAdmin(actorId);
    return jobSnapshot(
        jobs.findById(jobId)
            .orElseThrow(() -> new AcademicNotFoundException("Render job not found.")));
  }

  @Transactional(readOnly = true)
  public AcademicVideoAssetSnapshot getVideo(UUID actorId, UUID id) {
    requireAdmin(actorId);
    return assetSnapshot(requireAsset(id));
  }

  /** Asset-keyed retry for CR-10; no upload-slot id is required after reload. */
  @Transactional
  public RenderJobSnapshot retryUploadValidation(UUID actorId, UUID assetId) {
    requireAdmin(actorId);
    AcademicVideoAsset asset = requireAssetForUpdate(assetId);
    if (asset.getSource() != VideoAssetSource.UPLOADED
        || asset.getStatus() != VideoAssetStatus.AWAITING_VALIDATION) {
      throw validationNotRetryable();
    }

    RenderJob latest = jobs.findLatestByVideoAssetId(assetId).orElse(null);
    if (latest != null
        && (latest.getState() == RenderJobState.QUEUED
            || latest.getState() == RenderJobState.RUNNING)) {
      throw new RenderJobConflictException(jobSnapshot(latest));
    }
    if (latest != null && latest.getState() != RenderJobState.FAILED) {
      throw validationNotRetryable();
    }

    Instant now = now();
    if (!cleanup.reserveValidationRetry(asset.getStorageKey(), now)
        || !storage.objectExists(asset.getStorageKey())) {
      throw validationNotRetryable();
    }
    RenderJob retry =
        jobs.save(new RenderJob(RenderJobKind.VALIDATE_UPLOAD, null, asset.getId(), now));
    audit(
        actorId,
        "VIDEO_VALIDATION_RETRIED",
        "ACADEMIC_VIDEO",
        asset.getId(),
        "SUCCEEDED",
        null,
        now);
    return jobSnapshot(retry);
  }

  @Transactional(readOnly = true)
  public MediaStoragePort.Presigned getVideoPlayGrant(UUID actorId, UUID id) {
    requireAdmin(actorId);
    AcademicVideoAsset asset = requireAsset(id);
    if (asset.getStatus() == VideoAssetStatus.AWAITING_VALIDATION) {
      throw new AcademicNotFoundException("Video bytes are not validated yet.");
    }
    if (asset.getStatus() == VideoAssetStatus.REJECTED
        || asset.getStatus() == VideoAssetStatus.RETIRED) {
      throw new AcademicConflictException(
          "VIDEO_NOT_PLAYABLE", "This video asset is not playable in its current state.");
    }
    return storage.presignGet(asset.getStorageKey(), storageProperties.playbackPresignTtl());
  }

  @Transactional(readOnly = true)
  public String getVideoCaptions(UUID actorId, UUID id) {
    requireAdmin(actorId);
    AcademicVideoAsset asset = requireAsset(id);
    if (!asset.isCaptionsAvailable() || asset.getCaptionsKey() == null) {
      throw new AcademicNotFoundException("Captions not found.");
    }
    return new String(storage.get(asset.getCaptionsKey()), java.nio.charset.StandardCharsets.UTF_8);
  }

  @Transactional
  public AcademicVideoAssetSnapshot putVideoCaptions(UUID actorId, UUID id, String captions) {
    requireAdmin(actorId);
    AcademicVideoAsset asset = requireAssetForUpdate(id);
    if (asset.getSource() == VideoAssetSource.PRODUCED) {
      throw new AcademicConflictException(
          "CAPTIONS_DERIVED_FROM_NARRATION",
          "Produced assets derive captions from narration segments.");
    }
    if (asset.getStatus() == VideoAssetStatus.REVIEWED
        || asset.getStatus() == VideoAssetStatus.RETIRED) {
      throw new AcademicConflictException(
          "CAPTIONS_IMMUTABLE",
          "Reviewed captions are immutable; use the replacement flow for corrections.");
    }
    if (asset.getStatus() == VideoAssetStatus.AWAITING_VALIDATION
        || asset.getStatus() == VideoAssetStatus.REJECTED) {
      throw new AcademicConflictException(
          "CAPTIONS_NOT_EDITABLE", "Captions are not editable in this asset state.");
    }
    captionsValidator.validate(captions, asset.getDurationSeconds());
    Instant now = now();
    String previousCaptionsKey = asset.getCaptionsKey();
    String captionsKey = "videos/" + asset.getId() + "/captions/" + UUID.randomUUID() + ".vtt";
    cleanup.protectBeforeExternalWrite(
        captionsKey,
        now.plus(TRANSIENT_OBJECT_RETENTION),
        MediaObjectCleanupStore.Reason.ORPHAN_OUTPUT);
    storage.put(
        captionsKey, "text/vtt", captions.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    asset.replaceCaptions(captionsKey, now);
    videos.save(asset);
    cleanup.cancel(captionsKey);
    if (previousCaptionsKey != null) {
      cleanup.schedule(previousCaptionsKey, now, MediaObjectCleanupStore.Reason.ORPHAN_OUTPUT);
    }
    return assetSnapshot(asset);
  }

  /** The human review transition; a model never performs it. */
  @Transactional
  public AcademicVideoAssetSnapshot reviewVideo(UUID actorId, UUID id) {
    requireAdmin(actorId);
    AcademicVideoAsset asset = requireAssetForUpdate(id);
    if (asset.getStatus() != VideoAssetStatus.DRAFT
        || !asset.hasValidatedBytes()
        || !asset.isCaptionsAvailable()) {
      throw new AcademicConflictException(
          "REVIEW_PRECONDITION_UNMET",
          "Review requires a DRAFT asset with validated bytes and captions.");
    }
    asset.markReviewed(actorId, now());
    videos.save(asset);
    audit(actorId, "VIDEO_REVIEWED", "ACADEMIC_VIDEO", asset.getId(), "SUCCEEDED", null, now());
    return assetSnapshot(asset);
  }

  private java.util.Optional<RenderJob> latestJob(UUID sceneSpecificationId) {
    return jobs.findLatestBySceneSpecificationId(sceneSpecificationId);
  }

  private String snapshotJson(SceneSpecification specification) {
    ObjectNode snapshot = json.createObjectNode();
    snapshot.put("explanationLanguage", specification.getExplanationLanguage());
    snapshot.set("segments", parse(specification.getSegments()));
    return json.writeValueAsString(snapshot);
  }

  private JsonNode parse(String value) {
    try {
      return json.readTree(value);
    } catch (RuntimeException exception) {
      throw new IllegalStateException("Stored scene specification is unreadable.", exception);
    }
  }

  private void requireAdmin(UUID actorId) {
    CurrentAccount account = authentication.requireAccount(actorId);
    if (account.role() != CurrentAccountRole.ADMIN) throw new AcademicAccessDeniedException();
  }

  private AcademicVideoAsset requireAsset(UUID id) {
    return videos
        .findById(id)
        .orElseThrow(() -> new AcademicNotFoundException("Video asset not found."));
  }

  private AcademicVideoAsset requireAssetForUpdate(UUID id) {
    return videos
        .findByIdForUpdate(id)
        .orElseThrow(() -> new AcademicNotFoundException("Video asset not found."));
  }

  private SceneSpecification requireSpecification(UUID id) {
    return specifications
        .findById(id)
        .orElseThrow(() -> new AcademicNotFoundException("Scene specification not found."));
  }

  private SceneSpecification requireSpecificationForUpdate(UUID id) {
    return specifications
        .findByIdForUpdate(id)
        .orElseThrow(() -> new AcademicNotFoundException("Scene specification not found."));
  }

  private void validateProvenance(ImageProvenanceCommand provenance) {
    if (provenance == null || !ORIGINS.contains(provenance.origin())) {
      throw validation("provenance.origin", AcademicViolationCode.UNSUPPORTED);
    }
    if (!"YUKCSCA_ORIGINAL".equals(provenance.origin())
        && (trimToNull(provenance.provider()) == null
            || trimToNull(provenance.sourceLocator()) == null
            || trimToNull(provenance.permissionReference()) == null)) {
      throw validation("provenance", AcademicViolationCode.MISSING_PERMISSION);
    }
  }

  private AcademicVideoAssetSnapshot assetSnapshot(AcademicVideoAsset asset) {
    List<Map<String, String>> rejection = null;
    if (asset.getRejection() != null) {
      java.util.ArrayList<Map<String, String>> reasons = new java.util.ArrayList<>();
      for (JsonNode node : (ArrayNode) parse(asset.getRejection())) {
        reasons.add(
            Map.of(
                "path", node.path("path").asText(""),
                "code", node.path("code").asText("")));
      }
      rejection = List.copyOf(reasons);
    }
    RenderJobSnapshot latestValidationJob =
        jobs.findLatestByVideoAssetId(asset.getId()).map(this::jobSnapshot).orElse(null);
    return new AcademicVideoAssetSnapshot(
        asset.getId(),
        asset.getSource().name(),
        asset.getStatus().name(),
        asset.getExplanationLanguage(),
        asset.getMediaType(),
        asset.getByteSize(),
        asset.getDurationSeconds(),
        asset.getWidth(),
        asset.getHeight(),
        asset.getSha256(),
        asset.isCaptionsAvailable(),
        rejection,
        latestValidationJob,
        asset.getOrigin(),
        asset.getProvider(),
        asset.getSourceLocator(),
        asset.getPermissionReference(),
        asset.getAuthorUserId(),
        asset.getReviewedByUserId(),
        asset.getReviewedAt(),
        asset.getCreatedAt(),
        asset.getUpdatedAt());
  }

  private RenderJobSnapshot jobSnapshot(RenderJob job) {
    return new RenderJobSnapshot(
        job.getId(),
        job.getKind().name(),
        job.getState().name(),
        job.getSceneSpecificationId(),
        job.getVideoAssetId(),
        job.getAttempts(),
        job.getErrorCode() == null ? null : job.getErrorCode().name(),
        job.getErrorDetail(),
        job.getCreatedAt(),
        job.getUpdatedAt());
  }

  private SceneSpecificationSnapshot specificationSnapshot(
      SceneSpecification specification, RenderJob latestJob) {
    return new SceneSpecificationSnapshot(
        specification.getId(),
        specification.getExplanationLanguage(),
        specification.getRegistryVersion(),
        parse(specification.getSegments()),
        latestJob == null ? null : jobSnapshot(latestJob),
        specification.getCreatedAt(),
        specification.getUpdatedAt());
  }

  private void audit(
      UUID actor,
      String action,
      String targetType,
      UUID target,
      String result,
      String reason,
      Instant now) {
    audits.save(new AcademicAudit(actor, action, targetType, target, result, reason, now));
  }

  private Instant now() {
    return clock.instant().truncatedTo(ChronoUnit.MICROS);
  }

  private static String trimToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private static AcademicValidationException validation(String path, AcademicViolationCode code) {
    return new AcademicValidationException(List.of(new AcademicViolation(path, code)));
  }

  private static AcademicConflictException validationNotRetryable() {
    return new AcademicConflictException(
        "VALIDATION_NOT_RETRYABLE",
        "Upload validation cannot be retried for this asset; create a new upload slot.");
  }

  public record VideoUploadSlotSnapshot(
      UUID id, String explanationLanguage, String uploadUrl, long maxByteSize, Instant expiresAt) {}

  public record AcademicVideoAssetSnapshot(
      UUID id,
      String source,
      String status,
      String explanationLanguage,
      String mediaType,
      Long byteSize,
      Integer durationSeconds,
      Integer width,
      Integer height,
      String sha256,
      boolean captionsAvailable,
      List<Map<String, String>> rejection,
      RenderJobSnapshot latestValidationJob,
      String origin,
      String provider,
      String sourceLocator,
      String permissionReference,
      UUID authorUserId,
      UUID reviewedByUserId,
      Instant reviewedAt,
      Instant createdAt,
      Instant updatedAt) {}

  public record RenderJobSnapshot(
      UUID id,
      String kind,
      String state,
      UUID sceneSpecificationId,
      UUID videoAssetId,
      int attempts,
      String errorCode,
      String errorDetail,
      Instant createdAt,
      Instant updatedAt) {}

  public record SceneSpecificationSnapshot(
      UUID id,
      String explanationLanguage,
      String registryVersion,
      JsonNode segments,
      RenderJobSnapshot latestRenderJob,
      Instant createdAt,
      Instant updatedAt) {}

  public record SceneTemplateRegistryView(String version, List<SceneTemplateActionView> actions) {}

  public record SceneTemplateParamDescriptorView(
      String id,
      String kind,
      String label,
      Boolean required,
      Double min,
      Double max,
      Integer maxLength) {

    static SceneTemplateParamDescriptorView from(
        SceneTemplateRegistry.SceneTemplateParamDescriptor descriptor) {
      return new SceneTemplateParamDescriptorView(
          descriptor.id(),
          descriptor.kind().name(),
          descriptor.label(),
          descriptor.required(),
          descriptor.min(),
          descriptor.max(),
          descriptor.maxLength());
    }
  }

  public record SceneTemplateActionView(
      String id, String displayName, List<SceneTemplateParamDescriptorView> params) {

    static SceneTemplateActionView from(SceneTemplateRegistry.SceneTemplateAction action) {
      return new SceneTemplateActionView(
          action.id(),
          action.displayName(),
          action.params().stream().map(SceneTemplateParamDescriptorView::from).toList());
    }
  }
}
