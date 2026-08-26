using TypeSpec.Http;

namespace YukCSCA.AcademicStudent;

// Student-safe projections of published academic content plus per-student content progress.
// Admin authoring remains in YukCSCA.AcademicAdmin. Shared enums and content-block shapes are
// referenced so LESSON bodies stay aligned with publish validation without exposing drafts,
// questions, mocks, answer keys, or admin provenance.

@doc("Product coverage of an outline item from LESSON presence only. Checkpoint and practice availability are separate assessment catalog projections (VS-009).")
enum ProductCoverage {
  FULLY_COVERED,
  PARTIALLY_COVERED,
  NOT_COVERED,
}

@doc("Persisted or projected content-progress status. Content complete is never mastery.")
enum ContentProgressStatus {
  NOT_STARTED,
  IN_PROGRESS,
  CONTENT_COMPLETE,
}

@doc("Writable content-progress statuses. Absent progress is NOT_STARTED; clients do not write that state.")
enum WritableContentProgressStatus {
  IN_PROGRESS,
  CONTENT_COMPLETE,
}

@doc("Active published revision identity visible to students (no publisher user id).")
model StudentPublishedRevisionSummary {
  id: YukCSCA.uuid;

  @minValue(1)
  revisionNumber: int64;

  publishedAt: utcDateTime;
}

@doc("One published package the activated student may browse under pilot open-access.")
model PublishedPackageSummary {
  id: YukCSCA.uuid;
  subject: AcademicAdmin.AcademicSubject;
  activeRevision: StudentPublishedRevisionSummary;

  @doc("Exam languages declared on the published syllabus structure. Not used to split LESSON catalogs in VS-008.")
  @maxItems(2)
  examLanguages: AcademicAdmin.ExamLanguage[];
}

@doc("Student-safe official CSCA source panel: open actions per configured language edition only.")
model OfficialSourcePanel {
  subject: AcademicAdmin.AcademicSubject;

  @minLength(1)
  @maxLength(160)
  authority: string;

  @minLength(1)
  @maxLength(80)
  editionLabel: string;

  @doc("One open action per configured official language edition (en and/or zh-CN).")
  @minItems(1)
  @maxItems(2)
  sourceLinks: AcademicAdmin.OfficialSourceLink[];

  lastCheckedAt: utcDateTime;
  publishedOn?: AcademicAdmin.OfficialDate;
  effectiveOn?: AcademicAdmin.OfficialDate;
  updatedOn?: AcademicAdmin.OfficialDate;
  permittedUse: AcademicAdmin.PermittedUse;
}

@doc("Per-student reviewed-video playback position on one resource, saved through content progress. Playback position is private student state and never mastery evidence.")
model VideoPlaybackPosition {
  videoAssetId: YukCSCA.uuid;

  @doc("Last player position. Bounded by the short-video duration policy; restored values are clamped to the currently published asset's duration.")
  @minValue(0)
  @maxValue(600)
  positionSeconds: int32;
}

@doc("Per-student content progress on one LESSON or REMEDIATION resource. Absent storage projects as NOT_STARTED.")
model ContentProgress {
  status: ContentProgressStatus;

  @doc("Zero-based resume index into the blocks of the explanation-language version the student was reading. Null when not started or when no block position is recorded.")
  @minValue(0)
  resumeBlockIndex: int32 | null;

  @doc("Last saved reviewed-video playback position on this resource. Null when no position was saved; restored positions are clamped to the currently published asset's duration. One position per resource (pilot behavior): watching in a different explanation language overwrites it. Watching is never mastery evidence.")
  video?: VideoPlaybackPosition | null;

  @doc("Last progress write time. Null when status is NOT_STARTED.")
  updatedAt: utcDateTime | null;

  @doc("True when status is CONTENT_COMPLETE and this study resource's student-visible content (title, outline/objective links, language versions, blocks) differs between the package revision recorded when the student last marked complete and the active published revision. Unrelated package changes (edition labels, other lessons, assessment questions) do not set this flag. Soft signal only; never demotes content complete or implies mastery.")
  updatedSinceCompleted: boolean;
}

@doc("LESSON summary for outline browse and continue chips. Kind is always LESSON; other resource kinds are omitted.")
model LessonSummary {
  resourceId: YukCSCA.uuid;
  title: AcademicAdmin.LocalizedText;

  @minItems(0)
  outlineItemIds: YukCSCA.uuid[];

  contentProgress: ContentProgress;

  @doc("This lesson's terminology preview when the LESSON has a non-empty required term list. resourceId is the LESSON id. Null or omitted when this lesson has no required terms. Several lessons may share one outline node; each lesson only surfaces its own list.")
  terminologyPreview?: TerminologyPreviewRef | null;
}

