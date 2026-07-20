package com.yukcsca.identity.application;

public class AuthConflictException extends RuntimeException {
  public AuthConflictException(String message) {
    super(message);
  }
}
