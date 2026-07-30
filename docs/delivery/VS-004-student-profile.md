# VS-004 — Maintain the student profile and default explanation language

## Metadata

| Field                        | Value                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Status                       | `CONTRACT_READY`                                                                                                         |
| Human gate                   | `APPROVED`                                                                                                               |
| Plan revision                | 4                                                                                                                        |
| Updated                      | 2026-07-31                                                                                                               |
| Primary actor                | Authenticated `STUDENT`                                                                                                  |
| Story IDs                    | `US-PROF-02`, `US-LANG-01`                                                                                               |
| Requirement sections         | English: 1.2 profile changes, 1.4 default explanation language, 4.4 language separation; Chinese: 1.2、1.4、4.4 对应条款 |
| Depends on                   | [`VS-001`](VS-001-student-activation.md)                                                                                 |
| Related ADRs                 | None                                                                                                                     |
| TypeSpec source              | `contracts/profile.tsp`                                                                                                  |
| API operations               | `getMyStudentProfile`, `updateMyStudentProfile`                                                                          |
| Backend/slice owner          | Backend vertical-slice worker; existing `profile` module                                                                 |
| Frontend owner               | Frontend consumer worker; implementation worktree to be assigned                                                         |
| Initial contract checkpoint  | `VS-004-R3-initial` — TypeSpec `a2e093e79a2f1d7bf860fbbc35ed5cf300cd2ac3`                                                |
| Accepted contract checkpoint | `VS-004-R4-accepted` — TypeSpec `a2e093e79a2f1d7bf860fbbc35ed5cf300cd2ac3`                                               |

## User-observable outcome

An authenticated student can update the allowed fields in their own production
profile and save a supported default explanation language, then see the saved
values on the next read without changing interface language, exam language, or
existing learning records.

## Why this slice is the current boundary

`VS-001` created the student profile and already owns its persisted explanation
language. Editing those values is therefore one closed update lifecycle on the
existing `StudentProfile` aggregate rather than a new capability or module.
The settings flow is independently valuable before academic content exists:
the student can keep their profile accurate, persist the default that later
learning consumers must use, and verify the saved state through the real
application.

The boundary does not include temporary session language, exam-language
enrollment, target exam dates, or contact verification. Those behaviors have
different state, consequences, and roadmap owners. No merge or split
recommendation is required: adding any of them would introduce immediate
learning-session, goal, entitlement, or identity dependencies, while profile
and default-language maintenance already form a complete settings outcome.

## Capability and adjacent contract horizon

- Owning capability or lifecycle: the active student profile from creation in
  `VS-001` through student-owned maintenance.
- Closely related stories inspected but not accepted into this slice:
  `US-PROF-01` establishes the profile; `US-PROF-03` and `US-PROF-04` belong to
  the separate parent-profile lifecycle; `US-LANG-02` owns a temporary
  learning-session override; `US-LANG-03` and `US-GOAL-01` own confirmed exam
  language and target exam date respectively.
- Relevant actors, states, transitions, and invariants included now: one
  authenticated `STUDENT`, one existing profile, atomic allowed-field updates,
  validation without partial persistence, and independent explanation-language
  storage.
- Deferred transitions and why they remain independently valuable: parent
  maintenance needs parent authorization/contact verification; temporary
  language needs a learning-session boundary; exam language needs subject,
  content, diagnostic, entitlement, and plan impact review; target exam date
  belongs to goal feasibility; contact changes belong to identity and
  reverification; deletion has its own consequence workflow.
- Compatibility/additive-evolution strategy for deferred work: keep interface,
  explanation, and exam language separately named; keep subject language and
  goals out of `StudentProfile`; use a partial profile-update request so later
  fields do not force current clients to resend unrelated state.
- Why a smaller or larger boundary would be worse: profile-only editing would
  leave the already persisted default explanation language without its
  normative Settings update flow; adding learning-session or exam-language
  behavior would create contracts for aggregates and production content that
  do not exist yet.

## In scope

- Read the authenticated student's own canonical production profile.
- Update `preferredName`, `birthYear`, `currentGrade`, `city`, and
  `defaultExplanationLanguage`.
- Preserve `id`, `accountId`, role, creation time, authentication identities,
  sessions, and all learning/commerce/relationship state.
