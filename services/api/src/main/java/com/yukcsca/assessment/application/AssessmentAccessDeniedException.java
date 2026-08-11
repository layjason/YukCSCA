package com.yukcsca.assessment.application;

public class AssessmentAccessDeniedException extends RuntimeException {
  public AssessmentAccessDeniedException() {
    super("Assessment access denied.");
  }
}
