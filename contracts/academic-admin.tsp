using TypeSpec.Http;

namespace YukCSCA.AcademicAdmin;

enum AcademicPackageStatus {
  DRAFT,
  PUBLISHED,
  ARCHIVED,
}

@doc("CSCA preparation subject. Additive: new subjects extend this enum without changing package lifecycle.")
enum AcademicSubject {
  MATHEMATICS,
}

enum ExamLanguage {
  ENGLISH: "en",
  SIMPLIFIED_CHINESE: "zh-CN",
}

enum ExplanationLanguage {
  INDONESIAN: "id",
  ENGLISH: "en",
  SIMPLIFIED_CHINESE: "zh-CN",
}

enum OfficialDateStatus {
  DECLARED,
  NOT_STATED,
}

enum PermittedUse {
  REFERENCE_ONLY,
}

enum StudyResourceKind {
  LESSON,
  TERMINOLOGY,
  REMEDIATION,
}

@doc("Exam-language role of a reviewed term. Not a syllabus topic and not a subject. Algebra/calculus/physics live on outline bindings and the package subject.")
enum TermClass {
  EXAM_INSTRUCTION,
  LOGICAL_EXPRESSION,
  TOPIC_TERM,
}

enum QuestionDifficulty {
  FOUNDATION,
  STANDARD,
  ADVANCED,
}

@doc("Strength of a mathematical hint tier. STRONG is a full or near-full solution and counts as strong assistance for checkpoint pass and revalidation evidence rules.")
enum HintStrength {
  STANDARD,
  STRONG,
}

@doc("Published assessment-set purpose. CHECKPOINT is lesson-gated formative; TOPIC_PRACTICE is free practice. Mock papers remain a separate package object.")
enum AssessmentSetPurpose {
  CHECKPOINT,
  TOPIC_PRACTICE,
}

@doc("When item correctness and solution content become visible to the student.")
enum AssessmentFeedbackMode {
  IMMEDIATE,
  SET_END,
}

@doc("Checkpoint pass policy. Pilot uses all-correct with no strong assistance; enum is extensible for later thresholds.")
enum CheckpointPassPolicy {
  ALL_CORRECT_NO_STRONG_ASSISTANCE,
}

enum ContentOrigin {
  YUKCSCA_ORIGINAL,
  LICENSED,
  OPEN_LICENSE,
}

enum AcademicValidationCode {
  REQUIRED,
  INVALID,
  UNSUPPORTED,
  OUT_OF_RANGE,
  DUPLICATE,
  INCOMPATIBLE,
  MISSING_PERMISSION,
  STALE_REVISION,
}

model LocalizedText {
  @minLength(1)
  @maxLength(4000)
  indonesian?: string;

  @minLength(1)
  @maxLength(4000)
  english?: string;

  @minLength(1)
  @maxLength(4000)
  simplifiedChinese?: string;
}

model OfficialDate {
  status?: OfficialDateStatus;
  date?: plainDate | null;
}

@doc("Timed exam shape for a subject package. Values are package-owned; publication requires mock and structure to match.")
model ExamStructure {
  @minValue(1)
  @maxValue(300)
  durationMinutes?: int32;

  @minValue(1)
  @maxValue(1000)
  totalPoints?: int32;

  @minValue(1)
  @maxValue(200)
  questionCount?: int32;

  questionType?: "SINGLE_ANSWER";

  @maxItems(2)
  examLanguages?: ExamLanguage[];
}

@doc("One admin-maintained official CSCA syllabus PDF locator for a language edition (for example Mathematics EN and zh-CN).")
model OfficialSourceLink {
  language: ExamLanguage;

  @minLength(1)
  @maxLength(2000)
  url: string;
}

model OfficialSyllabus {
  subject: AcademicSubject;

  @minLength(1)
  @maxLength(160)
  authority?: string;

  @minLength(1)
  @maxLength(80)
  editionLabel?: string;

  @doc("Official PDF locators by language edition. CSCA subjects with dual exam languages typically store both en and zh-CN; Chinese-only subjects store one. Not YukCSCA outline summary languages.")
  @maxItems(2)
  sourceLinks?: OfficialSourceLink[];

  retrievedAt?: utcDateTime;
  lastCheckedAt?: utcDateTime;
  publishedOn?: OfficialDate;
  effectiveOn?: OfficialDate;
  updatedOn?: OfficialDate;
  examStructure?: ExamStructure;
  permittedUse?: PermittedUse;
}

model SourcePosition {
  page?: int32 | null;

  @maxLength(160)
  section?: string | null;
}

model SyllabusOutlineItem {
  id: YukCSCA.uuid;
  parentId: YukCSCA.uuid | null;

  @minValue(0)
  order: int32;

  sourcePosition?: SourcePosition;
  summary: LocalizedText;
}

model TopicMapping {
  outlineItemId: YukCSCA.uuid;

  @minLength(1)
  @maxLength(500)
  rationale?: string;
}

model LearningObjective {
  id: YukCSCA.uuid;
  title: LocalizedText;
  mappings: TopicMapping[];
}

