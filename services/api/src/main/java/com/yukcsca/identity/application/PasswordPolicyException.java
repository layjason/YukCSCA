package com.yukcsca.identity.application;

public class PasswordPolicyException extends RuntimeException {
  public PasswordPolicyException() {
    super("Password does not satisfy the credential policy.");
  }
}
