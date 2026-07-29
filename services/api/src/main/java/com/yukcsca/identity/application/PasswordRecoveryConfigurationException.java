package com.yukcsca.identity.application;

public class PasswordRecoveryConfigurationException extends RuntimeException {
  public PasswordRecoveryConfigurationException() {
    super("Password recovery is temporarily unavailable.");
  }
}
