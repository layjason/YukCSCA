# VS-001 — Activate a student account

## Metadata

| Field                   | Value                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Status                  | `AWAITING_DECISION`                                                                            |
| Human gate              | `AWAITING_DECISION`                                                                            |
| Plan revision           | 2                                                                                              |
| Updated                 | 2026-07-21                                                                                     |
| Primary actor           | Authenticated `UNASSIGNED` user                                                                |
| Story IDs               | `US-PROF-01`                                                                                   |
| Requirement sections    | 1.2 Student profile; 1.3 Roles and permissions; 1.4 default explanation language only          |
| Depends on              | `VS-000`                                                                                       |
| TypeSpec source         | Proposed `contracts/profile.tsp`; shared auth model update in `contracts/auth.tsp` if required |
| Proposed API operations | `activateStudentProfile`, `getMyStudentProfile`                                                |
| Implementation owner    | Unassigned                                                                                     |

## User-observable outcome

An authenticated unassigned user can submit the minimum learner profile once and enter YukCSCA as a student with a persisted default explanation language.

## Why this slice is the current boundary

This is the smallest post-authentication closed loop: it turns a provider-authenticated identity into a usable product role and lets the actor observe the profile after activation. Editing a profile, changing exam language, goals, diagnostics, parent linking, and deletion are independent later outcomes.

Default explanation language is included because the normative student profile and `US-PROF-01` require it at activation. Interface locale and exam language remain separate and are not inferred.

## In scope

- Student role choice from an `UNASSIGNED` account.
- Minimum profile fields: nickname/name, birth year, current grade, city, and default explanation language.
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
- Product decision required before contract readiness: exact grade representation and accepted birth-year range.
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

| Review area                                                   | Evidence inspected                                            | Status  | Gap or decision ID                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| End-to-end actor flow and adjacent handoffs                   | Requirements 1.2–1.4; `US-PROF-01`; existing Google-auth flow | `CLEAR` | Parent activation, goals, and diagnostics are explicitly later slices.                              |
| Requirement/story coverage and exclusions                     | `USER_STORIES.md`; `COVERAGE.md`; slice scope                 | `CLEAR` | The student activation loop is represented without combining profile editing or subject enrollment. |
| Domain terms, states, invariants, and ownership               | `GLOSSARY.md`; auth contract; architecture/module rules       | `GAP`   | `D-04` module ownership; `D-03` profile-name semantics.                                             |
| Authorization, privacy, minors, consent, and retention        | Requirements; security guide; target audience                 | `GAP`   | `D-02` accepted birth-year range and validation basis.                                              |
| Failure, retry, idempotency, stale state, and recovery        | Story acceptance criteria; auth/current-user behavior         | `CLEAR` | Unique account/profile constraint plus authoritative server role are defined.                       |
| Contract, migration, external side effects, and compatibility | Existing auth TypeSpec and current-user response              | `GAP`   | `D-01` grade representation; `D-05` post-activation identity/session response.                      |
| Acceptance evidence and observability                         | Acceptance matrix and test/observability sections             | `CLEAR` | Exact test names are added during implementation.                                                   |

## Human decision gate

Questions are asked one at a time under [`HUMAN_REVIEW.md`](HUMAN_REVIEW.md), with at most three questions in the first review round. The gate applies only to the decisions below; it does not reopen the already delivered Google-auth slice.

| Field             | Value                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Gate status       | `AWAITING_DECISION`                                                                                             |
| Decision owner    | Product owner for `D-01`–`D-03`; architecture owner for `D-04`–`D-05`                                           |
| Approval scope    | Student activation profile fields, validation semantics, module ownership, and post-activation identity refresh |
| Approval evidence | Not yet approved                                                                                                |

| ID     | Blocking question and scenario                                                                                                                                                        | Agent recommendation                                                                                                                                                             | Owner            | Status | Resolution and artifacts updated |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ | -------------------------------- |
| `D-01` | How is `currentGrade` represented when Indonesian students may describe grade and school stage differently? This changes the wire enum, localization, storage, and future plan rules. | Use a bounded `10`, `11`, `12`, plus `OTHER`/`NOT_SET` only if onboarding may continue without a standard grade; avoid free text.                                                | Product          | `OPEN` |                                  |
| `D-02` | Which birth years are accepted, and is birth year collected only for age-appropriate product behavior rather than legal age verification?                                             | Store birth year only; validate against a rolling plausible school-age range with an explicit exception path rather than collecting full birth date.                             | Product/security | `OPEN` |                                  |
| `D-03` | When Google provides a name, must the student explicitly confirm/edit it before activation, or may the server copy it automatically?                                                  | Prefill an editable display name and require submission confirmation; never treat provider name as an immutable legal name.                                                      | Product          | `OPEN` |                                  |
| `D-04` | Does student-profile activation belong to the identity module or a new profile/onboarding module?                                                                                     | Create the profile/onboarding module with a narrow identity application port because profile lifecycle will grow independently; do not import identity persistence.              | Architecture     | `OPEN` |                                  |
| `D-05` | After role transition, does activation return refreshed current-user state, rotate the access token, or require a separate `/auth/me` refresh?                                        | Return the created profile plus canonical current-user state and refresh the client cache; rotate tokens only if authorization is encoded exclusively in immutable token claims. | Architecture     | `OPEN` |                                  |

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
- No client-generated idempotency key is required if the state transition and unique constraint provide equivalent duplicate prevention; decide and document before contract readiness.

