package com.yukcsca.profile.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.identity.application.GoogleIdentity;
import com.yukcsca.identity.application.GoogleTokenVerifier;
import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.domain.UserRole;
import com.yukcsca.identity.infrastructure.AuthIdentityRepository;
import com.yukcsca.identity.infrastructure.AuthSessionRepository;
import com.yukcsca.identity.infrastructure.SecurityEventRepository;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
import com.yukcsca.profile.infrastructure.StudentProfileRepository;
import com.yukcsca.support.PostgresTestConfiguration;
import java.time.Year;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
@Import(PostgresTestConfiguration.class)
class StudentProfileHttpIT {
  private static final ZoneId JAKARTA = ZoneId.of("Asia/Jakarta");
  private static final AtomicInteger LOGIN_SEQUENCE = new AtomicInteger();

  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired StudentProfileRepository profiles;
  @Autowired SecurityEventRepository securityEvents;
  @Autowired AuthSessionRepository sessions;
  @Autowired AuthIdentityRepository identities;
  @Autowired UserAccountRepository users;

  @MockitoBean GoogleTokenVerifier googleTokenVerifier;

  @BeforeEach
  void clearDatabase() {
    profiles.deleteAll();
    securityEvents.deleteAll();
    sessions.deleteAll();
    identities.deleteAll();
    users.deleteAll();
  }

  @Test
  void activatesStudentAtomicallyAndReturnsReplacementAccessState() throws Exception {
    String originalToken = login("activation-success", "success@example.com");

    MvcResult activation =
        activate(originalToken, validRequest(currentYear() - 17))
            .andExpect(status().isCreated())
            .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
            .andExpect(jsonPath("$.profile.preferredName").value("Ayu"))
            .andExpect(jsonPath("$.profile.currentGrade").value("GRADE_11"))
            .andExpect(jsonPath("$.profile.defaultExplanationLanguage").value("id"))
            .andExpect(jsonPath("$.authentication.user.role").value("STUDENT"))
            .andExpect(jsonPath("$.authentication.user.onboardingCompleted").value(true))
            .andReturn();

    JsonNode body = json.readTree(activation.getResponse().getContentAsString());
    String replacementToken = body.get("authentication").get("accessToken").asText();
    assertThat(replacementToken).isNotEqualTo(originalToken);
    assertThat(profiles.count()).isEqualTo(1);
    assertThat(users.findAll())
        .singleElement()
        .extracting(user -> user.getRole())
        .isEqualTo(UserRole.STUDENT);
    assertThat(securityEvents.countByEventType(SecurityEventType.STUDENT_ACTIVATION_SUCCEEDED))
        .isEqualTo(1);

    mvc.perform(
            get("/api/v1/student-profile/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(replacementToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.preferredName").value("Ayu"));

    String reloginToken = login("activation-success", "success@example.com");
    mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(reloginToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("STUDENT"))
        .andExpect(jsonPath("$.onboardingCompleted").value(true));
  }

  @Test
  void repeatedActivationReturnsExistingProfileWithoutDuplication() throws Exception {
    String originalToken = login("activation-retry", "retry@example.com");
    JsonNode first =
        json.readTree(
            activate(originalToken, validRequest(currentYear() - 17))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());

    activate(originalToken, validRequest(currentYear() - 17))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profile.id").value(first.get("profile").get("id").asText()))
        .andExpect(jsonPath("$.authentication.user.role").value("STUDENT"));

    assertThat(profiles.count()).isEqualTo(1);
    assertThat(securityEvents.countByEventType(SecurityEventType.STUDENT_ACTIVATION_SUCCEEDED))
        .isEqualTo(1);
  }

  @Test
  void acceptsBothRollingBirthYearBoundaries() throws Exception {
    int year = currentYear();

    activate(login("young-boundary", "young@example.com"), validRequest(year - 12))
        .andExpect(status().isCreated());
    activate(login("old-boundary", "old@example.com"), validRequest(year - 21))
        .andExpect(status().isCreated());

    assertThat(profiles.count()).isEqualTo(2);
  }