- Validate only supplied fields, trim text consistently with activation, and
  commit all effective changes in one transaction.
- Return the complete current profile after a successful update.
- Reject unsupported, blank, overlong, or implausible values without changing
  any profile field.
- Enforce student-only, own-profile authorization and private no-store
  responses.
- Record a privacy-minimized profile-update security/domain event.
- Promote or rewrite only the accepted production profile and default-language
  settings surfaces; keep prototype-only learning and exam-language state
  isolated.

## Out of scope

- Interface locale persistence or coupling browser locale to profile state.
- Temporary explanation-language switching within a course or agent session.
- Subject/exam-language selection, rematching, warnings, or plan effects.
- Target exam date, availability, university/major goals, subject matching,
  diagnostics, or study-plan recalculation.
- Email, phone, Google identity, credential, or other verified-contact changes.
- Parent, tutor, or administrator profile maintenance.
- Parent linking, account export/deletion, entitlements, and payments.
- Creating or translating academic content, retroactively rewriting learning
  evidence, or claiming that prototype lessons are production consumers.
- A generic profile service, event bus, cache, or new persistence technology.

## Preconditions and dependencies

- Existing implemented state: `VS-001` supplies the `STUDENT` role, one
  `student_profile` row, `getMyStudentProfile`, the profile module, Flyway V3,
  and the `id`/`en`/`zh-CN` explanation-language enum.
- Required data/content/provider setup: no provider or academic content is
  required. Real explanation-content consumption begins in later learning
  slices.
- Feature flags or safe fallback: none. The existing read-only production
  profile remains safe until the accepted contract and both implementations
  replace it.

## Technology and dependency impact

- Existing stack sufficient, with evidence: Spring MVC, the profile application
  service, JPA/PostgreSQL, TypeSpec, generated frontend declarations, React
  forms, i18next, and current problem responses already implement the creation
  and read sides of this aggregate.
- New or replaced technology and exact first use: none.
- Alternatives considered, including no new dependency: extend the existing
  profile module and contract; do not introduce a preferences service, generic
  patch library, event broker, cache, or separate datastore.
- Security, privacy, bundle/runtime, build/deploy, operating, and licensing
  impact: no new dependency, process, port, credential, or license. The response
  remains private and non-cacheable.
- Migration, compatibility, rollback, removal, and owner: no schema migration is
  expected because every candidate field already exists. Rollback removes the
  new operation/UI while preserving previously valid profile values. The
  profile module owns compatibility.
- ADR: `Not required — the existing module, table, and stack directly support
the first update use case without a hard-to-reverse architecture change.`

## User flow

1. An authenticated student opens the production Profile destination.
2. The application loads the canonical student profile and distinguishes
   account identity from editable learner-profile data.
3. The student edits an allowed profile field or opens Language settings and
   chooses `id`, `en`, or `zh-CN`.
4. The UI explains that interface language and subject/question language are
   unchanged, validates the form, and submits only the intended changes.
5. The API authorizes the student, locks and validates the owned profile, saves
   the effective changes atomically, and returns the complete current profile.
6. The UI acknowledges the saved values locally. A reload or later sign-in
   reads the same values.
7. Validation, authorization, network, or server failure preserves the existing
   persisted profile and provides a specific correction or retry path.

## Acceptance and implementation matrix

