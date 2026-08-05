package com.yukcsca.academic.application;

import java.util.List;

public class AcademicValidationException extends RuntimeException {
  private final List<AcademicViolation> violations;

  public AcademicValidationException(List<AcademicViolation> violations) {
    super("Academic package validation failed.");
    this.violations = List.copyOf(violations);
  }

  public List<AcademicViolation> violations() {
    return violations;
  }
}
