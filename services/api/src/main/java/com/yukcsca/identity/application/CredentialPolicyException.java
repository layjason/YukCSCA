package com.yukcsca.identity.application;

public class CredentialPolicyException extends RuntimeException {
  public CredentialPolicyException() {
    super("The current Terms and Privacy Notice must be reviewed again.");
  }
}
