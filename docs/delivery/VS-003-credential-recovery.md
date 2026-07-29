# VS-003 — Credential recovery

## Metadata

| Field                        | Value                                                                      |
| ---------------------------- | -------------------------------------------------------------------------- |
| Status                       | `CONTRACT_READY`                                                           |
| Human gate                   | `APPROVED`                                                                 |
| Plan revision                | 5                                                                          |
| Updated                      | 2026-07-29                                                                 |
| Primary actor                | User with a verified email credential account                              |
| Story IDs                    | `US-AUTH-04`                                                               |
| Requirement sections         | English: 1.1; Chinese: 1.1                                                 |
| Depends on                   | `VS-002`                                                                   |
| Related ADRs                 | None                                                                       |
| TypeSpec source              | `contracts/auth.tsp`                                                       |
| API operations               | `requestPasswordRecovery`, `completePasswordRecovery`                      |
| Backend/slice owner          | Backend vertical-slice worker                                              |
| Frontend owner               | Assigned frontend worker                                                   |
| Initial contract checkpoint  | `VS-003-R3-initial` — TypeSpec `0729b08b40d9221e6312926b1fc5411a76912fe7`  |
| Accepted contract checkpoint | `VS-003-R4-accepted` — TypeSpec `0729b08b40d9221e6312926b1fc5411a76912fe7` |

## User-observable outcome

A user who has forgotten a credential password can request the same safe
response whether or not an account exists, use a valid single-use email link to
set a conforming new password, and then sign in with that new password.

## Why this slice is the current boundary

Recovery request, mailbox proof, password replacement, and the return to sign-in
form one closed account-access outcome. Request-only delivery would leave the
actor unable to regain access, while authenticated password changes, account
method linking, mobile-number recovery, support overrides, MFA, and a
user-facing session manager each introduce a separate authorization or provider
boundary.

## Capability and adjacent contract horizon

- Owning capability or lifecycle: credential-account access recovery.
- Closely related stories inspected but not accepted into this slice:
  `US-AUTH-01`–`03` for existing Google, session, and credential behavior;
  account deletion and contact reverification remain separately valuable
  lifecycle changes.
- Relevant actors, states, transitions, and invariants included now: anonymous
  recovery request; eligible verified credential account; pending,
  superseded, expired, and consumed recovery claims; queued/sent/terminal email
  delivery; atomic password replacement; explicit session-security consequence;
  return to existing credential sign-in.
- Deferred transitions and why they remain independently valuable:
  authenticated password change/addition, provider linking, mobile-number
  recovery, support override, MFA recovery, and session management require
  different proof, authorization, or provider behavior.
- Compatibility/additive-evolution strategy for deferred work: add later
  purpose-specific operations; do not add optional actor, provider, or
  destination fields to this slice.
- Why a smaller or larger boundary would be worse: a smaller boundary cannot
  restore account access; a larger boundary would mix anonymous mailbox proof
  with authenticated account-security or unselected provider behavior.

## In scope

- Anonymous, syntactically validated email recovery requests with a generic
  `202 Accepted` response.
- An email only when the canonical email belongs to an eligible verified
  credential account.
- A bounded-lifetime, purpose-bound, single-use recovery token whose plaintext
  is never stored.
- Cooldown, per-IP and per-identifier limits, resend supersession, bounded SMTP
  retry, retention cleanup, and generic failures.
- Password replacement through the existing normalization, blocklist, and
  versioned Argon2id policy.
- Revocation of every active refresh session after successful reset; existing
  access JWTs expire naturally within their 15-minute lifetime.
- Privacy-safe security events and focused PostgreSQL/SMTP/HTTP tests.
- Backend-owned current-state documentation after implementation.

## Out of scope

- Mobile-number recovery.
- Recovery to an unverified or newly supplied destination.
- Customer-service override, security questions, backup codes, or MFA.
- Authenticated password addition/change or Google/credential linking.
- Automatic login, access-token issuance, or refresh-cookie issuance after
  reset.
