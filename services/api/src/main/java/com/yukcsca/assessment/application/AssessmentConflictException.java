package com.yukcsca.assessment.application;

public class AssessmentConflictException extends RuntimeException {
  private final String code;
  private final String lockReason;

  public AssessmentConflictException(String code, String message) {
    this(code, message, null);
  }

  public AssessmentConflictException(String code, String message, String lockReason) {
    super(message);
    this.code = code;
    this.lockReason = lockReason;
  }

  public String code() {
    return code;
  }

  public String lockReason() {
    return lockReason;
  }
}
