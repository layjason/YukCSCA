# VS-002 — Register, verify, and sign in with email credentials

## Metadata

| Field                        | Value                                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status                       | `DONE`                                                                                                                                                                              |
| Human gate                   | `APPROVED`                                                                                                                                                                          |
| Plan revision                | 10                                                                                                                                                                                  |
| Updated                      | 2026-07-29                                                                                                                                                                          |
| Primary actor                | New or returning user                                                                                                                                                               |
| Story IDs                    | `US-AUTH-03`                                                                                                                                                                        |
| Requirement sections         | English: 1.1 Registration and Login; II.3 Security and Access Control; II.4 Privacy and Protection of Minors; Chinese: 1.1 注册与登录；二.3 安全与权限；二.4 隐私与未成年人保护     |
| Depends on                   | `VS-000`; approved credential decisions below; production Terms/Privacy artifacts; configured email sender and verified sender domain                                               |
| Related ADRs                 | None — `D-01`–`D-04` are slice-local domain/security/compatibility decisions and no ADR threshold is met                                                                            |
| TypeSpec source              | `contracts/auth.tsp`; shared responses from `contracts/common.tsp`                                                                                                                  |
| API operations               | `startCredentialRegistration`, `resendCredentialVerification`, `completeCredentialVerification`, `credentialLogin`                                                                  |
| Backend/slice owner          | Backend vertical-slice worker; `identity` module                                                                                                                                    |
| Frontend owner               | Frontend vertical-slice worker; production account-entry flow under `features/auth`                                                                                                 |
| Initial contract checkpoint  | `VS-002-R6-initial`: TypeSpec `49edcc34367540e8e4b346b2ba6f6f84e7a23560`; OpenAPI `af084817337a8fa223f28de26b30e3f00690ab96`; web types `90dd8862696a4b92d0802450755c892e08dd188a`  |
| Accepted contract checkpoint | `VS-002-R6-accepted`: TypeSpec `49edcc34367540e8e4b346b2ba6f6f84e7a23560`; OpenAPI `af084817337a8fa223f28de26b30e3f00690ab96`; web types `90dd8862696a4b92d0802450755c892e08dd188a` |

## User-observable outcome

A user can receive and complete a real email verification, establish one
password credential for that verified address, sign in through the existing
secure session lifecycle, and continue as an authenticated `UNASSIGNED`
YukCSCA identity without receiving a product role automatically.

## Why this slice is the current boundary

Registration, mailbox verification, and the first credential sign-in are one
closed loop. Registration alone leaves no usable identity, while verification
without sign-in does not prove that the new authenticator works. Keeping all
three transitions together also lets the slice prove password storage,
verification-token consumption, abuse controls, session issuance, and the
Google/credential collision boundary coherently.

`VS-000` already owns access tokens, rotating refresh sessions, current-user
state, and logout. `VS-003` remains an independently valuable recovery loop
with a separate non-enumeration and session-revocation threat model. Role
activation, provider linking, multi-factor authentication, and user-facing
session management remain separate outcomes.

## Capability and adjacent contract horizon

- Owning capability or lifecycle: email credential enrollment, mailbox
  verification, and initial password authentication into the existing account
  and session lifecycle.
- Closely related stories inspected but not accepted into this slice:
  `US-AUTH-01` and `US-AUTH-02` retain Google and session ownership;
  `US-AUTH-04`/`VS-003` owns recovery; `US-PROF-01` and later role slices own
  role activation; account linking and MFA have no accepted production slice.
- Relevant actors, states, transitions, and invariants included now: an
  anonymous registrant; an expiring email-verification attempt; one verified
  credential bound to one canonical email/account; a separate password
  sign-in; and an `UNASSIGNED` authenticated identity.
- Deferred transitions and why they remain independently valuable: recovery
  replaces a lost authenticator and must decide reset-time session revocation;
  provider linking merges authentication methods and needs stronger
  reauthentication; role activation creates product permissions and profiles.
- Compatibility/additive-evolution strategy for deferred work: reuse the
  versioned password-hash representation and provider-neutral session service;
  keep verification purpose-specific so `VS-003` can add its own recovery
  challenge and operations without advertising them now; reserve no public
  operation for linking, MFA, or recovery.
- Why a smaller or larger boundary would be worse: a smaller slice cannot
  demonstrate usable verified authentication; a larger slice combines
  independent account-recovery, role, or linking security decisions and would
  delay the first useful credential path.

## In scope

- Production registration for one email credential with server-authoritative
  validation and a modern, versioned password policy.
- A real delivery path from YukCSCA through an SMTP adapter to the user's
  mailbox, plus a local Mailpit inbox for deterministic development and
  end-to-end verification.
- A time-bounded, cryptographically random, hashed-at-rest, purpose-bound,
  single-use verification credential.
- A browser verification route that does not consume a link on page load and
  clears the raw credential from the address bar before any unrelated request.
- Verification completion exactly once, followed by an explicit credential
  sign-in rather than implicit authentication.
- Reuse of the `VS-000` `AuthResponse`, access-token, refresh-cookie,
  rotation/replay, current-user, and logout behavior after successful sign-in.
- One canonical, case-normalized email identity with database-enforced
  concurrency protection.
- Non-enumerating registration/resend/login failures, bounded per-IP and
  per-credential abuse controls, resend cooldown, privacy-safe security events,
  and cleanup of abandoned pending data.
- Production account-entry UI and localized Indonesian, English, and
  Simplified Chinese states for register, check-email, verify, and sign in.

## Out of scope

- Password recovery or reset operations; `VS-003` owns them.
- Provider linking and a second account for an email already owned by another
  provider are excluded by approved `D-02` Option A. Adding a password or
  linking methods after authenticating the existing Google account requires a
  future accepted slice.
- Student, Parent, Tutor, or Admin activation or inferred permissions.
- MFA, passkeys, phone/SMS credentials, disposable-email policy, CAPTCHA, or a
  user-facing session/device manager.
- Replacing the existing access-token or rotating refresh-session design.
- Marketing email, notification preferences, or a generic notification
  platform.
- Treating PX-002 fixture accounts, passwords, verification buttons, reducers,
  or preview sessions as production data or authentication.

## Preconditions and dependencies

- Existing implemented state: `VS-000` provides Google authentication,
  `UNASSIGNED` accounts, access JWTs, hashed rotating refresh sessions,
  current-user inspection, logout, structured problem responses, CORS, and
  per-process endpoint rate limiting.
- Required data/content/provider setup: approved, immutable Terms of Service
  and Privacy Notice identifiers and localized content; an SMTP account,
  verified sender/domain, TLS credentials in the deployment secret manager,
  and an allow-listed public HTTPS web origin for verification links.
- Feature flags or safe fallback: before provider and policy configuration is
  valid, new credential registration and resend remain unavailable while
  Google stays usable. After credential users exist, rollback may stop new
  enrollment/delivery but must retain credential sign-in and the existing
  session lifecycle.

## Technology and dependency impact

Complete this section again after the human gate if a decision changes the
state model.

- Existing stack sufficient, with evidence: the Spring Boot modular monolith,
  Spring Security, PostgreSQL/Flyway, `identity` module, React account routes,
  TypeSpec pipeline, `SessionService`, `AccessTokenService`, shared problem
  responses, and Testcontainers cover the account/session and contract
  boundaries. PostgreSQL can own pending state, uniqueness, delivery attempts,
  and cleanup without a new datastore, cache, broker, or service.