@doc("Outline node with product coverage and linked LESSON summaries for the active published revision.")
model SyllabusOutlineNode {
  id: YukCSCA.uuid;
  parentId: YukCSCA.uuid | null;

  @minValue(0)
  order: int32;

  summary: AcademicAdmin.LocalizedText;
  productCoverage: ProductCoverage;

  @doc("LESSON resources that reference this outline item in the active published revision.")
  lessons: LessonSummary[];
}

@doc("Browse projection for one published package by subject.")
model PublishedPackageBrowse {
  package: PublishedPackageSummary;
  officialSource: OfficialSourcePanel;
  outline: SyllabusOutlineNode[];

  @doc("Optional continue target: last in-progress LESSON when present, otherwise null. Never implies mastery.")
  continueLesson: LessonSummary | null;
}

@doc("Ordered LESSON body for one explanation language.")
model LessonContentAvailable {
  availability: "AVAILABLE";
  blocks: AcademicAdmin.ContentBlock[];
}

@doc("Requested explanation language has no authored version. Clients must not silently substitute another language.")
model LessonLanguageUnavailable {
  availability: "LANGUAGE_UNAVAILABLE";
  requestedLanguage: AcademicAdmin.ExplanationLanguage;
}

union LessonBody {
  available: LessonContentAvailable,
  unavailable: LessonLanguageUnavailable,
}

@doc("Student LESSON read projection for the active published revision.")
model PublishedLessonDetail {
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;
  subject: AcademicAdmin.AcademicSubject;
  resourceId: YukCSCA.uuid;
  title: AcademicAdmin.LocalizedText;

  @minItems(0)
  @maxItems(3)
  availableExplanationLanguages: AcademicAdmin.ExplanationLanguage[];

  @doc("Language requested by the client (or the language the server evaluated).")
  requestedExplanationLanguage: AcademicAdmin.ExplanationLanguage;

  body: LessonBody;
  contentProgress: ContentProgress;

  @doc("Null or omitted when this lesson has no published Chinese exam-language terms. Clients must hide terminology chrome when absent.")
  terminology?: LessonTerminology | null;

  @doc("Published reviewed short video for the requested explanation language. Null or omitted when no REVIEWED video was attached for this language at publish time, and null whenever body is LANGUAGE_UNAVAILABLE because an attachment is bound to an authored language version; clients render no playable control. Watching is never mastery.")
  video?: PublishedVideoRef | null;
}

@doc("Student REMEDIATION read projection for the active published revision. Same block model as LESSON; kind is always REMEDIATION.")
model PublishedRemediationDetail {
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;
  subject: AcademicAdmin.AcademicSubject;
  resourceId: YukCSCA.uuid;
  title: AcademicAdmin.LocalizedText;

  @minItems(0)
  @maxItems(3)
  availableExplanationLanguages: AcademicAdmin.ExplanationLanguage[];

  @doc("Language requested by the client (or the language the server evaluated).")
  requestedExplanationLanguage: AcademicAdmin.ExplanationLanguage;

  body: LessonBody;
  contentProgress: ContentProgress;

  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];

  @maxItems(32)
  objectiveIds: YukCSCA.uuid[];

  @doc("Published reviewed short video for the requested explanation language. Null or omitted when no REVIEWED video was attached for this language at publish time, and null whenever body is LANGUAGE_UNAVAILABLE because an attachment is bound to an authored language version; clients render no playable control. Watching is never mastery.")
  video?: PublishedVideoRef | null;
}

@doc("Upsert content progress for the authenticated student on one LESSON or REMEDIATION. Idempotent by (account, package, resource).")
model UpsertContentProgressRequest {
  status: WritableContentProgressStatus;

  @doc("Zero-based resume block index within the language version the student is reading. When status is IN_PROGRESS, at least one of resumeBlockIndex or video must be present; both may be sent. Optional when CONTENT_COMPLETE.")
  @minValue(0)
  resumeBlockIndex?: int32 | null;

  @doc("Reviewed-video playback position to persist. The write replaces any stored position on this resource: send the current position on every IN_PROGRESS write, or null to clear it. Rejected with a validation violation when videoAssetId is not the published reviewed video currently referenced by this resource (path video.videoAssetId, code INVALID_VIDEO_ASSET) or when positionSeconds exceeds that asset's published duration (path video.positionSeconds, code POSITION_OUT_OF_RANGE); the client re-reads the lesson and resumes from the clamped value.")
  video?: VideoPlaybackPosition | null;

  @doc("Optional soft diagnostic of the package revision the client last loaded. Servers may ignore routine republish mismatches; do not fail the student loop solely on this field.")
  expectedPackageRevisionId?: YukCSCA.uuid;
}

