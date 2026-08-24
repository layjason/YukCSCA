package com.yukcsca.academic.api.student;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.yukcsca.academic.application.PublishedPackageProjector.ContentProgressProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.VideoPositionProjection;
import java.time.Instant;
import java.util.UUID;

public record ContentProgressResponse(
    String status,
    Integer resumeBlockIndex,
    @JsonInclude(JsonInclude.Include.NON_NULL) VideoPositionResponse video,
    Instant updatedAt,
    boolean updatedSinceCompleted) {
  static ContentProgressResponse from(ContentProgressProjection value) {
    return new ContentProgressResponse(
        value.status(),
        value.resumeBlockIndex(),
        VideoPositionResponse.from(value.video()),
        value.updatedAt(),
        value.updatedSinceCompleted());
  }

  /** Restored playback position, clamped to the currently published asset duration. */
  public record VideoPositionResponse(UUID videoAssetId, int positionSeconds) {
    static VideoPositionResponse from(VideoPositionProjection value) {
      return value == null
          ? null
          : new VideoPositionResponse(value.videoAssetId(), value.positionSeconds());
    }
  }
}
