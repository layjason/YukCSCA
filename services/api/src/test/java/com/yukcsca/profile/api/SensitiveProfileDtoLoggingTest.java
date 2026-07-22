package com.yukcsca.profile.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.identity.api.AuthResponse;
import com.yukcsca.identity.api.CurrentUserResponse;
import com.yukcsca.identity.domain.UserRole;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SensitiveProfileDtoLoggingTest {
  @Test
  void redactsStudentProfileFieldsFromStringRepresentation() {
    var request =
        new ActivateStudentProfileRequest(
            "Private Student Name", 2009, "GRADE_11", "Private City", "id");

    assertThat(request.toString())
        .isEqualTo("ActivateStudentProfileRequest[profileFields=<redacted>]")
        .doesNotContain(
            request.preferredName(),
            request.birthYear().toString(),
            request.currentGrade(),
            request.city(),
            request.defaultExplanationLanguage());
  }

  @Test
  void redactsStudentProfileResponseAndAuthenticationFromStringRepresentation() {
    var profile =
        new StudentProfileResponse(
            UUID.randomUUID(),
            "Private Student Name",
            2009,
            "GRADE_11",
            "Private City",
            "id",
            Instant.parse("2026-07-22T00:00:00Z"),
            Instant.parse("2026-07-22T00:00:00Z"));
    var user =
        new CurrentUserResponse(
            UUID.randomUUID(),
            "private@example.com",
            "Private Student Name",
            null,
            UserRole.STUDENT,
            true);
    var activation =
        new StudentActivationResponse(
            profile, new AuthResponse("private-token", "Bearer", 900, user));

    assertThat(profile.toString())
        .isEqualTo("StudentProfileResponse[profileFields=<redacted>]")
        .doesNotContain("Private Student Name", "2009", "GRADE_11", "Private City", "id");
    assertThat(activation.toString())
        .isEqualTo("StudentActivationResponse[profile=<redacted>, authentication=<redacted>]")
        .doesNotContain("Private Student Name", "private@example.com", "private-token");
  }
}
