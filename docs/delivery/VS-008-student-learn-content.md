# VS-008 — Browse published syllabus coverage and study one LESSON with content progress

## Metadata

| Field                        | Value                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Status                       | `DONE`                                                                                                                        |
| Human gate                   | `APPROVED`                                                                                                                    |
| Plan revision                | 6                                                                                                                             |
| Updated                      | 2026-08-10                                                                                                                    |
| Primary actor                | Authenticated activated `STUDENT`                                                                                             |
| Story IDs                    | Partial `US-COURSE-01`, partial student `US-SYL-01`, partial `US-COURSE-02`, `US-LANG-02`                                     |
| Requirement sections         | English: 4.1–4.4 (student consumption subset); Chinese: corresponding 4.1–4.4 clauses                                         |
| Depends on                   | [`VS-004`](VS-004-student-profile.md), [`VS-005`](VS-005-academic-foundation.md)                                              |
| Related ADRs                 | None                                                                                                                          |
| TypeSpec source              | `contracts/academic-student.tsp` (new); shared enums/blocks with academic-admin; admin remains `contracts/academic-admin.tsp` |
| API operations               | Student package list/browse, LESSON read, content progress upsert, published image read under `/api/v1/academic`              |
| Backend/slice owner          | Backend vertical-slice worker; extend existing `academic` module (no new `learning` module)                                   |
| Frontend owner               | Frontend consumer worker; production Learn under `features/learn` (or equivalent); no prototype imports                       |
| Initial contract checkpoint  | `VS-008-R2-initial` — TypeSpec `dbdae3677677f3fd5a8dca056b13bf025d827076`                                                     |
| Accepted contract checkpoint | `VS-008-R3-accepted` — TypeSpec `dfcc97ef2fdd5c42d56a0c33710efaffb5bd4b97` (`updatedSinceCompleted` soft upgrade flag)        |

## User-observable outcome

An activated student browses the active published preparation package’s
official-source panel and localized syllabus outline with product coverage,
opens one LESSON resource authored by the platform admin (TEXT, MATH, and IMAGE
blocks in Bahasa Indonesia, English, and/or Simplified Chinese), switches
explanation language with a visible toggle without changing profile settings,
and leaves and resumes **content progress** without any mastery, checkpoint, or
practice claim.

## Why this slice was the boundary

`VS-005` published the first governed academic package for administrators only.
Student Learn had been PX-001 fixture-only until this slice. The first
production student academic loop must consume real published content without
inventing practice evidence, commerce entitlements, or a second content model.

This slice is one closed consumer loop:

```text
Published package (active revision)
  -> outline + product coverage + LESSON list
  -> open one LESSON (explanation-language versions)
  -> content progress (resume + content complete)
```

It is deliberately smaller than the historical PLAN wording “complete a focused
learning unit,” which blurred content completion with checkpoint mastery
(`US-COURSE-03` / `VS-009`). Viewing and marking content complete must never
imply mastery.

It is larger than a read-only syllabus brochure: without progress and a real
lesson reader, the loop is not a durable learning surface and forces another
slice before any student continuity exists.

**Subject extensibility (architecture, not expanded acceptance):** Student APIs,
progress storage, browse UI, and the lesson reader are subject-agnostic.
Package identity is `AcademicSubject` (pilot content may still be Mathematics
only). Adding Physics later is publish package + enum/profile—not a Learn
redesign. Dual Math exam-language **assessment** tracks remain later; this
slice does **not** split LESSON catalogs by exam language.

## Capability and adjacent contract horizon

- Owning lifecycle: student read of the active published academic revision plus
  per-student content progress on LESSON resources.
- Closely related stories inspected but not accepted:
  - Full `US-COURSE-01` prerequisites, estimated time, linked practice, dual
    exam-track catalog grouping.
  - Full `US-SYL-01` parent actor and personal mastery status vocabulary.
  - `US-COURSE-03` checkpoint evidence and mastery updates.
  - Full `US-COURSE-04` video/playback controls (VS-005 content is TEXT/MATH/IMAGE).
  - `US-TERM-*`, practice, mistakes, mocks, goals, entitlements.
- Included now: activated `STUDENT` access (pilot open-access), subject-keyed
  package browse, official-source panel, outline, product coverage from LESSON
  presence, LESSON body with explanation-language toggle, content progress
  states, student image read for published references.
- Deferred and independently valuable: checkpoint/practice (`VS-009`),
  terminology (`VS-010A`), reviewed video (`VS-010B`), mock execution (`VS-012`), goal/exam-language
  confirmation (`VS-014`), trial/entitlement (`VS-030`/`VS-031`), parent
  syllabus (`VS-025`+).
- Additive evolution:
  - Path/query by `subject` and stable `resourceId`.
  - Progress keyed by `(account, package, resource)` so republish does not wipe
    history when resource UUIDs remain stable.
  - `ContentAccessPolicy` allow-all STUDENT now; later entitlement plugs in
    without controller rewrite.
  - Content-block renderer shared by kind; new resource kinds later without
    forking the reader shell.
- Why smaller/larger is worse: syllabus-only leaves no study continuity; adding
  checkpoint or practice pulls scoring, answer keys, and mastery semantics into
  the first student content surface.

## In scope

- Authenticated activated `STUDENT` may call student academic APIs (any other
  role denied at the application layer).
- Pilot access: every activated student may read **published** packages (no
  entitlement or trial product). Document as pilot open-access.
- List published packages (subject-agnostic; pilot may return one Mathematics
  package).
- Browse one package by subject: official-source panel, localized outline,
  product coverage, LESSON summaries with content-progress chips.
- Open one LESSON: title, ordered content blocks (TEXT | MATH | IMAGE) for a
  requested explanation language (`id` | `en` | `zh-CN`).