- New or replaced technology and exact first use:
  - `org.springframework.boot:spring-boot-starter-mail:4.1.0` supplies the
    `JavaMailSender` SMTP adapter behind the identity application port;
  - `org.bouncycastle:bcprov-jdk18on:1.84` supplies Spring Security's Argon2id
    implementation for the versioned `{argon2id-v1}` password store;
  - `axllent/mailpit:v1.30.4` is pinned to multi-platform digest
    `sha256:5a49a77c5bdbe7c5474450b4f46348d09949df3695257729c93a30369382d4f6`
    only in local/validation Compose and the focused receipt test;
  - the V4 PostgreSQL migration plus the existing Spring scheduler pattern owns
    bounded delivery retry; no broker was introduced.
- Alternatives considered, including no new dependency:
  - the PX-002 in-memory transition cannot prove receipt or production
    verification and is rejected;
  - raw SMTP handling is rejected in favor of Spring's maintained abstraction;
  - a vendor SDK is deferred because SMTP keeps the application port
    provider-neutral;
  - bcrypt is not selected for a new store when Argon2id is available; PBKDF2
    remains a documented fallback only if a deployment compliance constraint
    requires it;
  - synchronous delivery without durable retry can lose the only message after
    registration commits; a PostgreSQL outbox is the smallest reliable option;
  - Redis, a message broker, and a separate notification service have no first
    measured use.
- Security, privacy, bundle/runtime, build/deploy, operating, and licensing
  impact: Argon2id uses 19 MiB, two iterations, and parallelism one behind both
  per-IP and digest-keyed identifier budgets; SMTP uses 5/3/5-second
  connect/read/write timeouts plus bounded outbox retry; Mailpit is local-only
  and must never relay production mail. Spring Boot is Apache-2.0; Bouncy Castle
  uses its permissive MIT-style license; Mailpit is MIT. Maven dependency
  convergence passed. Production environment requires verified sender domain setup, TLS authentication, email bounce processing, and secret storage. No
  frontend runtime dependency was added.
- Migration, compatibility, rollback, removal, and owner: use one append-only
  Flyway migration owned by `identity`; retain algorithm identifiers so hashes
  can be upgraded on later successful login; leave schema in place on rollback;
  disable only new enrollment/delivery when SMTP is unhealthy; remove Mailpit
  without affecting production; replace the SMTP adapter without changing
  application/domain code.
- ADR: `Not required — the provider port, versioned password encoder, local mail
sink, and PostgreSQL outbox are reversible first-use choices inside the
existing modular monolith. Reassess only if a provider SDK, shared
notification platform, broker, or multi-replica abuse store becomes
necessary.`

Security baselines for the backend-owned policy are:

- NIST SP 800-63B-4 single-factor guidance: minimum 15 Unicode code points,
  maximum at least 64 (this slice plans 128), no composition rules, allow
  password-manager paste/autofill, NFC normalization, and reject whole
  passwords found in a local common/compromised/context blocklist.
- OWASP password storage guidance: Argon2id with at least 19 MiB memory, two
  iterations, and parallelism one, then tune upward while keeping legitimate
  verification within the API budget and resistant to resource exhaustion.
- Email verification guidance: securely random token, hashed at rest,
  time-limited, single-use, fixed allow-listed HTTPS destination, and no
  automatic account activation from a scanner-triggered page load.

References:

