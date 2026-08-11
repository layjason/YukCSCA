package com.yukcsca.assessment.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.identity.application.AccessTokenService;
import com.yukcsca.identity.application.UserAccountStore;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
import com.yukcsca.support.PostgresTestConfiguration;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
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
class AssessmentStudentHttpIT {
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired UserAccountRepository users;
  @Autowired AccessTokenService accessTokens;

  private String adminToken;
  private String studentToken;
  private String unassignedToken;
  private String otherStudentToken;

  @BeforeEach
  void setUp() {
    jdbc.execute(
        "truncate table assessment_objective_evidence, assessment_assistance_event,"
            + " assessment_item_attempt, assessment_mistake, assessment_session,"
            + " student_content_progress, academic_audit, academic_image, academic_revision,"
            + " academic_package, user_account cascade");
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
    UserAccount other =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("other-student@example.com", "Other", null, now));
    other.activateStudent(now);
    ((UserAccountStore) users).save(other);
    UserAccount unassigned =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("unassigned@example.com", "Unassigned", null, now));
    adminToken = accessTokens.issue(admin).value();
    studentToken = accessTokens.issue(student).value();
    otherStudentToken = accessTokens.issue(other).value();
    unassignedToken = accessTokens.issue(unassigned).value();
  }

  @Test
  void assessmentApisRequireStudentRole() throws Exception {
    mvc.perform(get("/api/v1/assessment/packages/MATHEMATICS/sets"))
        .andExpect(status().isUnauthorized());

    mvc.perform(
            get("/api/v1/assessment/packages/MATHEMATICS/sets")
                .header(HttpHeaders.AUTHORIZATION, bearer(unassignedToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

    mvc.perform(
            get("/api/v1/assessment/packages/MATHEMATICS/sets")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isForbidden());
  }

  @Test
  void checkpointLockedUntilLessonCompleteThenPassAndEvidence() throws Exception {
    Fixture fixture = publishAssessmentPackage();

    mvc.perform(
            get(
                    "/api/v1/assessment/packages/MATHEMATICS/lessons/{id}/checkpoint",
                    fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andExpect(jsonPath("$.startable").value(false))
        .andExpect(jsonPath("$.lockReason").value("LESSON_NOT_CONTENT_COMPLETE"));

    mvc.perform(
            post("/api/v1/assessment/sessions")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"purpose":"CHECKPOINT","subject":"MATHEMATICS","setId":"%s","examLanguage":"en"}
                    """
                        .formatted(fixture.checkpointSetId())))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CHECKPOINT_LOCKED"))
        .andExpect(jsonPath("$.lockReason").value("LESSON_NOT_CONTENT_COMPLETE"));

    completeLesson(fixture.lessonId());

    mvc.perform(
            get(
                    "/api/v1/assessment/packages/MATHEMATICS/lessons/{id}/checkpoint",
                    fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.startable").value(true))
        .andExpect(jsonPath("$.editions.length()").value(1));

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
            .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].hintLadder[0].strength").value("STANDARD"))
            .andExpect(jsonPath("$.items[0].hintLadder[1].strength").value("STRONG"))
            .andExpect(jsonPath("$.items[0].disclosedHints.length()").value(0))
            .andExpect(jsonPath("$..correctOptionKey").doesNotExist())
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    UUID sessionId = UUID.fromString(session.path("sessionId").asText());
    UUID itemId = UUID.fromString(session.path("items").get(0).path("itemId").asText());

    mvc.perform(
            get("/api/v1/assessment/sessions")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].sessionId").value(sessionId.toString()))
        .andExpect(jsonPath("$[0].answeredItemCount").value(0));

    mvc.perform(
            post("/api/v1/assessment/sessions/{s}/items/{i}/hints", sessionId, itemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.disclosed.strength").value("STANDARD"))
        .andExpect(jsonPath("$.item.disclosedHints.length()").value(1))
        .andExpect(jsonPath("$.item.disclosedHints[0].blocks[0].text").value("Standard hint"));

    mvc.perform(
            put("/api/v1/assessment/sessions/{s}/items/{i}/answer", sessionId, itemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"A\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.status").value("LOCKED"))
        .andExpect(jsonPath("$.item.correct").value(true))
        .andExpect(jsonPath("$.item.feedback.correctOptionKey").value("A"))
        .andExpect(jsonPath("$.item.feedback.relatedResources[0].kind").value("REMEDIATION"));

    mvc.perform(
            post("/api/v1/assessment/sessions/{s}/submit", sessionId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SUBMITTED"))
        .andExpect(jsonPath("$.checkpointPassed").value(true))
        .andExpect(jsonPath("$.evidenceWritten.length()").value(1))
        .andExpect(jsonPath("$.evidenceWritten[0].signal").value("CHECKPOINT_PASSED"))
        .andExpect(jsonPath("$.context.checkpointPassed").value(true));
  }

  @Test
  void incorrectAnswerCreatesMistakeAndRemediationRevalidationLoop() throws Exception {
    Fixture fixture = publishAssessmentPackage();
    completeLesson(fixture.lessonId());

    MvcResult started =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"purpose":"TOPIC_PRACTICE","subject":"MATHEMATICS","setId":"%s","examLanguage":"en"}
                        """
                            .formatted(fixture.practiceSetId())))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    UUID sessionId = UUID.fromString(session.path("sessionId").asText());
    UUID itemId = UUID.fromString(session.path("items").get(0).path("itemId").asText());

    mvc.perform(
            put("/api/v1/assessment/sessions/{s}/items/{i}/answer", sessionId, itemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"B\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.correct").value(false));

    MvcResult submitted =
        mvc.perform(
                post("/api/v1/assessment/sessions/{s}/submit", sessionId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.checkpointPassed").isEmpty())
            .andExpect(jsonPath("$.mistakeIds.length()").value(1))
            .andExpect(jsonPath("$.evidenceWritten.length()").value(0))
            .andReturn();
    UUID mistakeId =
        UUID.fromString(
            json.readTree(submitted.getResponse().getContentAsString())
                .path("mistakeIds")
                .get(0)
                .asText());

    mvc.perform(
            get("/api/v1/assessment/mistakes/{id}", mistakeId)
                .header(HttpHeaders.AUTHORIZATION, bearer(otherStudentToken)))
        .andExpect(status().isForbidden());

    mvc.perform(
            get("/api/v1/assessment/mistakes/{id}", mistakeId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.attemptQuestion.stem[0].text").exists())
        .andExpect(jsonPath("$.latestResponse.selectedOptionKey").value("B"))
        .andExpect(jsonPath("$.latestResponse.correct").value(false))
        .andExpect(jsonPath("$.latestResponse.correctOptionKey").value("A"))
        .andExpect(jsonPath("$.latestResponse.feedback").isMap())
        .andExpect(jsonPath("$.latestResponse.feedback.correctOptionKey").value("A"))
        .andExpect(jsonPath("$.latestResponse.feedback.explanations[0].language").value("id"))
        .andExpect(
            jsonPath("$.latestResponse.feedback.relatedResources[0].kind").value("REMEDIATION"))
        .andExpect(jsonPath("$.remediationCandidates[0].kind").value("REMEDIATION"))
        .andExpect(jsonPath("$.revalidationEligible").value(false));

    mvc.perform(
            patch("/api/v1/assessment/mistakes/{id}", mistakeId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"errorCause":"CONCEPTUAL_GAP","privateNote":"Need to re-read the definition"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.errorCause").value("CONCEPTUAL_GAP"))
        .andExpect(jsonPath("$.privateNote").value("Need to re-read the definition"));

    mvc.perform(
            put(
                    "/api/v1/academic/packages/MATHEMATICS/remediation/{id}/progress",
                    fixture.remediationId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONTENT_COMPLETE\",\"resumeBlockIndex\":0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CONTENT_COMPLETE"));

    mvc.perform(
            get("/api/v1/assessment/mistakes/{id}", mistakeId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revalidationEligible").value(true));

    MvcResult reval =
        mvc.perform(
                post("/api/v1/assessment/mistakes/{id}/revalidation", mistakeId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.purpose").value("REVALIDATION"))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andReturn();
    JsonNode revalSession = json.readTree(reval.getResponse().getContentAsString());
    UUID revalSessionId = UUID.fromString(revalSession.path("sessionId").asText());
    UUID revalItemId = UUID.fromString(revalSession.path("items").get(0).path("itemId").asText());

    // STRONG disabled: second tier disclose blocked after standard if only STRONG remains after
    // first...
    // Our ladder is STANDARD then STRONG; disclose STANDARD ok, STRONG blocked.
    mvc.perform(
            post("/api/v1/assessment/sessions/{s}/items/{i}/hints", revalSessionId, revalItemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/assessment/sessions/{s}/items/{i}/hints", revalSessionId, revalItemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STRONG_HINT_BLOCKED"));

    mvc.perform(
            put("/api/v1/assessment/sessions/{s}/items/{i}/answer", revalSessionId, revalItemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"A\"}"))
        .andExpect(status().isOk());

    // Assistance used → revalidation does not upgrade to REVALIDATION_PASSED
    mvc.perform(
            post("/api/v1/assessment/sessions/{s}/submit", revalSessionId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk());

    // Corrective study remains complete, so eligibility is restored (not REVALIDATION_PASSED).
    mvc.perform(
            get("/api/v1/assessment/mistakes/{id}", mistakeId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("AWAITING_REVALIDATION"))
        .andExpect(jsonPath("$.revalidationEligible").value(true));
  }

  @Test
  void listMistakesCursorAdvancesToNextPage() throws Exception {
    Fixture fixture = publishAssessmentPackage();
    completeLesson(fixture.lessonId());

    // Two incorrect sessions on distinct questions → two mistakes for keyset pagination.
    UUID mistakeA = failPractice(fixture.practiceSetId());
    UUID mistakeB = failPractice(fixture.setEndPracticeId());
    assertThat(mistakeA).isNotEqualTo(mistakeB);

    MvcResult page1 =
        mvc.perform(
                get("/api/v1/assessment/mistakes")
                    .param("limit", "1")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.nextCursor").isNotEmpty())
            .andReturn();
    JsonNode firstPage = json.readTree(page1.getResponse().getContentAsString());
    String cursor = firstPage.path("nextCursor").asText();
    String firstId = firstPage.path("items").get(0).path("mistakeId").asText();

    MvcResult page2 =
        mvc.perform(
                get("/api/v1/assessment/mistakes")
                    .param("limit", "1")
                    .param("cursor", cursor)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andReturn();
    JsonNode secondPage = json.readTree(page2.getResponse().getContentAsString());
    String secondId = secondPage.path("items").get(0).path("mistakeId").asText();
    assertThat(secondId).isNotEqualTo(firstId);
    assertThat(Set.of(firstId, secondId))
        .containsExactlyInAnyOrder(mistakeA.toString(), mistakeB.toString());
  }

  @Test
  void publishRejectsUnorderedHintTiers() throws Exception {
    UUID packageId = createPackage();
    UUID imageId = uploadOriginalImage();
    ObjectNode draft = validDraftWithAssessment(imageId);
    ObjectNode question = (ObjectNode) draft.path("questions").get(0);
    question.remove("hintTiers");
    ObjectNode strong = question.putArray("hintTiers").addObject();
    strong.put("strength", "STRONG");
    textBlock(strong.putArray("blocks"), "strong first");
    ObjectNode standard = question.withArray("hintTiers").addObject();
    standard.put("strength", "STANDARD");
    textBlock(standard.putArray("blocks"), "standard after strong");

    ObjectNode request = json.createObjectNode();
    request.put("expectedDraftRevision", 0);
    request.set("draft", draft);
    mvc.perform(
            put("/api/v1/admin/academic-packages/{id}/draft", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request)))
        .andExpect(status().isOk());

    MvcResult rejected =
        mvc.perform(
                post("/api/v1/admin/academic-packages/{id}:publish", packageId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"expectedDraftRevision\":1}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("ACADEMIC_VALIDATION_FAILED"))
            .andReturn();
    String body = rejected.getResponse().getContentAsString();
    assertThat(body).contains("hintTiers");
    assertThat(body).contains("INCOMPATIBLE");
  }

  @Test
  void setEndDefersFeedbackUntilSubmit() throws Exception {
    Fixture fixture = publishAssessmentPackage();
    completeLesson(fixture.lessonId());

    MvcResult started =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"purpose":"TOPIC_PRACTICE","subject":"MATHEMATICS","setId":"%s","examLanguage":"en"}
                        """
                            .formatted(fixture.setEndPracticeId())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.feedbackMode").value("SET_END"))
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    UUID sessionId = UUID.fromString(session.path("sessionId").asText());
    UUID itemId = UUID.fromString(session.path("items").get(0).path("itemId").asText());

    mvc.perform(
            put("/api/v1/assessment/sessions/{s}/items/{i}/answer", sessionId, itemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"A\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.item.status").value("OPEN"))
        .andExpect(jsonPath("$.item.feedback").isEmpty())
        .andExpect(jsonPath("$.item.correct").isEmpty());

    mvc.perform(
            post("/api/v1/assessment/sessions/{s}/submit", sessionId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].status").value("LOCKED"))
        .andExpect(jsonPath("$.items[0].feedback.correctOptionKey").value("A"));
  }

  private void completeLesson(UUID lessonId) throws Exception {
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", lessonId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONTENT_COMPLETE\",\"resumeBlockIndex\":0}"))
        .andExpect(status().isOk());
  }

  private UUID failPractice(UUID setId) throws Exception {
    MvcResult started =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"purpose":"TOPIC_PRACTICE","subject":"MATHEMATICS","setId":"%s","examLanguage":"en"}
                        """
                            .formatted(setId)))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    UUID sessionId = UUID.fromString(session.path("sessionId").asText());
    UUID itemId = UUID.fromString(session.path("items").get(0).path("itemId").asText());
    mvc.perform(
            put("/api/v1/assessment/sessions/{s}/items/{i}/answer", sessionId, itemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"B\"}"))
        .andExpect(status().isOk());
    MvcResult submitted =
        mvc.perform(
                post("/api/v1/assessment/sessions/{s}/submit", sessionId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mistakeIds.length()").value(1))
            .andReturn();
    return UUID.fromString(
        json.readTree(submitted.getResponse().getContentAsString())
            .path("mistakeIds")
            .get(0)
            .asText());
  }

  private record Fixture(
      UUID lessonId,
      UUID remediationId,
      UUID checkpointSetId,
      UUID practiceSetId,
      UUID setEndPracticeId) {}

  private Fixture publishAssessmentPackage() throws Exception {
    UUID packageId = createPackage();
    UUID imageId = uploadOriginalImage();
    ObjectNode draft = validDraftWithAssessment(imageId);
    UUID lessonId = resourceId(draft, "LESSON");
    UUID remediationId = resourceId(draft, "REMEDIATION");
    UUID checkpointSetId = null;
    UUID practiceSetId = null;
    UUID setEndPracticeId = null;
    for (JsonNode set : draft.path("assessmentSets")) {
      String purpose = set.path("purpose").asText();
      if ("CHECKPOINT".equals(purpose)) {
        checkpointSetId = UUID.fromString(set.path("id").asText());
      } else if ("TOPIC_PRACTICE".equals(purpose)
          && "IMMEDIATE".equals(set.path("feedbackMode").asText())) {
        practiceSetId = UUID.fromString(set.path("id").asText());
      } else if ("TOPIC_PRACTICE".equals(purpose)
          && "SET_END".equals(set.path("feedbackMode").asText())) {
        setEndPracticeId = UUID.fromString(set.path("id").asText());
      }
    }
    save(packageId, 0, draft);
    publish(packageId, 1);
    return new Fixture(lessonId, remediationId, checkpointSetId, practiceSetId, setEndPracticeId);
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
    UUID q1 = null;
    for (int index = 0; index < 48; index++) {
      UUID questionId = UUID.randomUUID();
      if (index == 0) q0 = questionId;
      if (index == 1) q1 = questionId;
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

    ObjectNode practice = draft.withArray("assessmentSets").addObject();
    practice.put("id", UUID.randomUUID().toString());
    practice.put("purpose", "TOPIC_PRACTICE");
    localized(practice.putObject("title"), "Practice", "Practice", "练习");
    practice.put("examLanguage", "en");
    practice.put("difficulty", "STANDARD");
    practice.putArray("questionIds").add(q0.toString());
    practice.putArray("outlineItemIds").add(outlineId.toString());
    practice.putArray("objectiveIds").add(objectiveId.toString());
    practice.put("feedbackMode", "IMMEDIATE");
    practice.putArray("remediationResourceIds").add(remediationId.toString());

    ObjectNode setEnd = draft.withArray("assessmentSets").addObject();
    setEnd.put("id", UUID.randomUUID().toString());
    setEnd.put("purpose", "TOPIC_PRACTICE");
    localized(setEnd.putObject("title"), "Set end", "Set end", "整卷");
    setEnd.put("examLanguage", "en");
    setEnd.put("difficulty", "STANDARD");
    setEnd.putArray("questionIds").add(q1.toString());
    setEnd.putArray("outlineItemIds").add(outlineId.toString());
    setEnd.putArray("objectiveIds").add(objectiveId.toString());
    setEnd.put("feedbackMode", "SET_END");

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
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PUBLISHED"));
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
