package com.yukcsca.assessment.api;

import com.yukcsca.academic.application.PublishedAssessmentCatalog.LocalizedTextView;
import com.yukcsca.assessment.application.AssessmentStudentService;
import com.yukcsca.assessment.application.AssessmentStudentService.AssessmentSetSummaryView;
import com.yukcsca.assessment.application.AssessmentStudentService.AssistanceSummaryView;
import com.yukcsca.assessment.application.AssessmentStudentService.CheckpointForLessonView;
import com.yukcsca.assessment.application.AssessmentStudentService.ContextSummaryView;
import com.yukcsca.assessment.application.AssessmentStudentService.DiscloseHintView;
import com.yukcsca.assessment.application.AssessmentStudentService.DiscloseLanguageHelpView;
import com.yukcsca.assessment.application.AssessmentStudentService.DisclosedHintView;
import com.yukcsca.assessment.application.AssessmentStudentService.EvidenceView;
import com.yukcsca.assessment.application.AssessmentStudentService.ItemAnswerView;
import com.yukcsca.assessment.application.AssessmentStudentService.ItemFeedbackView;
import com.yukcsca.assessment.application.AssessmentStudentService.ItemView;
import com.yukcsca.assessment.application.AssessmentStudentService.LanguageHelpView;
import com.yukcsca.assessment.application.AssessmentStudentService.MistakeDetailView;
import com.yukcsca.assessment.application.AssessmentStudentService.MistakeListView;
import com.yukcsca.assessment.application.AssessmentStudentService.MistakeSummaryView;
import com.yukcsca.assessment.application.AssessmentStudentService.SessionResultView;
import com.yukcsca.assessment.application.AssessmentStudentService.SessionResumeSummaryView;
import com.yukcsca.assessment.application.AssessmentStudentService.SessionView;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/assessment")
public class AssessmentStudentController {
  private final AssessmentStudentService assessment;

  public AssessmentStudentController(AssessmentStudentService assessment) {
    this.assessment = assessment;
  }

  @GetMapping("/packages/{subject}/sets")
  public List<Map<String, Object>> listAssessmentSets(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @RequestParam(required = false) String purpose,
      @RequestParam(required = false) UUID outlineItemId,
      @RequestParam(required = false) UUID objectiveId,
      @RequestParam(required = false) String difficulty,
      @RequestParam(required = false) String examLanguage,
      HttpServletResponse response) {
    noStore(response);
    return assessment
        .listAssessmentSets(
            actor(jwt), subject, purpose, outlineItemId, objectiveId, difficulty, examLanguage)
        .stream()
        .map(this::setSummary)
        .toList();
  }

  @GetMapping("/packages/{subject}/lessons/{resourceId}/checkpoint")
  public Map<String, Object> getCheckpointForLesson(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable String subject,
      @PathVariable UUID resourceId,
      HttpServletResponse response) {
    noStore(response);
    return checkpoint(assessment.getCheckpointForLesson(actor(jwt), subject, resourceId));
  }

  @GetMapping("/sessions")
  public List<Map<String, Object>> listSessions(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String subject,
      HttpServletResponse response) {
    noStore(response);
    return assessment.listSessions(actor(jwt), status, subject).stream()
        .map(this::resumeSummary)
        .toList();
  }

  @PostMapping("/sessions")
  public ResponseEntity<Map<String, Object>> startSession(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody StartSessionRequest request,
      HttpServletResponse response) {
    noStore(response);
    SessionView session =
        assessment.startSession(
            actor(jwt),
            request.purpose(),
            request.subject(),
            request.setId(),
            request.examLanguage(),
            request.planTaskId());
    return ResponseEntity.status(HttpStatus.CREATED).body(sessionBody(session));
  }

  @GetMapping("/sessions/{sessionId}")
  public Map<String, Object> getSession(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID sessionId,
      HttpServletResponse response) {
    noStore(response);
    return sessionBody(assessment.getSession(actor(jwt), sessionId));
  }

  @PostMapping("/sessions/{sessionId}/items/{itemId}/hints")
  public Map<String, Object> discloseHint(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID sessionId,
      @PathVariable UUID itemId,
      HttpServletResponse response) {
    noStore(response);
    DiscloseHintView result = assessment.discloseHint(actor(jwt), sessionId, itemId);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("item", itemBody(result.item()));
    body.put("disclosed", disclosedBody(result.disclosed()));
    body.put("sessionAssistanceSummary", assistance(result.sessionAssistanceSummary()));
    return body;
  }

