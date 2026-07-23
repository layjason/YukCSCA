# YukCSCA delivery plan

> **NON-NORMATIVE:** This document selects and sequences implementation slices. It does not create product requirements or acceptance criteria. The paired requirements remain authoritative; user stories decompose them; each accepted slice file is the executable implementation brief.

## Plan metadata

| Field                        | Value                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Plan ID                      | `YUK-P0-DELIVERY`                                                                               |
| Plan version                 | `0.3.14`                                                                                        |
| Updated                      | 2026-07-23                                                                                      |
| Current baseline             | `VS-001` student-account activation — `DONE`                                                    |
| Current experience milestone | [`PX-001`](delivery/PX-001-product-experience-baseline.md) product experience baseline — `DONE` |
| Current production slice     | None — select and shape the next production slice before implementation                         |
| Requirement baseline         | English/Chinese V1.1, 2026-07-20                                                                |
| Story baseline               | `USER_STORIES.md` version 0.2.0                                                                 |

Plan versions are review markers for delivery-document changes. They are not npm/Maven package versions and are not TypeSpec API versions. This repository does not add pnpm checks solely to validate plan metadata; Git review, slice revision history, and acceptance evidence provide traceability.

## How to execute this plan

When an experience milestone is active, execute its accepted `PX-NNN` brief through the complete integrated experience outcome. Ordered implementation steps manage risk but do not make a shell-only or disconnected-page subset an acceptable handoff. A PX milestone validates navigation and journey coherence; it does not implement or advance the production slices it references.

For production delivery:

1. Select one `PROPOSED` row whose dependencies are done or intentionally mocked at an approved boundary.
2. Create its `docs/delivery/VS-NNN-*.md` from the slice template and move it to `SHAPING`.
3. Complete the documentation-sufficiency review. If material semantics remain unresolved, follow `docs/delivery/HUMAN_REVIEW.md`, record stable decision IDs, and move the slice to `AWAITING_DECISION`.
4. Resolve product semantics, state transitions, ownership, privacy, money, and failure behavior; update the owning requirement/story/coverage/glossary/slice artifact after each human answer.
5. Write and review the TypeSpec operation set. A public-HTTP slice reaches `CONTRACT_READY` only after TypeSpec compiles and generated output is reviewed.
6. Implement backend, frontend, persistence, tests, observability, and documentation as one coherent vertical slice.
7. Mark `DONE` only when the actor completes the real flow and every acceptance criterion has named evidence.

The full process and lifecycle are defined in [`docs/delivery/README.md`](delivery/README.md). Future rows remain planning hypotheses; do not create empty modules, TypeSpec files, or slice documents for them.

## Experience, shaping, and contract horizons

YukCSCA separates product-journey coherence from executable API commitment:

1. **Experience horizon:** a non-production clickable prototype may connect multiple future student journeys to validate navigation, terminology, task order, responsive layout, and data needs. It follows root `DESIGN.md` and `docs/design/README.md`, uses explicit fixtures or mock adapters, and does not promise backend behavior.
2. **Shaping horizon:** keep the active slice and at most two likely next slices detailed enough to understand dependencies and user handoffs. Future roadmap rows remain capability hypotheses.
3. **Contract horizon:** add executable TypeSpec only for an accepted slice whose behavior, authorization, state transitions, failures, and privacy boundary are sufficiently resolved. Do not pre-build the full future API surface.

After a slice reaches `CONTRACT_READY`, frontend implementation against a contract-backed mock and backend implementation against the same contract may proceed in parallel. Choose frontend-first when navigation or interaction is the main risk; choose backend-first when transactions, authorization, idempotency, money, or concurrency are the main risk. Integrate the real flow as early as possible.

A prototype model must remain separate from generated API declarations. When a prototype area becomes an active production slice, either promote it deliberately to the accepted contract and feature structure or delete the exploratory code; do not let prototype assumptions silently become public API.

## Experience milestones

Experience milestones are non-production delivery work. They may connect several future story areas to validate a coherent journey, but they do not change product requirements, advertise backend availability, persist fabricated academic evidence, or advance any referenced production slice.