model ContentProgressValidationViolation {
  @minLength(1)
  @maxLength(200)
  path: string;

  @minLength(1)
  @maxLength(80)
  code: string;
}

model ContentProgressValidationProblem extends YukCSCA.Problem {
  code: "CONTENT_PROGRESS_VALIDATION_FAILED";
  violations: ContentProgressValidationViolation[];
}

@error
model ContentProgressValidationResponse {
  @statusCode statusCode: 400;
  @header contentType: "application/problem+json";
  @body body: ContentProgressValidationProblem;
}

model PublishedPackageListResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: PublishedPackageSummary[];
}

model PublishedPackageBrowseResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: PublishedPackageBrowse;
}

model PublishedLessonResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: PublishedLessonDetail;
}

model PublishedRemediationResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: PublishedRemediationDetail;
}

model ContentProgressResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: ContentProgress;
}

model PublishedAcademicImageContentResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "private, max-age=31536000, immutable";
  @header("X-Content-Type-Options") contentTypeOptions: "nosniff";
  @bodyRoot image: AcademicAdmin.AcademicImageUploadFile;
}

// ---------------------------------------------------------------------------
// Reviewed short video (VS-010B)
// ---------------------------------------------------------------------------

@doc("Reference to the published reviewed short video attached to the requested explanation-language version. Null whenever the lesson body is LANGUAGE_UNAVAILABLE, because an attachment is bound to an authored language version. No poster artwork in the pilot; players show the asset's first frame via preload metadata.")
model PublishedVideoRef {
  videoAssetId: YukCSCA.uuid;

  @doc("Validated playable duration. Bounded by the short-video duration policy (max 10 minutes); restored playback positions are clamped to it.")
  @minValue(1)
  @maxValue(600)
  durationSeconds: int32;
}

@doc("Short-lived presigned playback grant. The client fetches this endpoint with the bearer token, then assigns url to a video element src so native Range requests, seeking, and resume work without any credential reaching storage. Refresh before expiresAt to avoid opaque media errors; the target content itself is immutable. Deployment must allow the storage origin in CSP media-src.")
model PublishedVideoPlayResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @body body: AcademicAdmin.VideoPlaybackGrant;
}

model PublishedVideoCaptionsFile extends File<"text/vtt", string> {}

@doc("WebVTT captions of a published reviewed short video. Client-side cue extraction is the single transcript mechanism in this slice (no separate transcript endpoint); the narration text is authoritative.")
model PublishedVideoCaptionsResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "private, max-age=31536000, immutable";
  @header("X-Content-Type-Options") contentTypeOptions: "nosniff";
  @bodyRoot captions: PublishedVideoCaptionsFile;
}

// ---------------------------------------------------------------------------
// Chinese exam-language terminology (VS-010A)
// Subject-agnostic package APIs. First published content is Chinese Mathematics.
// ---------------------------------------------------------------------------

@doc("Persisted preview progress. Not content-complete and never mastery.")
enum PreviewProgressStatus {
  NOT_STARTED,
  IN_PROGRESS,
  PREVIEW_COMPLETE,
}

@doc("Writable preview-progress statuses. Absent progress is NOT_STARTED; clients do not write that state.")
enum WritablePreviewProgressStatus {
  IN_PROGRESS,
  PREVIEW_COMPLETE,
}

@doc("How a notebook row was collected. One row per account and term; sources accumulate. REQUIRED_COURSE remains for rows written before opt-in bookmarking; new writes use CLICKED or LANGUAGE_MISTAKE.")
enum NotebookSource {
  REQUIRED_COURSE,
  CLICKED,
  LANGUAGE_MISTAKE,
}

@doc("Latest student-visible place the term was met.")
enum TermEncounterPlace {
  PREVIEW,
  LESSON,
  CHECKPOINT,
  PRACTICE,
  NOTEBOOK,
}

