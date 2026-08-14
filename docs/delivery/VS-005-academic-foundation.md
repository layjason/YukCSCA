# VS-005 — Configure the first admin and publish the first CSCA preparation package

## Metadata

| Field                        | Value                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Status                       | `DONE`                                                                                                         |
| Human gate                   | `APPROVED`                                                                                                     |
| Plan revision                | 9                                                                                                              |
| Updated                      | 2026-08-07                                                                                                     |
| Primary actor                | Configured first platform admin                                                                                |
| Story IDs                    | `US-ADMIN-01`, `US-ADM-02`, `US-ADM-03`, `US-ADM-04`, `US-ADM-05`                                              |
| Requirement sections         | English: 1.1, 1.3, 4.1–4.6, 14.1, 14.4–14.6; Chinese: corresponding 1.1、1.3、4.1–4.6、14.1、14.4–14.6 clauses |
| Depends on                   | [`VS-000`](VS-000-google-auth.md); configured verified identity; publishable original or licensed content      |
| Related ADRs                 | None                                                                                                           |
| TypeSpec source              | `contracts/academic-admin.tsp`                                                                                 |
| API operations               | Eight admin package, image, publication, and archive operations under `/api/v1/admin`                          |
| Backend/slice owner          | Backend vertical-slice worker; existing `identity` module plus first `academic` use case                       |
| Frontend owner               | Separate frontend worker; consumer review, production admin workspace, and product-owner journey complete      |
| Initial contract checkpoint  | `VS-005-R4-initial` — TypeSpec `dbf6c7ad9a56352bf819cb2bceed2deddd37a673`                                      |
| Accepted contract checkpoint | `VS-005-R5-accepted` — TypeSpec `fb09340d2afac7e6e812dc33c895c3048d976a8c`                                     |

## User-observable outcome

The configured first admin signs in through an existing verified account,
records the 2025 CSCA Mathematics source, publishes concise syllabus-outline
summaries in Bahasa Indonesia, English, and Simplified Chinese with an
accessible official-PDF action, creates original topic-mapped preparation
resources and single-answer questions with formulas and diagrams, and
assembles one timed mock while every other identity remains denied.

## Why this slice is the current boundary

The source evidence supports a simple preparation chain:

```text
Subject -> official syllabus module/topic -> preparation resource/question
        -> timed mock definition -> later attempt and mistake review
```

This slice publishes the reusable academic input for that chain. It does not
implement student browsing, timed attempts, scoring, or mistake review; those
remain independently observable in `VS-008`, `VS-009`, `VS-012`, and
`VS-013`. It also does not build a general CMS, reviewer queue, rights matrix,
or scraping service.

The first package remains one governed revision so downstream attempts can
snapshot exact question and scoring data. Its internal schema is deliberately
small and follows the official documents' actual hierarchy rather than a
generic curriculum model.

**Subject extensibility (architecture, not expanded acceptance):** Package
lifecycle, content blocks, outline/objectives/resources/questions/mocks, images,
and provenance are subject-agnostic. Subject identity is an additive
`AcademicSubject` enum and allow-listed subject profile (default exam structure).
Pilot creatable subject remains Mathematics only; full multi-subject seeding is
out of scope. Adding Physics later is profile + enum + content, not a redesign.

## Evidence and interpretation

### Primary official-syllabus evidence

- The supplied files under
  [`docs/references/CSCA-SYLLABUS-2025`](../references/CSCA-SYLLABUS-2025/)
  preserve reference transcriptions of the official 2025 Mathematics,
  Physics, Chemistry, STEM Chinese, and Humanities Chinese structures in
  Chinese and available English variants. They inform the platform outline but
  are not copied into published product content.
- The Mathematics syllabus records an edition label, examination purpose,
  duration, score, exam languages, question type/count, ordered modules, and
  ordered topic statements. It does not declare a publication, effective,
  update, or withdrawal date.
- The official CSCA preparation site groups exam introduction, syllabi,
  preparation resources, and mock examination in one journey. Its preparation
  resources and mock remain indicated as upcoming as of this review.
- The third-party CSCA guidebook is discovery evidence only. Its training-links
  page points to SJTU sample Mathematics and Physics papers, but it is not an
  official product authority or permission grant.
