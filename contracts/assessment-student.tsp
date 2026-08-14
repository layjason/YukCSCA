using TypeSpec.Http;

namespace YukCSCA.AssessmentStudent;

// Student assessment lifecycle for published AssessmentSets: checkpoint, topic practice,
// mathematical hints, mistakes, revalidation. Correct keys and undisclosed hint bodies never
// leave the server before allowed feedback. Academic package authoring stays in AcademicAdmin;
// LESSON/REMEDIATION content progress stays in AcademicStudent.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

@doc("Why a student assessment session exists. REVALIDATION is started only from a mistake.")
enum AssessmentSessionPurpose {
  CHECKPOINT,
  TOPIC_PRACTICE,
  REVALIDATION,
}

@doc("Lifecycle of a student-owned assessment session.")
enum AssessmentSessionStatus {
  IN_PROGRESS,
  SUBMITTED,
  CANCELLED,
}

@doc("Per-item attempt state within a session. SET_END may keep items OPEN with a selected answer until set submit.")
enum ItemAttemptStatus {
  OPEN,
  LOCKED,
}

@doc("Mistake notebook lifecycle for one student + package + question.")
enum MistakeStatus {
  OPEN,
  REMEDIATION_IN_PROGRESS,
  AWAITING_REVALIDATION,
  REVALIDATION_PASSED,
}

@doc("Optional student-selected error cause. Blank is allowed.")
enum ErrorCause {
  CONCEPTUAL_GAP,
  PREREQUISITE_GAP,
  TERMINOLOGY_MISUNDERSTANDING,
  CARELESSNESS,
  TIME_MANAGEMENT,
}

@doc("Bounded objective evidence signal written only on checkpoint pass in VS-009.")
enum LearningEvidenceSignal {
  CHECKPOINT_PASSED,
}

@doc("Why a lesson checkpoint is not startable.")
enum CheckpointLockReason {
  LESSON_NOT_CONTENT_COMPLETE,
  NO_CHECKPOINT_PUBLISHED,
  NO_EXAM_LANGUAGE_EDITION,
}

@doc("Stable assessment problem codes returned in application/problem+json.")
enum AssessmentProblemCode {
  CHECKPOINT_LOCKED,
  SESSION_ALREADY_SUBMITTED,
  SESSION_NOT_RESUMABLE,
  REVALIDATION_NOT_ELIGIBLE,
  STRONG_HINT_BLOCKED,
  HINT_EXHAUSTED,
  ASSESSMENT_VALIDATION_FAILED,
  ITEM_ALREADY_LOCKED,
  SET_NOT_AVAILABLE,
  LANGUAGE_ASSIST_DISABLED,
}

@doc("Word/phrase language-assist tier recorded on an item. SENTENCE and full Translate remain later slices.")
enum LanguageAssistTier {
  WORD,
  PHRASE,
}

@doc("Why Language help was opened. WORDING_HARD may set TERMINOLOGY_MISUNDERSTANDING; it does not open Translate.")
enum LanguageHelpTrigger {
  STUDENT_REQUEST,
  WORDING_HARD,
}

// ---------------------------------------------------------------------------
// Shared nested models
// ---------------------------------------------------------------------------

@doc("Assistance summary safe for UI and future agent context. Never includes hint bodies.")
model AssistanceSummary {
  @minValue(0)
  maxTierDisclosed: int32;

  strongUsed: boolean;

  @doc("Always false for WORD/PHRASE in VS-010A. Reserved for a later Translate/full-meaning control.")
  languageAssistUsed: boolean;

  @doc("Highest word or phrase language-assist tier recorded in this session. Null or omitted when none. Does not set languageAssistUsed.")
  maxLanguageTier?: LanguageAssistTier | null;

  @doc("True after Language help has been disclosed on at least one item in this session.")
  languageHelpDisclosed?: boolean;
}

@doc("Ordered hint-ladder metadata without bodies. Safe before disclosure so the client can warn on STRONG and pre-disable STRONG on REVALIDATION.")
model HintTierMeta {
  @minValue(0)
  @maxValue(7)
  tierIndex: int32;

  strength: AcademicAdmin.HintStrength;

  @doc("True when this tier's body is present in disclosedHints for the current session.")
  disclosed: boolean;
}

