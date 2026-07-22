package com.yukcsca.profile.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ActivateStudentProfileRequest(
    @NotBlank @Size(max = 160) String preferredName,
    @NotNull Integer birthYear,
    @NotBlank String currentGrade,
    @NotBlank @Size(max = 120) String city,
    @NotBlank String defaultExplanationLanguage) {
  @Override
  public String toString() {
    return "ActivateStudentProfileRequest[profileFields=<redacted>]";
  }
}