| Milestone | User-observable outcome                                                                                                                                                                                                                                                                                                             | Owning brief                                                                              | Depends on                           | Status      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------ | ----------- |
| `PX-001`  | An activated student can complete goal-to-plan onboarding, use every primary P0 destination, finish a lesson/practice/mistake/remediation loop, and complete a representative mock lifecycle with state-complete, accessible, responsive behavior while fixture-backed academic behavior remains visibly Preview and non-persistent | [`PX-001-product-experience-baseline.md`](delivery/PX-001-product-experience-baseline.md) | `VS-000`, `VS-001`, root `DESIGN.md` | `VERIFYING` |

## P0 delivery graph

### Phase A — Identity, roles, and family boundary

| Slice                                             | User-observable outcome                                                          | Stories                    | Main dependency                                 | Status     |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------- | ---------- |
| [`VS-000`](delivery/VS-000-google-auth.md)        | Sign in, restore a secure session, inspect current identity, and sign out        | `US-AUTH-01`, `US-AUTH-02` | Baseline                                        | `DONE`     |
| [`VS-001`](delivery/VS-001-student-activation.md) | Activate one student profile from an `UNASSIGNED` identity                       | `US-PROF-01`               | `VS-000`                                        | `DONE`     |
| `VS-002`                                          | Activate one parent profile with no student access until linked                  | `US-PROF-03`               | `VS-000`                                        | `PROPOSED` |
| `VS-003`                                          | Edit allowed student-profile fields without losing learning history              | `US-PROF-02`               | `VS-001`                                        | `PROPOSED` |
| `VS-004`                                          | Edit parent profile/contact settings with reverification boundaries              | `US-PROF-04`               | `VS-002`                                        | `PROPOSED` |
| `VS-005`                                          | Request and complete/hold an account-deletion lifecycle                          | `US-ACCOUNT-01`            | `VS-001` or `VS-002`; commerce blockers defined | `PROPOSED` |
| `VS-006`                                          | Request and retrieve a privacy-safe personal-data export                         | `US-ACCOUNT-02`            | `VS-001` or `VS-002`; secure file delivery      | `PROPOSED` |
| `VS-007`                                          | Provision an internal admin with explicit permission groups                      | `US-ADMIN-01`              | `VS-000`                                        | `PROPOSED` |
| `VS-008`                                          | Search accounts and resolve suspension/restoration/relationship cases with audit | `US-ADM-01`                | `VS-007`; profile/family state exists           | `PROPOSED` |
| `VS-009`                                          | Parent creates one pending student account and activation path                   | `US-FAM-00`                | `VS-002`                                        | `PROPOSED` |
| `VS-010`                                          | Student activates a parent-created pending account                               | `US-FAM-04`                | `VS-009`, Google identity binding decision      | `PROPOSED` |
| `VS-011`                                          | Student invitation is accepted into one active primary-parent relationship       | `US-FAM-01`, `US-FAM-02`   | `VS-001`, `VS-002`                              | `PROPOSED` |
| `VS-012`                                          | Student or parent unlinks while preserving payments and learning history         | `US-FAM-03`                | `VS-011`; order ownership policy                | `PROPOSED` |

### Phase B — Academic content and assessment control plane

These back-office slices precede production learning delivery because scored content must be reviewed, versioned, mapped, and provenance-authorized.

| Slice    | User-observable/operational outcome                                              | Stories     | Main dependency                                    | Status     |
| -------- | -------------------------------------------------------------------------------- | ----------- | -------------------------------------------------- | ---------- |
| `VS-013` | Reviewer records valid provenance and blocks unauthorized publication            | `US-ADM-05` | `VS-007`                                           | `PROPOSED` |
| `VS-014` | Admin publishes a versioned official syllabus and reviewed resource mappings     | `US-ADM-03` | `VS-007`, `VS-013`                                 | `PROPOSED` |
| `VS-015` | Author/reviewer publishes one complete versioned learning unit                   | `US-ADM-02` | `VS-013`, `VS-014`                                 | `PROPOSED` |
| `VS-016` | Reviewer publishes one scored question and bounded mock configuration            | `US-ADM-04` | `VS-013`, `VS-014`                                 | `PROPOSED` |
| `VS-017` | Academic reviewer disposes a flagged AI answer and can disable/reroute its scope | `US-ADM-06` | `VS-007`; reviewed content and agent answers exist | `PROPOSED` |