@doc("One disclosed mathematical hint tier. Bodies appear only after the student discloses that tier.")
model DisclosedHintTier {
  @minValue(0)
  tierIndex: int32;

  strength: AcademicAdmin.HintStrength;
  blocks: AcademicAdmin.ContentBlock[];
}

@doc("Navigable published study resource reference for post-submit solution links (LESSON or REMEDIATION). Resolved from admin relatedResourceIds.")
model RelatedResourceRef {
  resourceId: YukCSCA.uuid;

  @doc("Student-openable kinds only. TERMINOLOGY is omitted from this projection in VS-009.")
  kind: "LESSON" | "REMEDIATION";

  title: AcademicAdmin.LocalizedText;
}

@doc("Post-lock or post-set-submit feedback. Includes correct key only after the item is locked for feedback.")
model ItemFeedback {
  correct: boolean;

  @minLength(1)
  @maxLength(40)
  correctOptionKey: string;

  explanations: AcademicAdmin.LocalizedContent[];

  @maxItems(6)
  commonMistakeNotes: AcademicAdmin.LocalizedText[];

  @doc("Navigable related LESSON/REMEDIATION links with kind and title. Empty when none authored or none resolve in the active/pinned revision.")
  @maxItems(8)
  relatedResources: RelatedResourceRef[];
}

@doc("One admin-preset or auto-matched word/phrase span revealed after Language help is opened.")
model LanguageHelpSpan {
  termId: YukCSCA.uuid;

  @minLength(1)
  @maxLength(40)
  surfaceForm: string;

  @minValue(0)
  blockIndex: int32;

  @minValue(0)
  startOffset: int32;

  @minValue(0)
  endOffset: int32;

  alreadyInNotebook: boolean;
}

@doc("Language-help chip list. Never includes a full-question translation.")
model LanguageHelpView {
  disclosed: true;
  trigger: LanguageHelpTrigger;

  @maxItems(64)
  spans: LanguageHelpSpan[];
}

@doc("Student-safe option projection (no correctness flag).")
model SessionItemOption {
  @minLength(1)
  @maxLength(40)
  key: string;

  @minItems(1)
  blocks: AcademicAdmin.ContentBlock[];
}

@doc("One session item. Pre-submit payloads omit correct keys and undisclosed hint bodies; hintLadder exposes strength metadata only; languageHelpAvailable is first-paint Language-help chrome metadata.")
model SessionItemView {
  itemId: YukCSCA.uuid;

  @minValue(0)
  order: int32;

  questionId: YukCSCA.uuid;
  status: ItemAttemptStatus;
  stem: AcademicAdmin.ContentBlock[];
  options: SessionItemOption[];

  @minValue(0)
  @maxValue(8)
  hintTierCount: int32;

  @minValue(0)
  @maxValue(8)
  disclosedTierCount: int32;

  @doc("Full ordered ladder metadata (strength + disclosed flag) without bodies. Length equals hintTierCount.")
  @maxItems(8)
  hintLadder: HintTierMeta[];

  @doc("Bodies only for tiers already disclosed in this session.")
  disclosedHints: DisclosedHintTier[];

  strongAssistance: boolean;

  @doc("Selected option when the student has answered. Null when not yet answered.")
  selectedOptionKey: string | null;

  @doc("Present only when the item is locked and feedback mode allows revelation (IMMEDIATE after lock, or after SET_END submit).")
  correct: boolean | null;

  @doc("Present only when feedback is revealed for this item.")
  feedback: ItemFeedback | null;

  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];

  @maxItems(32)
  objectiveIds: YukCSCA.uuid[];

  @doc("True when Language help may be disclosed on this item: zh-CN exam-language item, published term bank on the package, and the session is not formal-disabled. False for English-only items, packages with no published terms, and reserved formal-mock. First paint uses this flag only; do not infer from examLanguage and do not probe disclose. Chips stay in languageHelp after disclose.")
  languageHelpAvailable: boolean;

  @doc("Present only after the student discloses Language help on this item. Null or omitted on first paint so the stem stays clean.")
  languageHelp?: LanguageHelpView | null;
}