- Explanation language: default from student profile (`VS-004`); temporary
  in-session toggle on the lesson reader; **never** write temporary choice to
  profile.
- Missing explanation-language version: explicit unavailable state; **no silent
  substitution** of another language.
- Upsert content progress: absent row = not started; `IN_PROGRESS` with optional
  resume block index; `CONTENT_COMPLETE`. Content complete ≠ mastery.
- Resume: restore `resumeBlockIndex` within the selected language version’s
  blocks; clamp after republish if content shortened.
- Student image GET only for images referenced by the active published revision
  of a package the student may access.
- Production Learn routes promoted from prototype gates; fixture Learn remains
  isolated until replaced.
- Student-safe projections only: never return drafts, questions, mocks, answer
  keys, admin audit, or unpublished package bodies.

## Out of scope

- Checkpoint questions, scoring, remediation routing, mastery, revalidation
  (`VS-009` / `US-COURSE-03`).
- Topic practice, hints, mistake notebook (`VS-009`).
- Opening TERMINOLOGY resources as study units (`VS-010A`).
- Video, audio, captions, playback speed, offline cache (`US-COURSE-04` / `VS-010B`).
- Exam-language track filtering or dual LESSON catalogs (Math EN vs Math CN as
  separate lesson trees). Assessment exam language remains on questions/mocks
  for later slices.
- Parent or admin consumption of student progress.
- Entitlements, trial gates, products, payments.
- Goal confirmation, subject enrollment, diagnostic, study plan, Today agent.
- Multi-subject **seed content** (architecture supports it; pilot content may
  remain Mathematics only).
- New `learning` or `assessment` module (defer until evidence-backed attempts).
- Object storage, CDN, queues, caches, AI tutor on the lesson page.
- Changing admin authoring contracts except where a shared enum/block reuse is
  required without expanding admin product scope.

## Preconditions and dependencies

- Existing state: `VS-004` student profile with `defaultExplanationLanguage`;
  `VS-005` academic package lifecycle, immutable published revisions, images,
  subject-extensible package model.
- Content: at least one **PUBLISHED** package with active revision and ≥1 LESSON
  resource with at least one explanation-language version for demo/tests.
  Synthetic fixture content in tests; production data is admin-authored only.
- Safe fallback: no published package → honest empty Learn; non-STUDENT → 403;
  unknown subject/resource → 404; missing language version → explicit empty
  body with available languages listed.

## Technology and dependency impact

- Existing stack sufficient: Spring Boot modular monolith `academic` module,
  TypeSpec, React, KaTeX (already used in admin preview), PostgreSQL/Flyway.
- New TypeSpec file for student operations; do not expose admin package DTOs to
  students.
- New Flyway migration (e.g. V8) for `student_content_progress` only.
- No new runtime dependency expected beyond existing KaTeX on web.
- Alternatives rejected: new microservice; per-student package JSON clone;
  premature `learning` module; Redis cache of package content.
- ADR: `Not required — student read projection and content progress are first
use of existing academic content, reversible and bounded.`

## User flow

1. Activated student opens production Learn.
2. System lists published packages (or opens the sole pilot package).
3. Student sees official-source panel, outline, product coverage, and LESSON
   entries with content-progress status; optional **Continue** for last
   in-progress/complete lesson.
4. Student opens a LESSON. Reader uses profile default explanation language
   when that version exists.
5. Student toggles ID / EN / 中文; content shows the matching version or an
   explicit unavailable state.
6. Student reads TEXT/MATH/IMAGE blocks; progress becomes in progress with
   resume block index as they advance (or on explicit save points defined in
   implementation).
7. Student leaves and returns: resume position restores without claiming
   mastery.
8. Student marks content complete (or reaches the defined complete rule):
   status becomes content complete; UI does not say mastered and does not
   unlock checkpoint/practice in this slice.

## Student content experience (presentation contract)

Admin authors structure; the student app provides a single study-desk layout.
This section is normative for frontend implementation of this slice.

### Pipeline

```text
Admin LESSON (versions[].blocks TEXT|MATH|IMAGE)
  -> student projector (active revision only)
  -> LessonReader + ContentBlockView
  -> language toggle + content progress
```

### Surfaces

| Surface       | Layout intent                                                                            | Dominant pastel                          |
| ------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| Learn browse  | Continue region (if any) + outline list/tree; not equal card grid                        | Lime/mint for Continue; sky/cream source |
| Lesson reader | Sticky chrome (back, title, language toggle, progress); single reading column ~560–720px | Cream/white reading; quiet chrome        |

### Block mapping

| Block | Student presentation                                             |
| ----- | ---------------------------------------------------------------- |
| TEXT  | Body prose; long-form measure ~68ch                              |
| MATH  | Safe KaTeX (same options as admin preview); display vs inline    |
| IMAGE | Authorized student image URL, alt required, caption when present |

### Language toggle

- Visible segmented control: ID · EN · 中文.
- Enable only languages present on the resource; missing = disabled or
  explicit unavailable with recovery.
- Temporary only for the lesson session; does not PATCH profile.
- Interface chrome remains i18n interface language (independent).

### Micro-interactions (DESIGN.md)

- Open lesson: content-region reveal ~220–260ms; skeleton matches title+blocks.
- Language switch: chip active state + content cross-fade ~160–180ms (instant
  swap under reduced motion).
- Resume: one-time scroll to resume block + brief highlight, then clear.
- Progress track animates; assistive text updates immediately.
- Content complete: one restrained mint acknowledgement; no confetti.
- Prohibited: perpetual float/glow, parallax, fake typing, motion-required
  meaning. Honor `prefers-reduced-motion`.

### Copy discipline

- Use **Content complete** / **In progress** / **Not started**.
- Never use Mastered, Learned, or Stable Mastery for this slice’s progress.