- User-facing session listing or selective device revocation.
- Frontend implementation, visual design, and localization work owned by the
  frontend worker.
- New mail provider, broker, cache, microservice, or shared rate-limit store.

## Preconditions and dependencies

- Existing implemented state: `VS-002` is `DONE`; verified credential accounts,
  Argon2id password hashes, canonical-email locking, SMTP/Mailpit, a PostgreSQL
  outbox, rate limits, security events, rotating hashed refresh sessions, and
  credential sign-in are implemented.
- Required data/content/provider setup: credential auth and SMTP remain
  deployment-configured; production uses a verified sender/domain, approved
  secrets, and an HTTPS web origin. Local evidence uses Mailpit and non-personal
  addresses.
- Feature flags or safe fallback: recovery remains unavailable when credential
  auth, its signing configuration, mail sender, or safe web origin is absent.
  Existing Google and credential sign-in remain available.

## Technology and dependency impact

- Existing stack sufficient, with evidence: Spring Mail, PostgreSQL/Flyway,
  JPA, the VS-002 HMAC/digest token pattern, Argon2id password service,
  scheduled outbox delivery, rate-limit filters, and Testcontainers already
  implement every required mechanism.
- New or replaced technology and exact first use: none.
- Alternatives considered, including no new dependency: extend the existing
  identity module with purpose-specific recovery state and reuse current ports
  and policies. A broker, Redis, workflow engine, or external token library
  would add operating cost without a measured need.
- Security, privacy, bundle/runtime, build/deploy, operating, and licensing
  impact: one append-only migration and recovery configuration; no new runtime,
  service, client bundle, or license.
- Migration, compatibility, rollback, removal, and owner: additive recovery
  tables/configuration owned by identity; disable recovery requests through
  configuration while preserving sign-in. Applied Flyway migrations are not
  rolled back.
- ADR: `Not required — the existing modular-monolith and SMTP-outbox
architecture is sufficient and no hard-to-reverse technology choice is
introduced.`

## User flow

1. The user opens recovery from credential sign-in and submits an email.
2. The API always returns the same accepted response for any syntactically valid
   email; only an eligible credential account receives a message.
3. The user opens the link; the browser removes the raw token from the visible
   URL after initialization.
4. The user enters and confirms a password that meets the existing credential
   policy.
5. The API atomically consumes the claim, replaces the password hash, and
   applies the accepted session-security consequence.
6. The user returns to sign-in; the old password fails and the new password
   establishes the normal VS-002 session.

## Acceptance and implementation matrix

| AC ID | Given / When / Then                                                                                                                                                              | UI evidence                                                            | API/domain behavior                                                                       | Persistence/audit                                                                                           | Test evidence                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| AC-01 | Given any syntactically valid email, when recovery is requested, then the same safe acknowledgement is returned without disclosing account existence.                            | Same pending/success copy and timing-independent client branch.        | `202` for unknown, Google-only, and credential identities; no account-state field.        | Only an eligible credential account creates claim/outbox state; generic request event has no account ID.    | HTTP integration cases for eligible, unknown, and Google-only emails. |
| AC-02 | Given an eligible verified credential account, when recovery is requested, then one bounded-lifetime single-use credential is delivered without plaintext storage.               | Message guidance and resend/cooldown state.                            | Purpose-bound token and generic request response.                                         | Digest-only pending claim plus durable outbox; raw token reconstructed only for delivery.                   | PostgreSQL lifecycle test and Mailpit receipt test.                   |
| AC-03 | Given an invalid, expired, superseded, used, or mismatched credential, when reset is attempted, then the password is unchanged and a safe restart path is available.             | Generic invalid-link state with request-again action.                  | Stable generic recovery error; no account detail.                                         | Rejected event without private token/email; no authenticator mutation.                                      | Token tamper, expiry, replay, supersession, and mismatch tests.       |
| AC-04 | Given a valid recovery credential and conforming password, when reset succeeds, then the claim is consumed atomically, the old password fails, and the new password can sign in. | Success routes to normal credential sign-in; no auto-login claim.      | Password policy reused; no access token or refresh cookie returned by reset.              | New versioned Argon2id hash, consumed time, success event, and `D-01` session effect share the transaction. | Reset success plus old/new login integration test.                    |
| AC-05 | Given repeated request or completion attempts, when limits are exceeded, then work is bounded without exposing account existence or sensitive values.                            | Generic retry guidance and `Retry-After`; no identifier-specific copy. | Existing IP limit plus digest-keyed identifier/token limits.                              | No durable raw IP, email, password, or token.                                                               | Request and completion rate-limit tests.                              |
| AC-06 | Given delivery failure, concurrency, or stale state, when processing continues or retries, then no duplicate usable claim, password race, or misleading completion occurs.       | Generic acknowledgement; stale link can restart recovery.              | Canonical/account serialization, bounded retry, and one terminal claim transition.        | At most one pending claim per account; one outbox row per claim; safe terminal category.                    | Concurrent request/completion and provider failure tests.             |
| AC-07 | Given a successful reset and existing sessions, when session security is applied, then behavior matches approved `D-01`.                                                         | Existing clients observe the documented sign-in requirement.           | Session effect is atomic with password replacement as far as the selected policy permits. | Revocation/security evidence contains account ID and time only.                                             | Session-policy integration test after `D-01`.                         |

