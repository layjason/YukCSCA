package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.AcademicImageContent;
import com.yukcsca.academic.application.AcademicStudentService;
import com.yukcsca.academic.application.AcademicTerminologyService;
import com.yukcsca.academic.application.AcademicTerminologyService.PreviewPair;
import com.yukcsca.academic.application.AcademicTerminologyService.TermLookupCommand;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/academic")
public class AcademicStudentController {
  private final AcademicStudentService academic;
  private final AcademicTerminologyService terminology;

  public AcademicStudentController(
      AcademicStudentService academic, AcademicTerminologyService terminology) {
    this.academic = academic;
    this.terminology = terminology;
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

  @GetMapping("/packages/{subject}/remediation/{resourceId}")
  public PublishedRemediationResponse getPublishedRemediation(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @PathVariable UUID resourceId,
      @RequestParam String explanationLanguage,
      HttpServletResponse response) {
    noStore(response);
    return PublishedRemediationResponse.from(
        academic.getPublishedRemediation(actor(jwt), subject, resourceId, explanationLanguage));
  }

  @PutMapping("/packages/{subject}/remediation/{resourceId}/progress")
  public ContentProgressResponse upsertRemediationContentProgress(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @PathVariable UUID resourceId,
      @Valid @RequestBody UpsertContentProgressRequest request,
      HttpServletResponse response) {
    noStore(response);
    return ContentProgressResponse.from(
        academic.upsertRemediationContentProgress(
            actor(jwt),
            subject,
            resourceId,
            request.status(),
            request.resumeBlockIndex(),
            request.expectedPackageRevisionId()));
  }

  @GetMapping("/packages/{subject}/terminology/{resourceId}")
  public Map<String, Object> getTerminologyPreview(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @PathVariable UUID resourceId,
      @RequestParam String explanationLanguage,
      HttpServletResponse response) {
    noStore(response);
    return TerminologyResponses.preview(
        terminology.getPreview(actor(jwt), subject, resourceId, explanationLanguage));
  }

  @PutMapping("/packages/{subject}/terminology/{resourceId}/progress")
  public Map<String, Object> upsertPreviewProgress(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @PathVariable UUID resourceId,
      @Valid @RequestBody UpsertPreviewProgressRequest request,
      HttpServletResponse response) {
    noStore(response);
    return TerminologyResponses.progress(
        terminology.upsertPreviewProgress(
            actor(jwt),
            subject,
            resourceId,
            request.status(),
            request.expectedPackageRevisionId()));
  }

  @PostMapping("/packages/{subject}/terminology/{resourceId}/checks")
  public Map<String, Object> submitPreviewCheck(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @PathVariable UUID resourceId,
      @Valid @RequestBody SubmitPreviewCheckRequest request,
      HttpServletResponse response) {
    noStore(response);
    return TerminologyResponses.check(
        terminology.submitPreviewCheck(
            actor(jwt),
            subject,
            resourceId,
            request.pairs().stream()
                .map(pair -> new PreviewPair(pair.termId(), pair.selectedMatchKey()))
                .toList()));
  }

  @PostMapping("/packages/{subject}/terminology/{resourceId}/bookmarks")
  public Map<String, Object> bookmarkLessonTerms(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @PathVariable UUID resourceId,
      @Valid @RequestBody BookmarkLessonTermsRequest request,
      HttpServletResponse response) {
    noStore(response);
    return TerminologyResponses.bookmarkLesson(
        terminology.bookmarkLessonTerms(
            actor(jwt), subject, resourceId, request.explanationLanguage(), request.termIds()));
  }

  @PostMapping("/term-lookups")
  public Map<String, Object> resolveTermLookup(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody TermLookupRequest request,
      HttpServletResponse response) {
    noStore(response);
    return TerminologyResponses.lookup(
        terminology.resolveLookup(
            actor(jwt),
            new TermLookupCommand(
                request.subject(),
                request.explanationLanguage(),
                request.source(),
                request.termId(),
                request.selectedText(),
                request.resourceId(),
                request.sessionId(),
                request.itemId())));
  }

  @GetMapping("/terminology-notebook")
  public Map<String, Object> listTerminologyNotebook(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam String explanationLanguage,
      @RequestParam(required = false) Boolean dueOnly,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String classGroup,
      @RequestParam(required = false) String subject,
      @RequestParam(required = false) String cursor,
      @RequestParam(required = false) Integer limit,
      HttpServletResponse response) {
    noStore(response);
    return TerminologyResponses.notebookList(
        terminology.listNotebook(
            actor(jwt), explanationLanguage, dueOnly, q, classGroup, subject, cursor, limit));
  }

  @PutMapping("/terminology-notebook/{termId}")
  public Map<String, Object> bookmarkTerm(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID termId,
      @Valid @RequestBody BookmarkTermRequest request,
      HttpServletResponse response) {
    noStore(response);
    return TerminologyResponses.bookmark(
        terminology.bookmarkTerm(
            actor(jwt),
            termId,
            new TermLookupCommand(
                request.subject(),
                request.explanationLanguage(),
                request.source(),
                termId,
                null,
                request.resourceId(),
                request.sessionId(),
                request.itemId())));
  }

  @DeleteMapping("/terminology-notebook/{termId}")
  public ResponseEntity<Void> unbookmarkTerm(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID termId) {
    terminology.unbookmarkTerm(actor(jwt), termId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/terminology-notebook/{termId}")
  public Map<String, Object> getTerminologyNotebookEntry(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID termId,
      @RequestParam String explanationLanguage,
      HttpServletResponse response) {
    noStore(response);
    return TerminologyResponses.notebookDetail(
        terminology.getNotebookEntry(actor(jwt), termId, explanationLanguage));
  }

  @PostMapping("/terminology-notebook/{termId}/reviews")
  public Map<String, Object> submitTermReview(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID termId,
      @Valid @RequestBody SubmitTermReviewRequest request,
      HttpServletResponse response) {
    noStore(response);
    return TerminologyResponses.review(
        terminology.submitReview(actor(jwt), termId, request.kind(), request.selectedOptionKey()));
  }

  @GetMapping("/terms/{termId}/audio")
  public ResponseEntity<byte[]> getTermPronunciation(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID termId,
      @RequestParam(required = false) String surfaceForm) {
    AcademicImageContent audio = terminology.getPronunciation(actor(jwt), termId, surfaceForm);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(audio.mediaType()))
        .cacheControl(
            CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePrivate().immutable())
        .header("X-Content-Type-Options", "nosniff")
        .body(audio.bytes());
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

  public record UpsertPreviewProgressRequest(
      @NotBlank String status, UUID expectedPackageRevisionId) {}

  public record SubmitPreviewCheckRequest(
      @NotNull @Size(min = 1, max = 64) List<PreviewCheckPairRequest> pairs) {}

  public record PreviewCheckPairRequest(
      @NotNull UUID termId, @NotBlank @Size(max = 40) String selectedMatchKey) {}

  public record TermLookupRequest(
      @NotBlank String subject,
      @NotBlank String explanationLanguage,
      @NotBlank String source,
      UUID termId,
      @Size(max = 40) String selectedText,
      UUID resourceId,
      UUID sessionId,
      UUID itemId) {}

  public record SubmitTermReviewRequest(
      @NotBlank String kind, @NotBlank @Size(max = 40) String selectedOptionKey) {}

  public record BookmarkTermRequest(
      @NotBlank String subject,
      @NotBlank String explanationLanguage,
      @NotBlank String source,
      UUID resourceId,
      UUID sessionId,
      UUID itemId) {}

  public record BookmarkLessonTermsRequest(
      @NotBlank String explanationLanguage, @Size(max = 64) List<UUID> termIds) {}
}
