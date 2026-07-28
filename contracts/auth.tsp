using TypeSpec.Http;

namespace YukCSCA.Auth;

@doc("A browser credential returned by Google Identity Services.")
model GoogleLoginRequest {
  @minLength(20)
  @maxLength(10000)
  credential: string;
}

model StartCredentialRegistrationRequest {
  @format("email")
  @maxLength(320)
  email: string;
}

model ResendCredentialVerificationRequest {
  @format("email")
  @maxLength(320)
  email: string;
}

model CompleteCredentialVerificationRequest {
  @minLength(32)
  @maxLength(512)
  token: string;

  @minLength(15)
  @maxLength(128)
  password: string;

  @minLength(1)
  @maxLength(100)
  termsVersion: string;

  @minLength(1)
  @maxLength(100)
  privacyNoticeVersion: string;

  termsAccepted: true;
  privacyNoticeAcknowledged: true;
}

model CredentialLoginRequest {
  @format("email")
  @maxLength(320)
  email: string;

  @minLength(1)
  @maxLength(128)
  password: string;
}

enum CredentialVerificationOutcome {
  CREDENTIAL_ACCOUNT_CREATED,
  SIGN_IN_WITH_GOOGLE,
}

model CredentialVerificationResult {
  outcome: CredentialVerificationOutcome;
}

model CredentialActionAcceptedResponse {
  @statusCode statusCode: 202;
}

enum UserRole {
  UNASSIGNED,
  STUDENT,
  PARENT,
  TUTOR,
  ADMIN,
}

model CurrentUser {
  id: YukCSCA.uuid;
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
}

model AuthResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresInSeconds: int64;
  user: CurrentUser;
}

model AuthCookieResponse {
  @statusCode statusCode: 200;
  @header("Set-Cookie") setCookie: string;
  @body body: AuthResponse;
}

model LogoutResponse {
  @statusCode statusCode: 204;
  @header("Set-Cookie") setCookie: string;
}

@route("/api/v1/auth")
interface AuthApi {
  @doc("Accepts a credential-registration request without revealing whether the canonical email is eligible or already owned.")
  @post
  @route("/credential-registrations")
  startCredentialRegistration(@body request: StartCredentialRegistrationRequest):
    CredentialActionAcceptedResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.TooManyRequestsResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Accepts a verification resend request without revealing whether the canonical email is eligible or already owned.")
  @post
  @route("/credential-verifications/resend")
  resendCredentialVerification(@body request: ResendCredentialVerificationRequest):
    CredentialActionAcceptedResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.TooManyRequestsResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Consumes a valid verification claim after explicit password and policy confirmation. It never creates a session.")
  @post
  @route("/credential-verifications/complete")
  completeCredentialVerification(@body request: CompleteCredentialVerificationRequest):
    CredentialVerificationResult
    | YukCSCA.BadRequestResponse
    | YukCSCA.TooManyRequestsResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Authenticates an existing email credential through the shared access-token and rotating refresh-cookie lifecycle.")
  @post
  @route("/credentials/login")
  credentialLogin(@body request: CredentialLoginRequest):
    AuthCookieResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.TooManyRequestsResponse
    | YukCSCA.InternalServerErrorResponse;

  @post
  @route("/google")
  googleLogin(@body request: GoogleLoginRequest):
    AuthCookieResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.TooManyRequestsResponse
    | YukCSCA.InternalServerErrorResponse;

  @post
  @route("/refresh")
  refresh(@cookie("yukcsca_refresh") refreshToken?: string):
    AuthCookieResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.TooManyRequestsResponse
    | YukCSCA.InternalServerErrorResponse;

  @post
  @route("/logout")
  logout(@cookie("yukcsca_refresh") refreshToken?: string):
    LogoutResponse | YukCSCA.InternalServerErrorResponse;

  @get
  @route("/me")
  @useAuth(BearerAuth)
  me(): CurrentUser | YukCSCA.UnauthorizedResponse | YukCSCA.InternalServerErrorResponse;
}
