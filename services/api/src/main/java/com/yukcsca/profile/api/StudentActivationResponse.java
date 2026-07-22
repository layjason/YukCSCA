package com.yukcsca.profile.api;

import com.yukcsca.identity.api.AuthResponse;

public record StudentActivationResponse(
    StudentProfileResponse profile, AuthResponse authentication) {
  @Override
  public String toString() {
    return "StudentActivationResponse[profile=<redacted>, authentication=<redacted>]";
  }
}