## Documentation sufficiency review

| Review area                                                   | Evidence inspected                                                                     | Status  | Gap or decision ID                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| End-to-end actor flow and adjacent handoffs                   | EN/CN 1.1; `US-AUTH-01`–`04`; VS-002 sign-in flow                                      | `CLEAR` | —                                                                                                                |
| Experience flow, screen states, recovery, and navigation      | `US-AUTH-04`; `/forgot-password`; current production login and PX-002 recovery preview | `CLEAR` | Frontend owner must finalize production screen plan.                                                             |
| Requirement/story coverage and exclusions                     | EN/CN 1.1; `USER_STORIES.md` 0.2.6; `COVERAGE.md`                                      | `CLEAR` | Email is the selected verified destination; mobile recovery remains deferred.                                    |
| Domain terms, states, invariants, and ownership               | `GLOSSARY.md`; identity entities/stores; V4 migration                                  | `CLEAR` | Recovery remains identity-owned and does not create an account/session.                                          |
| Authorization, privacy, minors, consent, and retention        | `docs/SECURITY.md`; anonymous credential controls; target-user minor boundary          | `CLEAR` | No new profile, age, guardian, or relationship data.                                                             |
| Failure, retry, idempotency, stale state, and recovery        | `US-AUTH-04`; VS-002 claim/outbox/rate-limit behavior                                  | `CLEAR` | `D-01` approved: revoke all active refresh sessions; short-lived access JWTs expire naturally.                   |
| Contract, migration, external side effects, and compatibility | `contracts/auth.tsp`; V1–V4 migrations; SMTP/outbox/session code                       | `CLEAR` | `D-01` resolved without a denylist or request-time account lookup for access JWTs.                               |
| Technology/dependency need, alternatives, and ADR threshold   | Architecture/dependency policy; existing credential implementation                     | `CLEAR` | Existing stack is sufficient; no ADR or dependency.                                                              |
| Frontend ownership, prototype promotion, and design impact    | Route manifest; production auth feature; PX-002 `ForgotPasswordPage`                   | `CLEAR` | Frontend owner must replace the production route's prototype component and preserve unrelated preview consumers. |
| Acceptance evidence and observability                         | Existing credential HTTP, Mailpit, security-event, and session tests                   | `CLEAR` | AC-07 proves all refresh sessions revoked and current access JWT expiry bounded by 15 minutes.                   |

## Human decision gate

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| Gate status       | `APPROVED`                                                                |
| Decision owner    | Product owner                                                             |
| Approval scope    | `D-01` only: session-security consequence after successful password reset |
| Approval evidence | Product-owner chat approval, 2026-07-29                                   |