@doc("Evidence-backed review state for one student and one term. Not topic mastery.")
enum TermFamiliarity {
  NEW,
  LEARNING,
  FAMILIAR,
}

@doc("Optional notebook secondary filter. Exam wording groups EXAM_INSTRUCTION and LOGICAL_EXPRESSION.")
enum TermClassGroup {
  EXAM_WORDING,
  TOPIC_TERM,
}

@doc("Where a term lookup originated. Formal-mock sessions deny lookup.")
enum TermLookupSource {
  PREVIEW,
  LESSON,
  ITEM,
  NOTEBOOK,
  LANGUAGE_MISTAKE,
}

@doc("Due-review activity. Contextual cloze is preferred when a published snippet exists; otherwise matching pairs.")
enum TermReviewKind {
  CONTEXT_CLOZE,
  MATCH_PAIRS,
}

@doc("Pre-rendered short clip for one published Chinese surface form. Student GET never synthesizes.")
model TermPronunciationFile extends File<"audio/mpeg", bytes> {}

model TermSurfaceForm {
  @minLength(1)
  @maxLength(40)
  text: string;

  @minLength(1)
  @maxLength(80)
  pinyin: string;

  audioAvailable: boolean;
}

model TermDefinitionAvailable {
  availability: "AVAILABLE";
  language: AcademicAdmin.ExplanationLanguage;

  @doc("Explanation-language gloss. May include bounded \\(...\\) inline KaTeX.")
  @minLength(1)
  @maxLength(4000)
  text: string;
}

model TermDefinitionUnavailable {
  availability: "LANGUAGE_UNAVAILABLE";
  requestedLanguage: AcademicAdmin.ExplanationLanguage;
}

union TermDefinition {
  available: TermDefinitionAvailable,
  unavailable: TermDefinitionUnavailable,
}

@doc("Student-safe reviewed term card. Identity is termId; missing explanation-language gloss is explicit.")
model TermCard {
  termId: YukCSCA.uuid;
  subject: AcademicAdmin.AcademicSubject;
  packageId: YukCSCA.uuid;
  termClass: AcademicAdmin.TermClass;

  @doc("True when this authenticated student already has the term in the notebook. Preview and rail use it for bookmark chrome. Lookup does not write the notebook.")
  alreadyInNotebook: boolean;

  primarySurface: TermSurfaceForm;

  @maxItems(7)
  aliases: TermSurfaceForm[];

  definition: TermDefinition;

  @doc("Short English equivalent. May include bounded \\(...\\) inline KaTeX.")
  @minLength(1)
  @maxLength(200)
  englishEquivalent: string;

  @doc("Optional notation as bounded KaTeX without \\(...\\) wrappers.")
  symbols: string | null;

  @doc("Optional authentic example. May include bounded \\(...\\) inline KaTeX.")
  example: string | null;

  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];
}

@doc("Character span inside one TEXT content block. Offsets are UTF-16 code units into that block's source text, including any \\(...\\) delimiters. Spans must not overlap inline math regions.")
model TermSpan {
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
}

model PreviewProgress {
  status: PreviewProgressStatus;

  @doc("Last progress write time. Null when status is NOT_STARTED.")
  updatedAt: utcDateTime | null;

  @doc("True when PREVIEW_COMPLETE and the published required set differs from the set recorded at last completion. Soft signal only; never wipes the notebook or implies mastery.")
  requiredSetUpdatedSinceCompleted: boolean;
}

model TerminologyPreviewRef {
  resourceId: YukCSCA.uuid;
  progress: PreviewProgress;
}

@doc("Lesson rail and tappable spans. Absent from the lesson when the package has no published Chinese terms.")
model LessonTerminology {
  @doc("This LESSON id when the lesson has a required term list; otherwise null. Preview is per lesson, not a shared outline TERMINOLOGY resource.")
  previewResourceId: YukCSCA.uuid | null;

  @doc("Required terms bound on this lesson, in preview order.")
  @maxItems(64)
  rail: TermCard[];

  @doc("Required and instruction/logic surface forms that occur in TEXT blocks of the requested lesson body.")
  @maxItems(200)
  spans: TermSpan[];
}

model PreviewMatchTarget {
  termId: YukCSCA.uuid;

  @minLength(1)
  @maxLength(40)
  matchKey: string;

  @minLength(1)
  @maxLength(40)
  promptSurface: string;

  @minLength(1)
  @maxLength(200)
  matchLabel: string;
}