model TextContentBlock {
  kind: "TEXT";

  @doc("Prose that may include bounded inline KaTeX between \\(...\\). Display-mode formulas stay MATH blocks. Terminology span offsets are UTF-16 code units into this source string, including delimiters, and must not overlap inline math. Raw HTML and arbitrary macros are not supported.")
  @minLength(1)
  @maxLength(12000)
  text: string;
}

model MathContentBlock {
  kind: "MATH";

  @doc("A bounded KaTeX-compatible LaTeX expression for a standalone formula. Use displayMode true for centered display; false for a standalone inline-sized formula. Mixed sentence math belongs in TEXT with \\(...\\). Raw HTML and arbitrary macros are not supported.")
  @minLength(1)
  @maxLength(4000)
  latex: string;

  displayMode: boolean;
}

model ImageContentBlock {
  kind: "IMAGE";
  imageId: YukCSCA.uuid;

  @minLength(1)
  @maxLength(500)
  altText: string;

  @maxLength(1000)
  caption: string | null;
}

union ContentBlock {
  text: TextContentBlock,
  math: MathContentBlock,
  image: ImageContentBlock,
}

model LocalizedContent {
  language: ExplanationLanguage;
  blocks: ContentBlock[];
}

model DraftProvenanceInput {
  origin?: ContentOrigin;

  @maxLength(200)
  provider?: string | null;

  @maxLength(2000)
  sourceLocator?: string | null;

  @maxLength(1000)
  permissionReference?: string | null;
}

model DraftProvenanceRecord extends DraftProvenanceInput {
  authorUserId: YukCSCA.uuid;
  reviewedByUserId: YukCSCA.uuid | null;
  reviewedAt: utcDateTime | null;
}

model ProvenanceInput extends DraftProvenanceInput {
  origin: ContentOrigin;
}

model ProvenanceRecord extends ProvenanceInput {
  authorUserId: YukCSCA.uuid;
  reviewedByUserId: YukCSCA.uuid | null;
  reviewedAt: utcDateTime | null;
}

@doc("One Chinese surface form of a reviewed term. Audio is rendered at publish, not authored here.")
model TermSurfaceFormInput {
  @minLength(1)
  @maxLength(40)
  text: string;

  @minLength(1)
  @maxLength(80)
  pinyin: string;
}

@doc("Package-scoped reviewed term identity. Same model for any Chinese exam-language subject package.")
model TermDraft {
  id: YukCSCA.uuid;
  termClass: TermClass;

  @minItems(1)
  @maxItems(8)
  surfaceForms: TermSurfaceFormInput[];

  @doc("Explanation-language glosses. May include the same \\(...\\) inline KaTeX as TEXT blocks. Missing languages are allowed and must be flagged to students; they do not fork identity.")
  definitions: LocalizedText;

  @doc("Short English equivalent. May include \\(...\\) inline KaTeX.")
  @minLength(1)
  @maxLength(200)
  englishEquivalent: string;

  @doc("Optional notation as bounded KaTeX (no \\(...\\) wrappers). Raw HTML and arbitrary macros are not supported.")
  @maxLength(80)
  symbols?: string | null;

  @doc("Optional authentic example. May include the same \\(...\\) inline KaTeX as TEXT blocks.")
  @maxLength(500)
  example?: string | null;

  @doc("TOPIC_TERM should bind at least one outline item at publish. Exam-wording classes may be empty and reused across topics.")
  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];
}

@doc("Optional admin-preset attachment of a reviewed term to a question. The platform still auto-matches required and instruction/logic surface forms.")
model AuthoredTermAttachment {
  termId: YukCSCA.uuid;

  @doc("Optional exact surface form when the term has aliases. Omit to allow every published surface form.")
  @minLength(1)
  @maxLength(40)
  surfaceForm?: string | null;
}

model StudyResource<Provenance> {
  id: YukCSCA.uuid;
  kind?: StudyResourceKind;
  title: LocalizedText;
  outlineItemIds: YukCSCA.uuid[];
  objectiveIds: YukCSCA.uuid[];
  versions: LocalizedContent[];
  provenance: Provenance;

  @doc("Ordered required term ids for this resource. On LESSON this is that lesson's preview list (not a shared outline dictionary). TERMINOLOGY may still carry ids in older drafts; student preview and the lesson rail use the LESSON list. Empty or omitted for REMEDIATION.")
  @maxItems(64)
  requiredTermIds?: YukCSCA.uuid[];

  @doc("Optional reviewed short-video attachments, at most one per explanation language. Projected only on LESSON and REMEDIATION kinds; a TERMINOLOGY draft carrying an attachment is rejected by application validation, and an attachment with both videoAssetId and sceneSpecificationId absent is rejected as an incomplete handle. The attachment language must equal the referenced asset's explanationLanguage and, on the production path, the scene specification's explanationLanguage; mismatches are draft-save validation violations (INCOMPATIBLE) on resources[i].videos[j].language. Only assets in REVIEWED status at publish time project into the published revision; attachments referencing other states are excluded without blocking publication of the complete text, formula, and image unit. Each replacement references a new asset id and records its own provenance.")
  @maxItems(3)
  videos?: ResourceVideoAttachment[];
}

