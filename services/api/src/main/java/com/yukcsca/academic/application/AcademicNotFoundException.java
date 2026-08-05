package com.yukcsca.academic.application;

public class AcademicNotFoundException extends RuntimeException {
  public AcademicNotFoundException(String resource) {
    super(resource + " was not found.");
  }
}
