package com.yukcsca.identity.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.identity.application.PasswordHasher;
import com.yukcsca.identity.application.PasswordPolicy;
import com.yukcsca.identity.application.PasswordRecoveryEmail;
import com.yukcsca.identity.application.PasswordRecoveryEmailDispatcher;
import com.yukcsca.identity.application.PasswordRecoveryEmailSender;
import com.yukcsca.identity.application.SessionService;
import com.yukcsca.identity.domain.CredentialAuthenticator;
import com.yukcsca.identity.domain.PasswordRecoveryEmailOutboxStatus;
import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.infrastructure.AuthIdentityRepository;
import com.yukcsca.identity.infrastructure.AuthSessionRepository;
import com.yukcsca.identity.infrastructure.CredentialAuthenticatorRepository;
import com.yukcsca.identity.infrastructure.CredentialEmailOutboxRepository;
import com.yukcsca.identity.infrastructure.EmailVerificationClaimRepository;
import com.yukcsca.identity.infrastructure.PasswordRecoveryClaimRepository;
import com.yukcsca.identity.infrastructure.PasswordRecoveryEmailOutboxRepository;
import com.yukcsca.identity.infrastructure.PolicyAcceptanceRepository;
import com.yukcsca.identity.infrastructure.SecurityEventRepository;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
import com.yukcsca.support.PostgresTestConfiguration;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
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
class PasswordRecoveryHttpIT {
  private static final String OLD_PASSWORD = "violet mountain library compass";
  private static final String NEW_PASSWORD = "silver meadow telescope harbor";

  @Autowired MockMvc mvc;
  @Autowired PasswordRecoveryEmailDispatcher emailDispatcher;
  @Autowired PasswordRecoveryClaimRepository recoveryClaims;
  @Autowired PasswordRecoveryEmailOutboxRepository recoveryOutbox;
  @Autowired CredentialAuthenticatorRepository authenticators;
  @Autowired PasswordHasher passwordHasher;
  @Autowired PasswordPolicy passwordPolicy;
  @Autowired SessionService sessionService;
  @Autowired AuthSessionRepository sessions;
  @Autowired SecurityEventRepository securityEvents;
  @Autowired PolicyAcceptanceRepository policyAcceptances;
  @Autowired CredentialEmailOutboxRepository credentialOutbox;
  @Autowired EmailVerificationClaimRepository verificationClaims;
  @Autowired AuthIdentityRepository identities;
  @Autowired UserAccountRepository users;
  @Autowired JdbcTemplate jdbc;

  @MockitoBean PasswordRecoveryEmailSender emailSender;

  @BeforeEach
  void clearDatabase() {
    reset(emailSender);
    securityEvents.deleteAll();
    sessions.deleteAll();
    recoveryOutbox.deleteAll();
    recoveryClaims.deleteAll();
    policyAcceptances.deleteAll();
    authenticators.deleteAll();
    credentialOutbox.deleteAll();
    verificationClaims.deleteAll();
    identities.deleteAll();
    users.deleteAll();
  }

  @Test
  void requestIsGenericAndCreatesDeliveryOnlyForAnEligibleCredentialAccount() throws Exception {
    createCredentialAccount("eligible@example.com", OLD_PASSWORD);
    users.saveAndFlush(
        UserAccount.createGoogleUser(
            "google-only@example.com", "Google User", null, Instant.now()));

    for (String email :
        List.of("eligible@example.com", "unknown@example.com", "google-only@example.com")) {
      mvc.perform(
              post("/api/v1/auth/password-recovery-requests")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"email\":\"" + email + "\"}"))
          .andExpect(status().isAccepted())
          .andExpect(header().string("Cache-Control", "no-store"));
    }

    assertThat(recoveryClaims.count()).isEqualTo(1);
    assertThat(recoveryOutbox.count()).isEqualTo(1);
    assertThat(securityEvents.countByEventType(SecurityEventType.PASSWORD_RECOVERY_REQUESTED))
        .isEqualTo(3);

