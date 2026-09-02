using TypeSpec.Http;

namespace YukCSCA.AgentStudent;

// Student-private contextual text Q&A over one authorised learning context (VS-011).
// Hybrid search is a server tool, not a student HTTP operation. Student report and
// admin quality-queue operations are deferred to VS-020. No parent, tutor, or
// streaming operations. Academic and assessment read ports stay in those modules.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

@doc("Authorised host object a conversation or locator may bind to. MOCK_REPORT is deferred to VS-013.")
enum AgentContextType {
  LESSON,
  ITEM,
  MISTAKE,
  TERMINOLOGY,
  REMEDIATION,
}

@doc("Reason Ask is unavailable on an authorised context. Returned on the availability read, not as a 403, so first paint does not probe a write.")
enum AgentUnavailableCode {
  AGENT_DISABLED,
  FORMAL_ASSISTANCE_DISABLED,
}

@doc("Product label on a completed structured answer. Not an LLM-as-judge mastery score. Student chrome does not render these as marketing chips.")
enum AgentAnswerKind {
  REVIEWED_SOURCE,
  DERIVED_EXPLANATION,
  INSUFFICIENT_EVIDENCE,
}

@doc("Lifecycle of one Ask turn. PENDING is short-lived inside the Ask request; the public askTurn success body is always COMPLETED.")
enum AgentTurnStatus {
  PENDING,
  COMPLETED,
  FAILED,
}

@doc("Student-safe trajectory step kind. Raw Java tool names never appear in this projection.")
enum AgentTraceStepKind {
  TOOL,
  MODEL,
}

@doc("Stable agent problem codes returned in application/problem+json.")
enum AgentProblemCode {
  AGENT_DISABLED,
  AGENT_VALIDATION_FAILED,
  CONTEXT_CONFLICT,
  CONCURRENT_TURN_PENDING,
  AGENT_BUDGET_EXCEEDED,
  AGENT_PROVIDER_UNAVAILABLE,
}

// ---------------------------------------------------------------------------
// Shared nested models
// ---------------------------------------------------------------------------

@doc("Side-effect-free first-paint signal for compact Ask chrome. Does not create a conversation. When available is true, unavailableCode is null; when false, unavailableCode is AGENT_DISABLED or FORMAL_ASSISTANCE_DISABLED.")
model AgentAvailability {
  available: boolean;

  @doc("Null when available is true.")
  unavailableCode: AgentUnavailableCode | null;
}

@doc("Clickable pointer to an authorised host object the student can already open. Not an excerpt dump and not an open-web URL.")
model AgentLocator {
  sourceKind: AgentContextType;
  sourceId: YukCSCA.uuid;

  @minLength(1)
  @maxLength(120)
  label: string;

  @doc("Zero-based block index into a LESSON or REMEDIATION body. Null for terminology, item, and mistake locators that are not block-scoped.")
  @minValue(0)
  blockIndex: int32 | null;

  @doc("Published revision the locator was resolved against. A republished package does not rewrite past turns; a stale locator falls back to the object top.")
  packageRevisionId: YukCSCA.uuid | null;
}

@doc("Student-language trajectory step for Worked-for-Ns disclosure. Token counts, prompts, and raw tool names are omitted.")
model AgentTraceStep {
  kind: AgentTraceStepKind;

  @minLength(1)
  @maxLength(200)
  label: string;

  @maxItems(12)
  locators: AgentLocator[];

  @minValue(0)
  latencyMs: int32;
}

@doc("Shared turn identity echoed on reload. Quote is the optional host selection (TEXT/term span or whole MATH block latex).")
model AgentTurnIdentity {
  id: YukCSCA.uuid;

  @minLength(1)
  @maxLength(2000)
  questionText: string;

  @maxLength(4000)
  quote: string | null;

  createdAt: utcDateTime;
}

@doc("In-flight Ask reserved for idempotency. GET may expose this while another request with the same key is running; askTurn success never returns PENDING.")
model AgentPendingTurn extends AgentTurnIdentity {
  status: "PENDING";
}

@doc("Provider, timeout, or schema-exhausted failure stored without a fake answer. Replay of a FAILED key is not a completed-turn replay.")
model AgentFailedTurn extends AgentTurnIdentity {
  status: "FAILED";
}

