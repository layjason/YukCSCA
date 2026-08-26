package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.AcademicStudentService.PublishedVideoRefView;
import java.util.UUID;

/** Published reviewed-video reference for the requested explanation language. */
public record VideoRefResponse(UUID videoAssetId, int durationSeconds) {
  static VideoRefResponse from(PublishedVideoRefView value) {
    return value == null
        ? null
        : new VideoRefResponse(value.videoAssetId(), value.durationSeconds());
  }
}