@doc("Append-only objective evidence written on checkpoint pass. Not a Mastered UI claim.")
model LearningEvidenceSnapshot {
  objectiveId: YukCSCA.uuid;
  signal: LearningEvidenceSignal;
  sourceSessionId: YukCSCA.uuid;
  at: utcDateTime;
}

@doc("Stable context envelope fields for future agent tools (VS-011). Not a separate public resource.")
model AssessmentContextSummary {
  subject: AcademicAdmin.AcademicSubject;
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;
  sessionId: YukCSCA.uuid;
  sessionPurpose: AssessmentSessionPurpose;
  examLanguage: AcademicAdmin.ExamLanguage;
  setId: YukCSCA.uuid | null;
  lessonResourceId: YukCSCA.uuid | null;
  mistakeId: YukCSCA.uuid | null;

  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];

  @maxItems(32)
  objectiveIds: YukCSCA.uuid[];

  assistanceSummary: AssistanceSummary;
  checkpointPassed: boolean | null;
}

// ---------------------------------------------------------------------------
// Catalog / checkpoint availability
// ---------------------------------------------------------------------------

@doc("Published assessment set summary for Practice hub filters. No question stems or keys.")
model AssessmentSetSummary {
  setId: YukCSCA.uuid;
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;
  purpose: AcademicAdmin.AssessmentSetPurpose;
  title: AcademicAdmin.LocalizedText;
  examLanguage: AcademicAdmin.ExamLanguage;
  difficulty: AcademicAdmin.QuestionDifficulty | null;

  @minValue(1)
  @maxValue(12)
  questionCount: int32;

  estimatedMinutes: int32 | null;

  feedbackMode: AcademicAdmin.AssessmentFeedbackMode;
  passPolicy: AcademicAdmin.CheckpointPassPolicy | null;

  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];

  @maxItems(32)
  objectiveIds: YukCSCA.uuid[];

  lessonResourceId: YukCSCA.uuid | null;
}

@doc("One exam-language edition of a lesson-linked checkpoint.")
model CheckpointEdition {
  setId: YukCSCA.uuid;
  examLanguage: AcademicAdmin.ExamLanguage;
  title: AcademicAdmin.LocalizedText;

  @minValue(1)
  @maxValue(12)
  questionCount: int32;

  estimatedMinutes: int32 | null;
  feedbackMode: AcademicAdmin.AssessmentFeedbackMode;
  passPolicy: AcademicAdmin.CheckpointPassPolicy;
}