- The rendered SJTU samples demonstrate dense mathematical notation and
  question diagrams. They justify formula and image support; they are not
  YukCSCA seed content and must not be copied without a valid permission basis.

### Date policy

- `editionLabel`, `sourceLinks` (1–2 language-edition PDF locators: `en` and/or
  `zh-CN`), `retrievedAt`, and `lastCheckedAt` are required.
- Official `publishedOn`, `effectiveOn`, and `updatedOn` are nullable and each
  carries `DECLARED` or `NOT_STATED`; `NOT_STATED` is not a validation failure.
- HTTP headers, file timestamps, search-result dates, and inferred year
  boundaries are not official dates and must not populate those fields.
- This slice uses explicit admin verification. It adds no scraper, scheduler,
  browser automation, or source-change notification. A later measured need may
  add hash comparison or scheduled rechecking without changing the schema.

### Minimal provenance policy

The requirements still make provenance and permission a publication boundary,
but the pilot does not expose a complex workflow:

- YukCSCA-original content automatically records the signed-in admin as author,
  `YUKCSCA_ORIGINAL` as origin, and the publishing admin/time as review evidence.
- Licensed or open content requires provider, source locator, and a short
  permission/licence reference.
- Official facts used only as references record the authority, locator,
  edition, retrieval/check times, and permitted-use classification.
- `DRAFT`, `PUBLISHED`, and `ARCHIVED` are also the visible review lifecycle;
  there is no separate reviewer queue, rights matrix, or approval dashboard.
- Missing required provenance still blocks publication because requirements
  14.6 and the source's own usage notice do not permit treating availability as
  permission to copy.
- Approved `D-02` uses official documents as `REFERENCE_ONLY`. The product
  publishes concise YukCSCA-authored outline summaries in `id`, `en`, and
  `zh-CN`, retains each item's source position, and links to the official PDF
  language edition(s) the admin maintains (typically both Mathematics EN and
  zh-CN on csca.cn).

## Capability and adjacent contract horizon

- Owning lifecycle: configured admin recognition, then one package through
  draft, validation, immutable publication, correction, and archive.
- Included invariants: one pilot admin; official source metadata and
  YukCSCA-authored summaries remain distinct; one subject/package; ordered
  syllabus outline; topic mappings; content blocks; server-owned answers; one
  active revision.
- Deferred consumers: `VS-008` reads syllabus/resources, `VS-009` creates
  practice and mistake evidence, `VS-010A` uses terminology, `VS-010B` adds reviewed video, `VS-012` executes
  timed mocks, and `VS-013` interprets results.
- Additive path: stable UUIDs, immutable revision IDs, explicit exam language,
  `TEXT | MATH | IMAGE` blocks, and outline-item references allow later consumers and
  new question formats without reopening the first lifecycle.
- `VS-006` and `VS-007` remain absorbed. Re-splitting would again leave an
  unusable admin shell or unpublishable academic fragments.

## In scope

- Recognize one deployment-configured canonical verified account as the unique
  pilot admin using approved `D-01` Option A.
- Add a production admin route; no admin registration, invitation, or role UI.
- Create one Mathematics preparation package with:
  - admin-maintained official-source link(s) per language edition, source
    metadata, and exam structure;
  - ordered syllabus outline items with required Bahasa Indonesia, English,
    and Simplified Chinese YukCSCA summaries plus source page/section positions;
  - separate YukCSCA learning objectives and mappings;
  - simple `LESSON`, `TERMINOLOGY`, and `REMEDIATION` resources mapped to topics;
  - single-answer questions with difficulty, exam language, answer,
    explanation, and topic/objective references;
  - `TEXT`, LaTeX `MATH`, and referenced `IMAGE` content blocks;
  - one full-length timed mock definition selecting compatible package
    questions and matching the recorded Mathematics 2025 structure: 60 minutes,
    100 points, 48 single-answer questions, and one exam language.
- Upload small original/licensed PNG or JPEG diagrams into PostgreSQL and serve
  them through authorized content endpoints.
- Save/resume a draft, validate it, publish atomically, create a correction
  draft, and archive with immutable published revisions and minimized audit.

## Out of scope

