package com.yukcsca.assessment.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class CheckpointPassEvaluatorTest {
  @ParameterizedTest
  @CsvSource({
    "true, false, true",
    "true, true, false",
    "false, false, false",
    "false, true, false"
  })
  void checkpointPassRequiresAllCorrectAndNoStrong(
      boolean allCorrect, boolean strongUsed, boolean expected) {
    assertThat(CheckpointPassEvaluator.passes(allCorrect, strongUsed)).isEqualTo(expected);
  }

  @Test
  void revalidationPassRequiresCorrectAndZeroAssistance() {
    assertThat(CheckpointPassEvaluator.revalidationPasses(true, false)).isTrue();
    assertThat(CheckpointPassEvaluator.revalidationPasses(true, true)).isFalse();
    assertThat(CheckpointPassEvaluator.revalidationPasses(false, false)).isFalse();
  }
}
