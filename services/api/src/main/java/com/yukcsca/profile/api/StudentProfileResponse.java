package com.yukcsca.profile.api;

import com.yukcsca.profile.domain.StudentProfile;
import java.time.Instant;
import java.util.UUID;

public record StudentProfileResponse(
    UUID id,
    String preferredName,
    int birthYear,
    String currentGrade,
    String city,
    String defaultExplanationLanguage,
    Instant createdAt,
    Instant updatedAt) {
  static StudentProfileResponse from(StudentProfile profile) {
    return new StudentProfileResponse(
        profile.getId(),
        profile.getPreferredName(),
        profile.getBirthYear(),
        profile.getCurrentGrade().name(),
        profile.getCity(),
        profile.getDefaultExplanationLanguage().wireValue(),
        profile.getCreatedAt(),
        profile.getUpdatedAt());
  }

  @Override
  public String toString() {
    return "StudentProfileResponse[profileFields=<redacted>]";
  }
}
