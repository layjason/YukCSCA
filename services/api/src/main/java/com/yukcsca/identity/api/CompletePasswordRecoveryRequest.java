package com.yukcsca.identity.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompletePasswordRecoveryRequest(
    @NotBlank @Size(min = 32, max = 512) String token, @NotBlank @Size(max = 256) String password) {
  @Override
  public String toString() {
    return "CompletePasswordRecoveryRequest[sensitiveFields=<redacted>]";
  }
}
