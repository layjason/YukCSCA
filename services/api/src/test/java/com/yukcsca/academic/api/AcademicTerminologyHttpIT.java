package com.yukcsca.academic.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
class AcademicTerminologyHttpIT {
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
        "truncate table student_terminology_review, student_terminology_notebook,"
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
            .save(UserAccount.createGoogleUser("other@example.com", "Other", null, now));
    adminToken = accessTokens.issue(admin).value();
    studentToken = accessTokens.issue(student).value();
    unassignedToken = accessTokens.issue(unassigned).value();
  }

  @Test
  void terminologyApisRequireStudent() throws Exception {
    UUID id = UUID.randomUUID();
    mvc.perform(get("/api/v1/academic/packages/MATHEMATICS/terminology/{id}", id))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/terminology/{id}", id)
                .param("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(unassignedToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/terminology/{id}", id)
                .param("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isForbidden());
  }

  @Test
  void previewLookupNotebookAndAudioFollowContract() throws Exception {
    TermFixture fixture = publishChineseTerms();

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/terminology/{id}", fixture.previewId())
                .param("explanationLanguage", "en")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andExpect(jsonPath("$.terms.length()").value(2))
        .andExpect(jsonPath("$.terms[0].primarySurface.pinyin").exists())
        .andExpect(jsonPath("$.terms[0].definition.availability").value("AVAILABLE"))
        .andExpect(jsonPath("$.terms[0].englishEquivalent").value("find"))
        .andExpect(jsonPath("$.matchingPairsAvailable").value(true))
        .andExpect(jsonPath("$.previewProgress.status").value("NOT_STARTED"));

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/terminology/{id}", fixture.previewId())
                .param("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.terms[0].definition.availability").value("LANGUAGE_UNAVAILABLE"))
        .andExpect(jsonPath("$.previewProgress.status").value("NOT_STARTED"));

    Integer notebookBefore =
        jdbc.queryForObject("select count(*) from student_terminology_notebook", Integer.class);
    assertThat(notebookBefore).isZero();

    mvc.perform(
            put(
                    "/api/v1/academic/packages/MATHEMATICS/terminology/{id}/progress",
                    fixture.previewId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

    mvc.perform(
            put(
                    "/api/v1/academic/packages/MATHEMATICS/terminology/{id}/progress",
                    fixture.previewId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PREVIEW_COMPLETE\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PREVIEW_COMPLETE"));

    Integer notebookAfter =
        jdbc.queryForObject("select count(*) from student_terminology_notebook", Integer.class);
    assertThat(notebookAfter).isEqualTo(2);

    mvc.perform(
            put(
                    "/api/v1/academic/packages/MATHEMATICS/terminology/{id}/progress",
                    fixture.previewId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PREVIEW_COMPLETE\"}"))
        .andExpect(status().isOk());
    Integer notebookAgain =
        jdbc.queryForObject("select count(*) from student_terminology_notebook", Integer.class);
    assertThat(notebookAgain).isEqualTo(2);

    ObjectNode check = json.createObjectNode();
    ArrayNode pairs = check.putArray("pairs");
    pairs
        .addObject()
        .put("termId", fixture.findId().toString())
        .put("selectedMatchKey", fixture.findId().toString());
    pairs
        .addObject()
        .put("termId", fixture.increaseId().toString())
        .put("selectedMatchKey", "wrong");
    mvc.perform(
            post(
                    "/api/v1/academic/packages/MATHEMATICS/terminology/{id}/checks",
                    fixture.previewId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(check)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.kind").value("MATCH_PAIRS"))
        .andExpect(jsonPath("$.correctCount").value(1))
        .andExpect(jsonPath("$.totalCount").value(2));

    ObjectNode matched = json.createObjectNode();
    matched.put("subject", "MATHEMATICS");
    matched.put("explanationLanguage", "en");
    matched.put("source", "LESSON");
    matched.put("selectedText", "单调递增");
    matched.put("resourceId", fixture.lessonId().toString());
    mvc.perform(
            post("/api/v1/academic/term-lookups")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(matched)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.outcome").value("MATCHED"))
        .andExpect(jsonPath("$.alreadyInNotebook").value(true))
        .andExpect(jsonPath("$.entry.metIn.place").value("LESSON"));

    ObjectNode miss = json.createObjectNode();
    miss.put("subject", "MATHEMATICS");
    miss.put("explanationLanguage", "en");
    miss.put("source", "LESSON");
    miss.put("selectedText", "不是术语");
    miss.put("resourceId", fixture.lessonId().toString());
    mvc.perform(
            post("/api/v1/academic/term-lookups")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(miss)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.outcome").value("NOT_IN_BANK"))
        .andExpect(jsonPath("$.card").doesNotExist());
    assertThat(
            jdbc.queryForObject("select count(*) from student_terminology_notebook", Integer.class))
        .isEqualTo(2);

    mvc.perform(
            get("/api/v1/academic/terminology-notebook")
                .param("explanationLanguage", "en")
                .param("dueOnly", "true")
                .param("classGroup", "TOPIC_TERM")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.items[0].termClass").value("TOPIC_TERM"))
        .andExpect(jsonPath("$.items[0].pendingReview.kind").exists());

    MvcResult entry =
        mvc.perform(
                get("/api/v1/academic/terminology-notebook/{id}", fixture.increaseId())
                    .param("explanationLanguage", "en")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.entry.due").value(true))
            .andReturn();
    JsonNode pending =
        json.readTree(entry.getResponse().getContentAsString()).path("entry").path("pendingReview");
    ObjectNode review = json.createObjectNode();
    review.put("kind", pending.path("kind").asText());
    review.put("selectedOptionKey", fixture.increaseId().toString());
    mvc.perform(
            post("/api/v1/academic/terminology-notebook/{id}/reviews", fixture.increaseId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(review)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.correct").value(true))
        .andExpect(jsonPath("$.familiarity").value("FAMILIAR"))
        .andExpect(jsonPath("$.due").value(false));

    mvc.perform(
            get("/api/v1/academic/terms/{id}/audio", fixture.findId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"));

    mvc.perform(
            get("/api/v1/academic/terms/{id}/audio", UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isNotFound());

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", fixture.lessonId())
                .param("explanationLanguage", "zh-CN")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.terminology.rail.length()").value(2))
        .andExpect(jsonPath("$.terminology.spans").isArray());
  }

  @Test
  void englishPackageOmitsTerminologyChrome() throws Exception {
    UUID packageId = createPackage();
    UUID imageId = uploadOriginalImage();
    ObjectNode draft = validDraft(imageId);
    save(packageId, 0, draft);
    publish(packageId, 1);
    UUID lessonId = UUID.fromString(findKind(draft, "LESSON"));

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.outline[0].lessons[0].terminologyPreview").doesNotExist());

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", lessonId)
                .param("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.terminology").doesNotExist());
  }

  @Test
  void formalPolicyDeniesPreviewWrite() throws Exception {
    TermFixture fixture = publishChineseTerms();
    formalPolicy.setDisabled(true);
    mvc.perform(
            put(
                    "/api/v1/academic/packages/MATHEMATICS/terminology/{id}/progress",
                    fixture.previewId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORMAL_ASSISTANCE_DISABLED"));
  }

  private record TermFixture(UUID previewId, UUID lessonId, UUID findId, UUID increaseId) {}

  private TermFixture publishChineseTerms() throws Exception {
    UUID packageId = createPackage();
    UUID imageId = uploadOriginalImage();
    ObjectNode draft = validDraft(imageId);
    UUID findId = UUID.randomUUID();
    UUID increaseId = UUID.randomUUID();
    UUID outlineId = UUID.fromString(draft.path("outlineItems").get(0).path("id").asText());
    ObjectNode find = draft.withArray("terms").addObject();
    find.put("id", findId.toString());
    find.put("termClass", "EXAM_INSTRUCTION");
    ObjectNode findSurface = find.putArray("surfaceForms").addObject();
    findSurface.put("text", "求");
    findSurface.put("pinyin", "qiú");
    find.putObject("definitions").put("english", "find");
    find.put("englishEquivalent", "find");
    find.put("domainMeaning", "Ask for a value.");
    find.putArray("outlineItemIds");
    ObjectNode increase = draft.withArray("terms").addObject();
    increase.put("id", increaseId.toString());
    increase.put("termClass", "TOPIC_TERM");
    ObjectNode incSurface = increase.putArray("surfaceForms").addObject();
    incSurface.put("text", "单调递增");
    incSurface.put("pinyin", "dāndiào dìzēng");
    increase.putObject("definitions").put("english", "monotonically increasing");
    increase.put("englishEquivalent", "monotonically increasing");
    increase.put("domainMeaning", "A function increases on an interval.");
    increase.put("example", "函数在区间上单调递增");
    increase.putArray("outlineItemIds").add(outlineId.toString());
    UUID previewId = null;
    UUID lessonId = null;
    for (JsonNode resource : draft.path("resources")) {
      if ("TERMINOLOGY".equals(resource.path("kind").asText())) {
        previewId = UUID.fromString(resource.path("id").asText());
        ((ObjectNode) resource)
            .putArray("requiredTermIds")
            .add(findId.toString())
            .add(increaseId.toString());
      }
      if ("LESSON".equals(resource.path("kind").asText())) {
        lessonId = UUID.fromString(resource.path("id").asText());
        ObjectNode zh = ((ObjectNode) resource).withArray("versions").addObject();
        zh.put("language", "zh-CN");
        zh.putArray("blocks").addObject().put("kind", "TEXT").put("text", "求函数是否单调递增。");
      }
    }
    save(packageId, 0, draft);
    publish(packageId, 1);
    return new TermFixture(previewId, lessonId, findId, increaseId);
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

  private ObjectNode validDraft(UUID imageId) {
    ObjectNode draft = json.createObjectNode();
    draft.putObject("officialSyllabus").put("subject", "MATHEMATICS");
    ObjectNode syllabus = (ObjectNode) draft.path("officialSyllabus");
    syllabus.put("authority", "China Scholastic Competency Assessment");
    syllabus.put("editionLabel", "2025");
    var sourceLinks = syllabus.putArray("sourceLinks");
    sourceLinks.addObject().put("language", "en").put("url", "https://csca.cn/files/en.pdf");
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
    for (String kind : new String[] {"LESSON", "TERMINOLOGY", "REMEDIATION"}) {
      ObjectNode resource = draft.withArray("resources").addObject();
      resource.put("id", UUID.randomUUID().toString());
      resource.put("kind", kind);
      localized(resource.putObject("title"), kind, kind, kind);
      resource.putArray("outlineItemIds").add(outlineId.toString());
      resource.putArray("objectiveIds").add(objectiveId.toString());
      ObjectNode version = resource.putArray("versions").addObject();
      version.put("language", "id");
      version.putArray("blocks").addObject().put("kind", "TEXT").put("text", "Content for " + kind);
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
    for (int index = 0; index < 48; index++) {
      UUID questionId = UUID.randomUUID();
      ObjectNode question = questions.addObject();
      question.put("id", questionId.toString());
      question.put("examLanguage", "en");
      question.put("difficulty", "STANDARD");
      question
          .putArray("stem")
          .addObject()
          .put("kind", "TEXT")
          .put("text", "Question " + (index + 1));
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
      question.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
      mockQuestions
          .addObject()
          .put("questionId", questionId.toString())
          .put("points", index < 4 ? 3 : 2);
    }
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

  private static String findKind(ObjectNode draft, String kind) {
    for (JsonNode resource : draft.path("resources")) {
      if (kind.equals(resource.path("kind").asText())) {
        return resource.path("id").asText();
      }
    }
    throw new IllegalStateException(kind + " missing");
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