| ID     | Blocking question and scenario                                                                                                                                                                                                                                                             | Agent recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                               | Owner         | Status     | Resolution and artifacts updated                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `D-01` | A user resets a password while refresh sessions are active on a lost or potentially compromised device. Should reset revoke all refresh sessions, keep them active, or also introduce immediate access-token invalidation? Existing access JWTs are stateless and expire after 15 minutes. | **Option A:** atomically revoke every active refresh session for the account; existing access JWTs expire naturally within 15 minutes. This blocks durable access from a lost device without adding a token denylist/security-version mechanism. Option B keeps sessions active and weakens recovery security. Option C immediately invalidates access JWTs too but adds request-time account state or a denylist and is disproportionate without a measured need. | Product owner | `APPROVED` | Option A approved in product-owner chat on 2026-07-29. The state model, backend plan, acceptance evidence, and contract boundary record all-refresh-session revocation with natural access-JWT expiry. |

## State model

### Owned states

```text
NONE -> PENDING -> CONSUMED
          |  |
          |  +-> EXPIRED
          +----> SUPERSEDED

QUEUED -> SENT
   |
   +-> TERMINAL_FAILURE
```

### Invariants

- Only a verified account with a credential authenticator is eligible.
- The public request response never reveals eligibility or delivery.
- At most one pending recovery claim exists per credential account.
- Token plaintext, password plaintext, and message bodies are never persisted
  or logged.
- A claim is purpose-bound, expiring, single-use, and cannot authenticate.
- Password replacement and claim consumption are atomic.
- Recovery completion issues no account, role, access token, refresh token, or
  session.

### Concurrency, retry, and stale-state rules

- Idempotency boundary: every syntactically valid request receives the same
  acknowledgement; within cooldown it performs no new eligible-account side
  effect, and after cooldown a new claim supersedes the prior pending claim.
- Optimistic/stale update behavior: claim and authenticator are selected for
  update; only one concurrent completion can consume the claim and replace the
  hash.
- Duplicate event/callback behavior: duplicate SMTP dispatch is bounded by one
  outbox record and locked status transition; duplicate completion returns the
  same generic invalid-recovery failure without another password mutation.

## TypeSpec contract plan

`D-01` is resolved. TypeSpec must compile and be reviewed before implementation
begins.

### Operations

| Operation                  | Method and route                                 | Auth      | Success          | Required failures   |
| -------------------------- | ------------------------------------------------ | --------- | ---------------- | ------------------- |
| `requestPasswordRecovery`  | `POST /api/v1/auth/password-recovery-requests`   | Anonymous | `202 Accepted`   | `400`, `429`, `500` |
| `completePasswordRecovery` | `POST /api/v1/auth/password-recoveries/complete` | Anonymous | `204 No Content` | `400`, `429`, `500` |

### Models and validation

| Model                             | Important fields    | Validation/nullability                          | Ownership                    |
| --------------------------------- | ------------------- | ----------------------------------------------- | ---------------------------- |
| `PasswordRecoveryRequest`         | `email`             | required email, max 320                         | Identity request boundary    |
| `CompletePasswordRecoveryRequest` | `token`, `password` | token 32–512; password 15–128; neither nullable | Identity completion boundary |

### Contract decisions

- Cookie/token behavior: reset sets no cookie and returns no access/refresh
  token; the recovery credential appears only in the email/browser fragment
  before client-side removal.
- Error codes and problem details: request validation and throttling use shared
  problem responses; invalid/expired/used recovery credentials share one safe
  `RECOVERY_INVALID` response; password rejection uses the existing
  `PASSWORD_POLICY_REJECTED`; internal failures disclose no account state.
- Pagination/filtering if applicable: not applicable.
- Compatibility or migration impact: two additive operations; existing Google,
  credential registration/login, refresh, logout, and current-user operations
  are unchanged.

## Contract collaboration

### Readiness reviews