@doc("Per-lesson terminology preview: this LESSON's ordered required cards plus optional matching-pairs material. Not an AssessmentSet and not a shared outline dictionary.")
model TerminologyPreview {
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;
  subject: AcademicAdmin.AcademicSubject;

  @doc("The LESSON resource id this preview belongs to.")
  resourceId: YukCSCA.uuid;
  title: AcademicAdmin.LocalizedText;

  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];

  @doc("The LESSON this preview introduces. Continue-to-lesson uses this id; the preview never locks it. Length is 1.")
  @maxItems(8)
  lessonResourceIds: YukCSCA.uuid[];

  requestedExplanationLanguage: AcademicAdmin.ExplanationLanguage;

  @maxItems(64)
  terms: TermCard[];

  matchingPairsAvailable: boolean;

  @doc("Match targets for the optional preview pairs activity. Empty when matchingPairsAvailable is false.")
  @maxItems(64)
  matchTargets: PreviewMatchTarget[];

  previewProgress: PreviewProgress;
}

model UpsertPreviewProgressRequest {
  status: WritablePreviewProgressStatus;

  @doc("Optional soft diagnostic of the package revision the client last loaded. Servers may ignore routine republish mismatches.")
  expectedPackageRevisionId?: YukCSCA.uuid;
}

model PreviewCheckPair {
  termId: YukCSCA.uuid;

  @minLength(1)
  @maxLength(40)
  selectedMatchKey: string;
}

@doc("Records the optional preview matching-pairs check. Viewing and check results are not mastery and never write CHECKPOINT_PASSED.")
model SubmitPreviewCheckRequest {
  @minItems(1)
  @maxItems(64)
  pairs: PreviewCheckPair[];
}

model PreviewCheckResult {
  kind: "MATCH_PAIRS";

  @minValue(0)
  correctCount: int32;

  @minValue(0)
  totalCount: int32;

  previewProgress: PreviewProgress;
}

model TermLookupRequest {
  subject: AcademicAdmin.AcademicSubject;
  explanationLanguage: AcademicAdmin.ExplanationLanguage;
  source: TermLookupSource;

  @doc("Known chip or rail tap. Provide exactly one of termId or selectedText.")
  termId?: YukCSCA.uuid;

  @doc("Student-selected text after Language help is open, or a tappable lesson form. Max phrase length; not a sentence.")
  @minLength(1)
  @maxLength(40)
  selectedText?: string;

  @doc("Required when source is LESSON or PREVIEW. For PREVIEW this is the LESSON id.")
  resourceId?: YukCSCA.uuid;

  @doc("Required when source is ITEM.")
  sessionId?: YukCSCA.uuid;

  @doc("Required when source is ITEM.")
  itemId?: YukCSCA.uuid;
}

model TermLookupMatched {
  outcome: "MATCHED";
  card: TermCard;
  alreadyInNotebook: boolean;

  @doc("Present when the term is already in the notebook. Lookup never writes a notebook row.")
  entry: NotebookEntry | null;
}

@doc("Opt-in bookmark of one reviewed term. Validates the same source/resource rules as lookup. Formal-mock sessions receive 403.")
model BookmarkTermRequest {
  subject: AcademicAdmin.AcademicSubject;
  explanationLanguage: AcademicAdmin.ExplanationLanguage;
  source: TermLookupSource;

  @doc("Required when source is LESSON or PREVIEW. For PREVIEW this is the LESSON id.")
  resourceId?: YukCSCA.uuid;

  @doc("Required when source is ITEM.")
  sessionId?: YukCSCA.uuid;

  @doc("Required when source is ITEM.")
  itemId?: YukCSCA.uuid;
}

model BookmarkTermResult {
  card: TermCard;
  alreadyInNotebook: true;
  entry: NotebookEntry;
}

@doc("Bookmarks this lesson's required list (or a subset). Ids not on the lesson are rejected. Formal-mock sessions receive 403.")
model BookmarkLessonTermsRequest {
  explanationLanguage: AcademicAdmin.ExplanationLanguage;

  @doc("Subset of this lesson's required term ids. Omit or empty to bookmark the whole lesson list.")
  @maxItems(64)
  termIds?: YukCSCA.uuid[];
}

model BookmarkLessonTermsResult {
  @maxItems(64)
  termIds: YukCSCA.uuid[];
}