model QuestionOption {
  @minLength(1)
  @maxLength(40)
  key: string;

  @minItems(1)
  blocks: ContentBlock[];
}

@doc("One ordered mathematical hint tier. Tiers must be strictly ordered; any STRONG disclosure counts as strong assistance.")
model HintTier {
  strength: HintStrength;

  @minItems(1)
  @maxItems(20)
  blocks: ContentBlock[];
}

model Question<Provenance> {
  id: YukCSCA.uuid;
  examLanguage?: ExamLanguage;
  difficulty?: QuestionDifficulty;
  stem: ContentBlock[];
  options: QuestionOption[];

  @minLength(1)
  @maxLength(40)
  correctOptionKey?: string;

  explanations: LocalizedContent[];

  @doc("Ordered mathematical hint ladder. Empty when no hints are authored. Chinese language-assist tiers are out of VS-009.")
  @maxItems(8)
  hintTiers?: HintTier[];

  @doc("Optional short common-mistake notes shown after item feedback. Not a full remediation resource.")
  @maxItems(6)
  commonMistakeNotes?: LocalizedText[];

  @doc("Optional LESSON or REMEDIATION resource ids linked from post-submit solution UI.")
  @maxItems(8)
  relatedResourceIds?: YukCSCA.uuid[];

  @doc("Optional admin-preset term attachments. Auto-match of required and instruction/logic surface forms still applies. Do not mark every character.")
  @maxItems(32)
  authoredTermAttachments?: AuthoredTermAttachment[];

  outlineItemIds: YukCSCA.uuid[];
  objectiveIds: YukCSCA.uuid[];
  provenance: Provenance;
}

@doc("Admin-authored assessment set bound to one exam language and an ordered question list. Materialized for students only after package publish.")
model AssessmentSet {
  id: YukCSCA.uuid;
  purpose: AssessmentSetPurpose;
  title: LocalizedText;
  examLanguage: ExamLanguage;

  @doc("Optional difficulty filter tag for TOPIC_PRACTICE catalog queries.")
  difficulty?: QuestionDifficulty | null;

  @doc("Ordered question ids. Hard max 12; CHECKPOINT recommended max 5 is soft admin guidance.")
  @minItems(1)
  @maxItems(12)
  questionIds: YukCSCA.uuid[];

  @maxItems(32)
  outlineItemIds: YukCSCA.uuid[];

  @maxItems(32)
  objectiveIds: YukCSCA.uuid[];

  @doc("Required when purpose is CHECKPOINT: the LESSON resource that must be content-complete before start.")
  lessonResourceId?: YukCSCA.uuid | null;

  @minValue(1)
  @maxValue(180)
  estimatedMinutes?: int32 | null;

  @doc("Defaults to IMMEDIATE when omitted on save.")
  feedbackMode?: AssessmentFeedbackMode;

  @doc("Required for CHECKPOINT at publish. TOPIC_PRACTICE may omit.")
  passPolicy?: CheckpointPassPolicy | null;

  @doc("Preferred published REMEDIATION resource ids for the fail path. Empty means resolve by shared objective/outline.")
  @maxItems(8)
  remediationResourceIds?: YukCSCA.uuid[];
}

model MockQuestion {
  questionId: YukCSCA.uuid;

  @minValue(1)
  points: int32;
}

model MockPaper {
  id: YukCSCA.uuid;

  @minLength(1)
  @maxLength(200)
  title?: string;

  examLanguage?: ExamLanguage;

  @minValue(1)
  @maxValue(300)
  durationMinutes?: int32;

  @minValue(1)
  @maxValue(1000)
  totalPoints?: int32;

  @minValue(1)
  @maxValue(200)
  questionCount?: int32;

  questionType?: "SINGLE_ANSWER";

  @maxItems(200)
  questions: MockQuestion[];

  provenance: DraftProvenanceInput;
}

model MockPaperRecord extends MockPaper {
  provenance: DraftProvenanceRecord;
}

model AcademicPackageDraftInput {
  officialSyllabus: OfficialSyllabus;
  outlineItems: SyllabusOutlineItem[];
  learningObjectives: LearningObjective[];
  resources: StudyResource<DraftProvenanceInput>[];
  questions: Question<DraftProvenanceInput>[];

  @doc("Assessment sets (checkpoint and topic practice). Empty array when none authored.")
  @maxItems(64)
  assessmentSets?: AssessmentSet[];

  @doc("Reviewed Chinese exam-language term bank for this package. Subject-agnostic; first published use is Chinese Mathematics. Omitted or empty when none authored.")
  @maxItems(500)
  terms?: TermDraft[];

  @maxItems(1)
  mocks: MockPaper[];
}

model AcademicPackageDraft {
  officialSyllabus: OfficialSyllabus;
  outlineItems: SyllabusOutlineItem[];
  learningObjectives: LearningObjective[];
  resources: StudyResource<DraftProvenanceRecord>[];
  questions: Question<DraftProvenanceRecord>[];

  @doc("Assessment sets saved on the draft. Omitted or empty when none authored; clients should treat omit as empty.")
  @maxItems(64)
  assessmentSets?: AssessmentSet[];

  @doc("Reviewed Chinese exam-language term bank saved on the draft. Omitted or empty when none authored; clients should treat omit as empty.")
  @maxItems(500)
  terms?: TermDraft[];

  @maxItems(1)
  mocks: MockPaperRecord[];
}