  @PostMapping("/sessions/{sessionId}/items/{itemId}/language-help")
  public Map<String, Object> discloseLanguageHelp(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID sessionId,
      @PathVariable UUID itemId,
      @Valid @RequestBody DiscloseLanguageHelpRequest request,
      HttpServletResponse response) {
    noStore(response);
    DiscloseLanguageHelpView result =
        assessment.discloseLanguageHelp(actor(jwt), sessionId, itemId, request.trigger());
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("item", itemBody(result.item()));
    body.put("languageHelp", languageHelp(result.languageHelp()));
    body.put("sessionAssistanceSummary", assistance(result.sessionAssistanceSummary()));
    return body;
  }

  @PutMapping("/sessions/{sessionId}/items/{itemId}/answer")
  public Map<String, Object> submitItemAnswer(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID sessionId,
      @PathVariable UUID itemId,
      @Valid @RequestBody SubmitAnswerRequest request,
      HttpServletResponse response) {
    noStore(response);
    ItemAnswerView result =
        assessment.submitItemAnswer(actor(jwt), sessionId, itemId, request.selectedOptionKey());
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("item", itemBody(result.item()));
    body.put("sessionAssistanceSummary", assistance(result.sessionAssistanceSummary()));
    return body;
  }

  @PostMapping("/sessions/{sessionId}/submit")
  public Map<String, Object> submitSession(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID sessionId,
      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
      HttpServletResponse response) {
    noStore(response);
    // Optional Idempotency-Key is accepted at the boundary. Submit is already idempotent
    // for SUBMITTED sessions; lockById serializes a first concurrent submit.
    return resultBody(assessment.submitSession(actor(jwt), sessionId));
  }

  @PostMapping("/sessions/{sessionId}/cancel")
  public Map<String, Object> cancelSession(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID sessionId,
      HttpServletResponse response) {
    noStore(response);
    return sessionBody(assessment.cancelSession(actor(jwt), sessionId));
  }