@doc("Selected text is not in the reviewed term bank. No invented definition and no notebook write.")
model TermLookupNotInBank {
  outcome: "NOT_IN_BANK";
}

union TermLookupResult {
  matched: TermLookupMatched,
  notInBank: TermLookupNotInBank,
}

model TermMetIn {
  source: NotebookSource;
  place: TermEncounterPlace;
  topicTitle: AcademicAdmin.LocalizedText | null;
  outlineItemId: YukCSCA.uuid | null;
  at: utcDateTime;
}

model ReviewOption {
  @minLength(1)
  @maxLength(40)
  key: string;

  @minLength(1)
  @maxLength(200)
  label: string;
}

model ClozeReviewPrompt {
  kind: "CONTEXT_CLOZE";

  @doc("Short published fragment with the target replaced by a placeholder. Never a full item, answer key, or student response.")
  @minLength(1)
  @maxLength(400)
  snippet: string;

  @minItems(2)
  @maxItems(6)
  options: ReviewOption[];
}

model MatchPairsReviewPrompt {
  kind: "MATCH_PAIRS";

  @minLength(1)
  @maxLength(40)
  promptSurface: string;

  @minItems(2)
  @maxItems(6)
  options: ReviewOption[];
}

union TermReviewPrompt {
  cloze: ClozeReviewPrompt,
  matchPairs: MatchPairsReviewPrompt,
}

@doc("One notebook row. Bookmarking is opt-in; viewing a preview or card is not topic mastery.")
model NotebookEntry {
  termId: YukCSCA.uuid;
  subject: AcademicAdmin.AcademicSubject;
  packageId: YukCSCA.uuid;
  termClass: AcademicAdmin.TermClass;
  primarySurface: TermSurfaceForm;
  familiarity: TermFamiliarity;
  due: boolean;
  lastReviewAt: utcDateTime | null;

  @minItems(1)
  @maxItems(3)
  sources: NotebookSource[];

  metIn: TermMetIn;

  @doc("Present when due so the client can start review without a second fetch. Null when not due.")
  pendingReview: TermReviewPrompt | null;
}

model NotebookEntryDetail {
  entry: NotebookEntry;
  card: TermCard;
}

model NotebookListResponseBody {
  items: NotebookEntry[];

  @doc("Opaque cursor for the next page; null when no further items.")
  nextCursor: string | null;
}

model SubmitTermReviewRequest {
  kind: TermReviewKind;

  @minLength(1)
  @maxLength(40)
  selectedOptionKey: string;
}

model TermReviewResult {
  termId: YukCSCA.uuid;
  kind: TermReviewKind;
  correct: boolean;

  @minLength(1)
  @maxLength(40)
  correctOptionKey: string;

  familiarity: TermFamiliarity;
  due: boolean;
  entry: NotebookEntry;
}

model TerminologyValidationViolation {
  @minLength(1)
  @maxLength(200)
  path: string;

  @minLength(1)
  @maxLength(80)
  code: string;
}

model TerminologyValidationProblem extends YukCSCA.Problem {
  code: "TERMINOLOGY_VALIDATION_FAILED";
  violations: TerminologyValidationViolation[];
}

@error
model TerminologyValidationResponse {
  @statusCode statusCode: 400;
  @header contentType: "application/problem+json";
  @body body: TerminologyValidationProblem;
}

model TerminologyPreviewResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: TerminologyPreview;
}

model PreviewProgressResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: PreviewProgress;
}

model PreviewCheckResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: PreviewCheckResult;
}

model TermLookupResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: TermLookupResult;
}

model NotebookListResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: NotebookListResponseBody;
}

model NotebookEntryResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: NotebookEntryDetail;
}

model TermReviewResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: TermReviewResult;
}

model BookmarkTermResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: BookmarkTermResult;
}

model BookmarkLessonTermsResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: BookmarkLessonTermsResult;
}

model UnbookmarkTermResponse {
  @statusCode statusCode: 204;
}

model TermPronunciationContentResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "private, max-age=31536000, immutable";
  @header("X-Content-Type-Options") contentTypeOptions: "nosniff";
  @bodyRoot audio: TermPronunciationFile;
}

