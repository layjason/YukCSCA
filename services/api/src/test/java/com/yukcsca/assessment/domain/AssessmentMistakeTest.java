package com.yukcsca.assessment.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AssessmentMistakeTest {
  @Test
  void markRemediationInProgressOnlyFromOpen() {
    Instant created = Instant.parse("2026-08-13T00:00:00Z");
    AssessmentMistake mistake = openMistake(created);

    Instant first = Instant.parse("2026-08-13T00:01:00Z");
    mistake.markRemediationInProgress(first);
    assertThat(mistake.getStatus()).isEqualTo(MistakeStatus.REMEDIATION_IN_PROGRESS);
    assertThat(mistake.getUpdatedAt()).isEqualTo(first);

    Instant second = Instant.parse("2026-08-13T00:02:00Z");
    mistake.markRemediationInProgress(second);
    assertThat(mistake.getStatus()).isEqualTo(MistakeStatus.REMEDIATION_IN_PROGRESS);
    assertThat(mistake.getUpdatedAt()).isEqualTo(first);

    mistake.markAwaitingRevalidation(Instant.parse("2026-08-13T00:03:00Z"));
    mistake.markRemediationInProgress(Instant.parse("2026-08-13T00:04:00Z"));
    assertThat(mistake.getStatus()).isEqualTo(MistakeStatus.AWAITING_REVALIDATION);
  }

  private static AssessmentMistake openMistake(Instant now) {
    return new AssessmentMistake(
        UUID.randomUUID(),
        "MATHEMATICS",
        UUID.randomUUID(),
        UUID.randomUUID(),
        UUID.randomUUID(),
        "en",
        UUID.randomUUID(),
        UUID.randomUUID(),
        UUID.randomUUID(),
        0,
        false,
        "{}",
        "{}",
        "[]",
        "[]",
        now);
  }
}
