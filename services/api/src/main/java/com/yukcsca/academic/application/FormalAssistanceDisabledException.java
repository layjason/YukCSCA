package com.yukcsca.academic.application;

public class FormalAssistanceDisabledException extends RuntimeException {
  public FormalAssistanceDisabledException() {
    super("Language help and notebook writes are unavailable during a formal mock.");
  }
}
