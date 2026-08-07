package com.yukcsca.identity.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.identity.application.GoogleIdentity;
import com.yukcsca.identity.application.GoogleTokenVerifier;
import com.yukcsca.identity.application.VerificationEmail;
import com.yukcsca.identity.application.VerificationEmailDispatcher;
import com.yukcsca.identity.application.VerificationEmailSender;
import com.yukcsca.identity.domain.CredentialEmailOutboxStatus;
import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.domain.UserRole;
import com.yukcsca.identity.infrastructure.AuthIdentityRepository;
import com.yukcsca.identity.infrastructure.AuthSessionRepository;
import com.yukcsca.identity.infrastructure.CredentialAuthenticatorRepository;
import com.yukcsca.identity.infrastructure.CredentialEmailOutboxRepository;
import com.yukcsca.identity.infrastructure.EmailVerificationClaimRepository;
import com.yukcsca.identity.infrastructure.PolicyAcceptanceRepository;
import com.yukcsca.identity.infrastructure.SecurityEventRepository;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
import com.yukcsca.support.PostgresTestConfiguration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("test")
@TestPropertySource(properties = "yukcsca.auth.rate-limit.requests=100")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class CredentialAuthHttpIT {
  @Autowired MockMvc mvc;
  @Autowired VerificationEmailDispatcher emailDispatcher;
  @Autowired EmailVerificationClaimRepository claims;
  @Autowired CredentialEmailOutboxRepository outbox;
  @Autowired CredentialAuthenticatorRepository authenticators;
  @Autowired PolicyAcceptanceRepository policyAcceptances;
  @Autowired SecurityEventRepository securityEvents;
  @Autowired AuthSessionRepository sessions;
  @Autowired AuthIdentityRepository identities;
  @Autowired UserAccountRepository users;
  @Autowired JdbcTemplate jdbc;

  @MockitoBean VerificationEmailSender emailSender;
  @MockitoBean GoogleTokenVerifier googleTokenVerifier;

  @BeforeEach
  void clearDatabase() {
    securityEvents.deleteAll();
    sessions.deleteAll();
    policyAcceptances.deleteAll();
    authenticators.deleteAll();
    outbox.deleteAll();
    claims.deleteAll();
    identities.deleteAll();
    users.deleteAll();
  }

  @Test
  void registrationVerificationAndSeparateLoginCompleteTheCredentialJourney() throws Exception {
    mvc.perform(
            post("/api/v1/auth/credential-registrations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"New.User@Example.COM\"}"))
        .andExpect(status().isAccepted());

    assertThat(users.count()).isZero();
    assertThat(authenticators.count()).isZero();
    assertThat(claims.count()).isEqualTo(1);
    assertThat(outbox.count()).isEqualTo(1);

    AtomicReference<VerificationEmail> delivered = new AtomicReference<>();
    org.mockito.Mockito.doAnswer(
            invocation -> {
              delivered.set(invocation.getArgument(0));
              return null;
            })
        .when(emailSender)
        .send(any());
    emailDispatcher.dispatchDue();
    verify(emailSender).send(any());

    VerificationEmail email = delivered.get();
    assertThat(email.recipient()).isEqualTo("new.user@example.com");
    assertThat(email.verificationUrl()).startsWith("https://app.test/verify-email#token=");
    assertThat(email.verificationUrl()).contains("&email=new.user%40example.com");
    String token =
        email
            .verificationUrl()
            .substring(email.verificationUrl().indexOf("#token=") + 7)
            .split("&", 2)[0];

    mvc.perform(
            post("/api/v1/auth/credential-verifications/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, "marble orchard lantern river")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.outcome").value("CREDENTIAL_ACCOUNT_CREATED"));

    assertThat(users.count()).isEqualTo(1);
    assertThat(users.findByEmailIgnoreCase("new.user@example.com").orElseThrow().getDisplayName())
        .isNull();
    assertThat(authenticators.count()).isEqualTo(1);
    assertThat(policyAcceptances.count()).isEqualTo(1);
    assertThat(sessions.count()).isZero();

    mvc.perform(
            post("/api/v1/auth/credentials/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"NEW.USER@example.com","password":"marble orchard lantern river"}
                    """))
        .andExpect(status().isOk())
        .andExpect(cookie().httpOnly("yukcsca_refresh", true))
        .andExpect(jsonPath("$.user.displayName").doesNotExist())
        .andExpect(jsonPath("$.user.role").value("UNASSIGNED"));
  }

  @Test
  void configuredCredentialAccountBecomesAdminOnlyOnSuccessfulLogin() throws Exception {
    String token = registerAndDeliver("admin@example.com");
    mvc.perform(
            post("/api/v1/auth/credential-verifications/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, "violet mountain library compass")))
        .andExpect(status().isOk());
    assertThat(users.findByEmailIgnoreCase("admin@example.com").orElseThrow().getRole())
        .isEqualTo(UserRole.UNASSIGNED);

    mvc.perform(
            post("/api/v1/auth/credentials/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"ADMIN@example.com","password":"violet mountain library compass"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.role").value("ADMIN"));

    assertThat(users.findByEmailIgnoreCase("admin@example.com").orElseThrow().getRole())
        .isEqualTo(UserRole.ADMIN);
    assertThat(securityEvents.countByEventType(SecurityEventType.FIRST_ADMIN_PROVISIONED))
        .isEqualTo(1);
  }

  @Test
  void completionRejectsReplayAndLoginUsesOneEnumerationSafeFailure() throws Exception {
    String token = registerAndDeliver("replay@example.com");

    mvc.perform(
            post("/api/v1/auth/credential-verifications/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, "another correct horse battery")))
        .andExpect(status().isOk());

    mvc.perform(
            post("/api/v1/auth/credential-verifications/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, "another correct horse battery")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VERIFICATION_INVALID"));

    mvc.perform(
            post("/api/v1/auth/credentials/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"unknown@example.com","password":"another correct horse battery"}
                    """))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIAL"));

    mvc.perform(
            post("/api/v1/auth/credentials/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"replay@example.com","password":"wrong password value"}
                    """))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIAL"));
  }

  @Test
  void registrationIsGenericAndDoesNotDuplicateAnActiveClaim() throws Exception {
    for (int attempt = 0; attempt < 2; attempt++) {
      mvc.perform(
              post("/api/v1/auth/credential-registrations")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"email\":\"duplicate@example.com\"}"))
          .andExpect(status().isAccepted());
    }

    assertThat(claims.count()).isEqualTo(1);
    assertThat(outbox.count()).isEqualTo(1);
    assertThat(users.count()).isZero();

    mvc.perform(
            post("/api/v1/auth/credential-registrations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"not-an-email\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  @Test
  void validClaimForGoogleOwnedEmailDoesNotCreateOrLinkACredential() throws Exception {
    String token = registerAndDeliver("google-owned@example.com");
    when(googleTokenVerifier.verify("valid-google-credential-value"))
        .thenReturn(
            new GoogleIdentity(
                "google-owned-subject", "google-owned@example.com", "Google User", null));
    mvc.perform(
            post("/api/v1/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"credential\":\"valid-google-credential-value\"}"))
        .andExpect(status().isOk());

    mvc.perform(
            post("/api/v1/auth/credential-verifications/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, "violet mountain library compass")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.outcome").value("SIGN_IN_WITH_GOOGLE"));

    assertThat(users.count()).isEqualTo(1);
    assertThat(authenticators.count()).isZero();
    assertThat(policyAcceptances.count()).isZero();
  }

  @Test
  void policyAndPasswordFailuresDoNotConsumeTheClaim() throws Exception {
    String token = registerAndDeliver("policy@example.com");
    String stalePolicyRequest =
        completeRequest(token, "violet mountain library compass")
            .replace("\"TERMS_V1\"", "\"TERMS_OLD\"");

    mvc.perform(
            post("/api/v1/auth/credential-verifications/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(stalePolicyRequest))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("POLICY_VERSION_STALE"));
    mvc.perform(
            post("/api/v1/auth/credential-verifications/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, "password password")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("PASSWORD_POLICY_REJECTED"));

    mvc.perform(
            post("/api/v1/auth/credential-verifications/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, "violet mountain library compass")))
        .andExpect(status().isOk());
    assertThat(users.count()).isEqualTo(1);
  }

  @Test
  void providerFailureLeavesDeliveryQueuedForBoundedRetry() throws Exception {
    doThrow(new IllegalStateException("provider unavailable")).when(emailSender).send(any());
    mvc.perform(
            post("/api/v1/auth/credential-registrations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"retry@example.com\"}"))
        .andExpect(status().isAccepted());

    emailDispatcher.dispatchDue();

    var delivery = outbox.findAll().getFirst();
    assertThat(delivery.getStatus()).isEqualTo(CredentialEmailOutboxStatus.QUEUED);
    assertThat(delivery.getAttemptCount()).isEqualTo(1);
    assertThat(users.count()).isZero();
  }

  @Test
  void resendHonorsCooldownAndSupersedesThePreviousClaim() throws Exception {
    registerAndDeliver("resend@example.com");

    mvc.perform(
            post("/api/v1/auth/credential-verifications/resend")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"resend@example.com\"}"))
        .andExpect(status().isAccepted());
    assertThat(outbox.count()).isEqualTo(1);

    jdbc.update(
        "update email_verification_claim set resend_available_at = now() - interval '1 second' "
            + "where canonical_email = ? and status = 'PENDING'",
        "resend@example.com");
    mvc.perform(
            post("/api/v1/auth/credential-verifications/resend")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"resend@example.com\"}"))
        .andExpect(status().isAccepted());

    assertThat(claims.count()).isEqualTo(2);
    assertThat(outbox.count()).isEqualTo(2);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from email_verification_claim "
                    + "where canonical_email = ? and status = 'PENDING'",
                Integer.class,
                "resend@example.com"))
        .isEqualTo(1);
  }

  @Test
  void expiredClaimAndConcurrentCompletionCreateNoMoreThanOneAccount() throws Exception {
    String expiredToken = registerAndDeliver("expired@example.com");
    jdbc.update(
        "update email_verification_claim set expires_at = now() - interval '1 second' "
            + "where canonical_email = ?",
        "expired@example.com");
    mvc.perform(
            post("/api/v1/auth/credential-verifications/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(expiredToken, "violet mountain library compass")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VERIFICATION_INVALID"));

    String concurrentToken = registerAndDeliver("concurrent@example.com");
    String requestBody = completeRequest(concurrentToken, "silver meadow telescope harbor");
    var first = CompletableFuture.supplyAsync(() -> completeStatus(requestBody));
    var second = CompletableFuture.supplyAsync(() -> completeStatus(requestBody));

    assertThat(java.util.List.of(first.join(), second.join())).containsExactlyInAnyOrder(200, 400);
    assertThat(users.findByEmailIgnoreCase("concurrent@example.com")).isPresent();
    assertThat(authenticators.count()).isEqualTo(1);
  }

  private String registerAndDeliver(String email) throws Exception {
    AtomicReference<VerificationEmail> delivered = new AtomicReference<>();
    org.mockito.Mockito.doAnswer(
            invocation -> {
              delivered.set(invocation.getArgument(0));
              return null;
            })
        .when(emailSender)
        .send(any());
    mvc.perform(
            post("/api/v1/auth/credential-registrations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}"))
        .andExpect(status().isAccepted());
    emailDispatcher.dispatchDue();
    String url = delivered.get().verificationUrl();
    return url.substring(url.indexOf("#token=") + 7).split("&", 2)[0];
  }

  private static String completeRequest(String token, String password) {
    return """
        {
          "token":"%s",
          "password":"%s",
          "termsVersion":"TERMS_V1",
          "privacyNoticeVersion":"PRIVACY_V1",
          "termsAccepted":true,
          "privacyNoticeAcknowledged":true
        }
        """
        .formatted(token, password);
  }

  private int completeStatus(String requestBody) {
    try {
      return mvc.perform(
              post("/api/v1/auth/credential-verifications/complete")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(requestBody))
          .andReturn()
          .getResponse()
          .getStatus();
    } catch (Exception exception) {
      throw new IllegalStateException(exception);
    }
  }
}