| AC ID | Given / When / Then                                                                                                                                                                            | UI evidence                                                                                             | API/domain behavior                                                                                                                                     | Persistence/audit                                                                                                          | Test evidence                                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| AC-01 | Given an authenticated student with an existing profile, when the Profile destination opens, then the canonical learner-profile values are shown separately from account email and role.       | Loading, ready, and recoverable failure states on the production route.                                 | Authenticated own-profile read; no prototype fallback presented as production.                                                                          | No write; private response uses `no-store`.                                                                                | Focused API read regression plus frontend loading/ready/failure tests.                                          |
| AC-02 | Given valid allowed profile changes, when saved, then the next read returns the new values and unchanged fields retain their prior values.                                                     | Field labels, one Save action, in-flight state, and restrained saved acknowledgement.                   | Partial update validates supplied fields and returns the complete profile.                                                                              | One atomic row update; profile ID, account, role, and creation time are unchanged; changed field names only are auditable. | Backend success and partial-update tests plus frontend success test.                                            |
| AC-03 | Given a supported default explanation language, when saved, then it becomes the persisted default while interface locale and exam language remain unchanged.                                   | Language setting names all three dimensions and confirms only the default explanation language changed. | Accept only `id`, `en`, or `zh-CN`; no interface/exam-language field exists in the request.                                                             | Existing learning records are untouched; a no-op retry does not create misleading change evidence.                         | Contract enum assertion, backend independence test, and frontend language-save test.                            |
| AC-04 | Given blank, overlong, unsupported, or otherwise invalid supplied data, when save is attempted, then the existing complete profile remains unchanged and actionable field errors are returned. | Safe values remain entered; inline errors and a retry path are accessible.                              | Stable `400` problem response; validation is atomic.                                                                                                    | No partial update and no raw profile values in logs/events.                                                                | Parameterized backend validation/rollback tests and frontend validation/failure test.                           |
| AC-05 | Given an unauthenticated or non-student account, when profile update is attempted, then access is denied without exposing another profile.                                                     | Sign-in or safe role-boundary recovery.                                                                 | Existing bearer `401` and student-role `403` behavior is preserved.                                                                                     | No read/write of another profile; no private response caching.                                                             | Focused `401`/`403` integration tests.                                                                          |
| AC-06 | Given existing diagnostics, mastery, attempts, plans, orders, or other records, when grade, city, or explanation language changes, then those records are not deleted or rewritten.            | The UI states that history is retained and does not claim recalculation that is not implemented.        | The profile transaction has no cross-module mutation path.                                                                                              | Only `student_profile` and the minimal update event change.                                                                | Integration assertion over current owned tables plus future consumers' contract tests when those modules exist. |
| AC-07 | Given duplicate, no-op, or concurrent saves, when processed, then no duplicate profile is created, unrelated fields are not lost, and the returned profile is authoritative.                   | Repeat save remains safe; later response replaces local displayed state.                                | Partial updates serialize on the owned row; identical values are successful no-ops; overlapping same-field writes use last committed request semantics. | Unique account/profile invariant remains; `updatedAt` and audit change only for an effective update.                       | Backend duplicate/no-op/concurrency tests and frontend authoritative-response test.                             |
| AC-08 | Given a student notices an incorrect birth year, when they submit a correction within the existing rolling range, then it is saved without claiming legal age verification.                    | Editable birth-year control explains its limited purpose and validation.                                | The partial update applies the same Asia/Jakarta range as activation and returns the authoritative profile.                                             | No raw birth year in logs/events; no learning history deletion.                                                            | Bounded correction success/range tests plus frontend correction and error-state evidence.                       |

## Documentation sufficiency review

This review is complete for contract initialization. Approved `D-01` permits a
student to correct birth year within the existing bounded validation rule.

| Review area                                                   | Evidence inspected                                                                                               | Status  | Gap or decision ID                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| End-to-end actor flow and adjacent handoffs                   | Requirements 1.2/1.4/4.4; `US-PROF-02`; `US-LANG-01`; current `/app/profile` and `/app/profile/languages` routes | `CLEAR` | Settings are a valuable closed loop; production content consumption remains a `VS-008` handoff.              |
| Experience flow, screen states, recovery, and navigation      | `DESIGN.md`; design workflow; current read-only Profile page and prototype Languages page                        | `CLEAR` | Frontend review must choose the final composition without changing behavior.                                 |
| Requirement/story coverage and exclusions                     | Paired requirements; `USER_STORIES.md`; `COVERAGE.md`; `VS-001`; adjacent profile/language/goal stories          | `CLEAR` | Target exam date, temporary language, exam language, contacts, and other actors retain separate owners.      |
| Domain terms, states, invariants, and ownership               | `GLOSSARY.md`; `StudentProfile`; profile TypeSpec/service/repository                                             | `CLEAR` | `D-01` approved: birth year is self-correctable profile data and remains non-legal age evidence.             |
| Authorization, privacy, minors, consent, and retention        | Paired requirements; `docs/SECURITY.md`; `VS-001` decisions and logging rules                                    | `CLEAR` | `D-01` approved: apply the existing rolling range, preserve history, and audit no old/new birth-year value.  |
| Failure, retry, idempotency, stale state, and recovery        | `US-PROF-02`/`US-LANG-01` acceptance; current unique profile ownership; form guidance                            | `CLEAR` | Atomic partial updates, row serialization, authoritative responses, and effective-change events are defined. |
| Contract, migration, external side effects, and compatibility | `contracts/profile.tsp`; Flyway V3; generated declarations; current profile HTTP tests                           | `CLEAR` | `D-01` finalizes the additive request fields; no migration or provider side effect is expected.              |
| Technology/dependency need, alternatives, and ADR threshold   | Architecture/development guidance; current profile module and stack                                              | `CLEAR` | No dependency, service, datastore, or ADR is justified.                                                      |
| Frontend ownership, prototype promotion, and design impact    | Route manifest; `ProfilePage`; prototype `LanguagesPage`; `app -> features \| prototype -> shared` boundary      | `CLEAR` | Frontend owns the production rewrite/promotion; production features must not import prototype state.         |
| Acceptance evidence and observability                         | Existing `StudentProfileHttpIT`; sensitive DTO logging test; slice acceptance matrix                             | `CLEAR` | Focused success, validation, authorization, no-op/concurrency, logging, and UI-state evidence is planned.    |

