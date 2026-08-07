package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.AcademicImageContent;
import com.yukcsca.academic.application.AcademicStudentService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/academic")
public class AcademicStudentController {
  private final AcademicStudentService academic;

  public AcademicStudentController(AcademicStudentService academic) {
    this.academic = academic;
  }

  @GetMapping("/packages")
  public List<PublishedPackageSummaryResponse> listPublishedPackages(
      @AuthenticationPrincipal Jwt jwt, HttpServletResponse response) {
    noStore(response);
    return academic.listPublishedPackages(actor(jwt)).stream()
        .map(PublishedPackageSummaryResponse::from)
        .toList();
  }

  @GetMapping("/packages/{subject}")
  public PublishedPackageBrowseResponse getPublishedPackageBrowse(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      HttpServletResponse response) {
    noStore(response);
    return PublishedPackageBrowseResponse.from(
        academic.getPublishedPackageBrowse(actor(jwt), subject));
  }

  @GetMapping("/packages/{subject}/lessons/{resourceId}")
  public PublishedLessonResponse getPublishedLesson(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @PathVariable UUID resourceId,
      @RequestParam String explanationLanguage,
      HttpServletResponse response) {
    noStore(response);
    return PublishedLessonResponse.from(
        academic.getPublishedLesson(actor(jwt), subject, resourceId, explanationLanguage));
  }

  @PutMapping("/packages/{subject}/lessons/{resourceId}/progress")
  public ContentProgressResponse upsertContentProgress(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @PathVariable UUID resourceId,
      @Valid @RequestBody UpsertContentProgressRequest request,
      HttpServletResponse response) {
    noStore(response);
    return ContentProgressResponse.from(
        academic.upsertContentProgress(
            actor(jwt),
            subject,
            resourceId,
            request.status(),
            request.resumeBlockIndex(),
            request.expectedPackageRevisionId()));
  }

  @GetMapping("/images/{imageId}")
  public ResponseEntity<byte[]> getPublishedAcademicImage(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID imageId) {
    AcademicImageContent image = academic.getPublishedImage(actor(jwt), imageId);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(image.mediaType()))
        .cacheControl(
            CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePrivate().immutable())
        .header("X-Content-Type-Options", "nosniff")
        .body(image.bytes());
  }

  private static UUID actor(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }

  private static void noStore(HttpServletResponse response) {
    response.setHeader(HttpHeaders.CACHE_CONTROL, CacheControl.noStore().getHeaderValue());
    response.setHeader(HttpHeaders.PRAGMA, "no-cache");
  }
}
