package com.yukcsca.identity.api;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompleteCredentialVerificationRequest(
    @NotBlank @Size(min = 32, max = 512) String token,
    @NotBlank @Size(max = 256) String password,
    @NotBlank @Size(max = 100) String termsVersion,
    @NotBlank @Size(max = 100) String privacyNoticeVersion,
    @AssertTrue boolean termsAccepted,
    @AssertTrue boolean privacyNoticeAcknowledged) {
  @Override
  public String toString() {
    return "CompleteCredentialVerificationRequest[sensitiveFields=<redacted>]";
  }
}
