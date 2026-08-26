package com.yukcsca.academic.api;

import com.yukcsca.academic.api.video.AcademicVideoResponses.AcademicVideoAssetResponse;
import com.yukcsca.academic.api.video.AcademicVideoResponses.ConfirmVideoUploadRequest;
import com.yukcsca.academic.api.video.AcademicVideoResponses.CreateRenderJobRequest;
import com.yukcsca.academic.api.video.AcademicVideoResponses.CreateVideoUploadSlotRequest;
import com.yukcsca.academic.api.video.AcademicVideoResponses.PutVideoCaptionsRequest;
import com.yukcsca.academic.api.video.AcademicVideoResponses.RenderJobResponse;
import com.yukcsca.academic.api.video.AcademicVideoResponses.SceneSpecificationResponse;
import com.yukcsca.academic.api.video.AcademicVideoResponses.SceneTemplateRegistryResponse;
import com.yukcsca.academic.api.video.AcademicVideoResponses.VideoPlaybackGrantResponse;
import com.yukcsca.academic.api.video.AcademicVideoResponses.VideoUploadSlotResponse;
import com.yukcsca.academic.application.AcademicVideoService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

/** Admin reviewed-video endpoints (VS-010B). Students never reach these routes. */
@RestController
@RequestMapping("/api/v1/admin")
public class AcademicVideoAdminController {
  private final AcademicVideoService videos;

  public AcademicVideoAdminController(AcademicVideoService videos) {
    this.videos = videos;
  }

  @PostMapping("/academic-video-slots")
  @ResponseStatus(HttpStatus.CREATED)
  public VideoUploadSlotResponse createUploadSlot(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody CreateVideoUploadSlotRequest request,
      HttpServletResponse response) {
    noStore(response);
    return VideoUploadSlotResponse.from(
        videos.createUploadSlot(actor(jwt), request.explanationLanguage()));
  }

  @PostMapping("/academic-video-slots/{slotId}:confirm")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public AcademicVideoAssetResponse confirmVideoUpload(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID slotId,
      @Valid @RequestBody ConfirmVideoUploadRequest request,
      HttpServletResponse response) {
    noStore(response);
    return AcademicVideoAssetResponse.from(
        videos.confirmUpload(
            actor(jwt),
            slotId,
            new com.yukcsca.academic.application.ImageProvenanceCommand(
                request.provenance().origin(),
                request.provenance().provider(),
                request.provenance().sourceLocator(),
                request.provenance().permissionReference())));
  }

  @PostMapping("/scene-specifications")
  @ResponseStatus(HttpStatus.CREATED)
  public SceneSpecificationResponse createSceneSpecification(
      @AuthenticationPrincipal Jwt jwt,
      @RequestBody JsonNode request,
      HttpServletResponse response) {
    noStore(response);
    return SceneSpecificationResponse.from(videos.createSceneSpecification(actor(jwt), request));
  }

  @PutMapping("/scene-specifications/{id}")
  public SceneSpecificationResponse replaceSceneSpecification(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID id,
      @RequestBody JsonNode request,
      HttpServletResponse response) {
    noStore(response);
    return SceneSpecificationResponse.from(
        videos.replaceSceneSpecification(actor(jwt), id, request));
  }

  @GetMapping("/scene-specifications/{id}")
  public SceneSpecificationResponse getSceneSpecification(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletResponse response) {
    noStore(response);
    return SceneSpecificationResponse.from(videos.getSceneSpecification(actor(jwt), id));
  }

  @GetMapping("/scene-templates")
  public SceneTemplateRegistryResponse listSceneTemplates(
      @AuthenticationPrincipal Jwt jwt, HttpServletResponse response) {
    noStore(response);
    return SceneTemplateRegistryResponse.from(videos.listSceneTemplates(actor(jwt)));
  }

  @PostMapping("/render-jobs")
  @ResponseStatus(HttpStatus.CREATED)
  public RenderJobResponse createRenderJob(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody CreateRenderJobRequest request,
      HttpServletResponse response) {
    noStore(response);
    return RenderJobResponse.from(
        videos.createRenderJob(actor(jwt), request.sceneSpecificationId()));
  }

  @GetMapping("/render-jobs/{jobId}")
  public RenderJobResponse getRenderJob(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID jobId, HttpServletResponse response) {
    noStore(response);
    return RenderJobResponse.from(videos.getRenderJob(actor(jwt), jobId));
  }

  @GetMapping("/academic-videos/{id}")
  public AcademicVideoAssetResponse getAcademicVideo(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletResponse response) {
    noStore(response);
    return AcademicVideoAssetResponse.from(videos.getVideo(actor(jwt), id));
  }

  @PostMapping("/academic-videos/{id}:retry-validation")
  @ResponseStatus(HttpStatus.CREATED)
  public RenderJobResponse retryAcademicVideoValidation(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletResponse response) {
    noStore(response);
    return RenderJobResponse.from(videos.retryUploadValidation(actor(jwt), id));
  }

  @GetMapping("/academic-videos/{id}/play")
  public VideoPlaybackGrantResponse getAcademicVideoPlay(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletResponse response) {
    noStore(response);
    return VideoPlaybackGrantResponse.from(videos.getVideoPlayGrant(actor(jwt), id));
  }

  @GetMapping("/academic-videos/{id}/captions")
  public ResponseEntity<String> getAcademicVideoCaptions(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    String captions = videos.getVideoCaptions(actor(jwt), id);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("text/vtt"))
        .cacheControl(CacheControl.noStore())
        .header("X-Content-Type-Options", "nosniff")
        .body(captions);
  }

  @PutMapping("/academic-videos/{id}/captions")
  public AcademicVideoAssetResponse putAcademicVideoCaptions(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID id,
      @Valid @RequestBody PutVideoCaptionsRequest request,
      HttpServletResponse response) {
    noStore(response);
    return AcademicVideoAssetResponse.from(
        videos.putVideoCaptions(actor(jwt), id, request.captions()));
  }

  @PostMapping("/academic-videos/{id}:review")
  public AcademicVideoAssetResponse reviewAcademicVideo(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletResponse response) {
    noStore(response);
    return AcademicVideoAssetResponse.from(videos.reviewVideo(actor(jwt), id));
  }

  private static UUID actor(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }

  private static void noStore(HttpServletResponse response) {
    response.setHeader(HttpHeaders.CACHE_CONTROL, CacheControl.noStore().getHeaderValue());
    response.setHeader(HttpHeaders.PRAGMA, "no-cache");
  }
}