model PublishedRevisionSummary {
  id: YukCSCA.uuid;
  revisionNumber: int64;
  publishedAt: utcDateTime;
  publishedByUserId: YukCSCA.uuid;
}

model AcademicPackage {
  id: YukCSCA.uuid;
  subject: AcademicSubject;
  status: AcademicPackageStatus;
  draftRevision: int64;
  activeRevision: PublishedRevisionSummary | null;

  @doc("True when the saved draft differs from the active published revision; false after a successful publication.")
  hasUnpublishedChanges: boolean;

  draft: AcademicPackageDraft;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

model AcademicPackageSummary {
  id: YukCSCA.uuid;
  subject: AcademicSubject;
  status: AcademicPackageStatus;
  draftRevision: int64;
  activeRevision: PublishedRevisionSummary | null;

  @doc("True when the package has saved draft changes that are not in the active published revision.")
  hasUnpublishedChanges: boolean;

  updatedAt: utcDateTime;
}

model CreateAcademicPackageRequest {
  subject: AcademicSubject;
}

model SaveAcademicPackageDraftRequest {
  @minValue(0)
  expectedDraftRevision: int64;

  draft: AcademicPackageDraftInput;
}

model PublishAcademicPackageRequest {
  @minValue(0)
  expectedDraftRevision: int64;
}

model ArchiveAcademicPackageRequest {
  @minValue(0)
  expectedDraftRevision: int64;

  @minLength(1)
  @maxLength(500)
  reason: string;
}

@doc("A PNG or JPEG upload bounded to 5 MiB before server-side decode and re-encoding.")
model AcademicImageUploadFile extends File<"image/png" | "image/jpeg", bytes> {}

model UploadAcademicImageRequest {
  file: HttpPart<AcademicImageUploadFile>;
  provenance: HttpPart<ProvenanceInput>;
}

model AcademicImage {
  id: YukCSCA.uuid;
  mediaType: "image/png" | "image/jpeg";

  @minValue(1)
  @maxValue(5242880)
  byteSize: int64;

  @minValue(1)
  @maxValue(4096)
  width: int32;

  @minValue(1)
  @maxValue(4096)
  height: int32;

  @pattern("^[a-f0-9]{64}$")
  sha256: string;

  provenance: ProvenanceRecord;
  createdAt: utcDateTime;
}

model AcademicValidationViolation {
  @minLength(1)
  @maxLength(500)
  path: string;

  code: AcademicValidationCode;
}

model AcademicValidationProblem extends YukCSCA.Problem {
  code: "ACADEMIC_VALIDATION_FAILED";
  violations: AcademicValidationViolation[];
}

@error
model AcademicValidationResponse {
  @statusCode statusCode: 400;
  @header contentType: "application/problem+json";
  @body body: AcademicValidationProblem;
}

model AcademicPackageListResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AcademicPackageSummary[];
}

model AcademicPackageResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AcademicPackage;
}

model AcademicPackageCreatedResponse {
  @statusCode statusCode: 201;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AcademicPackage;
}

model AcademicImageCreatedResponse {
  @statusCode statusCode: 201;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AcademicImage;
}

model AcademicImageContentResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "private, max-age=31536000, immutable";
  @header("X-Content-Type-Options") contentTypeOptions: "nosniff";
  @bodyRoot image: AcademicImageUploadFile;
}

@doc("Pre-rendered short clip for one published Chinese surface form. Admin GET never synthesizes.")
model TermPronunciationFile extends File<"audio/mpeg", bytes> {}

model TermPronunciationContentResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "private, max-age=31536000, immutable";
  @header("X-Content-Type-Options") contentTypeOptions: "nosniff";
  @bodyRoot audio: TermPronunciationFile;
}

// ---------------------------------------------------------------------------
// Reviewed short video (VS-010B)
// Optional video assets on lesson/remediation explanation-language versions.
// Produced videos come from template-bound scene specifications rendered by
// the isolated Python worker; uploaded videos come through presigned slots.
// ---------------------------------------------------------------------------

@doc("How a reviewed-video asset came to exist.")
enum VideoAssetSource {
  UPLOADED,
  PRODUCED,
}

@doc("Lifecycle of an optional reviewed-video asset. UPLOADED assets are created at slot confirmation in AWAITING_VALIDATION; PRODUCED assets are created by a succeeded render directly in DRAFT (a failed render creates no asset — the failure lives on the render job). Only REVIEWED assets project into a published revision; students never observe any other state. RETIRED is system-managed when a replacement publishes.")
enum VideoAssetStatus {
  AWAITING_VALIDATION,
  DRAFT,
  REVIEWED,
  REJECTED,
  RETIRED,
}