## Acceptance and implementation matrix

| AC  | Given / When / Then                                                                                                                                                                                                            | Required evidence                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| 01  | An activated `STUDENT` lists packages; only PUBLISHED packages with an active revision appear; subject field is present and not hard-coded to Mathematics in the API.                                                          | HTTP + contract tests               |
| 02  | `UNASSIGNED`, `ADMIN`, or unauthenticated caller hits student academic APIs; denied without data leak (`401`/`403`).                                                                                                           | Authorization tests                 |
| 03  | Student browses a published package; official-source panel shows authority, edition, last checked, and open action(s) for each configured official language edition (en and/or zh-CN); outline summaries are YukCSCA-authored. | API projection + UI component tests |
| 04  | Outline product coverage reflects LESSON presence (covered vs not / in development per documented formula); personal column is content progress only.                                                                          | Domain/unit + UI tests              |
| 05  | Student opens a LESSON; TEXT/MATH/IMAGE render safely; MATH uses bounded KaTeX; images require published reference authorization.                                                                                              | Integration + component tests       |
| 06  | Profile default explanation language selects the initial version when available; temporary toggle changes session view only and does not change profile.                                                                       | API + UI tests                      |
| 07  | Requested explanation language missing; response/UI is explicit unavailable with available languages; no silent fallback.                                                                                                      | Parameterized tests                 |
| 08  | Student progresses and returns; resume block index restores; republish that shortens blocks clamps index without error.                                                                                                        | Persistence + HTTP tests            |
| 09  | Student reaches content complete; status persists; no mastery field, checkpoint, or practice unlock is created.                                                                                                                | Domain + journey evidence           |
| 10  | No published package or empty LESSON set; Learn shows honest empty/in-development states, not fixture syllabus.                                                                                                                | Frontend empty states               |
| 11  | Prototype Learn fixtures are not imported by production Learn; production routes use generated student types.                                                                                                                  | Boundary/import review              |
| 12  | Mobile and desktop lesson reader remain single-column-first; language toggle and primary complete/continue action meet 44px targets; reduced motion preserves meaning.                                                         | Visual/a11y checklist               |

## Documentation sufficiency review

| Review area                                                   | Evidence inspected                                                               | Status  | Gap or decision ID |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- | ------------------ |
| End-to-end actor flow and adjacent handoffs                   | VS-005 published package; VS-004 explanation language; PLAN VS-008/009           | `CLEAR` | —                  |
| Experience flow, screen states, recovery, and navigation      | DESIGN.md; design guide; PX-001 Learn/Lesson/Syllabus prototype; product chat UX | `CLEAR` | —                  |
| Requirement/story coverage and exclusions                     | 4.1–4.4; US-COURSE-01/02/04, US-SYL-01, US-LANG-02 partial mapping               | `CLEAR` | Partial stories    |
| Domain terms, states, invariants, and ownership               | Glossary; academic package/revision; content progress ≠ mastery                  | `CLEAR` | —                  |
| Authorization, privacy, minors, consent, and retention        | Pilot open-access STUDENT; no entitlement; minimize logging                      | `CLEAR` | `D-01`             |
| Failure, retry, idempotency, stale state, and recovery        | Republish clamp; missing language; empty package                                 | `CLEAR` | —                  |
| Contract, migration, external side effects, and compatibility | New student TypeSpec; V8 progress; admin DTOs not reused                         | `CLEAR` | —                  |
| Technology/dependency need, alternatives, and ADR threshold   | KaTeX existing; no new module/service                                            | `CLEAR` | —                  |
| Frontend ownership, prototype promotion, and design impact    | features/learn; promote Learn routes; academic-admin style continuity            | `CLEAR` | —                  |
| Acceptance evidence and observability                         | AC matrix; no lesson body in logs                                                | `CLEAR` | —                  |

## Human decision gate

| Field             | Value                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Gate status       | `APPROVED`                                                                                                                            |
| Decision owner    | Product owner                                                                                                                         |
| Approval scope    | Closed-loop outcome, pilot access, content-progress model, explanation-language toggle (no exam-track lesson split), LESSON-only open |
| Approval evidence | Product-owner chat 2026-08-07 (grill-me decisions + language-toggle + content experience direction)                                   |

| ID     | Blocking question and scenario                                            | Recommendation                                                                                                                    | Owner         | Status     | Resolution                                                                |
| ------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------- | ------------------------------------------------------------------------- |
| `D-01` | Who may read published academic content before entitlements exist?        | Any activated `STUDENT` (pilot open-access); later entitlement via policy port.                                                   | Product owner | `APPROVED` | 2026-08-07; recorded in scope and auth plan.                              |
| `D-02` | What student state does lesson study persist without checkpoints?         | Content progress only: not started / in progress / content complete + resume block index; never mastery.                          | Product owner | `APPROVED` | 2026-08-07.                                                               |
| `D-03` | How do ID/EN/ZH lesson versions and Math exam tracks interact for VS-008? | One lesson catalog; explanation-language toggle on combined versions; no exam-language LESSON filter; assessment tracks deferred. | Product owner | `APPROVED` | 2026-08-07; reverses earlier dual-track filter preference for this slice. |
| `D-04` | Which resource kinds open as study content?                               | LESSON only; TERMINOLOGY/REMEDIATION deferred.                                                                                    | Product owner | `APPROVED` | 2026-08-07.                                                               |

## State model

### Owned states

