package com.yukcsca.assessment.domain;

/**
 * Pure pilot checkpoint pass rule: all items correct and no STRONG assistance on the session (D-10
 * / ALL_CORRECT_NO_STRONG_ASSISTANCE).
 */
public final class CheckpointPassEvaluator {
  private CheckpointPassEvaluator() {}

  public static boolean passes(boolean allCorrect, boolean strongAssistanceUsed) {
    return allCorrect && !strongAssistanceUsed;
  }

  public static boolean revalidationPasses(boolean correct, boolean anyAssistanceUsed) {
    return correct && !anyAssistanceUsed;
  }
}
