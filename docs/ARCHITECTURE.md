# Current architecture

> **Classification: descriptive current state.** This file records implemented
> boundaries, not product requirements or future commitments. Verify changing
> details against code and configuration.

## Topology and stack

YukCSCA is a pnpm workspace with one React web app, one Spring Boot modular
monolith, one TypeSpec package, and one PostgreSQL database.

```text
apps/web/       React application
contracts/      TypeSpec source and generated OpenAPI
services/api/   Spring Boot modular monolith

Browser -> Nginx/React -> Spring Boot API -> PostgreSQL 18
             |
             +-> proxies /api and health only
```

| Area       | Current implementation                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Workspace  | Node.js 24, pnpm 11, one lockfile                                      |
| Web        | React 19, Vite 8, strict TypeScript, React Router, i18next, CSS tokens |
| Contract   | TypeSpec 1.14 → OpenAPI 3.1 → generated TypeScript declarations        |
| API/data   | Java 21, Spring Boot 4.1, Spring Security, JPA, Flyway, PostgreSQL 18  |
| Testing    | Vitest, Testing Library, JUnit, Testcontainers, Playwright             |
| Operations | Docker Compose, Actuator health, structured logs, GitHub Actions       |

No microservices, queues, caches, vector/object stores, Python services, AI
SDKs, or external UI/animation frameworks are active.

## Contract and backend boundaries

- TypeSpec under `contracts/` is the only hand-edited public HTTP contract.
  Generated OpenAPI and frontend declarations are committed outputs, never
  patched manually.
- HTTP changes update TypeSpec, generated artifacts, backend transport,
  frontend client behavior, and tests together.
- Public failures use the shared `application/problem+json` shape and stable
  codes. Bearer failures preserve `WWW-Authenticate`; rate limits preserve
  `Retry-After`.

The API currently contains `identity`, `profile`, `academic`, and `assessment`
modules:

```text
<module>/
├── api/             HTTP translation and request validation
├── application/     use cases and transactions
├── domain/          business state and rules
└── infrastructure/  persistence, security, provider adapters
```

Identity owns accounts, Google identities, roles, sessions, security events,
credential authenticators, pending email-verification claims, policy evidence,
verification delivery outbox state, password-recovery claims and delivery
state, and retention. Profile owns student activation and student-owned profile
maintenance, reaching identity only through application-facing account,
authentication, and security-event APIs. Academic owns the pilot Mathematics
package draft, immutable published revisions, bounded academic images,
reviewed term-bank JSON on those revisions, publish-time term pronunciation
bytes, student terminology preview/notebook/lookup/audio, minimized
administrative audit, and student-safe published projections with
per-student LESSON and REMEDIATION content progress (not mastery). Assessment
owns student assessment sessions, item attempts, assistance events (including
`LANGUAGE_ASSIST` word/phrase help that does not set `languageAssistUsed`),
mistakes, and bounded objective evidence; it reads published assessment content,
content-progress, and the published term bank only through academic application
ports (`PublishedAssessmentCatalog`, `StudentContentProgressQuery`,
`PublishedTerminologyCatalog`) and never imports academic JPA. Academic never
imports assessment JPA; ITEM term lookups use `AssessmentItemContextPort`.
Modules never import another module's repository, JPA entity, controller, or
infrastructure. New modules appear only with their first accepted use case.

Flyway owns the schema; shared migrations are append-only. Integration tests use
the production migrations with PostgreSQL through Testcontainers.

## Frontend boundaries

```text
app -> features -> shared
   \-> prototype/student  -> shared
   \-> prototype/consumer -> shared
```

- `app` owns routes, guards, layouts, and composition.
- `features` owns production UI, state, validation, and API adapters.
- `prototype/*` owns explicitly non-production fixture flows.
- `shared` imports neither features nor prototypes. Production and prototype
  runtime modules never import each other.
- `app/routes.ts` is the complete typed authority for concrete paths, access
  groups, audience, navigation, availability, labels, and requirement
  traceability. `App.tsx` maps every route ID to one screen and composes the
  manifest access groups through the matching guards and layouts.