### Phase C — Language, goals, diagnostics, and feasible planning

| Slice    | User-observable outcome                                                     | Stories      | Main dependency                                    | Status     |
| -------- | --------------------------------------------------------------------------- | ------------ | -------------------------------------------------- | ---------- |
| `VS-018` | Save a permanent explanation-language preference                            | `US-LANG-01` | `VS-001`                                           | `PROPOSED` |
| `VS-019` | Temporarily override explanation language for one session                   | `US-LANG-02` | `VS-018`; one learning session exists              | `PROPOSED` |
| `VS-020` | Change a confirmed subject exam language after impact review                | `US-LANG-03` | subject enrollment from `VS-023`; content mappings | `PROPOSED` |
| `VS-021` | Save a planning goal with one primary target and weekly availability        | `US-GOAL-01` | `VS-001`                                           | `PROPOSED` |
| `VS-022` | Receive source-dated subject/exam-language recommendations                  | `US-GOAL-02` | `VS-021`; verified requirement data                | `PROPOSED` |
| `VS-023` | Confirm or adjust canonical subject-language enrollments with risk warnings | `US-GOAL-03` | `VS-022`                                           | `PROPOSED` |
| `VS-024` | Start, autosave, resume, and submit a valid diagnostic attempt              | `US-DIAG-01` | `VS-016`, `VS-023`                                 | `PROPOSED` |
| `VS-025` | View an evidence-bounded diagnostic result and recommended starting point   | `US-DIAG-02` | `VS-024`                                           | `PROPOSED` |
| `VS-026` | Review, adjust intensity, and confirm the first-week plan                   | `US-PLAN-01` | `VS-021`, `VS-025`                                 | `PROPOSED` |
| `VS-027` | View deterministic plan feasibility and reasons                             | `US-PLAN-02` | `VS-026`; workload estimates                       | `PROPOSED` |
| `VS-028` | Apply one chosen feasibility adjustment without rewriting history           | `US-PLAN-03` | `VS-027`                                           | `PROPOSED` |

### Phase D — Course, terminology, practice, and evidence loops

| Slice    | User-observable outcome                                                          | Stories          | Main dependency                           | Status     |
| -------- | -------------------------------------------------------------------------------- | ---------------- | ----------------------------------------- | ---------- |
| `VS-029` | Browse subject-language course structure and readiness                           | `US-COURSE-01`   | `VS-015`, entitlement/trial read boundary | `PROPOSED` |
| `VS-030` | Compare official syllabus coverage with personal progress as separate dimensions | `US-SYL-01`      | `VS-014`, `VS-029`                        | `PROPOSED` |
| `VS-031` | Resume and consume a micro-lesson through accessible media/text controls         | `US-COURSE-04`   | `VS-015`, `VS-029`                        | `PROPOSED` |
| `VS-032` | Finish one focused learning unit and reach its checkpoint entry                  | `US-COURSE-02`   | `VS-031`                                  | `PROPOSED` |
| `VS-033` | Complete an in-course checkpoint and branch to progression/remediation           | `US-COURSE-03`   | `VS-016`, `VS-032`                        | `PROPOSED` |
| `VS-034` | Preview required Chinese Mathematics terms before a topic                        | `US-TERM-02`     | `VS-014`, `VS-015`, Chinese track         | `PROPOSED` |
| `VS-035` | Select a Chinese word/phrase and record bounded assistance use                   | `US-TERM-01`     | `VS-034`, learning mode                   | `PROPOSED` |
| `VS-036` | Review automatically collected terminology and produce later evidence            | `US-TERM-03`     | `VS-035`, mistake evidence                | `PROPOSED` |
| `VS-037` | Create, complete, and score a bounded topic-practice set                         | `US-PRACTICE-01` | `VS-016`, `VS-023`                        | `PROPOSED` |
| `VS-038` | Complete plan-assigned practice and close/update the plan task once              | `US-PRACTICE-02` | `VS-026`, `VS-037`                        | `PROPOSED` |
| `VS-039` | Request progressive hints whose strength changes evidence interpretation         | `US-HINT-01`     | `VS-037`                                  | `PROPOSED` |
| `VS-040` | Capture one incorrect attempt into a traceable mistake record                    | `US-MISTAKE-01`  | `VS-037`                                  | `PROPOSED` |
| `VS-041` | Classify a mistake and save a private student note                               | `US-MISTAKE-02`  | `VS-040`                                  | `PROPOSED` |
| `VS-042` | Revalidate a due mistake with delayed independent evidence                       | `US-MISTAKE-03`  | `VS-040`, review scheduling               | `PROPOSED` |

