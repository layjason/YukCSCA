package com.yukcsca.assessment.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.identity.application.AccessTokenService;
import com.yukcsca.identity.application.UserAccountStore;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
import com.yukcsca.support.ConfigurableFormalAssistancePolicy;
import com.yukcsca.support.PostgresTestConfiguration;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
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
class AssessmentLanguageHelpHttpIT {
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired UserAccountRepository users;
  @Autowired AccessTokenService accessTokens;
  @Autowired ConfigurableFormalAssistancePolicy formalPolicy;

  private String adminToken;
  private String studentToken;
  private String unassignedToken;

  @BeforeEach
  void setUp() {
    formalPolicy.setDisabled(false);
    jdbc.execute(
        "truncate table assessment_objective_evidence, assessment_assistance_event,"
            + " assessment_item_attempt, assessment_mistake, assessment_session,"
            + " student_terminology_review, student_terminology_notebook,"
            + " student_terminology_preview_progress, academic_term_pronunciation,"
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
    UserAccount unassigned =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("unassigned@example.com", "Unassigned", null, now));
    adminToken = accessTokens.issue(admin).value();
    studentToken = accessTokens.issue(student).value();
    unassignedToken = accessTokens.issue(unassigned).value();
  }

  @Test
  void englishItemDisablesLanguageHelp() throws Exception {
    Fixture fixture = publishPackage(false);
    completeLesson(fixture.lessonId());
    MvcResult started =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(startBody("CHECKPOINT", fixture.checkpointSetId(), "en")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.items[0].languageHelpAvailable").value(false))
            .andExpect(jsonPath("$.items[0].languageHelp").doesNotExist())
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    mvc.perform(
            post(
                    "/api/v1/assessment/sessions/{sid}/items/{iid}/language-help",
                    session.path("sessionId").asText(),
                    session.path("items").get(0).path("itemId").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"trigger\":\"STUDENT_REQUEST\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("LANGUAGE_ASSIST_DISABLED"));
  }

  @Test
  void chineseItemDisclosesSpansWithoutBlockingCheckpointOrRevalidation() throws Exception {
    Fixture fixture = publishPackage(true);
    completeLesson(fixture.lessonId());
    MvcResult started =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(startBody("CHECKPOINT", fixture.checkpointSetId(), "zh-CN")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.items[0].languageHelpAvailable").value(true))
            .andExpect(jsonPath("$.items[0].languageHelp").doesNotExist())
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    String sessionId = session.path("sessionId").asText();
    String itemId = session.path("items").get(0).path("itemId").asText();

    mvc.perform(
            post("/api/v1/assessment/sessions/{sid}/items/{iid}/language-help", sessionId, itemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"trigger\":\"STUDENT_REQUEST\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.languageHelp.disclosed").value(true))
        .andExpect(jsonPath("$.languageHelp.spans.length()").value(2))
        .andExpect(
            jsonPath("$.languageHelp.spans[*].surfaceForm")
                .value(org.hamcrest.Matchers.containsInAnyOrder("求", "单调递增")))
        .andExpect(jsonPath("$.item.languageHelp.spans.length()").value(2))
        .andExpect(jsonPath("$.sessionAssistanceSummary.languageAssistUsed").value(false))
        .andExpect(jsonPath("$.sessionAssistanceSummary.languageHelpDisclosed").value(true));

    mvc.perform(
            get("/api/v1/assessment/sessions/{sid}", sessionId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].languageHelp.spans.length()").value(2))
        .andExpect(jsonPath("$.assistanceSummary.languageAssistUsed").value(false));

    mvc.perform(
            put("/api/v1/assessment/sessions/{sid}/items/{iid}/answer", sessionId, itemId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"A\"}"))
        .andExpect(status().isOk());

    mvc.perform(
            post("/api/v1/assessment/sessions/{sid}/submit", sessionId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.checkpointPassed").value(true))
        .andExpect(jsonPath("$.strongAssistanceUsed").value(false));

    MvcResult mistakes =
        mvc.perform(
                get("/api/v1/assessment/mistakes")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andReturn();
    // Language assist on a correct item writes no mistake. Start a new session, miss, then
    // revalidation with only LANGUAGE_ASSIST still passes.
    MvcResult practice =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(startBody("TOPIC_PRACTICE", fixture.practiceSetId(), "zh-CN")))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode practiceSession = json.readTree(practice.getResponse().getContentAsString());
    String practiceId = practiceSession.path("sessionId").asText();
    String practiceItem = practiceSession.path("items").get(0).path("itemId").asText();
    mvc.perform(
            post(
                    "/api/v1/assessment/sessions/{sid}/items/{iid}/language-help",
                    practiceId,
                    practiceItem)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"trigger\":\"STUDENT_REQUEST\"}"))
        .andExpect(status().isOk());
    mvc.perform(
            put("/api/v1/assessment/sessions/{sid}/items/{iid}/answer", practiceId, practiceItem)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"B\"}"))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/assessment/sessions/{sid}/submit", practiceId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk());
    mistakes =
        mvc.perform(
                get("/api/v1/assessment/mistakes")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andReturn();
    String mistakeId =
        json.readTree(mistakes.getResponse().getContentAsString())
            .path("items")
            .get(0)
            .path("mistakeId")
            .asText();
    MvcResult mistakeDetail =
        mvc.perform(
                get("/api/v1/assessment/mistakes/{id}", mistakeId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andReturn();
    String remediationId =
        json.readTree(mistakeDetail.getResponse().getContentAsString())
            .path("remediationCandidates")
            .get(0)
            .path("resourceId")
            .asText();
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/remediation/{id}/progress", remediationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONTENT_COMPLETE\",\"resumeBlockIndex\":0}"))
        .andExpect(status().isOk());
    MvcResult reval =
        mvc.perform(
                post("/api/v1/assessment/mistakes/{id}/revalidation", mistakeId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode revalSession = json.readTree(reval.getResponse().getContentAsString());
    String revalId = revalSession.path("sessionId").asText();
    String revalItem = revalSession.path("items").get(0).path("itemId").asText();
    if (revalSession.path("items").get(0).path("languageHelpAvailable").asBoolean(false)) {
      mvc.perform(
              post(
                      "/api/v1/assessment/sessions/{sid}/items/{iid}/language-help",
                      revalId,
                      revalItem)
                  .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"trigger\":\"STUDENT_REQUEST\"}"))
          .andExpect(status().isOk());
    }
    mvc.perform(
            put("/api/v1/assessment/sessions/{sid}/items/{iid}/answer", revalId, revalItem)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"selectedOptionKey\":\"A\"}"))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/assessment/sessions/{sid}/submit", revalId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk());
    mvc.perform(
            get("/api/v1/assessment/mistakes/{id}", mistakeId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("REVALIDATION_PASSED"));
  }

  @Test
  void itemLookupStoresStemSnippetForCloze() throws Exception {
    Fixture fixture = publishPackage(true);
    completeLesson(fixture.lessonId());
    MvcResult started =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(startBody("CHECKPOINT", fixture.checkpointSetId(), "zh-CN")))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    String sessionId = session.path("sessionId").asText();
    String itemId = session.path("items").get(0).path("itemId").asText();

    ObjectNode lookup = json.createObjectNode();
    lookup.put("subject", "MATHEMATICS");
    lookup.put("explanationLanguage", "en");
    lookup.put("source", "ITEM");
    lookup.put("selectedText", "单调递增");
    lookup.put("sessionId", sessionId);
    lookup.put("itemId", itemId);
    MvcResult resolved =
        mvc.perform(
                post("/api/v1/academic/term-lookups")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(lookup)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.outcome").value("MATCHED"))
            .andExpect(jsonPath("$.alreadyInNotebook").value(false))
            .andReturn();
    String termId =
        json.readTree(resolved.getResponse().getContentAsString())
            .path("card")
            .path("termId")
            .asText();
    ObjectNode bookmark = json.createObjectNode();
    bookmark.put("subject", "MATHEMATICS");
    bookmark.put("explanationLanguage", "en");
    bookmark.put("source", "ITEM");
    bookmark.put("sessionId", sessionId);
    bookmark.put("itemId", itemId);
    MvcResult saved =
        mvc.perform(
                put("/api/v1/academic/terminology-notebook/{id}", termId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(bookmark)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.entry.metIn.place").value("CHECKPOINT"))
            .andReturn();
    JsonNode pending =
        json.readTree(saved.getResponse().getContentAsString()).path("entry").path("pendingReview");
    assertThat(pending.path("kind").asText()).isEqualTo("CONTEXT_CLOZE");
    assertThat(pending.path("snippet").asText()).contains("______");
    assertThat(pending.path("snippet").asText()).contains("求函数是否");
    assertThat(pending.path("snippet").asText()).doesNotContain("单调递增");
  }

  @Test
  void formalPolicyDisablesLanguageHelpWithDedicatedCode() throws Exception {
    Fixture fixture = publishPackage(true);
    completeLesson(fixture.lessonId());
    formalPolicy.setDisabled(true);
    MvcResult started =
        mvc.perform(
                post("/api/v1/assessment/sessions")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(startBody("CHECKPOINT", fixture.checkpointSetId(), "zh-CN")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.items[0].languageHelpAvailable").value(false))
            .andReturn();
    JsonNode session = json.readTree(started.getResponse().getContentAsString());
    mvc.perform(
            post(
                    "/api/v1/assessment/sessions/{sid}/items/{iid}/language-help",
                    session.path("sessionId").asText(),
                    session.path("items").get(0).path("itemId").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"trigger\":\"STUDENT_REQUEST\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORMAL_ASSISTANCE_DISABLED"));
  }

  @Test
  void discloseRequiresAuthentication() throws Exception {
    mvc.perform(
            post(
                    "/api/v1/assessment/sessions/{sid}/items/{iid}/language-help",
                    UUID.randomUUID(),
                    UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"trigger\":\"STUDENT_REQUEST\"}"))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post(
                    "/api/v1/assessment/sessions/{sid}/items/{iid}/language-help",
                    UUID.randomUUID(),
                    UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(unassignedToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"trigger\":\"STUDENT_REQUEST\"}"))
        .andExpect(status().isForbidden());
  }

  private record Fixture(UUID lessonId, UUID checkpointSetId, UUID practiceSetId) {}

  private Fixture publishPackage(boolean chineseTerms) throws Exception {
    UUID packageId = createPackage();
    UUID imageId = uploadOriginalImage();
    ObjectNode draft = validDraft(imageId, chineseTerms);
    UUID lessonId = null;
    UUID checkpointSetId = null;
    UUID practiceSetId = null;
    for (JsonNode resource : draft.path("resources")) {
      if ("LESSON".equals(resource.path("kind").asText())) {
        lessonId = UUID.fromString(resource.path("id").asText());
      }
    }
    for (JsonNode set : draft.path("assessmentSets")) {
      if ("CHECKPOINT".equals(set.path("purpose").asText())) {
        checkpointSetId = UUID.fromString(set.path("id").asText());
      }
      if ("TOPIC_PRACTICE".equals(set.path("purpose").asText())
          && "IMMEDIATE".equals(set.path("feedbackMode").asText())) {
        practiceSetId = UUID.fromString(set.path("id").asText());
      }
    }
    save(packageId, 0, draft);
    publish(packageId, 1);
    return new Fixture(lessonId, checkpointSetId, practiceSetId);
  }

  private void completeLesson(UUID lessonId) throws Exception {
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", lessonId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONTENT_COMPLETE\",\"resumeBlockIndex\":0}"))
        .andExpect(status().isOk());
  }

  private static String startBody(String purpose, UUID setId, String examLanguage) {
    return """
        {"purpose":"%s","subject":"MATHEMATICS","setId":"%s","examLanguage":"%s"}
        """
        .formatted(purpose, setId, examLanguage);
  }

  private ObjectNode validDraft(UUID imageId, boolean chineseTerms) {
    ObjectNode draft = json.createObjectNode();
    ObjectNode syllabus = draft.putObject("officialSyllabus");
    syllabus.put("subject", "MATHEMATICS");
    syllabus.put("authority", "China Scholastic Competency Assessment");
    syllabus.put("editionLabel", "2025");
    syllabus
        .putArray("sourceLinks")
        .addObject()
        .put("language", "en")
        .put("url", "https://csca.cn/en.pdf");
    syllabus
        .withArray("sourceLinks")
        .addObject()
        .put("language", "zh-CN")
        .put("url", "https://csca.cn/zh.pdf");
    syllabus.put("retrievedAt", "2026-07-31T00:00:00Z");
    syllabus.put("lastCheckedAt", "2026-07-31T00:00:00Z");
    syllabus.set("publishedOn", notStated());
    syllabus.set("effectiveOn", notStated());
    syllabus.set("updatedOn", notStated());
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
    localized(outline.putObject("summary"));
    UUID objectiveId = UUID.randomUUID();
    ObjectNode objective = draft.withArray("learningObjectives").addObject();
    objective.put("id", objectiveId.toString());
    localized(objective.putObject("title"));
    objective
        .putArray("mappings")
        .addObject()
        .put("outlineItemId", outlineId.toString())
        .put("rationale", "aligned");
    UUID lessonId = UUID.randomUUID();
    UUID remediationId = UUID.randomUUID();
    UUID previewId = UUID.randomUUID();
    UUID findId = UUID.randomUUID();
    UUID increaseId = UUID.randomUUID();
    for (String kind : new String[] {"LESSON", "TERMINOLOGY", "REMEDIATION"}) {
      ObjectNode resource = draft.withArray("resources").addObject();
      UUID id =
          "LESSON".equals(kind) ? lessonId : "REMEDIATION".equals(kind) ? remediationId : previewId;
      resource.put("id", id.toString());
      resource.put("kind", kind);
      localized(resource.putObject("title"));
      resource.putArray("outlineItemIds").add(outlineId.toString());
      resource.putArray("objectiveIds").add(objectiveId.toString());
      ObjectNode version = resource.putArray("versions").addObject();
      version.put("language", "id");
      version.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Content");
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
            .put("altText", "diagram")
            .putNull("caption");
      }
      if ("LESSON".equals(kind) && chineseTerms) {
        resource.putArray("requiredTermIds").add(findId.toString()).add(increaseId.toString());
      }
      resource.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    }
    if (chineseTerms) {
      ObjectNode find = draft.withArray("terms").addObject();
      find.put("id", findId.toString());
      find.put("termClass", "EXAM_INSTRUCTION");
      ObjectNode fs = find.putArray("surfaceForms").addObject();
      fs.put("text", "求");
      fs.put("pinyin", "qiú");
      find.putObject("definitions").put("english", "find");
      find.put("englishEquivalent", "find");

      find.putArray("outlineItemIds");
      ObjectNode increase = draft.withArray("terms").addObject();
      increase.put("id", increaseId.toString());
      increase.put("termClass", "TOPIC_TERM");
      ObjectNode is = increase.putArray("surfaceForms").addObject();
      is.put("text", "单调递增");
      is.put("pinyin", "dāndiào dìzēng");
      increase.putObject("definitions").put("english", "increasing");
      increase.put("englishEquivalent", "monotonically increasing");

      increase.putArray("outlineItemIds").add(outlineId.toString());
      ObjectNode extra = draft.withArray("terms").addObject();
      extra.put("id", UUID.randomUUID().toString());
      extra.put("termClass", "TOPIC_TERM");
      ObjectNode es = extra.putArray("surfaceForms").addObject();
      es.put("text", "导数");
      es.put("pinyin", "dǎoshù");
      extra.putObject("definitions").put("english", "derivative");
      extra.put("englishEquivalent", "derivative");

      extra.putArray("outlineItemIds").add(outlineId.toString());
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
      String stem = "Question " + (index + 1);
      question.putArray("stem").addObject().put("kind", "TEXT").put("text", stem);
      ObjectNode optionA = question.putArray("options").addObject();
      optionA.put("key", "A");
      optionA.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Correct");
      ObjectNode optionB = question.withArray("options").addObject();
      optionB.put("key", "B");
      optionB.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Alternative");
      question.put("correctOptionKey", "A");
      ObjectNode explanation = question.putArray("explanations").addObject();
      explanation.put("language", "id");
      explanation.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Penjelasan");
      question.putArray("outlineItemIds").add(outlineId.toString());
      question.putArray("objectiveIds").add(objectiveId.toString());
      question.putArray("relatedResourceIds").add(remediationId.toString());
      ObjectNode standard = question.putArray("hintTiers").addObject();
      standard.put("strength", "STANDARD");
      standard.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Standard hint");
      question.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
      mockQuestions
          .addObject()
          .put("questionId", questionId.toString())
          .put("points", index < 4 ? 3 : 2);
    }
    if (chineseTerms) {
      UUID zhId = UUID.randomUUID();
      q0 = zhId;
      ObjectNode zh = questions.addObject();
      zh.put("id", zhId.toString());
      zh.put("examLanguage", "zh-CN");
      zh.put("difficulty", "STANDARD");
      zh.putArray("stem").addObject().put("kind", "TEXT").put("text", "求函数是否单调递增且导数为正。");
      ObjectNode zhA = zh.putArray("options").addObject();
      zhA.put("key", "A");
      zhA.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Correct");
      ObjectNode zhB = zh.withArray("options").addObject();
      zhB.put("key", "B");
      zhB.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Alternative");
      zh.put("correctOptionKey", "A");
      ObjectNode zhExp = zh.putArray("explanations").addObject();
      zhExp.put("language", "id");
      zhExp.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Penjelasan");
      zh.putArray("outlineItemIds").add(outlineId.toString());
      zh.putArray("objectiveIds").add(objectiveId.toString());
      zh.putArray("relatedResourceIds").add(remediationId.toString());
      ObjectNode zhHint = zh.putArray("hintTiers").addObject();
      zhHint.put("strength", "STANDARD");
      zhHint.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Standard hint");
      zh.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    }
    ObjectNode checkpoint = draft.withArray("assessmentSets").addObject();
    checkpoint.put("id", UUID.randomUUID().toString());
    checkpoint.put("purpose", "CHECKPOINT");
    localized(checkpoint.putObject("title"));
    checkpoint.put("examLanguage", chineseTerms ? "zh-CN" : "en");
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
    localized(practice.putObject("title"));
    practice.put("examLanguage", chineseTerms ? "zh-CN" : "en");
    practice.put("difficulty", "STANDARD");
    practice.putArray("questionIds").add(q0.toString());
    practice.putArray("outlineItemIds").add(outlineId.toString());
    practice.putArray("objectiveIds").add(objectiveId.toString());
    practice.put("feedbackMode", "IMMEDIATE");
    ObjectNode mock = draft.withArray("mocks").addObject();
    mock.put("id", UUID.randomUUID().toString());
    mock.put("title", "Mock");
    mock.put("examLanguage", "en");
    mock.put("durationMinutes", 60);
    mock.put("totalPoints", 100);
    mock.put("questionCount", 48);
    mock.put("questionType", "SINGLE_ANSWER");
    mock.set("questions", mockQuestions);
    mock.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    return draft;
  }

  private ObjectNode notStated() {
    ObjectNode date = json.createObjectNode();
    date.put("status", "NOT_STATED");
    date.putNull("date");
    return date;
  }

  private static void localized(ObjectNode node) {
    node.put("indonesian", "id");
    node.put("english", "en");
    node.put("simplifiedChinese", "zh");
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
    MvcResult published =
        mvc.perform(
                post("/api/v1/admin/academic-packages/{id}:publish", packageId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"expectedDraftRevision\":" + expected + "}"))
            .andReturn();
    if (published.getResponse().getStatus() != 200) {
      throw new AssertionError(
          "publish failed: "
              + published.getResponse().getStatus()
              + " "
              + published.getResponse().getContentAsString());
    }
  }

  private UUID uploadOriginalImage() throws Exception {
    BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB);
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    ImageIO.write(image, "png", bytes);
    MockMultipartFile file =
        new MockMultipartFile("file", "diagram.png", "image/png", bytes.toByteArray());
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

  private static String bearer(String token) {
    return "Bearer " + token;
  }
}