```text
Package visibility (student):
  only status = PUBLISHED AND active_revision_id present

Content progress (per account + package + resource):
  (no row) NOT_STARTED
       -> IN_PROGRESS   (open / advance; resume_block_index optional)
       -> CONTENT_COMPLETE
  CONTENT_COMPLETE may still be re-opened for re-read; status stays complete
  Soft signal: when active package revision differs from last CONTENT_COMPLETE
  revision, project updatedSinceCompleted=true (never demotes status)

Explanation language (session only):
  profile.defaultExplanationLanguage
       -> temporary override on lesson reader (client/session)
       -> never written to profile in this slice
```

### Invariants

- Content complete never writes mastery, objective mastery, or checkpoint evidence.
- Student responses never include questions, mocks, correct answers, or drafts.
- Progress identity is stable `resource_id` within package, not revision number alone.
- Reads always use `package.active_revision_id` content (no per-student package copy).
- Interface language, explanation language, and exam language remain independent concepts.
- Product coverage is not personal progress; personal column is content progress only.

### Concurrency, retry, and stale-state rules

- Idempotency: `PUT` progress is upsert by `(account_id, package_id, resource_id)`.
- Republish: student always sees new active revision; resume index clamped to valid range.
- Soft upgrade (PO-accepted option A): `ContentProgress.updatedSinceCompleted` is true when
  status is `CONTENT_COMPLETE` and `last_revision_id` ≠ active revision. Re-read
  `IN_PROGRESS` writes keep `last_revision_id`; explicit `CONTENT_COMPLETE` re-mark binds to
  the active revision and clears the soft signal. Never demotes complete; never implies mastery.
- Optional `expectedPackageRevisionId` on progress write may be ignored or used for
  soft diagnostics; do not fail the student loop on routine republish.
- Duplicate PUTs with same status/index succeed without duplicate rows.
- Student shell pilot home: activated `STUDENT` lands on `/app/learn` (not profile/today).
  Mobile More is production-safe (`student-settings`); preview-only destinations are hidden.

### Product coverage formula (VS-008)

For each outline item, given the published active revision:

```text
If any LESSON resource references the outline item (or a documented child rule):
  productCoverage = FULLY_COVERED   # or PARTIALLY_COVERED when only some children have lessons
Else:
  productCoverage = NOT_COVERED     # label In Development only if product copy requires it;
                                    # do not invent partial practice/mock coverage
```

Practice/mock/checkpoint availability flags are **out of this slice** (always
absent / not claimed). Document the exact child-aggregation rule in
implementation comments and tests; prefer simplest consistent rule.

## TypeSpec contract plan

### Operations

| Operation                   | Method and route                                                                    | Auth      | Success                 | Required failures                                      |
| --------------------------- | ----------------------------------------------------------------------------------- | --------- | ----------------------- | ------------------------------------------------------ |
| `listPublishedPackages`     | `GET /api/v1/academic/packages`                                                     | `STUDENT` | `200` list              | `401`, `403`                                           |
| `getPublishedPackageBrowse` | `GET /api/v1/academic/packages/{subject}`                                           | `STUDENT` | `200` browse projection | `401`, `403`, `404` no published package               |
| `getPublishedLesson`        | `GET /api/v1/academic/packages/{subject}/lessons/{resourceId}?explanationLanguage=` | `STUDENT` | `200` lesson + progress | `401`, `403`, `404`, explicit missing language payload |
| `upsertContentProgress`     | `PUT /api/v1/academic/packages/{subject}/lessons/{resourceId}/progress`             | `STUDENT` | `200` progress          | `401`, `403`, `404`, `400` validation                  |
| `getPublishedAcademicImage` | `GET /api/v1/academic/images/{imageId}`                                             | `STUDENT` | image bytes             | `401`, `403`, `404`                                    |

Path parameter `{subject}` uses `AcademicSubject` (extensible). Do not use
Mathematics-only routes.

### Models and validation

| Model                          | Important fields                                                                                          | Validation / nullability                               | Ownership        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------- |
| `PublishedPackageSummary`      | `id`, `subject`, `activeRevision`, `examLanguages` from syllabus structure                                | published only                                         | academic student |
| `OfficialSourcePanel`          | authority, edition, sourceLinks (language + url), dates/status, lastChecked, permittedUse                 | student-safe subset; 1–2 language-edition open actions | projection       |
| `SyllabusOutlineNode`          | id, parentId, order, summary, productCoverage, lessons[]                                                  | summaries localized                                    | projection       |
| `LessonSummary`                | resourceId, title, outlineItemIds, contentProgress                                                        | kind LESSON only                                       | projection       |
| `LessonDetail`                 | resourceId, title, availableExplanationLanguages, content \| missingLanguage, progress, packageRevisionId | content null only when language missing                | projection       |
| `ContentBlock`                 | TEXT \| MATH \| IMAGE (reuse admin block shapes without admin provenance)                                 | same bounds as publish rules                           | shared shape     |
| `ContentProgress`              | status `IN_PROGRESS` \| `CONTENT_COMPLETE`, resumeBlockIndex, updatedAt, `updatedSinceCompleted`          | index ≥ 0 when present; soft flag never demotes status | student owned    |
| `UpsertContentProgressRequest` | status, resumeBlockIndex                                                                                  | reject unknown status; no NOT_STARTED write required   | student owned    |

### Contract decisions

- Cookie/token: existing access JWT + refresh cookie; no new cookie.
- Errors: `application/problem+json`; stable codes for not found, forbidden,
  validation; later `ENTITLEMENT_REQUIRED` reserved in policy design but not
  emitted in pilot open-access.
- Filtering: `explanationLanguage` query on lesson GET; no examLanguage lesson filter.
- Compatibility: new file/namespace; admin contract unchanged for student scope.
- Security headers: package/lesson JSON `Cache-Control: no-store`; images
  `nosniff` and authorized only.

## Contract collaboration