### Phase E — Agentic daily learning

| Slice    | User-observable outcome                                                  | Stories       | Main dependency                          | Status     |
| -------- | ------------------------------------------------------------------------ | ------------- | ---------------------------------------- | ---------- |
| `VS-043` | View an ordered, reasoned, time-bounded daily task list                  | `US-AGENT-01` | `VS-026`, mastery/review evidence        | `PROPOSED` |
| `VS-044` | Reduce today's time and transparently reschedule lower-priority tasks    | `US-AGENT-02` | `VS-043`, `VS-027`                       | `PROPOSED` |
| `VS-045` | Complete a guided explanation-question-feedback-practice-summary session | `US-AGENT-03` | reviewed content, `VS-033`, `VS-037`     | `PROPOSED` |
| `VS-046` | Ask a contextual question with language/source/confidence boundaries     | `US-AGENT-04` | `VS-017`, one supported learning context | `PROPOSED` |
| `VS-047` | Accept or reject a high-impact plan reprioritization                     | `US-AGENT-05` | `VS-043`, new assessment evidence        | `PROPOSED` |

### Phase F — Mock exams, motivation, and parent support

| Slice    | User-observable outcome                                                     | Stories                    | Main dependency                             | Status     |
| -------- | --------------------------------------------------------------------------- | -------------------------- | ------------------------------------------- | ---------- |
| `VS-048` | Compare and start an eligible mock with disclosed scope/language/time       | `US-MOCK-01`               | `VS-016`, entitlement/trial boundary        | `PROPOSED` |
| `VS-049` | Take, autosave, recover, submit/auto-submit one timed attempt exactly once  | `US-MOCK-02`, `US-MOCK-03` | `VS-048`                                    | `PROPOSED` |
| `VS-050` | Review score, time, topic evidence, and bounded issue categories            | `US-MOCK-04`               | `VS-049`                                    | `PROPOSED` |
| `VS-051` | Confirm post-mock remediation and compare later retest evidence             | `US-MOCK-05`               | `VS-050`, `VS-043`                          | `PROPOSED` |
| `VS-052` | Set and complete a meaningful daily goal with exactly-once streak update    | `US-MOT-01`                | `VS-043`                                    | `PROPOSED` |
| `VS-053` | Recover from a missed day through a bounded restart and plan reconciliation | `US-MOT-02`                | `VS-052`, `VS-027`                          | `PROPOSED` |
| `VS-054` | Review the learning week and confirm one next-week decision                 | `US-WEEK-01`               | learning evidence and plan                  | `PROPOSED` |
| `VS-055` | Parent views a privacy-safe linked-student learning overview                | `US-PARENT-01`             | `VS-011`, learning evidence                 | `PROPOSED` |
| `VS-056` | Parent receives one preference-compliant weekly report                      | `US-PARENT-03`             | `VS-054`, `VS-055`, notification delivery   | `PROPOSED` |
| `VS-057` | Parent acts on a deduplicated risk alert without rewriting the plan         | `US-PARENT-02`             | `VS-055`, risk rules, notification delivery | `PROPOSED` |
| `VS-058` | Parent views authorized entitlement and purchased-service summaries         | `US-PARENT-04`             | `VS-011`, commerce states                   | `PROPOSED` |

