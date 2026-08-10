package com.yukcsca.academic.api.student;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.yukcsca.academic.application.AcademicStudentService.PublishedPackageBrowseResult;
import java.util.List;

public record PublishedPackageBrowseResponse(
    @JsonProperty("package") PublishedPackageSummaryResponse packageValue,
    OfficialSourcePanelResponse officialSource,
    List<SyllabusOutlineNodeResponse> outline,
    LessonSummaryResponse continueLesson) {
  static PublishedPackageBrowseResponse from(PublishedPackageBrowseResult value) {
    return new PublishedPackageBrowseResponse(
        PublishedPackageSummaryResponse.from(value.packageSummary()),
        OfficialSourcePanelResponse.from(value.officialSource()),
        value.outline().stream().map(SyllabusOutlineNodeResponse::from).toList(),
        LessonSummaryResponse.from(value.continueLesson()));
  }
}