| Review                                                     | Owner               | Status     | Evidence                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------- | ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice drafted and human gate resolved                      | Backend/slice owner | `COMPLETE` | Revision 1; `D-01`–`D-04` approved in product chat 2026-08-07                                                                                                                                                                                                                                                                                  |
| Initial TypeSpec compiles and generated output is reviewed | Backend/slice owner | `COMPLETE` | `VS-008-R2-initial`: `contracts/academic-student.tsp` `dbdae3677677f3fd5a8dca056b13bf025d827076`; OpenAPI `5c2c40826514da73ea9eac5a05b26d5a0e5789c5`; web declarations `0160b7ced743af7fd7cb72a2915e40c36dd029ef`. Five operations under `/api/v1/academic/**`; admin contract unchanged. `pnpm generate` stable; `pnpm typecheck:web` passed. |
| Frontend consumer review                                   | Frontend owner      | `COMPLETE` | Revision 3 zero-request acceptance of `VS-008-R2-initial` against Learn browse → LESSON reader → content progress closed loop, generated `openapi.ts` shapes, DESIGN/content-experience plan, and prototype isolation constraints. See consumer review matrix below.                                                                           |
| Contract requests resolved                                 | Backend/slice owner | `COMPLETE` | Zero `CR-NN` submitted; contract fully covers accepted student scenarios.                                                                                                                                                                                                                                                                      |
| Accepted contract checkpoint recorded                      | Backend/slice owner | `COMPLETE` | Superseded by `VS-008-R3-accepted` (2026-08-10 soft upgrade): TypeSpec `dfcc97ef2fdd5c42d56a0c33710efaffb5bd4b97`; OpenAPI `d38dc7bb8be247c05825936c542c82725fb1ce12`; web `d0fe622158d6f8cdb8cffa7b20123aac54c395b5`. Prior R2 hashes retained in history.                                                                                    |

### Contract change requests

| ID  | Consumer scenario or constraint | Proposed change | Backend decision and reason | Human decision ID | Status | Applied/review evidence |
| --- | ------------------------------- | --------------- | --------------------------- | ----------------- | ------ | ----------------------- |
| —   | No requests recorded.           | —               | —                           | —                 | —      | —                       |

### Frontend consumer review (`VS-008-R2-initial`)

Reviewed 2026-08-07 against slice AC 01–12, user flow steps 1–8, Student content
experience plan, `contracts/academic-student.tsp`, generated
`contracts/generated/openapi.yaml` / `apps/web/src/shared/api/generated/openapi.ts`,
admin shared block shapes, profile `defaultExplanationLanguage`, prototype Learn
routes, and VS-004/VS-005 production API patterns.

#### Contract sufficiency (zero `CR-NN`)

| Consumer need                                                    | Contract support                                                                                           | Verdict                                    |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| List published packages and route by subject                     | `listPublishedPackages` → `PublishedPackageSummary[]` with `subject`, `activeRevision`, `examLanguages`    | Sufficient                                 |
| Browse official source + outline + coverage + lessons + continue | `getPublishedPackageBrowse` → `officialSource`, `outline[]`, `continueLesson`                              | Sufficient                                 |
| Open LESSON with TEXT/MATH/IMAGE                                 | `getPublishedLesson` body `AVAILABLE` + `AcademicAdmin.ContentBlock[]` (`kind` discriminant)               | Sufficient                                 |
| Explanation-language toggle without silent fallback              | Required query `explanationLanguage`; body `LANGUAGE_UNAVAILABLE` + parent `availableExplanationLanguages` | Sufficient                                 |
| Default language from profile (VS-004)                           | Client reads profile then passes query; no server profile write on temporary toggle                        | Sufficient (client composition)            |
| Content progress chips + resume + complete                       | `ContentProgress` on browse/lesson; `upsertContentProgress` writable `IN_PROGRESS` \| `CONTENT_COMPLETE`   | Sufficient                                 |
| Student image render with alt/caption                            | IMAGE block `imageId`/`altText`/`caption`; `getPublishedAcademicImage` bearer bytes                        | Sufficient (fetch→blob URL, same as admin) |
| Authz failures without data leak                                 | `401`/`403`/`404` problem+json on all ops; validation `400` on progress                                    | Sufficient                                 |
| Empty / no published package                                     | List `[]`; browse `404`; outline nodes may have empty `lessons`                                            | Sufficient                                 |
| No mastery/checkpoint/practice leakage                           | Student projections omit questions, mocks, keys, drafts, admin publisher id                                | Sufficient                                 |

#### Journey / state matrix (implementation binding; not contract gaps)

| Concern            | Required cases                                                                                                                                                            | Contract + routing notes                                                                                                                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Entry              | Nav Learn; direct `/app/learn`, `/app/learn/:subject`, `/app/learn/:subject/lessons/:resourceId`; restored `/`                                                            | Contract OK. Production must promote Learn off `student-workspace-preview` / `PreviewWorkspaceGuard` (today prototype onboarding gate); profile-style production access for activated `STUDENT`. Root `/` stays Today/Profile per current product state—Learn is primary-nav, not root redirect. |
| Identity           | Signed out → login; `STUDENT` OK; `ADMIN`/`UNASSIGNED`/other → deny/redirect without package bodies                                                                       | APIs return `401`/`403`; UI must not call with wrong role or show fixture syllabus on failure.                                                                                                                                                                                                   |
| Navigation         | Shell Learn active; browser back from lesson → subject browse; sign-out clears in-memory token                                                                            | Paths subject-agnostic; `continueLesson.resourceId` + browse `subject` build lesson links.                                                                                                                                                                                                       |
| Reload             | Before load / after load / after progress PUT / after error                                                                                                               | `Cache-Control: no-store` JSON; progress authority is server `ContentProgress` response after PUT.                                                                                                                                                                                               |
| Prototype boundary | Preview absent/present; production Learn never imports `prototype/student/learning/*`                                                                                     | Supersede prototype Learn/Syllabus/Lesson routes for accepted loop; leave unrelated prototype workspace intact.                                                                                                                                                                                  |
| Data authority     | Packages/browse/lesson/progress/images = production API; temporary explanation language = session UI only; profile default = VS-004; DEV offline mock only per repo rules | Never present fixture mastery or checkpoint as production state.                                                                                                                                                                                                                                 |
| Layout             | Mobile/desktop single column; language toggle + complete 44px; reduced motion                                                                                             | Covered by content-experience plan; no contract dependency.                                                                                                                                                                                                                                      |

