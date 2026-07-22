using TypeSpec.Http;

namespace YukCSCA.Profile;

enum StudentGrade {
  GRADE_10,
  GRADE_11,
  GRADE_12,
  OTHER,
}

enum ExplanationLanguage {
  INDONESIAN: "id",
  ENGLISH: "en",
  SIMPLIFIED_CHINESE: "zh-CN",
}

enum StudentActivationField {
  PREFERRED_NAME: "preferredName",
  BIRTH_YEAR: "birthYear",
  CURRENT_GRADE: "currentGrade",
  CITY: "city",
  DEFAULT_EXPLANATION_LANGUAGE: "defaultExplanationLanguage",
}

enum FieldViolationCode {
  REQUIRED,
  TOO_LONG,
  OUT_OF_RANGE,
  UNSUPPORTED,
}

model FieldViolation {
  field: StudentActivationField;
  code: FieldViolationCode;
}

model ValidationProblem extends YukCSCA.Problem {
  code: "VALIDATION_FAILED";
  violations: FieldViolation[];
}

@error
model StudentProfileValidationResponse {
  @statusCode statusCode: 400;
  @body body: ValidationProblem;
}

model ActivateStudentProfileRequest {
  @doc("The student's explicitly confirmed preferred name. Provider profile data is only an editable suggestion.")
  @minLength(1)
  @maxLength(160)
  preferredName: string;

  @doc("A birth year in the inclusive range from the current Asia/Jakarta year minus 21 through the current year minus 12.")
  birthYear: int32;

  currentGrade: StudentGrade;

  @minLength(1)
  @maxLength(120)
  city: string;

  defaultExplanationLanguage: ExplanationLanguage;
}

model StudentProfile {
  id: YukCSCA.uuid;
  preferredName: string;
  birthYear: int32;
  currentGrade: StudentGrade;
  city: string;
  defaultExplanationLanguage: ExplanationLanguage;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

model StudentActivationResult {
  profile: StudentProfile;
  authentication: YukCSCA.Auth.AuthResponse;
}

model StudentProfileCreatedResponse {
  @statusCode statusCode: 201;
  @body body: StudentActivationResult;
}

model ExistingStudentProfileResponse {
  @statusCode statusCode: 200;
  @body body: StudentActivationResult;
}

@route("/api/v1/student-profile")
interface StudentProfileApi {
  @doc("Activates the authenticated unassigned account as a student. A same-account retry returns the existing profile and replacement access state.")
  @post
  @useAuth(BearerAuth)
  activateStudentProfile(@body request: ActivateStudentProfileRequest):
    StudentProfileCreatedResponse
    | ExistingStudentProfileResponse
    | StudentProfileValidationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns the authenticated student's own profile.")
  @get
  @route("/me")
  @useAuth(BearerAuth)
  getMyStudentProfile():
    StudentProfile
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.InternalServerErrorResponse;
}
