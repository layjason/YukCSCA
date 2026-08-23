package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.AcademicStudentService.VideoPositionCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record UpsertContentProgressRequest(
    @NotBlank String status,
    @Min(0) Integer resumeBlockIndex,
    @Valid VideoPositionRequest video,
    UUID expectedPackageRevisionId) {

  public record VideoPositionRequest(
      @NotNull UUID videoAssetId, @Min(0) @Max(600) @NotNull Integer positionSeconds) {
    VideoPositionCommand toCommand() {
      return videoAssetId == null ? null : new VideoPositionCommand(videoAssetId, positionSeconds);
    }
  }

  VideoPositionCommand videoCommand() {
    return video == null ? null : video.toCommand();
  }
}
