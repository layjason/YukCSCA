# VS-001 — Activate a student account

## Metadata

| Field                | Value                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| Status               | `DONE`                                                                                |
| Human gate           | `APPROVED`                                                                            |
| Plan revision        | 10                                                                                    |
| Updated              | 2026-07-22                                                                            |
| Primary actor        | Authenticated `UNASSIGNED` user                                                       |
| Story IDs            | `US-PROF-01`                                                                          |
| Requirement sections | 1.2 Student profile; 1.3 Roles and permissions; 1.4 default explanation language only |
| Depends on           | `VS-000`                                                                              |
| TypeSpec source      | `contracts/profile.tsp`; shared auth response reused from `contracts/auth.tsp`        |
| API operations       | `activateStudentProfile`, `getMyStudentProfile`                                       |
| Implementation owner | Profile module, using a narrow identity application API                               |

## User-observable outcome

An authenticated unassigned user can submit the minimum learner profile once and enter YukCSCA as a student with a persisted default explanation language.

## Why this slice is the current boundary

This is the smallest post-authentication closed loop: it turns a provider-authenticated identity into a usable product role and lets the actor observe the profile after activation. Editing a profile, changing exam language, goals, diagnostics, parent linking, and deletion are independent later outcomes.

Default explanation language is included because the normative student profile and `US-PROF-01` require it at activation. Interface locale and exam language remain separate and are not inferred.

## In scope

- Student role choice from an `UNASSIGNED` account.
- Minimum profile fields: confirmed preferred name, birth year, current grade, city, and default explanation language.
- Atomic creation of exactly one learner profile and transition from `UNASSIGNED` to `STUDENT`.
- Reading the authenticated student's own profile after activation.
- Field validation, role conflict handling, retry safety, security/audit event, and localized mobile UI states.
- Existing access/refresh sessions continue to represent the updated role through a defined token/session refresh behavior.

## Out of scope

- Parent activation or parent-created student accounts.
- Editing an existing student profile.
- Target exam date, university/major goal details, subject matching, and exam-language enrollment.
- Parent linking, consent-policy implementation beyond the activation notice, data export, or deletion.
- Entitlements, trials, courses, diagnostics, or agent behavior.

## Preconditions and dependencies

- `VS-000` authentication and `/api/v1/auth/me` are operational.
- Supported explanation-language enum is Bahasa Indonesia, English, and Simplified Chinese.
- `currentGrade` is required and uses `GRADE_10`, `GRADE_11`, `GRADE_12`, or `OTHER`.
- `birthYear` is required and must fall from `currentYear(Asia/Jakarta) - 21` through `currentYear(Asia/Jakarta) - 12`, inclusive; it supports age-appropriate behavior but is not legal age verification.
- `preferredName` is required. The UI may prefill it from the Google display name, but the student must be able to edit and explicitly submit the value; provider data is only a suggestion and is not treated as a legal name.
- The activation UI must not infer student status from interface locale or Google profile data.

## User flow

1. An authenticated `UNASSIGNED` user is routed to role onboarding.
2. The user chooses Student and sees the minimum profile form plus privacy/terms explanation.
3. The user submits valid fields and a supported default explanation language.
4. The API creates the profile and changes the role atomically.
5. The application refreshes current identity state and enters the student dashboard/onboarding continuation.
6. On a later sign-in, the user is not asked to activate again.

## Acceptance and implementation matrix