- [NIST SP 800-63B-4 password requirements](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Email Validation and Verification Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html)
- [Spring Boot email support](https://docs.spring.io/spring-boot/reference/io/email.html)
- [Mailpit Docker and health-check documentation](https://mailpit.axllent.org/docs/install/docker/)

## User flow

`D-01` Option A establishes the following accepted registration order:

1. The user opens `/register`, chooses email instead of the still-available
   production Google action, enters the canonical email, and submits.
2. YukCSCA returns the same accepted response for a new, pending, or
   already-owned email; when eligible it persists a pending email claim and
   delivery job without creating an account or session.
3. The user receives a YukCSCA verification message and opens its allow-listed
   HTTPS link.
4. The verification page removes the raw token from the visible URL, explains
   the action, and waits for an explicit user completion action so link
   scanners cannot consume it.
5. The user sets and confirms a conforming password, accepts the active
   universal Terms version, and acknowledges the active Privacy Notice version.
   The server consumes the active verification claim. For an unowned email it
   atomically creates the one `UNASSIGNED` credential account with minimum
   policy-version/timestamp evidence; for an email already bound to Google it
   stores no password, policy evidence, credential, or link and leaves that
   account unchanged.
6. YukCSCA issues no session. A newly created credential account is directed
   to `/login`; a valid Google collision is safely directed to Google sign-in.
7. The user signs in with the established method. A credential account receives
   the existing access state and rotating refresh cookie before the root
   decision routes its `UNASSIGNED` identity to role selection. Adding a
   password or linking methods to the Google account requires an authenticated
   future flow outside this slice.

## Acceptance and implementation matrix

| AC ID | Given / When / Then                                                                                                                                                                                                                                                                        | UI evidence                                                                                                                   | API/domain behavior                                                                                                                                      | Persistence/audit                                                                                                              | Test evidence                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| AC-01 | Given an unused valid email, when registration starts, then the user sees the same check-email acknowledgement used for non-eligible addresses and no account, password credential, role, or session is created.                                                                           | Registration ready, submitting, accepted, and offline/retry states.                                                           | Public accepted response; only an expiring email claim and eligible delivery are created.                                                                | At most one eligible pending claim; privacy-safe request event.                                                                | HTTP integration tests for new, duplicate, and malformed input.                            |
| AC-02 | Given an eligible pending claim, when delivery runs, then a real localized verification email reaches the configured inbox with one allow-listed HTTPS link.                                                                                                                               | Check-email state explains latency, spam-folder check, cooldown, and safe resend.                                             | SMTP adapter uses bounded timeouts; provider failure never exposes account state.                                                                        | Durable delivery attempt/retry state without raw token, full URL, or message body in logs.                                     | Adapter tests plus focused Mailpit receipt assertion.                                      |
| AC-03 | Given a pending email claim or an address without a verified credential, when credential sign-in is attempted, then no access/refresh session is issued and a safe verification restart path is available without confirming account state.                                                | Generic sign-in failure with check-email/resend guidance.                                                                     | Fixed enumeration-safe response and comparable password-work path.                                                                                       | Rejection/throttle category only; no secret.                                                                                   | Known, unknown, wrong-password, and pending cases.                                         |
| AC-04 | Given one valid unexpired verification credential for an unowned email and a conforming confirmed password, when the user explicitly completes verification, then the claim is consumed and one `UNASSIGNED` credential account is created atomically.                                     | Verifying, verified, already-used/expired, and restart states.                                                                | Password policy is enforced at completion; no implicit login; replay is safe.                                                                            | One consumed time, one password hash, one credential binding, one account maximum, success event after commit.                 | Concurrent consume, replay, expiry, and policy integration tests.                          |
| AC-05 | Given a verified credential account and valid password, when sign-in succeeds, then the existing `AuthResponse` and secure rotating refresh cookie are issued, the account remains `UNASSIGNED`, and `displayName` is null until role-profile activation.                                  | Signing-in acknowledgement and role-selection handoff; consumers omit the name or use a localized presentation-only fallback. | Reuse access/session/current-user behavior from `VS-000` with nullable `CurrentUser.displayName`; never derive a fallback from email.                    | One refresh session and credential-login success event; no role mutation or persisted fallback name.                           | Credential login plus nullable-name consumer, refresh/replay/logout/`me` regression tests. |
| AC-06 | Given an unknown email, wrong password, malformed request, disabled account state, or non-eligible registration, when a public credential operation runs, then no account existence or secret is disclosed.                                                                                | Same localized safe error/accepted copy where required.                                                                       | Fixed problem codes/details, comparable timing, dummy hash work, and no session.                                                                         | Only bounded reason categories and pseudonymous IDs when an account is already known safely.                                   | Enumeration response/body/timing-envelope assertions.                                      |
| AC-07 | Given duplicate or concurrent registration/resend requests, when processed, then they cannot create accounts or passwords before verification, create duplicate accounts, replace an authenticator unsafely, or send without cooldown/budget.                                              | Cooldown and delayed/retry states preserve the email field.                                                                   | Idempotent/generic public result; pending claims carry no password credential.                                                                           | Canonical-email uniqueness, delivery dedupe, and cleanup timestamps.                                                           | PostgreSQL concurrency and resend tests.                                                   |
| AC-08 | Given an invalid, expired, superseded, already-used, or account-mismatched token, when completion is attempted, then no credential/account state changes and one safe restart path is shown.                                                                                               | One unified invalid/expired state with restart action.                                                                        | Unified safe failure; no token-state oracle beyond the presented flow.                                                                                   | No mutation except bounded failure counters/security category.                                                                 | Token failure matrix.                                                                      |
| AC-09 | Given excessive registration, resend, verification, or sign-in attempts, when limits are exceeded, then processing is temporarily bounded without permanent account lockout or existence disclosure.                                                                                       | Retry time is announced accessibly.                                                                                           | `429` plus `Retry-After`; outer IP and inner canonical-identifier budgets.                                                                               | Expiring counters/attempt state; privacy-safe rate-limit events.                                                               | Clock-controlled per-route/IP/identifier tests.                                            |
| AC-10 | Given a password is created or checked, then the full Unicode value is validated once, blocklisted values are rejected, and only a salted versioned adaptive hash is retained.                                                                                                             | Clear 15–128-character/passphrase guidance; paste/autofill and show/hide work; no composition checklist.                      | NFC normalization before hashing; Argon2id parameters are benchmarked and upgradeable.                                                                   | Hash only; never plaintext, reversible encryption, fast digest, or password hint.                                              | Policy, Unicode, blocklist, hash, rehash, and sensitive logging tests.                     |
| AC-11 | Given role-neutral credential registration, when an eligible account is created, then the active universal Terms version is accepted and the active Privacy Notice version is acknowledged without collecting age or inferring role, minor status, guardian identity, or guardian consent. | Actual localized production policy links, explicit Terms acceptance, and bounded Privacy acknowledgement.                     | Server validates submitted versions against active configuration; missing/stale policy configuration disables enrollment while Google remains available. | Store only account, Terms version, Privacy Notice version, and server timestamp evidence; no policy text or age/guardian data. | Active/stale/missing policy-version, omission, atomicity, and minimum-data tests.          |
| AC-12 | Given a valid verification claim whose canonical email already belongs to Google, when completion is attempted, then the claim is closed, the existing account is unchanged, no password credential/link/session is created, and the user is directed to Google sign-in.                   | Google guidance appears only after a valid claim; registration and resend remain generic.                                     | Return a safe Google-sign-in outcome only after valid token proof; future linking requires an authenticated Google account.                              | Record a privacy-safe collision category without email; persist no submitted password hash or identity mutation.               | Credential-first, Google-first, concurrent collision, and disclosure-boundary tests.       |
| AC-13 | Given a password or raw verification token is entered or received, then it never appears in logs, exception text, events, analytics, URLs after route initialization, browser storage, screenshots, videos, or retained traces.                                                            | Password fields clear after completion/failure as appropriate; screenshots only after unmount/clear.                          | Sensitive DTOs redact `toString`; fixed internal errors; no Host-header link construction.                                                               | Hashes only; raw delivery token exists only in the outbound message and active request memory.                                 | DTO logging, log capture, header/link, and artifact review tests.                          |
| AC-14 | Given SMTP is delayed or unavailable, when registration was accepted, then the pending state remains safe, delivery retries are bounded, and the user can resend after cooldown without duplicate account effects.                                                                         | Honest delayed-delivery/retry guidance; Google remains available.                                                             | Delivery failure is isolated from account authority; no false “verified” state.                                                                          | Outbox attempt count, next-attempt time, terminal category, and cleanup.                                                       | Provider timeout/failure/recovery integration tests.                                       |
| AC-15 | Given mobile, keyboard, reduced-motion, low-bandwidth, Indonesian, English, or Chinese use, when the complete flow runs, then task order, focus, validation, status, recovery, and authority remain understandable.                                                                        | Mobile/desktop screenshots after sensitive fields clear; keyboard and three-locale review.                                    | No extra contract behavior.                                                                                                                              | No personal test data.                                                                                                         | Component accessibility/localization tests and focused browser journey.                    |

## Documentation sufficiency review

| Review area                                                   | Evidence inspected                                                                               | Status  | Gap or decision ID                                                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| End-to-end actor flow and adjacent handoffs                   | Paired 1.1; `US-AUTH-01`–`04`; `VS-000`; `VS-001`; PX-002 promotion notes                        | `CLEAR` | `D-01`–`D-04` resolve registration, collision, policy/minor, and nullable display-name handoffs.                                  |
| Experience flow, screen states, recovery, and navigation      | PX-002 credential pages; route manifest; root decision; `DESIGN.md`; design workflow             | `CLEAR` | Email-first, password-at-completion, post-proof Google guidance, and explicit Terms/Privacy steps are determined.                 |
| Requirement/story coverage and exclusions                     | Paired 1.1 and NFRs; `USER_STORIES.md`; `COVERAGE.md`                                            | `CLEAR` | `D-01`–`D-04` are reflected in `US-AUTH-03` version 0.2.6 and the coverage baseline without changing normative requirements.      |
| Domain terms, states, invariants, and ownership               | `GLOSSARY.md`; V1 schema; identity domain/services; provider collision behavior                  | `CLEAR` | The glossary now distinguishes email claims, account identities, optional display names, and role profiles.                       |
| Authorization, privacy, minors, consent, and retention        | Paired II.3/II.4; 0.3 minor compliance; `SECURITY.md`; preview legal copy                        | `CLEAR` | `D-03` requires minimum version/timestamp evidence, no age/guardian inference, and production policy artifacts before enrollment. |
| Failure, retry, idempotency, stale state, and recovery        | Story acceptance; auth limiter/session tests; OWASP email guidance                               | `CLEAR` | `D-01`/`D-02` fix pending-claim, no-pre-verification-password, collision closure, and authenticated-linking boundaries.           |
| Contract, migration, external side effects, and compatibility | `auth.tsp`; generated shapes; V1–V3 migrations; SMTP/Mailpit review                              | `CLEAR` | `D-01`–`D-04` fix registration, collision, policy evidence, nullable display-name contract, and append-only migration intent.     |
| Technology/dependency need, alternatives, and ADR threshold   | `pom.xml`; Compose; architecture/development rules; Spring/OWASP/NIST/Mailpit docs               | `CLEAR` | First uses and alternatives are recorded; no broker, cache, or provider SDK.                                                      |
| Frontend ownership, prototype promotion, and design impact    | Route manifest; app composition; credential prototype; PX-002 promotion rule; design authorities | `CLEAR` | Production routes must stop importing fixture credential behavior; dependent PX-002 preview journeys stay explicitly isolated.    |
| Acceptance evidence and observability                         | Existing auth tests/events; template; security logging rules; focused test guide                 | `CLEAR` | Required success, collision, abuse, provider failure, privacy, and real-mail evidence are named.                                  |

## Human decision gate

Follow [`HUMAN_REVIEW.md`](HUMAN_REVIEW.md). Ask one question at a time and at
most three per review round. `APPROVED` applies only to the recorded decisions
and approval scope.

| Field             | Value                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Gate status       | `APPROVED`                                                                                        |
| Decision owner    | Product/security owner for `D-01`, `D-02`, and `D-03`; product/architecture owner for `D-04`      |
| Approval scope    | `D-01`–`D-04` as recorded; no product, privacy, state, or compatibility question remains open     |
| Approval evidence | The user approved `D-01`–`D-03` Option A and supplied the `D-04` nullable display-name resolution |

| ID     | Blocking question and scenario                                                                                                                                                                                                                                                                                                           | Agent recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                          | Owner                | Status                | Resolution and artifacts updated                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `D-01` | An attacker starts registration for a victim's email before the mailbox owner. `US-AUTH-03` previously created an unverified account/password on submit, but `user_account.email` is globally unique and current Google login rejects any existing same-email account. At what point are the canonical account and password established? | **Option A:** persist only an expiring email-verification claim; after the mailbox owner opens the link, collect/confirm the password and policy step and atomically create the `UNASSIGNED` account. This aligns the glossary, prevents pre-verification Google blocking, and avoids activating an attacker-chosen password. Option B kept a password hash in a pending registration. Option C created an expiring canonical unverified account immediately. | Product/security     | `RESOLVED — OPTION A` | Approved by the user on 2026-07-28. Applied to revision 2, `US-AUTH-03` 0.2.3, `COVERAGE.md`, `GLOSSARY.md`, and `PLAN.md` 0.4.3.                                       |
| `D-02` | A user explicitly completes a valid credential-verification claim for an email already bound to an existing Google account. Should VS-002 reject/no-op without linking, automatically add the password credential to that account, or permit a second account with the same canonical email?                                             | **Option A:** preserve the existing account, consume/close the claim without creating or linking a credential, and show safe Google sign-in guidance after valid token proof. Option B auto-links based on mailbox proof alone and expands authenticator-linking risk. Option C breaks one-email ownership and creates ambiguous account recovery.                                                                                                            | Product/security     | `RESOLVED — OPTION A` | Approved by the user on 2026-07-28. Applied to revision 3, `US-AUTH-03` 0.2.4, `COVERAGE.md`, and `PLAN.md` 0.4.4; future linking requires authenticated Google access. |
| `D-03` | Registration requires applicable Terms/Privacy acceptance, targets may include minors, and the current three-language legal pages explicitly say they are non-binding preview copy. What does role-neutral credential registration record?                                                                                               | Require approved, versioned universal Terms acceptance plus Privacy Notice acknowledgement without collecting age or inferring guardian consent; keep age-specific guardian handling in the accepted role-activation slice. Production policy content/IDs remain an external readiness dependency.                                                                                                                                                            | Product/security     | `RESOLVED — OPTION A` | Approved by the user on 2026-07-28. Applied to revision 4, `US-AUTH-03` 0.2.5, `COVERAGE.md`, and `PLAN.md` 0.4.5.                                                      |
| `D-04` | Under approved `D-01`, a new credential-only account has no provider-supplied name, while `user_account.display_name` and `CurrentUser.displayName` are currently required. Should display name remain absent until role-profile activation, be collected during verification, or be derived from the email?                             | Make display name nullable until role-profile activation and widen `CurrentUser.displayName` compatibly. Do not collect an unrequired identity field or derive a potentially identifying/misleading placeholder from the email local part.                                                                                                                                                                                                                    | Product/architecture | `RESOLVED`            | Approved by the user on 2026-07-28. Applied to revision 5, `US-AUTH-03` 0.2.6, `COVERAGE.md`, `GLOSSARY.md`, and `PLAN.md` 0.4.6.                                       |

## State model

### Owned states

`D-01` Option A establishes these owned states:

```text
NO_PENDING_CLAIM
  -> PENDING_EMAIL_VERIFICATION
      -> CONSUMED_AND_ACCOUNT_CREATED
      -> CLOSED_EXISTING_GOOGLE_ACCOUNT
      -> EXPIRED
      -> SUPERSEDED

CONSUMED_AND_ACCOUNT_CREATED (UNASSIGNED, no session)
  -> AUTHENTICATED_SESSION

delivery:
QUEUED -> SENT
       -> RETRYABLE_FAILURE -> QUEUED
       -> TERMINAL_FAILURE
```

### Invariants

- A pending email claim is not an account identity and grants no role, bearer
  token, refresh session, production guard, or private data.
- One canonical email binds to at most one account across Google and
  credential methods. A valid claim colliding with Google is closed without
  account or credential mutation and may direct the claimant to Google only
  after token proof.
- Adding a password credential or linking authentication methods to an
  existing Google account requires an authenticated future flow and is not
  authorized by mailbox verification alone.
- Only an explicit completion request can consume verification; opening the
  browser page cannot do so.
- For an unowned email, verification and account/credential creation commit
  atomically. A Google collision closes the claim without persisting the
  submitted password. Neither outcome creates a session.
- A raw password is never persisted, encrypted reversibly, logged, placed in a
  URL, or sent by email. A raw verification token is never persisted or logged.
- Password hashes carry an algorithm/work-factor identifier and can be
  upgraded after a later successful authentication.
- The database, not an email provider or browser state, is authoritative for
  eligibility and single consumption.
- Every new account remains `UNASSIGNED`; role and onboarding state are not
  inferred from email, locale, registration route, or preview intent.
- Eligible credential-account creation records only the active universal Terms
  version, active Privacy Notice version, and server timestamp. It collects no
  age or guardian evidence.
- Credential-only accounts keep a null display name until an accepted
  role-profile activation supplies one. Email verification collects no profile
  name, and neither backend nor frontend derives or persists one from email.
  Presentation fallbacks remain localized, generic, and non-persistent.

### Concurrency, retry, and stale-state rules

- Idempotency boundary: canonical-email and active-challenge constraints prevent
  duplicate eligible pending claims; challenge consumption locks the row and
  creates at most one account/credential; generic public responses are safe to
  repeat.
- Optimistic/stale update behavior: expired, superseded, consumed, or
  collision-lost verification presents one restart/sign-in path and never
  mutates the winning identity.
- Duplicate event/callback behavior: delivery attempts use stable outbox IDs;
  sending the same message twice cannot consume verification or create an
  account. The first valid completion transaction wins; later completions are
  safe stale requests.
- Resend creates a new random challenge only after cooldown, invalidates or
  supersedes earlier active challenges atomically, and never changes a
  password/account based only on an anonymous repeated request.
- Technical baseline pending validation: verification link lifetime 30
  minutes; pending claim retention 24 hours; resend cooldown 60 seconds;
  delivery attempts use bounded exponential backoff; all thresholds are
  configuration properties with clock-controlled tests, not public promises
  except `Retry-After`.
- Future `VS-003` reset policy horizon: the recommended reset transaction
  revokes all refresh-session families for the account while existing
  short-lived access tokens expire naturally. No reset operation or state is
  added here.

## TypeSpec contract plan

The human gate is `APPROVED`; TypeSpec may now be initialized. Backend
implementation remains blocked until the initial contract, frontend consumer
review, accepted checkpoint, and `CONTRACT_READY` lifecycle are complete.

### Operations

| Operation                        | Method and route                                      | Auth   | Success                                                                                                                                           | Required failures                                                    |
| -------------------------------- | ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `startCredentialRegistration`    | `POST /api/v1/auth/credential-registrations`          | Public | Generic `202 Accepted`; creates no account or password                                                                                            | `400` malformed email; `429` with `Retry-After`; safe `500`          |
| `resendCredentialVerification`   | `POST /api/v1/auth/credential-verifications/resend`   | Public | Generic `202 Accepted` for eligible and non-eligible addresses                                                                                    | `400` malformed; `429` with `Retry-After`; safe `500`                |
| `completeCredentialVerification` | `POST /api/v1/auth/credential-verifications/complete` | Public | `200 CredentialVerificationResult`; after valid claim proof returns either `CREDENTIAL_ACCOUNT_CREATED` or `SIGN_IN_WITH_GOOGLE`, with no session | Unified `400` invalid/expired/used/mismatched; `429`; safe `500`     |
| `credentialLogin`                | `POST /api/v1/auth/credentials/login`                 | Public | Existing cookie-bearing `AuthResponse`                                                                                                            | `400` malformed; generic `401`; `429` with `Retry-After`; safe `500` |

### Models and validation

| Model                                   | Important fields                                                                                          | Validation/nullability                                                                                                                                                                            | Ownership               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `StartCredentialRegistrationRequest`    | `email`                                                                                                   | Email required, maximum 320, canonicalization fixed server-side; no password or policy field                                                                                                      | Identity API            |
| `ResendCredentialVerificationRequest`   | `email`                                                                                                   | Same email shape; response never reveals eligibility                                                                                                                                              | Identity API            |
| `CompleteCredentialVerificationRequest` | `token`, `password`, `termsVersion`, `privacyNoticeVersion`, `termsAccepted`, `privacyNoticeAcknowledged` | Token and active policy versions required; password 15–128 Unicode code points; both acknowledgement literals must be true; server validates active versions; no confirmation-password wire field | Identity API            |
| `CredentialLoginRequest`                | `email`, `password`                                                                                       | Required bounded fields; one generic invalid-credential response                                                                                                                                  | Identity API            |
| `CredentialVerificationResult`          | `outcome`                                                                                                 | Closed enum: `CREDENTIAL_ACCOUNT_CREATED`, `SIGN_IN_WITH_GOOGLE`; returned only after valid claim proof                                                                                           | Identity API            |
| `AuthResponse` / `CurrentUser`          | Existing access token and canonical current-user state                                                    | Reuse with nullable `displayName`; credential-only accounts return null until role-profile activation; consumers may use only a non-persisted generic fallback                                    | Existing Auth namespace |

### Contract decisions

- Cookie/token behavior: verification never sets the refresh cookie; successful
  credential login reuses the exact `VS-000` cookie path/attributes and
  `AuthResponse`; all responses are `no-store`.
- Error codes and problem details: use stable fixed details; registration and
  resend eligibility are represented by the same `202`; login uses one
  credential failure; verification uses one invalid/expired/used failure. A
  valid Google collision is a non-mutating success outcome, not a public
  pre-verification account lookup. Every rate-limited path preserves
  `Retry-After`.
- Policy evidence: the completion request names the policy versions shown by
  the client; the server accepts only the configured active Terms and Privacy
  Notice versions and records those IDs plus server time in the same account
  transaction. Missing configuration disables enrollment, and stale versions
  return a safe refresh/review error without consuming the claim.
- Pagination/filtering if applicable: not applicable.
- Compatibility or migration impact: operations are additive except that
  `CurrentUser.displayName` widens from required string to nullable under
  approved `D-04`. The frontend consumer must accept null before the accepted
  checkpoint and may show only a generic localized non-persisted fallback.
  Existing Google accounts retain their names; refresh, logout, and `me`
  behavior otherwise remain unchanged. `D-02` preserves canonical-email
  uniqueness and adds no linking operation or credential to an existing Google
  account.

## Contract collaboration

The backend agent drafts and owns this slice, resolves its human decision gate,
and initializes TypeSpec before frontend review. Contract ownership is not
product authority.

### Readiness reviews

| Review                                                     | Owner               | Status     | Evidence                                                                                                                           |
| ---------------------------------------------------------- | ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Slice drafted and human gate resolved                      | Backend/slice owner | `COMPLETE` | Revision 5 records approved `D-01`–`D-04`; no human decision remains open.                                                         |
| Initial TypeSpec compiles and generated output is reviewed | Backend/slice owner | `COMPLETE` | `VS-002-R6-initial` compiles and regenerates reproducibly.                                                                         |
| Frontend consumer review                                   | Frontend owner      | `COMPLETE` | Reviewed `VS-002-R6-initial` against screen states, user flows, DESIGN.md, and generated web declarations; contract is sufficient. |
| Contract requests resolved                                 | Backend/slice owner | `COMPLETE` | Zero `CR-NN` requests submitted; contract fully covers all consumer scenarios.                                                     |
| Accepted contract checkpoint recorded                      | Backend/slice owner | `COMPLETE` | Established `VS-002-R6-accepted` without changes.                                                                                  |

### Contract change requests

| ID  | Consumer scenario or constraint                                                                                               | Proposed change | Backend decision and reason                         | Human decision ID | Status     | Applied/review evidence                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------- | ----------------- | ---------- | --------------------------------------------------------- |
| —   | Reviewed `VS-002-R6-initial` against all registration, verification, sign-in, and nullable `displayName` UI states; zero gaps | —               | Accepted initialized contract without modifications | —                 | `RESOLVED` | `VS-002-R6-accepted` established with zero open requests. |

## Backend plan

- Module and package ownership: extend the existing `identity`
  `api/application/domain/infrastructure` packages; do not create an email,
  notification, or onboarding module for this first use.
- Application use cases and transaction boundaries:
  - start registration validates/canonicalizes only the email, persists the
    password-free pending claim plus an outbox delivery in one transaction,
    and returns generic acceptance;
  - resend applies cooldown/budgets and enqueues a replacement challenge
    without exposing eligibility;
  - complete verification locks the challenge and applies `D-02` before
    persistence: for an unowned email it validates/hashes the password,
    validates the submitted Terms/Privacy versions against active
    configuration, and atomically consumes the claim and creates the
    account/credential plus minimum version/timestamp evidence; for a Google
    collision it closes the claim, discards the password and policy submission
    without persistence, leaves the account unchanged, and returns the
    Google-sign-in outcome;
  - credential login performs comparable hash work for known/unknown
    identities, prepares access state before committing a refresh session, and
    returns only after safe success-event ordering;
  - delivery dispatch and cleanup are separate bounded transactions.
- Domain rules: canonical email ownership, pending versus verified authority,
  versioned password hash, single-use challenge, no implicit role/session,
  generic pre-proof responses, post-proof Google guidance, no mailbox-only
  linking, resend supersession, and retention.
- Ports/adapters:
  - stores for pending registration, credential authenticator, verification
    challenge, delivery outbox, account, session, and security events;
  - `PasswordHasher` application port backed by a configured
    `DelegatingPasswordEncoder`/Argon2id implementation;
  - `VerificationEmailSender` application port backed by
    `JavaMailSender`/SMTP, with a deterministic fake for tests;
  - fixed configured web-origin link builder; never trust the request Host
    header.
- Implemented token/delivery details: each resend creates a new random UUID
  claim. The raw fragment token is the claim identifier plus an HMAC-SHA-256
  binding from a deployment secret; PostgreSQL stores only the SHA-256 token
  digest. The outbox can therefore reconstruct bounded retries without storing
  a raw token, full URL, or message body. Because an anonymous request carries
  no interface-language preference, the first verification message includes
  concise Indonesian, English, and Simplified Chinese instructions without
  inferring a language preference.
- Flyway migration: one append-only migration after V3 for pending claims,
  verified credential/authenticator state, hashed verification challenges,
  Terms/Privacy version and server-time evidence approved by `D-03`, delivery
  outbox/attempts, cleanup indexes, canonical-email uniqueness preserved by
  `D-02`, and nullable `user_account.display_name` approved by `D-04`. Existing
  values remain unchanged; credential-only accounts persist null. Do not edit
  V1–V3.
- Scheduled/async behavior, if any: use the existing Spring scheduling model
  for short bounded outbox batches and expired-pending cleanup; no broker,
  unbounded executor, or provider call inside the account-creation
  transaction.
- Drift cleanup in scope: keep Google-specific provider verification separate;
  avoid copying `AuthController` orchestration into new endpoints; fixed
  credential public errors must not expose exception messages; preserve
  success/session atomicity if a security-event write fails.

## Frontend plan

- Existing routes, layouts, components, and styles affected: `/register`,
  `/verify-email`, and `/login`; `AccountRegistrationPage`,
  `AccountEntryPage`, route manifest availability, auth API/context, localized
  credential copy, focused account tests, and current credential styles.
- Route/navigation entry, exit, and adjacent handoffs: public Home/account
  navigation enters registration/login; email enters `/verify-email` with a
  fragment-held credential; successful credential-account creation exits to
  `/login`, while a proven Google collision exits to the existing Google
  sign-in action; successful login exits through `/` to existing `UNASSIGNED`
  role selection. Do not advertise linking or working recovery before their
  accepted slices.
- Production feature folder and shared-boundary ownership: production
  credential components/API/state live under `features/auth`; app routes
  compose them with the existing Google action; `features` never imports
  `prototype`.
- Prototype code classified for reuse, rewrite, or deletion:
  - **reuse:** Google sign-in/session primitives, route IDs where semantics
    still fit, semantic CSS variables, accessible field patterns, and
    localization infrastructure;
  - **rewrite:** fixture `RegisterPage`, `CredentialLoginPage`,
    `VerifyEmailPage`, eight-character rule, direct verify button, duplicate
    fixture branches, and timer-only resend behavior;
  - **delete from production composition:** prototype imports on `/register`,
    `/login`, and `/verify-email`, the obsolete `/credential-login` alias, and
    preview badges on production screens;
  - **retain isolated for now:** PX-002 parent/family/commerce preview state and
    any explicit preview-only credential entry it still needs. Do not let a
    production credential session satisfy preview persona guards or vice
    versa; remove retained preview credential state only when its remaining PX
    consumers are retired or promoted.
- Contract-backed mock or real API boundary: use generated operation types and
  a test adapter; no handwritten wire DTO or reducer pretending to be
  production.
- Forms, client state, and validation authority: server owns canonical email,
  policy, throttling, and token state; client mirrors basic shape for usability,
  keeps raw passwords/token in component memory only, and clears sensitive
  values on completion or unrecoverable failure.
- Nullable display-name handling: every `CurrentUser` consumer accepts null.
  Account-entry and role-selection UI may omit the name or show a localized
  generic fallback; it must not derive from email, write the fallback back, or
  treat the fallback as profile data.
- Loading, empty, error, retry, and stale states: initial/ready, validating,
  submitting, accepted/check-email, mail delayed, resend cooldown,
  offline/retry, invalid/expired/used/superseded token, verifying, verified,
  generic sign-in failure, throttled, internal failure, and authenticated
  redirect.
- Mobile, keyboard, screen-reader, localization, and low-bandwidth behavior:
  semantic labels/live regions, logical focus after errors and route changes,
  one primary action, 44px targets, no motion-dependent meaning, resilient
  text wrapping in all three locales, and text-first status without requiring
  downloaded imagery.

## Experience and interaction plan

Follow root [`DESIGN.md`](../../DESIGN.md) and
[`docs/design/README.md`](../design/README.md).

- Existing design roles sufficient, with evidence: text input, primary and
  secondary buttons, semantic feedback, white form surface, lilac onboarding
  context, focus, and reduced-motion roles already cover the flow.
- `DESIGN.md` token/component/motion changes required before CSS: none
  identified during shaping; frontend review must reopen this only if an
  existing semantic role cannot represent check-email or verification status.
- Shared primitive versus feature-owned styling: use shared inputs/buttons and
  tokens; credential layout and status styling remain feature-owned until a
  second production flow justifies extraction.
- User goal and entry context: create or access one YukCSCA identity without a
  third-party provider from the public account entry.
- Exit state and next handoff: verified account returns to sign-in; successful
  sign-in reaches canonical `UNASSIGNED` role selection.
- One primary action and secondary actions: each screen has one action—send
  verification, complete verification, or sign in. Google, resend, change
  email, and back navigation remain visibly secondary.
- Dominant surface/pastel semantic role: white credential form inside at most
  one lilac onboarding/explanation region; errors use semantic danger rather
  than pink decorative context.
- State transition and acknowledgement behavior: acknowledge submission
  locally, show honest delivery wait, announce resend timing, visibly confirm
  verification before routing, and never fake email receipt or authentication.
- Purposeful micro-interactions or animation: input/focus, inline validation,
  submission acknowledgement, and a restrained verification success reveal
  only.
- Reduced-motion behavior: remove transforms and near-zero nonessential
  durations while retaining live status/focus transitions.
- Prototype-only assumptions, if any: fixture emails, `example.test` branches,
  local timeouts, direct verification buttons, preview persona activation, and
  eight-character copy are not production inputs.
- Mobile/desktop and Indonesian/English/Chinese visual-review evidence:
  required after implementation at one narrow mobile and one desktop viewport,
  with password/token fields cleared before screenshots or retained traces.

## Authorization, privacy, and safety

- Actor authorization: registration, resend, verification, and login are
  anonymous operations with deny-by-default security configuration and
  route-specific abuse controls. Only a verified credential plus correct
  password may create a session; no operation grants a product role.
- Field-level/minimum-data response: accept only email, password at the
  approved step, raw verification token at completion, and approved policy
  identifiers/acknowledgement. Return generic status and existing
  current-user/session data only after authentication.
- Minor/guardian consequence: credential registration is role-neutral and does
  not collect age, guardian identity, or guardian consent. Role activation
  remains responsible for age-appropriate behavior and any accepted guardian
  step.
- Audit/security events: registration requested, delivery queued/sent/failed,
  verification succeeded/rejected, credential login succeeded/rejected, and
  throttling. A durable success event occurs only after the authoritative
  transaction commits.
- Sensitive logging restrictions: never log password, hash, raw verification
  token, full URL, SMTP credential/message body, full email, refresh/access
  token, policy free text, or framework-rendered sensitive DTO. Avoid
  retaining IP unless a separately accepted security need and retention rule
  requires it.

## Observability

| Event/metric                        | Trigger                                        | Allowed properties                                                           | Prohibited content                                                         |
| ----------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `credential_registration_requested` | Generic registration accepted                  | correlation ID, result category, latency                                     | email, password/hash, eligibility, token                                   |
| `credential_verification_delivery`  | Outbox attempt completes                       | pseudonymous pending ID, attempt number, provider category, latency, outcome | recipient, message body, SMTP response containing address, full link/token |
| `credential_verification_succeeded` | Account/credential transaction commits         | pseudonymous account ID, challenge age bucket                                | email, token, password/hash, policy content                                |
| `credential_verification_rejected`  | Completion cannot proceed                      | reason category, latency                                                     | raw token, email, account-existence detail                                 |
| `credential_login_succeeded`        | Session issuance commits                       | pseudonymous account ID, latency                                             | email, password/hash, access/refresh token                                 |
| `credential_login_rejected`         | Credential sign-in fails                       | generic reason category, throttle state, latency                             | email, password/hash, whether account exists                               |
| `credential_auth_rate_limited`      | Any credential budget denies work              | route category, limiter dimension, retry seconds                             | email, password/token, raw IP in durable event                             |
| delivery backlog metrics            | Dispatcher observes queued/retry/terminal work | counts, oldest age, outcome category                                         | recipients, content, token/link                                            |

## Test plan

### Contract and backend

- Compile TypeSpec and inspect generated OpenAPI/types only after the gate.
- Unit-test canonicalization, password policy/blocklist/Argon2id upgrade,
  verification token hashing/state, link building, cooldown/budgets, outbox
  retry, cleanup, fixed errors, and sensitive DTO redaction.
- PostgreSQL/Testcontainers integration-test registration, no pre-verification
  authorization, generic duplicates, Google/credential races, token
  expiry/replay/concurrent consumption, exactly-one account/credential,
  provider failure/recovery, credential login, session rotation/replay/logout,
  migration constraints, event ordering, and internal-failure atomicity.
- Adapter-test localized SMTP content and Mailpit delivery without contacting
  a billable or production provider.

### Frontend component/integration

- Registration validation, server failure/input preservation, accepted state,
  cooldown, delayed mail, token-fragment clearing, explicit completion,
  invalid/expired/already-used recovery, generic login failure, success
  handoff, Google coexistence, and authenticated redirect.
- Keyboard/focus/live-region/accessibility tests and i18n parity for all new
  copy.
- Static/import-boundary tests prove production `features` do not import
  `prototype` and preview identity never becomes `CurrentUser`.

### End-to-end/manual evidence

- In a disposable local stack, register a non-personal test address, retrieve
  the message from Mailpit, open the exact link, complete verification, sign
  in, observe `UNASSIGNED` role selection, refresh, logout, and confirm
  protected access is gone.
- Repeat focused failure journeys for expired/used link, resend cooldown,
  wrong password, provider outage/recovery, and Google coexistence.
- Disable Playwright trace/video around password entry and retain screenshots
  only after sensitive fields/token URLs are cleared.
- Verify narrow mobile/desktop, keyboard, reduced motion, and layout-sensitive
  Indonesian/English/Chinese states.

## Implementation sequence

1. **Completed 2026-07-28:** resolve `D-01` as Option A and synchronize the
   story/coverage baseline, slice state, and roadmap evidence.
2. **Completed 2026-07-28:** resolve `D-02` as Option A and synchronize the
   collision state, story/coverage baseline, and roadmap evidence.
3. **Completed 2026-07-28:** resolve `D-03` as Option A, synchronize minimum
   policy evidence and story/roadmap metadata, and close the first
   three-question review round with `D-04` as its only remaining blocker.
4. **Completed 2026-07-28:** resolve `D-04`, synchronize nullable display-name
   semantics and consumer/migration requirements, set the human gate
   `APPROVED`, and return the lifecycle to `SHAPING`.
5. Complete the final state, migration, provider, password, abuse, retention,
   and preliminary consumer-data plans from the approved decisions.
6. **Completed 2026-07-28:** initialize the TypeSpec operations in
   `contracts/auth.tsp`, compile and regenerate, inspect output, and record
   `VS-002-R6-initial` without starting implementation.
7. Obtain frontend consumer review; resolve every `CR-NN`, regenerate, record
   the accepted checkpoint, and move to `CONTRACT_READY` only with no open
   decision/request.
8. **Completed 2026-07-28:** add the append-only identity migration, credential domain/application
   services, password hasher, email port, SMTP adapter, PostgreSQL outbox,
   dispatcher/cleanup, public transport, security configuration, safe errors,
   events, and focused backend tests.
9. **Completed 2026-07-28:** add pinned local Mailpit configuration and provider/env documentation;
   prove receipt and verification without using production credentials.
10. **Completed by the frontend owner 2026-07-28:** replace production account-entry prototype imports with generated-contract
    feature code while preserving explicit PX isolation and the existing
    Google/session path.
11. Integrate the real HTTP/mail/session flow early, then add component,
    contract, PostgreSQL, Mailpit, and focused browser evidence.
12. Verify privacy, abuse recovery, atomicity, accessibility, localization,
    responsive/reduced-motion behavior, provider failure, migrations, and
    generated reproducibility.
13. Update `ARCHITECTURE.md`, `SECURITY.md`, `DEVELOPMENT.md`, `PLAN.md`,
    PX-002 promotion status, and this slice only after the corresponding
    implementation/current state exists.

## Definition of done

- [x] Requirement/story references remain correct.
- [x] Documentation sufficiency review is complete and every material
      gap/conflict is resolved or explicitly out of scope.
- [x] Human gate is `APPROVED`; `D-01`–`D-04`, approval scope, and updated
      artifacts are recorded.
- [x] Scope and exclusions match the implemented backend/frontend boundary.
- [x] SMTP, Mailpit, Argon2id, and outbox first use, alternatives, impacts,
      rollback/removal, owner, dependency coordinates/digest, and license
      evidence are recorded.
- [x] TypeSpec compiles and generated artifacts match the accepted contract.
- [x] Initial and accepted checkpoints are recorded, frontend consumer review
      is complete, and every `CR-NN` is resolved.
- [x] Backend, frontend, migration, and tests implement the same contract
      operations, primary states, and safe public errors
      from that checkpoint.
- [ ] A non-personal test mailbox receives the real message and the actor
      completes verification and a separate credential sign-in.
- [ ] Passwords use the accepted versioned adaptive hash and password/token
      values are absent from persistence, logs, URLs after initialization,
      events, analytics, screenshots, videos, and retained traces.
- [x] Registration/resend/login do not enumerate accounts; abuse, cooldown,
      provider failure, replay, concurrency, stale, and cleanup behavior have
      named evidence.
- [x] Google sign-in, refresh rotation/replay, logout, current-user state, and
      `UNASSIGNED` role behavior remain intact.
- [x] Authorization, privacy, minor protection, policy evidence, retention,
      and security events were reviewed.
- [ ] Mobile, accessibility, localization, low-bandwidth, reduced-motion, and
      failure states were verified.
- [ ] Production routes use `features/auth`; prototype credential behavior is
      removed from production composition and remaining PX consumers stay
      explicitly isolated.
- [x] The UI follows root `DESIGN.md`; no new shared visual role is introduced
      without updating it first.
- [x] `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DEVELOPMENT.md`,
      `docs/PLAN.md`, relevant PX promotion notes, coverage/story metadata, and
      this slice reflect delivered current state.
- [x] Exact verification commands and results are recorded.

## Verification evidence

| Evidence                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation sufficiency    | Revision 6 records approved `D-01`–`D-04`; no material documentation gap remains                                                                                                                                                                                                                                                                                                                                                                                |
| Human decision gate          | `APPROVED`; scope is the four recorded decisions and their synchronized artifacts                                                                                                                                                                                                                                                                                                                                                                               |
| Adjacent-contract horizon    | Reviewed `US-AUTH-01`–`04`, existing account/session contract, profile handoff, and PX-002 promotion rules                                                                                                                                                                                                                                                                                                                                                      |
| Technology/ADR review        | Spring Mail 4.1.0, Bouncy Castle 1.84, pinned Mailpit v1.30.4 digest, Argon2id parameters, PostgreSQL outbox, licenses, alternatives, and no-ADR disposition recorded                                                                                                                                                                                                                                                                                           |
| Focused documentation format | Repository Prettier check passed for the changed Markdown/YAML files                                                                                                                                                                                                                                                                                                                                                                                            |
| Patch hygiene                | `git diff --check` passed                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Contract build               | Pinned Node 24.18.0/pnpm 11.14.0 ran `pnpm contract:build`; TypeSpec 1.14.0 passed                                                                                                                                                                                                                                                                                                                                                                              |
| Generated web declarations   | `corepack pnpm --filter @yukcsca/web api:generate` passed; generated declarations updated                                                                                                                                                                                                                                                                                                                                                                       |
| Generated reproducibility    | A second direct build/generation retained source/OpenAPI/web hashes `49edcc3` / `af08481` / `90dd886`                                                                                                                                                                                                                                                                                                                                                           |
| Repository generated check   | Pinned Node 24.18.0/pnpm 11.14.0 ran `pnpm check:generated`; TypeSpec/OpenAPI/web generation passed and artifacts were unchanged                                                                                                                                                                                                                                                                                                                                |
| Initial contract checkpoint  | `VS-002-R6-initial` records the full hashes in Metadata                                                                                                                                                                                                                                                                                                                                                                                                         |
| Frontend type compatibility  | Pinned pnpm ran `pnpm typecheck:web`; TypeScript project build passed with nullable `CurrentUser.displayName`                                                                                                                                                                                                                                                                                                                                                   |
| Frontend contract review     | `COMPLETE`; `VS-002-R6-initial` reviewed against concrete screen states, user flows, `DESIGN.md`, and generated web declarations; zero `CR-NN` filed                                                                                                                                                                                                                                                                                                            |
| Accepted contract checkpoint | `VS-002-R6-accepted` established without changes; TypeSpec `49edcc34367540e8e4b346b2ba6f6f84e7a23560`                                                                                                                                                                                                                                                                                                                                                           |
| Backend tests                | Red phase failed on absent credential types/stores as expected; focused credential green passed 8 PostgreSQL lifecycle/failure tests; final `make verify` passed 27 integration tests plus 23 unit tests; Argon2 upgrade, identifier throttling, token tamper, password policy, cleanup, resend cooldown, expiry, replay, concurrency, internal failure, provider failure, real SMTP receipt, Google/session, migration, and profile handoff are named evidence |
| Frontend tests               | Previous frontend handoff passed 61 tests; current integration rerun passed 3 files/25 tests (`authApi`, credential components, `App`) and `pnpm typecheck:web`                                                                                                                                                                                                                                                                                                 |
| Repository gate              | Pinned Node 24.18.0/pnpm 11.14.0 ran `make verify`; generated artifacts, repository Prettier, web typecheck/lint/61 tests/production build, backend 23 unit/27 integration tests, Spotless, and Compose validation all passed                                                                                                                                                                                                                                   |
| Frontend visual review       | `VERIFIED`; `AccountRegistrationForm`, `AccountVerificationForm`, `AccountLoginForm` refined with `{components.content-card}` containment (`.credential-card`), zero inline styles, 44px min targets, and exact `DESIGN.md` visual tokens.                                                                                                                                                                                                                      |
| Frontend journey handoffs    | `VERIFIED`; raw token auto-cleared on `/verify-email` mount via `history.replaceState`, created credential account routes to `/login`, login hands off `UNASSIGNED` identity to onboarding                                                                                                                                                                                                                                                                      |
| Remaining risks              | A production-built browser journey through real HTTP, Mailpit link opening, explicit completion, sign-in, refresh, and logout is still required; frontend DEV fallbacks can mask API failures and remain a frontend-owned integration cleanup; production legal artifacts and SMTP readiness are external gates                                                                                                                                                 |

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9        | 2026-07-28 | Implemented the VS-002 backend and integration boundary: V4 persistence, canonical-email serialization, digest-only verification claims, versioned Argon2id credentials, minimum policy evidence, SMTP outbox/Mailpit delivery, abuse controls, fixed public errors, shared sessions, focused backend/frontend checks, and current-state documentation; moved to `VERIFYING`. |
| 8        | 2026-07-28 | Implemented frontend-owned credential auth (`AccountRegistrationForm`, `AccountVerificationForm`, `AccountLoginForm`, `authApi.ts`, `AuthContext.tsx`), verified 61 vitest tests and TypeScript typecheck, recorded visual evidence, journey handoffs, and remaining risks while keeping lifecycle status as `CONTRACT_READY`.                                                |
| 7        | 2026-07-28 | Completed frontend consumer review of `VS-002-R6-initial`, verified contract sufficiency against concrete screen states, security rules, and `DESIGN.md`, filed zero `CR-NN` requests, established accepted checkpoint `VS-002-R6-accepted`, and moved slice to `CONTRACT_READY`.                                                                                             |
| 6        | 2026-07-28 | Initialized and compiled four credential-auth operations, made policy acknowledgements and nullable display name explicit, regenerated OpenAPI/web declarations reproducibly, recorded `VS-002-R6-initial`, and opened the required frontend consumer-review checkpoint without starting backend implementation.                                                              |
| 5        | 2026-07-28 | Recorded approved `D-04`: credential-only accounts keep a null display name until role-profile activation; verification collects or derives no profile name from email; contract/database consumers accept null; UI fallback is presentation-only and non-persistent. Human gate approved and slice returned to `SHAPING`.                                                    |
| 4        | 2026-07-28 | Recorded approved `D-03` Option A: eligible account creation requires active universal Terms acceptance and Privacy Notice acknowledgement, stores only version IDs and server time, collects no age/guardian evidence, and stays disabled without production policy configuration.                                                                                           |
| 3        | 2026-07-28 | Recorded approved `D-02` Option A: a valid Google-email collision closes the claim, preserves the existing account, stores no password credential, creates no link/session, and returns post-proof Google sign-in guidance. Future password setup/linking requires authenticated Google access in another slice.                                                              |
| 2        | 2026-07-28 | Recorded approved `D-01` Option A: email-only pending claim first; password hash, verified credential, and `UNASSIGNED` account are created atomically only at explicit completion. Synchronized story, coverage, glossary, and plan metadata; split the prior bundled `D-02` into bounded collision and display-name decisions.                                              |
| 1        | 2026-07-28 | Created the shaping brief, completed the adjacent/documentation reviews, planned real SMTP/Mailpit verification and credential security, and opened `D-01` before TypeSpec.                                                                                                                                                                                                   |
