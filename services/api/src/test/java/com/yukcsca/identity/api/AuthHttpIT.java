package com.yukcsca.identity.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.identity.application.GoogleIdentity;
import com.yukcsca.identity.application.GoogleTokenVerifier;
import com.yukcsca.identity.application.InvalidCredentialException;
import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.infrastructure.AuthIdentityRepository;
import com.yukcsca.identity.infrastructure.AuthSessionRepository;
import com.yukcsca.identity.infrastructure.SecurityEventRepository;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
import com.yukcsca.support.PostgresIntegrationTestSupport;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class AuthHttpIT extends PostgresIntegrationTestSupport {
  private static final String VALID_CREDENTIAL = "valid-google-credential-value";

  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired SecurityEventRepository securityEvents;
  @Autowired AuthSessionRepository sessions;
  @Autowired AuthIdentityRepository identities;
  @Autowired UserAccountRepository users;

  @MockitoBean GoogleTokenVerifier googleTokenVerifier;

  @BeforeEach
  void clearDatabase() {
    securityEvents.deleteAll();
    sessions.deleteAll();
    identities.deleteAll();
    users.deleteAll();
  }

  @Test
  void googleLoginSetsSecureCookieAndReturnsYukcscaCredentials() throws Exception {
    stubValidGoogleIdentity("student-1", "student@example.com");

    MvcResult result =
        login("10.0.0.1")
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")))
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://app.test"))
            .andExpect(cookie().httpOnly("yukcsca_refresh", true))
            .andExpect(cookie().secure("yukcsca_refresh", true))
            .andExpect(cookie().path("yukcsca_refresh", "/api/v1/auth"))
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.user.email").value("student@example.com"))
            .andReturn();

    assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("SameSite=Lax");
    assertThat(securityEvents.countByEventType(SecurityEventType.GOOGLE_LOGIN_SUCCEEDED))
        .isEqualTo(1);
  }

  @Test
  void invalidGoogleCredentialReturnsProblemAndRecordsSecurityEvent() throws Exception {
    when(googleTokenVerifier.verify(VALID_CREDENTIAL))
        .thenThrow(new InvalidCredentialException("Google credential is invalid or expired."));

    login("10.0.0.2")
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIAL"));

    assertThat(securityEvents.countByEventType(SecurityEventType.GOOGLE_LOGIN_REJECTED))
        .isEqualTo(1);
  }

  @Test
  void refreshRotatesCookieAndReplayedTokenRevokesItsFamily() throws Exception {
    stubValidGoogleIdentity("student-3", "refresh@example.com");
    Cookie original = login("10.0.0.3").andReturn().getResponse().getCookie("yukcsca_refresh");
    assertThat(original).isNotNull();

    MvcResult refreshed =
        mvc.perform(
                post("/api/v1/auth/refresh")
                    .cookie(original)
                    .with(request -> remote(request, "10.0.0.31")))
            .andExpect(status().isOk())
            .andExpect(cookie().exists("yukcsca_refresh"))
            .andReturn();
    Cookie rotated = refreshed.getResponse().getCookie("yukcsca_refresh");
    assertThat(rotated).isNotNull();
    assertThat(rotated.getValue()).isNotEqualTo(original.getValue());

    mvc.perform(
            post("/api/v1/auth/refresh")
                .cookie(original)
                .with(request -> remote(request, "10.0.0.32")))
        .andExpect(status().isUnauthorized())
        .andExpect(cookie().maxAge("yukcsca_refresh", 0));

    assertThat(securityEvents.countByEventType(SecurityEventType.REFRESH_REUSE_DETECTED))
        .isEqualTo(1);
  }

  @Test
  void currentUserRequiresAndAcceptsYukcscaBearerToken() throws Exception {
    stubValidGoogleIdentity("student-4", "me@example.com");
    MvcResult login = login("10.0.0.4").andReturn();
    JsonNode body = json.readTree(login.getResponse().getContentAsString());

    mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    mvc.perform(
            get("/api/v1/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + body.get("accessToken").asText()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("me@example.com"));
  }

  @Test
  void logoutRevokesSessionAndExpiresCookie() throws Exception {
    stubValidGoogleIdentity("student-5", "logout@example.com");
    Cookie refresh = login("10.0.0.5").andReturn().getResponse().getCookie("yukcsca_refresh");

    mvc.perform(post("/api/v1/auth/logout").cookie(refresh))
        .andExpect(status().isNoContent())
        .andExpect(cookie().maxAge("yukcsca_refresh", 0));

    mvc.perform(
            post("/api/v1/auth/refresh")
                .cookie(refresh)
                .with(request -> remote(request, "10.0.0.51")))
        .andExpect(status().isUnauthorized());
    assertThat(securityEvents.countByEventType(SecurityEventType.LOGOUT)).isEqualTo(1);
  }

  @Test
  void corsAllowsOnlyConfiguredWebOrigin() throws Exception {
    mvc.perform(
            options("/api/v1/auth/google")
                .header(HttpHeaders.ORIGIN, "https://app.test")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://app.test"))
        .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));

    mvc.perform(
            options("/api/v1/auth/google")
                .header(HttpHeaders.ORIGIN, "https://attacker.example")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
        .andExpect(status().isForbidden())
        .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
  }

  @Test
  void authenticationRateLimitReturnsProblemAndRetryAfter() throws Exception {
    when(googleTokenVerifier.verify(VALID_CREDENTIAL))
        .thenThrow(new InvalidCredentialException("invalid"));

    for (int attempt = 0; attempt < 3; attempt++) {
      login("10.0.0.7").andExpect(status().isUnauthorized());
    }
    login("10.0.0.7")
        .andExpect(status().isTooManyRequests())
        .andExpect(header().string(HttpHeaders.RETRY_AFTER, "60"))
        .andExpect(jsonPath("$.code").value("AUTH_RATE_LIMITED"));

    assertThat(securityEvents.countByEventType(SecurityEventType.AUTH_RATE_LIMITED)).isEqualTo(1);
  }

  private ResultActions login(String remoteAddress) throws Exception {
    return mvc.perform(
        post("/api/v1/auth/google")
            .contentType(MediaType.APPLICATION_JSON)
            .header(HttpHeaders.ORIGIN, "https://app.test")
            .content("{\"credential\":\"" + VALID_CREDENTIAL + "\"}")
            .with(request -> remote(request, remoteAddress)));
  }

  private void stubValidGoogleIdentity(String subject, String email) {
    when(googleTokenVerifier.verify(VALID_CREDENTIAL))
        .thenReturn(new GoogleIdentity(subject, email, "Student", null));
  }

  private static MockHttpServletRequest remote(
      MockHttpServletRequest request, String remoteAddress) {
    request.setRemoteAddr(remoteAddress);
    return request;
  }
}