| AC ID | Given / When / Then                                                                                                                                      | UI evidence                                                  | API/domain behavior                                                                                 | Persistence/audit                                                        | Test evidence                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| AC-01 | Given an authenticated `UNASSIGNED` account, when valid learner data is submitted, then one profile is stored and the role becomes `STUDENT` atomically. | Success transition to student dashboard.                     | Single application transaction owns role guard, profile creation, and response.                     | Student profile row plus account role; activation security/domain event. | Backend integration test plus frontend success test.           |
| AC-02 | Given missing, unsupported, implausible, or overlong values, when submitted, then no profile or role change is persisted and field errors are returned.  | Field-specific localized errors; entered safe values remain. | TypeSpec constraints plus domain validation; stable problem codes.                                  | No partial profile or role update.                                       | Parameterized validation tests and component error-state test. |
| AC-03 | Given an account already assigned another role, when activation is attempted, then the request is rejected.                                              | Safe conflict message and current-role refresh.              | Authorization/role guard returns `409` or agreed semantic error.                                    | No state change; conflict/security event only if useful.                 | Integration test for Student/Parent/Tutor/Admin conflicts.     |
| AC-04 | Given activation has already completed, when the original request is retried, then no duplicate profile is created.                                      | User continues as Student.                                   | Idempotent-by-state behavior; response semantics decided before contract readiness.                 | Unique profile-to-account constraint.                                    | Duplicate-request/concurrency integration test.                |
| AC-05 | Given a completed profile, when the user signs in again, then onboarding activation is not repeated.                                                     | Protected routing uses current server role/profile state.    | `/auth/me` or replacement current-user response reflects Student and onboarding state consistently. | Persisted role/profile is authoritative.                                 | Auth/profile integration plus route test.                      |

## Documentation sufficiency review

| Review area                                                   | Evidence inspected                                            | Status  | Gap or decision ID                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| End-to-end actor flow and adjacent handoffs                   | Requirements 1.2–1.4; `US-PROF-01`; existing Google-auth flow | `CLEAR` | Parent activation, goals, and diagnostics are explicitly later slices.                                   |
| Requirement/story coverage and exclusions                     | `USER_STORIES.md`; `COVERAGE.md`; slice scope                 | `CLEAR` | The student activation loop is represented without combining profile editing or subject enrollment.      |
| Domain terms, states, invariants, and ownership               | `GLOSSARY.md`; auth contract; architecture/module rules       | `CLEAR` | `D-03` and `D-04` resolved: the profile module owns `preferredName` and profile lifecycle.               |
| Authorization, privacy, minors, consent, and retention        | Requirements; security guide; target audience                 | `CLEAR` | `D-02` resolved with birth-year minimization, a rolling age-appropriate range, and no legal-age claim.   |
| Failure, retry, idempotency, stale state, and recovery        | Story acceptance criteria; auth/current-user behavior         | `CLEAR` | Unique account/profile constraint plus authoritative server role are defined.                            |
| Contract, migration, external side effects, and compatibility | Existing auth TypeSpec and current-user response              | `CLEAR` | `D-05` resolved: activation returns replacement access-token state without rotating the refresh session. |
| Acceptance evidence and observability                         | Acceptance matrix and test/observability sections             | `CLEAR` | Exact test names are added during implementation.                                                        |

## Human decision gate

Questions are asked one at a time under [`HUMAN_REVIEW.md`](HUMAN_REVIEW.md), with at most three questions in the first review round. The gate applies only to the decisions below; it does not reopen the already delivered Google-auth slice.

| Field             | Value                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Gate status       | `APPROVED`                                                                                                      |
| Decision owner    | Product owner for `D-01`–`D-03`; architecture owner for `D-04`–`D-05`                                           |
| Approval scope    | Student activation profile fields, validation semantics, module ownership, and post-activation identity refresh |
| Approval evidence | `D-01`–`D-05` resolved by the product/architecture owner on 2026-07-22; Option A approved for every decision    |