| Review                                                     | Owner               | Status     | Evidence                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice drafted and human gate resolved                      | Backend/slice owner | `COMPLETE` | Revision 2 records approved `D-01` Option A.                                                                                                                                                                    |
| Initial TypeSpec compiles and generated output is reviewed | Backend/slice owner | `COMPLETE` | `VS-003-R3-initial`; build/generation and generated-shape review passed.                                                                                                                                        |
| Frontend consumer review                                   | Frontend owner      | `COMPLETE` | Revision 4 completed consumer review of `VS-003-R3-initial` against `/forgot-password`, `/reset-password`, screen states, and `DESIGN.md`. Zero `CR-NN` contract requests required.                             |
| Contract requests resolved                                 | Backend/slice owner | `COMPLETE` | Zero contract change requests recorded; `requestPasswordRecovery` and `completePasswordRecovery` operations satisfy all frontend requirements.                                                                  |
| Accepted contract checkpoint recorded                      | Backend/slice owner | `COMPLETE` | `VS-003-R4-accepted` established matching TypeSpec `0729b08b40d9221e6312926b1fc5411a76912fe7`, OpenAPI `51f8be67d048384da19bdfb79eeb078fd6362cd2`, web declarations `486429c5499d0fe66be31a3d3cc42c0136f5d82e`. |

### Contract change requests

| ID  | Consumer scenario or constraint | Proposed change | Backend decision and reason | Human decision ID | Status | Applied/review evidence |
| --- | ------------------------------- | --------------- | --------------------------- | ----------------- | ------ | ----------------------- |
| —   | No requests recorded.           | —               | —                           | —                 | —      | —                       |

## Backend plan

- Module and package ownership: extend existing `identity`
  `api/application/domain/infrastructure` packages; do not create a new module.
- Application use cases and transaction boundaries: one recovery-request
  transaction creates/supersedes eligible claim/outbox state; one completion
  transaction validates and consumes the locked claim, replaces the password
  hash, revokes all active refresh sessions, and records the success event.
- Domain rules: generic request acknowledgement, eligible credential account
  only, one pending claim, digest-only single-use token, existing password
  policy, no auto-login.
- Ports/adapters: reuse password hashing/policy, account/authenticator stores,
  SMTP sender configuration, security events, and rate limiting; add only the
  purpose-specific recovery claim/outbox persistence and delivery code required
  by the first use case.
- Flyway migration: append V5 with recovery claim and recovery outbox tables,
  active-claim, dispatch, and retention indexes; do not change V1–V4.
- Scheduled/async behavior, if any: bounded recovery-email outbox dispatch and
  cleanup using the existing scheduler and retry conventions.

## Frontend plan

- Existing routes, layouts, components, and styles affected:
  `/forgot-password`, credential login's recovery link (`AccountEntryPage`), and a new completion route `/reset-password` (`ResetPasswordPage`); existing credential form primitives (`.credential-page`, `.credential-card`), input styles, and alert roles (`.credential-alert`) are reused.
- Route/navigation entry, exit, and adjacent handoffs: enter from production credential sign-in (`/login`); request acknowledgement stays on `/forgot-password`; email link opens `/reset-password?token=...`; successful reset displays confirmation notice and offers direct handoff to `/login`.
- Production feature folder and shared-boundary ownership: production recovery components (`ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`) belong under `features/auth`; `app` owns route composition in `routeManifest` and `App.tsx`.
- Prototype code classified for reuse, rewrite, or deletion: `prototype/consumer/credential-auth/ForgotPasswordPage.tsx` informed copy and design tokens. Production route is promoted to `features/auth`. The prototype file is preserved only for explicit remaining PX consumers and will not be imported by production routes.
- Contract-backed mock or real API boundary: real fetch calls via `authApi.ts` (`requestPasswordRecovery`, `completePasswordRecovery`); local DEV fallback under `import.meta.env.DEV` for offline development when backend returns 404/401.
- Forms, client state, and validation authority: email request form validates format (`EMAIL_RE`) client-side before sending `PasswordRecoveryRequest`; reset form validates token presence, password length/requirements, and confirmation match client-side before sending `CompletePasswordRecoveryRequest`. Server remains authority for token validity (`RECOVERY_INVALID`) and password policy (`PASSWORD_POLICY_REJECTED`).
- Sensitive token handling: upon mounting `/reset-password`, the plaintext recovery token is extracted from `location.search` or `location.hash`, preserved in component state, and immediately removed from the visible browser URL and history via `window.history.replaceState({}, '', '/reset-password')`.
- Loading, empty, error, retry, and stale states:
  - Request form: initial empty, dirty/validated, submitting (disabled button), generic accepted 202 notice ("If an eligible account exists..."), 429 rate-limited notice with `Retry-After` hint.
  - Reset form: missing/invalid token notice (`RECOVERY_INVALID`) with "Request new link" action to `/forgot-password`, dirty/validated password inputs, submitting, 400 password policy error banner, 429 rate-limited notice, success notice with link to `/login`.
