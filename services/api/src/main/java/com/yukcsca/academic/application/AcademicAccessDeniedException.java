package com.yukcsca.academic.application;

public class AcademicAccessDeniedException extends RuntimeException {
  public AcademicAccessDeniedException() {
    super("The authenticated account cannot access academic administration.");
  }
}