- Additional admins, role administration, reviewer assignment, multi-step
  approval, rights dashboards, licence-expiry automation, or regional matrices.
- Web scraping, automated source refresh, document ingestion/OCR, PDF import,
  bulk import/export, publishing copied official wording, or copying the
  supplied official/SJTU files into product content.
- SVG, GIF, video, audio, arbitrary files/HTML, external embeds, or protected
  downloads.
- Object storage, CDN, MinIO, malware-scanning service, queue, cache, or search
  service. A later slice may move image bytes behind an adapter when volume or
  protected-delivery evidence justifies it.
- Student reads, entitlements, attempts, hints, mistake state, mastery, mock
  execution/results, planning, AI retrieval, or prototype-fixture promotion.
- Generated questions, free-response scoring, adaptive tests, or additional
  subjects in the first publication transaction.

## Preconditions and dependencies

- Existing state: Google and credential login produce verified `UNASSIGNED`
  accounts; `UserRole.ADMIN` exists but has no provisioning or routes.
- Content: first production data must be YukCSCA-original or have documented
  permission. Source links and sample papers are reference evidence only.
- Safe fallback: missing/invalid admin configuration grants no admin role;
  invalid content stays draft; a failed replacement leaves the active revision.
- Test data: synthetic Mathematics examples and fake source locators only.

## Technology and dependency impact

- Keep Spring Boot/JPA/PostgreSQL, TypeSpec, React, and the modular monolith.
- Add KaTeX to the web app at its first accepted use: safe rendering of stored
  LaTeX in admin preview and later question consumers. Raw HTML and arbitrary
  macro/plugin execution are not supported.
- Store PNG/JPEG image bytes bounded to 5 MiB and 4096 × 4096 pixels in a
  normalized PostgreSQL table for the
  first package. The backend validates MIME signature, decodes and re-encodes
  the image, strips metadata, bounds bytes/dimensions, hashes content, and
  records owner/source/retention state before making it referenceable.
- PostgreSQL was chosen over an object-storage service because the pilot has a
  small bounded image set and no measured scale or protected-download need.
  The application uses an `AcademicImageStore` port so a later adapter change
  does not alter content-block contracts.
- Additive V6 migration: unique pilot-admin enforcement, package/revision data,
  image metadata/bytes, and minimized academic audit. Applied V1–V5 migrations
  remain unchanged.
- ADR: `Not required — KaTeX is a local renderer and bounded PostgreSQL image
storage is an intentionally reversible first-use choice behind a port.`

## User flow

1. The configured verified `UNASSIGNED` account signs in and becomes `ADMIN`.
2. The admin creates the Mathematics 2025 package, adds or updates official PDF
   links for each language edition (EN and/or zh-CN), and records authority,
   edition, check time, exam structure, and source positions.
3. The admin writes concise outline summaries in Bahasa Indonesia, English, and
   Simplified Chinese and previews the compact official-source panel (one open
   action per configured language edition).
4. The admin adds separate YukCSCA objectives/resources/questions using text,
   LaTeX, and approved diagrams, then previews rendered content.
5. The admin selects compatible questions for one timed mock.
6. Publication validation either returns field-level errors while retaining the
   draft or atomically activates an immutable revision.
7. Later edits form a new draft; the old revision remains active until a valid
   replacement succeeds. Archive never deletes history.

## Acceptance and implementation matrix