@doc("Completed structured answer. body is TEXT-like prose that may include bounded inline \\(...\\) KaTeX so MixedProse can render it.")
model AgentCompletedTurn extends AgentTurnIdentity {
  status: "COMPLETED";
  kind: AgentAnswerKind;

  @minLength(1)
  @maxLength(12000)
  body: string;

  @maxItems(12)
  locators: AgentLocator[];

  @maxItems(16)
  steps: AgentTraceStep[];

  @doc("Zero to three same-conversation follow-up chips. Each chip is 1–80 characters. Empty when none. Chips must not retarget another context.")
  @maxItems(3)
  suggestedFollowUps: string[];

  @minValue(0)
  latencyMs: int32;
}

union AgentTurn {
  pending: AgentPendingTurn,
  completed: AgentCompletedTurn,
  failed: AgentFailedTurn,
}

@doc("Idempotent start from a host surface. One conversation per (account, contextType, contextId). Follow-ups cannot change context.")
model AgentConversationStart {
  contextType: AgentContextType;
  contextId: YukCSCA.uuid;

  @doc("Required when contextType is ITEM. Identifies the assessment session that owns the item.")
  sessionId?: YukCSCA.uuid;

  @doc("Required when contextType is ITEM. Must equal contextId and belong to sessionId.")
  itemId?: YukCSCA.uuid;
}