#### Explicit non-requests (accepted assumptions)

- **Resume language not persisted:** temporary explanation language remains session-only (state model / `US-LANG-02`). Leave/return reopens with profile `defaultExplanationLanguage` and clamps `resumeBlockIndex` to the loaded version’s block length. No `resumeExplanationLanguage` field required for this slice.
- **Continue target:** server `continueLesson` is last **in-progress** lesson (or null). CONTENT_COMPLETE re-read uses outline chips, not Continue. Mild copy difference from user-flow “in-progress/complete” is presentation-only.
- **Images require Authorization:** student image GET is Bearer-only (like admin). Implement object-URL fetch; do not use bare `<img src>` without credentials.
- **LocalizedText titles/summaries:** resolve with interface-language preference + fallback chain (same multi-locale pattern as admin); not a wire-shape gap.
- **Checkpoint / terminology / video / exam-track split:** correctly out of contract; production UI must not invent those controls.

#### Generated TypeScript consumption check

- Operations: `AcademicStudentApi_listPublishedPackages`, `_getPublishedPackageBrowse`, `_getPublishedLesson`, `_upsertContentProgress`, `_getPublishedAcademicImage`.
- Discriminated unions usable: `LessonBody` via `availability`; `ContentBlock` via `kind`.
- Progress write body and validation problem (`CONTENT_PROGRESS_VALIDATION_FAILED` + `violations[].path`) map to existing problem-handling patterns.
- No handwritten competing DTOs required.

## Backend plan

- **Module:** extend `academic` with student API package (`AcademicStudentController`,
  `AcademicStudentService` / progress service, `PublishedPackageProjector`,
  `ContentAccessPolicy`). Do not create `learning` yet.
- **Use cases:** list published packages; browse by subject; get LESSON projection;
  upsert progress; authorize and serve published image bytes.
- **Domain:** content progress entity/state machine; never mastery.
- **Ports:** identity current account; optional profile explanation-language
  read only if server must default without client hint (client may send
  `explanationLanguage` always). Later: entitlement port behind
  `ContentAccessPolicy`.
- **Persistence:** V8 `student_content_progress` with
  `UNIQUE (account_id, package_id, resource_id)`, subject denormalized for
  queries, optional `last_revision_id` metadata, no package content copy.
- **Projection:** load `active_revision_id` JSONB; filter resources to LESSON;
  strip questions/mocks/keys/draft fields.
- **AuthZ:** role `STUDENT` required; policy allow-all for pilot.
- **Async:** none.

## Frontend plan

- **Routes (canonical production):**
  - `/app/learn` — list published packages (auto-enter sole pilot subject when
    length === 1).
  - `/app/learn/:subject` — package browse (official source, outline, coverage,
    progress chips, Continue).
  - `/app/learn/:subject/lessons/:resourceId` — LESSON reader (`?` language is
    client state, not required in the path; API query always sent).
  - Supersede prototype `/app/learn`, `/app/learn/syllabus`, `/app/learn/:lessonId`
    for this closed loop. Syllabus-as-separate-page is optional merge into subject
    browse (outline already on browse); do not keep a fixture syllabus route as
    production.
- **Access / guards:** reclassify Learn production routes off
  `student-workspace-preview` + `PreviewWorkspaceGuard` so an activated
  production `STUDENT` reaches them without prototype onboarding completion
  (same class of fix as VS-004 profile routes). Keep `StudentExperienceGuard` +
  shell. Wrong role / signed-out follow existing auth patterns.
- **Feature folder:** `apps/web/src/features/learn/` — API adapter, subject list,
  browse/outline, lesson reader, content-block views, progress helpers. Share
  KaTeX only via `shared` (no `features/academic-admin` imports). Image load:
  bearer fetch → object URL (mirror admin thumb pattern against student image
  route).
- **Prototype:** `prototype/student/learning/*` stays Preview-only until routes
  are swapped; **no** imports into `features/learn`. Remove prototype checkpoint
  UI and mastery vocabulary from production surfaces.
- **API:** generated `AcademicStudent.*` types only; real fetch first; DEV
  offline/`404`/`401` contract-backed fallback only; never mock-success on
  `403`/`5xx`/validation/malformed payloads.
- **Client state:**
  - Canonical: server list/browse/lesson/progress/image responses.
  - Session-only: temporary explanation language on the reader (never PATCH
    profile).
  - Profile: `defaultExplanationLanguage` for initial lesson GET only.
  - Progress after PUT: replace local progress with response body.
- **States:** loading skeletons (title+blocks), empty package list, browse 404 /
  empty outline, language unavailable + recovery toggles, image failure, load
  retry, progress validation, resume clamp after language switch or shortened
  body, content-complete acknowledgement (mint, not confetti).
- **Copy:** Content complete / In progress / Not started only — never Mastered /
  Learned / Stable Mastery.
- **a11y/i18n:** all chrome in id/en/zh-CN resources; KaTeX aria; 44px targets;
  keyboard order back → language → content → complete; `prefers-reduced-motion`.

## Experience and interaction plan

- Design roles sufficient: content-card, study-chip, progress-track, color-block
  sky/cream for official source, lime/mint for continue/complete, button roles.