@doc("Checkpoint availability for one LESSON. Never claims mastery.")
model CheckpointForLesson {
  subject: AcademicAdmin.AcademicSubject;
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;
  lessonResourceId: YukCSCA.uuid;
  lessonContentComplete: boolean;
  startable: boolean;
  lockReason: CheckpointLockReason | null;

  @doc("True when the student has a prior submitted CHECKPOINT for this lesson and the published CHECKPOINT set content (including referenced questions) for the lesson differs from the content pinned on that attempt. Soft signal only; does not demote progress or claim mastery. False when there is no prior attempt or the checkpoint material is unchanged.")
  checkpointUpdatedSinceLastAttempt: boolean;

  @maxItems(2)
  editions: CheckpointEdition[];
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

@doc("Start CHECKPOINT or TOPIC_PRACTICE. REVALIDATION uses startRevalidation.")
model StartAssessmentSessionRequest {
  purpose: AcademicAdmin.AssessmentSetPurpose;
  subject: AcademicAdmin.AcademicSubject;
  setId: YukCSCA.uuid;
  examLanguage: AcademicAdmin.ExamLanguage;

  @doc("Reserved for plan-assigned practice (VS-017). Must be null or omitted in VS-009.")
  planTaskId?: YukCSCA.uuid | null;
}

model AssessmentSession {
  sessionId: YukCSCA.uuid;
  status: AssessmentSessionStatus;
  purpose: AssessmentSessionPurpose;
  subject: AcademicAdmin.AcademicSubject;
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;
  setId: YukCSCA.uuid | null;
  mistakeId: YukCSCA.uuid | null;
  lessonResourceId: YukCSCA.uuid | null;
  examLanguage: AcademicAdmin.ExamLanguage;
  feedbackMode: AcademicAdmin.AssessmentFeedbackMode;
  planTaskId: YukCSCA.uuid | null;

  @minValue(1)
  @maxValue(12)
  questionCount: int32;

  assistanceSummary: AssistanceSummary;
  items: SessionItemView[];
  context: AssessmentContextSummary;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
  submittedAt: utcDateTime | null;
}

model SubmitItemAnswerRequest {
  @minLength(1)
  @maxLength(40)
  selectedOptionKey: string;
}

@doc("Result of locking or recording an item answer. Feedback is null under SET_END until session submit.")
model ItemAnswerResult {
  item: SessionItemView;
  sessionAssistanceSummary: AssistanceSummary;
}

@doc("Result of disclosing the next mathematical hint tier.")
model DiscloseHintResult {
  item: SessionItemView;
  disclosed: DisclosedHintTier;
  sessionAssistanceSummary: AssistanceSummary;
}

model DiscloseLanguageHelpRequest {
  trigger: LanguageHelpTrigger;
}

@doc("Result of opening Language help. languageAssistUsed stays false for WORD/PHRASE.")
model DiscloseLanguageHelpResult {
  item: SessionItemView;
  languageHelp: LanguageHelpView;
  sessionAssistanceSummary: AssistanceSummary;
}

@doc("Final scored session result. checkpointPassed is non-null only for CHECKPOINT purpose.")
model SessionResult {
  sessionId: YukCSCA.uuid;
  status: "SUBMITTED";
  purpose: AssessmentSessionPurpose;

  @minValue(0)
  correctCount: int32;

  @minValue(1)
  total: int32;

  strongAssistanceUsed: boolean;
  checkpointPassed: boolean | null;

  @maxItems(12)
  mistakeIds: YukCSCA.uuid[];

  @doc("Objective evidence written on this submit when checkpoint passed; empty otherwise.")
  evidenceWritten: LearningEvidenceSnapshot[];

  items: SessionItemView[];
  context: AssessmentContextSummary;
  submittedAt: utcDateTime;
}

@doc("Owner-safe summary for Practice Continue. No stems, options, keys, or hint bodies.")
model AssessmentSessionResumeSummary {
  sessionId: YukCSCA.uuid;
  status: AssessmentSessionStatus;
  purpose: AssessmentSessionPurpose;
  subject: AcademicAdmin.AcademicSubject;
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;
  setId: YukCSCA.uuid | null;
  mistakeId: YukCSCA.uuid | null;
  lessonResourceId: YukCSCA.uuid | null;

  @doc("Localized set title when the session was started from a published set; null for revalidation when no set title applies.")
  title: AcademicAdmin.LocalizedText | null;

  examLanguage: AcademicAdmin.ExamLanguage;
  feedbackMode: AcademicAdmin.AssessmentFeedbackMode;

  @minValue(1)
  @maxValue(12)
  questionCount: int32;

  @doc("Count of items with a selected answer (OPEN with selection or LOCKED).")
  @minValue(0)
  @maxValue(12)
  answeredItemCount: int32;

  @doc("Count of items in LOCKED status.")
  @minValue(0)
  @maxValue(12)
  lockedItemCount: int32;

  updatedAt: utcDateTime;
}

// ---------------------------------------------------------------------------
// Mistakes
// ---------------------------------------------------------------------------

@doc("Published remediation or lesson candidate for a mistake fail path.")
model RemediationCandidate {
  resourceId: YukCSCA.uuid;
  kind: AcademicAdmin.StudyResourceKind;
  title: AcademicAdmin.LocalizedText;
  preferred: boolean;
}

@doc("Immutable student-safe attempt question copy for the mistake notebook. Survives republish/edit of live catalog content.")
model MistakeAttemptQuestion {
  questionId: YukCSCA.uuid;
  examLanguage: AcademicAdmin.ExamLanguage;
  stem: AcademicAdmin.ContentBlock[];
  options: SessionItemOption[];

  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];

  @maxItems(32)
  objectiveIds: YukCSCA.uuid[];
}

