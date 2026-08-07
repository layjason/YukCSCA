package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.PublishedPackageProjector.LessonSummaryProjection;
import java.util.List;
import java.util.UUID;

public record LessonSummaryResponse(
    UUID resourceId,
    LocalizedTextResponse title,
    List<UUID> outlineItemIds,
    ContentProgressResponse contentProgress) {
  static LessonSummaryResponse from(LessonSummaryProjection value) {
    if (value == null) return null;
    return new LessonSummaryResponse(
        value.resourceId(),
        LocalizedTextResponse.from(value.title()),
        value.outlineItemIds(),
        ContentProgressResponse.from(value.contentProgress()));
  }
}
