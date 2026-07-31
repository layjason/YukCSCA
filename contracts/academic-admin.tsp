using TypeSpec.Http;

namespace YukCSCA.AcademicAdmin;

enum AcademicPackageStatus {
  DRAFT,
  PUBLISHED,
  ARCHIVED,
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

model ExamStructure {
  durationMinutes?: 60;
  totalPoints?: 100;
  questionCount?: 48;
  questionType?: "SINGLE_ANSWER";

  @maxItems(2)
  examLanguages?: ExamLanguage[];
}

model OfficialSyllabus {
  subject: "MATHEMATICS";

  @minLength(1)
  @maxLength(160)
  authority?: string;

  @minLength(1)
  @maxLength(80)
  editionLabel?: string;

  @maxLength(2000)
  sourceUrl?: string;

  @maxItems(2)
  sourceLanguages?: ExamLanguage[];

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
  outlineItemIds: YukCSCA.uuid[];
  objectiveIds: YukCSCA.uuid[];
  provenance: Provenance;
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
  durationMinutes?: 60;
  totalPoints?: 100;
  questionCount?: 48;
  questionType?: "SINGLE_ANSWER";

  @maxItems(48)
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

  @maxItems(1)
  mocks: MockPaper[];
}

model AcademicPackageDraft {
  officialSyllabus: OfficialSyllabus;
  outlineItems: SyllabusOutlineItem[];
  learningObjectives: LearningObjective[];
  resources: StudyResource<DraftProvenanceRecord>[];
  questions: Question<DraftProvenanceRecord>[];

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
  subject: "MATHEMATICS";
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
  subject: "MATHEMATICS";
  status: AcademicPackageStatus;
  draftRevision: int64;
  activeRevision: PublishedRevisionSummary | null;

  @doc("True when the package has saved draft changes that are not in the active published revision.")
  hasUnpublishedChanges: boolean;

  updatedAt: utcDateTime;
}

model CreateAcademicPackageRequest {
  subject: "MATHEMATICS";
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

  @doc("Creates the single pilot Mathematics package as an empty draft.")
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
