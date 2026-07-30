package com.yukcsca.profile.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItems;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
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
    activate(null, validRequest(currentYear() - 17))
        .andExpect(status().isUnauthorized())
        .andExpect(
            header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PROBLEM_JSON_VALUE))
        .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, containsString("Bearer")))
        .andExpect(jsonPath("$.status").value(401))
        .andExpect(jsonPath("$.title").value("Unauthorized"))
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

    String token = login("parent-role", "parent@example.com");
    jdbc.update(
        "update user_account set role = 'PARENT', onboarding_completed = true where email = ?",
        "parent@example.com");

    activate(token, validRequest(currentYear() - 17))
        .andExpect(status().isConflict())
        .andExpect(
            header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PROBLEM_JSON_VALUE))
        .andExpect(jsonPath("$.status").value(409))
        .andExpect(jsonPath("$.title").value("Conflict"))
        .andExpect(jsonPath("$.code").value("ROLE_ALREADY_ASSIGNED"));
    assertThat(profiles.count()).isZero();
  }

  @Test
  void unassignedAccountCannotReadAStudentProfile() throws Exception {
    String token = login("unassigned-profile", "unassigned@example.com");

    mvc.perform(get("/api/v1/student-profile/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
        .andExpect(status().isForbidden())
        .andExpect(
            header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PROBLEM_JSON_VALUE))
        .andExpect(jsonPath("$.status").value(403))
        .andExpect(jsonPath("$.title").value("Forbidden"))
        .andExpect(jsonPath("$.detail").exists())
        .andExpect(jsonPath("$.code").value("STUDENT_PROFILE_FORBIDDEN"));
  }

  @Test
  void updatesOwnProfileAndExplanationLanguageWithoutChangingIdentityOrSession() throws Exception {
    String token = activateStudent("profile-update", "profile-update@example.com");
    JsonNode before = getProfile(token);
    long sessionsBefore = sessions.count();

    MvcResult update =
        update(
                token,
                """
                {
                  "preferredName": "  Sari  ",
                  "birthYear": %d,
                  "currentGrade": "GRADE_12",
                  "city": "  Bandung  ",
                  "defaultExplanationLanguage": "zh-CN"
                }
                """
                    .formatted(currentYear() - 16))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(header().string(HttpHeaders.PRAGMA, "no-cache"))
            .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
            .andExpect(jsonPath("$.id").value(before.get("id").asText()))
            .andExpect(jsonPath("$.preferredName").value("Sari"))
            .andExpect(jsonPath("$.birthYear").value(currentYear() - 16))
            .andExpect(jsonPath("$.currentGrade").value("GRADE_12"))
            .andExpect(jsonPath("$.city").value("Bandung"))
            .andExpect(jsonPath("$.defaultExplanationLanguage").value("zh-CN"))
            .andReturn();

    JsonNode updated = json.readTree(update.getResponse().getContentAsString());
    assertThat(updated.get("createdAt").asText()).isEqualTo(before.get("createdAt").asText());
    assertThat(updated.get("updatedAt").asText()).isNotEqualTo(before.get("updatedAt").asText());
    assertThat(getProfile(token)).isEqualTo(updated);
    assertThat(sessions.count()).isEqualTo(sessionsBefore);
    assertThat(users.findAll())
        .singleElement()
        .extracting(user -> user.getRole())
        .isEqualTo(UserRole.STUDENT);
    assertThat(securityEvents.countByEventType(SecurityEventType.STUDENT_PROFILE_UPDATED))
        .isEqualTo(1);
  }

  @Test
  void treatsEmptyAndIdenticalUpdatesAsNoops() throws Exception {
    String token = activateStudent("profile-noop", "profile-noop@example.com");
    JsonNode before = getProfile(token);

    update(token, "{}")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.updatedAt").value(before.get("updatedAt").asText()));
    update(token, "{\"city\":\"  Jakarta  \"}")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.updatedAt").value(before.get("updatedAt").asText()));

    assertThat(getProfile(token)).isEqualTo(before);
    assertThat(securityEvents.countByEventType(SecurityEventType.STUDENT_PROFILE_UPDATED)).isZero();
  }

  @Test
  void rejectsInvalidOrNullUpdatesWithoutPartialPersistence() throws Exception {
    String token = activateStudent("profile-invalid", "profile-invalid@example.com");
    JsonNode before = getProfile(token);

    update(
            token,
            """
            {
              "preferredName": " ",
              "birthYear": %d,
              "currentGrade": "GRADE_9",
              "city": " ",
              "defaultExplanationLanguage": "fr"
            }
            """
                .formatted(currentYear() - 11))
        .andExpect(status().isBadRequest())
        .andExpect(
            header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PROBLEM_JSON_VALUE))
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(
            jsonPath(
                "$.violations[*].field",
                hasItems(
                    "preferredName",
                    "birthYear",
                    "currentGrade",
                    "city",
                    "defaultExplanationLanguage")));

    update(token, "{\"preferredName\":\"" + "x".repeat(161) + "\"}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.violations[0].field").value("preferredName"))
        .andExpect(jsonPath("$.violations[0].code").value("TOO_LONG"));

    update(token, "{\"city\":null}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.violations[0].field").value("city"))
        .andExpect(jsonPath("$.violations[0].code").value("REQUIRED"));

    update(token, "{\"birthYear\":\"not-a-year\"}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.violations[0].field").value("birthYear"))
        .andExpect(jsonPath("$.violations[0].code").value("UNSUPPORTED"));

    assertThat(getProfile(token)).isEqualTo(before);
    assertThat(securityEvents.countByEventType(SecurityEventType.STUDENT_PROFILE_UPDATED)).isZero();
  }

  @Test
  void requiresAuthenticationAndStudentRoleForUpdates() throws Exception {
    update(null, "{\"city\":\"Bandung\"}")
        .andExpect(status().isUnauthorized())
        .andExpect(
            header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PROBLEM_JSON_VALUE))
        .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, containsString("Bearer")))
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

    String unassignedToken = login("profile-update-unassigned", "update-unassigned@example.com");
    update(unassignedToken, "{\"city\":\"Bandung\"}")
        .andExpect(status().isForbidden())
        .andExpect(
            header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PROBLEM_JSON_VALUE))
        .andExpect(jsonPath("$.code").value("STUDENT_PROFILE_FORBIDDEN"));

    assertThat(profiles.count()).isZero();
    assertThat(securityEvents.countByEventType(SecurityEventType.STUDENT_PROFILE_UPDATED)).isZero();
  }

  @Test
  void serializesConcurrentDisjointUpdatesWithoutLosingEitherField() throws Exception {
    String token = activateStudent("profile-concurrent", "profile-concurrent@example.com");
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      Future<MvcResult> nameUpdate =
          executor.submit(
              () -> {
                if (!start.await(5, TimeUnit.SECONDS)) {
                  throw new IllegalStateException("Concurrent update did not start.");
                }
                return update(token, "{\"preferredName\":\"Concurrent Name\"}")
                    .andExpect(status().isOk())
                    .andReturn();
              });
      Future<MvcResult> cityUpdate =
          executor.submit(
              () -> {
                if (!start.await(5, TimeUnit.SECONDS)) {
                  throw new IllegalStateException("Concurrent update did not start.");
                }
                return update(token, "{\"city\":\"Surabaya\"}")
                    .andExpect(status().isOk())
                    .andReturn();
              });

      start.countDown();
      nameUpdate.get(15, TimeUnit.SECONDS);
      cityUpdate.get(15, TimeUnit.SECONDS);
    } finally {
      executor.shutdownNow();
    }

    JsonNode profile = getProfile(token);
    assertThat(profile.get("preferredName").asText()).isEqualTo("Concurrent Name");
    assertThat(profile.get("city").asText()).isEqualTo("Surabaya");
    assertThat(securityEvents.countByEventType(SecurityEventType.STUDENT_PROFILE_UPDATED))
        .isEqualTo(2);
  }

  @Test
  void doesNotLogRejectedProfileValues(CapturedOutput output) throws Exception {
    String privateName = "private-student-name-" + UUID.randomUUID();
    String request = validRequest(currentYear() - 17).replace("Ayu", privateName.repeat(8));

    activate(login("private-log-check", "private-log-check@example.com"), request)
        .andExpect(status().isBadRequest());

    assertThat(output.getAll()).doesNotContain(privateName);
  }

  @Test
  void doesNotLogAcceptedProfileUpdateValues(CapturedOutput output) throws Exception {
    String token = activateStudent("private-update-log", "private-update-log@example.com");
    String privateName = "private-updated-name-" + UUID.randomUUID();
    String privateCity = "private-updated-city-" + UUID.randomUUID();

    update(
            token,
            """
            {"preferredName":"%s","city":"%s"}
            """
                .formatted(privateName, privateCity))
        .andExpect(status().isOk());

    assertThat(output.getAll()).doesNotContain(privateName, privateCity);
  }

  private void assertValidation(
      String subject, String email, String request, String field, String code) throws Exception {
    activate(login(subject, email), request)
        .andExpect(status().isBadRequest())
        .andExpect(
            header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PROBLEM_JSON_VALUE))
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.title").value("Bad Request"))
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

  private org.springframework.test.web.servlet.ResultActions update(String token, String request)
      throws Exception {
    var builder =
        patch("/api/v1/student-profile/me")
            .contentType(MediaType.APPLICATION_JSON)
            .content(request);
    if (token != null) {
      builder.header(HttpHeaders.AUTHORIZATION, bearer(token));
    }
    return mvc.perform(builder);
  }

  private String activateStudent(String subject, String email) throws Exception {
    MvcResult result =
        activate(login(subject, email), validRequest(currentYear() - 17))
            .andExpect(status().isCreated())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString())
        .get("authentication")
        .get("accessToken")
        .asText();
  }

  private JsonNode getProfile(String token) throws Exception {
    MvcResult result =
        mvc.perform(
                get("/api/v1/student-profile/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(header().string(HttpHeaders.PRAGMA, "no-cache"))
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString());
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
