package com.yukcsca.profile.application;

import java.util.List;

public class ProfileValidationException extends RuntimeException {
  private final List<ProfileViolation> violations;

  public ProfileValidationException(List<ProfileViolation> violations) {
    super("Student profile validation failed.");
    this.violations = List.copyOf(violations);
  }

  public List<ProfileViolation> violations() {
    return violations;
  }
}
