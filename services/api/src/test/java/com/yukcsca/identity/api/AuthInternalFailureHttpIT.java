package com.yukcsca.identity.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.identity.application.AccessTokenService;
import com.yukcsca.identity.application.GoogleIdentity;
import com.yukcsca.identity.application.GoogleTokenVerifier;
import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.infrastructure.AuthIdentityRepository;
import com.yukcsca.identity.infrastructure.AuthSessionRepository;
import com.yukcsca.identity.infrastructure.SecurityEventRepository;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
import com.yukcsca.support.PostgresIntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class AuthInternalFailureHttpIT extends PostgresIntegrationTestSupport {
  private static final String VALID_CREDENTIAL = "valid-google-credential-value";

  @Autowired MockMvc mvc;
  @Autowired SecurityEventRepository securityEvents;
  @Autowired AuthSessionRepository sessions;
  @Autowired AuthIdentityRepository identities;
  @Autowired UserAccountRepository users;

  @MockitoBean GoogleTokenVerifier googleTokenVerifier;
  @MockitoBean AccessTokenService accessTokenService;

  @BeforeEach
  void clearDatabase() {
    securityEvents.deleteAll();
    sessions.deleteAll();
    identities.deleteAll();
    users.deleteAll();
  }

  @Test
  void accessTokenFailureReturnsSafeServerErrorWithoutIssuingSession() throws Exception {
    when(googleTokenVerifier.verify(VALID_CREDENTIAL))
        .thenReturn(
            new GoogleIdentity(
                "internal-failure-student", "internal-failure@example.com", "Student", null));
    when(accessTokenService.issue(any(UserAccount.class)))
        .thenThrow(new IllegalStateException("controlled access-token failure"));

    mvc.perform(
            post("/api/v1/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"credential\":\"" + VALID_CREDENTIAL + "\"}"))
        .andExpect(status().isInternalServerError())
        .andExpect(cookie().doesNotExist("yukcsca_refresh"))
        .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));

    assertThat(sessions.count()).isZero();
    assertThat(securityEvents.countByEventType(SecurityEventType.GOOGLE_LOGIN_SUCCEEDED)).isZero();
  }
}
