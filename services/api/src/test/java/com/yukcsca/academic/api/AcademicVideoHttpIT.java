package com.yukcsca.academic.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yukcsca.academic.application.AcademicVideoStore;
import com.yukcsca.academic.application.MediaStoragePort;
import com.yukcsca.academic.application.RenderJobStore;
import com.yukcsca.academic.domain.AcademicVideoAsset;
import com.yukcsca.academic.domain.RenderJob;
import com.yukcsca.academic.domain.RenderJobState;
import com.yukcsca.academic.domain.VideoAssetSource;
import com.yukcsca.academic.domain.VideoAssetStatus;
import com.yukcsca.identity.application.AccessTokenService;
import com.yukcsca.identity.application.UserAccountStore;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.infrastructure.UserAccountRepository;
import com.yukcsca.support.MinioTestSupport;
import com.yukcsca.support.PostgresTestConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * VS-010B reviewed-video integration evidence: upload slot lifecycle with idempotent confirm
 * (CR-08), scene specifications with per-segment validation, render-job conflict recovery
 * (CR-03/CR-08), caption editability (CR-09), review gating, publish projection with retirement
 * (AC-01/04/09), student playback/captions gating (AC-05/06), and progress positions (CR-02).
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class AcademicVideoHttpIT {
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired UserAccountRepository users;
  @Autowired AccessTokenService accessTokens;
  @Autowired AcademicVideoStore videos;
  @Autowired RenderJobStore renderJobs;
  @Autowired MediaStoragePort storage;

  private String adminToken;
  private String studentToken;
  private String unassignedToken;
  private UUID adminId;

  @DynamicPropertySource
  static void mediaStorage(DynamicPropertyRegistry registry) {
    registry.add("yukcsca.media.storage.endpoint", () -> MinioTestSupport.endpoint());
    registry.add("yukcsca.media.storage.public-endpoint", () -> MinioTestSupport.endpoint());
    registry.add("yukcsca.media.storage.bucket", () -> MinioTestSupport.BUCKET);
    registry.add("yukcsca.media.storage.access-key", () -> MinioTestSupport.ACCESS_KEY);
    registry.add("yukcsca.media.storage.secret-key", () -> MinioTestSupport.SECRET_KEY);
    registry.add("yukcsca.media.storage.auto-create-bucket", () -> "true");
  }

  @BeforeEach
  void setUp() {
    jdbc.execute(
        "truncate table media_object_cleanup, render_job, academic_video_upload_slot, academic_video_asset, "
            + "scene_specification, student_content_progress, academic_audit, academic_image, "
            + "academic_revision, academic_package, user_account cascade");
    Instant now = Instant.parse("2026-08-01T00:00:00Z");
    UserAccount admin =
        ((UserAccountStore) users)
            .save(UserAccount.createGoogleUser("admin@example.com", "Admin", null, now));
    admin.activateAdmin(now);
    ((UserAccountStore) users).save(admin);
    adminId = admin.getId();
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
  void videoEndpointsRequireAdminRole() throws Exception {
    mvc.perform(get("/api/v1/admin/scene-templates"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    mvc.perform(
            get("/api/v1/admin/scene-templates")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    mvc.perform(
            get("/api/v1/academic/videos/" + UUID.randomUUID() + "/play")
                .header(HttpHeaders.AUTHORIZATION, bearer(unassignedToken)))
        .andExpect(status().isForbidden());
    mvc.perform(post("/api/v1/admin/academic-videos/{id}:retry-validation", UUID.randomUUID()))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void uploadSlotConfirmsIdempotentlyEvenAfterExpiry() throws Exception {
    Slot slot = createSlot("id");
    assertThat(slot.uploadUrl()).contains("X-Amz-Signature");
    assertThat(slot.maxByteSize()).isEqualTo(209_715_200L);
    assertThat(
            jdbc.queryForObject(
                """
                select count(*) from media_object_cleanup cleanup
                join academic_video_upload_slot slot on slot.storage_key = cleanup.storage_key
                where slot.id = ? and cleanup.reason = 'STAGING'
                  and cleanup.delete_after > now()
                  and cleanup.delete_after <= now() + interval '24 hours'
                """,
                Integer.class,
                slot.id()))
        .isEqualTo(1);

    // No bytes yet: the first confirm reports SLOT_PENDING.
    confirm(slot.id())
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("SLOT_PENDING"));

    upload(slot.uploadUrl(), mp4Payload());
    MvcResult confirmed = confirm(slot.id()).andExpect(status().isAccepted()).andReturn();
    JsonNode asset = json.readTree(confirmed.getResponse().getContentAsString());
    UUID assetId = UUID.fromString(asset.path("id").asText());
    assertThat(asset.path("status").asText()).isEqualTo("AWAITING_VALIDATION");
    assertThat(asset.path("source").asText()).isEqualTo("UPLOADED");
    assertThat(asset.path("latestValidationJob").path("kind").asText())
        .isEqualTo("VALIDATE_UPLOAD");
    assertThat(asset.path("latestValidationJob").path("state").asText()).isEqualTo("QUEUED");
    assertThat(asset.path("provenance").path("authorUserId").asText())
        .isEqualTo(adminId.toString());

    RenderJob job = latestJobForAsset(assetId);
    assertThat(job).isNotNull();
    assertThat(job.getKind().name()).isEqualTo("VALIDATE_UPLOAD");
    assertThat(job.getState()).isEqualTo(RenderJobState.QUEUED);

    // A terminal infrastructure failure remains attached to the durable asset.
    job.fail(
        com.yukcsca.academic.domain.RenderJobErrorCode.INTERNAL,
        "worker unavailable",
        Instant.now());
    renderJobs.save(job);

    // CR-10: the durable asset GET exposes terminal validation failure after reload, including the
    // bounded error needed to explain and offer retry without retaining the upload-slot id.
    mvc.perform(
            get("/api/v1/admin/academic-videos/{id}", assetId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.latestValidationJob.id").value(job.getId().toString()))
        .andExpect(jsonPath("$.latestValidationJob.kind").value("VALIDATE_UPLOAD"))
        .andExpect(jsonPath("$.latestValidationJob.state").value("FAILED"))
        .andExpect(jsonPath("$.latestValidationJob.error.code").value("INTERNAL"));

    MvcResult retry =
        mvc.perform(
                post("/api/v1/admin/academic-videos/{id}:retry-validation", assetId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.kind").value("VALIDATE_UPLOAD"))
            .andExpect(jsonPath("$.state").value("QUEUED"))
            .andReturn();
    UUID retriedJobId =
        UUID.fromString(
            json.readTree(retry.getResponse().getContentAsString()).path("id").asText());

    // Duplicate retry is idempotently recoverable through the embedded active job.
    mvc.perform(
            post("/api/v1/admin/academic-videos/{id}:retry-validation", assetId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RENDER_JOB_ACTIVE"))
        .andExpect(jsonPath("$.job.id").value(retriedJobId.toString()));

    // Confirm replay remains idempotent and exposes the same active retry on the asset response.
    confirm(slot.id())
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.id").value(assetId.toString()))
        .andExpect(jsonPath("$.latestValidationJob.id").value(retriedJobId.toString()))
        .andExpect(jsonPath("$.latestValidationJob.state").value("QUEUED"));
    RenderJob retriedJob = latestJobForAsset(assetId);
    assertThat(retriedJob.getId()).isEqualTo(retriedJobId);
    assertThat(retriedJob.getState()).isEqualTo(RenderJobState.QUEUED);

    // Replay after success returns the same asset (CR-08).
    confirm(slot.id())
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.id").value(assetId.toString()));

    // Replay after slot expiry still returns the same asset: only a FIRST confirm can expire.
    jdbc.update(
        "update academic_video_upload_slot set expires_at = now() - interval '1 hour' where id = ?",
        ps -> ps.setObject(1, slot.id()));
    confirm(slot.id())
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.id").value(assetId.toString()));

    // A first confirm after expiry is rejected.
    Slot expired = createSlot("id");
    upload(expired.uploadUrl(), mp4Payload());
    jdbc.update(
        "update academic_video_upload_slot set expires_at = now() - interval '1 hour' where id = ?",
        ps -> ps.setObject(1, expired.id()));
    confirm(expired.id())
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("SLOT_EXPIRED"));

    // Unknown slot.
    confirm(UUID.randomUUID())
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void sceneSpecificationsValidatePerSegmentAndRenderJobsConflictRecoverably() throws Exception {
    MvcResult templates =
        mvc.perform(
                get("/api/v1/admin/scene-templates")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.version").value("2026-08.3"))
            .andExpect(
                jsonPath("$.actions[?(@.id=='worked-example-step')].params[0].kind")
                    .value("STRING"))
            .andExpect(jsonPath("$.actions[?(@.id=='function-graph')]").isNotEmpty())
            .andExpect(jsonPath("$.actions[?(@.id=='number-line-interval')]").isNotEmpty())
            .andExpect(jsonPath("$.actions[?(@.id=='number-line-union')]").isNotEmpty())
            .andExpect(jsonPath("$.actions[?(@.id=='sequence-points')]").isNotEmpty())
            .andReturn();
    JsonNode actions = json.readTree(templates.getResponse().getContentAsString()).path("actions");
    JsonNode family = findTemplateParam(actions, "function-graph", "family");
    assertThat(family.path("kind").asText()).isEqualTo("ENUM");
    List<String> familyChoices = new ArrayList<>();
    for (JsonNode choice : family.path("choices")) {
      familyChoices.add(choice.asText());
    }
    assertThat(familyChoices)
        .containsExactly("LINEAR", "QUADRATIC", "POWER", "EXP", "LOG", "SIN", "COS")
        .doesNotContain("TAN");

    // D-10: display-only visibility metadata rides the descriptors; validation is unchanged.
    JsonNode exponent = findTemplateParam(actions, "function-graph", "n");
    assertThat(exponent.path("visibleWhen").path("paramId").asText()).isEqualTo("family");
    List<String> exponentChoices = new ArrayList<>();
    for (JsonNode choice : exponent.path("visibleWhen").path("choices")) {
      exponentChoices.add(choice.asText());
    }
    assertThat(exponentChoices).containsExactly("POWER");

    JsonNode leftBound = findTemplateParam(actions, "number-line-interval", "leftBound");
    assertThat(leftBound.path("visibleWhen").path("paramId").asText()).isEqualTo("leftInf");
    List<String> leftBoundChoices = new ArrayList<>();
    for (JsonNode choice : leftBound.path("visibleWhen").path("choices")) {
      leftBoundChoices.add(choice.asText());
    }
    assertThat(leftBoundChoices).containsExactly("FINITE");

    // The union action exposes the INTERVAL_SET composite kind for a dedicated editor.
    JsonNode unionScopes = findTemplateParam(actions, "number-line-union", "scopes");
    assertThat(unionScopes.path("kind").asText()).isEqualTo("INTERVAL_SET");
    JsonNode unionLabel = findTemplateParam(actions, "number-line-union", "setLabel");
    assertThat(unionLabel.path("kind").asText()).isEqualTo("MATH_EXPRESSION");

    JsonNode coefficientA = findTemplateParam(actions, "function-graph", "a");
    assertThat(coefficientA.hasNonNull("visibleWhen")).isFalse();
    // Required for every curve family, so the descriptor advertises it to the editor.
    assertThat(coefficientA.path("required").asBoolean()).isTrue();

    String invalid =
        """
        {"explanationLanguage":"id","segments":[
          {"templateActionId":"no-such-action","params":{},"narrationText":"Halo"},
          {"templateActionId":"title-heading","params":{"text":"x"},"narrationText":"Halo"}]}
        """;
    mvc.perform(
            post("/api/v1/admin/scene-specifications")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalid))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.violations[0].path").value("segments[0].templateActionId"));

    // A bad scope member reports through the extended composite grammar, not a flat param path.
    mvc.perform(
            post("/api/v1/admin/scene-specifications")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"explanationLanguage":"id","segments":[{
                      "templateActionId":"number-line-union",
                      "params":{"scopes":[
                        {"leftInf":"INFINITE","right":2,"rightBound":"CLOSED","rightInf":"FINITE"},
                        {"left":5,"leftInf":"FINITE","rightInf":"INFINITE"}
                      ]},
                      "narrationText":"Himpunan penyelesaian pertidaksamaan."
                    }]}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.violations[0].path").value("segments[0].params.scopes[1].leftBound"))
        .andExpect(jsonPath("$.violations[0].code").value("REQUIRED"));

    mvc.perform(
            post("/api/v1/admin/scene-specifications")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"explanationLanguage":"id","segments":[{
                      "templateActionId":"function-graph",
                      "params":{"family":"QUADRATIC","a":1,"b":-3,"c":2,"xMin":-5,"xMax":5,"keyPoints":"ROOTS"},
                      "narrationText":"Parabola y=x^2-3x+2."
                    },                    {
                      "templateActionId":"number-line-interval",
                      "params":{"left":-2,"right":3,"rightBound":"CLOSED","leftInf":"INFINITE","rightInf":"FINITE"},
                      "narrationText":"Solusi pada garis bilangan."
                    },{
                      "templateActionId":"number-line-union",
                      "params":{"scopes":[
                        {"leftInf":"INFINITE","right":2,"rightBound":"CLOSED","rightInf":"FINITE"},
                        {"left":5,"leftBound":"OPEN","leftInf":"FINITE","rightInf":"INFINITE"}
                      ]},
                      "narrationText":"Gabungan dua interval."
                    },{
                      "templateActionId":"sequence-points",
                      "params":{"seqType":"ARITHMETIC","firstTerm":2,"ratioOrDiff":3,"termCount":5},
                      "narrationText":"Barisan aritmetika lima suku."
                    }]}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.registryVersion").value("2026-08.3"));

    UUID specId = createSceneSpecification();
    mvc.perform(
            get("/api/v1/admin/scene-specifications/{id}", specId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.registryVersion").value("2026-08.3"))
        .andExpect(jsonPath("$.latestRenderJob").doesNotExist());

    mvc.perform(
            put("/api/v1/admin/scene-specifications/{id}", specId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(validScript()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.explanationLanguage").value("id"));

    MvcResult enqueue =
        mvc.perform(
                post("/api/v1/admin/render-jobs")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"sceneSpecificationId\":\"" + specId + "\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.state").value("QUEUED"))
            .andExpect(jsonPath("$.kind").value("RENDER_SCENE"))
            .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.nullValue()))
            .andReturn();
    UUID jobId =
        UUID.fromString(
            json.readTree(enqueue.getResponse().getContentAsString()).path("id").asText());

    // A concurrent enqueue returns the embedded active job so a lost response is recoverable.
    mvc.perform(
            post("/api/v1/admin/render-jobs")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sceneSpecificationId\":\"" + specId + "\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RENDER_JOB_ACTIVE"))
        .andExpect(jsonPath("$.job.id").value(jobId.toString()));

    // The spec read embeds the latest job (CR-03 reload recovery).
    mvc.perform(
            get("/api/v1/admin/scene-specifications/{id}", specId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.latestRenderJob.id").value(jobId.toString()));

    mvc.perform(
            get("/api/v1/admin/render-jobs/{jobId}", jobId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.attempts").value(0));

    // A finished render attaches the produced asset id and stays snapshot-isolated (CR-07g).
    RenderJob job = renderJobs.findById(jobId).orElseThrow();
    assertThat(job.getSceneSnapshot()).contains("title-heading");
    UUID producedAsset = producedDraftAsset(specId);
    job.succeed(producedAsset, Instant.now());
    renderJobs.save(job);
    mvc.perform(
            get("/api/v1/admin/render-jobs/{jobId}", jobId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.state").value("SUCCEEDED"))
        .andExpect(jsonPath("$.videoAssetId").value(producedAsset.toString()));

    // A produced asset must not expose its RENDER_SCENE job through the upload-only CR-10 field.
    mvc.perform(
            get("/api/v1/admin/academic-videos/{id}", producedAsset)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.latestValidationJob").value(org.hamcrest.Matchers.nullValue()));
    mvc.perform(
            post("/api/v1/admin/academic-videos/{id}:retry-validation", producedAsset)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("VALIDATION_NOT_RETRYABLE"));

    // After the active job is terminal, enqueue creates a fresh job against the replaced script.
    mvc.perform(
            post("/api/v1/admin/render-jobs")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sceneSpecificationId\":\"" + specId + "\"}"))
        .andExpect(status().isCreated());
  }

  @Test
  void captionsFollowStateEditabilityAndReviewPreconditions() throws Exception {
    Slot slot = createSlot("en");
    upload(slot.uploadUrl(), mp4Payload());
    UUID assetId = confirmAsset(slot.id());
    AcademicVideoAsset asset = videos.findById(assetId).orElseThrow();

    // Captions are not editable while the bytes are unvalidated.
    putCaptions(assetId, vtt(10))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CAPTIONS_NOT_EDITABLE"));

    simulateWorkerValidation(asset, mp4Payload());

    // Review requires captions.
    review(assetId)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("REVIEW_PRECONDITION_UNMET"));

    putCaptions(assetId, vtt(60))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.captionsAvailable").value(true));
    String firstCaptionsKey =
        jdbc.queryForObject(
            "select captions_key from academic_video_asset where id = ?", String.class, assetId);
    putCaptions(assetId, vtt(59)).andExpect(status().isOk());
    String replacementCaptionsKey =
        jdbc.queryForObject(
            "select captions_key from academic_video_asset where id = ?", String.class, assetId);
    assertThat(replacementCaptionsKey).isNotEqualTo(firstCaptionsKey);
    assertThat(
            jdbc.queryForObject(
                """
                select count(*) from media_object_cleanup
                where storage_key = ? and reason = 'ORPHAN_OUTPUT' and delete_after <= now()
                """,
                Integer.class,
                firstCaptionsKey))
        .isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from media_object_cleanup where storage_key = ?",
                Integer.class,
                replacementCaptionsKey))
        .isZero();

    // Invalid VTT is rejected with bounded paths.
    putCaptions(assetId, "not vtt")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.violations[0].path").value("captions"));

    mvc.perform(
            get("/api/v1/admin/academic-videos/{id}/captions", assetId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andExpect(
            header()
                .string(HttpHeaders.CONTENT_TYPE, org.hamcrest.Matchers.startsWith("text/vtt")));

    review(assetId).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REVIEWED"));

    // Reviewed captions are immutable; corrections go through replacement (CR-09).
    putCaptions(assetId, vtt(60))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CAPTIONS_IMMUTABLE"));

    // A produced asset derives captions from narration.
    UUID producedAsset = producedDraftAsset(createSceneSpecification());
    putCaptions(producedAsset, vtt(10))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CAPTIONS_DERIVED_FROM_NARRATION"));

    // Admin playback: 404 while unvalidated, 409 once retired.
    Slot draftSlot = createSlot("id");
    upload(draftSlot.uploadUrl(), mp4Payload());
    UUID awaiting = confirmAsset(draftSlot.id());
    mvc.perform(
            get("/api/v1/admin/academic-videos/{id}/play", awaiting)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isNotFound());
    AcademicVideoAsset retired = videos.findById(assetId).orElseThrow();
    retired.retire(Instant.now());
    videos.save(retired);
    mvc.perform(
            get("/api/v1/admin/academic-videos/{id}/play", assetId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("VIDEO_NOT_PLAYABLE"));
  }

  @Test
  void publishedVideoPlaysForStudentsWhileDraftDoesNotBlockPublication() throws Exception {
    UUID packageId = createPackage();
    UUID reviewedAsset = reviewedAsset("id", 120);
    UUID draftAsset = draftValidatedAsset("en");

    ObjectNode draft = validDraft();
    lesson(draft)
        .putArray("videos")
        .addObject()
        .put("language", "id")
        .put("videoAssetId", reviewedAsset.toString());
    ObjectNode englishLesson = remediation(draft);
    englishLesson
        .putArray("videos")
        .addObject()
        .put("language", "en")
        .put("videoAssetId", draftAsset.toString());

    saveDraft(packageId, 0, draft);
    // AC-04: the DRAFT (unreviewed) attachment never blocks publication.
    publish(packageId, 1).andExpect(status().isOk());

    UUID lessonId = UUID.fromString(lesson(draft).path("id").asText());
    UUID remediationId = UUID.fromString(remediation(draft).path("id").asText());

    // AC-05/AC-06: only the REVIEWED attachment projects; the other language stays text-only.
    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", lessonId)
                .queryParam("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.video.videoAssetId").value(reviewedAsset.toString()))
        .andExpect(jsonPath("$.video.durationSeconds").value(120));

    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/remediation/{id}", remediationId)
                .queryParam("explanationLanguage", "en")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.video").doesNotExist());

    // LANGUAGE_UNAVAILABLE never yields a playable control.
    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", lessonId)
                .queryParam("explanationLanguage", "zh-CN")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.body.availability").value("LANGUAGE_UNAVAILABLE"))
        .andExpect(jsonPath("$.video").doesNotExist());

    // Playback grant (CR-01): 200 JSON with a working presigned URL.
    MvcResult play =
        mvc.perform(
                get("/api/v1/academic/videos/{id}/play", reviewedAsset)
                    .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andReturn();
    JsonNode grant = json.readTree(play.getResponse().getContentAsString());
    assertThat(grant.path("url").asText()).contains("X-Amz-Signature");
    assertThat(grant.has("expiresAt")).isTrue();
    HttpResponse<byte[]> stream =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(URI.create(grant.path("url").asText())).GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
    assertThat(stream.statusCode()).isEqualTo(200);
    assertThat(stream.body()).isEqualTo(mp4Payload());

    mvc.perform(
            get("/api/v1/academic/videos/{id}/captions", reviewedAsset)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(
            header().string(HttpHeaders.CONTENT_TYPE, org.hamcrest.Matchers.startsWith("text/vtt")))
        .andExpect(
            header().string(HttpHeaders.CACHE_CONTROL, "max-age=31536000, private, immutable"));

    // Non-published states never leak existence: DRAFT, unknown ids, and other roles all 404/403.
    mvc.perform(
            get("/api/v1/academic/videos/{id}/play", draftAsset)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isNotFound());
    mvc.perform(
            get("/api/v1/academic/videos/{id}/play", reviewedAsset)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
        .andExpect(status().isForbidden());

    // CR-02: video playback positions ride content progress.
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", lessonId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"status\":\"IN_PROGRESS\",\"video\":{\"videoAssetId\":\""
                        + reviewedAsset
                        + "\",\"positionSeconds\":45}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.video.positionSeconds").value(45));

    // Video-only IN_PROGRESS writes are legal (relaxed precondition).
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", lessonId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"status\":\"IN_PROGRESS\",\"video\":{\"videoAssetId\":\""
                        + reviewedAsset
                        + "\",\"positionSeconds\":50}}"))
        .andExpect(status().isOk());

    // Stale asset and out-of-range positions are bounded 400s.
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", lessonId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"status\":\"IN_PROGRESS\",\"resumeBlockIndex\":0,\"video\":{\"videoAssetId\":\""
                        + draftAsset
                        + "\",\"positionSeconds\":5}}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("CONTENT_PROGRESS_VALIDATION_FAILED"))
        .andExpect(jsonPath("$.violations[0].path").value("video.videoAssetId"))
        .andExpect(jsonPath("$.violations[0].code").value("INVALID_VIDEO_ASSET"));

    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", lessonId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"status\":\"IN_PROGRESS\",\"resumeBlockIndex\":0,\"video\":{\"videoAssetId\":\""
                        + reviewedAsset
                        + "\",\"positionSeconds\":121}}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.violations[0].path").value("video.positionSeconds"))
        .andExpect(jsonPath("$.violations[0].code").value("POSITION_OUT_OF_RANGE"));

    // Nested request validation is active: an explicit malformed video object is not silently
    // ignored just because the block position is otherwise valid.
    mvc.perform(
            put("/api/v1/academic/packages/MATHEMATICS/lessons/{id}/progress", lessonId)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"status\":\"IN_PROGRESS\",\"resumeBlockIndex\":0,"
                        + "\"video\":{\"videoAssetId\":null,\"positionSeconds\":5}}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.violations[0].path").value("video.videoAssetId"))
        .andExpect(jsonPath("$.violations[0].code").value("REQUIRED"));

    // AC-07: the restored position survives a re-read, clamped to the published duration.
    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", lessonId)
                .queryParam("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contentProgress.video.positionSeconds").value(50));

    // AC-12: watching writes content progress only, never assessment evidence.
    assertThat(jdbc.queryForObject("select count(*) from assessment_session", Integer.class))
        .isZero();
    assertThat(
            jdbc.queryForObject(
                "select count(*) from assessment_objective_evidence", Integer.class))
        .isZero();
    assertThat(
            jdbc.queryForObject(
                "select count(*) from student_content_progress where video_asset_id is not null",
                Integer.class))
        .isEqualTo(1);
  }

  @Test
  void replacementPublishRetiresTheOldAsset() throws Exception {
    UUID packageId = createPackage();
    UUID first = reviewedAsset("id", 90);
    ObjectNode draft = validDraft();
    lesson(draft)
        .putArray("videos")
        .addObject()
        .put("language", "id")
        .put("videoAssetId", first.toString());
    saveDraft(packageId, 0, draft);
    publish(packageId, 1).andExpect(status().isOk());

    UUID replacement = reviewedAsset("id", 95);
    ObjectNode second = validDraft();
    lesson(second)
        .putArray("videos")
        .addObject()
        .put("language", "id")
        .put("videoAssetId", replacement.toString());
    saveDraft(packageId, 1, second);
    publish(packageId, 2).andExpect(status().isOk());

    assertThat(videos.findById(first).orElseThrow().getStatus())
        .isEqualTo(VideoAssetStatus.RETIRED);
    assertThat(videos.findById(replacement).orElseThrow().getStatus())
        .isEqualTo(VideoAssetStatus.REVIEWED);
    assertThat(
            jdbc.queryForObject(
                """
                select count(*) from media_object_cleanup
                where reason = 'RETIRED_ASSET' and delete_after <= now()
                  and storage_key in (
                    select storage_key from academic_video_asset where id = ?
                    union all
                    select captions_key from academic_video_asset where id = ?
                  )
                """,
                Integer.class,
                first,
                first))
        .isEqualTo(2);

    UUID lessonId = UUID.fromString(lesson(second).path("id").asText());
    mvc.perform(
            get("/api/v1/academic/packages/MATHEMATICS/lessons/{id}", lessonId)
                .queryParam("explanationLanguage", "id")
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.video.videoAssetId").value(replacement.toString()));

    mvc.perform(
            get("/api/v1/academic/videos/{id}/play", first)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isNotFound());
    mvc.perform(
            get("/api/v1/academic/videos/{id}/play", replacement)
                .header(HttpHeaders.AUTHORIZATION, bearer(studentToken)))
        .andExpect(status().isOk());
  }

  @Test
  void draftSaveValidatesVideoAttachmentHandles() throws Exception {
    UUID packageId = createPackage();
    UUID asset = reviewedAsset("id", 60);
    UUID specId = createSceneSpecification();

    // TERMINOLOGY resources never carry attachments.
    ObjectNode terminology = validDraft();
    terminologyResource(terminology)
        .putArray("videos")
        .addObject()
        .put("language", "id")
        .put("videoAssetId", asset.toString());
    saveDraftExpecting(packageId, 0, terminology, "draft.resources[1].videos", "UNSUPPORTED");

    // Both ids absent is an incomplete handle (CR-03).
    ObjectNode incomplete = validDraft();
    lesson(incomplete).putArray("videos").addObject().put("language", "id");
    saveDraftExpecting(packageId, 0, incomplete, "draft.resources[0].videos[0]", "REQUIRED");

    // Language mismatch with the asset is INCOMPATIBLE (CR-07c).
    ObjectNode mismatch = validDraft();
    lesson(mismatch)
        .putArray("videos")
        .addObject()
        .put("language", "en")
        .put("videoAssetId", asset.toString());
    saveDraftExpecting(
        packageId, 0, mismatch, "draft.resources[0].videos[0].language", "INCOMPATIBLE");

    // One attachment per language.
    ObjectNode duplicate = validDraft();
    tools.jackson.databind.node.ArrayNode attachments = lesson(duplicate).putArray("videos");
    attachments.addObject().put("language", "id").put("videoAssetId", asset.toString());
    attachments.addObject().put("language", "id").put("sceneSpecificationId", specId.toString());
    saveDraftExpecting(
        packageId, 0, duplicate, "draft.resources[0].videos[1].language", "DUPLICATE");

    // The reload-safe handle (spec id only, produced path pre-render) saves cleanly.
    ObjectNode valid = validDraft();
    lesson(valid)
        .putArray("videos")
        .addObject()
        .put("language", "id")
        .put("sceneSpecificationId", specId.toString());
    saveDraft(packageId, 0, valid);
    MvcResult saved =
        mvc.perform(
                get("/api/v1/admin/academic-packages/{id}", packageId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode savedDraft = json.readTree(saved.getResponse().getContentAsString()).path("draft");
    assertThat(
            savedDraft
                .path("resources")
                .get(0)
                .path("videos")
                .get(0)
                .path("sceneSpecificationId")
                .asText())
        .isEqualTo(specId.toString());
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private record Slot(UUID id, String uploadUrl, long maxByteSize) {}

  private Slot createSlot(String language) throws Exception {
    MvcResult result =
        mvc.perform(
                post("/api/v1/admin/academic-video-slots")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"explanationLanguage\":\"" + language + "\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode slot = json.readTree(result.getResponse().getContentAsString());
    return new Slot(
        UUID.fromString(slot.path("id").asText()),
        slot.path("uploadUrl").asText(),
        slot.path("maxByteSize").asLong());
  }

  private ResultActions confirm(UUID slotId) throws Exception {
    return mvc.perform(
        post("/api/v1/admin/academic-video-slots/{slotId}:confirm", slotId)
            .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"provenance\":{\"origin\":\"YUKCSCA_ORIGINAL\"}}"));
  }

  private UUID confirmAsset(UUID slotId) throws Exception {
    MvcResult result = confirm(slotId).andExpect(status().isAccepted()).andReturn();
    return UUID.fromString(
        json.readTree(result.getResponse().getContentAsString()).path("id").asText());
  }

  private static void upload(String presignedUrl, byte[] payload) throws Exception {
    HttpResponse<Void> response =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(URI.create(presignedUrl))
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(payload))
                    .build(),
                HttpResponse.BodyHandlers.discarding());
    assertThat(response.statusCode()).isEqualTo(200);
  }

  private static byte[] mp4Payload() {
    byte[] header = {0x00, 0x00, 0x00, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'};
    byte[] payload = new byte[4096];
    System.arraycopy(header, 0, payload, 0, header.length);
    for (int index = header.length; index < payload.length; index++) {
      payload[index] = (byte) index;
    }
    return payload;
  }

  private RenderJob latestJobForAsset(UUID assetId) {
    return jdbc
        .query(
            "select id from render_job where video_asset_id = ? order by created_at desc limit 1",
            (rs, rowNum) -> UUID.fromString(rs.getString(1)),
            assetId)
        .stream()
        .findFirst()
        .flatMap(id -> renderJobs.findById(id))
        .orElse(null);
  }

  /** Mirrors the worker's post-probe writes: final storage key plus validated shape metadata. */
  private void simulateWorkerValidation(AcademicVideoAsset asset, byte[] payload) {
    String finalKey = "videos/" + asset.getId() + "/video.mp4";
    storage.put(finalKey, "video/mp4", payload);
    asset.markValidated(
        finalKey,
        payload.length,
        60,
        1280,
        720,
        sha256(payload),
        asset.isCaptionsAvailable(),
        asset.getCaptionsKey(),
        Instant.now());
    videos.save(asset);
    RenderJob job = latestJobForAsset(asset.getId());
    if (job != null) {
      job.succeed(asset.getId(), Instant.now());
      renderJobs.save(job);
    }
  }

  /** Produces a finished UPLOADED asset in DRAFT with validated bytes (worker simulated). */
  private UUID draftValidatedAsset(String language) throws Exception {
    Slot slot = createSlot(language);
    upload(slot.uploadUrl(), mp4Payload());
    UUID assetId = confirmAsset(slot.id());
    AcademicVideoAsset asset = videos.findById(assetId).orElseThrow();
    simulateWorkerValidation(asset, mp4Payload());
    return assetId;
  }

  /** Full reviewed path: validated bytes, captions, and the human review transition. */
  private UUID reviewedAsset(String language, int durationSeconds) throws Exception {
    UUID assetId = draftValidatedAsset(language);
    AcademicVideoAsset asset = videos.findById(assetId).orElseThrow();
    String finalKey = asset.getStorageKey();
    asset.markValidated(
        finalKey,
        asset.getByteSize(),
        durationSeconds,
        1280,
        720,
        asset.getSha256(),
        true,
        "videos/" + assetId + "/captions.vtt",
        Instant.now());
    videos.save(asset);
    storage.put(
        "videos/" + assetId + "/captions.vtt",
        "text/vtt",
        vtt(durationSeconds).getBytes(StandardCharsets.UTF_8));
    review(assetId).andExpect(status().isOk());
    return assetId;
  }

  /** Creates a PRODUCED asset directly in DRAFT, as a succeeded render would. */
  private UUID producedDraftAsset(UUID sceneSpecificationId) {
    UUID assetId = UUID.randomUUID();
    byte[] payload = mp4Payload();
    String videoKey = "videos/" + assetId + "/video.mp4";
    storage.put(videoKey, "video/mp4", payload);
    storage.put(
        "videos/" + assetId + "/captions.vtt",
        "text/vtt",
        vtt(30).getBytes(StandardCharsets.UTF_8));
    AcademicVideoAsset asset =
        new AcademicVideoAsset(
            VideoAssetSource.PRODUCED,
            "id",
            videoKey,
            "YUKCSCA_ORIGINAL",
            null,
            null,
            null,
            adminId,
            Instant.now());
    asset.markValidated(
        videoKey,
        payload.length,
        30,
        1280,
        720,
        sha256(payload),
        true,
        "videos/" + assetId + "/captions.vtt",
        Instant.now());
    AcademicVideoAsset saved = videos.save(asset);
    return saved.getId();
  }

  private static JsonNode findTemplateParam(JsonNode actions, String actionId, String paramId) {
    for (JsonNode action : actions) {
      if (!actionId.equals(action.path("id").asText())) {
        continue;
      }
      for (JsonNode param : action.path("params")) {
        if (paramId.equals(param.path("id").asText())) {
          return param;
        }
      }
    }
    throw new AssertionError("missing template param " + actionId + "." + paramId);
  }

  private UUID createSceneSpecification() throws Exception {
    MvcResult created =
        mvc.perform(
                post("/api/v1/admin/scene-specifications")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(validScript()))
            .andExpect(status().isCreated())
            .andReturn();
    return UUID.fromString(
        json.readTree(created.getResponse().getContentAsString()).path("id").asText());
  }

  private static String validScript() {
    return """
        {"explanationLanguage":"id","segments":[
          {"templateActionId":"title-heading","params":{"text":"Fungsi Kuadrat"},
           "narrationText":"Pada video ini kita mempelajari fungsi kuadrat."},
          {"templateActionId":"worked-example-step",
           "params":{"stepLabel":"Langkah 1","expression":"x = \\\\frac{-b}{2a}"},
           "narrationText":"Substitusikan koefisien ke rumus."}]}
        """;
  }

  private static String vtt(int endSeconds) {
    return "WEBVTT\n\n00:00:00.000 --> 00:00:0" + Math.min(9, endSeconds) + ".000\nNarration cue\n";
  }

  private ResultActions putCaptions(UUID assetId, String captions) throws Exception {
    return mvc.perform(
        put("/api/v1/admin/academic-videos/{id}/captions", assetId)
            .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"captions\":" + json.writeValueAsString(captions) + "}"));
  }

  private ResultActions review(UUID assetId) throws Exception {
    return mvc.perform(
        post("/api/v1/admin/academic-videos/{id}:review", assetId)
            .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)));
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

  private void saveDraft(UUID packageId, long expected, ObjectNode draft) throws Exception {
    mvc.perform(
            put("/api/v1/admin/academic-packages/{id}/draft", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(saveRequest(expected, draft)))
        .andExpect(status().isOk());
  }

  private void saveDraftExpecting(
      UUID packageId, long expected, ObjectNode draft, String path, String code) throws Exception {
    mvc.perform(
            put("/api/v1/admin/academic-packages/{id}/draft", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(saveRequest(expected, draft)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("ACADEMIC_VALIDATION_FAILED"))
        .andExpect(
            result -> {
              JsonNode violations =
                  json.readTree(result.getResponse().getContentAsString()).path("violations");
              boolean match = false;
              for (JsonNode violation : violations) {
                if (path.equals(violation.path("path").asText())
                    && code.equals(violation.path("code").asText())) {
                  match = true;
                }
              }
              assertThat(match)
                  .as("expected violation %s:%s in %s", path, code, violations)
                  .isTrue();
            });
  }

  private String saveRequest(long expected, ObjectNode draft) throws Exception {
    ObjectNode request = json.createObjectNode();
    request.put("expectedDraftRevision", expected);
    request.set("draft", draft);
    return json.writeValueAsString(request);
  }

  private ResultActions publish(UUID packageId, long expected) throws Exception {
    ResultActions actions =
        mvc.perform(
            post("/api/v1/admin/academic-packages/{id}:publish", packageId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedDraftRevision\":" + expected + "}"));
    return actions;
  }

  private static ObjectNode lesson(ObjectNode draft) {
    for (JsonNode resource : draft.path("resources")) {
      if ("LESSON".equals(resource.path("kind").asText())) return (ObjectNode) resource;
    }
    throw new IllegalStateException("draft has no LESSON resource");
  }

  private static ObjectNode remediation(ObjectNode draft) {
    for (JsonNode resource : draft.path("resources")) {
      if ("REMEDIATION".equals(resource.path("kind").asText())) return (ObjectNode) resource;
    }
    throw new IllegalStateException("draft has no REMEDIATION resource");
  }

  private static ObjectNode terminologyResource(ObjectNode draft) {
    for (JsonNode resource : draft.path("resources")) {
      if ("TERMINOLOGY".equals(resource.path("kind").asText())) return (ObjectNode) resource;
    }
    throw new IllegalStateException("draft has no TERMINOLOGY resource");
  }

  /** Minimal complete draft: one question, all three resource kinds, valid syllabus. */
  private ObjectNode validDraft() {
    ObjectNode draft = json.createObjectNode();
    ObjectNode syllabus = draft.putObject("officialSyllabus");
    syllabus.put("subject", "MATHEMATICS");
    syllabus.put("authority", "China Scholastic Competency Assessment");
    syllabus.put("editionLabel", "2026");
    syllabus
        .putArray("sourceLinks")
        .addObject()
        .put("language", "en")
        .put("url", "https://csca.cn/files/syllabus-2026.pdf");
    syllabus.put("retrievedAt", "2026-08-01T00:00:00Z");
    syllabus.put("lastCheckedAt", "2026-08-01T00:00:00Z");
    syllabus.putObject("publishedOn").put("status", "NOT_STATED");
    syllabus.putObject("effectiveOn").put("status", "NOT_STATED");
    syllabus.putObject("updatedOn").put("status", "NOT_STATED");
    syllabus.put("permittedUse", "REFERENCE_ONLY");
    ObjectNode structure = syllabus.putObject("examStructure");
    structure.put("durationMinutes", 60);
    structure.put("totalPoints", 3);
    structure.put("questionCount", 1);
    structure.put("questionType", "SINGLE_ANSWER");
    structure.putArray("examLanguages").add("en").add("zh-CN");

    UUID outlineId = UUID.randomUUID();
    ObjectNode outline = draft.withArray("outlineItems").addObject();
    outline.put("id", outlineId.toString());
    outline.putNull("parentId");
    outline.put("order", 0);
    outline.putObject("sourcePosition").put("page", 1).put("section", "Algebra");
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
      resource.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    }

    UUID questionId = UUID.randomUUID();
    ObjectNode question = (ObjectNode) draft.withArray("questions").addObject();
    question.put("id", questionId.toString());
    question.put("examLanguage", "en");
    question.put("difficulty", "STANDARD");
    textBlock(question.putArray("stem"), "Question 1");
    tools.jackson.databind.node.ArrayNode options = question.putArray("options");
    options.addObject().put("key", "A");
    textBlock(
        ((tools.jackson.databind.node.ObjectNode) options.get(0)).putArray("blocks"), "Correct");
    options.addObject().put("key", "B");
    textBlock(
        ((tools.jackson.databind.node.ObjectNode) options.get(1)).putArray("blocks"),
        "Alternative");
    question.put("correctOptionKey", "A");
    ObjectNode explanation = question.putArray("explanations").addObject();
    explanation.put("language", "id");
    textBlock(explanation.putArray("blocks"), "Penjelasan");
    question.putArray("outlineItemIds").add(outlineId.toString());
    question.putArray("objectiveIds").add(objectiveId.toString());
    question.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");

    ObjectNode mock = draft.withArray("mocks").addObject();
    mock.put("id", UUID.randomUUID().toString());
    mock.put("title", "Mock 1");
    mock.put("examLanguage", "en");
    mock.put("durationMinutes", 60);
    mock.put("totalPoints", 3);
    mock.put("questionCount", 1);
    mock.put("questionType", "SINGLE_ANSWER");
    mock.putArray("questions")
        .addObject()
        .put("questionId", questionId.toString())
        .put("points", 3);
    mock.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    return draft;
  }

  private static void localized(ObjectNode target, String id, String en, String zh) {
    target.put("indonesian", id);
    target.put("english", en);
    target.put("simplifiedChinese", zh);
  }

  private static void textBlock(tools.jackson.databind.node.ArrayNode blocks, String text) {
    blocks.addObject().put("kind", "TEXT").put("text", text);
  }

  private static String sha256(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (java.security.NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }

  private static String bearer(String token) {
    return "Bearer " + token;
  }
}