## Human decision gate

Follow [`HUMAN_REVIEW.md`](HUMAN_REVIEW.md). Ask one question at a time and at
most three per review round. Approval applies only to the recorded decision;
the accepted boundary is now written back throughout revision 2.

| Field             | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| Gate status       | `APPROVED`                                                        |
| Decision owner    | Product owner with privacy/minor-safety review                    |
| Approval scope    | Post-activation student birth-year correction policy for `VS-004` |
| Approval evidence | Product-owner chat, Option A approved on 2026-07-31               |

| ID     | Blocking question and scenario                                                                                                                                                                                                                                                        | Agent recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Owner           | Status     | Resolution and artifacts updated                                                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `D-01` | A student entered `2008` instead of `2009` during activation and later notices the error. May the student correct `birthYear` in Profile settings, or is it restricted after activation? The choice changes the public request, minor-data behavior, audit evidence, and recovery UI. | **Option A (recommended):** allow the authenticated student to correct it within the existing rolling Asia/Jakarta range, keep the documented rule that it is not legal-age verification, preserve all history, and audit only that the field changed without recording either value. Any future consent or legal-age feature must establish its own stronger evidence. **Option B:** display it read-only and defer correction to a separately accepted support/admin flow; this reduces self-service manipulation but knowingly retains accidental errors until that flow exists. | Product/privacy | `APPROVED` | Option A approved in product-owner chat on 2026-07-31. Scope, acceptance, state, contract, backend, privacy, and test plans now include bounded self-correction without legal-age claims or value-bearing audit evidence. |

## State model

### Owned states

```text
ACTIVE_STUDENT_PROFILE(version N)
  -- valid effective partial update -->
ACTIVE_STUDENT_PROFILE(version N+1)

ACTIVE_STUDENT_PROFILE(version N)
  -- invalid, unauthorized, or failed update -->
ACTIVE_STUDENT_PROFILE(version N)

ACTIVE_STUDENT_PROFILE(version N)
  -- valid no-op or identical retry -->
ACTIVE_STUDENT_PROFILE(version N)
```

### Invariants

- An account has at most one student profile, and a student profile belongs to
  exactly one account.
- Only the authenticated owning `STUDENT` may read or update the profile.
- Profile maintenance never changes the account role, authentication identity,
  contact verification, or session state.
- Interface language, default explanation language, temporary explanation
  language, and per-subject exam language remain separate concepts.
- Changing profile fields never deletes or rewrites learning, plan, order,
  entitlement, or relationship history.
- An invalid request changes no profile field.
- A no-op request does not change `updatedAt` or emit a successful-change event.

### Concurrency, retry, and stale-state rules

- Idempotency boundary: repeating the same partial update is a successful no-op
  and returns the authoritative complete profile.
- Optimistic/stale update behavior: the server serializes updates on the
  account-owned profile row. Disjoint field updates are preserved; for
  overlapping fields, the last committed valid request wins and its full
  response is authoritative.
- Duplicate event/callback behavior: there is no callback or external side
  effect. Emit one update event only when at least one persisted value changes.