@route("/api/v1/academic")
interface AcademicStudentApi {
  @doc("Lists published academic packages with an active revision that the activated student may browse under pilot open-access. Subject is never hard-coded to Mathematics.")
  @get
  @route("/packages")
  @useAuth(BearerAuth)
  listPublishedPackages():
    | PublishedPackageListResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns the student browse projection for the published package of the given subject: official-source panel, outline with product coverage, LESSON summaries with content progress, and optional continue target.")
  @get
  @route("/packages/{subject}")
  @useAuth(BearerAuth)
  getPublishedPackageBrowse(@path subject: AcademicAdmin.AcademicSubject):
    | PublishedPackageBrowseResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns one LESSON from the active published revision with ordered TEXT/MATH/IMAGE blocks for the requested explanation language, or an explicit language-unavailable body. Missing language is never silently substituted.")
  @get
  @route("/packages/{subject}/lessons/{resourceId}")
  @useAuth(BearerAuth)
  getPublishedLesson(
    @path subject: AcademicAdmin.AcademicSubject,
    @path resourceId: YukCSCA.uuid,
    @query explanationLanguage: AcademicAdmin.ExplanationLanguage,
  ):
    | PublishedLessonResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Creates or replaces the authenticated student's content progress for one LESSON. Reviewed-video playback positions ride the same write; watching never implies mastery. Checkpoint unlock is evaluated by the assessment module when the student requests a checkpoint.")
  @put
  @route("/packages/{subject}/lessons/{resourceId}/progress")
  @useAuth(BearerAuth)
  upsertContentProgress(
    @path subject: AcademicAdmin.AcademicSubject,
    @path resourceId: YukCSCA.uuid,
    @body request: UpsertContentProgressRequest,
  ):
    | ContentProgressResponse
    | ContentProgressValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns one published REMEDIATION resource with ordered TEXT/MATH/IMAGE blocks for the requested explanation language, or an explicit language-unavailable body. Missing language is never silently substituted.")
  @get
  @route("/packages/{subject}/remediation/{resourceId}")
  @useAuth(BearerAuth)
  getPublishedRemediation(
    @path subject: AcademicAdmin.AcademicSubject,
    @path resourceId: YukCSCA.uuid,
    @query explanationLanguage: AcademicAdmin.ExplanationLanguage,
  ):
    | PublishedRemediationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Creates or replaces the authenticated student's content progress for one REMEDIATION resource. Same status model as LESSON; content complete is corrective study evidence for revalidation eligibility, never mastery.")
  @put
  @route("/packages/{subject}/remediation/{resourceId}/progress")
  @useAuth(BearerAuth)
  upsertRemediationContentProgress(
    @path subject: AcademicAdmin.AcademicSubject,
    @path resourceId: YukCSCA.uuid,
    @body request: UpsertContentProgressRequest,
  ):
    | ContentProgressResponse
    | ContentProgressValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns image bytes only when the image is referenced by the active published revision of a package the activated student may access.")
  @get
  @route("/images/{imageId}")
  @useAuth(BearerAuth)
  getPublishedAcademicImage(@path imageId: YukCSCA.uuid):
    | PublishedAcademicImageContentResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns this LESSON's terminology preview: ordered required term cards for the requested explanation language. resourceId is the LESSON id. Missing glosses are explicit. GET and PUT progress never write the notebook. Not mastery.")
  @get
  @route("/packages/{subject}/terminology/{resourceId}")
  @useAuth(BearerAuth)
  getTerminologyPreview(
    @path subject: AcademicAdmin.AcademicSubject,
    @path resourceId: YukCSCA.uuid,
    @query explanationLanguage: AcademicAdmin.ExplanationLanguage,
  ):
    | TerminologyPreviewResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Creates or replaces preview progress for this LESSON. Does not write the notebook. Never writes CHECKPOINT_PASSED. Formal-mock sessions receive 403.")
  @put
  @route("/packages/{subject}/terminology/{resourceId}/progress")
  @useAuth(BearerAuth)
  upsertPreviewProgress(
    @path subject: AcademicAdmin.AcademicSubject,
    @path resourceId: YukCSCA.uuid,
    @body request: UpsertPreviewProgressRequest,
  ):
    | PreviewProgressResponse
    | TerminologyValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Records the optional preview matching-pairs check. Does not lock Continue to lesson and never writes CHECKPOINT_PASSED.")
  @post
  @route("/packages/{subject}/terminology/{resourceId}/checks")
  @useAuth(BearerAuth)
  submitPreviewCheck(
    @path subject: AcademicAdmin.AcademicSubject,
    @path resourceId: YukCSCA.uuid,
    @body request: SubmitPreviewCheckRequest,
  ):
    | PreviewCheckResponse
    | TerminologyValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Resolves a chip tap or selected phrase to a reviewed term card, or NOT_IN_BANK. Does not write the notebook. Unmatched text is not logged and is not a student-authored term. Formal-mock sessions receive 403.")
  @post
  @route("/term-lookups")
  @useAuth(BearerAuth)
  resolveTermLookup(@body request: TermLookupRequest):
    | TermLookupResponse
    | TerminologyValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Lists the authenticated student's terminology notebook. One list; Due and class group are filters, not separate homes. Optional subject filter keeps later Chinese Physics/Chemistry on the same resource.")
  @get
  @route("/terminology-notebook")
  @useAuth(BearerAuth)
  listTerminologyNotebook(
    @query explanationLanguage: AcademicAdmin.ExplanationLanguage,
    @query dueOnly?: boolean,
    @query @maxLength(80) q?: string,
    @query classGroup?: TermClassGroup,
    @query subject?: AcademicAdmin.AcademicSubject,
    @query cursor?: string,
    @query @minValue(1) @maxValue(100) limit?: int32,
  ):
    | NotebookListResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Bookmarks this LESSON's required list, or a subset of those ids. Opening or completing preview does not bookmark. Formal-mock sessions receive 403.")
  @post
  @route("/packages/{subject}/terminology/{resourceId}/bookmarks")
  @useAuth(BearerAuth)
  bookmarkLessonTerms(
    @path subject: AcademicAdmin.AcademicSubject,
    @path resourceId: YukCSCA.uuid,
    @body request: BookmarkLessonTermsRequest,
  ):
    | BookmarkLessonTermsResponse
    | TerminologyValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns one owner notebook entry and its term card.")
  @get
  @route("/terminology-notebook/{termId}")
  @useAuth(BearerAuth)
  getTerminologyNotebookEntry(
    @path termId: YukCSCA.uuid,
    @query explanationLanguage: AcademicAdmin.ExplanationLanguage,
  ):
    | NotebookEntryResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Adds one reviewed term to the notebook. Idempotent on (account, termId). Formal-mock sessions receive 403.")
  @put
  @route("/terminology-notebook/{termId}")
  @useAuth(BearerAuth)
  bookmarkTerm(
    @path termId: YukCSCA.uuid,
    @body request: BookmarkTermRequest,
  ):
    | BookmarkTermResponse
    | TerminologyValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Removes the term from the notebook. Idempotent when the row is already absent. Means the student already knows this and does not want it in review. Formal-mock sessions receive 403.")
  @delete
  @route("/terminology-notebook/{termId}")
  @useAuth(BearerAuth)
  unbookmarkTerm(@path termId: YukCSCA.uuid):
    | UnbookmarkTermResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Submits one due recognition or contextual-use review. Familiarity and next due follow the result. Never writes CHECKPOINT_PASSED. Formal-mock sessions receive 403.")
  @post
  @route("/terminology-notebook/{termId}/reviews")
  @useAuth(BearerAuth)
  submitTermReview(
    @path termId: YukCSCA.uuid,
    @body request: SubmitTermReviewRequest,
  ):
    | TermReviewResponse
    | TerminologyValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns the pre-rendered pronunciation clip for one published surface form. Never synthesizes. 404 when no clip exists.")
  @get
  @route("/terms/{termId}/audio")
  @useAuth(BearerAuth)
  getTermPronunciation(
    @path termId: YukCSCA.uuid,
    @query @maxLength(40) surfaceForm?: string,
  ):
    | TermPronunciationContentResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns a short-lived presigned range-capable playback URL for one published reviewed short video referenced by the active published revision; the client assigns it to a video element src. 404 when the asset exists in any other state or is not referenced by the active revision, so non-published assets never leak.")
  @get
  @route("/videos/{videoAssetId}/play")
  @useAuth(BearerAuth)
  playPublishedVideo(@path videoAssetId: YukCSCA.uuid):
    | PublishedVideoPlayResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns the WebVTT captions of one published reviewed short video. The narration text is authoritative; clients may render the transcript from cues. Same published-reference gate as playback.")
  @get
  @route("/videos/{videoAssetId}/captions")
  @useAuth(BearerAuth)
  getPublishedVideoCaptions(@path videoAssetId: YukCSCA.uuid):
    | PublishedVideoCaptionsResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;
}
