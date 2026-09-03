package com.yukcsca.agent.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.agent.application.AgentContentSearchPort;
import com.yukcsca.agent.application.AgentEnablement;
import com.yukcsca.agent.support.FakeChatModel;
import com.yukcsca.agent.support.FakeEmbeddingModel;
import com.yukcsca.identity.application.AccessTokenService;
import com.yukcsca.identity.application.UserAccountStore;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
import com.yukcsca.profile.application.StudentProfileStore;
import com.yukcsca.profile.domain.ExplanationLanguage;
import com.yukcsca.profile.domain.StudentGrade;
import com.yukcsca.profile.domain.StudentProfile;
import com.yukcsca.support.ConfigurableFormalAssistancePolicy;
import com.yukcsca.support.PostgresTestConfiguration;
import jakarta.persistence.EntityManager;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class AgentStudentHttpIT {
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired UserAccountRepository users;
  @Autowired AccessTokenService accessTokens;
  @Autowired StudentProfileStore profiles;
  @Autowired FakeChatModel fakeChat;
  @Autowired FakeEmbeddingModel fakeEmbeddings;
  @Autowired ConfigurableFormalAssistancePolicy formalPolicy;
  @Autowired AgentEnablement enablement;
  @Autowired AgentContentSearchPort search;
  @Autowired EntityManager entityManager;

  private String adminToken;
  private String studentToken;
  private String otherStudentToken;
  private String unassignedToken;
  private String parentToken;

  @BeforeEach
  void setUp() {
    fakeChat.reset();
    fakeEmbeddings.reset();
    formalPolicy.setDisabled(false);
    enablement.setForceDisabled(false);
    jdbc.execute(
        "truncate table agent_flag, agent_trace, agent_turn, agent_content_chunk, agent_conversation,"
            + " assessment_objective_evidence, assessment_assistance_event, assessment_item_attempt,"
            + " assessment_mistake, assessment_session, student_content_progress, academic_audit,"
            + " academic_image, academic_revision, academic_package, student_profile, user_account"
            + " cascade");
    Instant now = Instant.parse("2026-08-01T00:00:00Z");
    UserAccount admin =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("admin@example.com", "Admin", null, now));
    admin.activateAdmin(now);
    ((UserAccountStore) users).save(admin);
    UserAccount student =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("student@example.com", "Student", null, now));
    student.activateStudent(now);
    ((UserAccountStore) users).save(student);
    profiles.save(
        StudentProfile.create(
            student.getId(),
            "Ayu",
            2009,
            StudentGrade.GRADE_11,
            "Jakarta",
            ExplanationLanguage.ENGLISH,
            now));
    UserAccount other =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("other-student@example.com", "Other", null, now));
    other.activateStudent(now);
    ((UserAccountStore) users).save(other);
    UserAccount unassigned =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("unassigned@example.com", "Unassigned", null, now));
    UserAccount parent =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("parent@example.com", "Parent", null, now));
    jdbc.update(
        "update user_account set role = 'PARENT', onboarding_completed = true where id = ?",
        parent.getId());
    entityManager.clear();
    UserAccount reloadedParent = users.findById(parent.getId()).orElseThrow();
    adminToken = accessTokens.issue(admin).value();
    studentToken = accessTokens.issue(student).value();
    otherStudentToken = accessTokens.issue(other).value();
    unassignedToken = accessTokens.issue(unassigned).value();
    parentToken = accessTokens.issue(reloadedParent).value();
  }

  @Test
  void agentApisRequireStudentRole() throws Exception {
    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "LESSON")
                .param("contextId", UUID.randomUUID().toString()))
        .andExpect(status().isUnauthorized());

    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "LESSON")
                .param("contextId", UUID.randomUUID().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(unassignedToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "LESSON")
                .param("contextId", UUID.randomUUID().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isForbidden());

    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "LESSON")
                .param("contextId", UUID.randomUUID().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(parentToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  void lessonAskLoopIsIdempotentAndStoresTrace() throws Exception {
    Fixture fixture = publishPackage();

    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "LESSON")
                .param("contextId", fixture.lessonId().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andExpect(jsonPath("$.available").value(true))
        .andExpect(jsonPath("$.unavailableCode").value(org.hamcrest.Matchers.nullValue()));

    MvcResult created =
        mvc.perform(
                post("/api/v1/agent/conversations")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"contextType":"LESSON","contextId":"%s"}
                        """
                            .formatted(fixture.lessonId())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.explanationLanguage").value("en"))
            .andExpect(jsonPath("$.examLanguage").value("en"))
            .andExpect(jsonPath("$.turns.length()").value(0))
            .andReturn();
    UUID conversationId =
        UUID.fromString(
            json.readTree(created.getResponse().getContentAsString()).path("id").asText());

    mvc.perform(
            post("/api/v1/agent/conversations")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"contextType":"LESSON","contextId":"%s"}
                    """
                        .formatted(fixture.lessonId())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(conversationId.toString()));

    UUID key = UUID.randomUUID();
    MvcResult asked =
        mvc.perform(
                post("/api/v1/agent/conversations/{id}/turns", conversationId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .header("Idempotency-Key", key.toString())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"questionText":"Why is this identity true?"}
                        """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("COMPLETED"))
            .andExpect(jsonPath("$.kind").value("REVIEWED_SOURCE"))
            .andExpect(jsonPath("$.locators.length()").value(org.hamcrest.Matchers.greaterThan(0)))
            .andExpect(
                jsonPath("$.steps[0].label")
                    .value(
                        org.hamcrest.Matchers.not(
                            org.hamcrest.Matchers.containsString("getLessonContext"))))
            .andReturn();
    int calls = fakeChat.calls();
    String turnId = json.readTree(asked.getResponse().getContentAsString()).path("id").asText();

    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", key.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"questionText":"Why is this identity true?"}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(turnId));
    assertThat(fakeChat.calls()).isEqualTo(calls);

    Integer traces =
        jdbc.queryForObject(
            "select count(*) from agent_trace where conversation_id = ?",
            Integer.class,
            conversationId);
    assertThat(traces).isEqualTo(1);
    Integer tokenUsage =
        jdbc.queryForObject(
            "select token_usage from agent_trace where conversation_id = ?",
            Integer.class,
            conversationId);
    assertThat(tokenUsage).isGreaterThan(0);
  }

  @Test
  void unknownContextIsNotFoundAndItemMismatchConflicts() throws Exception {
    Fixture fixture = publishPackage();
    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "LESSON")
                .param("contextId", UUID.randomUUID().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "ITEM")
                .param("contextId", fixture.lessonId().toString())
                .param("sessionId", UUID.randomUUID().toString())
                .param("itemId", UUID.randomUUID().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CONTEXT_CONFLICT"));
  }

  @Test
  void formalMockHidesAvailabilityAndDeniesStart() throws Exception {
    Fixture fixture = publishPackage();
    formalPolicy.setDisabled(true);
    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "LESSON")
                .param("contextId", fixture.lessonId().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.available").value(false))
        .andExpect(jsonPath("$.unavailableCode").value("FORMAL_ASSISTANCE_DISABLED"));

    mvc.perform(
            post("/api/v1/agent/conversations")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"contextType":"LESSON","contextId":"%s"}
                    """
                        .formatted(fixture.lessonId())))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORMAL_ASSISTANCE_DISABLED"));
  }

  @Test
  void providerFailureStoresFailedTurn() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    fakeChat.setMode(FakeChatModel.Mode.ERROR);
    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Explain this.\"}"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.code").value("AGENT_PROVIDER_UNAVAILABLE"));
    Integer failed =
        jdbc.queryForObject(
            "select count(*) from agent_turn where conversation_id = ? and status = 'FAILED'",
            Integer.class,
            conversationId);
    assertThat(failed).isEqualTo(1);
  }

  @Test
  void officialQuestionIsInsufficientAndFlagged() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"What is the official admissions scoring rule?\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.kind").value("INSUFFICIENT_EVIDENCE"));
    Integer flags =
        jdbc.queryForObject(
            "select count(*) from agent_flag where conversation_id = ? and source = 'INSUFFICIENT_EVIDENCE'",
            Integer.class,
            conversationId);
    assertThat(flags).isEqualTo(1);
  }

  @Test
  void openItemAskWritesAgentQaOnceAndBlocksCheckpointPass() throws Exception {
    Fixture fixture = publishPackage();
    completeLesson(fixture.lessonId());
    MvcResult started =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"purpose":"CHECKPOINT","subject":"MATHEMATICS","setId":"%s","examLanguage":"en"}
                        """
                            .formatted(fixture.checkpointSetId())))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    UUID sessionId = UUID.fromString(session.path("sessionId").asText());
    UUID itemId = UUID.fromString(session.path("items").get(0).path("itemId").asText());

    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "ITEM")
                .param("contextId", itemId.toString())
                .param("sessionId", sessionId.toString())
                .param("itemId", itemId.toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(otherStudentToken)))
        .andExpect(status().isNotFound());

    MvcResult conversation =
        mvc.perform(
                post("/api/v1/agent/conversations")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"contextType":"ITEM","contextId":"%s","sessionId":"%s","itemId":"%s"}
                        """
                            .formatted(itemId, sessionId, itemId)))
            .andExpect(status().isCreated())
            .andReturn();
    UUID conversationId =
        UUID.fromString(
            json.readTree(conversation.getResponse().getContentAsString()).path("id").asText());

    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Help me start this item.\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.locators.length()").value(org.hamcrest.Matchers.greaterThan(0)))
        .andExpect(jsonPath("$.locators[0].sourceKind").value("ITEM"));
    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"One more hint.\"}"))
        .andExpect(status().isCreated());

    Integer qa =
        jdbc.queryForObject(
            "select count(*) from assessment_assistance_event where kind = 'AGENT_QA'",
            Integer.class);
    assertThat(qa).isEqualTo(1);

    mvc.perform(
            put("/api/v1/assessment/sessions/{id}/items/{itemId}/answer", sessionId, itemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"A\"}"))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/assessment/sessions/{id}/submit", sessionId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.checkpointPassed").value(false));
  }

  @Test
  void killSwitchReturnsAvailabilityFalseAndDeniesStart() throws Exception {
    Fixture fixture = publishPackage();
    enablement.setForceDisabled(true);
    mvc.perform(
            get("/api/v1/agent/availability")
                .param("contextType", "LESSON")
                .param("contextId", fixture.lessonId().toString())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.available").value(false))
        .andExpect(jsonPath("$.unavailableCode").value("AGENT_DISABLED"));
    mvc.perform(
            post("/api/v1/agent/conversations")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"contextType":"LESSON","contextId":"%s"}
                    """
                        .formatted(fixture.lessonId())))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("AGENT_DISABLED"));
  }

  @Test
  void getConversationRemainsReadableWhenKillSwitchIsOn() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    enablement.setForceDisabled(true);
    mvc.perform(
            get("/api/v1/agent/conversations/{id}", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(conversationId.toString()));
    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Still asking.\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("AGENT_DISABLED"));
  }

  @Test
  void schemaInvalidModelStoresFailedTurn() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    fakeChat.setMode(FakeChatModel.Mode.INVALID_JSON);
    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Explain this.\"}"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.code").value("AGENT_PROVIDER_UNAVAILABLE"));
    assertThat(fakeChat.calls()).isEqualTo(3);
    Integer failed =
        jdbc.queryForObject(
            "select count(*) from agent_turn where conversation_id = ? and status = 'FAILED'",
            Integer.class,
            conversationId);
    assertThat(failed).isEqualTo(1);
  }

  @Test
  void hybridSearchDropsUnauthorisedIndexedChunks() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    UUID packageId =
        jdbc.queryForObject(
            "select package_id from agent_conversation where id = ?", UUID.class, conversationId);
    UUID revisionId =
        jdbc.queryForObject(
            "select package_revision_id from agent_conversation where id = ?",
            UUID.class,
            conversationId);
    UUID poisonSource = UUID.randomUUID();
    jdbc.update(
        """
        insert into agent_content_chunk (
          id, package_id, package_revision_id, source_kind, source_id, block_index,
          explanation_language, label, body, search_tsv, embedding, created_at)
        values (?, ?, ?, 'LESSON', ?, 0, 'en', 'Poison', 'UNIQUEPOISONTOKEN vs011',
                to_tsvector('simple', 'UNIQUEPOISONTOKEN vs011'), null, now())
        """,
        UUID.randomUUID(),
        packageId,
        revisionId,
        poisonSource);
    var hits = search.search(revisionId, "UNIQUEPOISONTOKEN", "en", 8);
    assertThat(hits).noneMatch(hit -> poisonSource.equals(hit.sourceId()));
    assertThat(hits)
        .noneMatch(hit -> hit.excerpt() != null && hit.excerpt().contains("UNIQUEPOISONTOKEN"));
  }

  @Test
  void hybridSearchEmbedsOutsideDatabaseTransaction() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    UUID revisionId =
        jdbc.queryForObject(
            "select package_revision_id from agent_conversation where id = ?",
            UUID.class,
            conversationId);
    jdbc.update(
        "update agent_content_chunk set embedding = null where package_revision_id = ?",
        revisionId);
    fakeEmbeddings.reset();
    search.ensureIndexed(revisionId);
    assertThat(fakeEmbeddings.calls()).isPositive();
    assertThat(fakeEmbeddings.calledInsideTransaction()).isFalse();
  }

  @Test
  void oversizedQuestionAndQuoteReturnValidationProblem() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(java.util.Map.of("questionText", "x".repeat(2001)))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("AGENT_VALIDATION_FAILED"))
        .andExpect(jsonPath("$.violations[0].path").value("questionText"))
        .andExpect(jsonPath("$.violations[0].code").value("OUT_OF_RANGE"));
    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(
                        java.util.Map.of(
                            "questionText", "Explain this formula.", "quote", "x".repeat(4001)))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("AGENT_VALIDATION_FAILED"))
        .andExpect(jsonPath("$.violations[0].path").value("quote"))
        .andExpect(jsonPath("$.violations[0].code").value("OUT_OF_RANGE"));
  }

  @Test
  void dailyBudgetCapExceededReturns429WithRetryAfter() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    UUID accountId =
        jdbc.queryForObject(
            "select account_id from agent_conversation where id = ?", UUID.class, conversationId);
    Instant created = Instant.now().truncatedTo(ChronoUnit.MICROS);
    for (int index = 0; index < 40; index++) {
      jdbc.update(
          """
          insert into agent_turn (
            id, conversation_id, account_id, idempotency_key, status, question_text, created_at)
          values (?, ?, ?, ?, 'FAILED', 'seed', ?)
          """,
          UUID.randomUUID(),
          conversationId,
          accountId,
          UUID.randomUUID(),
          Timestamp.from(created));
    }
    MvcResult budgeted =
        mvc.perform(
                post("/api/v1/agent/conversations/{id}/turns", conversationId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .header("Idempotency-Key", UUID.randomUUID().toString())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"questionText\":\"One more question.\"}"))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.code").value("AGENT_BUDGET_EXCEEDED"))
            .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
            .andReturn();
    long retryAfter = Long.parseLong(budgeted.getResponse().getHeader(HttpHeaders.RETRY_AFTER));
    ZoneId jakarta = ZoneId.of("Asia/Jakarta");
    Instant resetAt =
        Instant.now().atZone(jakarta).toLocalDate().plusDays(1).atStartOfDay(jakarta).toInstant();
    long expected = Duration.between(Instant.now(), resetAt).toSeconds();
    assertThat(retryAfter).isBetween(Math.max(1, expected - 5), expected + 5);
  }

  @Test
  void concurrentStartConversationDoesNotReturn500() throws Exception {
    Fixture fixture = publishPackage();
    String body =
        """
        {"contextType":"LESSON","contextId":"%s"}
        """
            .formatted(fixture.lessonId());
    ExecutorService pool = Executors.newFixedThreadPool(2);
    try {
      Callable<MvcResult> start =
          () ->
              mvc.perform(
                      post("/api/v1/agent/conversations")
                          .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                          .contentType(MediaType.APPLICATION_JSON)
                          .content(body))
                  .andReturn();
      Future<MvcResult> first = pool.submit(start);
      Future<MvcResult> second = pool.submit(start);
      MvcResult a = first.get(20, TimeUnit.SECONDS);
      MvcResult b = second.get(20, TimeUnit.SECONDS);
      assertThat(List.of(a.getResponse().getStatus(), b.getResponse().getStatus()))
          .allMatch(status -> status == 200 || status == 201)
          .doesNotContain(500);
      String idA = json.readTree(a.getResponse().getContentAsString()).path("id").asText();
      String idB = json.readTree(b.getResponse().getContentAsString()).path("id").asText();
      assertThat(idA).isEqualTo(idB);
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void stalePendingTurnDoesNotBlockLaterAsk() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    UUID accountId =
        jdbc.queryForObject(
            "select account_id from agent_conversation where id = ?", UUID.class, conversationId);
    jdbc.update(
        """
        insert into agent_turn (
          id, conversation_id, account_id, idempotency_key, status, question_text, created_at)
        values (?, ?, ?, ?, 'PENDING', 'abandoned', ?)
        """,
        UUID.randomUUID(),
        conversationId,
        accountId,
        UUID.randomUUID(),
        Timestamp.from(Instant.now().minus(1, ChronoUnit.HOURS)));
    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Continue after a crash.\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("COMPLETED"));
    Integer pending =
        jdbc.queryForObject(
            "select count(*) from agent_turn where conversation_id = ? and status = 'PENDING'",
            Integer.class,
            conversationId);
    Integer failed =
        jdbc.queryForObject(
            "select count(*) from agent_turn where conversation_id = ? and status = 'FAILED'",
            Integer.class,
            conversationId);
    assertThat(pending).isZero();
    assertThat(failed).isEqualTo(1);
  }

  @Test
  void midConversationItemLockUnmasksExplanationAndSkipsAssistance() throws Exception {
    Fixture fixture = publishPackage();
    completeLesson(fixture.lessonId());
    MvcResult started =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"purpose":"CHECKPOINT","subject":"MATHEMATICS","setId":"%s","examLanguage":"en"}
                        """
                            .formatted(fixture.checkpointSetId())))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    UUID sessionId = UUID.fromString(session.path("sessionId").asText());
    UUID itemId = UUID.fromString(session.path("items").get(0).path("itemId").asText());
    MvcResult conversation =
        mvc.perform(
                post("/api/v1/agent/conversations")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"contextType":"ITEM","contextId":"%s","sessionId":"%s","itemId":"%s"}
                        """
                            .formatted(itemId, sessionId, itemId)))
            .andExpect(status().isCreated())
            .andReturn();
    UUID conversationId =
        UUID.fromString(
            json.readTree(conversation.getResponse().getContentAsString()).path("id").asText());

    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Help me start this item.\"}"))
        .andExpect(status().isCreated());
    assertThat(fakeChat.lastUserText()).contains("Item is OPEN");
    assertThat(fakeChat.lastUserText()).doesNotContain("Penjelasan");

    mvc.perform(
            put("/api/v1/assessment/sessions/{id}/items/{itemId}/answer", sessionId, itemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"A\"}"))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/assessment/sessions/{id}/submit", sessionId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk());

    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Explain the reviewed solution.\"}"))
        .andExpect(status().isCreated());
    assertThat(fakeChat.lastUserText()).doesNotContain("Item is OPEN");
    assertThat(fakeChat.lastUserText()).contains("Penjelasan");
    Integer qa =
        jdbc.queryForObject(
            "select count(*) from assessment_assistance_event where kind = 'AGENT_QA'",
            Integer.class);
    assertThat(qa).isEqualTo(1);
  }

  @Test
  void quoteOfFourThousandCharactersIsAccepted() throws Exception {
    Fixture fixture = publishPackage();
    UUID conversationId = startLesson(fixture.lessonId());
    String quote = "x".repeat(4000);
    mvc.perform(
            post("/api/v1/agent/conversations/{id}/turns", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(
                        java.util.Map.of("questionText", "Explain this formula.", "quote", quote))))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.quote").value(quote));
  }

  @Test
  void remediationAndSearchIndexAuthorisedChunks() throws Exception {
    Fixture fixture = publishPackage();
    mvc.perform(
            post("/api/v1/agent/conversations")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"contextType":"REMEDIATION","contextId":"%s"}
                    """
                        .formatted(fixture.remediationId())))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.contextType").value("REMEDIATION"));
    Integer chunks = jdbc.queryForObject("select count(*) from agent_content_chunk", Integer.class);
    assertThat(chunks).isGreaterThan(0);
  }

  private UUID startLesson(UUID lessonId) throws Exception {
    MvcResult created =
        mvc.perform(
                post("/api/v1/agent/conversations")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"contextType":"LESSON","contextId":"%s"}
                        """
                            .formatted(lessonId)))
            .andExpect(status().isCreated())
            .andReturn();
    return UUID.fromString(
        json.readTree(created.getResponse().getContentAsString()).path("id").asText());
  }

  private void completeLesson(UUID lessonId) throws Exception {
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", lessonId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONTENT_COMPLETE\",\"resumeBlockIndex\":0}"))
        .andExpect(status().isOk());
  }

  private record Fixture(UUID lessonId, UUID remediationId, UUID checkpointSetId) {}

  private Fixture publishPackage() throws Exception {
    UUID packageId = createPackage();
    UUID imageId = uploadOriginalImage();
    ObjectNode draft = validDraftWithAssessment(imageId);
    UUID lessonId = resourceId(draft, "LESSON");
    UUID remediationId = resourceId(draft, "REMEDIATION");
    UUID checkpointSetId = null;
    for (JsonNode set : draft.path("assessmentSets")) {
      if ("CHECKPOINT".equals(set.path("purpose").asText())) {
        checkpointSetId = UUID.fromString(set.path("id").asText());
      }
    }
    save(packageId, 0, draft);
    publish(packageId, 1);
    return new Fixture(lessonId, remediationId, checkpointSetId);
  }

  private ObjectNode validDraftWithAssessment(UUID imageId) {
    ObjectNode draft = emptyDraft();
    ObjectNode syllabus = (ObjectNode) draft.path("officialSyllabus");
    syllabus.put("authority", "China Scholastic Competency Assessment");
    syllabus.put("editionLabel", "2025");
    var sourceLinks = syllabus.putArray("sourceLinks");
    sourceLinks
        .addObject()
        .put("language", "en")
        .put("url", "https://csca.cn/files/CSCA%20Mathematics%20Examination%20Syllabus-2025.pdf");
    sourceLinks.addObject().put("language", "zh-CN").put("url", "https://csca.cn/files/zh.pdf");
    syllabus.put("retrievedAt", "2026-07-31T00:00:00Z");
    syllabus.put("lastCheckedAt", "2026-07-31T00:00:00Z");
    syllabus.set("publishedOn", notStatedDate());
    syllabus.set("effectiveOn", notStatedDate());
    syllabus.set("updatedOn", notStatedDate());
    syllabus.put("permittedUse", "REFERENCE_ONLY");
    ObjectNode structure = syllabus.putObject("examStructure");
    structure.put("durationMinutes", 60);
    structure.put("totalPoints", 100);
    structure.put("questionCount", 48);
    structure.put("questionType", "SINGLE_ANSWER");
    structure.putArray("examLanguages").add("en").add("zh-CN");

    UUID outlineId = UUID.randomUUID();
    ObjectNode outline = draft.withArray("outlineItems").addObject();
    outline.put("id", outlineId.toString());
    outline.putNull("parentId");
    outline.put("order", 0);
    outline.putObject("sourcePosition").put("page", 1).put("section", "Mathematics");
    localized(outline.putObject("summary"), "Ringkasan", "Summary", "摘要");

    UUID objectiveId = UUID.randomUUID();
    ObjectNode objective = draft.withArray("learningObjectives").addObject();
    objective.put("id", objectiveId.toString());
    localized(objective.putObject("title"), "Tujuan", "Objective", "目标");
    objective
        .putArray("mappings")
        .addObject()
        .put("outlineItemId", outlineId.toString())
        .put("rationale", "Direct syllabus alignment");

    UUID lessonId = UUID.randomUUID();
    UUID remediationId = UUID.randomUUID();
    for (String kind : new String[] {"LESSON", "TERMINOLOGY", "REMEDIATION"}) {
      ObjectNode resource = draft.withArray("resources").addObject();
      UUID id =
          "LESSON".equals(kind)
              ? lessonId
              : "REMEDIATION".equals(kind) ? remediationId : UUID.randomUUID();
      resource.put("id", id.toString());
      resource.put("kind", kind);
      localized(resource.putObject("title"), kind, kind, kind);
      resource.putArray("outlineItemIds").add(outlineId.toString());
      resource.putArray("objectiveIds").add(objectiveId.toString());
      ObjectNode version = resource.putArray("versions").addObject();
      version.put("language", "id");
      textBlock(version.putArray("blocks"), "Content for " + kind);
      if ("LESSON".equals(kind)) {
        version
            .withArray("blocks")
            .addObject()
            .put("kind", "MATH")
            .put("latex", "x^2 + 1")
            .put("displayMode", true);
        version
            .withArray("blocks")
            .addObject()
            .put("kind", "IMAGE")
            .put("imageId", imageId.toString())
            .put("altText", "Coordinate diagram")
            .putNull("caption");
      }
      resource.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    }

    ArrayNode questions = draft.withArray("questions");
    ArrayNode mockQuestions = json.createArrayNode();
    UUID q0 = null;
    for (int index = 0; index < 48; index++) {
      UUID questionId = UUID.randomUUID();
      if (index == 0) q0 = questionId;
      ObjectNode question = questions.addObject();
      question.put("id", questionId.toString());
      question.put("examLanguage", "en");
      question.put("difficulty", "STANDARD");
      textBlock(question.putArray("stem"), "Question " + (index + 1));
      ObjectNode optionA = question.putArray("options").addObject();
      optionA.put("key", "A");
      textBlock(optionA.putArray("blocks"), "Correct");
      ObjectNode optionB = question.withArray("options").addObject();
      optionB.put("key", "B");
      textBlock(optionB.putArray("blocks"), "Alternative");
      question.put("correctOptionKey", "A");
      ObjectNode explanation = question.putArray("explanations").addObject();
      explanation.put("language", "id");
      textBlock(explanation.putArray("blocks"), "Penjelasan");
      question.putArray("outlineItemIds").add(outlineId.toString());
      question.putArray("objectiveIds").add(objectiveId.toString());
      question.putArray("relatedResourceIds").add(remediationId.toString());
      ObjectNode standard = question.putArray("hintTiers").addObject();
      standard.put("strength", "STANDARD");
      textBlock(standard.putArray("blocks"), "Standard hint");
      ObjectNode strong = question.withArray("hintTiers").addObject();
      strong.put("strength", "STRONG");
      textBlock(strong.putArray("blocks"), "Strong hint");
      question.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
      mockQuestions
          .addObject()
          .put("questionId", questionId.toString())
          .put("points", index < 4 ? 3 : 2);
    }

    ObjectNode checkpoint = draft.withArray("assessmentSets").addObject();
    checkpoint.put("id", UUID.randomUUID().toString());
    checkpoint.put("purpose", "CHECKPOINT");
    localized(checkpoint.putObject("title"), "Checkpoint", "Checkpoint", "检查点");
    checkpoint.put("examLanguage", "en");
    checkpoint.putArray("questionIds").add(q0.toString());
    checkpoint.putArray("outlineItemIds").add(outlineId.toString());
    checkpoint.putArray("objectiveIds").add(objectiveId.toString());
    checkpoint.put("lessonResourceId", lessonId.toString());
    checkpoint.put("estimatedMinutes", 10);
    checkpoint.put("feedbackMode", "IMMEDIATE");
    checkpoint.put("passPolicy", "ALL_CORRECT_NO_STRONG_ASSISTANCE");
    checkpoint.putArray("remediationResourceIds").add(remediationId.toString());

    ObjectNode mock = draft.withArray("mocks").addObject();
    mock.put("id", UUID.randomUUID().toString());
    mock.put("title", "YukCSCA Mathematics Mock 1");
    mock.put("examLanguage", "en");
    mock.put("durationMinutes", 60);
    mock.put("totalPoints", 100);
    mock.put("questionCount", 48);
    mock.put("questionType", "SINGLE_ANSWER");
    mock.set("questions", mockQuestions);
    mock.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    return draft;
  }

  private ObjectNode emptyDraft() {
    ObjectNode draft = json.createObjectNode();
    draft.putObject("officialSyllabus").put("subject", "MATHEMATICS");
    draft.putArray("outlineItems");
    draft.putArray("learningObjectives");
    draft.putArray("resources");
    draft.putArray("questions");
    draft.putArray("assessmentSets");
    draft.putArray("mocks");
    return draft;
  }

  private UUID createPackage() throws Exception {
    MvcResult created =
        mvc.perform(
                post("/api/v1/admin/academic-packages")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"subject\":\"MATHEMATICS\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    return UUID.fromString(
        json.readTree(created.getResponse().getContentAsString()).path("id").asText());
  }

  private void save(UUID packageId, long expected, ObjectNode draft) throws Exception {
    ObjectNode request = json.createObjectNode();
    request.put("expectedDraftRevision", expected);
    request.set("draft", draft);
    mvc.perform(
            put("/api/v1/admin/academic-packages/{id}/draft", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request)))
        .andExpect(status().isOk());
  }

  private void publish(UUID packageId, long expected) throws Exception {
    mvc.perform(
            post("/api/v1/admin/academic-packages/{id}:publish", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedDraftRevision\":" + expected + "}"))
        .andExpect(status().isOk());
  }

  private UUID uploadOriginalImage() throws Exception {
    MockMultipartFile file = new MockMultipartFile("file", "diagram.png", "image/png", png());
    MockMultipartFile provenance =
        new MockMultipartFile(
            "provenance",
            "",
            MediaType.APPLICATION_JSON_VALUE,
            "{\"origin\":\"YUKCSCA_ORIGINAL\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
    MvcResult uploaded =
        mvc.perform(
                multipart("/api/v1/admin/academic-images")
                    .file(file)
                    .file(provenance)
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
            .andExpect(status().isCreated())
            .andReturn();
    return UUID.fromString(
        json.readTree(uploaded.getResponse().getContentAsString()).path("id").asText());
  }

  private static UUID resourceId(ObjectNode draft, String kind) {
    for (JsonNode resource : draft.path("resources")) {
      if (kind.equals(resource.path("kind").asText())) {
        return UUID.fromString(resource.path("id").asText());
      }
    }
    throw new IllegalStateException(kind + " missing");
  }

  private ObjectNode notStatedDate() {
    ObjectNode date = json.createObjectNode();
    date.put("status", "NOT_STATED");
    date.putNull("date");
    return date;
  }

  private static void localized(ObjectNode value, String id, String en, String zh) {
    value.put("indonesian", id);
    value.put("english", en);
    value.put("simplifiedChinese", zh);
  }

  private static void textBlock(ArrayNode blocks, String text) {
    blocks.addObject().put("kind", "TEXT").put("text", text);
  }

  private static byte[] png() throws Exception {
    BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB);
    try (ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
      ImageIO.write(image, "png", bytes);
      return bytes.toByteArray();
    }
  }

  private static String bearer(String token) {
    return "Bearer " + token;
  }
}
