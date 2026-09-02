package com.yukcsca.assessment.application;

import com.yukcsca.academic.application.ContentAccessPolicy;
import com.yukcsca.academic.application.FormalAssistanceDisabledException;
import com.yukcsca.academic.application.FormalAssistancePolicy;
import com.yukcsca.academic.application.PublishedAssessmentCatalog;
import com.yukcsca.academic.application.PublishedAssessmentCatalog.AssessmentSetView;
import com.yukcsca.academic.application.PublishedAssessmentCatalog.AuthoredTermAttachmentView;
import com.yukcsca.academic.application.PublishedAssessmentCatalog.HintTierView;
import com.yukcsca.academic.application.PublishedAssessmentCatalog.LocalizedTextView;
import com.yukcsca.academic.application.PublishedAssessmentCatalog.OptionView;
import com.yukcsca.academic.application.PublishedAssessmentCatalog.PublishedPackageAssessmentView;
import com.yukcsca.academic.application.PublishedAssessmentCatalog.QuestionView;
import com.yukcsca.academic.application.PublishedAssessmentCatalog.StudyResourceView;
import com.yukcsca.academic.application.PublishedTerminologyCatalog;
import com.yukcsca.academic.application.StudentContentProgressQuery;
import com.yukcsca.assessment.domain.AssessmentAssistanceEvent;
import com.yukcsca.assessment.domain.AssessmentItemAttempt;
import com.yukcsca.assessment.domain.AssessmentMistake;
import com.yukcsca.assessment.domain.AssessmentObjectiveEvidence;
import com.yukcsca.assessment.domain.AssessmentSession;
import com.yukcsca.assessment.domain.AssessmentSessionPurpose;
import com.yukcsca.assessment.domain.AssessmentSessionStatus;
import com.yukcsca.assessment.domain.CheckpointPassEvaluator;
import com.yukcsca.assessment.domain.ErrorCause;
import com.yukcsca.assessment.domain.ItemAttemptStatus;
import com.yukcsca.assessment.domain.MistakeStatus;
import com.yukcsca.assessment.domain.RemediationResolutionPolicy;
import com.yukcsca.identity.application.CurrentAccount;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@Service
public class AssessmentStudentService {
  private static final Logger LOGGER = LoggerFactory.getLogger(AssessmentStudentService.class);
  private static final Set<String> EXAM_LANGUAGES = Set.of("en", "zh-CN");

  private final PublishedAssessmentCatalog catalog;
  private final PublishedTerminologyCatalog terminology;
  private final FormalAssistancePolicy formalPolicy;
  private final StudentContentProgressQuery progressQuery;
  private final ContentAccessPolicy accessPolicy;
  private final CurrentAuthenticationService authentication;
  private final AssessmentSessionStore sessions;
  private final AssessmentItemAttemptStore items;
  private final AssessmentAssistanceEventStore assistance;
  private final AssessmentMistakeStore mistakes;
  private final AssessmentObjectiveEvidenceStore evidence;
  private final JsonMapper json;
  private final Clock clock;
  private final TransactionTemplate requiresNewTx;