## TypeSpec contract plan

`D-01` is resolved. TypeSpec must compile and generated output must be reviewed
before implementation begins.

### Operations

| Operation                | Method and route                           | Auth                     | Success                                            | Required failures                           |
| ------------------------ | ------------------------------------------ | ------------------------ | -------------------------------------------------- | ------------------------------------------- |
| `getMyStudentProfile`    | `GET /api/v1/student-profile/me`           | Bearer; owning `STUDENT` | Existing `200 StudentProfile`                      | Existing `401`, `403`, `500`                |
| `updateMyStudentProfile` | Planned `PATCH /api/v1/student-profile/me` | Bearer; owning `STUDENT` | `200 StudentProfile` with private no-store headers | `400` field validation, `401`, `403`, `500` |

### Models and validation

| Model                           | Important fields                                                                            | Validation/nullability                                                                                                                                                                                                                      | Ownership                    |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `UpdateMyStudentProfileRequest` | Optional `preferredName`, `birthYear`, `currentGrade`, `city`, `defaultExplanationLanguage` | Omitted fields remain unchanged; an empty/identical request is a safe no-op; supplied strings are non-blank and retain existing maxima; enum values are closed; no explicit `null`; birth year uses the existing rolling Asia/Jakarta range | Profile module               |
| `StudentProfile`                | Existing profile ID, profile values, `createdAt`, `updatedAt`                               | Response remains complete; no account email, role, interface language, exam language, or learning state is added                                                                                                                            | Profile module               |
| Validation problem              | Supplied field and bounded violation code                                                   | Reuse the current problem envelope and field violations without exposing rejected values                                                                                                                                                    | Shared HTTP/profile boundary |

### Contract decisions

- Cookie/token behavior: use the current access token only; do not issue or
  rotate authentication state for a profile edit.
- Error codes and problem details: reuse stable validation, authentication,
  authorization, and internal problem shapes; problem detail must not echo
  profile values.
- Pagination/filtering if applicable: not applicable.
- Compatibility or migration impact: the new `PATCH` operation is additive.
  Existing activation and profile-read wire behavior remains unchanged.

## Contract collaboration

The backend agent drafts and owns this slice, resolves its human decision gate,
and initializes TypeSpec before frontend review. Contract ownership is not
product authority.

### Readiness reviews

| Review                                                     | Owner               | Status     | Evidence                                                                                                   |
| ---------------------------------------------------------- | ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| Slice drafted and human gate resolved                      | Backend/slice owner | `COMPLETE` | Revision 2 records approved `D-01` Option A.                                                               |
| Initial TypeSpec compiles and generated output is reviewed | Backend/slice owner | `COMPLETE` | `VS-004-R3-initial`; compilation, generation, generated-shape review, and web typecheck passed.            |
| Frontend consumer review                                   | Frontend owner      | `COMPLETE` | Zero-request acceptance — `VS-004-R3-initial` fully covers the Profile and Language settings update flows. |
| Contract requests resolved                                 | Backend/slice owner | `COMPLETE` | Zero-request acceptance recorded; no contract request submitted.                                           |
| Accepted contract checkpoint recorded                      | Backend/slice owner | `COMPLETE` | `VS-004-R4-accepted` matches the reviewed `VS-004-R3-initial` contract with zero `CR-NN`.                  |

### Contract change requests

| ID  | Consumer scenario or constraint | Proposed change | Backend decision and reason | Human decision ID | Status | Applied/review evidence |
| --- | ------------------------------- | --------------- | --------------------------- | ----------------- | ------ | ----------------------- |
| —   | No requests recorded.           | —               | —                           | —                 | —      | —                       |

## Backend plan

- Module and package ownership: extend the existing `profile`
  `api/application/domain/infrastructure` packages. Do not import identity
  repositories or create a generic preferences module.
- Application use cases and transaction boundaries: one transactional partial
  update loads and locks the authenticated account's profile, validates supplied
  fields, applies effective changes, persists once, and records the minimal
  event after successful change.
- Domain rules: reuse activation trimming, grade enum, explanation-language
  enum, and the approved rolling birth-year validation. Add explicit update
  behavior to the aggregate rather than controller field mutation.
- Ports/adapters: extend `StudentProfileStore` only for the locked own-profile
  lookup needed by the application transaction. No external provider port.