## TypeSpec contract plan

The TypeSpec operation set must compile and be reviewed before backend or frontend implementation.

### Operations

| Operation                | Method and route                                            | Auth                      | Success                                         | Required failures                                                                 |
| ------------------------ | ----------------------------------------------------------- | ------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `activateStudentProfile` | `POST /api/v1/student-profile` or accepted resource route   | Bearer; role `UNASSIGNED` | `201` with canonical profile/current-user state | `400`, `401`, `409`, optional `422` only if repository error conventions adopt it |
| `getMyStudentProfile`    | `GET /api/v1/student-profile/me` or accepted resource route | Bearer; role `STUDENT`    | `200` canonical profile                         | `401`, `403`, `404` only if a valid Student role can lack a profile by design     |

Do not create a generic role-management endpoint. This use case activates only a student profile and owns the role transition.

### Models and validation

| Model                           | Important fields                                                                            | Validation/nullability                                                          | Ownership                 |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------- |
| `ActivateStudentProfileRequest` | `displayName`/`nickname`, `birthYear`, `currentGrade`, `city`, `defaultExplanationLanguage` | Exact lengths/enums/ranges resolved before contract readiness; no exam language | Profile module            |
| `StudentProfile`                | account/profile IDs, canonical fields, created/updated timestamps if user-visible           | No sensitive contact fields added speculatively                                 | Profile module            |
| `ExplanationLanguage`           | `id`, `en`, `zh-CN` or agreed wire enum                                                     | Must remain distinct from interface and exam language enums                     | Shared product vocabulary |

### Contract decisions required

- Resolve human decisions `D-01`, `D-02`, `D-03`, and `D-05` before TypeSpec work begins.
- Confirm canonical wire names for supported languages and stable problem codes against existing contract conventions; escalate only if the sources conflict.

## Backend plan

- Create the first profile/onboarding module only with this use case, following `api/application/domain/infrastructure` packages.
- Use an application service as the transaction boundary. It reads the authenticated account through an application-facing identity port, validates `UNASSIGNED`, creates the profile, and changes the account role atomically.
- Do not import the identity repository or JPA entity directly from another module. Add a narrow identity application port/use case if profile is a separate module; alternatively justify ownership within identity for this first transition.
- Add a Flyway migration for the student profile and a unique account foreign key.
- Add explicit authorization and exception mapping with stable problem codes.
- Record a minimal activation event containing account ID, resulting role, time, and outcome; do not log birth year, city, or raw request bodies.

## Frontend plan

- Add `src/features/onboarding/student-activation/` only with this slice.
- Route authenticated `UNASSIGNED` users to the role/activation entry and Student users away from it based on server state.
- Use generated OpenAPI schema types; no handwritten wire DTO.
- Keep interface locale initialization separate. The explanation-language field defaults only through an explicit product rule, not browser locale inference, unless the user confirms it.
- Provide mobile-first labels, keyboard navigation, semantic errors, submission progress, retry, conflict recovery, and all three interface-language resources.
- Do not build goal/subject/diagnostic screens in this slice.

## Authorization, privacy, and safety

- Only the authenticated account may activate itself in this slice.
- The endpoint accepts no account ID from the browser.
- Collect birth year rather than full birth date unless the requirements later require more precision.
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
- Validation tests for every accepted boundary.
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

- [ ] Documentation sufficiency review is complete.
- [ ] Human decisions `D-01`–`D-05` are resolved and the approval scope is recorded.
- [ ] TypeSpec is accepted and compiles before implementation starts.
- [ ] The real application completes the activation flow end to end.
- [ ] Profile creation and role transition are atomic and duplicate-safe.
- [ ] Current identity state is consistent after activation and later sign-in.
- [ ] Acceptance criteria have named backend/frontend/journey evidence.
- [ ] Authorization, privacy, minor protection, and sensitive logging were reviewed.
- [ ] Mobile, accessibility, localization, failure, retry, and stale states were verified.
- [ ] Architecture, plan index, and coverage status reflect the delivered slice.

## Verification evidence

| Evidence               | Result                 |
| ---------------------- | ---------------------- |
| Contract build         | Not run — shaping only |
| Backend tests          | Not run — shaping only |
| Frontend tests         | Not run — shaping only |
| End-to-end/manual flow | Not run — shaping only |

## Revision history

| Revision | Date       | Change                                                                                                          |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| 2        | 2026-07-21 | Added documentation-sufficiency review and bounded human decision gate; moved the slice to `AWAITING_DECISION`. |
| 1        | 2026-07-21 | Initial concrete shaping plan after the implemented Google-auth slice.                                          |
