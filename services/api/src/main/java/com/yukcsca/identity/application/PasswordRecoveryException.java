package com.yukcsca.identity.application;

public class PasswordRecoveryException extends RuntimeException {
  public PasswordRecoveryException() {
    super("Password recovery could not be completed. Request a new recovery link.");
  }
}