- Flyway migration: none expected; verify V3 constraints still match the
  accepted update boundary.
- Scheduled/async behavior, if any: none.

## Frontend plan

- Existing routes, layouts, components, and styles affected: production
  `/app/profile`, prototype `/app/profile/languages`, the route manifest,
  `ProfilePage`, profile API/types, shared localization resources, and focused
  route/component tests.
- Route/navigation entry, exit, and adjacent handoffs: Profile remains the
  stable top-level entry. The existing Languages link becomes a production
  default-explanation-language settings route or is composed into Profile after
  frontend review. Family and Access remain explicitly prototype-only and are
  not promoted.
- Production feature folder and shared-boundary ownership: extend
  `src/features/profile/`; move or rewrite accepted language UI there. Production
  features must not import prototype context or fixtures.
- Prototype code classified for reuse, rewrite, or deletion:
  `prototype/student/settings/LanguagesPage.tsx` is flow evidence only. Rewrite
  its accepted explanation/interface distinction against generated types and
  remove the superseded prototype route element when promoted. Exam-language
  and temporary-session sections remain deferred and must not appear available.
- Contract-backed mock or real API boundary: use the generated request/response
  schemas and real production API. A development fallback, if retained by
  repository convention, must be contract-backed and never silently persist
  fixture state as production.
- Forms, client state, and validation authority: initialize from the canonical
  profile read, validate obvious shape locally, submit partial changes, and
  replace displayed state with the authoritative response.
- Loading, empty, error, retry, and stale states: loading skeleton matching the
  form, impossible missing-profile recovery, inline validation, authorization
  recovery, offline/server retry with safe values preserved, in-flight Save,
  saved acknowledgement, and authoritative refresh after retry.
- Mobile, keyboard, screen-reader, localization, and low-bandwidth behavior:
  single-column form at narrow widths, persistent labels, 44px controls,
  logical focus/error movement, semantic status announcements, reduced motion,
  complete Indonesian/English/Simplified Chinese copy, and no image/font
  dependency.

## Experience and interaction plan

Follow root [`DESIGN.md`](../../DESIGN.md) and
[`docs/design/README.md`](../design/README.md).

- Existing design roles sufficient, with evidence: existing text-input,
  primary/secondary button, feedback, content-card, and lilac explanation roles
  cover this settings flow.
- `DESIGN.md` token/component/motion changes required before CSS: none expected.
- Shared primitive versus feature-owned styling: reuse shared form/feedback
  roles; keep layout details feature-owned.
- User goal and entry context: keep personal learner information accurate and
  choose the language used for explanations.
- Exit state and next handoff: remain in Profile/Language settings with a clear
  saved state; future production learning content reads the persisted default.
- One primary action and secondary actions: one `Save profile` or `Save
language` action per visible task region; navigation/back is secondary.
- Dominant surface/pastel semantic role: white form canvas with at most one
  lilac explanation block for the independence of language dimensions.
- State transition and acknowledgement behavior: local in-flight label followed
  by a restrained inline saved status; routine saves do not celebrate or force
  navigation.
- Purposeful micro-interactions or animation: quick inline validation and
  standard feedback reveal only.
- Reduced-motion behavior: remove transforms and reduce transitions to
  near-zero while retaining status text.
- Prototype-only assumptions, if any: current language/profile fixture values,
  English exam-track copy, and temporary-language controls are not production
  data and must not be promoted.
- Mobile/desktop and Indonesian/English/Chinese visual-review evidence: pending
  frontend implementation; verify one narrow and one desktop viewport, keyboard
  order, reduced motion, and long localized labels.

## Authorization, privacy, and safety

- Actor authorization: bearer-authenticated `STUDENT` only; the account ID comes
  from the verified JWT and the server never accepts a profile/account ID from
  the request.
- Field-level/minimum-data response: return only the existing learner-profile
  fields required by the settings UI; account email/role continue through the
  identity boundary rather than being duplicated.
- Minor/guardian consequence: no new data is collected. `D-01` determines
  correction of the already collected birth year. Birth year remains
  age-appropriate personalization data, not legal age or guardian-consent
  evidence.
- Audit/security events: one effective profile-update event may record
  pseudonymous account ID, changed field names, outcome, and time. Do not record
  old/new values.