@doc("Asynchronous job kind executed by the isolated Python render worker on the PostgreSQL-polled queue.")
enum RenderJobKind {
  VALIDATE_UPLOAD,
  RENDER_SCENE,
}

@doc("Render/validation job state. SUCCEEDED and FAILED are terminal; retries stay inside RUNNING attempts.")
enum RenderJobState {
  QUEUED,
  RUNNING,
  SUCCEEDED,
  FAILED,
}

@doc("Terminal failure classification surfaced to the administrator.")
enum RenderJobErrorCode {
  VALIDATION_FAILED,
  RENDER_TIMEOUT,
  DURATION_POLICY,
  SPEECH_SYNTHESIS_FAILED,
  INTERNAL,
}

@doc("One template-bound scene segment authored in the admin script: a reviewed visual action plus its narration text. Never executable scene code.")
model SceneSegment {
  @pattern("^[a-z0-9][a-z0-9-]{0,63}$")
  templateActionId: string;

  @doc("Template-specific parameters: an arbitrary JSON object, carried as an untyped wire boundary because its shape is per-template. Clients author it from the SceneTemplateAction param descriptors and narrow it immediately; the server semantically validates keys and values against the reviewed template schema, surfacing violations with the offending segment path.")
  params?: unknown;

  @minLength(1)
  @maxLength(600)
  narrationText: string;
}

model SceneSpecificationInput {
  explanationLanguage: ExplanationLanguage;

  @minItems(1)
  @maxItems(60)
  segments: SceneSegment[];
}