- Mobile, keyboard, screen-reader, localization, and low-bandwidth behavior: all user-visible text localized in Indonesian (`id`), English (`en`), and Simplified Chinese (`zh-CN`); touch targets >= 44px; semantic HTML (`<form>`, `<label>`, `<input>`, `<button>`, `role="status"`, `role="alert"`); live error feedback with `aria-describedby` and `aria-invalid`; no decorative animation dependency.

## Experience and interaction plan

- Existing design roles sufficient, with evidence: production credential forms already use shared page/card (`.credential-page`, `.credential-card`), field (`.credential-field`), alert (`.credential-alert`), and action (`.btn-primary`, `.credential-alt-action`) roles.
- `DESIGN.md` token/component/motion changes required before CSS: none required; existing design tokens in `DESIGN.md` and `index.css` cover all card, form, input, button, and alert surfaces.
- Shared primitive versus feature-owned styling: reuse shared form/button/alert roles; recovery layout and token-clearing transitions remain feature-owned.
- User goal and entry context: regain access to verified credential account from sign-in page.
- Exit state and next handoff: explicit password reset success acknowledgement with direct navigation link to `/login`. No auto-login or access token issuance after reset.
- One primary action and secondary actions:
  - Request screen: "Send Recovery Link" (primary), "Back to Sign In" (secondary).
  - Reset screen: "Reset Password" (primary), "Request a new recovery link" or "Back to Sign In" (secondary).
- Dominant surface/pastel semantic role: white credential surface (`var(--color-surface)`) with restrained contextual status treatments (`.credential-alert-info`, `.credential-alert-error`, `.credential-alert-warning`).
- State transition and acknowledgement behavior: generic request confirmation disclosure (prevents account enumeration); explicit reset success notice; immediate token removal from URL history.
- Purposeful micro-interactions or animation: subtle submit loading spinner/disabled state; no perpetual background animations.
- Reduced-motion behavior: all state transitions are instant and clear without relying on CSS keyframe animations.
- Prototype-only assumptions, if any: none; production recovery uses real generated OpenAPI client types and contracts.
- Mobile/desktop and Indonesian/English/Chinese visual-review evidence: owned by frontend handoff and required before `DONE`.

## Authorization, privacy, and safety

- Actor authorization: anonymous request/completion; authorization derives only
  from possession of a valid single-use recovery credential delivered to the
  already verified account email.
- Field-level/minimum-data response: request returns no account or delivery
  status; completion returns no user/session data.
- Minor/guardian consequence: no age, role, guardian, profile, or relationship
  data is collected or inferred. Account recovery does not change consent or
  role state.
- Audit/security events: generic request/delivery/rejection categories; account
  ID only after safe eligible-account attribution or successful proof; no email,
  IP, token, password, message body, or hash.
- Sensitive logging restrictions: request/response DTOs redact secrets and
  identifiers from string rendering; framework/provider errors cannot render
  submitted values.

## Observability

