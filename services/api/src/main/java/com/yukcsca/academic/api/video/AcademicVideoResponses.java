package com.yukcsca.academic.api.video;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.yukcsca.academic.application.AcademicVideoService.AcademicVideoAssetSnapshot;
import com.yukcsca.academic.application.AcademicVideoService.RenderJobSnapshot;
import com.yukcsca.academic.application.AcademicVideoService.SceneSpecificationSnapshot;
import com.yukcsca.academic.application.AcademicVideoService.SceneTemplateRegistryView;
import com.yukcsca.academic.application.AcademicVideoService.VideoUploadSlotSnapshot;
import com.yukcsca.academic.application.MediaStoragePort;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Wire DTOs for the VS-010B admin reviewed-video endpoints. Shapes mirror the accepted checkpoint
 * VS-010B-R5-accepted; provenance prints redact source fields like the image uploader.
 */
public final class AcademicVideoResponses {
  private AcademicVideoResponses() {}

  public record CreateVideoUploadSlotRequest(@NotBlank String explanationLanguage) {}

  public record VideoProvenanceRequest(
      @NotBlank String origin,
      @Size(max = 200) String provider,
      @Size(max = 2000) String sourceLocator,
      @Size(max = 1000) String permissionReference) {
    @Override
    public String toString() {
      return "VideoProvenanceRequest[origin=" + origin + ", source=[REDACTED]]";
    }
  }

  public record ConfirmVideoUploadRequest(@NotNull @Valid VideoProvenanceRequest provenance) {}

  public record SceneSegmentRequest(
      @NotBlank String templateActionId,
      Map<String, Object> params,
      @NotBlank String narrationText) {}

  public record SceneSpecificationRequest(
      @NotBlank String explanationLanguage,
      @NotNull @Size(min = 1, max = 60) List<SceneSegmentRequest> segments) {}

  public record CreateRenderJobRequest(@NotNull UUID sceneSpecificationId) {}

  public record PutVideoCaptionsRequest(@NotBlank @Size(min = 1, max = 65536) String captions) {}

  public record VideoUploadSlotResponse(
      UUID id, String explanationLanguage, String uploadUrl, long maxByteSize, Instant expiresAt) {
    public static VideoUploadSlotResponse from(VideoUploadSlotSnapshot slot) {
      return new VideoUploadSlotResponse(
          slot.id(),
          slot.explanationLanguage(),
          slot.uploadUrl(),
          slot.maxByteSize(),
          slot.expiresAt());
    }
  }

  public record VideoProvenanceRecord(
      String origin,
      String provider,
      String sourceLocator,
      String permissionReference,
      UUID authorUserId,
      UUID reviewedByUserId,
      Instant reviewedAt) {
    @Override
    public String toString() {
      return "VideoProvenanceRecord[origin=" + origin + ", source=[REDACTED]]";
    }
  }

  public record AcademicVideoAssetResponse(
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
      RenderJobResponse latestValidationJob,
      VideoProvenanceRecord provenance,
      Instant createdAt,
      Instant updatedAt) {
    public static AcademicVideoAssetResponse from(AcademicVideoAssetSnapshot asset) {
      return new AcademicVideoAssetResponse(
          asset.id(),
          asset.source(),
          asset.status(),
          asset.explanationLanguage(),
          asset.mediaType(),
          asset.byteSize(),
          asset.durationSeconds(),
          asset.width(),
          asset.height(),
          asset.sha256(),
          asset.captionsAvailable(),
          asset.rejection(),
          asset.latestValidationJob() == null
              ? null
              : RenderJobResponse.from(asset.latestValidationJob()),
          new VideoProvenanceRecord(
              asset.origin(),
              asset.provider(),
              asset.sourceLocator(),
              asset.permissionReference(),
              asset.authorUserId(),
              asset.reviewedByUserId(),
              asset.reviewedAt()),
          asset.createdAt(),
          asset.updatedAt());
    }
  }

  public record RenderJobResponse(
      UUID id,
      String kind,
      String state,
      UUID sceneSpecificationId,
      UUID videoAssetId,
      int attempts,
      ErrorCodeResponse error,
      Instant createdAt,
      Instant updatedAt) {
    record ErrorCodeResponse(String code, String detail) {}

    public static RenderJobResponse from(RenderJobSnapshot job) {
      return new RenderJobResponse(
          job.id(),
          job.kind(),
          job.state(),
          job.sceneSpecificationId(),
          job.videoAssetId(),
          job.attempts(),
          job.errorCode() == null
              ? null
              : new ErrorCodeResponse(job.errorCode(), job.errorDetail()),
          job.createdAt(),
          job.updatedAt());
    }
  }

  public record SceneSpecificationResponse(
      UUID id,
      String explanationLanguage,
      String registryVersion,
      Object segments,
      @JsonInclude(JsonInclude.Include.NON_NULL) RenderJobResponse latestRenderJob,
      Instant createdAt,
      Instant updatedAt) {
    public static SceneSpecificationResponse from(SceneSpecificationSnapshot specification) {
      return new SceneSpecificationResponse(
          specification.id(),
          specification.explanationLanguage(),
          specification.registryVersion(),
          specification.segments(),
          specification.latestRenderJob() == null
              ? null
              : RenderJobResponse.from(specification.latestRenderJob()),
          specification.createdAt(),
          specification.updatedAt());
    }
  }

  public record SceneTemplateParamDescriptorResponse(
      String id,
      String kind,
      String label,
      Boolean required,
      Double min,
      Double max,
      Integer maxLength) {}

  public record SceneTemplateActionResponse(
      String id, String displayName, List<SceneTemplateParamDescriptorResponse> params) {}

  public record SceneTemplateRegistryResponse(
      String version, List<SceneTemplateActionResponse> actions) {
    public static SceneTemplateRegistryResponse from(SceneTemplateRegistryView registry) {
      return new SceneTemplateRegistryResponse(
          registry.version(),
          registry.actions().stream()
              .map(
                  action ->
                      new SceneTemplateActionResponse(
                          action.id(),
                          action.displayName(),
                          action.params().stream()
                              .map(
                                  param ->
                                      new SceneTemplateParamDescriptorResponse(
                                          param.id(),
                                          param.kind(),
                                          param.label(),
                                          param.required(),
                                          param.min(),
                                          param.max(),
                                          param.maxLength()))
                              .toList()))
              .toList());
    }
  }

  public record VideoPlaybackGrantResponse(String url, Instant expiresAt) {
    public static VideoPlaybackGrantResponse from(MediaStoragePort.Presigned grant) {
      return new VideoPlaybackGrantResponse(grant.url(), grant.expiresAt());
    }
  }
}