| ID     | Blocking question and scenario                                                                                                                                                        | Agent recommendation                                                                                                                                                   | Owner            | Status     | Resolution and artifacts updated                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `D-01` | How is `currentGrade` represented when Indonesian students may describe grade and school stage differently? This changes the wire enum, localization, storage, and future plan rules. | Require a bounded `GRADE_10`, `GRADE_11`, `GRADE_12`, or `OTHER`; do not accept free text or `NOT_SET`.                                                                | Product          | `RESOLVED` | Option A approved; this slice, its TypeSpec enum, persistence, validation, and localization own the resolution.                                       |
| `D-02` | Which birth years are accepted, and is birth year collected only for age-appropriate product behavior rather than legal age verification?                                             | Store birth year only; accept a rolling range equivalent to ages 12–21 with explicit exception guidance rather than collecting full birth date.                        | Product/security | `RESOLVED` | Option A approved; use the Asia/Jakarta calendar year, reject out-of-range values without persistence, and show non-data-collecting support guidance. |
| `D-03` | When Google provides a name, must the student explicitly confirm/edit it before activation, or may the server copy it automatically?                                                  | Prefill an editable preferred name and require submission confirmation; never treat provider name as an immutable legal name.                                          | Product          | `RESOLVED` | Option A approved; the editable Google value is only a suggestion, and the submitted `preferredName` is owned by the student profile.                 |
| `D-04` | Does student-profile activation belong to the identity module or a new profile/onboarding module?                                                                                     | Create a profile module with a narrow identity application API because profile lifecycle will grow independently; do not import identity persistence.                  | Architecture     | `RESOLVED` | Option A approved; the profile module owns `StudentProfile`, and one transaction coordinates persistence through identity's application boundary.     |
| `D-05` | After role transition, does activation return refreshed current-user state, rotate the access token, or require a separate `/auth/me` refresh?                                        | Return the profile, canonical current-user state, and a replacement access token because role authorization is encoded in the JWT; keep the refresh session unchanged. | Architecture     | `RESOLVED` | Option A approved; first activation returns the new state, while a same-account retry returns the existing profile and fresh access state safely.     |

## State model

### Owned states

```text
UserAccount.role = UNASSIGNED
  + no StudentProfile
  --activateStudentProfile-->
UserAccount.role = STUDENT
  + exactly one StudentProfile
```

### Invariants

- An account has at most one student profile.
- A student profile belongs to exactly one account.
- Profile creation and role transition commit or roll back together.
- Default explanation language never sets interface language or subject exam language.
- Existing learning records are irrelevant because only `UNASSIGNED` accounts may enter this transition.

### Concurrency, retry, and stale-state rules

- Database uniqueness enforces one profile per account.
- Concurrent activation requests produce one success and one deterministic already-activated/conflict outcome; they never create duplicate rows.
- The server role is authoritative. A stale browser showing onboarding must recover by refreshing current-user/profile state.
- No client-generated idempotency key is required. First activation returns `201`; a same-account retry after successful activation returns `200` with the existing profile, canonical current user, and a newly issued access token. Other assigned roles receive `409`.

## TypeSpec contract plan

The TypeSpec operation set must compile and be reviewed before backend or frontend implementation.

### Operations

| Operation                | Method and route                 | Auth                                                  | Success                                                                                   | Required failures          |
| ------------------------ | -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------- |
| `activateStudentProfile` | `POST /api/v1/student-profile`   | Bearer; role checked from authoritative account state | `201` on creation or `200` on same-account retry, with profile and replacement auth state | `400`, `401`, `409`, `500` |
| `getMyStudentProfile`    | `GET /api/v1/student-profile/me` | Bearer; role `STUDENT`                                | `200` canonical profile                                                                   | `401`, `403`, `500`        |

Do not create a generic role-management endpoint. This use case activates only a student profile and owns the role transition.

### Models and validation

| Model                           | Important fields                                                                   | Validation/nullability                                                                                                                                                           | Ownership                 |
| ------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `ActivateStudentProfileRequest` | `preferredName`, `birthYear`, `currentGrade`, `city`, `defaultExplanationLanguage` | `preferredName` is required with maximum 160 characters; `city` is required with maximum 120 characters; `birthYear` uses the resolved rolling inclusive range; no exam language | Profile module            |
| `StudentProfile`                | account/profile IDs, canonical fields, created/updated timestamps if user-visible  | No sensitive contact fields added speculatively                                                                                                                                  | Profile module            |
| `StudentGrade`                  | `GRADE_10`, `GRADE_11`, `GRADE_12`, `OTHER`                                        | Required; no free text and no `NOT_SET`                                                                                                                                          | Profile module            |
| `ExplanationLanguage`           | `id`, `en`, `zh-CN` or agreed wire enum                                            | Must remain distinct from interface and exam language enums                                                                                                                      | Shared product vocabulary |

