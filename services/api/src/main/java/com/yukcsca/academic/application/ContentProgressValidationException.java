package com.yukcsca.academic.application;

import java.util.List;

public class ContentProgressValidationException extends RuntimeException {
  private final List<ContentProgressViolation> violations;

  public ContentProgressValidationException(List<ContentProgressViolation> violations) {
    super("Content progress validation failed.");
    this.violations = List.copyOf(violations);
  }

  public List<ContentProgressViolation> violations() {
    return violations;
  }
}