@doc("Stored admin script compiled to a template-bound scene specification. The render worker consumes only this schema-validated data.")
model SceneSpecification extends SceneSpecificationInput {
  id: YukCSCA.uuid;

  @doc("Registry version this specification was last validated against. A registry bump that invalidates an old script surfaces as VALIDATION_FAILED at render; the editor warns before re-render by comparing with the current registry version.")
  @minLength(1)
  @maxLength(40)
  registryVersion: string;

  @doc("Latest render job for this specification, embedded on responses so reload recovery needs no job listing. Null when never enqueued.")
  latestRenderJob?: RenderJob | null;

  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

@doc("Input kind of one template-action parameter; drives the structured control the script editor renders. Semantic validation stays server-side against the same reviewed schema.")
enum SceneTemplateParamKind {
  STRING,
  MULTILINE_TEXT,
  INTEGER,
  DECIMAL,
  MATH_EXPRESSION,
}

@doc("Data-only descriptor of one template-action parameter. Bounded values; never executable content.")
model SceneTemplateParamDescriptor {
  @pattern("^[a-z0-9][a-z0-9-]{0,63}$")
  id: string;

  kind: SceneTemplateParamKind;

  @doc("Canonical authoring label; server-provided registry metadata in one canonical language for the pilot, not student-facing content. Clients may layer localization by action and param id later.")
  @minLength(1)
  @maxLength(160)
  label?: string | null;

  required?: boolean | null;

  @doc("Inclusive lower bound; INTEGER and DECIMAL kinds only.")
  min?: decimal | null;

  @doc("Inclusive upper bound; INTEGER and DECIMAL kinds only.")
  max?: decimal | null;

  @doc("Maximum text length; STRING, MULTILINE_TEXT, and MATH_EXPRESSION kinds only.")
  @minValue(1)
  @maxValue(2000)
  maxLength?: int32 | null;
}

@doc("One reviewed visual action available to the admin script editor.")
model SceneTemplateAction {
  @pattern("^[a-z0-9][a-z0-9-]{0,63}$")
  id: string;

  @doc("Canonical authoring name; server-provided registry metadata in one canonical language for the pilot, not student-facing content. Clients may layer localization by action id later.")
  @minLength(1)
  @maxLength(80)
  displayName: string;

  @doc("Structured parameter descriptors the script editor renders inputs from. Empty when the action takes no parameters.")
  @maxItems(16)
  params: SceneTemplateParamDescriptor[];
}

@doc("Current reviewed render-template registry versioned with the worker.")
model SceneTemplateRegistry {
  @minLength(1)
  @maxLength(40)
  version: string;

  @minItems(1)
  actions: SceneTemplateAction[];
}

@doc("Optional reviewed-video attachment on one explanation-language version of a study resource; the durable draft handle that survives reloads. Upload path: videoAssetId is set at slot confirmation and kept through AWAITING_VALIDATION and later states. Production path: sceneSpecificationId is set at script creation and retained through review so the script stays reopenable (transcript from segments, replace, re-enqueue); videoAssetId is added when the render job reaches SUCCEEDED. At least one of the two ids must be present; both are present on the produced path after success. videoAssetId is the sole publish/projection reference. Drafts are saved immediately after each id is obtained, so recovery after reload needs only the package draft.")
model ResourceVideoAttachment {
  language: ExplanationLanguage;

  videoAssetId?: YukCSCA.uuid | null;

  sceneSpecificationId?: YukCSCA.uuid | null;
}

model CreateVideoUploadSlotRequest {
  explanationLanguage: ExplanationLanguage;
}

@doc("Short-lived presigned slot for direct-to-storage upload of one finished short video. uploadUrl accepts exactly one HTTP PUT whose body is the raw video bytes; send no Content-Type or other headers beyond those covered by the presign. The storage bucket must allow the web origin for the presigned PUT (CORS preflight plus exposed ETag) — a deployment invariant of this slice.")
model VideoUploadSlot {
  id: YukCSCA.uuid;
  explanationLanguage: ExplanationLanguage;

  @minLength(1)
  @maxLength(2000)
  uploadUrl: string;

  @doc("Upload size bound for the pre-upload client check; server-side probing enforces the same bound.")
  @minValue(1)
  @maxValue(209715200)
  maxByteSize: int64;

  expiresAt: utcDateTime;
}

model ConfirmVideoUploadRequest {
  provenance: ProvenanceInput;
}

model CreateRenderJobRequest {
  sceneSpecificationId: YukCSCA.uuid;
}

@doc("Terminal job failure detail. Never carries narration text or scene content.")
model RenderJobError {
  code: RenderJobErrorCode;

  @maxLength(500)
  detail?: string | null;
}

@doc("One asynchronous render or upload-validation job. A job snapshots the scene specification and its registry version at enqueue; replacing the specification does not affect an in-flight job — clients detect a stale render by comparing createdAt with the specification's updatedAt. Workers claim through a visibility-timeout poll; a claim that expires without completion is retried within the attempts bound and then fails terminally. Suggested client poll interval: 5 seconds.")
model RenderJob {
  id: YukCSCA.uuid;
  kind: RenderJobKind;
  state: RenderJobState;

  @doc("Set for RENDER_SCENE jobs.")
  sceneSpecificationId: YukCSCA.uuid | null;

  @doc("For RENDER_SCENE: the produced asset once SUCCEEDED. For VALIDATE_UPLOAD: the confirmed asset under validation, set when the job is created.")
  videoAssetId: YukCSCA.uuid | null;

  @minValue(0)
  @maxValue(5)
  attempts: int32;

  error: RenderJobError | null;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

@doc("One optional reviewed short-video asset with its lifecycle, playable-shape metadata, and provenance.")
model AcademicVideoAsset {
  id: YukCSCA.uuid;
  source: VideoAssetSource;
  status: VideoAssetStatus;
  explanationLanguage: ExplanationLanguage;
  mediaType: "video/mp4";

  @doc("Null until bytes are validated.")
  @minValue(1)
  @maxValue(209715200)
  byteSize: int64 | null;

  @doc("Null until bytes are validated. Bounded by the short-video duration policy (max 10 minutes).")
  @minValue(1)
  @maxValue(600)
  durationSeconds: int32 | null;

  @minValue(1)
  @maxValue(3840)
  width: int32 | null;

  @minValue(1)
  @maxValue(2160)
  height: int32 | null;

  @pattern("^[a-f0-9]{64}$")
  sha256: string | null;

  @doc("True once WebVTT captions exist: supplied by the admin for UPLOADED assets, derived from narration segments for PRODUCED assets. Required before review.")
  captionsAvailable: boolean;

  @doc("Upload-probe rejection reasons. Null unless status is REJECTED; production failures never create an asset and surface on the render job instead.")
  rejection: AcademicValidationViolation[] | null;

  @doc("Latest VALIDATE_UPLOAD job for an UPLOADED asset, including bounded terminal failure detail so an administrator can recover polling or retry after reload. Null for PRODUCED assets.")
  latestValidationJob: RenderJob | null;

  provenance: ProvenanceRecord;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

model PutVideoCaptionsRequest {
  @doc("WebVTT source for one UPLOADED video asset. Bounded and syntax-validated; cue timing beyond the asset duration is rejected.")
  @minLength(1)
  @maxLength(65536)
  captions: string;
}

model VideoUploadSlotCreatedResponse {
  @statusCode statusCode: 201;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: VideoUploadSlot;
}

@doc("Accepted for asynchronous probing on the isolated worker; the returned asset starts AWAITING_VALIDATION.")
model VideoAssetAcceptedResponse {
  @statusCode statusCode: 202;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AcademicVideoAsset;
}

model SceneSpecificationCreatedResponse {
  @statusCode statusCode: 201;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: SceneSpecification;
}

model SceneSpecificationResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: SceneSpecification;
}

model SceneTemplateRegistryResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: SceneTemplateRegistry;
}

model RenderJobCreatedResponse {
  @statusCode statusCode: 201;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: RenderJob;
}

model RenderJobResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: RenderJob;
}

@doc("One active job already exists for this scene specification. The embedded job recovers the job id after a lost response without any listing.")
model RenderJobConflictProblem extends YukCSCA.Problem {
  code: "RENDER_JOB_ACTIVE";
  job: RenderJob;
}

@error
model RenderJobConflictResponse {
  @statusCode statusCode: 409;
  @header contentType: "application/problem+json";
  @body body: RenderJobConflictProblem;
}

@doc("Validation retry conflict. RENDER_JOB_ACTIVE embeds the already-active validation job; VALIDATION_NOT_RETRYABLE means the asset is not an uploaded asset awaiting validation or its staged bytes are no longer reserved.")
model VideoValidationRetryConflictProblem extends YukCSCA.Problem {
  code: "RENDER_JOB_ACTIVE" | "VALIDATION_NOT_RETRYABLE";
  job?: RenderJob | null;
}