### Contract decisions

- Implement resolved `D-01`–`D-05` exactly as recorded above.
- Use the existing interface locale codes as wire values for the separate explanation-language enum: `id`, `en`, and `zh-CN`.
- Use stable problem codes and the existing shared problem shape; validation responses additionally identify fields through bounded violations.

## Backend plan

- Create the first `profile` module with this use case, following `api/application/domain/infrastructure` packages; onboarding remains a frontend flow rather than a backend ownership bucket.
- Use the profile application service as the transaction boundary. It reads and transitions the authenticated account through a narrow identity application API, validates `UNASSIGNED`, creates the profile, and changes the account role atomically.
- The profile module must not import an identity repository, JPA entity, or infrastructure package. Identity exposes only the application-facing account state and role-transition behavior required by this use case.
- Add a Flyway migration for the student profile and a unique account foreign key.
- Add explicit authorization and exception mapping with stable problem codes.
- Record a minimal activation event containing account ID, resulting role, time, and outcome; do not log birth year, city, or raw request bodies.

## Frontend plan

- Add `src/features/onboarding/student-activation/` only with this slice.
- Route authenticated `UNASSIGNED` users to the role/activation entry and Student users away from it based on server state.
- Use generated OpenAPI schema types; no handwritten wire DTO.
- Prefill `preferredName` from the current Google-backed display name as an editable suggestion and require the student to submit the confirmed value.
- Replace the in-memory access token and current-user state from the activation response; do not call refresh or rotate the refresh cookie after success.
- Keep interface locale initialization separate. The explanation-language field defaults only through an explicit product rule, not browser locale inference, unless the user confirms it.
- Provide mobile-first labels, keyboard navigation, semantic errors, submission progress, retry, conflict recovery, and all three interface-language resources.
- Do not build goal/subject/diagnostic screens in this slice.

## Authorization, privacy, and safety

- Only the authenticated account may activate itself in this slice.
- The endpoint accepts no account ID from the browser.
- Collect birth year rather than full birth date unless the requirements later require more precision.
- Use birth year only for age-appropriate behavior, not as proof of legal age; reject values outside the resolved rolling range without persistence and provide localized support guidance without automatically creating a support record.
- The activation notice must explain the profile purpose and that linking a parent is not mandatory in the first version.
- Request fields and validation errors must not be written to logs as complete bodies.
- A role conflict must not reveal another user's account or relationship data.

## Observability

| Event/metric                   | Trigger                            | Allowed properties                                          | Prohibited content                    |
| ------------------------------ | ---------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| `student_activation_started`   | Form becomes actionable            | interface locale, app version                               | name, birth year, city                |
| `student_activation_succeeded` | Transaction commits                | account pseudonymous ID, explanation-language enum, latency | raw profile fields, Google credential |
| `student_activation_failed`    | Validation/conflict/server failure | stable error code, latency                                  | request body, contact data            |

## Test plan

### Contract and backend

- TypeSpec compilation and generated OpenAPI review.
- Migration integration test and unique account constraint.
- HTTP success test proving role plus profile atomically.
- Validation tests for every accepted boundary, including both rolling birth-year limits and the year immediately outside each limit.
- Unauthorized and already-assigned role tests.
- Concurrent/repeated activation test.
- Current-user/profile read consistency test after activation and refresh.

### Frontend component/integration

- Successful submission and route transition.
- Field validation and server problem mapping.
- Duplicate/stale onboarding recovery.
- Keyboard labels/focus and representative localization assertions.
- Access-token/current-user refresh behavior after role change.

### End-to-end/manual evidence

- Sign in as a newly created Google user, activate Student, reach the student dashboard, sign out, sign in again, and confirm activation is not repeated.
- Repeat with one invalid form and one concurrent/retry scenario in test automation where practical.