| AC  | Given / When / Then                                                                                                                                                                                                                                            | Required evidence                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 01  | The configured verified `UNASSIGNED` identity signs in; it becomes the unique `ADMIN` and repeat sign-in/refresh is idempotent.                                                                                                                                | Google, credential, refresh, restart, and uniqueness integration tests.  |
| 02  | Any other identity or existing non-admin role calls an admin operation; access is denied without role/data change.                                                                                                                                             | Exact-identity, role-conflict, `401`, and `403` tests.                   |
| 03  | The admin records Mathematics 2025; the validated official link(s) per language edition, edition, source/check metadata, exam format, source positions, localized outline summaries, and distinct mappings survive save/read.                                  | Contract, serialization, PostgreSQL, and UI resume tests.                |
| 04  | Official dates are not stated; the admin records `NOT_STATED` without inventing dates or blocking publication. Bahasa Indonesia, English, and Simplified Chinese summaries are required and remain labelled as YukCSCA-authored.                               | Date/language-policy domain and component tests.                         |
| 05  | Text/LaTeX content is saved; KaTeX preview renders representative formulas accessibly and malformed input produces recoverable validation.                                                                                                                     | Component tests plus mobile/desktop visual evidence.                     |
| 06  | A valid PNG/JPEG diagram is uploaded; it is re-encoded, bounded, owned, and referenceable. Invalid type, signature, size, or dimensions are rejected without persistence.                                                                                      | Upload security and PostgreSQL integration tests.                        |
| 07  | A question lacks answer, explanation, compatible language/topic, or required source/permission evidence; publication fails and any active revision remains unchanged.                                                                                          | Parameterized validation and atomic rollback tests.                      |
| 08  | A valid package is published; resources/questions and a 60-minute, 100-point, 48-question single-language mock become one immutable active revision and answer keys remain admin-only.                                                                         | HTTP/domain/Flyway tests and real admin journey.                         |
| 09  | A correction fails or succeeds; the old revision is unchanged and remains active until replacement succeeds.                                                                                                                                                   | Optimistic-stale and replacement tests.                                  |
| 10  | Archive is requested with a reason; new use is disabled without deleting revision, image, or audit history.                                                                                                                                                    | Archive/retry tests and audit inspection.                                |
| 11  | Prototype fixtures or unlicensed official/SJTU wording/files are offered for publication; they are rejected or remain reference-only behind a validated official-source action.                                                                                | Boundary and provenance tests plus seed/build inspection.                |
| 12  | The syllabus presentation is rendered; it shows one compact official-source panel with authority, edition, last checked date, and open action(s) for each configured official language edition, and does not repeat a long source disclaimer per outline item. | Localized component, accessibility, mobile, and desktop visual evidence. |

## Documentation sufficiency review

| Review area                                 | Evidence                                                                    | Status  | Gap/decision                                     |
| ------------------------------------------- | --------------------------------------------------------------------------- | ------- | ------------------------------------------------ |
| Actor flow and adjacent handoffs            | Requirements 4, 14; stories; PLAN; adjacent student/mock stories            | `CLEAR` | —                                                |
| Official schema and dates                   | Supplied 2025 syllabus Markdown plus rendered official Mathematics PDF      | `CLEAR` | Nullable declared dates plus required check time |
| Formula/image capability                    | Rendered SJTU Mathematics and Physics sample pages                          | `CLEAR` | KaTeX plus bounded image blocks                  |
| Authorization and role transition           | Existing identity/auth code and `US-ADMIN-01`                               | `CLEAR` | `D-01` approved                                  |
| Source use and permission                   | Requirements V1.4 4.2/14.6; official PDF usage notice; product-owner answer | `CLEAR` | `D-02` approved as reference-only                |
| State, failure, concurrency, audit          | Requirements 14.4–14.6; existing transaction/audit conventions              | `CLEAR` | —                                                |
| Dependency/ADR threshold                    | Current manifests, PLAN dependency policy, no current media stack           | `CLEAR` | KaTeX; PostgreSQL image storage; no ADR          |
| Frontend journey/accessibility/localization | routes, DESIGN, design guide, prototype isolation rules                     | `CLEAR` | Consumer review complete; journey accepted       |

## Human decision gate

| Field             | Value                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Gate status       | `APPROVED`                                                                                                                  |
| Decision owner    | Product owner                                                                                                               |
| Approval scope    | `D-01` configured-admin eligibility; `D-02` localized summaries and official-source presentation                            |
| Approval evidence | Both options approved in user chat on 2026-07-31; paired requirements, stories, glossary, slice, PLAN, and coverage updated |

| ID     | Blocking question and scenario                                                                                                             | Recommendation                                                                                                                                                | Status     | Resolution                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `D-01` | A configured account already has a non-admin role when it signs in.                                                                        | Only exact configured verified `UNASSIGNED` may become `ADMIN`; existing non-admin roles are rejected, existing `ADMIN` is idempotent.                        | `APPROVED` | Option A approved 2026-07-31; scope, state model, tests, and PLAN updated.                  |
| `D-02` | The official syllabus source restricts reproduction. Should YukCSCA link to it and publish localized summaries rather than copied wording? | Use `REFERENCE_ONLY`; require `id`, `en`, and `zh-CN` summaries; present one compact official-source panel whose language-edition URL(s) the admin maintains. | `APPROVED` | Approved 2026-07-31; refined 2026-08-07 for dual en/zh-CN PDF locators (requirements V1.5). |