| Event/metric                        | Trigger                             | Allowed properties                 | Prohibited content                         |
| ----------------------------------- | ----------------------------------- | ---------------------------------- | ------------------------------------------ |
| `PASSWORD_RECOVERY_REQUESTED`       | Valid request accepted              | event type, time                   | email, IP, eligibility, account ID         |
| `PASSWORD_RECOVERY_DELIVERY_SENT`   | Outbox send succeeds                | event type, time                   | recipient, link, token, message            |
| `PASSWORD_RECOVERY_DELIVERY_FAILED` | Retry/terminal delivery failure     | event type, time, bounded category | recipient, provider payload, token         |
| `PASSWORD_RECOVERY_REJECTED`        | Completion proof or policy rejected | event type, time                   | token, password, email, account ID         |
| `PASSWORD_RECOVERY_SUCCEEDED`       | Password replaced                   | event type, time, account ID       | password/hash, email, token, session token |

## Test plan

### Contract and backend

- TypeSpec build, generation, generated reproducibility, and shared auth
  regression check.
- Focused unit tests for purpose binding/tamper, password-policy reuse, claim
  expiry/supersession, and recovery rate limits.
- PostgreSQL HTTP integration tests for non-enumeration, eligible delivery
  state, invalid/expired/replayed token, atomic reset, old/new login,
  concurrency, provider failure, cleanup, and the accepted session policy.
- Mailpit receipt test using a non-personal address.
- Sensitive DTO/logging regression.

### Frontend component/integration

- Owned by frontend worker after contract review: generic acknowledgement,
  token removal, password validation, invalid/expired restart, rate-limit retry,
  success-to-login, localization, and keyboard/accessibility checks.

### End-to-end/manual evidence

- Production-built request → Mailpit link → reset → old-password rejection →
  new-password sign-in.
- Session behavior from `D-01`, including another device's refresh attempt.
- Unknown/Google-only email non-enumeration, replay, supersession, and SMTP
  outage/retry.

## Implementation sequence

1. **Completed 2026-07-29:** draft revision 1, inspect the adjacent credential
   and session horizon, and open `D-01`.
2. **Completed 2026-07-29:** resolve `D-01` as Option A, record
   all-refresh-session revocation with natural 15-minute access-JWT expiry, and
   return the slice to `SHAPING`.
3. **Completed 2026-07-29:** initialize the two TypeSpec operations,
   compile/regenerate twice, inspect the generated boundary, and record
   `VS-003-R3-initial`.
4. **Completed 2026-07-29:** obtain frontend consumer review, confirm zero
   `CR-NN` requests, record `VS-003-R4-accepted`, and move to
   `CONTRACT_READY`.
5. **Not started — awaiting explicit product-owner worktree assignment:** add
   V5 recovery persistence, purpose-specific token/claim/outbox behavior,
   application transactions, HTTP transport, configuration, security events,
   cleanup, and focused backend tests.
6. Frontend owner promotes production recovery from the prototype boundary and
   records component/visual/accessibility evidence.
7. Integrate the real request/mail/reset/login/session flow and record exact
   focused evidence.
8. Update current-state architecture, security, development, plan, and this
   slice only after the corresponding behavior exists.

## Definition of done

- [ ] Requirement/story references remain correct.
- [x] Documentation sufficiency review is complete and `D-01` is resolved.
- [x] Human gate is `APPROVED` for the recorded scope.
- [ ] Scope and exclusions match the delivered recovery flow.
- [x] Existing stack is sufficient; no new dependency or ADR is required.
- [x] TypeSpec compiles and generated artifacts match the accepted contract.
- [x] Initial and accepted checkpoints plus frontend consumer review are recorded with no open `CR-NN`.
- [ ] Backend, frontend, migration, and tests implement the same states and errors.
- [ ] Request, delivery, reset, old-password rejection, new-password sign-in, and the selected session consequence have named evidence.
- [ ] Unknown, Google-only, invalid, expired, replayed, superseded, throttled, concurrent, provider-failure, and stale cases do not leak account state or secret values.
- [ ] Password/token values are absent from persistence, logs, URLs after initialization, retained screenshots, video, and traces.
- [ ] Authorization, privacy, minor safety, retention, and security events were reviewed.
- [ ] Production recovery lives in `features/auth`; prototype-only behavior remains isolated or is deleted.
- [ ] Mobile, keyboard, screen-reader, localization, low-bandwidth, and reduced-motion evidence is recorded.
- [ ] `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DEVELOPMENT.md`, `docs/PLAN.md`, and this slice reflect implemented current state.
- [ ] Exact verification commands and results are recorded.