@doc("Latest scored incorrect response that updated this mistake. Feedback fields present only when that attempt had revealed solution content.")
model MistakeLatestResponse {
  @minLength(1)
  @maxLength(40)
  selectedOptionKey: string;

  @doc("Correctness of the response that last updated this mistake. Notebook upserts are from incorrect attempts, so this is false for those events.")
  correct: boolean;

  @doc("Revealed when item feedback was available on the attempt; otherwise null.")
  correctOptionKey: string | null;

  @doc("Full post-submit feedback when it was revealed on the attempt; otherwise null.")
  feedback: ItemFeedback | null;

  lastSessionId: YukCSCA.uuid | null;
  lastAttemptId: YukCSCA.uuid | null;
  respondedAt: utcDateTime;
}

@doc("Mistake list row. Includes list-safe stem preview from the attempt copy; omits private note.")
model MistakeSummary {
  mistakeId: YukCSCA.uuid;
  status: MistakeStatus;
  subject: AcademicAdmin.AcademicSubject;
  packageId: YukCSCA.uuid;
  questionId: YukCSCA.uuid;
  examLanguage: AcademicAdmin.ExamLanguage;
  errorCause: ErrorCause | null;

  @doc("Prefix of the immutable attempt stem for list identification (server may truncate block count). Exact full stem is on MistakeDetail.attemptQuestion.")
  @maxItems(3)
  stemPreview: AcademicAdmin.ContentBlock[];

  @minValue(1)
  errorCount: int32;

  assistanceSummary: AssistanceSummary;
  revalidationEligible: boolean;
  lastSessionId: YukCSCA.uuid | null;
  updatedAt: utcDateTime;
}

model MistakeDetail {
  mistakeId: YukCSCA.uuid;
  status: MistakeStatus;
  subject: AcademicAdmin.AcademicSubject;
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;
  questionId: YukCSCA.uuid;
  examLanguage: AcademicAdmin.ExamLanguage;
  errorCause: ErrorCause | null;

  @doc("Student-private note. Never exposed to parents in this slice.")
  @maxLength(2000)
  privateNote: string | null;

  @minValue(1)
  errorCount: int32;

  assistanceSummary: AssistanceSummary;
  revalidationEligible: boolean;
  lastAttemptId: YukCSCA.uuid | null;
  lastSessionId: YukCSCA.uuid | null;
  sourceSetId: YukCSCA.uuid | null;

  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];

  @maxItems(32)
  objectiveIds: YukCSCA.uuid[];

  @doc("Exact original attempt question copy (not live catalog).")
  attemptQuestion: MistakeAttemptQuestion;

  @doc("Latest incorrect response that updated this mistake, with feedback when it was revealed.")
  latestResponse: MistakeLatestResponse;

  remediationCandidates: RemediationCandidate[];

  @doc("Reserved multi-day spaced schedule; unused in VS-009 (immediate eligibility).")
  nextDueAt: utcDateTime | null;

  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

model UpdateMistakeAnnotationRequest {
  @doc("Omit to leave unchanged; null clears.")
  errorCause?: ErrorCause | null;

  @doc("Omit to leave unchanged; null clears.")
  @maxLength(2000)
  privateNote?: string | null;
}