## State model and invariants

```text
verified UNASSIGNED + exact configured identity -> ADMIN
existing ADMIN + exact configured identity       -> ADMIN (no-op)
other role or unconfigured identity               -> unchanged / denied

DRAFT -> PUBLISHED -> ARCHIVED
  ^          |
  +-- correction draft; active revision changes only after successful publish
```

- At most one `ADMIN` and one active package revision exist in the pilot.
- Official source records never become permission grants by inference;
  published outline text is YukCSCA-authored and links to the official
  language-edition PDF locator(s).
- Published revisions and referenced images are immutable; no hard delete.
- Mock questions share subject/exam language and belong to the same revision.
- The first mock snapshots and matches the recorded official duration, score,
  question count, and single-answer question type; it is YukCSCA-authored and
  does not claim to be an official CSCA paper.
- Answer/scoring data never enters non-admin operations, logs, or audit values.
- Saves use an expected draft revision; stale writes fail without merge.

## TypeSpec contract plan

### Operations

| Operation      | Method and route                                    | Auth    | Success / important failures                     |
| -------------- | --------------------------------------------------- | ------- | ------------------------------------------------ |
| List packages  | `GET /api/v1/admin/academic-packages`               | `ADMIN` | `200`; `401`, `403`                              |
| Create package | `POST /api/v1/admin/academic-packages`              | `ADMIN` | `201`; validation/conflict                       |
| Read package   | `GET /api/v1/admin/academic-packages/{id}`          | `ADMIN` | `200`; not found                                 |
| Save draft     | `PUT /api/v1/admin/academic-packages/{id}/draft`    | `ADMIN` | `200`; validation/stale                          |
| Upload image   | `POST /api/v1/admin/academic-images` multipart      | `ADMIN` | `201`; type/size/dimension/source rejection      |
| Read image     | `GET /api/v1/admin/academic-images/{id}`            | `ADMIN` | bytes with immutable/no-sniff headers; not found |
| Publish        | `POST /api/v1/admin/academic-packages/{id}:publish` | `ADMIN` | `200`; publication blocked/stale                 |
| Archive        | `POST /api/v1/admin/academic-packages/{id}:archive` | `ADMIN` | `200`; stale/not found                           |

### Core models

