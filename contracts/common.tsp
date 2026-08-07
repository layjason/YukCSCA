using TypeSpec.Http;

namespace YukCSCA;

@format("uuid")
scalar uuid extends string;

model Problem {
  status: int32;
  type?: string;
  title: string;
  detail?: string;
  instance?: string;
  code: string;
}

@error
model BadRequestResponse {
  @statusCode statusCode: 400;
  @header contentType: "application/problem+json";
  @body body: Problem;
}

@error
model UnauthorizedResponse {
  @statusCode statusCode: 401;
  @header contentType: "application/problem+json";
  @header("WWW-Authenticate") wwwAuthenticate?: string;
  @body body: Problem;
}

@error
model ForbiddenResponse {
  @statusCode statusCode: 403;
  @header contentType: "application/problem+json";
  @body body: Problem;
}

@error
model NotFoundResponse {
  @statusCode statusCode: 404;
  @header contentType: "application/problem+json";
  @body body: Problem;
}

@error
model ConflictResponse {
  @statusCode statusCode: 409;
  @header contentType: "application/problem+json";
  @body body: Problem;
}

@error
model TooManyRequestsResponse {
  @statusCode statusCode: 429;
  @header contentType: "application/problem+json";
  @header("Retry-After") retryAfter: string;
  @body body: Problem;
}

@error
model InternalServerErrorResponse {
  @statusCode statusCode: 500;
  @header contentType: "application/problem+json";
  @body body: Problem;
}
