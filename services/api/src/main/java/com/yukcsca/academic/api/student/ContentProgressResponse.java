package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.PublishedPackageProjector.ContentProgressProjection;
import java.time.Instant;

public record ContentProgressResponse(
    String status, Integer resumeBlockIndex, Instant updatedAt, boolean updatedSinceCompleted) {
  static ContentProgressResponse from(ContentProgressProjection value) {
    return new ContentProgressResponse(
        value.status(), value.resumeBlockIndex(), value.updatedAt(), value.updatedSinceCompleted());
  }
}