| Model                                | Important fields and rules                                                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OfficialSyllabus`                   | subject plus draftable authority, edition, admin-maintained source URL/languages, retrieved/checked instants, nullable declared dates plus status, exam structure, and permitted use |
| `SyllabusOutlineItem`                | stable UUID/key, parent/order, source page/section position, and required `id`, `en`, `zh-CN` YukCSCA summaries; never official wording                                              |
| `LearningObjective` / `TopicMapping` | YukCSCA-authored text, outline-item references, mapping rationale                                                                                                                    |
| `StudyResource`                      | kind `LESSON`, `TERMINOLOGY`, or `REMEDIATION`; exam/explanation language as applicable; outline-item/objective refs; ordered content blocks; provenance                             |
| `Question`                           | subject, exam language, difficulty, stem/options/explanation blocks, correct option, outline-item/objective refs, provenance                                                         |
| `ContentBlock`                       | `TEXT` localized text, `MATH` LaTeX, or `IMAGE` asset UUID plus localized alt text/caption                                                                                           |
| `AcademicImage`                      | UUID, PNG/JPEG media type, 5 MiB/4096-pixel bounds, SHA-256, and owner/source record; bytes are not embedded in package JSON                                                         |
| `MockPaper`                          | subject, exam language, duration, total points, question type/count, ordered question IDs/points; first mock must match its syllabus exam-structure snapshot                         |
| `Provenance`                         | origin; automatically derived admin author/reviewer for original content; source/provider/permission reference when non-original                                                     |

Contract responses use generated types, `application/problem+json`, stable
value-free violation paths/codes, `Cache-Control: no-store` for package data,
and `X-Content-Type-Options: nosniff` for images. Existing token/cookie behavior
does not change. Draft saves accept structurally bounded incomplete content;
publish performs completeness, URL, relationship, mock-total, and provenance
validation without discarding the draft.

## Contract collaboration

| Review                                | Owner    | Status     | Evidence                                                                                                                                                                                    |
| ------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice drafted and human gate resolved | Backend  | `COMPLETE` | Revision 5 retains approved `D-01` and `D-02`.                                                                                                                                              |
| Initial TypeSpec compiled/reviewed    | Backend  | `COMPLETE` | `VS-005-R4-initial`: TypeSpec `dbf6c7ad9a56352bf819cb2bceed2deddd37a673`; OpenAPI `d5c60058bbb025104c2d273f6bfdf09fbffc0b80`; web declarations `0bd09b6918f379ad62e8b61c68e1227b64c13cb2`.  |
| Frontend consumer review              | Frontend | `COMPLETE` | Reviewed the full admin editor/reload/recovery journey and generated declarations; filed only `CR-01`; confirmed multipart `File` adapter feasibility without a contract workaround.        |
| Contract requests resolved            | Backend  | `COMPLETE` | Accepted `CR-01`; added server-derived `hasUnpublishedChanges` to package list/detail responses; focused frontend re-review confirmed satisfaction and zero open requests.                  |
| Accepted checkpoint                   | Backend  | `COMPLETE` | `VS-005-R5-accepted`: TypeSpec `fb09340d2afac7e6e812dc33c895c3048d976a8c`; OpenAPI `32e06e639e4c8ad200f6fcfc02a5d843bcbd1bb2`; web declarations `779a4b95286901908dc35fc38072b9cd8e1df2d6`. |

### Frontend contract requests

| ID      | Consumer scenario                                                                                                                                                            | Resolution                                                                                                                                                                    | Status     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `CR-01` | After publishing, an admin saves an incomplete correction and later returns from the package list; the UI must distinguish “Resume correction” without timestamp heuristics. | Accepted in revision 5: required server-derived `hasUnpublishedChanges` is returned on package summaries/details and resets after successful publication. Frontend confirmed. | `RESOLVED` |

## Backend plan

- Extend `identity` only for idempotent configured-admin recognition. The new
  `academic` module owns package, image, publication, and audit use cases and
  crosses identity through application-facing ports only.
- Store package metadata plus immutable validated revision documents in JSONB;
  store image metadata/bytes separately. Controllers translate HTTP only.
- Use one transaction for publish/archive and optimistic revision checks for
  draft updates. No scheduled or asynchronous behavior.
- V6 is append-only and creates the pilot-admin uniqueness constraint,
  academic package/revision/image tables, and minimized audit indexes.

## Frontend and experience plan

- Add typed production `/admin` routes in `apps/web/src/app/routes.ts` and a
  feature-owned `features/academic-admin` workspace; import no prototype code.
- Use one localized syllabus-outline tree with focused edit panels, not a
  dashboard-card grid. Primary action is Save while editing and Review and
  publish when valid.
- In the reader/header preview, use one restrained mint/cream source panel with
  the CSCA authority, 2025 edition, last checked date, available PDF-language
  labels, and a clear localized “Open official syllabus” secondary action with
  an external-link indicator. Do not repeat “see official wording” text on each
  outline row.

  ```text
  Official source
  CSCA · 2025 Edition · Checked 31 Jul 2026
  [ Open official syllabus ↗ ]
  ```

  Localized action labels are concise: `Buka silabus resmi` (`id`),
  `Open official syllabus` (`en`), and `查看官方考试大纲` (`zh-CN`).

- In the admin editor, keep the official URL editable and validated, show the
  same source-action preview, and edit `id`, `en`, and `zh-CN` summaries beside
  the source page/section position. The summaries are visibly marked
  YukCSCA-authored once per outline region, not with a warning on every field.
- Preview `TEXT`, KaTeX `MATH`, and `IMAGE` blocks. Server validation remains
  authoritative; no form/query library is added without demonstrated need.
- Cover empty, loading, saving, saved, validation, upload failure, stale,
  publishing, published, correction, and archived states.
- Localize UI in Indonesian, English, and Simplified Chinese while keeping exam
  and explanation languages independent. Verify keyboard/focus, screen-reader
  labels/alt text, reduced motion, low bandwidth, mobile, and desktop.
- Reuse existing DESIGN roles/tokens. No shared token or motion change is known.

## Authorization, privacy, safety, and observability

- Every admin request checks both JWT role and current database role; deny by
  default. Package/list responses are `no-store`.
- Image upload accepts PNG/JPEG only, has explicit byte/dimension limits,
  decodes/re-encodes before persistence, strips metadata, and denies SVG/HTML.
- Audit role assignment, draft save, image rejection/acceptance, publication,
  and archive using actor/target/result/time/stable codes and bounded reason.
- Never log credentials, configured email, academic bodies, image bytes,
  source documents, question answers, LaTeX bodies, or rejected field values.
- This slice stores no student/minor data and exposes no student content.

## Test plan

- Contract: `pnpm contract:build`, `pnpm check:generated`, generated-shape review.
- Backend: focused identity tests; academic domain validation; image
  signature/decoding/limits; PostgreSQL/Testcontainers authorization, stale,
  publish rollback/success, correction, archive, immutability, audit, and V6.
- Frontend: save/publish success; official-link validation and source-action
  preview; required `id`, `en`, `zh-CN` summaries; field/formula/upload
  failures; stale recovery; role denial; generated-type use; localization and
  accessibility.
- Journey: real configured/unconfigured accounts, restart idempotency, source
  policy, formula/image preview, failed/successful replacement, and archive at
  mobile/desktop viewports.

## Implementation sequence

1. Initialize `academic-admin.tsp`, compile/regenerate, review output, and record
   the initial checkpoint.
2. Obtain frontend consumer review, resolve requests, record the accepted
   checkpoint, and move to `CONTRACT_READY`.
3. Implement configured-admin recognition and V6 with focused tests.
4. Implement package draft/publication and bounded image storage behind the
   academic application ports.
5. Add KaTeX and the production admin editor from generated declarations.
6. Integrate early and gather focused authorization, content, image, migration,
   accessibility, visual, and real-journey evidence.
7. Update current-state docs and mark `DONE` only after the product owner accepts
   the real configured-admin publication journey.

## Definition of done

- [x] The approved `D-01`/`D-02` rules and every resolved contract request are
      reflected in implementation; the gate remains approved.
- [x] TypeSpec compiles and generated artifacts match the accepted checkpoint.
- [x] Only the exact eligible configured identity becomes the unique admin.
- [x] The source/date policy, three-language YukCSCA summaries, editable
      official link, and compact source-action presentation are preserved.
- [x] Text, LaTeX, approved images, questions, resources, and one mock publish as
      one immutable revision without prototype or unlicensed copied content.
- [x] Failure, stale update, correction, archive, authorization, no-store,
      logging, and audit behavior have named evidence.
- [x] Mobile, accessibility, localization, low-bandwidth, and reduced-motion
      evidence is recorded.
- [x] Architecture/security/plan/coverage docs reflect implemented reality.

## Verification evidence

| Evidence                      | Result                                                                                                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supplied reference inspection | Complete — all eight Markdown files classified                                                                                                                                                                                                                             |
| PDF visual inspection         | Complete — official Mathematics hierarchy, guidebook links, SJTU formula and Physics diagram pages reviewed                                                                                                                                                                |
| Technology review             | Complete — KaTeX justified; bounded PostgreSQL images chosen; object storage deferred                                                                                                                                                                                      |
| Contract build/checkpoint     | Complete — initial and accepted hashes recorded; regeneration and generated TypeScript consumption succeeded                                                                                                                                                               |
| Frontend consumer review      | Complete — `CR-01` accepted and confirmed; zero open requests; `VS-005-R5-accepted` established                                                                                                                                                                            |
| Backend implementation        | Complete — first-admin recognition, V6–V7, eight admin operations, publication/image validation, immutable revisions, archive, authorization, subject-profile extensibility, and value-free audit                                                                          |
| Backend verification          | Complete — focused identity/academic sets passed; full `./mvnw --batch-mode verify` passed unit and PostgreSQL/Testcontainers integration tests including V7; contract build/generated check and web typecheck recorded                                                    |
| Frontend implementation       | Complete — production `/admin/academic-packages` workspace under `features/academic-admin`, generated-type clients, KaTeX preview, subject-profile defaults, localization, and focused vitest coverage                                                                     |
| Frontend static and unit      | Complete — `pnpm typecheck:web` and academic-admin vitest suites passed for package list/editor/source/mock/profile helpers                                                                                                                                                |
| Frontend visual / journey     | `ACCEPTED — PRODUCT_OWNER_REVIEW`: product owner confirmed in chat on 2026-08-07 that the configured-admin product journey is enough for now. Acceptance covers the pilot admin Math package path only; multi-subject seeding and student consumption remain later slices. |
| End-to-end/manual flow        | `ACCEPTED — PRODUCT_OWNER_REVIEW`: product owner accepted the real configured-admin sign-in → draft/edit → publish/correction/archive journey without expanding pilot scope. No next production slice was selected.                                                        |
| Completion disposition        | Contract, backend/database (V6–V7), frontend, security/privacy, subject-extensible package architecture, and product-owner journey evidence are complete; VS-005 moved to `DONE` without expanding acceptance or starting the next slice.                                  |

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9        | 2026-08-07 | Corrected official-source model: `OfficialSyllabus.sourceLinks[]` (language + URL, max 2) replaces singular `sourceUrl`/`sourceLanguages`; publish validation and admin UI support dual CSCA Math EN/zh-CN PDFs; fixture outline modules aligned to official 2025 structure; requirements V1.5 and supporting docs synchronized. Does not reopen product-owner journey acceptance.                                  |
| 8        | 2026-08-07 | Recorded product-owner acceptance of the configured-admin academic-package journey as enough for the pilot, closed remaining frontend/journey definition-of-done items, synchronized PLAN/ARCHITECTURE/COVERAGE, and moved VS-005 from `IN_PROGRESS` to `DONE` without selecting or starting the next production slice.                                                                                             |
| 7        | 2026-08-07 | Made the academic package model subject-extensible without expanding acceptance: additive `AcademicSubject` enum, open exam-structure integers, subject profile defaults, mock validation against package exam structure, V7 drop of Math-only DB check, frontend profile module. Pilot creatable subject remains Mathematics; multi-subject seeding stays out of scope.                                            |
| 6        | 2026-08-01 | Implemented and verified the assigned backend boundary: configured-admin recognition for Google and credential sign-in, V6 persistence, all eight accepted HTTP operations, draft/publication validation, bounded re-encoded images, immutable correction revisions, archive, authorization, and minimized audit. Moved to `IN_PROGRESS`; frontend integration and product-owner journey acceptance remain pending. |
| 5        | 2026-07-31 | Completed frontend consumer review of `VS-005-R4-initial`; accepted and implemented `CR-01` by exposing server-derived unpublished-correction state on package list/detail responses; regenerated and rechecked the contract; recorded `VS-005-R5-accepted`; and moved the slice to `CONTRACT_READY` with zero open requests.                                                                                       |
| 4        | 2026-07-31 | Initialized and compiled the eight-operation admin academic-package contract; made incomplete whole-draft saves distinct from publication validation; bounded image upload/read behavior; regenerated and reviewed OpenAPI/web declarations; recorded `VS-005-R4-initial`; and opened frontend consumer review without starting implementation.                                                                     |
| 3        | 2026-07-31 | Approved `D-02` reference-only presentation; replaced copied official wording with YukCSCA-authored Bahasa Indonesia, English, and Simplified Chinese outline summaries; added an admin-maintained official link and compact source-action UI; synchronized requirements V1.4, stories, glossary, PLAN, and coverage; returned the slice to `SHAPING`.                                                              |
| 2        | 2026-07-31 | Recorded approved `D-01` Option A; rebuilt the slice from supplied official-syllabus and rendered sample-paper evidence; simplified the schema and provenance workflow; added explicit date, LaTeX, and bounded image decisions; opened `D-02` for the official source's publication restriction.                                                                                                                   |
| 1        | 2026-07-31 | Created the consolidated first-admin and governed academic-package shaping draft and opened `D-01`.                                                                                                                                                                                                                                                                                                                 |
