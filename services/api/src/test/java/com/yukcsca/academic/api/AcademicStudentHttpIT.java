package com.yukcsca.academic.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.academic.infrastructure.AcademicImageRepository;
import com.yukcsca.academic.infrastructure.AcademicPackageRepository;
import com.yukcsca.academic.infrastructure.AcademicRevisionRepository;
import com.yukcsca.academic.infrastructure.StudentContentProgressRepository;
import com.yukcsca.identity.application.AccessTokenService;
import com.yukcsca.identity.application.UserAccountStore;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
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
class AcademicStudentHttpIT {
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired UserAccountRepository users;
  @Autowired AcademicPackageRepository packages;
  @Autowired AcademicRevisionRepository revisions;
  @Autowired AcademicImageRepository images;
  @Autowired StudentContentProgressRepository progress;
  @Autowired AccessTokenService accessTokens;

  private String adminToken;
  private String studentToken;
  private String unassignedToken;
  private UUID studentId;

  @BeforeEach
  void setUp() {
    jdbc.execute(
        "truncate table student_content_progress, academic_audit, academic_image, academic_revision, "
            + "academic_package, user_account cascade");
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
    studentId = student.getId();
    UserAccount unassigned =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("other@example.com", "Other", null, now));
    adminToken = accessTokens.issue(admin).value();
    studentToken = accessTokens.issue(student).value();
    unassignedToken = accessTokens.issue(unassigned).value();
  }

  @Test
  void studentApisRequireAuthenticationAndStudentRole() throws Exception {
    mvc.perform(get("/api/v1/academic/packages"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

    mvc.perform(
            get("/api/v1/academic/packages")
                .header(HttpHeaders.AUTHORIZATION, bearer(unassignedToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

    mvc.perform(
            get("/api/v1/academic/packages").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  void emptyPublishedListIsHonestAndUnknownSubjectIsNotFound() throws Exception {
    mvc.perform(
            get("/api/v1/academic/packages")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(0));

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void studentBrowsesLessonAndProgressWithoutMasteryLeakage() throws Exception {
    PublishedFixture fixture = publishValidPackage();

    mvc.perform(
            get("/api/v1/academic/packages")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].subject").value("MATHEMATICS"))
        .andExpect(jsonPath("$[0].activeRevision.id").exists())
        .andExpect(jsonPath("$[0].examLanguages").isArray());

    MvcResult browse =
        mvc.perform(
                get("/api/v1/academic/packages/MATHEMATICS")
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.package.subject").value("MATHEMATICS"))
            .andExpect(jsonPath("$.officialSource.authority").exists())
            .andExpect(jsonPath("$.officialSource.sourceLinks.length()").value(2))
            .andExpect(jsonPath("$.outline[0].productCoverage").value("FULLY_COVERED"))
            .andExpect(
                jsonPath("$.outline[0].lessons[0].resourceId").value(fixture.lessonId().toString()))
            .andExpect(
                jsonPath("$.outline[0].lessons[0].contentProgress.status").value("NOT_STARTED"))
            .andExpect(jsonPath("$.continueLesson").isEmpty())
            .andExpect(jsonPath("$.package.draft").doesNotExist())
            .andExpect(jsonPath("$..correctOptionKey").doesNotExist())
            .andExpect(jsonPath("$..questions").doesNotExist())
            .andExpect(jsonPath("$..mocks").doesNotExist())
            .andReturn();
    assertThat(browse.getResponse().getContentAsString()).doesNotContain("correctOptionKey");

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", fixture.lessonId())
                .param("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.body.availability").value("AVAILABLE"))
        .andExpect(jsonPath("$.body.blocks.length()").value(3))
        .andExpect(jsonPath("$.body.blocks[0].kind").value("TEXT"))
        .andExpect(jsonPath("$.body.blocks[1].kind").value("MATH"))
        .andExpect(jsonPath("$.body.blocks[2].kind").value("IMAGE"))
        .andExpect(jsonPath("$.availableExplanationLanguages[0]").value("id"))
        .andExpect(jsonPath("$.contentProgress.status").value("NOT_STARTED"))
        .andExpect(jsonPath("$.body.blocks[0].text").value("Content for LESSON"));

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", fixture.lessonId())
                .param("explanationLanguage", "en")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.body.availability").value("LANGUAGE_UNAVAILABLE"))
        .andExpect(jsonPath("$.body.requestedLanguage").value("en"))
        .andExpect(jsonPath("$.body.blocks").doesNotExist());

    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\",\"resumeBlockIndex\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
        .andExpect(jsonPath("$.resumeBlockIndex").value(2))
        .andExpect(jsonPath("$.updatedAt").exists());

    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\",\"resumeBlockIndex\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    assertThat(progress.count()).isEqualTo(1);

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.continueLesson.resourceId").value(fixture.lessonId().toString()))
        .andExpect(jsonPath("$.continueLesson.contentProgress.status").value("IN_PROGRESS"));

    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONTENT_COMPLETE\",\"resumeBlockIndex\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CONTENT_COMPLETE"));

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", fixture.lessonId())
                .param("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contentProgress.status").value("CONTENT_COMPLETE"))
        .andExpect(jsonPath("$.contentProgress.resumeBlockIndex").value(2))
        .andExpect(jsonPath("$.mastery").doesNotExist());

    // Re-read may update resume index but must not demote CONTENT_COMPLETE (no reset rules).
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\",\"resumeBlockIndex\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CONTENT_COMPLETE"))
        .andExpect(jsonPath("$.resumeBlockIndex").value(1));

    mvc.perform(
            get("/api/v1/academic/images/{id}", fixture.imageId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "image/png"));

    UUID orphanImage = uploadOriginalImage();
    mvc.perform(
            get("/api/v1/academic/images/{id}", orphanImage)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isNotFound());

    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"MASTERED\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("CONTENT_PROGRESS_VALIDATION_FAILED"));

    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.violations[0].path").value("resumeBlockIndex"));
  }

  @Test
  void resumeBlockIndexIsClampedWhenLanguageVersionIsShorter() throws Exception {
    PublishedFixture fixture = publishValidPackage();
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\",\"resumeBlockIndex\":99}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resumeBlockIndex").value(99));

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", fixture.lessonId())
                .param("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contentProgress.resumeBlockIndex").value(2));
  }

  @Test
  void progressUpsertIgnoresUnknownExpectedPackageRevisionIdWithoutFailing() throws Exception {
    PublishedFixture fixture = publishValidPackage();
    UUID unknownRevision = UUID.fromString("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");

    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", fixture.lessonId())
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"status\":\"IN_PROGRESS\",\"resumeBlockIndex\":1,"
                        + "\"expectedPackageRevisionId\":\""
                        + unknownRevision
                        + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
        .andExpect(jsonPath("$.resumeBlockIndex").value(1));

    assertThat(progress.count()).isEqualTo(1);
    UUID storedRevision =
        jdbc.queryForObject(
            "select last_revision_id from student_content_progress where resource_id = ?",
            UUID.class,
            fixture.lessonId());
    assertThat(storedRevision).isNotEqualTo(unknownRevision);
    assertThat(
            revisions.findById(storedRevision).isPresent()
                || packages.findById(fixture.packageId()).isPresent())
        .isTrue();
    assertThat(revisions.findById(storedRevision)).isPresent();
  }

  private record PublishedFixture(UUID packageId, UUID lessonId, UUID imageId) {}

  private PublishedFixture publishValidPackage() throws Exception {
    UUID packageId = createPackage();
    UUID imageId = uploadOriginalImage();
    ObjectNode draft = validDraft(imageId);
    UUID lessonId = UUID.fromString(findLessonId(draft));
    save(packageId, 0, draft);
    publish(packageId, 1);
    return new PublishedFixture(packageId, lessonId, imageId);
  }

  private String findLessonId(ObjectNode draft) {
    for (JsonNode resource : draft.path("resources")) {
      if ("LESSON".equals(resource.path("kind").asText())) {
        return resource.path("id").asText();
      }
    }
    throw new IllegalStateException("LESSON missing from draft fixture");
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
    mvc.perform(
            put("/api/v1/admin/academic-packages/{id}/draft", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(saveRequest(expected, draft)))
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

  private String saveRequest(long expected, ObjectNode draft) throws Exception {
    ObjectNode request = json.createObjectNode();
    request.put("expectedDraftRevision", expected);
    request.set("draft", draft);
    return json.writeValueAsString(request);
  }

  private ObjectNode emptyDraft() {
    ObjectNode draft = json.createObjectNode();
    draft.putObject("officialSyllabus").put("subject", "MATHEMATICS");
    draft.putArray("outlineItems");
    draft.putArray("learningObjectives");
    draft.putArray("resources");
    draft.putArray("questions");
    draft.putArray("mocks");
    return draft;
  }

  private ObjectNode validDraft(UUID imageId) {
    ObjectNode draft = emptyDraft();
    ObjectNode syllabus = (ObjectNode) draft.path("officialSyllabus");
    syllabus.put("authority", "China Scholastic Competency Assessment");
    syllabus.put("editionLabel", "2025");
    var sourceLinks = syllabus.putArray("sourceLinks");
    sourceLinks
        .addObject()
        .put("language", "en")
        .put("url", "https://csca.cn/files/CSCA%20Mathematics%20Examination%20Syllabus-2025.pdf");
    sourceLinks
        .addObject()
        .put("language", "zh-CN")
        .put(
            "url",
            "https://csca.cn/files/CSCA%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2-%E6%95%B0%E5%AD%A6-2025%E7%89%88.pdf");
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
    for (int index = 0; index < 48; index++) {
      UUID questionId = UUID.randomUUID();
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

  private static String bearer(String token) {
    return "Bearer " + token;
  }
}
