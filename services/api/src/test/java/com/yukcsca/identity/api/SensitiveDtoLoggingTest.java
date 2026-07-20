package com.yukcsca.identity.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.identity.domain.UserRole;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SensitiveDtoLoggingTest {
  @Test
  void redactsGoogleCredentialFromStringRepresentation() {
    var request = new GoogleLoginRequest("google-credential-that-must-not-be-logged");

    assertThat(request.toString())
        .isEqualTo("GoogleLoginRequest[credential=<redacted>]")
        .doesNotContain(request.credential());
  }

  @Test
  void redactsAccessTokenFromStringRepresentation() {
    var user =
        new CurrentUserResponse(
            UUID.randomUUID(), "student@example.com", "Student", null, UserRole.UNASSIGNED, false);
    var response = new AuthResponse("access-token-that-must-not-be-logged", "Bearer", 900, user);

    assertThat(response.toString())
        .contains("accessToken=<redacted>", "tokenType=Bearer", "expiresInSeconds=900")
        .doesNotContain(response.accessToken());
  }
}
