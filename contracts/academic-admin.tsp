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

  @minLength(1)
  @maxLength(12000)
  text: string;
}

model MathContentBlock {
  kind: "MATH";

  @doc("A bounded KaTeX-compatible LaTeX expression. Raw HTML and arbitrary macros are not supported.")
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

model StudyResource<Provenance> {
  id: YukCSCA.uuid;
  kind?: StudyResourceKind;
  title: LocalizedText;
  outlineItemIds: YukCSCA.uuid[];
  objectiveIds: YukCSCA.uuid[];
  versions: LocalizedContent[];
  provenance: Provenance;
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
}
