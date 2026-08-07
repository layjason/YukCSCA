package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.AcademicStudentService.PublishedLessonResult;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record PublishedLessonResponse(
    UUID packageId,
    UUID packageRevisionId,
    String subject,
    UUID resourceId,
    LocalizedTextResponse title,
    List<String> availableExplanationLanguages,
    String requestedExplanationLanguage,
    Map<String, Object> body,
    ContentProgressResponse contentProgress) {
  static PublishedLessonResponse from(PublishedLessonResult value) {
    return new PublishedLessonResponse(
        value.packageId(),
        value.packageRevisionId(),
        value.subject(),
        value.resourceId(),
        LocalizedTextResponse.from(value.title()),
        value.availableExplanationLanguages(),
        value.requestedExplanationLanguage(),
        body(value),
        ContentProgressResponse.from(value.contentProgress()));
  }

  private static Map<String, Object> body(PublishedLessonResult value) {
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