### Phase G — Trial, products, payments, notifications, and support

| Slice    | User-observable outcome                                                     | Stories         | Main dependency                             | Status     |
| -------- | --------------------------------------------------------------------------- | --------------- | ------------------------------------------- | ---------- |
| `VS-059` | Visitor browses truthful product/coverage/trial information                 | `US-TRIAL-01`   | `VS-014`, product catalog                   | `PROPOSED` |
| `VS-060` | Registered student completes one bounded learn-practice-feedback trial      | `US-TRIAL-02`   | `VS-031`, `VS-037`, trial entitlement       | `PROPOSED` |
| `VS-061` | Registered student completes one representative trial mock workflow         | `US-TRIAL-03`   | `VS-048`–`VS-050`, trial entitlement        | `PROPOSED` |
| `VS-062` | Buyer reviews a complete subject-language product before checkout           | `US-PRODUCT-01` | `VS-014`, product/entitlement model         | `PROPOSED` |
| `VS-063` | Payer creates one immutable pending local-payment order for a recipient     | `US-PAY-01`     | `VS-062`, `VS-011` for parent payer         | `PROPOSED` |
| `VS-064` | Verified provider success grants one matching entitlement exactly once      | `US-PAY-02`     | `VS-063`, payment adapter                   | `PROPOSED` |
| `VS-065` | Payer views authoritative order states and eligible receipts                | `US-ORDER-01`   | `VS-063`, `VS-064`                          | `PROPOSED` |
| `VS-066` | Payer submits and tracks a refund/duplicate-payment case                    | `US-REFUND-01`  | `VS-065`, support/finance workflow          | `PROPOSED` |
| `VS-067` | Payer receives expiry notice and creates a truthful manual-renewal order    | `US-RENEW-01`   | `VS-064`, notification delivery             | `PROPOSED` |
| `VS-068` | User configures channel/type preferences with separate marketing consent    | `US-NOTIFY-01`  | profile/account state                       | `PROPOSED` |
| `VS-069` | Eligible event produces one preference-compliant authorized notification    | `US-NOTIFY-02`  | `VS-068`, first event producer              | `PROPOSED` |
| `VS-070` | User submits one contextual support ticket without unsafe data copying      | `US-SUPPORT-01` | account state; first supported context      | `PROPOSED` |
| `VS-071` | Support admin replies, escalates, and closes a ticket with audit            | `US-SUPPORT-02` | `VS-007`, `VS-070`                          | `PROPOSED` |
| `VS-072` | Finance admin reconciles payment/refund/entitlement exceptions exactly once | `US-FINOPS-01`  | `VS-007`, `VS-063`–`VS-066`                 | `PROPOSED` |
| `VS-073` | Operations admin views permission-scoped privacy-safe metrics               | `US-ADM-07`     | implemented event producers and definitions | `PROPOSED` |

## P0 ordering notes

- The table is a dependency-aware roadmap, not a commitment to implement every row before validating demand.
- A representative student learning loop can be piloted before all P0 back-office breadth, but production scored learning still requires the minimum reviewed content, syllabus mapping, question publication, provenance, and admin access slices.
- Parent, payment, and support slices may be deferred during an internal student-only pilot only through an explicit change to the normative requirement qualification, not by editing this plan.
- Agentic behavior should begin only after deterministic content, assessment, mastery evidence, and plan state exist. The agent must orchestrate bounded tools; it must not become the authority for grading, mastery, entitlements, or plan feasibility.

## Dependency activation policy

Add a dependency only in the accepted slice that first uses it. The slice plan records why the existing stack is insufficient, security/operating impact, and removal strategy.