  public AssessmentStudentService(
      PublishedAssessmentCatalog catalog,
      PublishedTerminologyCatalog terminology,
      FormalAssistancePolicy formalPolicy,
      StudentContentProgressQuery progressQuery,
      ContentAccessPolicy accessPolicy,
      CurrentAuthenticationService authentication,
      AssessmentSessionStore sessions,
      AssessmentItemAttemptStore items,
      AssessmentAssistanceEventStore assistance,
      AssessmentMistakeStore mistakes,
      AssessmentObjectiveEvidenceStore evidence,
      JsonMapper json,
      Clock clock,
      PlatformTransactionManager transactionManager) {
    this.catalog = catalog;
    this.terminology = terminology;
    this.formalPolicy = formalPolicy;
    this.progressQuery = progressQuery;
    this.accessPolicy = accessPolicy;
    this.authentication = authentication;
    this.sessions = sessions;
    this.items = items;
    this.assistance = assistance;
    this.mistakes = mistakes;
    this.evidence = evidence;
    this.json = json;
    this.clock = clock;
    this.requiresNewTx = new TransactionTemplate(transactionManager);
    this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  @Transactional(readOnly = true)
  public List<AssessmentSetSummaryView> listAssessmentSets(
      UUID actorId,
      String subject,
      String purpose,
      UUID outlineItemId,
      UUID objectiveId,
      String difficulty,
      String examLanguage) {
    requireStudent(actorId);
    PublishedPackageAssessmentView pkg =
        catalog
            .findActiveBySubject(subject)
            .orElseThrow(() -> new AssessmentNotFoundException("Published package not found."));
    return pkg.assessmentSets().stream()
        .filter(set -> purpose == null || purpose.equals(set.purpose()))
        .filter(set -> examLanguage == null || examLanguage.equals(set.examLanguage()))
        .filter(set -> difficulty == null || difficulty.equals(set.difficulty()))
        .filter(
            set ->
                outlineItemId == null
                    || set.outlineItemIds().contains(outlineItemId)
                    || set.questionIds().stream()
                        .map(pkg.questionsById()::get)
                        .filter(Objects::nonNull)
                        .anyMatch(q -> q.outlineItemIds().contains(outlineItemId)))
        .filter(
            set ->
                objectiveId == null
                    || set.objectiveIds().contains(objectiveId)
                    || set.questionIds().stream()
                        .map(pkg.questionsById()::get)
                        .filter(Objects::nonNull)
                        .anyMatch(q -> q.objectiveIds().contains(objectiveId)))
        .map(set -> toSetSummary(pkg, set))
        .toList();
  }

  @Transactional(readOnly = true)
  public CheckpointForLessonView getCheckpointForLesson(
      UUID actorId, String subject, UUID lessonResourceId) {
    requireStudent(actorId);
    PublishedPackageAssessmentView pkg =
        catalog
            .findActiveBySubject(subject)
            .orElseThrow(() -> new AssessmentNotFoundException("Published package not found."));
    StudyResourceView lesson = pkg.resourcesById().get(lessonResourceId);
    if (lesson == null || !"LESSON".equals(lesson.kind())) {
      throw new AssessmentNotFoundException("Lesson not found.");
    }
    List<AssessmentSetView> checkpoints =
        pkg.assessmentSets().stream()
            .filter(set -> "CHECKPOINT".equals(set.purpose()))
            .filter(set -> lessonResourceId.equals(set.lessonResourceId()))
            .toList();
    boolean contentComplete =
        progressQuery.isContentComplete(actorId, pkg.packageId(), lessonResourceId);
    boolean startable = false;
    String lockReason = null;
    List<CheckpointEditionView> editions = new ArrayList<>();
    if (checkpoints.isEmpty()) {
      lockReason = "NO_CHECKPOINT_PUBLISHED";
    } else if (!contentComplete) {
      lockReason = "LESSON_NOT_CONTENT_COMPLETE";
    } else {
      // One edition per exam language (student chooser). Prefer first published set if
      // legacy packages still carry duplicates; admin publish now rejects duplicates.
      java.util.LinkedHashMap<String, AssessmentSetView> byLanguage =
          new java.util.LinkedHashMap<>();
      for (AssessmentSetView set : checkpoints) {
        if (set.examLanguage() == null || set.examLanguage().isBlank()) {
          continue;
        }
        byLanguage.putIfAbsent(set.examLanguage(), set);
      }
      for (AssessmentSetView set : byLanguage.values()) {
        editions.add(
            new CheckpointEditionView(
                set.setId(),
                set.examLanguage(),
                set.title(),
                set.questionIds().size(),
                set.estimatedMinutes(),
                set.feedbackMode(),
                set.passPolicy() == null ? "ALL_CORRECT_NO_STRONG_ASSISTANCE" : set.passPolicy()));
      }
      if (editions.isEmpty()) {
        lockReason = "NO_EXAM_LANGUAGE_EDITION";
      } else {
        startable = true;
      }
    }
    boolean checkpointUpdatedSinceLastAttempt =
        computeCheckpointUpdatedSinceLastAttempt(actorId, pkg, lessonResourceId);
    return new CheckpointForLessonView(
        pkg.subject(),
        pkg.packageId(),
        pkg.packageRevisionId(),
        lessonResourceId,
        contentComplete,
        startable,
        lockReason,
        checkpointUpdatedSinceLastAttempt,
        List.copyOf(editions));
  }

  /**
   * Soft signal: prior submitted CHECKPOINT for this lesson exists and the published checkpoint
   * material (sets + referenced questions) changed vs that attempt's package revision.
   */
  private boolean computeCheckpointUpdatedSinceLastAttempt(
      UUID actorId, PublishedPackageAssessmentView activePkg, UUID lessonResourceId) {
    AssessmentSession prior =
        sessions
            .findFirstByAccountIdAndPurposeAndLessonResourceIdAndStatusOrderByUpdatedAtDesc(
                actorId,
                AssessmentSessionPurpose.CHECKPOINT,
                lessonResourceId,
                AssessmentSessionStatus.SUBMITTED)
            .orElse(null);
    if (prior == null) {
      return false;
    }
    UUID attemptRevisionId = prior.getPackageRevisionId();
    if (attemptRevisionId == null || attemptRevisionId.equals(activePkg.packageRevisionId())) {
      return false;
    }
    PublishedPackageAssessmentView attemptPkg =
        catalog.findByPackageRevision(activePkg.packageId(), attemptRevisionId).orElse(null);
    if (attemptPkg == null) {
      // Historical revision missing — soft-signal so the student re-checks the checkpoint.
      return true;
    }
    return !checkpointLessonContentEquals(attemptPkg, activePkg, lessonResourceId);
  }

  private static boolean checkpointLessonContentEquals(
      PublishedPackageAssessmentView previous,
      PublishedPackageAssessmentView active,
      UUID lessonResourceId) {
    List<AssessmentSetView> previousSets = checkpointSetsForLesson(previous, lessonResourceId);
    List<AssessmentSetView> activeSets = checkpointSetsForLesson(active, lessonResourceId);
    if (previousSets.size() != activeSets.size()) {
      return false;
    }
    for (int i = 0; i < previousSets.size(); i++) {
      AssessmentSetView prevSet = previousSets.get(i);
      AssessmentSetView activeSet = activeSets.get(i);
      if (!assessmentSetShellEquals(prevSet, activeSet)) {
        return false;
      }
      if (!questionContentEquals(
          previous, active, prevSet.questionIds(), activeSet.questionIds())) {
        return false;
      }
    }
    return true;
  }

  private static List<AssessmentSetView> checkpointSetsForLesson(
      PublishedPackageAssessmentView pkg, UUID lessonResourceId) {
    return pkg.assessmentSets().stream()
        .filter(set -> "CHECKPOINT".equals(set.purpose()))
        .filter(set -> lessonResourceId.equals(set.lessonResourceId()))
        .sorted(
            java.util.Comparator.comparing(
                set -> set.examLanguage() == null ? "" : set.examLanguage()))
        .toList();
  }

  private static boolean assessmentSetShellEquals(AssessmentSetView a, AssessmentSetView b) {
    return Objects.equals(a.setId(), b.setId())
        && Objects.equals(a.examLanguage(), b.examLanguage())
        && Objects.equals(a.title(), b.title())
        && Objects.equals(a.difficulty(), b.difficulty())
        && Objects.equals(a.questionIds(), b.questionIds())
        && Objects.equals(a.feedbackMode(), b.feedbackMode())
        && Objects.equals(a.passPolicy(), b.passPolicy())
        && Objects.equals(a.estimatedMinutes(), b.estimatedMinutes())
        && Objects.equals(a.outlineItemIds(), b.outlineItemIds())
        && Objects.equals(a.objectiveIds(), b.objectiveIds());
  }

  private static boolean questionContentEquals(
      PublishedPackageAssessmentView previous,
      PublishedPackageAssessmentView active,
      List<UUID> previousQuestionIds,
      List<UUID> activeQuestionIds) {
    if (!Objects.equals(previousQuestionIds, activeQuestionIds)) {
      return false;
    }
    for (UUID questionId : previousQuestionIds) {
      QuestionView prevQ = previous.questionsById().get(questionId);
      QuestionView activeQ = active.questionsById().get(questionId);
      if (!Objects.equals(prevQ, activeQ)) {
        return false;
      }
    }
    return true;
  }

  @Transactional(readOnly = true)
  public List<SessionResumeSummaryView> listSessions(UUID actorId, String status, String subject) {
    requireStudent(actorId);
    AssessmentSessionStatus sessionStatus;
    if (status == null || status.isBlank()) {
      sessionStatus = AssessmentSessionStatus.IN_PROGRESS;
    } else {
      try {
        sessionStatus = AssessmentSessionStatus.valueOf(status);
      } catch (IllegalArgumentException exception) {
        throw new AssessmentValidationException(
            List.of(new AssessmentViolation("status", "UNSUPPORTED")));
      }
    }
    List<AssessmentSession> rows =
        subject == null || subject.isBlank()
            ? sessions.findByAccountIdAndStatusOrderByUpdatedAtDesc(actorId, sessionStatus)
            : sessions.findByAccountIdAndSubjectAndStatusOrderByUpdatedAtDesc(
                actorId, subject, sessionStatus);
    return rows.stream().map(this::toResumeSummary).toList();
  }

  @Transactional
  public SessionView startSession(
      UUID actorId,
      String purpose,
      String subject,
      UUID setId,
      String examLanguage,
      UUID planTaskId) {
    requireStudent(actorId);
    if (planTaskId != null) {
      throw new AssessmentValidationException(
          List.of(new AssessmentViolation("planTaskId", "UNSUPPORTED")));
    }
    if (!EXAM_LANGUAGES.contains(examLanguage)) {
      throw new AssessmentValidationException(
          List.of(new AssessmentViolation("examLanguage", "UNSUPPORTED")));
    }
    if (!"CHECKPOINT".equals(purpose) && !"TOPIC_PRACTICE".equals(purpose)) {
      throw new AssessmentValidationException(
          List.of(new AssessmentViolation("purpose", "UNSUPPORTED")));
    }
    PublishedPackageAssessmentView pkg =
        catalog
            .findActiveBySubject(subject)
            .orElseThrow(() -> new AssessmentNotFoundException("Published package not found."));
    AssessmentSetView set =
        pkg.assessmentSets().stream()
            .filter(value -> value.setId().equals(setId))
            .findFirst()
            .orElseThrow(() -> new AssessmentNotFoundException("Assessment set not found."));
    if (!purpose.equals(set.purpose())) {
      throw new AssessmentValidationException(
          List.of(new AssessmentViolation("purpose", "INCOMPATIBLE")));
    }
    if (!examLanguage.equals(set.examLanguage())) {
      throw new AssessmentConflictException(
          "SET_NOT_AVAILABLE", "Assessment set is not available for the requested exam language.");
    }
    if ("CHECKPOINT".equals(purpose)) {
      if (set.lessonResourceId() == null) {
        throw new AssessmentConflictException(
            "SET_NOT_AVAILABLE", "Checkpoint set is missing a lesson link.");
      }
      if (!progressQuery.isContentComplete(actorId, pkg.packageId(), set.lessonResourceId())) {
        throw new AssessmentConflictException(
            "CHECKPOINT_LOCKED", "Lesson content is not complete.", "LESSON_NOT_CONTENT_COMPLETE");
      }
    }
    Optional<AssessmentSession> existing =
        sessions.findFirstByAccountIdAndPurposeAndSetIdAndExamLanguageAndStatusOrderByUpdatedAtDesc(
            actorId,
            AssessmentSessionPurpose.valueOf(purpose),
            set.setId(),
            examLanguage,
            AssessmentSessionStatus.IN_PROGRESS);
    if (existing.isPresent()) {
      AssessmentSession session = existing.get();
      List<AssessmentItemAttempt> attempts =
          items.findBySessionIdOrderByItemOrderAsc(session.getId());
      LOGGER.info(
          "assessment.session.resumed sessionId={} purpose={} subject={} setId={}",
          session.getId(),
          purpose,
          subject,
          setId);
      return toSessionView(session, attempts, false);
    }
    Instant now = now();
    try {
      // Insert in REQUIRES_NEW so a unique-index collision does not abort this request
      // transaction; PostgreSQL otherwise rejects the resume SELECT after flush fails.
      return requiresNewTx.execute(
          status -> {
            AssessmentSession session =
                sessions.save(
                    new AssessmentSession(
                        actorId,
                        pkg.subject(),
                        pkg.packageId(),
                        pkg.packageRevisionId(),
                        AssessmentSessionPurpose.valueOf(purpose),
                        set.setId(),
                        null,
                        set.lessonResourceId(),
                        examLanguage,
                        set.feedbackMode() == null ? "IMMEDIATE" : set.feedbackMode(),
                        writeLocalized(set.title()),
                        false,
                        now));
            sessions.flush();
            List<AssessmentItemAttempt> created = materializeItems(session, set, pkg, now);
            LOGGER.info(
                "assessment.session.started sessionId={} purpose={} subject={} setId={}",
                session.getId(),
                purpose,
                subject,
                setId);
            return toSessionView(session, created, false);
          });
    } catch (DataIntegrityViolationException exception) {
      return sessions
          .findFirstByAccountIdAndPurposeAndSetIdAndExamLanguageAndStatusOrderByUpdatedAtDesc(
              actorId,
              AssessmentSessionPurpose.valueOf(purpose),
              set.setId(),
              examLanguage,
              AssessmentSessionStatus.IN_PROGRESS)
          .map(
              session -> {
                List<AssessmentItemAttempt> attempts =
                    items.findBySessionIdOrderByItemOrderAsc(session.getId());
                LOGGER.info(
                    "assessment.session.resumedAfterConflict sessionId={} purpose={} setId={}",
                    session.getId(),
                    purpose,
                    setId);
                return toSessionView(session, attempts, false);
              })
          .orElseThrow(() -> exception);
    }
  }

  @Transactional(readOnly = true)
  public SessionView getSession(UUID actorId, UUID sessionId) {
    requireStudent(actorId);
    AssessmentSession session = requireOwnedSession(actorId, sessionId);
    if (session.getStatus() == AssessmentSessionStatus.CANCELLED) {
      throw new AssessmentConflictException(
          "SESSION_NOT_RESUMABLE", "Cancelled sessions cannot be resumed.");
    }
    List<AssessmentItemAttempt> attempts =
        items.findBySessionIdOrderByItemOrderAsc(session.getId());
    boolean revealFeedback =
        session.getStatus() == AssessmentSessionStatus.SUBMITTED
            || "IMMEDIATE".equals(session.getFeedbackMode());
    return toSessionView(
        session,
        attempts,
        revealFeedback && session.getStatus() == AssessmentSessionStatus.SUBMITTED
            || ("IMMEDIATE".equals(session.getFeedbackMode())
                && session.getStatus() == AssessmentSessionStatus.IN_PROGRESS));
  }

  @Transactional
  public DiscloseHintView discloseHint(UUID actorId, UUID sessionId, UUID itemId) {
    requireStudent(actorId);
    AssessmentSession session = requireOwnedInProgress(actorId, sessionId);
    AssessmentItemAttempt item =
        items
            .findByIdAndSessionId(itemId, sessionId)
            .orElseThrow(() -> new AssessmentNotFoundException("Item not found."));
    if (item.getStatus() == ItemAttemptStatus.LOCKED) {
      throw new AssessmentConflictException("ITEM_ALREADY_LOCKED", "Item is already locked.");
    }
    ObjectNode copy = parseObject(item.getQuestionCopyJson());
    ArrayNode tiers = (ArrayNode) copy.path("hintTiers");
    int nextIndex = item.getDisclosedTierCount();
    if (nextIndex >= tiers.size()) {
      throw new AssessmentConflictException("HINT_EXHAUSTED", "No further hints are available.");
    }
    JsonNode tier = tiers.get(nextIndex);
    String strength = tier.path("strength").asText("STANDARD");
    if ("STRONG".equals(strength) && session.isStrongHintsDisabled()) {
      throw new AssessmentConflictException(
          "STRONG_HINT_BLOCKED", "Strong hints are disabled for this session.");
    }
    Instant now = now();
    Optional<AssessmentAssistanceEvent> existing =
        assistance.findByItemAttemptIdAndKindAndTierIndex(item.getId(), "MATH_HINT", nextIndex);
    if (existing.isEmpty()) {
      assistance.save(
          new AssessmentAssistanceEvent(
              session.getId(), item.getId(), actorId, nextIndex, strength, now));
    }
    item.discloseTier(nextIndex, "STRONG".equals(strength), now);
    items.save(item);
    session.recordAssistance(nextIndex, "STRONG".equals(strength), now);
    sessions.save(session);
    LOGGER.info(
        "assessment.hint.disclosed sessionId={} itemId={} tierIndex={} strength={}",
        sessionId,
        itemId,
        nextIndex,
        strength);
    List<AssessmentItemAttempt> attempts =
        items.findBySessionIdOrderByItemOrderAsc(session.getId());
    ItemView itemView =
        toItemView(
            session,
            item,
            "IMMEDIATE".equals(session.getFeedbackMode()),
            session.isStrongHintsDisabled());
    return new DiscloseHintView(
        itemView,
        new DisclosedHintView(nextIndex, strength, projectBlocks(tier.path("blocks"))),
        assistanceSummary(session));
  }

  @Transactional
  public DiscloseLanguageHelpView discloseLanguageHelp(
      UUID actorId, UUID sessionId, UUID itemId, String trigger) {
    requireStudent(actorId);
    if (!"STUDENT_REQUEST".equals(trigger) && !"WORDING_HARD".equals(trigger)) {
      throw new AssessmentValidationException(
          List.of(new AssessmentViolation("trigger", "INVALID")));
    }
    if (formalPolicy.isDisabled(actorId)) {
      throw new FormalAssistanceDisabledException();
    }
    AssessmentSession session = requireOwnedInProgress(actorId, sessionId);
    AssessmentItemAttempt item =
        items
            .findByIdAndSessionId(itemId, sessionId)
            .orElseThrow(() -> new AssessmentNotFoundException("Item not found."));
    ObjectNode copy = parseObject(item.getQuestionCopyJson());
    boolean available = languageHelpAvailable(session, copy);
    if (!available) {
      throw new AssessmentConflictException(
          "LANGUAGE_ASSIST_DISABLED", "Language help is not available for this item.");
    }
    Instant now = now();
    LanguageHelpView view;
    if (item.getLanguageHelpJson() != null) {
      view = readLanguageHelp(item.getLanguageHelpJson());
    } else {
      PublishedTerminologyCatalog.LanguageHelpProjection projection =
          terminology.languageHelpForQuestion(
              session.getPackageRevisionId(),
              item.getQuestionId(),
              projectBlocks(copy.path("stem")),
              actorId,
              session.getLessonResourceId());
      String strength = languageTier(projection);
      view =
          new LanguageHelpView(
              true,
              trigger,
              projection.spans().stream()
                  .map(
                      span ->
                          new LanguageHelpSpanView(
                              span.termId(),
                              span.surfaceForm(),
                              span.blockIndex(),
                              span.startOffset(),
                              span.endOffset(),
                              span.alreadyInNotebook()))
                  .toList());
      item.discloseLanguageHelp(writeLanguageHelp(view), now);
      items.save(item);
      if (assistance
          .findByItemAttemptIdAndKindAndTierIndex(item.getId(), "LANGUAGE_ASSIST", 0)
          .isEmpty()) {
        assistance.save(
            new AssessmentAssistanceEvent(
                session.getId(), item.getId(), actorId, "LANGUAGE_ASSIST", 0, strength, now));
      }
      session.touch(now);
      sessions.save(session);
      LOGGER.info(
          "assessment.language_help.disclosed sessionId={} itemId={} trigger={} strength={} spans={}",
          sessionId,
          itemId,
          trigger,
          strength,
          view.spans().size());
    }
    ItemView itemView =
        toItemView(
            session,
            item,
            "IMMEDIATE".equals(session.getFeedbackMode()),
            session.isStrongHintsDisabled());
    return new DiscloseLanguageHelpView(itemView, view, assistanceSummary(session));
  }

  @Transactional
  public ItemAnswerView submitItemAnswer(
      UUID actorId, UUID sessionId, UUID itemId, String selectedOptionKey) {
    requireStudent(actorId);
    AssessmentSession session = requireOwnedInProgress(actorId, sessionId);
    if (selectedOptionKey == null
        || selectedOptionKey.isBlank()
        || selectedOptionKey.length() > 40) {
      throw new AssessmentValidationException(
          List.of(new AssessmentViolation("selectedOptionKey", "INVALID")));
    }
    AssessmentItemAttempt item =
        items
            .findByIdAndSessionId(itemId, sessionId)
            .orElseThrow(() -> new AssessmentNotFoundException("Item not found."));
    Instant now = now();
    ObjectNode copy = parseObject(item.getQuestionCopyJson());
    String correctKey = copy.path("correctOptionKey").asText();
    boolean isCorrect = selectedOptionKey.equals(correctKey);
    if ("SET_END".equals(session.getFeedbackMode())) {
      if (item.getStatus() == ItemAttemptStatus.LOCKED) {
        throw new AssessmentConflictException("ITEM_ALREADY_LOCKED", "Item is already locked.");
      }
      item.selectAnswer(selectedOptionKey, now);
      items.save(item);
      session.touch(now);
      sessions.save(session);
      return new ItemAnswerView(
          toItemView(session, item, false, session.isStrongHintsDisabled()),
          assistanceSummary(session));
    }
    // IMMEDIATE: lock on answer
    if (item.getStatus() == ItemAttemptStatus.LOCKED) {
      if (selectedOptionKey.equals(item.getSelectedOptionKey())) {
        return new ItemAnswerView(
            toItemView(session, item, true, session.isStrongHintsDisabled()),
            assistanceSummary(session));
      }
      throw new AssessmentConflictException("ITEM_ALREADY_LOCKED", "Item is already locked.");
    }
    item.selectAnswer(selectedOptionKey, now);
    item.lock(isCorrect, now);
    items.save(item);
    session.touch(now);
    sessions.save(session);
    LOGGER.info(
        "assessment.item.locked sessionId={} itemId={} correct={} strongAssistance={}",
        sessionId,
        itemId,
        isCorrect,
        item.isStrongAssistance());
    return new ItemAnswerView(
        toItemView(session, item, true, session.isStrongHintsDisabled()),
        assistanceSummary(session));
  }

  @Transactional
  public SessionResultView submitSession(UUID actorId, UUID sessionId) {
    requireStudent(actorId);
    AssessmentSession session =
        sessions
            .lockById(sessionId)
            .orElseThrow(() -> new AssessmentNotFoundException("Session not found."));
    if (!session.getAccountId().equals(actorId)) {
      throw new AssessmentAccessDeniedException();
    }
    if (session.getStatus() == AssessmentSessionStatus.SUBMITTED) {
      // Idempotent return of prior result
      List<AssessmentItemAttempt> existing =
          items.findBySessionIdOrderByItemOrderAsc(session.getId());
      return toResultView(session, existing, List.of(), List.of());
    }
    if (session.getStatus() != AssessmentSessionStatus.IN_PROGRESS) {
      throw new AssessmentConflictException(
          "SESSION_NOT_RESUMABLE", "Session cannot be submitted.");
    }
    Instant now = now();
    List<AssessmentItemAttempt> attempts =
        items.findBySessionIdOrderByItemOrderAsc(session.getId());
    for (AssessmentItemAttempt item : attempts) {
      if (item.getStatus() == ItemAttemptStatus.OPEN) {
        if (item.getSelectedOptionKey() == null) {
          throw new AssessmentValidationException(
              List.of(new AssessmentViolation("items", "INCOMPLETE")));
        }
        ObjectNode copy = parseObject(item.getQuestionCopyJson());
        boolean isCorrect =
            item.getSelectedOptionKey().equals(copy.path("correctOptionKey").asText());
        item.lock(isCorrect, now);
        items.save(item);
      }
    }
    attempts = items.findBySessionIdOrderByItemOrderAsc(session.getId());
    int correctCount = 0;
    boolean anyStrong = session.isStrongUsed();
    for (AssessmentItemAttempt item : attempts) {
      if (Boolean.TRUE.equals(item.getCorrect())) correctCount++;
      if (item.isStrongAssistance()) anyStrong = true;
    }
    boolean allCorrect = correctCount == attempts.size();
    Boolean checkpointPassed = null;
    List<EvidenceView> evidenceWritten = new ArrayList<>();
    if (session.getPurpose() == AssessmentSessionPurpose.CHECKPOINT) {
      boolean pass = CheckpointPassEvaluator.passes(allCorrect, anyStrong);
      checkpointPassed = pass;
      if (pass) {
        Set<UUID> objectiveIds = new LinkedHashSet<>();
        for (AssessmentItemAttempt item : attempts) {
          ObjectNode copy = parseObject(item.getQuestionCopyJson());
          for (UUID objectiveId : uuidArray(copy.path("objectiveIds"))) {
            objectiveIds.add(objectiveId);
          }
        }
        if (session.getSetId() != null) {
          catalog
              .findByPackageRevision(session.getPackageId(), session.getPackageRevisionId())
              .ifPresent(
                  pkg ->
                      pkg.assessmentSets().stream()
                          .filter(set -> set.setId().equals(session.getSetId()))
                          .findFirst()
                          .ifPresent(set -> objectiveIds.addAll(set.objectiveIds())));
        }
        for (UUID objectiveId : objectiveIds) {
          if (evidence.existsBySourceSessionIdAndObjectiveId(session.getId(), objectiveId)) {
            continue;
          }
          AssessmentObjectiveEvidence row =
              evidence.save(
                  new AssessmentObjectiveEvidence(
                      actorId,
                      session.getSubject(),
                      session.getPackageId(),
                      objectiveId,
                      session.getId(),
                      now));
          evidenceWritten.add(
              new EvidenceView(
                  row.getObjectiveId(),
                  row.getSignal(),
                  row.getSourceSessionId(),
                  row.getOccurredAt()));
        }
        LOGGER.info(
            "assessment.evidence.written sessionId={} signal=CHECKPOINT_PASSED objectiveCount={}",
            session.getId(),
            objectiveIds.size());
      }
    }
    List<UUID> mistakeIds = new ArrayList<>();
    if (session.getPurpose() == AssessmentSessionPurpose.REVALIDATION
        && session.getMistakeId() != null) {
      applyRevalidationOutcome(session, attempts, now);
      mistakeIds.add(session.getMistakeId());
    } else {
      for (AssessmentItemAttempt item : attempts) {
        if (Boolean.FALSE.equals(item.getCorrect())) {
          AssessmentMistake mistake = upsertMistake(session, item, now);
          mistakeIds.add(mistake.getId());
        }
      }
    }
    session.markSubmitted(checkpointPassed, now);
    sessions.save(session);
    LOGGER.info(
        "assessment.session.submitted sessionId={} purpose={} correctCount={} total={} checkpointPassed={}",
        session.getId(),
        session.getPurpose(),
        correctCount,
        attempts.size(),
        checkpointPassed);
    return toResultView(session, attempts, mistakeIds, evidenceWritten);
  }

  @Transactional
  public SessionView cancelSession(UUID actorId, UUID sessionId) {
    requireStudent(actorId);
    AssessmentSession session = requireOwnedSession(actorId, sessionId);
    if (session.getStatus() == AssessmentSessionStatus.SUBMITTED) {
      throw new AssessmentConflictException(
          "SESSION_ALREADY_SUBMITTED", "Submitted sessions cannot be cancelled.");
    }
    if (session.getStatus() == AssessmentSessionStatus.CANCELLED) {
      List<AssessmentItemAttempt> attempts =
          items.findBySessionIdOrderByItemOrderAsc(session.getId());
      return toSessionView(session, attempts, false);
    }
    Instant now = now();
    session.markCancelled(now);
    sessions.save(session);
    List<AssessmentItemAttempt> attempts =
        items.findBySessionIdOrderByItemOrderAsc(session.getId());
    return toSessionView(session, attempts, false);
  }

  @Transactional
  public MistakeListView listMistakes(
      UUID actorId, String subject, String status, String cursor, Integer limit) {
    requireStudent(actorId);
    int pageSize = limit == null ? 20 : Math.min(100, Math.max(1, limit));
    String subjectFilter = subject == null || subject.isBlank() ? null : subject;
    refreshOpenMistakeEligibility(actorId, subjectFilter);
    MistakeStatus statusFilter = parseMistakeStatus(status);
    List<AssessmentMistake> rows;
    if (cursor == null || cursor.isBlank()) {
      rows = mistakes.findPage(actorId, subjectFilter, statusFilter, pageSize + 1);
    } else {
      UUID cursorId = parseUuid(cursor);
      if (cursorId == null) {
        throw new AssessmentValidationException(
            List.of(new AssessmentViolation("cursor", "INVALID")));
      }
      AssessmentMistake cursorRow =
          mistakes
              .findById(cursorId)
              .orElseThrow(() -> new AssessmentNotFoundException("Mistake cursor not found."));
      if (!cursorRow.getAccountId().equals(actorId)) {
        throw new AssessmentAccessDeniedException();
      }
      if (subjectFilter != null && !subjectFilter.equals(cursorRow.getSubject())) {
        throw new AssessmentValidationException(
            List.of(new AssessmentViolation("cursor", "INCOMPATIBLE")));
      }
      if (statusFilter != null && statusFilter != cursorRow.getStatus()) {
        throw new AssessmentValidationException(
            List.of(new AssessmentViolation("cursor", "INCOMPATIBLE")));
      }
      rows =
          mistakes.findPageAfterCursor(
              actorId,
              subjectFilter,
              statusFilter,
              cursorRow.getUpdatedAt(),
              cursorRow.getId(),
              pageSize + 1);
    }
    boolean hasMore = rows.size() > pageSize;
    List<AssessmentMistake> page = hasMore ? rows.subList(0, pageSize) : rows;
    List<MistakeSummaryView> items = page.stream().map(this::toMistakeSummary).toList();
    String nextCursor = hasMore && !page.isEmpty() ? page.getLast().getId().toString() : null;
    return new MistakeListView(items, nextCursor);
  }

  @Transactional
  public MistakeDetailView getMistake(UUID actorId, UUID mistakeId) {
    requireStudent(actorId);
    AssessmentMistake mistake = requireOwnedMistake(actorId, mistakeId);
    refreshRemediationEligibility(mistake);
    // Opening the notebook starts review: OPEN → REMEDIATION_IN_PROGRESS.
    if (mistake.getStatus() == MistakeStatus.OPEN) {
      mistake.markRemediationInProgress(now());
      mistakes.save(mistake);
    }
    return toMistakeDetail(mistake);
  }

  @Transactional
  public MistakeDetailView updateMistakeAnnotation(
      UUID actorId,
      UUID mistakeId,
      boolean errorCausePresent,
      String errorCause,
      boolean notePresent,
      String privateNote) {
    requireStudent(actorId);
    AssessmentMistake mistake = requireOwnedMistake(actorId, mistakeId);
    ErrorCause cause = mistake.getErrorCause();
    String note = mistake.getPrivateNote();
    if (errorCausePresent) {
      if (errorCause == null) {
        cause = null;
      } else {
        try {
          cause = ErrorCause.valueOf(errorCause);
        } catch (IllegalArgumentException exception) {
          throw new AssessmentValidationException(
              List.of(new AssessmentViolation("errorCause", "UNSUPPORTED")));
        }
      }
    }
    if (notePresent) {
      if (privateNote != null && privateNote.length() > 2000) {
        throw new AssessmentValidationException(
            List.of(new AssessmentViolation("privateNote", "OUT_OF_RANGE")));
      }
      note = privateNote;
    }
    mistake.updateAnnotation(cause, note, now());
    mistakes.save(mistake);
    return toMistakeDetail(mistake);
  }

  @Transactional
  public SessionView startRevalidation(UUID actorId, UUID mistakeId) {
    requireStudent(actorId);
    AssessmentMistake mistake = requireOwnedMistake(actorId, mistakeId);
    if (!isRevalidationEligible(mistake)) {
      throw new AssessmentConflictException(
          "REVALIDATION_NOT_ELIGIBLE", "Mistake is not ready for revalidation.");
    }
    if (mistake.getStatus() != MistakeStatus.AWAITING_REVALIDATION) {
      mistake.markAwaitingRevalidation(now());
      mistakes.save(mistake);
    }
    Optional<AssessmentSession> existingRevalidation =
        sessions.findFirstByAccountIdAndPurposeAndMistakeIdAndStatusOrderByUpdatedAtDesc(
            actorId,
            AssessmentSessionPurpose.REVALIDATION,
            mistakeId,
            AssessmentSessionStatus.IN_PROGRESS);
    if (existingRevalidation.isPresent()) {
      AssessmentSession session = existingRevalidation.get();
      List<AssessmentItemAttempt> attempts =
          items.findBySessionIdOrderByItemOrderAsc(session.getId());
      LOGGER.info(
          "assessment.revalidation.resumed mistakeId={} sessionId={}", mistakeId, session.getId());
      return toSessionView(session, attempts, true);
    }
    PublishedPackageAssessmentView pkg =
        catalog
            .findActiveBySubject(mistake.getSubject())
            .orElseThrow(() -> new AssessmentNotFoundException("Published package not found."));
    Set<UUID> objectiveIds = new HashSet<>(uuidListFromJson(mistake.getObjectiveIdsJson()));
    Set<UUID> outlineItemIds = new HashSet<>(uuidListFromJson(mistake.getOutlineItemIdsJson()));
    List<RemediationResolutionPolicy.QuestionCandidate> candidates =
        revalidationQuestionCandidates(pkg, mistake);
    Set<UUID> assistedCorrectQuestionIds =
        assistedCorrectRevalidationQuestionIds(actorId, mistakeId);
    UUID selectedQuestionId =
        RemediationResolutionPolicy.preferAlternateQuestion(
            mistake.getQuestionId(),
            mistake.getExamLanguage(),
            objectiveIds,
            outlineItemIds,
            candidates,
            assistedCorrectQuestionIds);
    QuestionView selectedQuestion = pkg.questionsById().get(selectedQuestionId);
    if (selectedQuestion == null) {
      selectedQuestion = pkg.questionsById().get(mistake.getQuestionId());
    }
    if (selectedQuestion == null) {
      throw new AssessmentConflictException(
          "SET_NOT_AVAILABLE", "No revalidation question is available.");
    }
    QuestionView question = selectedQuestion;
    Instant now = now();
    try {
      return requiresNewTx.execute(
          status -> {
            AssessmentSession session =
                sessions.save(
                    new AssessmentSession(
                        actorId,
                        pkg.subject(),
                        pkg.packageId(),
                        pkg.packageRevisionId(),
                        AssessmentSessionPurpose.REVALIDATION,
                        mistake.getSourceSetId(),
                        mistake.getId(),
                        null,
                        mistake.getExamLanguage(),
                        "IMMEDIATE",
                        null,
                        true,
                        now));
            sessions.flush();
            AssessmentItemAttempt item =
                items.save(
                    new AssessmentItemAttempt(
                        session.getId(),
                        actorId,
                        0,
                        question.questionId(),
                        writeQuestionCopy(question, pkg),
                        now));
            LOGGER.info(
                "assessment.revalidation.started mistakeId={} sessionId={} usedAlternateQuestion={}",
                mistakeId,
                session.getId(),
                !question.questionId().equals(mistake.getQuestionId()));
            return toSessionView(session, List.of(item), true);
          });
    } catch (DataIntegrityViolationException exception) {
      return sessions
          .findFirstByAccountIdAndPurposeAndMistakeIdAndStatusOrderByUpdatedAtDesc(
              actorId,
              AssessmentSessionPurpose.REVALIDATION,
              mistakeId,
              AssessmentSessionStatus.IN_PROGRESS)
          .map(
              session -> {
                List<AssessmentItemAttempt> attempts =
                    items.findBySessionIdOrderByItemOrderAsc(session.getId());
                LOGGER.info(
                    "assessment.revalidation.resumedAfterConflict mistakeId={} sessionId={}",
                    mistakeId,
                    session.getId());
                return toSessionView(session, attempts, true);
              })
          .orElseThrow(() -> exception);
    }
  }

  private void applyRevalidationOutcome(
      AssessmentSession session, List<AssessmentItemAttempt> attempts, Instant now) {
    AssessmentMistake mistake =
        mistakes
            .findById(session.getMistakeId())
            .orElseThrow(() -> new AssessmentNotFoundException("Mistake not found."));
    boolean anyAssistance =
        assistance.countBySessionIdAndKind(session.getId(), "MATH_HINT") > 0
            || assistance.countBySessionIdAndKind(session.getId(), "AGENT_QA") > 0;
    AssessmentItemAttempt item = attempts.isEmpty() ? null : attempts.getFirst();
    boolean itemCorrect =
        item != null && attempts.size() == 1 && Boolean.TRUE.equals(item.getCorrect());
    if (CheckpointPassEvaluator.revalidationPasses(itemCorrect, anyAssistance)) {
      mistake.markRevalidationPassed(now);
    } else if (item != null && Boolean.FALSE.equals(item.getCorrect())) {
      if (item.getQuestionId().equals(mistake.getQuestionId())) {
        ObjectNode copy = parseObject(item.getQuestionCopyJson());
        String latestResponseJson =
            writeLatestResponse(
                item.getSelectedOptionKey(),
                false,
                copy.path("correctOptionKey").asText(),
                buildFeedback(copy, false),
                session.getId(),
                item.getId(),
                now);
        mistake.recordIncorrectAttempt(
            item.getId(),
            session.getId(),
            session.getPackageRevisionId(),
            item.getDisclosedTierCount(),
            item.isStrongAssistance(),
            latestResponseJson,
            now);
      } else {
        // Alternate item: keep notebook identity on the original question.
        mistake.recordFailedRevalidation(item.getId(), session.getId(), now);
      }
    } else {
      mistake.markRevalidationFailed(now);
    }
    mistakes.save(mistake);
  }

  /**
   * Questions the student already answered correctly with a hint on a prior REVALIDATION session
   * for this mistake. The next recheck should use a different item (D-16 independent evidence).
   */
  private Set<UUID> assistedCorrectRevalidationQuestionIds(UUID actorId, UUID mistakeId) {
    List<AssessmentSession> prior =
        sessions.findByAccountIdAndPurposeAndMistakeIdAndStatusOrderByUpdatedAtDesc(
            actorId,
            AssessmentSessionPurpose.REVALIDATION,
            mistakeId,
            AssessmentSessionStatus.SUBMITTED);
    Set<UUID> excluded = new LinkedHashSet<>();
    for (AssessmentSession priorSession : prior) {
      if (assistance.countBySessionIdAndKind(priorSession.getId(), "MATH_HINT") <= 0
          && assistance.countBySessionIdAndKind(priorSession.getId(), "AGENT_QA") <= 0) {
        continue;
      }
      for (AssessmentItemAttempt priorItem :
          items.findBySessionIdOrderByItemOrderAsc(priorSession.getId())) {
        if (Boolean.TRUE.equals(priorItem.getCorrect())) {
          excluded.add(priorItem.getQuestionId());
        }
      }
    }
    return excluded;
  }

  private List<RemediationResolutionPolicy.QuestionCandidate> revalidationQuestionCandidates(
      PublishedPackageAssessmentView pkg, AssessmentMistake mistake) {
    LinkedHashSet<UUID> orderedIds = new LinkedHashSet<>();
    if (mistake.getSourceSetId() != null) {
      pkg.assessmentSets().stream()
          .filter(set -> set.setId().equals(mistake.getSourceSetId()))
          .findFirst()
          .ifPresent(set -> orderedIds.addAll(set.questionIds()));
    }
    pkg.questionsById().keySet().stream().sorted().forEach(orderedIds::add);
    List<RemediationResolutionPolicy.QuestionCandidate> candidates = new ArrayList<>();
    for (UUID questionId : orderedIds) {
      QuestionView question = pkg.questionsById().get(questionId);
      if (question == null) {
        continue;
      }
      candidates.add(
          new RemediationResolutionPolicy.QuestionCandidate(
              question.questionId(),
              question.examLanguage(),
              new HashSet<>(question.objectiveIds()),
              new HashSet<>(question.outlineItemIds())));
    }
    return candidates;
  }

  private MistakeStatus parseMistakeStatus(String status) {
    if (status == null || status.isBlank()) {
      return null;
    }
    try {
      return MistakeStatus.valueOf(status);
    } catch (IllegalArgumentException exception) {
      throw new AssessmentValidationException(
          List.of(new AssessmentViolation("status", "UNSUPPORTED")));
    }
  }

  private AssessmentMistake upsertMistake(
      AssessmentSession session, AssessmentItemAttempt item, Instant now) {
    ObjectNode copy = parseObject(item.getQuestionCopyJson());
    String attemptQuestionJson = writeAttemptQuestion(copy);
    String latestResponseJson =
        writeLatestResponse(
            item.getSelectedOptionKey(),
            false,
            copy.path("correctOptionKey").asText(),
            buildFeedback(copy, false),
            session.getId(),
            item.getId(),
            now);
    Optional<AssessmentMistake> existing =
        mistakes.findByAccountIdAndPackageIdAndQuestionId(
            session.getAccountId(), session.getPackageId(), item.getQuestionId());
    if (existing.isPresent()) {
      AssessmentMistake mistake = existing.get();
      mistake.recordIncorrectAttempt(
          item.getId(),
          session.getId(),
          session.getPackageRevisionId(),
          item.getDisclosedTierCount(),
          item.isStrongAssistance(),
          latestResponseJson,
          now);
      AssessmentMistake saved = mistakes.save(mistake);
      LOGGER.info(
          "assessment.mistake.upserted mistakeId={} status={} errorCount={}",
          saved.getId(),
          saved.getStatus(),
          saved.getErrorCount());
      return saved;
    }
    AssessmentMistake created =
        mistakes.save(
            new AssessmentMistake(
                session.getAccountId(),
                session.getSubject(),
                session.getPackageId(),
                session.getPackageRevisionId(),
                item.getQuestionId(),
                session.getExamLanguage(),
                item.getId(),
                session.getId(),
                session.getSetId(),
                item.getDisclosedTierCount(),
                item.isStrongAssistance(),
                attemptQuestionJson,
                latestResponseJson,
                copy.path("outlineItemIds").toString(),
                copy.path("objectiveIds").toString(),
                now));
    LOGGER.info(
        "assessment.mistake.upserted mistakeId={} status={} errorCount={}",
        created.getId(),
        created.getStatus(),
        created.getErrorCount());
    return created;
  }

  private List<AssessmentItemAttempt> materializeItems(
      AssessmentSession session,
      AssessmentSetView set,
      PublishedPackageAssessmentView pkg,
      Instant now) {
    List<AssessmentItemAttempt> created = new ArrayList<>();
    int order = 0;
    for (UUID questionId : set.questionIds()) {
      QuestionView question = pkg.questionsById().get(questionId);
      if (question == null) {
        throw new AssessmentConflictException(
            "SET_NOT_AVAILABLE", "Assessment set references a missing question.");
      }
      created.add(
          items.save(
              new AssessmentItemAttempt(
                  session.getId(),
                  session.getAccountId(),
                  order++,
                  questionId,
                  writeQuestionCopy(question, pkg),
                  now)));
    }
    return created;
  }

  private boolean isRevalidationEligible(AssessmentMistake mistake) {
    if (mistake.getStatus() == MistakeStatus.AWAITING_REVALIDATION) {
      return true;
    }
    if (mistake.getStatus() == MistakeStatus.REVALIDATION_PASSED) {
      return false;
    }
    // OPEN / REMEDIATION_IN_PROGRESS: eligible when corrective content complete
    return correctiveComplete(mistake);
  }

  private boolean correctiveComplete(AssessmentMistake mistake) {
    List<RemediationResolutionPolicy.Candidate> candidates = remediationCandidates(mistake);
    if (candidates.isEmpty()) {
      return false;
    }
    for (RemediationResolutionPolicy.Candidate candidate : candidates) {
      if (progressQuery.isContentComplete(
          mistake.getAccountId(), mistake.getPackageId(), candidate.resourceId())) {
        return true;
      }
    }
    return false;
  }

  private void refreshOpenMistakeEligibility(UUID actorId, String subjectFilter) {
    List<MistakeStatus> openStatuses =
        List.of(MistakeStatus.OPEN, MistakeStatus.REMEDIATION_IN_PROGRESS);
    List<AssessmentMistake> rows =
        subjectFilter == null
            ? mistakes.findByAccountIdAndStatusInOrderByUpdatedAtDesc(actorId, openStatuses)
            : mistakes.findByAccountIdAndSubjectAndStatusInOrderByUpdatedAtDesc(
                actorId, subjectFilter, openStatuses);
    for (AssessmentMistake mistake : rows) {
      refreshRemediationEligibility(mistake);
    }
  }

  private void refreshRemediationEligibility(AssessmentMistake mistake) {
    if (mistake.getStatus() != MistakeStatus.OPEN
        && mistake.getStatus() != MistakeStatus.REMEDIATION_IN_PROGRESS) {
      return;
    }
    if (correctiveComplete(mistake)) {
      mistake.markAwaitingRevalidation(now());
      mistakes.save(mistake);
      return;
    }
    if (mistake.getStatus() == MistakeStatus.OPEN && correctiveStudyStarted(mistake)) {
      mistake.markRemediationInProgress(now());
      mistakes.save(mistake);
    }
  }

  private boolean correctiveStudyStarted(AssessmentMistake mistake) {
    for (RemediationResolutionPolicy.Candidate candidate : remediationCandidates(mistake)) {
      Optional<StudentContentProgressQuery.ContentProgressStatusView> progress =
          progressQuery.find(
              mistake.getAccountId(), mistake.getPackageId(), candidate.resourceId());
      if (progress.isPresent() && !"NOT_STARTED".equals(progress.get().status())) {
        return true;
      }
    }
    return false;
  }

  private List<RemediationResolutionPolicy.Candidate> remediationCandidates(
      AssessmentMistake mistake) {
    Optional<PublishedPackageAssessmentView> pkgOpt =
        catalog.findActiveBySubject(mistake.getSubject());
    if (pkgOpt.isEmpty()) return List.of();
    PublishedPackageAssessmentView pkg = pkgOpt.get();
    List<UUID> explicit = List.of();
    if (mistake.getSourceSetId() != null) {
      explicit =
          pkg.assessmentSets().stream()
              .filter(set -> set.setId().equals(mistake.getSourceSetId()))
              .findFirst()
              .map(AssessmentSetView::remediationResourceIds)
              .orElse(List.of());
    }
    List<RemediationResolutionPolicy.ResourceRef> resources = new ArrayList<>();
    for (StudyResourceView resource : pkg.resourcesById().values()) {
      resources.add(
          new RemediationResolutionPolicy.ResourceRef(
              resource.resourceId(),
              resource.kind(),
              new HashSet<>(resource.objectiveIds()),
              new HashSet<>(resource.outlineItemIds())));
    }
    return RemediationResolutionPolicy.resolve(
        explicit,
        new HashSet<>(uuidListFromJson(mistake.getObjectiveIdsJson())),
        new HashSet<>(uuidListFromJson(mistake.getOutlineItemIdsJson())),
        resources);
  }

  private CurrentAccount requireStudent(UUID actorId) {
    CurrentAccount account = authentication.requireAccount(actorId);
    if (!accessPolicy.mayReadPublishedContent(account)) {
      throw new AssessmentAccessDeniedException();
    }
    return account;
  }

  private AssessmentSession requireOwnedSession(UUID actorId, UUID sessionId) {
    AssessmentSession session =
        sessions
            .findById(sessionId)
            .orElseThrow(() -> new AssessmentNotFoundException("Session not found."));
    if (!session.getAccountId().equals(actorId)) {
      throw new AssessmentAccessDeniedException();
    }
    return session;
  }

  private AssessmentSession requireOwnedInProgress(UUID actorId, UUID sessionId) {
    AssessmentSession session = requireOwnedSession(actorId, sessionId);
    if (session.getStatus() == AssessmentSessionStatus.SUBMITTED) {
      throw new AssessmentConflictException(
          "SESSION_ALREADY_SUBMITTED", "Session is already submitted.");
    }
    if (session.getStatus() != AssessmentSessionStatus.IN_PROGRESS) {
      throw new AssessmentConflictException("SESSION_NOT_RESUMABLE", "Session is not in progress.");
    }
    return session;
  }

  private AssessmentMistake requireOwnedMistake(UUID actorId, UUID mistakeId) {
    AssessmentMistake mistake =
        mistakes
            .findById(mistakeId)
            .orElseThrow(() -> new AssessmentNotFoundException("Mistake not found."));
    if (!mistake.getAccountId().equals(actorId)) {
      throw new AssessmentAccessDeniedException();
    }
    return mistake;
  }

  private SessionView toSessionView(
      AssessmentSession session, List<AssessmentItemAttempt> attempts, boolean revealWhenLocked) {
    boolean reveal =
        revealWhenLocked
            || session.getStatus() == AssessmentSessionStatus.SUBMITTED
            || "IMMEDIATE".equals(session.getFeedbackMode());
    List<ItemView> itemViews =
        attempts.stream()
            .map(
                item ->
                    toItemView(
                        session,
                        item,
                        reveal && item.getStatus() == ItemAttemptStatus.LOCKED,
                        session.isStrongHintsDisabled()))
            .toList();
    return new SessionView(
        session.getId(),
        session.getStatus().name(),
        session.getPurpose().name(),
        session.getSubject(),
        session.getPackageId(),
        session.getPackageRevisionId(),
        session.getSetId(),
        session.getMistakeId(),
        session.getLessonResourceId(),
        session.getExamLanguage(),
        session.getFeedbackMode(),
        session.getPlanTaskId(),
        attempts.size(),
        assistanceSummary(session),
        itemViews,
        contextSummary(session, attempts),
        session.getCreatedAt(),
        session.getUpdatedAt(),
        session.getSubmittedAt());
  }

  private SessionResultView toResultView(
      AssessmentSession session,
      List<AssessmentItemAttempt> attempts,
      List<UUID> mistakeIds,
      List<EvidenceView> evidenceWritten) {
    int correctCount =
        (int) attempts.stream().filter(item -> Boolean.TRUE.equals(item.getCorrect())).count();
    if (evidenceWritten.isEmpty() && session.getStatus() == AssessmentSessionStatus.SUBMITTED) {
      evidenceWritten =
          evidence.findBySourceSessionId(session.getId()).stream()
              .map(
                  row ->
                      new EvidenceView(
                          row.getObjectiveId(),
                          row.getSignal(),
                          row.getSourceSessionId(),
                          row.getOccurredAt()))
              .toList();
    }
    if (mistakeIds.isEmpty()) {
      mistakeIds =
          mistakes.findByAccountIdOrderByUpdatedAtDesc(session.getAccountId(), 50).stream()
              .filter(m -> session.getId().equals(m.getLastSessionId()))
              .map(AssessmentMistake::getId)
              .toList();
    }
    List<ItemView> itemViews =
        attempts.stream()
            .map(item -> toItemView(session, item, true, session.isStrongHintsDisabled()))
            .toList();
    return new SessionResultView(
        session.getId(),
        "SUBMITTED",
        session.getPurpose().name(),
        correctCount,
        attempts.size(),
        session.isStrongUsed(),
        session.getCheckpointPassed(),
        mistakeIds,
        evidenceWritten,
        itemViews,
        contextSummary(session, attempts),
        session.getSubmittedAt() == null ? now() : session.getSubmittedAt());
  }

  private ItemView toItemView(
      AssessmentSession session,
      AssessmentItemAttempt item,
      boolean revealFeedback,
      boolean strongDisabled) {
    ObjectNode copy = parseObject(item.getQuestionCopyJson());
    ArrayNode tiers = (ArrayNode) copy.path("hintTiers");
    List<HintMetaView> ladder = new ArrayList<>();
    List<DisclosedHintView> disclosed = new ArrayList<>();
    for (int i = 0; i < tiers.size(); i++) {
      JsonNode tier = tiers.get(i);
      String strength = tier.path("strength").asText("STANDARD");
      boolean isDisclosed = i < item.getDisclosedTierCount();
      ladder.add(new HintMetaView(i, strength, isDisclosed));
      if (isDisclosed) {
        disclosed.add(new DisclosedHintView(i, strength, projectBlocks(tier.path("blocks"))));
      }
    }
    ItemFeedbackView feedback = null;
    Boolean correct = null;
    if (revealFeedback && item.getStatus() == ItemAttemptStatus.LOCKED) {
      correct = item.getCorrect();
      feedback = buildFeedback(copy, Boolean.TRUE.equals(correct));
    }
    LanguageHelpView languageHelp =
        item.getLanguageHelpJson() == null ? null : readLanguageHelp(item.getLanguageHelpJson());
    return new ItemView(
        item.getId(),
        item.getItemOrder(),
        item.getQuestionId(),
        item.getStatus().name(),
        projectBlocks(copy.path("stem")),
        projectOptions(copy.path("options")),
        tiers.size(),
        item.getDisclosedTierCount(),
        ladder,
        disclosed,
        item.isStrongAssistance(),
        item.getSelectedOptionKey(),
        correct,
        feedback,
        uuidArray(copy.path("outlineItemIds")),
        uuidArray(copy.path("objectiveIds")),
        languageHelpAvailable(session, copy),
        languageHelp);
  }

  private boolean languageHelpAvailable(AssessmentSession session, ObjectNode copy) {
    if (formalPolicy.isDisabled(session.getAccountId())) return false;
    String examLanguage = text(copy, "examLanguage");
    if (examLanguage == null) examLanguage = session.getExamLanguage();
    return "zh-CN".equals(examLanguage)
        && terminology.hasPublishedTermBank(session.getPackageRevisionId());
  }

  private String languageTier(PublishedTerminologyCatalog.LanguageHelpProjection projection) {
    boolean phrase =
        projection.spans().stream()
            .anyMatch(span -> span.surfaceForm() != null && span.surfaceForm().length() > 2);
    return phrase ? "PHRASE" : "WORD";
  }

  private String writeLanguageHelp(LanguageHelpView view) {
    ObjectNode node = json.createObjectNode();
    node.put("disclosed", true);
    node.put("trigger", view.trigger());
    ArrayNode spans = node.putArray("spans");
    for (LanguageHelpSpanView span : view.spans()) {
      ObjectNode row = spans.addObject();
      row.put("termId", span.termId().toString());
      row.put("surfaceForm", span.surfaceForm());
      row.put("blockIndex", span.blockIndex());
      row.put("startOffset", span.startOffset());
      row.put("endOffset", span.endOffset());
      row.put("alreadyInNotebook", span.alreadyInNotebook());
    }
    return write(node);
  }

  private LanguageHelpView readLanguageHelp(String raw) {
    ObjectNode node = parseObject(raw);
    List<LanguageHelpSpanView> spans = new ArrayList<>();
    JsonNode spanNodes = node.path("spans");
    if (spanNodes.isArray()) {
      for (JsonNode span : spanNodes) {
        UUID termId = parseUuid(span.path("termId").asText(null));
        if (termId == null) continue;
        spans.add(
            new LanguageHelpSpanView(
                termId,
                text(span, "surfaceForm"),
                span.path("blockIndex").asInt(0),
                span.path("startOffset").asInt(0),
                span.path("endOffset").asInt(0),
                span.path("alreadyInNotebook").asBoolean(false)));
      }
    }
    return new LanguageHelpView(true, text(node, "trigger"), spans);
  }

  private ItemFeedbackView buildFeedback(ObjectNode copy, boolean correct) {
    String correctKey = copy.path("correctOptionKey").asText();
    List<LocalizedContentView> explanations = new ArrayList<>();
    JsonNode explanationNodes = copy.path("explanations");
    if (explanationNodes.isArray()) {
      for (JsonNode explanation : explanationNodes) {
        explanations.add(
            new LocalizedContentView(
                explanation.path("language").asText(), projectBlocks(explanation.path("blocks"))));
      }
    }
    List<LocalizedTextView> notes = new ArrayList<>();
    JsonNode noteNodes = copy.path("commonMistakeNotes");
    if (noteNodes.isArray()) {
      for (JsonNode note : noteNodes) {
        notes.add(
            new LocalizedTextView(
                text(note, "indonesian"), text(note, "english"), text(note, "simplifiedChinese")));
      }
    }
    List<RelatedResourceView> related = new ArrayList<>();
    JsonNode relatedNodes = copy.path("relatedResources");
    if (relatedNodes.isArray()) {
      for (JsonNode relatedNode : relatedNodes) {
        related.add(
            new RelatedResourceView(
                UUID.fromString(relatedNode.path("resourceId").asText()),
                relatedNode.path("kind").asText(),
                new LocalizedTextView(
                    text(relatedNode.path("title"), "indonesian"),
                    text(relatedNode.path("title"), "english"),
                    text(relatedNode.path("title"), "simplifiedChinese"))));
      }
    }
    return new ItemFeedbackView(correct, correctKey, explanations, notes, related);
  }

  private AssistanceSummaryView assistanceSummary(AssessmentSession session) {
    List<AssessmentAssistanceEvent> events =
        assistance.findBySessionIdOrderByOccurredAtAsc(session.getId());
    String maxLanguageTier = null;
    boolean languageHelpDisclosed = false;
    for (AssessmentAssistanceEvent event : events) {
      if (!"LANGUAGE_ASSIST".equals(event.getKind())) continue;
      languageHelpDisclosed = true;
      if ("PHRASE".equals(event.getStrength())) {
        maxLanguageTier = "PHRASE";
      } else if ("WORD".equals(event.getStrength()) && maxLanguageTier == null) {
        maxLanguageTier = "WORD";
      }
    }
    return new AssistanceSummaryView(
        session.getMaxTierDisclosed(),
        session.isStrongUsed(),
        session.isLanguageAssistUsed(),
        maxLanguageTier,
        languageHelpDisclosed ? Boolean.TRUE : null);
  }

  private ContextSummaryView contextSummary(
      AssessmentSession session, List<AssessmentItemAttempt> attempts) {
    Set<UUID> outline = new LinkedHashSet<>();
    Set<UUID> objectives = new LinkedHashSet<>();
    for (AssessmentItemAttempt item : attempts) {
      ObjectNode copy = parseObject(item.getQuestionCopyJson());
      outline.addAll(uuidArray(copy.path("outlineItemIds")));
      objectives.addAll(uuidArray(copy.path("objectiveIds")));
    }
    return new ContextSummaryView(
        session.getSubject(),
        session.getPackageId(),
        session.getPackageRevisionId(),
        session.getId(),
        session.getPurpose().name(),
        session.getExamLanguage(),
        session.getSetId(),
        session.getLessonResourceId(),
        session.getMistakeId(),
        List.copyOf(outline),
        List.copyOf(objectives),
        assistanceSummary(session),
        session.getCheckpointPassed());
  }

  private SessionResumeSummaryView toResumeSummary(AssessmentSession session) {
    List<AssessmentItemAttempt> attempts =
        items.findBySessionIdOrderByItemOrderAsc(session.getId());
    int answered =
        (int)
            attempts.stream()
                .filter(
                    item ->
                        item.getSelectedOptionKey() != null
                            || item.getStatus() == ItemAttemptStatus.LOCKED)
                .count();
    int locked =
        (int)
            attempts.stream().filter(item -> item.getStatus() == ItemAttemptStatus.LOCKED).count();
    LocalizedTextView title = null;
    if (session.getSetTitleJson() != null) {
      ObjectNode node = parseObject(session.getSetTitleJson());
      title =
          new LocalizedTextView(
              text(node, "indonesian"), text(node, "english"), text(node, "simplifiedChinese"));
    }
    return new SessionResumeSummaryView(
        session.getId(),
        session.getStatus().name(),
        session.getPurpose().name(),
        session.getSubject(),
        session.getPackageId(),
        session.getPackageRevisionId(),
        session.getSetId(),
        session.getMistakeId(),
        session.getLessonResourceId(),
        title,
        session.getExamLanguage(),
        session.getFeedbackMode(),
        attempts.size(),
        answered,
        locked,
        session.getUpdatedAt());
  }

  private MistakeSummaryView toMistakeSummary(AssessmentMistake mistake) {
    ObjectNode attemptQuestion = parseObject(mistake.getAttemptQuestionJson());
    List<JsonNode> stem = projectBlocks(attemptQuestion.path("stem"));
    List<JsonNode> preview = stem.size() > 3 ? stem.subList(0, 3) : stem;
    return new MistakeSummaryView(
        mistake.getId(),
        mistake.getStatus().name(),
        mistake.getSubject(),
        mistake.getPackageId(),
        mistake.getQuestionId(),
        mistake.getExamLanguage(),
        mistake.getErrorCause() == null ? null : mistake.getErrorCause().name(),
        preview,
        mistake.getErrorCount(),
        new AssistanceSummaryView(
            mistake.getMaxTierDisclosed(),
            mistake.isStrongUsed(),
            mistake.isLanguageAssistUsed(),
            null,
            null),
        isRevalidationEligible(mistake),
        mistake.getLastSessionId(),
        mistake.getUpdatedAt());
  }

  private MistakeDetailView toMistakeDetail(AssessmentMistake mistake) {
    ObjectNode attemptQuestion = parseObject(mistake.getAttemptQuestionJson());
    ObjectNode latest = parseObject(mistake.getLatestResponseJson());
    List<RemediationCandidateView> candidates = new ArrayList<>();
    Optional<PublishedPackageAssessmentView> pkg =
        catalog.findActiveBySubject(mistake.getSubject());
    for (RemediationResolutionPolicy.Candidate candidate : remediationCandidates(mistake)) {
      LocalizedTextView title =
          pkg.map(p -> p.resourcesById().get(candidate.resourceId()))
              .filter(Objects::nonNull)
              .map(StudyResourceView::title)
              .orElse(new LocalizedTextView("", "", ""));
      candidates.add(
          new RemediationCandidateView(
              candidate.resourceId(), candidate.kind(), title, candidate.preferred()));
    }
    ItemFeedbackView feedback = readFeedback(latest.path("feedback"));
    MistakeAttemptQuestionView questionView =
        new MistakeAttemptQuestionView(
            UUID.fromString(attemptQuestion.path("questionId").asText()),
            attemptQuestion.path("examLanguage").asText(),
            projectBlocks(attemptQuestion.path("stem")),
            projectOptions(attemptQuestion.path("options")),
            uuidArray(attemptQuestion.path("outlineItemIds")),
            uuidArray(attemptQuestion.path("objectiveIds")));
    MistakeLatestResponseView latestView =
        new MistakeLatestResponseView(
            latest.path("selectedOptionKey").asText(),
            latest.path("correct").asBoolean(false),
            text(latest, "correctOptionKey"),
            feedback,
            parseUuid(text(latest, "lastSessionId")),
            parseUuid(text(latest, "lastAttemptId")),
            Instant.parse(latest.path("respondedAt").asText()));
    return new MistakeDetailView(
        mistake.getId(),
        mistake.getStatus().name(),
        mistake.getSubject(),
        mistake.getPackageId(),
        mistake.getPackageRevisionId(),
        mistake.getQuestionId(),
        mistake.getExamLanguage(),
        mistake.getErrorCause() == null ? null : mistake.getErrorCause().name(),
        mistake.getPrivateNote(),
        mistake.getErrorCount(),
        new AssistanceSummaryView(
            mistake.getMaxTierDisclosed(),
            mistake.isStrongUsed(),
            mistake.isLanguageAssistUsed(),
            null,
            null),
        isRevalidationEligible(mistake),
        mistake.getLastAttemptId(),
        mistake.getLastSessionId(),
        mistake.getSourceSetId(),
        uuidListFromJson(mistake.getOutlineItemIdsJson()),
        uuidListFromJson(mistake.getObjectiveIdsJson()),
        questionView,
        latestView,
        candidates,
        mistake.getNextDueAt(),
        mistake.getCreatedAt(),
        mistake.getUpdatedAt());
  }

  private AssessmentSetSummaryView toSetSummary(
      PublishedPackageAssessmentView pkg, AssessmentSetView set) {
    return new AssessmentSetSummaryView(
        set.setId(),
        pkg.packageId(),
        pkg.packageRevisionId(),
        set.purpose(),
        set.title(),
        set.examLanguage(),
        set.difficulty(),
        set.questionIds().size(),
        set.estimatedMinutes(),
        set.feedbackMode(),
        set.passPolicy(),
        set.outlineItemIds(),
        set.objectiveIds(),
        set.lessonResourceId());
  }

  private String writeQuestionCopy(QuestionView question, PublishedPackageAssessmentView pkg) {
    ObjectNode copy = json.createObjectNode();
    copy.put("questionId", question.questionId().toString());
    copy.put("examLanguage", question.examLanguage());
    copy.put("correctOptionKey", question.correctOptionKey());
    copy.set("stem", blocksArray(question.stem()));
    ArrayNode options = copy.putArray("options");
    for (OptionView option : question.options()) {
      ObjectNode optionNode = options.addObject();
      optionNode.put("key", option.key());
      optionNode.set("blocks", blocksArray(option.blocks()));
    }
    ArrayNode hints = copy.putArray("hintTiers");
    for (HintTierView hint : question.hintTiers()) {
      ObjectNode hintNode = hints.addObject();
      hintNode.put("strength", hint.strength() == null ? "STANDARD" : hint.strength());
      hintNode.set("blocks", blocksArray(hint.blocks()));
    }
    ArrayNode explanations = copy.putArray("explanations");
    for (var explanation : question.explanations()) {
      ObjectNode node = explanations.addObject();
      node.put("language", explanation.language());
      node.set("blocks", blocksArray(explanation.blocks()));
    }
    ArrayNode notes = copy.putArray("commonMistakeNotes");
    for (LocalizedTextView note : question.commonMistakeNotes()) {
      ObjectNode node = notes.addObject();
      node.put("indonesian", note.indonesian());
      node.put("english", note.english());
      node.put("simplifiedChinese", note.simplifiedChinese());
    }
    ArrayNode related = copy.putArray("relatedResources");
    for (UUID resourceId : question.relatedResourceIds()) {
      StudyResourceView resource = pkg.resourcesById().get(resourceId);
      if (resource == null) continue;
      if (!"LESSON".equals(resource.kind()) && !"REMEDIATION".equals(resource.kind())) continue;
      ObjectNode node = related.addObject();
      node.put("resourceId", resourceId.toString());
      node.put("kind", resource.kind());
      ObjectNode title = node.putObject("title");
      title.put("indonesian", resource.title().indonesian());
      title.put("english", resource.title().english());
      title.put("simplifiedChinese", resource.title().simplifiedChinese());
    }
    ArrayNode attachments = copy.putArray("authoredTermAttachments");
    if (question.authoredTermAttachments() != null) {
      for (AuthoredTermAttachmentView attachment : question.authoredTermAttachments()) {
        ObjectNode node = attachments.addObject();
        node.put("termId", attachment.termId().toString());
        if (attachment.surfaceForm() != null) {
          node.put("surfaceForm", attachment.surfaceForm());
        }
      }
    }
    copy.set("outlineItemIds", uuidArrayNode(question.outlineItemIds()));
    copy.set("objectiveIds", uuidArrayNode(question.objectiveIds()));
    return write(copy);
  }

  private String writeAttemptQuestion(ObjectNode copy) {
    ObjectNode safe = json.createObjectNode();
    safe.put("questionId", copy.path("questionId").asText());
    safe.put("examLanguage", copy.path("examLanguage").asText());
    safe.set("stem", copy.path("stem"));
    safe.set("options", copy.path("options"));
    safe.set("outlineItemIds", copy.path("outlineItemIds"));
    safe.set("objectiveIds", copy.path("objectiveIds"));
    return write(safe);
  }

  private String writeLatestResponse(
      String selectedOptionKey,
      boolean correct,
      String correctOptionKey,
      ItemFeedbackView feedback,
      UUID sessionId,
      UUID attemptId,
      Instant respondedAt) {
    ObjectNode node = json.createObjectNode();
    node.put("selectedOptionKey", selectedOptionKey);
    node.put("correct", correct);
    node.put("correctOptionKey", correctOptionKey);
    if (feedback == null) {
      node.putNull("feedback");
    } else {
      node.set("feedback", writeFeedbackNode(feedback));
    }
    node.put("lastSessionId", sessionId.toString());
    node.put("lastAttemptId", attemptId.toString());
    node.put("respondedAt", respondedAt.toString());
    return write(node);
  }

  private ObjectNode writeFeedbackNode(ItemFeedbackView feedback) {
    ObjectNode node = json.createObjectNode();
    node.put("correct", feedback.correct());
    node.put("correctOptionKey", feedback.correctOptionKey());
    ArrayNode explanations = node.putArray("explanations");
    if (feedback.explanations() != null) {
      for (LocalizedContentView explanation : feedback.explanations()) {
        ObjectNode row = explanations.addObject();
        row.put("language", explanation.language());
        row.set("blocks", blocksArray(explanation.blocks()));
      }
    }
    ArrayNode notes = node.putArray("commonMistakeNotes");
    if (feedback.commonMistakeNotes() != null) {
      for (LocalizedTextView note : feedback.commonMistakeNotes()) {
        ObjectNode row = notes.addObject();
        row.put("indonesian", note.indonesian());
        row.put("english", note.english());
        row.put("simplifiedChinese", note.simplifiedChinese());
      }
    }
    ArrayNode related = node.putArray("relatedResources");
    if (feedback.relatedResources() != null) {
      for (RelatedResourceView resource : feedback.relatedResources()) {
        ObjectNode row = related.addObject();
        row.put("resourceId", resource.resourceId().toString());
        row.put("kind", resource.kind());
        ObjectNode title = row.putObject("title");
        title.put("indonesian", resource.title().indonesian());
        title.put("english", resource.title().english());
        title.put("simplifiedChinese", resource.title().simplifiedChinese());
      }
    }
    return node;
  }

  private ItemFeedbackView readFeedback(JsonNode feedbackNode) {
    if (feedbackNode == null || feedbackNode.isMissingNode() || feedbackNode.isNull()) {
      return null;
    }
    if (!feedbackNode.isObject()) {
      return null;
    }
    List<LocalizedContentView> explanations = new ArrayList<>();
    JsonNode explanationNodes = feedbackNode.path("explanations");
    if (explanationNodes.isArray()) {
      for (JsonNode explanation : explanationNodes) {
        explanations.add(
            new LocalizedContentView(
                explanation.path("language").asText(null),
                projectBlocks(explanation.path("blocks"))));
      }
    }
    List<LocalizedTextView> notes = new ArrayList<>();
    JsonNode noteNodes = feedbackNode.path("commonMistakeNotes");
    if (noteNodes.isArray()) {
      for (JsonNode note : noteNodes) {
        notes.add(
            new LocalizedTextView(
                text(note, "indonesian"), text(note, "english"), text(note, "simplifiedChinese")));
      }
    }
    List<RelatedResourceView> related = new ArrayList<>();
    JsonNode relatedNodes = feedbackNode.path("relatedResources");
    if (relatedNodes.isArray()) {
      for (JsonNode relatedNode : relatedNodes) {
        UUID resourceId = parseUuid(relatedNode.path("resourceId").asText(null));
        if (resourceId == null) continue;
        related.add(
            new RelatedResourceView(
                resourceId,
                relatedNode.path("kind").asText(null),
                new LocalizedTextView(
                    text(relatedNode.path("title"), "indonesian"),
                    text(relatedNode.path("title"), "english"),
                    text(relatedNode.path("title"), "simplifiedChinese"))));
      }
    }
    return new ItemFeedbackView(
        feedbackNode.path("correct").asBoolean(false),
        text(feedbackNode, "correctOptionKey"),
        List.copyOf(explanations),
        List.copyOf(notes),
        List.copyOf(related));
  }

  private String writeLocalized(LocalizedTextView title) {
    ObjectNode node = json.createObjectNode();
    node.put("indonesian", title.indonesian());
    node.put("english", title.english());
    node.put("simplifiedChinese", title.simplifiedChinese());
    return write(node);
  }

  private ArrayNode blocksArray(List<JsonNode> blocks) {
    ArrayNode array = json.createArrayNode();
    if (blocks != null) {
      for (JsonNode block : blocks) {
        array.add(block);
      }
    }
    return array;
  }

  private ArrayNode uuidArrayNode(List<UUID> ids) {
    ArrayNode array = json.createArrayNode();
    if (ids != null) {
      for (UUID id : ids) {
        array.add(id.toString());
      }
    }
    return array;
  }

  private List<JsonNode> projectBlocks(JsonNode blocks) {
    List<JsonNode> projected = new ArrayList<>();
    if (blocks != null && blocks.isArray()) {
      for (JsonNode block : blocks) {
        projected.add(block);
      }
    }
    return projected;
  }

  private List<OptionViewWire> projectOptions(JsonNode options) {
    List<OptionViewWire> projected = new ArrayList<>();
    if (options != null && options.isArray()) {
      for (JsonNode option : options) {
        projected.add(
            new OptionViewWire(option.path("key").asText(), projectBlocks(option.path("blocks"))));
      }
    }
    return projected;
  }

  private List<UUID> uuidArray(JsonNode values) {
    List<UUID> ids = new ArrayList<>();
    if (values != null && values.isArray()) {
      for (JsonNode value : values) {
        UUID id = parseUuid(value.asText());
        if (id != null) ids.add(id);
      }
    }
    return ids;
  }

  private List<UUID> uuidListFromJson(String raw) {
    if (raw == null || raw.isBlank()) return List.of();
    try {
      return uuidArray(json.readTree(raw));
    } catch (RuntimeException exception) {
      return List.of();
    }
  }

  private ObjectNode parseObject(String raw) {
    try {
      JsonNode node = json.readTree(raw);
      if (node instanceof ObjectNode object) return object;
      throw new IllegalStateException("Expected JSON object.");
    } catch (RuntimeException exception) {
      throw new IllegalStateException("Unreadable assessment JSON.", exception);
    }
  }

  private String write(JsonNode node) {
    try {
      return json.writeValueAsString(node);
    } catch (RuntimeException exception) {
      throw new IllegalStateException("Unable to serialize assessment JSON.", exception);
    }
  }

  private Instant now() {
    return clock.instant().truncatedTo(ChronoUnit.MICROS);
  }

  private static String text(JsonNode parent, String field) {
    if (parent == null || !parent.isObject()) return null;
    JsonNode value = parent.get(field);
    return value == null || value.isNull() || !value.isTextual() ? null : value.asText();
  }

  private static UUID parseUuid(String value) {
    try {
      return value == null || value.isBlank() ? null : UUID.fromString(value);
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  // --- view records ---

  public record AssistanceSummaryView(
      int maxTierDisclosed,
      boolean strongUsed,
      boolean languageAssistUsed,
      String maxLanguageTier,
      Boolean languageHelpDisclosed) {}

  public record LocalizedContentView(String language, List<JsonNode> blocks) {}

  public record RelatedResourceView(UUID resourceId, String kind, LocalizedTextView title) {}

  public record ItemFeedbackView(
      boolean correct,
      String correctOptionKey,
      List<LocalizedContentView> explanations,
      List<LocalizedTextView> commonMistakeNotes,
      List<RelatedResourceView> relatedResources) {}

  public record HintMetaView(int tierIndex, String strength, boolean disclosed) {}

  public record DisclosedHintView(int tierIndex, String strength, List<JsonNode> blocks) {}

  public record OptionViewWire(String key, List<JsonNode> blocks) {}

  public record ItemView(
      UUID itemId,
      int order,
      UUID questionId,
      String status,
      List<JsonNode> stem,
      List<OptionViewWire> options,
      int hintTierCount,
      int disclosedTierCount,
      List<HintMetaView> hintLadder,
      List<DisclosedHintView> disclosedHints,
      boolean strongAssistance,
      String selectedOptionKey,
      Boolean correct,
      ItemFeedbackView feedback,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds,
      boolean languageHelpAvailable,
      LanguageHelpView languageHelp) {}

  public record LanguageHelpSpanView(
      UUID termId,
      String surfaceForm,
      int blockIndex,
      int startOffset,
      int endOffset,
      boolean alreadyInNotebook) {}

  public record LanguageHelpView(
      boolean disclosed, String trigger, List<LanguageHelpSpanView> spans) {}

  public record DiscloseLanguageHelpView(
      ItemView item,
      LanguageHelpView languageHelp,
      AssistanceSummaryView sessionAssistanceSummary) {}

  public record ContextSummaryView(
      String subject,
      UUID packageId,
      UUID packageRevisionId,
      UUID sessionId,
      String sessionPurpose,
      String examLanguage,
      UUID setId,
      UUID lessonResourceId,
      UUID mistakeId,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds,
      AssistanceSummaryView assistanceSummary,
      Boolean checkpointPassed) {}

  public record SessionView(
      UUID sessionId,
      String status,
      String purpose,
      String subject,
      UUID packageId,
      UUID packageRevisionId,
      UUID setId,
      UUID mistakeId,
      UUID lessonResourceId,
      String examLanguage,
      String feedbackMode,
      UUID planTaskId,
      int questionCount,
      AssistanceSummaryView assistanceSummary,
      List<ItemView> items,
      ContextSummaryView context,
      Instant createdAt,
      Instant updatedAt,
      Instant submittedAt) {}

  public record SessionResultView(
      UUID sessionId,
      String status,
      String purpose,
      int correctCount,
      int total,
      boolean strongAssistanceUsed,
      Boolean checkpointPassed,
      List<UUID> mistakeIds,
      List<EvidenceView> evidenceWritten,
      List<ItemView> items,
      ContextSummaryView context,
      Instant submittedAt) {}

  public record EvidenceView(UUID objectiveId, String signal, UUID sourceSessionId, Instant at) {}

  public record DiscloseHintView(
      ItemView item, DisclosedHintView disclosed, AssistanceSummaryView sessionAssistanceSummary) {}

  public record ItemAnswerView(ItemView item, AssistanceSummaryView sessionAssistanceSummary) {}

  public record AssessmentSetSummaryView(
      UUID setId,
      UUID packageId,
      UUID packageRevisionId,
      String purpose,
      LocalizedTextView title,
      String examLanguage,
      String difficulty,
      int questionCount,
      Integer estimatedMinutes,
      String feedbackMode,
      String passPolicy,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds,
      UUID lessonResourceId) {}

  public record CheckpointEditionView(
      UUID setId,
      String examLanguage,
      LocalizedTextView title,
      int questionCount,
      Integer estimatedMinutes,
      String feedbackMode,
      String passPolicy) {}

  public record CheckpointForLessonView(
      String subject,
      UUID packageId,
      UUID packageRevisionId,
      UUID lessonResourceId,
      boolean lessonContentComplete,
      boolean startable,
      String lockReason,
      boolean checkpointUpdatedSinceLastAttempt,
      List<CheckpointEditionView> editions) {}

  public record SessionResumeSummaryView(
      UUID sessionId,
      String status,
      String purpose,
      String subject,
      UUID packageId,
      UUID packageRevisionId,
      UUID setId,
      UUID mistakeId,
      UUID lessonResourceId,
      LocalizedTextView title,
      String examLanguage,
      String feedbackMode,
      int questionCount,
      int answeredItemCount,
      int lockedItemCount,
      Instant updatedAt) {}

  public record MistakeSummaryView(
      UUID mistakeId,
      String status,
      String subject,
      UUID packageId,
      UUID questionId,
      String examLanguage,
      String errorCause,
      List<JsonNode> stemPreview,
      int errorCount,
      AssistanceSummaryView assistanceSummary,
      boolean revalidationEligible,
      UUID lastSessionId,
      Instant updatedAt) {}

  public record MistakeAttemptQuestionView(
      UUID questionId,
      String examLanguage,
      List<JsonNode> stem,
      List<OptionViewWire> options,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds) {}

  public record MistakeLatestResponseView(
      String selectedOptionKey,
      boolean correct,
      String correctOptionKey,
      ItemFeedbackView feedback,
      UUID lastSessionId,
      UUID lastAttemptId,
      Instant respondedAt) {}

  public record RemediationCandidateView(
      UUID resourceId, String kind, LocalizedTextView title, boolean preferred) {}

  public record MistakeDetailView(
      UUID mistakeId,
      String status,
      String subject,
      UUID packageId,
      UUID packageRevisionId,
      UUID questionId,
      String examLanguage,
      String errorCause,
      String privateNote,
      int errorCount,
      AssistanceSummaryView assistanceSummary,
      boolean revalidationEligible,
      UUID lastAttemptId,
      UUID lastSessionId,
      UUID sourceSetId,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds,
      MistakeAttemptQuestionView attemptQuestion,
      MistakeLatestResponseView latestResponse,
      List<RemediationCandidateView> remediationCandidates,
      Instant nextDueAt,
      Instant createdAt,
      Instant updatedAt) {}

  public record MistakeListView(List<MistakeSummaryView> items, String nextCursor) {}
}
