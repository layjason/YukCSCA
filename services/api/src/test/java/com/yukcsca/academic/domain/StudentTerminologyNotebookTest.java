package com.yukcsca.academic.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class StudentTerminologyNotebookTest {
  @Test
  void upsertIsIdempotentAndAccumulatesSources() {
    Instant first = Instant.parse("2026-08-01T00:00:00Z");
    StudentTerminologyNotebook row =
        new StudentTerminologyNotebook(
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            "TOPIC_TERM",
            StudentTerminologyNotebook.SOURCE_REQUIRED_COURSE,
            "{}",
            null,
            first);
    assertThat(row.getFamiliarity()).isEqualTo(StudentTerminologyNotebook.FAMILIARITY_NEW);
    assertThat(row.isDue()).isTrue();
    Instant later = Instant.parse("2026-08-01T01:00:00Z");
    row.refreshEncounter(
        StudentTerminologyNotebook.SOURCE_CLICKED, "{\"place\":\"LESSON\"}", "snippet", later);
    row.refreshEncounter(
        StudentTerminologyNotebook.SOURCE_CLICKED, "{\"place\":\"LESSON\"}", "snippet", later);
    assertThat(row.getSources())
        .containsExactly(
            StudentTerminologyNotebook.SOURCE_REQUIRED_COURSE,
            StudentTerminologyNotebook.SOURCE_CLICKED);
    assertThat(row.getUpdatedAt()).isEqualTo(later);
    assertThat(row.getEncounterSnippet()).isEqualTo("snippet");
  }

  @Test
  void reviewTransitionsFamiliarityAndDue() {
    Instant now = Instant.parse("2026-08-01T00:00:00Z");
    StudentTerminologyNotebook row =
        new StudentTerminologyNotebook(
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            "TOPIC_TERM",
            StudentTerminologyNotebook.SOURCE_CLICKED,
            "{}",
            null,
            now);
    row.applyReview(false, now.plusSeconds(10));
    assertThat(row.getFamiliarity()).isEqualTo(StudentTerminologyNotebook.FAMILIARITY_LEARNING);
    assertThat(row.isDue()).isTrue();
    row.applyReview(true, now.plusSeconds(20));
    assertThat(row.getFamiliarity()).isEqualTo(StudentTerminologyNotebook.FAMILIARITY_FAMILIAR);
    assertThat(row.isDue()).isFalse();
    row.applyReview(false, now.plusSeconds(30));
    assertThat(row.getFamiliarity()).isEqualTo(StudentTerminologyNotebook.FAMILIARITY_LEARNING);
    assertThat(row.isDue()).isTrue();
  }

  @Test
  void languageMistakeMarksLearningAndDue() {
    Instant now = Instant.parse("2026-08-01T00:00:00Z");
    StudentTerminologyNotebook row =
        new StudentTerminologyNotebook(
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            "TOPIC_TERM",
            StudentTerminologyNotebook.SOURCE_CLICKED,
            "{}",
            null,
            now);
    row.applyReview(true, now.plusSeconds(5));
    row.markLanguageMistake(now.plusSeconds(10));
    assertThat(row.getSources()).contains(StudentTerminologyNotebook.SOURCE_LANGUAGE_MISTAKE);
    assertThat(row.getFamiliarity()).isEqualTo(StudentTerminologyNotebook.FAMILIARITY_LEARNING);
    assertThat(row.isDue()).isTrue();
  }
}