- Root `DESIGN.md` defines visual roles; `styles.css` mirrors its semantic
  tokens, focus behavior, and reduced-motion rules.
- Interface, explanation, and per-subject exam languages remain independent.
- Access tokens stay in memory; refresh credentials remain server-managed
  `HttpOnly` cookies.
- Vite and Nginx expose the same-origin `/api` and health-only proxy surface.

## Implemented production flows

Production authentication supports Google and the VS-002 credential boundary:

```text
Google credential -> /api/v1/auth/google -> verified Google identity
                                      |-> access JWT
                                      +-> hashed refresh session + HttpOnly cookie

refresh cookie -> /api/v1/auth/refresh -> rotated token family
sign out       -> /api/v1/auth/logout  -> revoked session + cleared cookie

email -> pending claim + durable delivery outbox -> SMTP verification message
valid explicit verification + password + active policies
      -> nullable-name UNASSIGNED account + Argon2id credential (no session)
email + password -> shared access JWT + hashed rotating refresh session

credential email -> generic recovery acknowledgement
                 |-> eligible account: pending claim + durable SMTP outbox
valid single-use recovery token + conforming password
                 -> new Argon2id hash + consumed claim
                 -> all active refresh sessions revoked (no new session)
```

The API verifies signature, issuer, audience, expiry, verified email, and Google
`sub`. Refresh tokens are stored only as hashes; replay revokes the family.
Authentication is rate-limited, security events are persisted, and expired or
old revoked sessions are cleaned up.

Credential verification tokens are HMAC-bound to random claim IDs,
digest-only at rest, purpose-specific, expiring, and single-use. PostgreSQL
serializes canonical-email ownership across Google and credential creation.
The outbox retries bounded SMTP delivery without storing the raw token or
message body. Credential-only accounts retain a null display name until an
accepted role-profile activation supplies one.

Password recovery reuses the credential password policy, HMAC secret, SMTP
configuration, canonical-email serialization, and rate-limit conventions while
keeping purpose-specific claim and outbox state. Requests return the same
acknowledgement for credential, Google-only, and unknown identities. Recovery
tokens are digest-only at rest, expiring, supersedable, and single-use.
Successful completion replaces the password and revokes every active refresh
session atomically; existing stateless access JWTs expire naturally within
their configured 15-minute lifetime.

New accounts are `UNASSIGNED`. `POST /api/v1/student-profile` atomically creates
one student profile and changes the account to `STUDENT`; it returns canonical
current-user state and a replacement access token. The profile is private to
its authenticated student.

The deployment may configure one exact verified account through
`YUKCSCA_FIRST_ADMIN_EMAIL`. Its first successful Google or credential sign-in
promotes only an `UNASSIGNED` account to the unique `ADMIN`; repeat sign-in and
refresh are idempotent and other roles are never overwritten. V6 enforces the
single-admin pilot constraint.

The `academic` module implements the accepted administrator boundary for subject
preparation packages plus the student published-content boundary under
`/api/v1/academic/**` (LESSON + REMEDIATION reads and content progress). Package
lifecycle is subject-agnostic (one package per subject; draft/publish/archive;
JSONB revisions). Creatable subjects and default exam structure live in an
allow-listed subject profile (pilot: Mathematics with its CSCA 2025 defaults).
Publication validates the official-source reference (one or two language-edition
PDF locators, typically en and/or zh-CN), three-language authored outline,
mappings, resources, questions (including optional mathematical `hintTiers`,
`commonMistakeNotes`, `relatedResourceIds`), optional `assessmentSets`
(CHECKPOINT / TOPIC_PRACTICE), LaTeX/image blocks, provenance, and a mock that
matches the package's own exam structure in one transaction. Incomplete whole
drafts can be saved with expected-revision checks. Published JSONB revisions are
immutable. PNG/JPEG assets are bounded, decoded, re-encoded without submitted
metadata, hashed, and stored in PostgreSQL separately from revision documents.
Archive retains revisions, images, and value-free audit evidence.