model MistakeListResponseBody {
  items: MistakeSummary[];

  @doc("Opaque cursor for the next page; null when no further items.")
  nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

model AssessmentValidationViolation {
  @minLength(1)
  @maxLength(200)
  path: string;

  @minLength(1)
  @maxLength(80)
  code: string;
}

model AssessmentValidationProblem extends YukCSCA.Problem {
  code: "ASSESSMENT_VALIDATION_FAILED";
  violations: AssessmentValidationViolation[];
}

@error
model AssessmentValidationResponse {
  @statusCode statusCode: 400;
  @header contentType: "application/problem+json";
  @body body: AssessmentValidationProblem;
}

@doc("Conflict problem for assessment lifecycle. code is one of AssessmentProblemCode string values.")
model AssessmentConflictProblem extends YukCSCA.Problem {
  code:
    | "CHECKPOINT_LOCKED"
    | "SESSION_ALREADY_SUBMITTED"
    | "SESSION_NOT_RESUMABLE"
    | "REVALIDATION_NOT_ELIGIBLE"
    | "STRONG_HINT_BLOCKED"
    | "HINT_EXHAUSTED"
    | "ITEM_ALREADY_LOCKED"
    | "SET_NOT_AVAILABLE"
    | "LANGUAGE_ASSIST_DISABLED";
}

@error
model AssessmentConflictResponse {
  @statusCode statusCode: 409;
  @header contentType: "application/problem+json";
  @body body: AssessmentConflictProblem;
}

model CheckpointLockedProblem extends YukCSCA.Problem {
  code: "CHECKPOINT_LOCKED";
  lockReason: CheckpointLockReason;
}

@error
model CheckpointLockedResponse {
  @statusCode statusCode: 409;
  @header contentType: "application/problem+json";
  @body body: CheckpointLockedProblem;
}

// ---------------------------------------------------------------------------
// HTTP responses
// ---------------------------------------------------------------------------

model AssessmentSetListResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AssessmentSetSummary[];
}

model CheckpointForLessonResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: CheckpointForLesson;
}

model AssessmentSessionResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AssessmentSession;
}

model AssessmentSessionCreatedResponse {
  @statusCode statusCode: 201;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AssessmentSession;
}

model AssessmentSessionListResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AssessmentSessionResumeSummary[];
}

model ItemAnswerResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: ItemAnswerResult;
}

model DiscloseHintResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: DiscloseHintResult;
}

model DiscloseLanguageHelpResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: DiscloseLanguageHelpResult;
}

model SessionResultResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: SessionResult;
}

model MistakeListResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: MistakeListResponseBody;
}

model MistakeDetailResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: MistakeDetail;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

