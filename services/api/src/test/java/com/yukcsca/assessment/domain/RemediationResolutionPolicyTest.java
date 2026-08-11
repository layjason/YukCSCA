package com.yukcsca.assessment.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.assessment.domain.RemediationResolutionPolicy.Candidate;
import com.yukcsca.assessment.domain.RemediationResolutionPolicy.QuestionCandidate;
import com.yukcsca.assessment.domain.RemediationResolutionPolicy.ResourceRef;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RemediationResolutionPolicyTest {
  @Test
  void prefersExplicitRemediationThenObjectiveThenOutlineThenLesson() {
    UUID explicit = UUID.randomUUID();
    UUID byObjective = UUID.randomUUID();
    UUID byOutline = UUID.randomUUID();
    UUID lesson = UUID.randomUUID();
    UUID objective = UUID.randomUUID();
    UUID outline = UUID.randomUUID();

    List<Candidate> candidates =
        RemediationResolutionPolicy.resolve(
            List.of(explicit),
            Set.of(objective),
            Set.of(outline),
            List.of(
                new ResourceRef(explicit, "REMEDIATION", Set.of(), Set.of()),
                new ResourceRef(byObjective, "REMEDIATION", Set.of(objective), Set.of()),
                new ResourceRef(byOutline, "REMEDIATION", Set.of(), Set.of(outline)),
                new ResourceRef(lesson, "LESSON", Set.of(objective), Set.of())));

    assertThat(candidates)
        .extracting(Candidate::resourceId)
        .containsExactly(explicit, byObjective, byOutline);
    assertThat(candidates.getFirst().preferred()).isTrue();
  }

  @Test
  void fallsBackToLessonWhenNoRemediation() {
    UUID lesson = UUID.randomUUID();
    UUID objective = UUID.randomUUID();
    List<Candidate> candidates =
        RemediationResolutionPolicy.resolve(
            List.of(),
            Set.of(objective),
            Set.of(),
            List.of(new ResourceRef(lesson, "LESSON", Set.of(objective), Set.of())));
    assertThat(candidates).hasSize(1);
    assertThat(candidates.getFirst().kind()).isEqualTo("LESSON");
  }

  @Test
  void preferAlternateQuestionSameObjectiveAndLanguage() {
    UUID original = UUID.randomUUID();
    UUID alternate = UUID.randomUUID();
    UUID objective = UUID.randomUUID();
    UUID selected =
        RemediationResolutionPolicy.preferAlternateQuestion(
            original,
            "en",
            Set.of(objective),
            List.of(
                new QuestionCandidate(original, "en", Set.of(objective)),
                new QuestionCandidate(alternate, "en", Set.of(objective)),
                new QuestionCandidate(UUID.randomUUID(), "zh-CN", Set.of(objective))));
    assertThat(selected).isEqualTo(alternate);
  }

  @Test
  void fallsBackToOriginalWhenNoAlternate() {
    UUID original = UUID.randomUUID();
    UUID objective = UUID.randomUUID();
    UUID selected =
        RemediationResolutionPolicy.preferAlternateQuestion(
            original,
            "en",
            Set.of(objective),
            List.of(new QuestionCandidate(original, "en", Set.of(objective))));
    assertThat(selected).isEqualTo(original);
  }
}
