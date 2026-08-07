package com.yukcsca.academic.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Supported CSCA preparation subjects and their default exam structure.
 *
 * <p>Package lifecycle is subject-agnostic. Adding a subject means registering a profile here (and
 * extending the public {@code AcademicSubject} contract enum), not forking the academic module.
 * Pilot create is limited to subjects present in this map.
 */
public final class AcademicSubjectProfile {
  public static final String MATHEMATICS = "MATHEMATICS";

  public static final int MIN_DURATION_MINUTES = 1;
  public static final int MAX_DURATION_MINUTES = 300;
  public static final int MIN_TOTAL_POINTS = 1;
  public static final int MAX_TOTAL_POINTS = 1000;
  public static final int MIN_QUESTION_COUNT = 1;
  public static final int MAX_QUESTION_COUNT = 200;

  private static final Map<String, ExamStructureDefaults> PROFILES =
      Map.of(
          MATHEMATICS,
          new ExamStructureDefaults(60, 100, 48, "SINGLE_ANSWER", List.of("en", "zh-CN")));

  private AcademicSubjectProfile() {}

  public static Set<String> supportedSubjects() {
    return PROFILES.keySet();
  }

  public static boolean isSupported(String subject) {
    return subject != null && PROFILES.containsKey(subject);
  }

  public static Optional<ExamStructureDefaults> find(String subject) {
    return Optional.ofNullable(PROFILES.get(subject));
  }

  public static ExamStructureDefaults require(String subject) {
    return find(subject)
        .orElseThrow(
            () -> new IllegalArgumentException("Unsupported academic subject: " + subject));
  }

  public record ExamStructureDefaults(
      int durationMinutes,
      int totalPoints,
      int questionCount,
      String questionType,
      List<String> examLanguages) {}
}