| Candidate               | Earliest useful slice                                                      | Evidence before addition                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| TanStack Query          | First screen with shared server state and real invalidation complexity     | Query ownership, invalidation rules, loading/error UX, and removal of overlapping request state                          |
| React Hook Form + Zod   | First multi-step form whose complexity exceeds native/local-state handling | One validation authority aligned with TypeSpec; no duplicate schema drift                                                |
| KaTeX                   | First reviewed lesson/question with mathematical notation                  | Accessibility, CSP/font, low-bandwidth, and representative rendering tests                                               |
| Object-storage adapter  | First authorized PDF/content/student upload                                | Ownership, signed access, malware checks, retention, deletion, and retry policy                                          |
| AI provider adapter     | `VS-045` or `VS-046`                                                       | Reviewed sources, deterministic tools, schemas, prompt-injection defenses, budgets, traces, and multilingual evaluations |
| Shared rate-limit store | Multiple API replicas or measured per-process insufficiency                | Topology/abuse evidence and operational ownership                                                                        |

## Deferred by default

- Microservices, Kubernetes, message brokers, distributed workflow engines
- Redis, MinIO, pgvector, separate search service, or multiple databases without a first measured use
- Spring AI or another model framework before bounded agent tools and evaluations exist
- Python runtime service, GraphQL, PWA/service-worker caching, and speculative offline sync

Deferral is not prohibition. The accepted slice must demonstrate the problem, compare a simpler design, and document security, operating, ownership, and rollback consequences.

## Revision history

| Version | Date       | Change                                                                                                                                                                          |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.3.14  | 2026-07-23 | Marked PX-001 `DONE` after the product owner verified the current revision-6 experience and found no remaining visual or journey issue; production-slice selection may resume.  |
| 0.3.13  | 2026-07-23 | Moved PX-001 to `VERIFYING` after reviewer repairs, complete frontend gates, connected desktop/mobile journeys, responsive screenshots, and production/preview boundary checks. |
| 0.3.12  | 2026-07-23 | Removed PX-001 environment-flag gating; authenticated students access visibly labelled, in-memory preview routes directly.                                                      |
| 0.3.11  | 2026-07-23 | Expanded PX-001 to the goal-to-remediation journey, representative mock lifecycle, and supporting language/family/access visibility.                                            |
| 0.3.10  | 2026-07-23 | Made the complete connected P0 student experience—not an intermediate shell phase—the PX-001 acceptance boundary.                                                               |
| 0.3.9   | 2026-07-23 | Selected `PX-001` as the active non-production experience milestone and kept every referenced production capability slice `PROPOSED`.                                           |
| 0.3.8   | 2026-07-22 | Added experience/shaping/contract horizons and the DESIGN.md-guided prototype lane without expanding the speculative TypeSpec surface.                                          |
| 0.3.7   | 2026-07-22 | Closed `VS-001` after real-flow confirmation, persisted-state inspection, reproducible contract generation, focused final tests, and log redaction.                             |
| 0.3.6   | 2026-07-22 | Moved `VS-001` to `VERIFYING` after integrating its contract, migration, backend flow, onboarding UI, and focused automated evidence.                                           |
| 0.3.5   | 2026-07-22 | Moved `VS-001` to `CONTRACT_READY` after the profile TypeSpec compiled and generated declarations were reviewed.                                                                |
| 0.3.4   | 2026-07-22 | Approved the complete `VS-001` human-decision scope and moved the slice into TypeSpec shaping.                                                                                  |
| 0.3.3   | 2026-07-22 | Returned `VS-000` to `DONE` after the product owner confirmed the repaired real Google-account relogin journey.                                                                 |
| 0.3.2   | 2026-07-22 | Moved the `VS-000` regression repair to `VERIFYING` after automated and local-stack checks; real Google-account confirmation remains pending.                                   |
| 0.3.1   | 2026-07-22 | Reopened `VS-000` for the returning-user sign-in regression and safe failure-side-effect repair.                                                                                |
| 0.3.0   | 2026-07-21 | Added bounded human decision gates, documentation-sufficiency review, domain-language maintenance, and lazy decision records.                                                   |
| 0.2.0   | 2026-07-21 | Replaced the generic dependency-only plan with a versioned vertical-slice roadmap, lifecycle, explicit TypeSpec gate, and concrete next slice.                                  |
| 0.1.0   | 2026-07-20 | Initial implementation principles and dependency activation list.                                                                                                               |