- Sensitive logging restrictions: never log request/response bodies, preferred
  name, birth year, city, bearer tokens, email, or learning history.

## Observability

| Event/metric                          | Trigger                                        | Allowed properties                                    | Prohibited content                                           |
| ------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `student_profile_update_succeeded`    | At least one effective field change commits    | Pseudonymous account ID, changed field names, latency | Old/new values, name, birth year, city, email, tokens        |
| `student_profile_update_failed`       | Validation, authorization, or internal failure | Stable error code, latency                            | Request body, rejected values, identity/provider credentials |
| Profile update outcome/latency metric | Every attempted update                         | Outcome class, changed-field count, latency bucket    | Field values or identifying content                          |

## Test plan

### Contract and backend

- Run `pnpm contract:build` after the post-decision TypeSpec change and inspect
  the generated operation, optionality, enums, media types, and failures.
- Extend `StudentProfileHttpIT` with successful partial profile and language
  updates, next-read persistence, unchanged-field preservation, invalid
  rollback, `401`, `403`, duplicate/no-op, concurrency, no auth/session change,
  no cross-module history mutation, and the resolved birth-year policy.
- Extend the sensitive DTO/logging test so rejected and successful values never
  enter logs.
- Run the focused profile integration class through PostgreSQL/Testcontainers;
  add `DatabaseMigrationIT` only if the accepted implementation unexpectedly
  requires a migration.

### Frontend component/integration

- Profile read loading/ready/failure and allowed-field save success.
- Field validation and recoverable server/offline failure with safe values
  preserved.
- Default explanation-language save in all supported values, with interface
  locale unchanged.
- Authorization recovery, no-op repeat save, and authoritative response
  replacement.
- Route-manifest production classification and prototype-boundary tests.

### End-to-end/manual evidence

- Authenticated student opens Profile, updates one allowed profile field,
  reloads, and sees the saved value.
- Student changes default explanation language, reloads/signs in again, and sees
  the same persisted default while interface locale remains independently
  selectable and no exam-language change is claimed.
- Invalid and simulated recoverable failure paths preserve the previous
  persisted profile and safe form input.
- Verify narrow mobile and desktop, keyboard completion, reduced motion, and
  Indonesian/English/Simplified Chinese layout-sensitive copy.

## Implementation sequence

1. **Completed in revision 1:** the backend agent drafted the slice, completed
   adjacent-contract and documentation-sufficiency review, recorded `D-01`, and
   paused contract/code work.
2. **Completed in revision 2:** the product/privacy owner approved `D-01`
   Option A; the backend agent recorded bounded self-correction and returned the
   gate to `SHAPING`.
3. **Completed in revision 3:** the backend agent initialized additive TypeSpec,
   regenerated and reviewed its output, ran the contract checks, and recorded
   `VS-004-R3-initial`.
4. The frontend agent reviews the slice and initialized contract, completes the
   final route/form/state plan, and records any `CR-NN`.
5. The backend agent resolves or escalates every request, applies accepted
   changes, regenerates, obtains frontend re-review, records the accepted
   checkpoint, and moves the slice to `CONTRACT_READY`.
6. Backend and frontend workers implement separately from the same revision and
   checkpoint; the backend extends the existing aggregate/service/HTTP boundary
   while the frontend rewrites the accepted production settings surfaces.
7. Integrate the real HTTP flow early and add focused backend, frontend, privacy,
   route-boundary, and journey evidence.
8. Advance through `IN_PROGRESS` and `VERIFYING` only with named evidence; mark
   `DONE` only after the product owner completes the real profile/language
   journey and every acceptance criterion is evidenced.

## Definition of done

- [ ] Requirement/story references remain correct.
- [ ] Documentation sufficiency review is complete and every material
      gap/conflict is resolved or explicitly out of scope.
- [ ] Human gate is `NOT_REQUIRED` or `APPROVED`; approval scope and updated
      artifacts are recorded.
- [ ] Scope and exclusions match the delivered flow.
- [ ] The existing stack is confirmed sufficient; no speculative dependency or
      service is introduced.
- [ ] TypeSpec compiles and generated artifacts match the accepted contract.
- [ ] Initial and accepted contract checkpoints are recorded, frontend consumer
      review is complete, and every contract request is resolved.
