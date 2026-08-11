package com.yukcsca.assessment.application;

import java.util.List;

public class AssessmentValidationException extends RuntimeException {
  private final List<AssessmentViolation> violations;

  public AssessmentValidationException(List<AssessmentViolation> violations) {
    super("Assessment validation failed.");
    this.violations = List.copyOf(violations);
  }

  public List<AssessmentViolation> violations() {
    return violations;
  }
}