## Implementation sequence

1. Ask and resolve the bounded human decisions above, update the owning artifacts, and move the gate to `APPROVED`.
2. Add `profile.tsp`, import it from `main.tsp`, and update shared types only where necessary.
3. Generate and review OpenAPI/frontend declarations.
4. Add the Flyway migration and module/domain state.
5. Implement application transaction, identity-facing port, controller, authorization, and integration tests.
6. Implement the onboarding feature and generated-type API adapter.
7. Add component and end-to-end evidence.
8. Verify logging, events, localization, mobile/accessibility, retry, and stale-state behavior.
9. Update `ARCHITECTURE.md`, `docs/PLAN.md`, coverage status, and this file's verification evidence.

## Definition of done

- [x] Documentation sufficiency review is complete.
- [x] Human decisions `D-01`–`D-05` are resolved and the approval scope is recorded.
- [x] TypeSpec is accepted and compiles before implementation starts.
- [x] The real application completes the activation flow end to end.
- [x] Profile creation and role transition are atomic and duplicate-safe.
- [x] Current identity state is consistent after activation and later sign-in.
- [x] Acceptance criteria have named backend/frontend/journey evidence.
- [x] Authorization, privacy, minor protection, and sensitive logging were reviewed.
- [x] Mobile, accessibility, localization, failure, retry, and stale states were verified.
- [x] Architecture, plan index, and coverage status reflect the delivered slice.

## Verification evidence

| Evidence               | Result                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract build         | `pnpm generate` passed; TypeSpec/OpenAPI/frontend declarations regenerated with unchanged hashes and were reviewed against AC-01 through AC-05.                                     |
| Backend tests          | Focused Maven verify passed: 7 profile/migration integration tests and 16 unit tests, including rejected-value and request/response/current-user log-redaction regressions.         |
| Frontend tests         | Focused Vitest passed: 3 files and 8 tests covering routing, success/client and server validation, stale-state recovery, bearer use, and token replacement; targeted ESLint passed. |
| Frontend build         | Strict TypeScript production build passed with Vite; labels, localized field/error states, focus styling, and responsive layout were reviewed.                                      |
| Local stack            | API and web containers were healthy at Flyway v3; the proxied activation endpoint enforced authentication and the served bundle contained the activation route.                     |
| End-to-end/manual flow | Product owner reported no noticeable problem in the real VS-001 flow; count-only persistence inspection found 2 `STUDENT` accounts, 2 profiles, and 2 activation events.            |

## Revision history

| Revision | Date       | Change                                                                                                            |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 10       | 2026-07-22 | Closed the slice after real-flow confirmation and final focused checks; added profile/current-user log redaction. |
| 9        | 2026-07-22 | Integrated the profile module, migration, onboarding UI, and focused automated evidence; moved to `VERIFYING`.    |
| 8        | 2026-07-22 | Added and reviewed the compiled TypeSpec boundary; moved the slice to `CONTRACT_READY`.                           |
| 7        | 2026-07-22 | Resolved `D-05`: activation returns replacement access state without rotating the refresh session; gate approved. |
| 6        | 2026-07-22 | Resolved `D-04`: a dedicated profile module owns profile state and uses a narrow identity application API.        |
| 5        | 2026-07-22 | Resolved `D-03`: prefill an editable name suggestion and require explicit `preferredName` confirmation.           |
| 4        | 2026-07-22 | Resolved `D-02`: collect birth year only and accept a rolling Asia/Jakarta range equivalent to ages 12–21.        |
| 3        | 2026-07-22 | Resolved `D-01`: student grade is required and uses `GRADE_10`, `GRADE_11`, `GRADE_12`, or `OTHER`.               |
| 2        | 2026-07-21 | Added documentation-sufficiency review and bounded human decision gate; moved the slice to `AWAITING_DECISION`.   |
| 1        | 2026-07-21 | Initial concrete shaping plan after the implemented Google-auth slice.                                            |