- [ ] Backend, frontend, migration disposition, and tests implement the same
      states and errors from that checkpoint.
- [ ] All acceptance criteria have named evidence.
- [ ] Authorization, privacy, minor safety, and audit behavior were reviewed.
- [ ] Mobile, accessibility, localization, low-bandwidth, reduced-motion, and
      failure states were verified.
- [ ] Frontend route/component/style ownership and prototype
      reuse/rewrite/deletion are recorded.
- [ ] UI follows root `DESIGN.md`; no shared design-system change is expected.
- [ ] Explanation, interface, temporary, and exam language remain independent.
- [ ] Observability contains no unnecessary private content.
- [ ] `docs/ARCHITECTURE.md`, `docs/PLAN.md`, and
      `docs/requirements/COVERAGE.md` reflect the delivered result.
- [ ] Exact verification commands and results are recorded.

## Verification evidence

| Evidence                     | Result                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shaping/source review        | Completed 2026-07-31: paired requirements 1.2/1.4/4.4, `US-PROF-01`–`04`, `US-LANG-01`–`03`, `US-GOAL-01`, coverage, glossary, VS-001, design, architecture/security/development, profile TypeSpec, backend, V3 migration/tests, routes, production Profile page, and prototype Languages page inspected.                                   |
| Contract build               | `PASS` — `pnpm contract:build` compiled TypeSpec 1.14.0 and emitted OpenAPI successfully; `pnpm api:generate` regenerated web declarations; `pnpm typecheck:web` passed. `pnpm check:generated` reproduced identical hashes, then exited 1 only at its expected clean-tree guard because the intentional generated changes are uncommitted. |
| Initial contract checkpoint  | `VS-004-R3-initial`: TypeSpec `a2e093e79a2f1d7bf860fbbc35ed5cf300cd2ac3`; OpenAPI `c13ff9c30d5e1879be6439aee3e84516b3be645b`; web declarations `233d3610f673ae42d04806047a34aac7415fd24f`.                                                                                                                                                  |
| Frontend contract review     | `COMPLETE` — zero-request acceptance of `VS-004-R3-initial`; contract fully satisfies Profile and Language settings flows without `CR-NN`.                                                                                                                                                                                                  |
| Accepted contract checkpoint | `VS-004-R4-accepted`: TypeSpec `a2e093e79a2f1d7bf860fbbc35ed5cf300cd2ac3`; OpenAPI `c13ff9c30d5e1879be6439aee3e84516b3be645b`; web declarations `233d3610f673ae42d04806047a34aac7415fd24f`.                                                                                                                                                 |
| Technology/ADR review        | Completed — existing stack is sufficient; no ADR or new dependency.                                                                                                                                                                                                                                                                         |
| Backend tests                | Not run — shaping-only change.                                                                                                                                                                                                                                                                                                              |
| Frontend tests               | Not run — shaping-only change.                                                                                                                                                                                                                                                                                                              |
| Frontend visual review       | Not run — frontend implementation has not started.                                                                                                                                                                                                                                                                                          |
| End-to-end/manual flow       | Not run — implementation has not started.                                                                                                                                                                                                                                                                                                   |

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                                                |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4        | 2026-07-31 | Recorded completed zero-request frontend consumer review of `VS-004-R3-initial`, established matching accepted checkpoint `VS-004-R4-accepted`, and moved the slice to `CONTRACT_READY` for separate backend/frontend implementation worktrees.                       |
| 3        | 2026-07-31 | Initialized and compiled additive `PATCH /api/v1/student-profile/me`, generated and reviewed OpenAPI/web declarations, confirmed generated TypeScript consumption, recorded `VS-004-R3-initial`, and opened frontend consumer review without starting implementation. |
| 2        | 2026-07-31 | Recorded product-owner approval of `D-01` Option A: a student may correct birth year within the existing rolling range; it remains non-legal age evidence, history is preserved, and audit evidence excludes both values. Returned the slice to `SHAPING`.            |
| 1        | 2026-07-31 | Selected and shaped the student-profile/default-language maintenance boundary, completed the adjacent-contract and documentation-sufficiency review, and opened `D-01` for the post-activation birth-year correction policy before TypeSpec or implementation.        |