## Verification evidence

| Evidence                     | Result                                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Documentation sufficiency    | Revision 2 complete; `D-01` resolves the only material gap.                                                                                                                                                                                      |
| Human decision gate          | `APPROVED`; Option A revokes all active refresh sessions while existing access JWTs expire naturally within 15 minutes.                                                                                                                          |
| Adjacent-contract horizon    | Reviewed `US-AUTH-01`–`04`, VS-002 credential state, session rotation/replay/logout, current TypeSpec, recovery preview route, and future account-security boundaries.                                                                           |
| Technology/ADR review        | Existing stack sufficient; no new dependency or ADR.                                                                                                                                                                                             |
| Contract build               | Pinned Node 24/pnpm 11.14.0 ran `pnpm contract:build` twice; TypeSpec 1.14.0 passed.                                                                                                                                                             |
| Initial contract checkpoint  | `VS-003-R3-initial`: TypeSpec `0729b08b40d9221e6312926b1fc5411a76912fe7`; OpenAPI `51f8be67d048384da19bdfb79eeb078fd6362cd2`; web declarations `486429c5499d0fe66be31a3d3cc42c0136f5d82e`.                                                       |
| Frontend contract review     | `COMPLETE`: Reviewed `VS-003-R3-initial` generated declarations (`openapi.ts`) against proposed `ForgotPasswordForm` and `ResetPasswordForm`, routes, states, and `DESIGN.md`. Established `VS-003-R4-accepted`. Zero `CR-NN` requests required. |
| Accepted contract checkpoint | `VS-003-R4-accepted`: TypeSpec `0729b08b40d9221e6312926b1fc5411a76912fe7`; OpenAPI `51f8be67d048384da19bdfb79eeb078fd6362cd2`; web declarations `486429c5499d0fe66be31a3d3cc42c0136f5d82e`.                                                      |
| Generated reproducibility    | Second contract build and web generation retained all three initial-checkpoint hashes.                                                                                                                                                           |
| Frontend type compatibility  | Pinned pnpm ran `pnpm typecheck:web`; TypeScript project build passed against the generated recovery operations.                                                                                                                                 |
| Backend tests                | Not run — implementation is intentionally unstarted pending explicit product-owner worktree assignment.                                                                                                                                          |
| Frontend tests               | Not run — frontend implementation follows after backend marks `CONTRACT_READY`.                                                                                                                                                                  |
| End-to-end/manual flow       | Not run.                                                                                                                                                                                                                                         |

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                                                                                                      |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5        | 2026-07-29 | Backend owner verified the completed frontend consumer review, confirmed zero open `CR-NN` requests and unchanged accepted hashes, moved the slice to `CONTRACT_READY`, and recorded that implementation remains unstarted pending explicit product-owner worktree assignment.                                              |
| 4        | 2026-07-29 | Completed frontend consumer review of VS-003 initial contract (`VS-003-R3-initial`), verified screen states and user flows against `DESIGN.md` and generated declarations, confirmed zero `CR-NN` requests, established accepted contract checkpoint `VS-003-R4-accepted`, and completed frontend/experience plan sections. |
| 3        | 2026-07-29 | Initialized and compiled the two additive password-recovery operations, regenerated and reviewed OpenAPI/web declarations reproducibly, recorded `VS-003-R3-initial`, and opened the required frontend consumer-review checkpoint without starting implementation.                                                          |
| 2        | 2026-07-29 | Recorded product-owner approval of `D-01` Option A: successful password reset atomically revokes all active refresh sessions, while existing stateless access JWTs expire naturally within 15 minutes; returned the slice to `SHAPING`.                                                                                     |
| 1        | 2026-07-29 | Created the VS-003 shaping brief, bounded recovery to verified email credential accounts, reused the existing identity/password/SMTP architecture, completed the adjacent and documentation reviews, and opened `D-01` for the session-security consequence before TypeSpec or implementation.                              |
