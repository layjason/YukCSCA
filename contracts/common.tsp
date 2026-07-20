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
  code?: string;
}

@error
model BadRequestResponse {
  @statusCode statusCode: 400;
  @body body: Problem;
}

@error
model UnauthorizedResponse {
  @statusCode statusCode: 401;
  @body body: Problem;
}

@error
model ForbiddenResponse {
  @statusCode statusCode: 403;
  @body body: Problem;
}

@error
model ConflictResponse {
  @statusCode statusCode: 409;
  @body body: Problem;
}

@error
model TooManyRequestsResponse {
  @statusCode statusCode: 429;
  @header("Retry-After") retryAfter: string;
  @body body: Problem;
}
