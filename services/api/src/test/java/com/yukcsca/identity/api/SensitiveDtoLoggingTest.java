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
        .doesNotContain(response.accessToken(), user.email(), user.displayName());
  }

  @Test
  void redactsEveryCredentialRequestFromStringRepresentation() {
    var start = new StartCredentialRegistrationRequest("private@example.com");
    var resend = new ResendCredentialVerificationRequest("private@example.com");
    var login = new CredentialLoginRequest("private@example.com", "private-password-value");
    var complete =
        new CompleteCredentialVerificationRequest(
            "private-verification-token-value-123456",
            "private-password-value",
            "TERMS_V1",
            "PRIVACY_V1",
            true,
            true);

    assertThat(start.toString()).doesNotContain(start.email());
    assertThat(resend.toString()).doesNotContain(resend.email());
    assertThat(login.toString()).doesNotContain(login.email(), login.password());
    assertThat(complete.toString())
        .doesNotContain(
            complete.token(),
            complete.password(),
            complete.termsVersion(),
            complete.privacyNoticeVersion());
  }
}