Student consumption (VS-008 + VS-009 academic extensions, plus VS-010A
terminology) projects only `PUBLISHED` packages with an active revision:
package list/browse by subject, LESSON and REMEDIATION bodies by explanation
language (`id` | `en` | `zh-CN`) with explicit language-unavailable payloads,
content-progress upsert keyed by `(account, package, resource)` for both LESSON
and REMEDIATION, and image GET only when the image is referenced by an active
published revision. When a published revision has a Chinese exam-language term
bank, browse/lesson projections may add terminology preview refs, a topic rail,
and UTF-16 TEXT spans; those fields are omitted when the package has no terms.
Student terminology APIs cover preview GET (side-effect free), preview progress
and optional matching-pairs checks, term lookup (`MATCHED` / `NOT_IN_BANK`),
one notebook with due cloze-or-pairs review, and authorized MPEG pronunciation
GET. Viewing, preview checks, and word/phrase lookups are not mastery and never
write `CHECKPOINT_PASSED`. Missing explanation-language glosses are
`LANGUAGE_UNAVAILABLE` (never substituted). Student responses never include
drafts, questions, mocks, answer keys, or admin publisher identity. Pilot
access is open to every activated `STUDENT` via `ContentAccessPolicy`
(entitlements later). Progress is content status only (`NOT_STARTED` |
`IN_PROGRESS` | `CONTENT_COMPLETE` + resume block index)—never mastery.
Preview progress uses a separate table (`IN_PROGRESS` | `PREVIEW_COMPLETE`).
Soft `updatedSinceCompleted` signals when the active revision is newer than
the revision last marked content-complete without demoting status. V8 stores
`student_content_progress`. V12 stores term audio, preview progress, notebook,
and review events.

The `assessment` module (VS-009 backend, plus VS-010A Language help) implements
the student assessment lifecycle under `/api/v1/assessment/**`: published set
catalog and lesson checkpoint availability, session start/resume/list/cancel,
ordered mathematical hint disclosure, on-request Language help
(`languageHelpAvailable` on first paint; chips only after disclose), IMMEDIATE
vs SET_END answer locking, session submit with CHECKPOINT pass rule
(`ALL_CORRECT_NO_STRONG_ASSISTANCE`), mistake notebook with attempt-question
copy and optional annotation, remediation candidate resolution, revalidation
(STRONG hints disabled; `MATH_HINT` assistance blocks `REVALIDATION_PASSED`;
`LANGUAGE_ASSIST` does not), and append-only `CHECKPOINT_PASSED` objective
evidence on checkpoint pass only. Word/phrase Language help writes
`LANGUAGE_ASSIST` (`WORD` | `PHRASE`) and leaves `languageAssistUsed` false.
Pre-feedback payloads omit correct keys and undisclosed hint bodies;
`hintLadder` exposes strength metadata only. V9 stores `assessment_session`,
`assessment_item_attempt`, `assessment_assistance_event`,
`assessment_mistake`, and `assessment_objective_evidence`. V12 extends
assistance uniqueness to `(item_attempt_id, kind, tier_index)` and stores a
disclosed Language-help snapshot on the item. `LearningEvidencePort` is the
read-oriented evidence surface for later modules. Publish-time term audio uses
`SpeechSynthesisPort` (Azure adapter when enabled; tests use an in-process
stub). CI and tests do not contact Azure. Student audio GET never synthesizes.
No LLM/provider calls. Observability is value-free (no stems/answers/notes/keys,
selected unmatched text, SSML, or speech keys).

VS-005 is `DONE` after contract, PostgreSQL/Flyway (V6–V7), backend, production
admin frontend (`/admin/academic-packages` under `features/academic-admin`),
security/privacy, subject-profile extensibility, and product-owner journey
evidence. VS-008 is `DONE` after contract (`academic-student.tsp` / R3), V8,
backend student APIs, production Learn frontend
(`features/learn`: `/app/learn`, subject browse, LESSON reader), security/
privacy, prototype isolation, and product-owner journey evidence. VS-009 is `DONE` after contract (`assessment-student.tsp` /
`VS-009-R8-accepted`), V9+ assessment tables, backend student APIs, production
Practice/Mistakes/checkpoint/remediation UI (`features/assessment`),
security/privacy, prototype isolation, and product-owner journey evidence
(2026-08-14). KaTeX is used for admin formula preview and student LESSON MATH
rendering. Short video, object storage, and any scene-render worker remain
unimplemented (`VS-010B` is proposed only). Multi-subject content seeding and
mock student flows remain later slices.

