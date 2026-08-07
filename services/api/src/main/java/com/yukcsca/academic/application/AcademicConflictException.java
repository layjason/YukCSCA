package com.yukcsca.academic.application;

public class AcademicConflictException extends RuntimeException {
  private final String code;

  public AcademicConflictException(String code, String message) {
    super(message);
    this.code = code;
  }

  public String code() {
    return code;
  }
}
