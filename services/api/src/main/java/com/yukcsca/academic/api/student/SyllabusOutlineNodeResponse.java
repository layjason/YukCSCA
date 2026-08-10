package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.PublishedPackageProjector.OutlineNodeProjection;
import java.util.List;
import java.util.UUID;

public record SyllabusOutlineNodeResponse(
    UUID id,
    UUID parentId,
    int order,
    LocalizedTextResponse summary,
    String productCoverage,
    List<LessonSummaryResponse> lessons) {
  static SyllabusOutlineNodeResponse from(OutlineNodeProjection value) {
    return new SyllabusOutlineNodeResponse(
        value.id(),
        value.parentId(),
        value.order(),
        LocalizedTextResponse.from(value.summary()),
        value.productCoverage(),
        value.lessons().stream().map(LessonSummaryResponse::from).toList());
  }
}
