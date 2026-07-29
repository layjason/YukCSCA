package com.yukcsca.identity.application;

public class CredentialVerificationException extends RuntimeException {
  public CredentialVerificationException() {
    super("Verification could not be completed. Request a new verification link.");
  }
}