`PATCH /api/v1/student-profile/me` updates only supplied learner-profile fields
for the authenticated owning `STUDENT`. The application validates the complete
patch before mutation, locks the existing profile row, treats empty or
identical patches as successful no-ops, and returns the authoritative private
profile without changing identity, role, or session state. Effective updates
and their value-free security event commit in one transaction. The endpoint
uses the existing V3 schema; no migration or new dependency is required.

The VS-003 password-recovery backend and production frontend are `DONE` after
focused contract, PostgreSQL/Flyway, backend, frontend, security/privacy, and
product-owner journey evidence. The frontend consumes the generated recovery
contract, reads fragment or query credentials, removes them from browser
history, and exposes retry and return-to-sign-in states. The VS-004 backend and
production profile/default-language settings frontend are `DONE` after contract,
PostgreSQL/Flyway, backend, frontend, route-boundary, security/privacy,
code-surface, and product-owner journey evidence. Production student surfaces
now include `/app/profile`, `/app/profile/languages`, Learn
(`/app/learn`, subject browse, LESSON reader under `features/learn`), and
assessment (`/app/practice`, sessions, mistakes, Learn checkpoint CTA,
remediation reader under `features/assessment`); post-setup home routes
activated students to `/app/learn`, and mobile More exposes production-safe
destinations without re-entering the preview-workspace gate for those routes.
Family, mock execution, access, commerce, tutoring, and AI destinations remain
prototype-only or unimplemented until their owning frontend slices land. VS-002 is also `DONE` after full implementation,
verification, and product owner signoff. VS-005 is `DONE` for the pilot admin
and first Mathematics package path. VS-008 is `DONE` for the first production
student consumer of published LESSON content with content progress only.
VS-009 student assessment APIs are implemented under `/api/v1/assessment/**`
from checkpoint `VS-009-R8-accepted` and are `DONE` after product-owner
acceptance of the checkpoint, topic-practice, and mistake→remediation→revalidation
journeys. VS-010A backend student terminology and Language-help APIs are
implemented from accepted checkpoint `VS-010A-R10-accepted`. The production
frontend for that slice is not claimed here; the slice remains
`CONTRACT_READY` until both sides record completion evidence.

## Prototype boundaries

Both prototypes keep domain state in deterministic React context/reducer memory.
That state makes no production API, browser-storage, cookie, analytics, or
telemetry writes, and refresh may reset it.

### PX-001 student preview

- `prototype/student/` owns goal, diagnostic, plan, learning, practice,
  remediation, mock, language, access, and state-loss scenarios.
- App guards connect production `STUDENT` activation to the preview while
  preserving anonymous, `UNASSIGNED`, unsupported-role, and incomplete-preview
  redirects.
- Fixture academic state is visibly labelled Preview and never expands
  generated API types.

### PX-002 consumer preview

- `prototype/consumer/` owns public discovery, fixture credentials, role intent,
  Parent/family, commerce, notification, account, and support journeys.
- `PreviewCredentialSession` never becomes production `CurrentUser`, tokens,
  cookies, or role. Google Student still uses production activation; fixture
  Student enters PX-001; Parent intent remains preview-only.
- Scope guards separately protect Student, Parent, and linked-recipient commerce
  routes. Parent commerce requires one active linked fixture student.
- Commerce fixtures demonstrate deterministic order IDs, immutable terminal
  outcomes, provider authority, and exactly-once entitlement from a matching
  Paid order. Payment instructions are visibly non-payable samples.
- PX-002 is a low-fidelity, mostly text-led journey model, not a production UI
  or data-model baseline. Each owning slice must re-read the latest requirements
  and design guidance, implement under `features`, and deliberately reuse,
  rewrite, or delete its prototype code.

## Integration rule

External OAuth, email, payment, LLM, meeting, storage, and similar providers
belong behind application ports and infrastructure adapters. Deterministic
services—not providers or models—retain authority for access, grading, mastery,
feasibility, publication, entitlements, and money.