@error
model VideoValidationRetryConflictResponse {
  @statusCode statusCode: 409;
  @header contentType: "application/problem+json";
  @body body: VideoValidationRetryConflictProblem;
}

model AcademicVideoResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AcademicVideoAsset;
}

@doc("Short-lived presigned playback grant. The client assigns url to a video element src, so native Range streaming and resume go straight to object storage with no credentials attached; deployment must therefore allow the storage origin in CSP media-src. Grants are never cached and are refreshed from this API before expiresAt.")
model VideoPlaybackGrant {
  @minLength(1)
  @maxLength(2000)
  url: string;

  expiresAt: utcDateTime;
}

@doc("Review playback grant for one DRAFT or REVIEWED asset.")
model VideoPlayResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @body body: VideoPlaybackGrant;
}

model VideoCaptionsFile extends File<"text/vtt", string> {}

@doc("Draft captions may change before review, so they are never cached.")
model AdminVideoCaptionsResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("X-Content-Type-Options") contentTypeOptions: "nosniff";
  @bodyRoot captions: VideoCaptionsFile;
}

@route("/api/v1/admin")
interface AcademicAdminApi {
  @doc("Lists the pilot academic packages visible to the authenticated administrator.")
  @get
  @route("/academic-packages")
  @useAuth(BearerAuth)
  listAcademicPackages():
    | AcademicPackageListResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Creates one academic package for a supported subject as an empty draft. One package per subject.")
  @post
  @route("/academic-packages")
  @useAuth(BearerAuth)
  createAcademicPackage(@body request: CreateAcademicPackageRequest):
    | AcademicPackageCreatedResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns the administrator's current draft and active published-revision summary.")
  @get
  @route("/academic-packages/{id}")
  @useAuth(BearerAuth)
  getAcademicPackage(@path id: YukCSCA.uuid):
    | AcademicPackageResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Replaces the package draft when its expected revision is current. Stale writes fail without merging.")
  @put
  @route("/academic-packages/{id}/draft")
  @useAuth(BearerAuth)
  saveAcademicPackageDraft(@path id: YukCSCA.uuid, @body request: SaveAcademicPackageDraftRequest):
    | AcademicPackageResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Uploads one bounded PNG or JPEG diagram with its minimal source basis.")
  @post
  @route("/academic-images")
  @useAuth(BearerAuth)
  uploadAcademicImage(@multipartBody request: UploadAcademicImageRequest):
    | AcademicImageCreatedResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns one immutable, administrator-only academic image.")
  @get
  @route("/academic-images/{id}")
  @useAuth(BearerAuth)
  getAcademicImage(@path id: YukCSCA.uuid):
    | AcademicImageContentResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Validates and atomically publishes the current package draft as a new immutable active revision.")
  @post
  @route("/academic-packages/{id}:publish")
  @useAuth(BearerAuth)
  publishAcademicPackage(@path id: YukCSCA.uuid, @body request: PublishAcademicPackageRequest):
    | AcademicPackageResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Archives the package without deleting its revisions, images, or audit history.")
  @post
  @route("/academic-packages/{id}:archive")
  @useAuth(BearerAuth)
  archiveAcademicPackage(@path id: YukCSCA.uuid, @body request: ArchiveAcademicPackageRequest):
    | AcademicPackageResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns the stored pronunciation clip from the package's active published revision — the audio students hear. Never synthesizes. 404 when the package has no active revision or no clip.")
  @get
  @route("/academic-packages/{id}/terms/{termId}/audio")
  @useAuth(BearerAuth)
  getPublishedTermPronunciation(
    @path id: YukCSCA.uuid,
    @path termId: YukCSCA.uuid,
    @query @maxLength(40) surfaceForm?: string,
  ):
    | TermPronunciationContentResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Creates a short-lived presigned upload slot for one finished short video in one explanation language. The client uploads bytes directly to object storage; nothing is attached to content until the asset is referenced from a draft.")
  @post
  @route("/academic-video-slots")
  @useAuth(BearerAuth)
  createVideoUploadSlot(@body request: CreateVideoUploadSlotRequest):
    | VideoUploadSlotCreatedResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Confirms an uploaded finished video with its provenance and queues asynchronous probing (container, duration, resolution, size) on the isolated worker. Idempotent: once a confirm has succeeded, replaying it returns the same 202 and the same asset even after slot expiry, so a browser retry after a lost response never forces a re-upload. 409 code SLOT_PENDING when the slot has no uploaded bytes; SLOT_EXPIRED for a first confirm after expiry. A valid probe yields a DRAFT asset; a rejected probe yields REJECTED with reasons. Neither state blocks any content publication.")
  @post
  @route("/academic-video-slots/{slotId}:confirm")
  @useAuth(BearerAuth)
  confirmVideoUpload(@path slotId: YukCSCA.uuid, @body request: ConfirmVideoUploadRequest):
    | VideoAssetAcceptedResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Creates a template-bound scene specification from the admin script. Validation failures identify the offending path using the grammar segments[i], segments[i].templateActionId, segments[i].params.<paramId>, segments[i].narrationText, plus segments and explanationLanguage for collection-level bounds; nothing is rendered yet.")
  @post
  @route("/scene-specifications")
  @useAuth(BearerAuth)
  createSceneSpecification(@body request: SceneSpecificationInput):
    | SceneSpecificationCreatedResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Replaces one scene specification; validation uses the same segment path grammar as creation. A finished render is unaffected; re-enqueueing creates a new render job against the replaced script.")
  @put
  @route("/scene-specifications/{id}")
  @useAuth(BearerAuth)
  replaceSceneSpecification(@path id: YukCSCA.uuid, @body request: SceneSpecificationInput):
    | SceneSpecificationResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns one stored scene specification with its segments.")
  @get
  @route("/scene-specifications/{id}")
  @useAuth(BearerAuth)
  getSceneSpecification(@path id: YukCSCA.uuid):
    | SceneSpecificationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Lists the reviewed render-template actions available to the script editor for the current registry version.")
  @get
  @route("/scene-templates")
  @useAuth(BearerAuth)
  listSceneTemplates():
    | SceneTemplateRegistryResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Enqueues production of one scene specification on the isolated worker (gTTS narration, reviewed templates, FFmpeg muxing). One active job per specification; concurrent enqueue returns 409 RENDER_JOB_ACTIVE with the active job embedded so a lost response is recoverable. The text/formula/image unit is never blocked by production.")
  @post
  @route("/render-jobs")
  @useAuth(BearerAuth)
  createRenderJob(@body request: CreateRenderJobRequest):
    | RenderJobCreatedResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | RenderJobConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns one render or upload-validation job with state, attempts, and bounded failure detail.")
  @get
  @route("/render-jobs/{jobId}")
  @useAuth(BearerAuth)
  getRenderJob(@path jobId: YukCSCA.uuid):
    | RenderJobResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns one video asset with lifecycle, playable-shape metadata, rejection reasons, provenance, and the latest upload-validation job for reload-safe polling and failure recovery.")
  @get
  @route("/academic-videos/{id}")
  @useAuth(BearerAuth)
  getAcademicVideo(@path id: YukCSCA.uuid):
    | AcademicVideoResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Retries terminal upload validation from the durable asset id after reload. The asset must be UPLOADED and AWAITING_VALIDATION with staged bytes still reserved. Returns 409 RENDER_JOB_ACTIVE with the active job on a duplicate request, or VALIDATION_NOT_RETRYABLE when the asset or bytes can no longer be retried.")
  @post
  @route("/academic-videos/{id}:retry-validation")
  @useAuth(BearerAuth)
  retryAcademicVideoValidation(@path id: YukCSCA.uuid):
    | RenderJobCreatedResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | VideoValidationRetryConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns a short-lived presigned range-capable playback URL for administrator review of one DRAFT or REVIEWED asset; the client assigns it to a video element src. 404 while bytes are not yet validated (AWAITING_VALIDATION); 409 code VIDEO_NOT_PLAYABLE for REJECTED and RETIRED assets.")
  @get
  @route("/academic-videos/{id}/play")
  @useAuth(BearerAuth)
  getAcademicVideoPlay(@path id: YukCSCA.uuid):
    | VideoPlayResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns the WebVTT captions of one video asset for administrator review. 404 when captions do not exist (captionsAvailable false); captions never exist for AWAITING_VALIDATION or REJECTED assets.")
  @get
  @route("/academic-videos/{id}/captions")
  @useAuth(BearerAuth)
  getAcademicVideoCaptions(@path id: YukCSCA.uuid):
    | AdminVideoCaptionsResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Supplies or replaces the captions for one UPLOADED DRAFT asset with validated bytes. 409 code CAPTIONS_DERIVED_FROM_NARRATION for PRODUCED assets (captions derive from narration segments); CAPTIONS_IMMUTABLE for REVIEWED and RETIRED assets — caption corrections after review go through the replacement flow with their own provenance and review; CAPTIONS_NOT_EDITABLE for AWAITING_VALIDATION and REJECTED assets.")
  @put
  @route("/academic-videos/{id}/captions")
  @useAuth(BearerAuth)
  putAcademicVideoCaptions(@path id: YukCSCA.uuid, @body request: PutVideoCaptionsRequest):
    | AcademicVideoResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Marks the playable result, captions, language version, and provenance human-reviewed after the administrator has watched the Draft. Requires a DRAFT asset with validated bytes and captions; violations of those preconditions (including an already-REVIEWED asset) return 409 code REVIEW_PRECONDITION_UNMET. Only REVIEWED assets project into a published revision. A model never performs this transition.")
  @post
  @route("/academic-videos/{id}:review")
  @useAuth(BearerAuth)
  reviewAcademicVideo(@path id: YukCSCA.uuid):
    | AcademicVideoResponse
    | AcademicValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.InternalServerErrorResponse;
}
