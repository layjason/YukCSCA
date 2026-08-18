package com.yukcsca.academic.application;

import java.util.List;

public class TerminologyValidationException extends RuntimeException {
  private final List<TerminologyViolation> violations;

  public TerminologyValidationException(List<TerminologyViolation> violations) {
    super("Terminology request validation failed.");
    this.violations = List.copyOf(violations);
  }

  public List<TerminologyViolation> violations() {
    return violations;
  }
}
