package com.yukcsca.academic.application;

public class InvalidStudentAcademicRequestException extends RuntimeException {
  public InvalidStudentAcademicRequestException(String message) {
    super(message);
  }
}