- No `DESIGN.md` token change expected unless a lesson-specific token is later
  justified; prefer existing tokens.
- User goal: find topic → study lesson → resume later.
- Primary actions: **Continue** / **Open lesson** on browse; **Mark content
  complete** (or equivalent) on reader.
- Secondary: language toggle, open official syllabus, back.
- Micro-interactions: see Student content experience section.
- Visual evidence: mobile + desktop; id/en/zh-CN chrome; reduced motion;
  realistic Math LESSON with formula + diagram.

## Authorization, privacy, and safety

- Actor: activated `STUDENT` only for these APIs.
- Minimum data: student projections omit admin provenance PII where not needed;
  no answer keys.
- Minors: progress is educational operational data; minimize retention scope to
  progress rows; no lesson body in logs or audit values.
- Audit: optional value-free security/domain events for progress complete; no
  content payloads.
- Images: ownership via published reference check; no open image IDOR across
  unpublished content.

## Observability

| Event/metric                   | Trigger           | Allowed properties                       | Prohibited content  |
| ------------------------------ | ----------------- | ---------------------------------------- | ------------------- |
| `academic.student.browse`      | successful browse | subject, packageId, revisionId           | outline/lesson text |
| `academic.student.lesson_open` | lesson GET        | subject, resourceId, explanationLanguage | block bodies        |
| `academic.student.progress`    | progress upsert   | subject, resourceId, status              | resume content text |

## Test plan

### Contract and backend

- Contract compile + `pnpm check:generated` after TypeSpec init.
- Student HTTP ITs: STUDENT success; non-student 403; empty published; lesson
  languages; progress upsert/idempotency; image auth; no key leakage in JSON.
- Progress clamp on shortened revision (unit or IT).

### Frontend component/integration

- Outline/browse empty and ready states.
- Lesson reader language toggle and missing language.
- Progress resume UI.
- Content block render TEXT/MATH/IMAGE.
- Route availability for STUDENT; prototype isolation.

### End-to-end/manual evidence

- Real configured admin publishes Math package → student signs in → browse →
  open lesson → toggle language → resume → content complete.
- Mobile + desktop + reduced motion checklist.

## Implementation sequence

1. Keep this brief as the ownership document; do not implement against the old
   one-line PLAN wording alone.
2. Initialize `contracts/academic-student.tsp`, compile, regenerate, record
   initial checkpoint. Done — `VS-008-R2-initial`.
3. Frontend consumer review of student projections and lesson/progress states;
   resolve `CR-NN` if any.Done — zero `CR-NN`; `VS-008-R2-accepted`.