  @Test
  void rejectsInvalidProfileFieldsWithoutChangingRoleOrProfile() throws Exception {
    int year = currentYear();
    assertValidation(
        "too-old", "old-invalid@example.com", validRequest(year - 22), "birthYear", "OUT_OF_RANGE");
    assertValidation(
        "too-young",
        "young-invalid@example.com",
        validRequest(year - 11),
        "birthYear",
        "OUT_OF_RANGE");
    assertValidation(
        "unsupported-language",
        "language-invalid@example.com",
        validRequest(year - 17).replace("\"id\"", "\"fr\""),
        "defaultExplanationLanguage",
        "UNSUPPORTED");
    assertValidation(
        "unsupported-grade",
        "grade-invalid@example.com",
        validRequest(year - 17).replace("GRADE_11", "GRADE_9"),
        "currentGrade",
        "UNSUPPORTED");
    assertValidation(
        "long-name",
        "name-invalid@example.com",
        validRequest(year - 17).replace("Ayu", "x".repeat(161)),
        "preferredName",
        "TOO_LONG");

    assertThat(profiles.count()).isZero();
    assertThat(users.findAll()).allMatch(user -> user.getRole() == UserRole.UNASSIGNED);
  }

  @Test
  void requiresAuthenticationAndRejectsAnAuthoritativelyAssignedOtherRole() throws Exception {
    activate(null, validRequest(currentYear() - 17)).andExpect(status().isUnauthorized());

    String token = login("parent-role", "parent@example.com");
    jdbc.update(
        "update user_account set role = 'PARENT', onboarding_completed = true where email = ?",
        "parent@example.com");

    activate(token, validRequest(currentYear() - 17))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ROLE_ALREADY_ASSIGNED"));
    assertThat(profiles.count()).isZero();
  }

  @Test
  void doesNotLogRejectedProfileValues(CapturedOutput output) throws Exception {
    String privateName = "private-student-name-" + UUID.randomUUID();
    String request = validRequest(currentYear() - 17).replace("Ayu", privateName.repeat(8));

    activate(login("private-log-check", "private-log-check@example.com"), request)
        .andExpect(status().isBadRequest());

    assertThat(output.getAll()).doesNotContain(privateName);
  }

  private void assertValidation(
      String subject, String email, String request, String field, String code) throws Exception {
    activate(login(subject, email), request)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.violations[0].field").value(field))
        .andExpect(jsonPath("$.violations[0].code").value(code));
  }

  private String login(String subject, String email) throws Exception {
    String credential = "valid-google-credential-" + subject;
    when(googleTokenVerifier.verify(credential))
        .thenReturn(new GoogleIdentity(subject, email, "Google Name", null));
    MvcResult result =
        mvc.perform(
                post("/api/v1/auth/google")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"credential\":\"" + credential + "\"}")
                    .with(
                        request -> {
                          request.setRemoteAddr("192.0.2." + LOGIN_SEQUENCE.incrementAndGet());
                          return request;
                        }))
            .andExpect(status().isOk())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  private org.springframework.test.web.servlet.ResultActions activate(String token, String request)
      throws Exception {
    var builder =
        post("/api/v1/student-profile").contentType(MediaType.APPLICATION_JSON).content(request);
    if (token != null) {
      builder.header(HttpHeaders.AUTHORIZATION, bearer(token));
    }
    return mvc.perform(builder);
  }

  private static String validRequest(int birthYear) {
    return """
        {
          "preferredName": "Ayu",
          "birthYear": %d,
          "currentGrade": "GRADE_11",
          "city": "Jakarta",
          "defaultExplanationLanguage": "id"
        }
        """
        .formatted(birthYear);
  }

  private static int currentYear() {
    return Year.now(JAKARTA).getValue();
  }

  private static String bearer(String token) {
    return "Bearer " + token;
  }
}
