package com.yukcsca.identity.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleLoginRequest(@NotBlank @Size(min = 20, max = 10000) String credential) {
  @Override
  public String toString() {
    return "GoogleLoginRequest[credential=<redacted>]";
  }
}