4. Record accepted checkpoint → `CONTRACT_READY Done — revision 3.
5. Backend: V8 progress table, projector, student APIs, authorization, tests.
   Done — revision 4; focused backend tests green.
6. Frontend: production Learn feature, content experience, states, tests
   (promote routes off preview workspace gate; no prototype imports).
   Done — production `features/learn`; routes live for STUDENT.
7. Integrate early with a real published package; record journey evidence.
   Done — product-owner real-journey review (2026-08-10) after findings fixes.
8. Update `ARCHITECTURE.md`, `PLAN.md`, `COVERAGE.md`; mark `DONE` only after
   product-owner acceptance of the real student journey.
   Done — revision 6; status `DONE`.

## Definition of done

- [x] Partial story mapping and exclusions remain honest (no full US-COURSE-03/04 claims).
- [x] Documentation sufficiency complete; `D-01`–`D-04` approved and reflected.
- [x] Human gate remains `APPROVED` for recorded scope.
- [x] TypeSpec student contract compiles; checkpoints recorded; zero open CR.
- [x] Backend + frontend + migration implement the same states from checkpoint (V8 progress; five student HTTP ops; production `features/learn` routes).
- [x] All AC rows have named evidence (backend HTTP/unit + frontend component/API for AC 01–11; AC 12 and end-to-end actor journey via product-owner review 2026-08-10).
- [x] Authorization, privacy, and no-key-leakage reviewed. (backend: STUDENT-only, no key/draft/question leak in IT)
- [x] Mobile, a11y, localization, reduced motion verified for Learn browse + lesson (product-owner journey review after redesign and findings fixes).
- [x] Prototype isolation recorded; production routes live for the closed loop (`student-settings` / `implemented`; no `features/learn` → prototype imports).
- [x] UI follows `DESIGN.md` and the Student content experience section.
- [x] `ARCHITECTURE.md`, `PLAN.md`, `COVERAGE.md` reflect the delivered VS-008 student Learn boundary and `DONE` status.
- [x] Product owner accepts the real student journey before `DONE`.

## Verification evidence

| Evidence                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract build               | Complete — `pnpm generate` compiled TypeSpec and regenerated OpenAPI + web declarations; second generate left artifacts unchanged (OpenAPI `5c2c40826514da73ea9eac5a05b26d5a0e5789c5`, web `0160b7ced743af7fd7cb72a2915e40c36dd029ef`); `pnpm typecheck:web` passed.                                                                                                                                                                                                                                    |
| Initial contract checkpoint  | `VS-008-R2-initial` established — TypeSpec `academic-student.tsp` `dbdae3677677f3fd5a8dca056b13bf025d827076`; OpenAPI `5c2c40826514da73ea9eac5a05b26d5a0e5789c5`; web declarations `0160b7ced743af7fd7cb72a2915e40c36dd029ef`.                                                                                                                                                                                                                                                                          |
| Frontend contract review     | `COMPLETE` — zero-request acceptance of `VS-008-R2-initial` (hashes re-verified via `git hash-object` 2026-08-07). Reviewed five operations, generated TS unions/discriminants, official-source/browse/continue, LANGUAGE_UNAVAILABLE body, progress upsert, image auth pattern, and routing/prototype isolation constraints. No `CR-NN`.                                                                                                                                                               |
| Accepted contract checkpoint | `VS-008-R3-accepted` (2026-08-10) — TypeSpec `dfcc97ef2fdd5c42d56a0c33710efaffb5bd4b97`; OpenAPI `d38dc7bb8be247c05825936c542c82725fb1ce12`; web declarations `d0fe622158d6f8cdb8cffa7b20123aac54c395b5` (`updatedSinceCompleted` soft upgrade). Prior R2 retained in history.                                                                                                                                                                                                                          |
| Technology/ADR review        | Complete — existing stack sufficient                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Backend tests                | Complete — `./mvnw --batch-mode -Dtest=PublishedPackageProjectorTest,AcademicStudentHttpIT,DatabaseMigrationIT test` — 7 tests, 0 failures (V8 migration; authz 401/403; empty list/404; browse + LESSON + LANGUAGE_UNAVAILABLE; progress upsert/idempotency/complete; resume clamp; published image auth; no key leakage).                                                                                                                                                                             |
| Backend implementation       | Complete — V8 `student_content_progress`; `AcademicStudentController` five ops; `PublishedPackageProjector`; `ContentAccessPolicy` pilot open-access STUDENT; student-safe projections; value-free `academic.student.*` logs.                                                                                                                                                                                                                                                                           |
| Frontend tests               | Complete (worker) — `pnpm typecheck:web` pass; `pnpm lint:web` pass; focused vitest: `src/features/learn/**`, `src/app/routes.test.ts`, `src/shared/i18n/i18n-parity.test.ts` (27 tests), plus regression `App.test.tsx` + `prototypeFlows.test.tsx` (25 tests). Covers API 5xx/403 no mock-success, malformed rejection, empty/retry, browse continue/progress chips, language unavailable, content-complete authority, Learn route promotion off `PreviewWorkspaceGuard`.                             |
| Frontend visual review       | `ACCEPTED — PRODUCT_OWNER_REVIEW`: product owner confirmed in chat on 2026-08-10 that the production student Learn journey passes after findings fixes (subject hub, soft content-update signal, browse/hub redesign, official-source presentation, Continue/Start hierarchy, language-toggle stability, admin published/updated timestamps). Acceptance covers the VS-008 closed loop only; checkpoint/practice/mastery, multi-subject seeding, entitlements, and parent syllabus remain later slices. |
| End-to-end/manual flow       | `ACCEPTED — PRODUCT_OWNER_REVIEW`: product owner accepted the real activated-student flow — sign-in → `/app/learn` subject hub → package browse (official source + outline + product coverage + progress chips) → open LESSON → explanation-language toggle → resume → content complete — without expanding accepted scope. No next production slice was selected.                                                                                                                                      |
| Frontend implementation      | Complete — production `features/learn` (packages list, subject browse, lesson reader, bearer images, KaTeX, content progress); routes `/app/learn`, `/app/learn/:subject`, `/app/learn/:subject/lessons/:resourceId` under `student-settings` / `implemented`; zero prototype imports; i18n en/id/zh-CN; application 404 not mocked in DEV; resume PUTs coalesced; post-setup home `/app/learn`; production-safe mobile More.                                                                           |
| Completion disposition       | Contract (`VS-008-R3-accepted`), backend/database (V8), frontend, security/privacy, prototype isolation, and product-owner journey evidence are complete; VS-008 moved to `DONE` without expanding acceptance or starting the next slice.                                                                                                                                                                                                                                                               |

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6        | 2026-08-10 | Recorded product-owner acceptance of the production student Learn journey after findings fixes; closed remaining definition-of-done and journey evidence; synchronized PLAN/ARCHITECTURE/COVERAGE; moved VS-008 from `IN_PROGRESS` to `DONE` without selecting or starting the next production slice.                                                                                              |
| 5        | 2026-08-10 | PO journey findings: subject hub (no sole-package auto-enter); soft `updatedSinceCompleted` (option A) on ContentProgress; disclaimer copy cut; Learn desktop layout/Continue hierarchy; post-setup home `/app/learn`; production-safe mobile More. Contract checkpoint `VS-008-R3-accepted`. Slice remains `IN_PROGRESS` until re-acceptance.                                                     |
| 4        | 2026-08-07 | Backend implementation of accepted student academic boundary: V8 progress table, published package projector, five student HTTP operations under `/api/v1/academic/**`, pilot `ContentAccessPolicy`, focused unit + PostgreSQL/Testcontainers HTTP evidence; slice moved to `IN_PROGRESS`.                                                                                                         |
| 3        | 2026-08-07 | Frontend consumer review of `VS-008-R2-initial`: verified generated student academic operations and shapes against the Learn closed loop, content-experience plan, and prototype isolation; filed zero `CR-NN`; recorded matching accepted checkpoint `VS-008-R2-accepted`; expanded frontend plan (production routes/guards); moved slice to `CONTRACT_READY`. Frontend implementation completed. |
| 2        | 2026-08-07 | Initialized and compiled five-operation student academic contract in `contracts/academic-student.tsp` (list/browse packages, LESSON GET with explicit language-unavailable body, content-progress PUT, published image GET); regenerated OpenAPI/web declarations; recorded `VS-008-R2-initial`; opened frontend consumer review without backend or frontend implementation.                       |
| 1        | 2026-08-07 | Initial shaping after VS-005 done: closed student consumer loop (browse + LESSON + content progress); pilot open-access STUDENT; explanation-language toggle (id/en/zh-CN) without exam-track lesson split; subject-extensible academic student APIs; content experience and micro-interaction plan; approved `D-01`–`D-04`.                                                                       |
