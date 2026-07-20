package com.yukcsca.identity.api;

public record AuthResponse(
    String accessToken, String tokenType, long expiresInSeconds, CurrentUserResponse user) {
  @Override
  public String toString() {
    return "AuthResponse[accessToken=<redacted>, tokenType="
        + tokenType
        + ", expiresInSeconds="
        + expiresInSeconds
        + ", user="
        + user
        + "]";
  }
}
