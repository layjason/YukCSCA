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

@doc("Per-student content progress on one LESSON resource. Absent storage projects as NOT_STARTED.")
model ContentProgress {
  status: ContentProgressStatus;

  @doc("Zero-based resume index into the blocks of the explanation-language version the student was reading. Null when not started or when no block position is recorded.")
  @minValue(0)
  resumeBlockIndex: int32 | null;

  @doc("Last progress write time. Null when status is NOT_STARTED.")
  updatedAt: utcDateTime | null;

  @doc("True when status is CONTENT_COMPLETE and the active published package revision differs from the revision recorded when the student last marked complete. Soft signal only; never demotes content complete or implies mastery.")
  updatedSinceCompleted: boolean;
}

@doc("LESSON summary for outline browse and continue chips. Kind is always LESSON; other resource kinds are omitted.")
model LessonSummary {
  resourceId: YukCSCA.uuid;
  title: AcademicAdmin.LocalizedText;

  @minItems(0)
  outlineItemIds: YukCSCA.uuid[];

  contentProgress: ContentProgress;
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
}

@doc("Upsert content progress for the authenticated student on one LESSON. Idempotent by (account, package, resource).")
model UpsertContentProgressRequest {
  status: WritableContentProgressStatus;

  @doc("Zero-based resume block index within the language version the student is reading. Required when status is IN_PROGRESS; optional when CONTENT_COMPLETE.")
  @minValue(0)
  resumeBlockIndex?: int32 | null;

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

  @doc("Creates or replaces the authenticated student's content progress for one LESSON. Content complete never implies mastery. Checkpoint unlock is evaluated by the assessment module when the student requests a checkpoint.")
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
}