    mvc.perform(
            post("/api/v1/auth/password-recovery-requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"not-an-email\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  @Test
  void validRecoveryReplacesPasswordRevokesAllSessionsAndRejectsReplay() throws Exception {
    UserAccount account = createCredentialAccount("recover@example.com", OLD_PASSWORD);
    SessionService.SessionToken firstSession = sessionService.create(account);
    sessionService.create(account);
    String token = requestAndDeliver("recover@example.com");

    mvc.perform(
            post("/api/v1/auth/password-recoveries/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, NEW_PASSWORD)))
        .andExpect(status().isNoContent())
        .andExpect(header().string("Cache-Control", "no-store"));

    assertThat(sessions.findAll()).allMatch(session -> session.isRevoked());
    assertThat(securityEvents.countByEventType(SecurityEventType.PASSWORD_RECOVERY_SUCCEEDED))
        .isEqualTo(1);

    credentialLogin("recover@example.com", OLD_PASSWORD, 401);
    credentialLogin("recover@example.com", NEW_PASSWORD, 200);
    mvc.perform(
            post("/api/v1/auth/refresh")
                .cookie(new Cookie("yukcsca_refresh", firstSession.rawToken())))
        .andExpect(status().isUnauthorized());

    mvc.perform(
            post("/api/v1/auth/password-recoveries/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, NEW_PASSWORD)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("RECOVERY_INVALID"));
  }

  @Test
  void passwordPolicyAndExpiredClaimLeaveTheExistingPasswordUnchanged() throws Exception {
    createCredentialAccount("expired@example.com", OLD_PASSWORD);
    String token = requestAndDeliver("expired@example.com");

    mvc.perform(
            post("/api/v1/auth/password-recoveries/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, "password password")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("PASSWORD_POLICY_REJECTED"));

    jdbc.update(
        "update password_recovery_claim set expires_at = now() - interval '1 second' "
            + "where canonical_email = ?",
        "expired@example.com");
    mvc.perform(
            post("/api/v1/auth/password-recoveries/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, NEW_PASSWORD)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("RECOVERY_INVALID"));

    assertThat(securityEvents.countByEventType(SecurityEventType.PASSWORD_RECOVERY_REJECTED))
        .isEqualTo(2);
    credentialLogin("expired@example.com", OLD_PASSWORD, 200);
  }

  @Test
  void cooldownPreventsDuplicateDeliveryAndLaterRequestSupersedesTheOldClaim() throws Exception {
    createCredentialAccount("supersede@example.com", OLD_PASSWORD);
    String oldToken = requestAndDeliver("supersede@example.com");

    requestRecovery("supersede@example.com", 202);
    assertThat(recoveryClaims.count()).isEqualTo(1);
    assertThat(recoveryOutbox.count()).isEqualTo(1);

    jdbc.update(
        "update password_recovery_claim "
            + "set resend_available_at = now() - interval '1 second' "
            + "where canonical_email = ? and status = 'PENDING'",
        "supersede@example.com");
    AtomicReference<PasswordRecoveryEmail> delivered = captureDelivery();
    requestRecovery("supersede@example.com", 202);
    emailDispatcher.dispatchDue();

    assertThat(recoveryClaims.count()).isEqualTo(2);
    assertThat(recoveryOutbox.count()).isEqualTo(2);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from password_recovery_claim "
                    + "where canonical_email = ? and status = 'PENDING'",
                Integer.class,
                "supersede@example.com"))
        .isEqualTo(1);
    String newToken = tokenFrom(delivered.get().recoveryUrl());

    completeRecovery(oldToken, NEW_PASSWORD, 400);
    completeRecovery(newToken, NEW_PASSWORD, 204);
  }

  @Test
  void providerFailureLeavesRecoveryDeliveryQueuedForBoundedRetry() throws Exception {
    createCredentialAccount("retry@example.com", OLD_PASSWORD);
    doThrow(new IllegalStateException("provider unavailable")).when(emailSender).send(any());

    requestRecovery("retry@example.com", 202);
    emailDispatcher.dispatchDue();

    var delivery = recoveryOutbox.findAll().getFirst();
    assertThat(delivery.getStatus()).isEqualTo(PasswordRecoveryEmailOutboxStatus.QUEUED);
    assertThat(delivery.getAttemptCount()).isEqualTo(1);
    assertThat(securityEvents.countByEventType(SecurityEventType.PASSWORD_RECOVERY_DELIVERY_FAILED))
        .isEqualTo(1);
  }

  @Test
  void concurrentCompletionConsumesTheClaimExactlyOnce() throws Exception {
    createCredentialAccount("concurrent@example.com", OLD_PASSWORD);
    String token = requestAndDeliver("concurrent@example.com");
    String requestBody = completeRequest(token, NEW_PASSWORD);

    var first = CompletableFuture.supplyAsync(() -> completionStatus(requestBody));
    var second = CompletableFuture.supplyAsync(() -> completionStatus(requestBody));

    assertThat(List.of(first.join(), second.join())).containsExactlyInAnyOrder(204, 400);
    credentialLogin("concurrent@example.com", OLD_PASSWORD, 401);
    credentialLogin("concurrent@example.com", NEW_PASSWORD, 200);
  }

  @Test
  void resetSerializesWithOldPasswordLoginSoNoActiveRefreshSessionSurvives() throws Exception {
    createCredentialAccount("race@example.com", OLD_PASSWORD);
    String token = requestAndDeliver("race@example.com");

    var reset =
        CompletableFuture.supplyAsync(() -> completionStatus(completeRequest(token, NEW_PASSWORD)));
    var login =
        CompletableFuture.supplyAsync(
            () -> credentialLoginStatus("race@example.com", OLD_PASSWORD));

    assertThat(reset.join()).isEqualTo(204);
    assertThat(login.join()).isIn(200, 401);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from auth_session "
                    + "where user_id = (select id from user_account where email = ?) "
                    + "and revoked_at is null and expires_at > now()",
                Integer.class,
                "race@example.com"))
        .isZero();
  }

  @Test
  void resetSerializesWithRefreshSoNoRotatedSessionSurvives() throws Exception {
    UserAccount account = createCredentialAccount("refresh-race@example.com", OLD_PASSWORD);
    SessionService.SessionToken activeSession = sessionService.create(account);
    String token = requestAndDeliver("refresh-race@example.com");

    var reset =
        CompletableFuture.supplyAsync(() -> completionStatus(completeRequest(token, NEW_PASSWORD)));
    var refresh = CompletableFuture.supplyAsync(() -> refreshStatus(activeSession.rawToken()));

    assertThat(reset.join()).isEqualTo(204);
    assertThat(refresh.join()).isIn(200, 401);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from auth_session "
                    + "where user_id = ? and revoked_at is null and expires_at > now()",
                Integer.class,
                account.getId()))
        .isZero();
  }

  @Test
  void repeatedUnknownIdentifierRequestsAreBoundedWithoutCreatingState() throws Exception {
    for (int attempt = 0; attempt < 20; attempt++) {
      requestRecovery("bounded-unknown@example.com", 202);
    }

    mvc.perform(
            post("/api/v1/auth/password-recovery-requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"bounded-unknown@example.com\"}"))
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"))
        .andExpect(jsonPath("$.code").value("AUTH_RATE_LIMITED"));
    assertThat(recoveryClaims.count()).isZero();
    assertThat(recoveryOutbox.count()).isZero();
  }

  private UserAccount createCredentialAccount(String email, String password) {
    Instant now = Instant.now();
    UserAccount account = users.saveAndFlush(UserAccount.createCredentialUser(email, now));
    authenticators.saveAndFlush(
        new CredentialAuthenticator(
            account, passwordHasher.hash(passwordPolicy.validateAndNormalize(password)), now));
    return account;
  }

  private String requestAndDeliver(String email) throws Exception {
    AtomicReference<PasswordRecoveryEmail> delivered = captureDelivery();
    requestRecovery(email, 202);
    emailDispatcher.dispatchDue();
    verify(emailSender).send(any());
    assertThat(delivered.get().recipient()).isEqualTo(email);
    assertThat(delivered.get().recoveryUrl())
        .startsWith("https://app.test/reset-password#token=")
        .contains("&email=" + email.replace("@", "%40"));
    return tokenFrom(delivered.get().recoveryUrl());
  }

  private AtomicReference<PasswordRecoveryEmail> captureDelivery() {
    reset(emailSender);
    AtomicReference<PasswordRecoveryEmail> delivered = new AtomicReference<>();
    org.mockito.Mockito.doAnswer(
            invocation -> {
              delivered.set(invocation.getArgument(0));
              return null;
            })
        .when(emailSender)
        .send(any());
    return delivered;
  }

  private void requestRecovery(String email, int expectedStatus) throws Exception {
    mvc.perform(
            post("/api/v1/auth/password-recovery-requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}"))
        .andExpect(status().is(expectedStatus));
  }

  private void completeRecovery(String token, String password, int expectedStatus)
      throws Exception {
    mvc.perform(
            post("/api/v1/auth/password-recoveries/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeRequest(token, password)))
        .andExpect(status().is(expectedStatus));
  }

  private void credentialLogin(String email, String password, int expectedStatus) throws Exception {
    mvc.perform(
            post("/api/v1/auth/credentials/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest(email, password)))
        .andExpect(status().is(expectedStatus));
  }

  private int completionStatus(String requestBody) {
    try {
      return mvc.perform(
              post("/api/v1/auth/password-recoveries/complete")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(requestBody))
          .andReturn()
          .getResponse()
          .getStatus();
    } catch (Exception exception) {
      throw new IllegalStateException(exception);
    }
  }

  private int credentialLoginStatus(String email, String password) {
    try {
      return mvc.perform(
              post("/api/v1/auth/credentials/login")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(loginRequest(email, password)))
          .andReturn()
          .getResponse()
          .getStatus();
    } catch (Exception exception) {
      throw new IllegalStateException(exception);
    }
  }

  private int refreshStatus(String token) {
    try {
      return mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("yukcsca_refresh", token)))
          .andReturn()
          .getResponse()
          .getStatus();
    } catch (Exception exception) {
      throw new IllegalStateException(exception);
    }
  }

  private static String completeRequest(String token, String password) {
    return "{\"token\":\"" + token + "\",\"password\":\"" + password + "\"}";
  }

  private static String loginRequest(String email, String password) {
    return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
  }

  private static String tokenFrom(String recoveryUrl) {
    return recoveryUrl.substring(recoveryUrl.indexOf("#token=") + 7).split("&", 2)[0];
  }
}