@route("/api/v1/assessment")
interface AssessmentStudentApi {
  @doc("Lists published assessment sets for the active package of a subject. Filters are optional; empty list is a valid honest empty Practice state.")
  @get
  @route("/packages/{subject}/sets")
  @useAuth(BearerAuth)
  listAssessmentSets(
    @path subject: AcademicAdmin.AcademicSubject,
    @query purpose?: AcademicAdmin.AssessmentSetPurpose,
    @query outlineItemId?: YukCSCA.uuid,
    @query objectiveId?: YukCSCA.uuid,
    @query difficulty?: AcademicAdmin.QuestionDifficulty,
    @query examLanguage?: AcademicAdmin.ExamLanguage,
  ):
    | AssessmentSetListResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns checkpoint availability for one LESSON: startable flag, lock reason when not startable, and exam-language editions. Does not start a session and never claims mastery.")
  @get
  @route("/packages/{subject}/lessons/{resourceId}/checkpoint")
  @useAuth(BearerAuth)
  getCheckpointForLesson(
    @path subject: AcademicAdmin.AcademicSubject,
    @path resourceId: YukCSCA.uuid,
  ):
    | CheckpointForLessonResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Lists the authenticated student's own assessment sessions for Practice Continue. Defaults to IN_PROGRESS when status is omitted. Empty list is an honest no-Continue state. Does not return stems, keys, or hint bodies.")
  @get
  @route("/sessions")
  @useAuth(BearerAuth)
  listAssessmentSessions(
    @query status?: AssessmentSessionStatus,
    @query subject?: AcademicAdmin.AcademicSubject,
  ):
    | AssessmentSessionListResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Starts a CHECKPOINT or TOPIC_PRACTICE session for a published set. Pins package revision and materializes ordered item projections. CHECKPOINT requires LESSON content-complete.")
  @post
  @route("/sessions")
  @useAuth(BearerAuth)
  startAssessmentSession(@body request: StartAssessmentSessionRequest):
    | AssessmentSessionCreatedResponse
    | AssessmentValidationResponse
    | CheckpointLockedResponse
    | AssessmentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns an owner session for resume or post-submit review. CANCELLED sessions return 409 SESSION_NOT_RESUMABLE.")
  @get
  @route("/sessions/{sessionId}")
  @useAuth(BearerAuth)
  getAssessmentSession(@path sessionId: YukCSCA.uuid):
    | AssessmentSessionResponse
    | AssessmentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Discloses the next mathematical hint tier for an OPEN or answered-but-unlocked item. STRONG is blocked on REVALIDATION sessions. Duplicate disclose of the same next tier is idempotent.")
  @post
  @route("/sessions/{sessionId}/items/{itemId}/hints")
  @useAuth(BearerAuth)
  discloseHint(
    @path sessionId: YukCSCA.uuid,
    @path itemId: YukCSCA.uuid,
  ):
    | DiscloseHintResponse
    | AssessmentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Opens Language help on a scored item: returns admin-preset and auto-matched word/phrase spans. Clients decide first-paint chrome from SessionItemView.languageHelpAvailable; do not infer from examLanguage and do not probe this operation. First paint stays a clean Chinese stem. WORD/PHRASE does not set languageAssistUsed. English-only items and packages with no term bank return 409 LANGUAGE_ASSIST_DISABLED. Formal-mock sessions return 403 FORMAL_ASSISTANCE_DISABLED. Duplicate disclose is idempotent.")
  @post
  @route("/sessions/{sessionId}/items/{itemId}/language-help")
  @useAuth(BearerAuth)
  discloseLanguageHelp(
    @path sessionId: YukCSCA.uuid,
    @path itemId: YukCSCA.uuid,
    @body request: DiscloseLanguageHelpRequest,
  ):
    | DiscloseLanguageHelpResponse
    | AssessmentValidationResponse
    | AssessmentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Records or locks an item answer. IMMEDIATE locks and returns feedback; SET_END records selection and keeps the item changeable until session submit.")
  @put
  @route("/sessions/{sessionId}/items/{itemId}/answer")
  @useAuth(BearerAuth)
  submitItemAnswer(
    @path sessionId: YukCSCA.uuid,
    @path itemId: YukCSCA.uuid,
    @body request: SubmitItemAnswerRequest,
  ):
    | ItemAnswerResponse
    | AssessmentValidationResponse
    | AssessmentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Submits the session: scores remaining items, upserts mistakes, writes checkpoint evidence when applicable. Idempotent for already-submitted owner sessions when the result is returned.")
  @post
  @route("/sessions/{sessionId}/submit")
  @useAuth(BearerAuth)
  submitSession(
    @path sessionId: YukCSCA.uuid,
    @header("Idempotency-Key") idempotencyKey?: string,
  ):
    | SessionResultResponse
    | AssessmentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Soft-cancels an IN_PROGRESS session. No score; session is not resumable.")
  @post
  @route("/sessions/{sessionId}/cancel")
  @useAuth(BearerAuth)
  cancelSession(@path sessionId: YukCSCA.uuid):
    | AssessmentSessionResponse
    | AssessmentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Lists the authenticated student's mistakes. Owner-only; private notes are student-only.")
  @get
  @route("/mistakes")
  @useAuth(BearerAuth)
  listMistakes(
    @query subject?: AcademicAdmin.AcademicSubject,
    @query status?: MistakeStatus,
    @query cursor?: string,
    @query @minValue(1) @maxValue(100) limit?: int32,
  ):
    | MistakeListResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns one owner mistake with remediation candidates and revalidation eligibility.")
  @get
  @route("/mistakes/{mistakeId}")
  @useAuth(BearerAuth)
  getMistake(@path mistakeId: YukCSCA.uuid):
    | MistakeDetailResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Updates optional error cause and/or private note. Blank cause/note remain allowed.")
  @patch
  @route("/mistakes/{mistakeId}")
  @useAuth(BearerAuth)
  updateMistakeAnnotation(
    @path mistakeId: YukCSCA.uuid,
    @body request: UpdateMistakeAnnotationRequest,
  ):
    | MistakeDetailResponse
    | AssessmentValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Starts a REVALIDATION session for an eligible mistake. Prefers an alternate question with the same objective and exam language; falls back to the original. STRONG hints are disabled.")
  @post
  @route("/mistakes/{mistakeId}/revalidation")
  @useAuth(BearerAuth)
  startRevalidation(@path mistakeId: YukCSCA.uuid):
    | AssessmentSessionCreatedResponse
    | AssessmentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;
}
