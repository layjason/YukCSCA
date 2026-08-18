package com.yukcsca.academic.api.student;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.yukcsca.academic.application.PublishedPackageProjector.LessonSummaryProjection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record LessonSummaryResponse(
    UUID resourceId,
    LocalizedTextResponse title,
    List<UUID> outlineItemIds,
    ContentProgressResponse contentProgress,
    @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, Object> terminologyPreview) {
  static LessonSummaryResponse from(LessonSummaryProjection value) {
    if (value == null) return null;
    return new LessonSummaryResponse(
        value.resourceId(),
        LocalizedTextResponse.from(value.title()),
        value.outlineItemIds(),
        ContentProgressResponse.from(value.contentProgress()),
        preview(value));
  }

  private static Map<String, Object> preview(LessonSummaryProjection value) {
    if (value.terminologyPreview() == null) return null;
    return TerminologyResponses.previewRef(
        new com.yukcsca.academic.application.AcademicTerminologyService.PreviewRefView(
            value.terminologyPreview().resourceId(),
            new com.yukcsca.academic.application.AcademicTerminologyService.PreviewProgressView(
                value.terminologyPreview().progress().status(),
                value.terminologyPreview().progress().updatedAt(),
                value.terminologyPreview().progress().requiredSetUpdatedSinceCompleted())));
  }
}
