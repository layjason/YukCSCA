package com.yukcsca.academic.api.student;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.yukcsca.academic.application.AcademicStudentService.PublishedRemediationResult;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record PublishedRemediationResponse(
    UUID packageId,
    UUID packageRevisionId,
    String subject,
    UUID resourceId,
    LocalizedTextResponse title,
    List<String> availableExplanationLanguages,
    String requestedExplanationLanguage,
    Map<String, Object> body,
    ContentProgressResponse contentProgress,
    List<UUID> outlineItemIds,
    List<UUID> objectiveIds,
    @JsonInclude(JsonInclude.Include.NON_NULL) VideoRefResponse video) {
  static PublishedRemediationResponse from(PublishedRemediationResult value) {
    return new PublishedRemediationResponse(
        value.packageId(),
        value.packageRevisionId(),
        value.subject(),
        value.resourceId(),
        LocalizedTextResponse.from(value.title()),
        value.availableExplanationLanguages(),
        value.requestedExplanationLanguage(),
        body(value),
        ContentProgressResponse.from(value.contentProgress()),
        value.outlineItemIds(),
        value.objectiveIds(),
        VideoRefResponse.from(value.video()));
  }

  private static Map<String, Object> body(PublishedRemediationResult value) {
    if (value.languageAvailable()) {
      return Map.of("availability", "AVAILABLE", "blocks", value.blocks());
    }
    return Map.of(
        "availability",
        "LANGUAGE_UNAVAILABLE",
        "requestedLanguage",
        value.requestedExplanationLanguage());
  }
}
