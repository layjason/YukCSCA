package com.yukcsca.identity.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResendCredentialVerificationRequest(@NotBlank @Email @Size(max = 320) String email) {
  @Override
  public String toString() {
    return "ResendCredentialVerificationRequest[email=<redacted>]";
  }
}
