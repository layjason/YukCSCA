package com.yukcsca.academic.api;

import com.yukcsca.academic.application.AcademicAdminService;
import com.yukcsca.academic.application.AcademicImageContent;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.json.JsonMapper;

@RestController
@RequestMapping("/api/v1/admin")
public class AcademicAdminController {
  private final AcademicAdminService academic;
  private final JsonMapper json;

  public AcademicAdminController(AcademicAdminService academic, JsonMapper json) {
    this.academic = academic;
    this.json = json;
  }

  @GetMapping("/academic-packages")
  public List<AcademicPackageSummaryResponse> list(
      @AuthenticationPrincipal Jwt jwt, HttpServletResponse response) {
    noStore(response);
    return academic.list(actor(jwt)).stream().map(AcademicPackageSummaryResponse::from).toList();
  }

  @PostMapping("/academic-packages")
  @ResponseStatus(HttpStatus.CREATED)
  public AcademicPackageResponse create(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody CreateAcademicPackageRequest request,
      HttpServletResponse response) {
    noStore(response);
    return AcademicPackageResponse.from(academic.create(actor(jwt), request.subject()), json);
  }

  @GetMapping("/academic-packages/{id}")
  public AcademicPackageResponse get(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, HttpServletResponse response) {
    noStore(response);
    return AcademicPackageResponse.from(academic.get(actor(jwt), id), json);
  }

  @PutMapping("/academic-packages/{id}/draft")
  public AcademicPackageResponse saveDraft(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID id,
      @Valid @RequestBody SaveAcademicPackageDraftRequest request,
      HttpServletResponse response) {
    noStore(response);
    return AcademicPackageResponse.from(
        academic.saveDraft(actor(jwt), id, request.expectedDraftRevision(), request.draft()), json);
  }

  @PostMapping(value = "/academic-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public AcademicImageResponse uploadImage(
      @AuthenticationPrincipal Jwt jwt,
      @RequestPart("file") MultipartFile file,
      @Valid @RequestPart("provenance") UploadAcademicImageProvenance provenance,
      HttpServletResponse response) {
    noStore(response);
    return AcademicImageResponse.from(
        academic.uploadImage(actor(jwt), file, provenance.toCommand()));
  }

  @GetMapping("/academic-images/{id}")
  public ResponseEntity<byte[]> getImage(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    AcademicImageContent image = academic.getImage(actor(jwt), id);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(image.mediaType()))
        .cacheControl(
            CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePrivate().immutable())
        .header("X-Content-Type-Options", "nosniff")
        .body(image.bytes());
  }

  @GetMapping("/academic-packages/{id}/terms/{termId}/audio")
  public ResponseEntity<byte[]> getPublishedTermPronunciation(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID id,
      @PathVariable UUID termId,
      @RequestParam(required = false) String surfaceForm) {
    AcademicImageContent audio =
        academic.getPublishedTermPronunciation(actor(jwt), id, termId, surfaceForm);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(audio.mediaType()))
        .cacheControl(
            CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePrivate().immutable())
        .header("X-Content-Type-Options", "nosniff")
        .body(audio.bytes());
  }

  @PostMapping("/academic-packages/{id}:publish")
  public AcademicPackageResponse publish(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID id,
      @Valid @RequestBody PublishAcademicPackageRequest request,
      HttpServletResponse response) {
    noStore(response);
    return AcademicPackageResponse.from(
        academic.publish(actor(jwt), id, request.expectedDraftRevision()), json);
  }

  @PostMapping("/academic-packages/{id}:archive")
  public AcademicPackageResponse archive(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID id,
      @Valid @RequestBody ArchiveAcademicPackageRequest request,
      HttpServletResponse response) {
    noStore(response);
    return AcademicPackageResponse.from(
        academic.archive(actor(jwt), id, request.expectedDraftRevision(), request.reason()), json);
  }

  private static UUID actor(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }

  private static void noStore(HttpServletResponse response) {
    response.setHeader(HttpHeaders.CACHE_CONTROL, CacheControl.noStore().getHeaderValue());
    response.setHeader(HttpHeaders.PRAGMA, "no-cache");
  }
}
