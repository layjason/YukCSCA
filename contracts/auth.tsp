using TypeSpec.Http;

namespace YukCSCA.Auth;

@doc("A browser credential returned by Google Identity Services.")
model GoogleLoginRequest {
  @minLength(20)
  @maxLength(10000)
  credential: string;
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
  displayName: string;
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
  @post
  @route("/google")
  googleLogin(@body request: GoogleLoginRequest):
    AuthCookieResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ConflictResponse
    | YukCSCA.TooManyRequestsResponse;

  @post
  @route("/refresh")
  refresh(@cookie("yukcsca_refresh") refreshToken?: string):
    AuthCookieResponse | YukCSCA.UnauthorizedResponse | YukCSCA.TooManyRequestsResponse;

  @post
  @route("/logout")
  logout(@cookie("yukcsca_refresh") refreshToken?: string): LogoutResponse;

  @get
  @route("/me")
  @useAuth(BearerAuth)
  me(): CurrentUser | YukCSCA.UnauthorizedResponse;
}
