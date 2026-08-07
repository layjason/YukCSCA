package com.yukcsca.academic.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.academic.application.AcademicImageStore;
import com.yukcsca.academic.application.AcademicRevisionStore;
import com.yukcsca.academic.infrastructure.AcademicAuditRepository;
import com.yukcsca.academic.infrastructure.AcademicImageRepository;
import com.yukcsca.academic.infrastructure.AcademicPackageRepository;
import com.yukcsca.academic.infrastructure.AcademicRevisionRepository;
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
class AcademicAdminHttpIT {
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired UserAccountRepository users;
  @Autowired AcademicPackageRepository packages;
  @Autowired AcademicRevisionRepository revisions;
  @Autowired AcademicImageRepository images;
  @Autowired AcademicAuditRepository audits;
  @Autowired AccessTokenService accessTokens;

  private String adminToken;
  private String unassignedToken;

  @BeforeEach
  void setUp() {
    jdbc.execute(
        "truncate table academic_audit, academic_image, academic_revision, academic_package, "
            + "user_account cascade");
    Instant now = Instant.parse("2026-08-01T00:00:00Z");
    UserAccount admin =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("admin@example.com", "Admin", null, now));
    admin.activateAdmin(now);
    ((UserAccountStore) users).save(admin);
    UserAccount unassigned =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("other@example.com", "Other", null, now));
    adminToken = accessTokens.issue(admin).value();
    unassignedToken = accessTokens.issue(unassigned).value();
  }

  @Test
  void adminBoundaryRequiresAuthenticationAndAdminRole() throws Exception {
    mvc.perform(get("/api/v1/admin/academic-packages"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    mvc.perform(
            get("/api/v1/admin/academic-packages")
                .header(HttpHeaders.AUTHORIZATION, bearer(unassignedToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    assertThat(packages.count()).isZero();

    mvc.perform(
            post("/api/v1/admin/academic-packages")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"subject\":\"PHYSICS\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("ACADEMIC_VALIDATION_FAILED"))
        .andExpect(jsonPath("$.violations[0].path").value("subject"));
  }

  @Test
  void draftSaveRejectsStaleRevisionAndIncompletePublicationWithoutLosingDraft() throws Exception {
    UUID packageId = createPackage();
    ObjectNode incomplete = emptyDraft();

    mvc.perform(
            get("/api/v1/admin/academic-packages")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(packageId.toString()));
    mvc.perform(
            post("/api/v1/admin/academic-packages")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"subject\":\"MATHEMATICS\"}"))
        .andExpect(status().isConflict());
    mvc.perform(
            post("/api/v1/admin/academic-packages/{id}:publish", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("ACADEMIC_VALIDATION_FAILED"))
        .andExpect(jsonPath("$.violations[0].path").value("expectedDraftRevision"));

    mvc.perform(
            put("/api/v1/admin/academic-packages/{id}/draft", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(saveRequest(0, incomplete)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.draftRevision").value(1))
        .andExpect(jsonPath("$.hasUnpublishedChanges").value(true));

    mvc.perform(
            put("/api/v1/admin/academic-packages/{id}/draft", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(saveRequest(0, incomplete)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_REVISION"));

    mvc.perform(
            post("/api/v1/admin/academic-packages/{id}:publish", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedDraftRevision\":1}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("ACADEMIC_VALIDATION_FAILED"))
        .andExpect(jsonPath("$.violations").isArray());

    assertThat(revisions.count()).isZero();
    mvc.perform(
            get("/api/v1/admin/academic-packages/{id}", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"))
        .andExpect(jsonPath("$.draftRevision").value(1));
  }

  @Test
  void imageUploadReencodesValidPngAndRejectsMimeMismatch() throws Exception {
    byte[] png = png();
    MockMultipartFile file = new MockMultipartFile("file", "diagram.png", "image/png", png);
    MockMultipartFile provenance =
        new MockMultipartFile(
            "provenance",
            "",
            MediaType.APPLICATION_JSON_VALUE,
            "{\"origin\":\"YUKCSCA_ORIGINAL\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));

    MvcResult upload =
        mvc.perform(
                multipart("/api/v1/admin/academic-images")
                    .file(file)
                    .file(provenance)
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
            .andExpect(status().isCreated())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.mediaType").value("image/png"))
            .andExpect(jsonPath("$.width").value(2))
            .andExpect(jsonPath("$.height").value(2))
            .andReturn();
    UUID imageId =
        UUID.fromString(
            json.readTree(upload.getResponse().getContentAsString()).path("id").asText());

    mvc.perform(
            get("/api/v1/admin/academic-images/{id}", imageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "image/png"));

    MockMultipartFile mismatched = new MockMultipartFile("file", "diagram.jpg", "image/jpeg", png);
    mvc.perform(
            multipart("/api/v1/admin/academic-images")
                .file(mismatched)
                .file(provenance)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.violations[0].path").value("file"));

    MockMultipartFile missingPermission =
        new MockMultipartFile(
            "provenance",
            "",
            MediaType.APPLICATION_JSON_VALUE,
            "{\"origin\":\"LICENSED\",\"provider\":\"Publisher\"}"
                .getBytes(java.nio.charset.StandardCharsets.UTF_8));
    mvc.perform(
            multipart("/api/v1/admin/academic-images")
                .file(file)
                .file(missingPermission)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.violations[0].code").value("MISSING_PERMISSION"));
    assertThat(images.count()).isEqualTo(1);
    assertThat(audits.count()).isEqualTo(3);
  }

  @Test
  void validPackagePublishesIdempotentlyThenSupportsCorrectionAndArchive() throws Exception {
    UUID packageId = createPackage();
    UUID imageId = uploadOriginalImage();
    ObjectNode valid = validDraft(imageId);
    save(packageId, 0, valid, 1);

    MvcResult firstPublication = publish(packageId, 1, 1).andReturn();
    JsonNode firstBody = json.readTree(firstPublication.getResponse().getContentAsString());
    String firstRevisionId = firstBody.path("activeRevision").path("id").asText();
    String firstRevisionContent =
        ((AcademicRevisionStore) revisions)
            .findById(UUID.fromString(firstRevisionId))
            .orElseThrow()
            .getContent();
    assertThat(firstBody.path("hasUnpublishedChanges").asBoolean()).isFalse();
    assertThat(
            firstBody
                .path("draft")
                .path("outlineItems")
                .get(0)
                .path("summary")
                .path("indonesian")
                .asText())
        .isEqualTo("Ringkasan");
    assertThat(
            firstBody
                .path("draft")
                .path("questions")
                .get(0)
                .path("provenance")
                .path("authorUserId")
                .asText())
        .isNotBlank();
    assertThat(
            firstBody
                .path("draft")
                .path("questions")
                .get(0)
                .path("provenance")
                .path("reviewedByUserId")
                .asText())
        .isNotBlank();

    publish(packageId, 1, 1).andExpect(jsonPath("$.activeRevision.id").value(firstRevisionId));
    assertThat(revisions.count()).isEqualTo(1);

    ObjectNode broken = valid.deepCopy();
    ((ObjectNode) broken.path("questions").get(0)).put("correctOptionKey", "missing");
    save(packageId, 1, broken, 2);
    mvc.perform(
            post("/api/v1/admin/academic-packages/{id}:publish", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedDraftRevision\":2}"))
        .andExpect(status().isBadRequest());
    assertThat(revisions.count()).isEqualTo(1);

    save(packageId, 2, valid, 3);
    publish(packageId, 3, 2)
        .andExpect(
            jsonPath("$.activeRevision.id").value(org.hamcrest.Matchers.not(firstRevisionId)));
    assertThat(revisions.count()).isEqualTo(2);
    assertThat(
            ((AcademicRevisionStore) revisions)
                .findById(UUID.fromString(firstRevisionId))
                .orElseThrow()
                .getContent())
        .isEqualTo(firstRevisionContent);
    assertThat(((AcademicImageStore) images).findById(imageId).orElseThrow().getReviewedByUserId())
        .isNotNull();

    mvc.perform(
            post("/api/v1/admin/academic-packages/{id}:archive", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedDraftRevision\":3,\"reason\":\"Superseded for pilot close\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ARCHIVED"));
    assertThat(revisions.count()).isEqualTo(2);
    assertThat(audits.count()).isGreaterThanOrEqualTo(6);
  }

  private UUID createPackage() throws Exception {
    MvcResult created =
        mvc.perform(
                post("/api/v1/admin/academic-packages")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"subject\":\"MATHEMATICS\"}"))
            .andExpect(status().isCreated())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andReturn();
    return UUID.fromString(
        json.readTree(created.getResponse().getContentAsString()).path("id").asText());
  }

  private void save(UUID packageId, long expected, ObjectNode draft, long resultingRevision)
      throws Exception {
    mvc.perform(
            put("/api/v1/admin/academic-packages/{id}/draft", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(saveRequest(expected, draft)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.draftRevision").value(resultingRevision));
  }

  private org.springframework.test.web.servlet.ResultActions publish(
      UUID packageId, long expected, long revisionNumber) throws Exception {
    return mvc.perform(
            post("/api/v1/admin/academic-packages/{id}:publish", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedDraftRevision\":" + expected + "}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PUBLISHED"))
        .andExpect(jsonPath("$.activeRevision.revisionNumber").value(revisionNumber));
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
