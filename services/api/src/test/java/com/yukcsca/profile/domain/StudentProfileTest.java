package com.yukcsca.profile.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class StudentProfileTest {
  @Test
  void normalizesProfileTimestampsToPostgresMicrosecondPrecision() {
    StudentProfile profile =
        StudentProfile.create(
            UUID.randomUUID(),
            "Ayu",
            2009,
            StudentGrade.GRADE_11,
            "Jakarta",
            ExplanationLanguage.INDONESIAN,
            Instant.parse("2026-07-30T19:51:23.230220789Z"));

    assertThat(profile.getCreatedAt()).isEqualTo(Instant.parse("2026-07-30T19:51:23.230220Z"));
    assertThat(profile.getUpdatedAt()).isEqualTo(Instant.parse("2026-07-30T19:51:23.230220Z"));

    assertThat(
            profile.update(
                "Sari", null, null, null, null, Instant.parse("2026-07-30T19:51:23.253812226Z")))
        .isTrue();
    assertThat(profile.getUpdatedAt()).isEqualTo(Instant.parse("2026-07-30T19:51:23.253812Z"));
  }
}