  @GetMapping("/mistakes")
  public Map<String, Object> listMistakes(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) String subject,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String cursor,
      @RequestParam(required = false) Integer limit,
      HttpServletResponse response) {
    noStore(response);
    MistakeListView page = assessment.listMistakes(actor(jwt), subject, status, cursor, limit);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("items", page.items().stream().map(this::mistakeSummary).toList());
    body.put("nextCursor", page.nextCursor());
    return body;
  }

  @GetMapping("/mistakes/{mistakeId}")
  public Map<String, Object> getMistake(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID mistakeId,
      HttpServletResponse response) {
    noStore(response);
    return mistakeDetail(assessment.getMistake(actor(jwt), mistakeId));
  }

  @PatchMapping("/mistakes/{mistakeId}")
  public Map<String, Object> updateMistakeAnnotation(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID mistakeId,
      @RequestBody Map<String, Object> request,
      HttpServletResponse response) {
    noStore(response);
    boolean errorCausePresent = request.containsKey("errorCause");
    boolean notePresent = request.containsKey("privateNote");
    String errorCause =
        errorCausePresent && request.get("errorCause") != null
            ? request.get("errorCause").toString()
            : null;
    String privateNote =
        notePresent && request.get("privateNote") != null
            ? request.get("privateNote").toString()
            : null;
    return mistakeDetail(
        assessment.updateMistakeAnnotation(
            actor(jwt), mistakeId, errorCausePresent, errorCause, notePresent, privateNote));
  }

  @PostMapping("/mistakes/{mistakeId}/revalidation")
  public ResponseEntity<Map<String, Object>> startRevalidation(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID mistakeId,
      HttpServletResponse response) {
    noStore(response);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(sessionBody(assessment.startRevalidation(actor(jwt), mistakeId)));
  }

  private Map<String, Object> setSummary(AssessmentSetSummaryView set) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("setId", set.setId());
    body.put("packageId", set.packageId());
    body.put("packageRevisionId", set.packageRevisionId());
    body.put("purpose", set.purpose());
    body.put("title", localized(set.title()));
    body.put("examLanguage", set.examLanguage());
    body.put("difficulty", set.difficulty());
    body.put("questionCount", set.questionCount());
    body.put("estimatedMinutes", set.estimatedMinutes());
    body.put("feedbackMode", set.feedbackMode());
    body.put("passPolicy", set.passPolicy());
    body.put("outlineItemIds", set.outlineItemIds());
    body.put("objectiveIds", set.objectiveIds());
    body.put("lessonResourceId", set.lessonResourceId());
    return body;
  }

  private Map<String, Object> checkpoint(CheckpointForLessonView view) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("subject", view.subject());
    body.put("packageId", view.packageId());
    body.put("packageRevisionId", view.packageRevisionId());
    body.put("lessonResourceId", view.lessonResourceId());
    body.put("lessonContentComplete", view.lessonContentComplete());
    body.put("startable", view.startable());
    body.put("lockReason", view.lockReason());
    body.put("checkpointUpdatedSinceLastAttempt", view.checkpointUpdatedSinceLastAttempt());
    body.put(
        "editions",
        view.editions().stream()
            .map(
                edition -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("setId", edition.setId());
                  row.put("examLanguage", edition.examLanguage());
                  row.put("title", localized(edition.title()));
                  row.put("questionCount", edition.questionCount());
                  row.put("estimatedMinutes", edition.estimatedMinutes());
                  row.put("feedbackMode", edition.feedbackMode());
                  row.put("passPolicy", edition.passPolicy());
                  return row;
                })
            .toList());
    return body;
  }

  private Map<String, Object> resumeSummary(SessionResumeSummaryView view) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("sessionId", view.sessionId());
    body.put("status", view.status());
    body.put("purpose", view.purpose());
    body.put("subject", view.subject());
    body.put("packageId", view.packageId());
    body.put("packageRevisionId", view.packageRevisionId());
    body.put("setId", view.setId());
    body.put("mistakeId", view.mistakeId());
    body.put("lessonResourceId", view.lessonResourceId());
    body.put("title", view.title() == null ? null : localized(view.title()));
    body.put("examLanguage", view.examLanguage());
    body.put("feedbackMode", view.feedbackMode());
    body.put("questionCount", view.questionCount());
    body.put("answeredItemCount", view.answeredItemCount());
    body.put("lockedItemCount", view.lockedItemCount());
    body.put("updatedAt", view.updatedAt());
    return body;
  }

  private Map<String, Object> sessionBody(SessionView session) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("sessionId", session.sessionId());
    body.put("status", session.status());
    body.put("purpose", session.purpose());
    body.put("subject", session.subject());
    body.put("packageId", session.packageId());
    body.put("packageRevisionId", session.packageRevisionId());
    body.put("setId", session.setId());
    body.put("mistakeId", session.mistakeId());
    body.put("lessonResourceId", session.lessonResourceId());
    body.put("examLanguage", session.examLanguage());
    body.put("feedbackMode", session.feedbackMode());
    body.put("planTaskId", session.planTaskId());
    body.put("questionCount", session.questionCount());
    body.put("assistanceSummary", assistance(session.assistanceSummary()));
    body.put("items", session.items().stream().map(this::itemBody).toList());
    body.put("context", context(session.context()));
    body.put("createdAt", session.createdAt());
    body.put("updatedAt", session.updatedAt());
    body.put("submittedAt", session.submittedAt());
    return body;
  }

  private Map<String, Object> resultBody(SessionResultView result) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("sessionId", result.sessionId());
    body.put("status", result.status());
    body.put("purpose", result.purpose());
    body.put("correctCount", result.correctCount());
    body.put("total", result.total());
    body.put("strongAssistanceUsed", result.strongAssistanceUsed());
    body.put("checkpointPassed", result.checkpointPassed());
    body.put("mistakeIds", result.mistakeIds());
    body.put("evidenceWritten", result.evidenceWritten().stream().map(this::evidence).toList());
    body.put("items", result.items().stream().map(this::itemBody).toList());
    body.put("context", context(result.context()));
    body.put("submittedAt", result.submittedAt());
    return body;
  }

  private Map<String, Object> itemBody(ItemView item) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("itemId", item.itemId());
    body.put("order", item.order());
    body.put("questionId", item.questionId());
    body.put("status", item.status());
    body.put("stem", item.stem());
    body.put(
        "options",
        item.options().stream()
            .map(
                option -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("key", option.key());
                  row.put("blocks", option.blocks());
                  return row;
                })
            .toList());
    body.put("hintTierCount", item.hintTierCount());
    body.put("disclosedTierCount", item.disclosedTierCount());
    body.put(
        "hintLadder",
        item.hintLadder().stream()
            .map(
                meta -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("tierIndex", meta.tierIndex());
                  row.put("strength", meta.strength());
                  row.put("disclosed", meta.disclosed());
                  return row;
                })
            .toList());
    body.put("disclosedHints", item.disclosedHints().stream().map(this::disclosedBody).toList());
    body.put("strongAssistance", item.strongAssistance());
    body.put("selectedOptionKey", item.selectedOptionKey());
    body.put("correct", item.correct());
    body.put("feedback", item.feedback() == null ? null : feedback(item.feedback()));
    body.put("outlineItemIds", item.outlineItemIds());
    body.put("objectiveIds", item.objectiveIds());
    body.put("languageHelpAvailable", item.languageHelpAvailable());
    if (item.languageHelp() != null) {
      body.put("languageHelp", languageHelp(item.languageHelp()));
    }
    return body;
  }

  private Map<String, Object> languageHelp(LanguageHelpView view) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("disclosed", view.disclosed());
    body.put("trigger", view.trigger());
    body.put(
        "spans",
        view.spans().stream()
            .map(
                span -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("termId", span.termId());
                  row.put("surfaceForm", span.surfaceForm());
                  row.put("blockIndex", span.blockIndex());
                  row.put("startOffset", span.startOffset());
                  row.put("endOffset", span.endOffset());
                  row.put("alreadyInNotebook", span.alreadyInNotebook());
                  return row;
                })
            .toList());
    return body;
  }

  private Map<String, Object> disclosedBody(DisclosedHintView disclosed) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("tierIndex", disclosed.tierIndex());
    body.put("strength", disclosed.strength());
    body.put("blocks", disclosed.blocks());
    return body;
  }

  private Map<String, Object> feedback(ItemFeedbackView feedback) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("correct", feedback.correct());
    body.put("correctOptionKey", feedback.correctOptionKey());
    body.put(
        "explanations",
        feedback.explanations().stream()
            .map(
                explanation -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("language", explanation.language());
                  row.put("blocks", explanation.blocks());
                  return row;
                })
            .toList());
    body.put(
        "commonMistakeNotes", feedback.commonMistakeNotes().stream().map(this::localized).toList());
    body.put(
        "relatedResources",
        feedback.relatedResources().stream()
            .map(
                related -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("resourceId", related.resourceId());
                  row.put("kind", related.kind());
                  row.put("title", localized(related.title()));
                  return row;
                })
            .toList());
    return body;
  }

  private Map<String, Object> assistance(AssistanceSummaryView summary) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("maxTierDisclosed", summary.maxTierDisclosed());
    body.put("strongUsed", summary.strongUsed());
    body.put("languageAssistUsed", summary.languageAssistUsed());
    if (summary.maxLanguageTier() != null) {
      body.put("maxLanguageTier", summary.maxLanguageTier());
    }
    if (summary.languageHelpDisclosed() != null) {
      body.put("languageHelpDisclosed", summary.languageHelpDisclosed());
    }
    return body;
  }

  private Map<String, Object> context(ContextSummaryView context) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("subject", context.subject());
    body.put("packageId", context.packageId());
    body.put("packageRevisionId", context.packageRevisionId());
    body.put("sessionId", context.sessionId());
    body.put("sessionPurpose", context.sessionPurpose());
    body.put("examLanguage", context.examLanguage());
    body.put("setId", context.setId());
    body.put("lessonResourceId", context.lessonResourceId());
    body.put("mistakeId", context.mistakeId());
    body.put("outlineItemIds", context.outlineItemIds());
    body.put("objectiveIds", context.objectiveIds());
    body.put("assistanceSummary", assistance(context.assistanceSummary()));
    body.put("checkpointPassed", context.checkpointPassed());
    return body;
  }

  private Map<String, Object> evidence(EvidenceView evidence) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("objectiveId", evidence.objectiveId());
    body.put("signal", evidence.signal());
    body.put("sourceSessionId", evidence.sourceSessionId());
    body.put("at", evidence.at());
    return body;
  }

  private Map<String, Object> mistakeSummary(MistakeSummaryView mistake) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("mistakeId", mistake.mistakeId());
    body.put("status", mistake.status());
    body.put("subject", mistake.subject());
    body.put("packageId", mistake.packageId());
    body.put("questionId", mistake.questionId());
    body.put("examLanguage", mistake.examLanguage());
    body.put("errorCause", mistake.errorCause());
    body.put("stemPreview", mistake.stemPreview());
    body.put("errorCount", mistake.errorCount());
    body.put("assistanceSummary", assistance(mistake.assistanceSummary()));
    body.put("revalidationEligible", mistake.revalidationEligible());
    body.put("lastSessionId", mistake.lastSessionId());
    body.put("updatedAt", mistake.updatedAt());
    return body;
  }

  private Map<String, Object> mistakeDetail(MistakeDetailView mistake) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("mistakeId", mistake.mistakeId());
    body.put("status", mistake.status());
    body.put("subject", mistake.subject());
    body.put("packageId", mistake.packageId());
    body.put("packageRevisionId", mistake.packageRevisionId());
    body.put("questionId", mistake.questionId());
    body.put("examLanguage", mistake.examLanguage());
    body.put("errorCause", mistake.errorCause());
    body.put("privateNote", mistake.privateNote());
    body.put("errorCount", mistake.errorCount());
    body.put("assistanceSummary", assistance(mistake.assistanceSummary()));
    body.put("revalidationEligible", mistake.revalidationEligible());
    body.put("lastAttemptId", mistake.lastAttemptId());
    body.put("lastSessionId", mistake.lastSessionId());
    body.put("sourceSetId", mistake.sourceSetId());
    body.put("outlineItemIds", mistake.outlineItemIds());
    body.put("objectiveIds", mistake.objectiveIds());
    Map<String, Object> attemptQuestion = new LinkedHashMap<>();
    attemptQuestion.put("questionId", mistake.attemptQuestion().questionId());
    attemptQuestion.put("examLanguage", mistake.attemptQuestion().examLanguage());
    attemptQuestion.put("stem", mistake.attemptQuestion().stem());
    attemptQuestion.put(
        "options",
        mistake.attemptQuestion().options().stream()
            .map(
                option -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("key", option.key());
                  row.put("blocks", option.blocks());
                  return row;
                })
            .toList());
    attemptQuestion.put("outlineItemIds", mistake.attemptQuestion().outlineItemIds());
    attemptQuestion.put("objectiveIds", mistake.attemptQuestion().objectiveIds());
    body.put("attemptQuestion", attemptQuestion);
    Map<String, Object> latest = new LinkedHashMap<>();
    latest.put("selectedOptionKey", mistake.latestResponse().selectedOptionKey());
    latest.put("correct", mistake.latestResponse().correct());
    latest.put("correctOptionKey", mistake.latestResponse().correctOptionKey());
    latest.put(
        "feedback",
        mistake.latestResponse().feedback() == null
            ? null
            : feedback(mistake.latestResponse().feedback()));
    latest.put("lastSessionId", mistake.latestResponse().lastSessionId());
    latest.put("lastAttemptId", mistake.latestResponse().lastAttemptId());
    latest.put("respondedAt", mistake.latestResponse().respondedAt());
    body.put("latestResponse", latest);
    body.put(
        "remediationCandidates",
        mistake.remediationCandidates().stream()
            .map(
                candidate -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("resourceId", candidate.resourceId());
                  row.put("kind", candidate.kind());
                  row.put("title", localized(candidate.title()));
                  row.put("preferred", candidate.preferred());
                  return row;
                })
            .toList());
    body.put("nextDueAt", mistake.nextDueAt());
    body.put("createdAt", mistake.createdAt());
    body.put("updatedAt", mistake.updatedAt());
    return body;
  }

  private Map<String, String> localized(LocalizedTextView title) {
    Map<String, String> body = new LinkedHashMap<>();
    body.put("indonesian", title.indonesian());
    body.put("english", title.english());
    body.put("simplifiedChinese", title.simplifiedChinese());
    return body;
  }

  private static UUID actor(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }

  private static void noStore(HttpServletResponse response) {
    response.setHeader(HttpHeaders.CACHE_CONTROL, CacheControl.noStore().getHeaderValue());
    response.setHeader(HttpHeaders.PRAGMA, "no-cache");
  }

  public record StartSessionRequest(
      @NotBlank String purpose,
      @NotBlank String subject,
      @NotNull UUID setId,
      @NotBlank String examLanguage,
      UUID planTaskId) {}

  public record SubmitAnswerRequest(@NotBlank @Size(max = 40) String selectedOptionKey) {}

  public record DiscloseLanguageHelpRequest(@NotBlank String trigger) {}
}
