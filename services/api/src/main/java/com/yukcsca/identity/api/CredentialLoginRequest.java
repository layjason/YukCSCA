package com.yukcsca.identity.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CredentialLoginRequest(
    @NotBlank @Email @Size(max = 320) String email, @NotBlank @Size(max = 256) String password) {
  @Override
  public String toString() {
    return "CredentialLoginRequest[credentials=<redacted>]";
  }
}