@doc("Student-owned conversation bound to one authorised context. Turns are newest-last and capped at 20 in this payload.")
model AgentConversation {
  id: YukCSCA.uuid;
  contextType: AgentContextType;
  contextId: YukCSCA.uuid;
  subject: AcademicAdmin.AcademicSubject;
  packageId: YukCSCA.uuid;
  packageRevisionId: YukCSCA.uuid;

  @doc("Non-null when contextType is ITEM. The session that owns the item; re-read on every turn.")
  sessionId: YukCSCA.uuid | null;

  @doc("Non-null when contextType is ITEM. Equals contextId.")
  itemId: YukCSCA.uuid | null;

  @doc("Answer language from the student profile at conversation create. Changing interface language does not change this.")
  explanationLanguage: AcademicAdmin.ExplanationLanguage;

  @doc("Exam terminology language from the authorised context. Independent from explanationLanguage.")
  examLanguage: AcademicAdmin.ExamLanguage;

  @maxItems(20)
  turns: AgentTurn[];

  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

@doc("Ask body. Context is inherited from the conversation; this request cannot retarget contextType or contextId.")
model AgentTurnRequest {
  @minLength(1)
  @maxLength(2000)
  questionText: string;

  @doc("Optional host selection: TEXT/terminology span, or a whole MATH block's authored latex. Echoed on the turn. Omit rather than send an empty string.")
  @minLength(1)
  @maxLength(4000)
  quote?: string | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

model AgentValidationViolation {
  @minLength(1)
  @maxLength(200)
  path: string;

  @minLength(1)
  @maxLength(80)
  code: string;
}

model AgentValidationProblem extends YukCSCA.Problem {
  code: "AGENT_VALIDATION_FAILED";

  @maxItems(20)
  violations: AgentValidationViolation[];
}

@error
model AgentValidationResponse {
  @statusCode statusCode: 400;
  @header contentType: "application/problem+json";
  @body body: AgentValidationProblem;
}

@doc("Kill switch or missing provider. Host screens must not advertise a working agent.")
model AgentDisabledProblem extends YukCSCA.Problem {
  code: "AGENT_DISABLED";
}

@error
model AgentDisabledResponse {
  @statusCode statusCode: 403;
  @header contentType: "application/problem+json";
  @body body: AgentDisabledProblem;
}

@doc("Conflict problem for agent lifecycle. code is one of AgentProblemCode string values.")
model AgentConflictProblem extends YukCSCA.Problem {
  code: "CONTEXT_CONFLICT" | "CONCURRENT_TURN_PENDING";
}

@error
model AgentConflictResponse {
  @statusCode statusCode: 409;
  @header contentType: "application/problem+json";
  @body body: AgentConflictProblem;
}

model AgentBudgetExceededProblem extends YukCSCA.Problem {
  code: "AGENT_BUDGET_EXCEEDED";
}

@error
model AgentBudgetExceededResponse {
  @statusCode statusCode: 429;
  @header contentType: "application/problem+json";
  @header("Retry-After") retryAfter: string;
  @body body: AgentBudgetExceededProblem;
}

@doc("Provider timeout, outage, or bounded schema-validation exhaustion. Not an insufficiency kind.")
model AgentProviderUnavailableProblem extends YukCSCA.Problem {
  code: "AGENT_PROVIDER_UNAVAILABLE";
}

@error
model AgentProviderUnavailableResponse {
  @statusCode statusCode: 503;
  @header contentType: "application/problem+json";
  @body body: AgentProviderUnavailableProblem;
}

// ---------------------------------------------------------------------------
// HTTP responses
// ---------------------------------------------------------------------------

model AgentAvailabilityResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AgentAvailability;
}

model AgentConversationResponse {
  @statusCode statusCode: 200;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AgentConversation;
}

model AgentConversationCreatedResponse {
  @statusCode statusCode: 201;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AgentConversation;
}

model AgentTurnCreatedResponse {
  @statusCode statusCode: 201;
  @header("Cache-Control") cacheControl: "no-store";
  @header("Pragma") pragma: "no-cache";
  @body body: AgentCompletedTurn;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

@route("/api/v1/agent")
interface AgentStudentApi {
  @doc("Side-effect-free Ask availability for one authorised host context. First-paint chrome uses this only; do not probe startConversation. Kill switch and formal mock return 200 with available false (never 403 on this read) so compact Ask is omitted without creating a conversation. ITEM requires sessionId and itemId that match; a mismatch is 409 CONTEXT_CONFLICT. Unauthorised or unknown context is 404. Parents and non-students receive generic 403. Budget and provider health are not this signal — those remain 429/503 on askTurn.")
  @get
  @route("/availability")
  @useAuth(BearerAuth)
  getAvailability(
    @query contextType: AgentContextType,
    @query contextId: YukCSCA.uuid,
    @doc("Required when contextType is ITEM. Identifies the assessment session that owns the item.")
    @query sessionId?: YukCSCA.uuid,
    @doc("Required when contextType is ITEM. Must equal contextId and belong to sessionId.")
    @query itemId?: YukCSCA.uuid,
  ):
    | AgentAvailabilityResponse
    | AgentValidationResponse
    | AgentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Starts or returns the student-private conversation for one authorised host context. Idempotent on (account, contextType, contextId): 201 when created, 200 when the conversation already exists (including its bounded turns). Formal mock and the agent kill switch fail closed before any provider call. Unauthorised or unknown context is 404. ITEM requires sessionId and itemId that match each other and the session; a mismatch is 409 CONTEXT_CONFLICT. Parents and non-students receive 403. No conversation list in this slice.")
  @post
  @route("/conversations")
  @useAuth(BearerAuth)
  startConversation(@body request: AgentConversationStart):
    | AgentConversationResponse
    | AgentConversationCreatedResponse
    | AgentValidationResponse
    | AgentDisabledResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | AgentConflictResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Returns one owner conversation and its bounded turns (newest-last, max 20), including COMPLETED, FAILED, and short-lived PENDING turns. Other-account or unknown ids are 404. This read does not call the provider and is not blocked by the kill switch or formal-mock lock; Ask remains denied on startConversation and askTurn.")
  @get
  @route("/conversations/{conversationId}")
  @useAuth(BearerAuth)
  getConversation(@path conversationId: YukCSCA.uuid):
    | AgentConversationResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.InternalServerErrorResponse;

  @doc("Appends one schema-validated text answer to an owner conversation. Context is inherited and cannot be overridden. Idempotency-Key is required: replay within 24 hours of a COMPLETED turn returns that turn without a second provider call; a second concurrent Ask with a different key returns 409 CONCURRENT_TURN_PENDING. Every turn re-reads item lock state. OPEN scored-item Ask is allowed and is not ITEM_NOT_LOCKED. Insufficiency is 201 with kind INSUFFICIENT_EVIDENCE. Provider, timeout, or schema exhaustion stores FAILED and returns 503 AGENT_PROVIDER_UNAVAILABLE, not an insufficiency kind. Daily/turn budget exhaustion is 429 AGENT_BUDGET_EXCEEDED with Retry-After.")
  @post
  @route("/conversations/{conversationId}/turns")
  @useAuth(BearerAuth)
  askTurn(
    @path conversationId: YukCSCA.uuid,
    @header("Idempotency-Key") idempotencyKey: YukCSCA.uuid,
    @body request: AgentTurnRequest,
  ):
    | AgentTurnCreatedResponse
    | AgentValidationResponse
    | AgentDisabledResponse
    | YukCSCA.FormalAssistanceDisabledResponse
    | AgentConflictResponse
    | AgentBudgetExceededResponse
    | AgentProviderUnavailableResponse
    | YukCSCA.ServiceUnavailableResponse
    | YukCSCA.UnauthorizedResponse
    | YukCSCA.ForbiddenResponse
    | YukCSCA.NotFoundResponse
    | YukCSCA.BadRequestResponse
    | YukCSCA.InternalServerErrorResponse;
}
