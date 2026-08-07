# YukCSCA delivery plan

> **NON-NORMATIVE:** This document selects and sequences implementation slices. It does not create product requirements or acceptance criteria. The paired requirements remain authoritative; user stories decompose them; each accepted slice file is the executable implementation brief.

## Plan metadata

| Field                        | Value                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Plan ID                      | `YUK-P0-DELIVERY`                                                                                              |
| Plan version                 | `0.5.20`                                                                                                       |
| Updated                      | 2026-08-07                                                                                                     |
| Current baseline             | [`VS-005`](delivery/VS-005-academic-foundation.md) first admin and CSCA preparation package — `DONE`           |
| Current experience milestone | [`PX-002`](delivery/PX-002-public-parent-commerce-baseline.md) consumer experience baseline — `DONE`           |
| Current production slice     | [`VS-008`](delivery/VS-008-student-learn-content.md) student published LESSON browse and study — `IN_PROGRESS` |
| Requirement baseline         | English/Chinese V1.5, 2026-08-07                                                                               |
| Story baseline               | `USER_STORIES.md` version 0.3.3                                                                                |

Plan versions are review markers for delivery-document changes. They are not npm/Maven package versions and are not TypeSpec API versions. This repository does not add pnpm checks solely to validate plan metadata; Git review, slice revision history, and acceptance evidence provide traceability.

## How to execute this plan

When an experience milestone is active, execute its accepted `PX-NNN` brief through the complete integrated experience outcome. Ordered implementation steps manage risk but do not make a shell-only or disconnected-page subset an acceptable handoff. A PX milestone validates navigation and journey coherence; it does not implement or advance the production slices it references.

For production delivery:

1. Select one `PROPOSED` row whose dependencies are done or intentionally mocked at an approved boundary.
2. Create its `docs/delivery/VS-NNN-*.md` from the slice template and move it to `SHAPING`.
3. Complete the documentation-sufficiency review. If material semantics remain unresolved, follow `docs/delivery/HUMAN_REVIEW.md`, record stable decision IDs, and move the slice to `AWAITING_DECISION`.
4. Resolve product semantics, state transitions, ownership, privacy, money, and failure behavior; update the owning requirement/story/coverage/glossary/slice artifact after each human answer.
5. Write and review the TypeSpec operation set. A public-HTTP slice reaches `CONTRACT_READY` only after TypeSpec compiles and generated output is reviewed.
6. Once the slice gate permits implementation (`CONTRACT_READY` for public HTTP), each agent implements only its assigned backend or frontend sections from the same slice revision and accepted boundary, records its own evidence, and integrates the real flow before completion.
7. Mark `DONE` only when the actor completes the real flow and every acceptance criterion has named evidence.

The full process and lifecycle are defined in [`docs/delivery/README.md`](delivery/README.md). Future rows remain planning hypotheses; do not create empty modules, TypeSpec files, or slice documents for them.

## Experience, shaping, and contract horizons

YukCSCA separates product-journey coherence from executable API commitment:

1. **Experience horizon:** a non-production clickable prototype may connect multiple future student journeys to validate navigation, terminology, task order, responsive layout, and data needs. It follows root `DESIGN.md` and `docs/design/README.md`, uses explicit fixtures or mock adapters, and does not promise backend behavior.
2. **Shaping horizon:** keep the active slice and at most two likely next slices detailed enough to understand dependencies and user handoffs. Future roadmap rows remain capability hypotheses.
3. **Contract horizon:** add executable TypeSpec only for an accepted slice whose behavior, authorization, state transitions, failures, and privacy boundary are sufficiently resolved. Do not pre-build the full future API surface.

After a slice reaches `CONTRACT_READY`, backend and frontend implementation may proceed separately from the same reviewed contract checkpoint. The delivery guide owns the detailed agent handoff.

A prototype model must remain separate from generated API declarations. When a prototype area becomes an active production slice, either promote it deliberately to the accepted contract and feature structure or delete the exploratory code; do not let prototype assumptions silently become public API.

### Prototype-to-production promotion

`DONE` for a PX milestone accepts only its labelled journey, handoffs, and
isolation boundary. It does not certify production behavior, final visual
quality, complete requirement coverage, or reusable implementation.

For each production slice, re-read the latest paired requirements, stories and
coverage, accepted `VS-NNN` brief, root `DESIGN.md`,
`docs/design/README.md`, architecture/security/development guidance, TypeSpec,
and current code.

Treat the prototype as evidence about flow, not as a production data model.
Text-heavy, basic, or low-fidelity screens must be redesigned and refined for
the selected production task rather than copied unchanged.

## Experience milestones

Experience milestones are non-production delivery work. They may connect several future story areas to validate a coherent journey, but they do not change product requirements, advertise backend availability, persist fabricated academic evidence, or advance any referenced production slice.

| Milestone | User-observable outcome                                                                                                                                                                                                                                                                                                             | Owning brief                                                                                      | Depends on                                     | Status |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| `PX-001`  | An activated student can complete goal-to-plan onboarding, use every primary P0 destination, finish a lesson/practice/mistake/remediation loop, and complete a representative mock lifecycle with state-complete, accessible, responsive behavior while fixture-backed academic behavior remains visibly Preview and non-persistent | [`PX-001-product-experience-baseline.md`](delivery/PX-001-product-experience-baseline.md)         | `VS-000`, `VS-001`, root `DESIGN.md`           | `DONE` |
| `PX-002`  | A visitor can understand the product, compare production Google entry with fixture-backed credential entry, choose a student or parent continuation, and traverse connected public, parent, family, commerce, and aftercare previews without creating production identity, relationship, or financial state                         | [`PX-002-public-parent-commerce-baseline.md`](delivery/PX-002-public-parent-commerce-baseline.md) | `PX-001`, `VS-000`, `VS-001`, root `DESIGN.md` | `DONE` |

## P0 delivery graph

Each row is one capability-sized closed loop or one reliability-critical state transition. Delivered IDs `VS-000`–`VS-004` remain immutable. Rows without an accepted delivery brief are planning hypotheses and may be refined only before shaping.

The critical-path order is:

> **Academic content foundation → Epic D learning evidence → Epic E contextual Q&A (6.3) → Epic F mock selection/execution/analysis and follow-up recommendations (7.1–7.4A) → Epic C goals/diagnostic/planning → remaining Epic E plan orchestration (5.2, 6.1, 6.2, 6.4) → Epic F plan integration and revalidation (7.4B)**

This order preserves the normative study-plan dependencies while allowing planning to use real lesson, practice, mistake, remediation, and mock evidence. Family, account-lifecycle, commerce, and broad operations are separate later lanes and do not block the student-learning path. YukCSCA keeps only one active production slice at a time unless the product owner explicitly changes this rule.

[`COVERAGE.md`](requirements/COVERAGE.md) audits all 51 P0 functional sections against these owners.

### Lane 0 — Delivered identity foundation

| Slice                                              | User-observable outcome                                                            | Stories                    | Main dependency                     | Status |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------- | ----------------------------------- | ------ |
| [`VS-000`](delivery/VS-000-google-auth.md)         | Sign in, restore a secure session, inspect current identity, and sign out          | `US-AUTH-01`, `US-AUTH-02` | Baseline                            | `DONE` |
| [`VS-001`](delivery/VS-001-student-activation.md)  | Activate one student profile from an `UNASSIGNED` identity                         | `US-PROF-01`               | `VS-000`                            | `DONE` |
| [`VS-002`](delivery/VS-002-credential-auth.md)     | Register, verify, and sign in with production credentials without inferring a role | `US-AUTH-03`               | `VS-000`; email and abuse decisions | `DONE` |
| [`VS-003`](delivery/VS-003-credential-recovery.md) | Recover a credential account through a non-enumerating single-use flow             | `US-AUTH-04`               | `VS-002`                            | `DONE` |

### Lane 1 — Core student-learning critical path

| Slice                                                | User-observable outcome                                                                                                                                                                                                                                                                          | Stories / requirement areas                                                               | Main dependency                                          | Status        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------- |
| [`VS-004`](delivery/VS-004-student-profile.md)       | Maintain the student profile and default explanation language                                                                                                                                                                                                                                    | `US-PROF-02`, `US-LANG-01`                                                                | `VS-001`                                                 | `DONE`        |
| [`VS-005`](delivery/VS-005-academic-foundation.md)   | Configure the first platform admin and publish one CSCA Mathematics preparation package: official-source link(s) per language edition, localized syllabus outline, mapped original resources/questions with formulas and diagrams, and one 60-minute/100-point/48-question timed mock definition | `US-ADMIN-01`, `US-ADM-02`–`05`                                                           | `VS-000`; configured admin identity; publishable content | `DONE`        |
| [`VS-008`](delivery/VS-008-student-learn-content.md) | Browse a published package’s official-source outline and product coverage, open one LESSON (TEXT/MATH/IMAGE) with id/en/zh-CN explanation-language toggle, and resume content progress (not mastery)                                                                                             | Partial `US-COURSE-01`, partial student `US-SYL-01`, partial `US-COURSE-02`, `US-LANG-02` | `VS-004`, `VS-005`                                       | `IN_PROGRESS` |
| `VS-009`                                             | Complete a checkpoint or topic-practice set and close one mistake → remediation → revalidation loop                                                                                                                                                                                              | `US-COURSE-03`, `US-PRACTICE-01`, `US-HINT-01`, `US-MISTAKE-01`–`03`                      | `VS-005`, `VS-008`                                       | `PROPOSED`    |
| `VS-010`                                             | Preview, use, collect, and review required Chinese Mathematics terminology                                                                                                                                                                                                                       | `US-TERM-01`–`03`                                                                         | `VS-005`, `VS-009`                                       | `PROPOSED`    |
| `VS-011`                                             | Ask a grounded contextual question from a lesson, item, mistake, or remediation unit                                                                                                                                                                                                             | `US-AGENT-04`; requirement 6.3                                                            | `VS-008`, `VS-009`; AI quality gate                      | `PROPOSED`    |
| `VS-012`                                             | Select a mock, recover a timed attempt, and submit exactly once                                                                                                                                                                                                                                  | `US-MOCK-01`–`03`; requirements 7.1–7.2                                                   | `VS-005`; student access                                 | `PROPOSED`    |
| `VS-013`                                             | Review mock results and start recommended follow-up practice without a study plan                                                                                                                                                                                                                | `US-MOCK-04`, `US-MOCK-05A`; requirements 7.3–7.4A                                        | `VS-009`, `VS-012`                                       | `PROPOSED`    |
| `VS-014`                                             | Record a goal and confirm sourced subject and exam-language targets                                                                                                                                                                                                                              | `US-GOAL-01`–`03`, `US-LANG-03`                                                           | `VS-005`; student access                                 | `PROPOSED`    |
| `VS-015`                                             | Complete a diagnostic and review its evidence-bounded result                                                                                                                                                                                                                                     | `US-DIAG-01`, `US-DIAG-02`                                                                | `VS-005`, `VS-009`, `VS-014`                             | `PROPOSED`    |
| `VS-016`                                             | Generate, assess, adjust, and confirm the first feasible study plan                                                                                                                                                                                                                              | `US-PLAN-01`–`03`                                                                         | `VS-014`, `VS-015`                                       | `PROPOSED`    |
| `VS-017`                                             | Use daily tasks, reduce available time, complete plan-assigned practice, recover from missed days, and review the week                                                                                                                                                                           | `US-AGENT-01`, `US-AGENT-02`, `US-PRACTICE-02`, `US-MOT-01`, `US-MOT-02`, `US-WEEK-01`    | `VS-016`; learning evidence                              | `PROPOSED`    |
| `VS-018`                                             | Complete a bounded guided learning session with a recorded summary and minor plan effect                                                                                                                                                                                                         | `US-AGENT-03`                                                                             | `VS-011`, `VS-017`                                       | `PROPOSED`    |
| `VS-019`                                             | Approve a priority change, add selected post-mock recommendations to the current plan, and compare later results                                                                                                                                                                                 | `US-AGENT-05`, `US-MOCK-05B`; requirements 6.4 and 7.4B                                   | `VS-013`, `VS-016`, `VS-017`                             | `PROPOSED`    |

### Lane 2 — Trust, support, and operating controls

| Slice    | User-observable outcome                                          | Stories                          | Main dependency                                    | Status     |
| -------- | ---------------------------------------------------------------- | -------------------------------- | -------------------------------------------------- | ---------- |
| `VS-020` | Review, correct, disable, or reroute flagged AI/content output   | `US-ADM-06`                      | `VS-011`; first flags                              | `PROPOSED` |
| `VS-021` | Submit, reply to, escalate, and close a contextual support issue | `US-SUPPORT-01`, `US-SUPPORT-02` | First supported context; first admin initially     | `PROPOSED` |
| `VS-022` | View privacy-safe operating metrics                              | `US-ADM-07`                      | Implemented event producers; first admin initially | `PROPOSED` |

### Lane 3 — Family and account lifecycle

| Slice    | User-observable outcome                                                             | Stories                    | Main dependency                      | Status     |
| -------- | ----------------------------------------------------------------------------------- | -------------------------- | ------------------------------------ | ---------- |
| `VS-023` | Activate and maintain a parent profile with contact reverification                  | `US-PROF-03`, `US-PROF-04` | `VS-000`                             | `PROPOSED` |
| `VS-024` | Parent creates a pending student who later activates that identity                  | `US-FAM-00`, `US-FAM-04`   | `VS-023`                             | `PROPOSED` |
| `VS-025` | Student invites a parent who accepts an authorised primary relationship             | `US-FAM-01`, `US-FAM-02`   | `VS-001`, `VS-023`                   | `PROPOSED` |
| `VS-026` | Student or parent unlinks while preserving required history and service obligations | `US-FAM-03`                | `VS-025`; ownership decisions        | `PROPOSED` |
| `VS-027` | Request and retrieve a privacy-safe personal-data export                            | `US-ACCOUNT-02`            | Activated account                    | `PROPOSED` |
| `VS-028` | Request and complete or hold account deletion with visible consequences             | `US-ACCOUNT-01`            | Activated account; blocker decisions | `PROPOSED` |
| `VS-029` | The platform admin resolves account and relationship cases with audit               | `US-ADM-01`                | `VS-005`; relevant account state     | `PROPOSED` |

### Lane 4 — Trial, commerce, notification, and parent reporting

| Slice    | User-observable outcome                                                                                  | Stories                                 | Main dependency                        | Status     |
| -------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------- | ---------- |
| `VS-030` | Visitor or registered student sees truthful products and representative trial lesson/practice/mock flows | `US-TRIAL-01`–`03`, `US-PRODUCT-01`     | `VS-008`, `VS-009`, `VS-012`, `VS-013` | `PROPOSED` |
| `VS-031` | Create an order, verify provider payment, grant entitlement once, and view receipt/status                | `US-PAY-01`, `US-PAY-02`, `US-ORDER-01` | `VS-030`; provider                     | `PROPOSED` |
| `VS-032` | Parent views authorised student entitlement and purchased-service summaries                              | `US-PARENT-04`                          | `VS-025`, `VS-031`                     | `PROPOSED` |
| `VS-033` | Submit and reconcile refund or duplicate-payment cases without duplicate side effects                    | `US-REFUND-01`, `US-FINOPS-01`          | `VS-029`, `VS-031`                     | `PROPOSED` |
| `VS-034` | Configure notification preferences and receive authorised in-app or email delivery                       | `US-NOTIFY-01`, `US-NOTIFY-02`          | First event producer                   | `PROPOSED` |
| `VS-035` | Parent reviews a privacy-safe overview, weekly report, risk, and action                                  | `US-PARENT-01`–`03`                     | `VS-025`, `VS-017`, `VS-034`           | `PROPOSED` |
| `VS-036` | Receive expiry notice and create a truthful manual-renewal order                                         | `US-RENEW-01`                           | `VS-031`, `VS-034`                     | `PROPOSED` |

## P0 ordering notes

- Goal, diagnostic, and plan flows are an optional guided-preparation path. They are not prerequisites for direct subject learning, topic practice, contextual Q&A, or the core mock lifecycle.
- The only P0 learning capabilities that require an active plan are plan-assigned practice (`5.2`), daily task orchestration (`6.1`), guided sessions that write a plan effect (`6.2`), material reprioritisation (`6.4`), and post-mock plan integration (`7.4B`).
- `VS-005` configures one existing verified `UNASSIGNED` account as the first platform admin and publishes one Mathematics preparation package following the simple subject → syllabus outline item → resource/question → mock chain. Unavailable official dates are recorded as not stated rather than inferred or scraped.
- Approved `D-02` keeps official PDFs reference-only. The admin maintains language-edition source link(s) (typically en and/or zh-CN on csca.cn) and publishes concise YukCSCA-authored outline summaries in Bahasa Indonesia, English, and Simplified Chinese. Students see one compact official-source panel with one open action per configured language edition rather than copied official wording or repeated disclaimer text.
- `VS-008` is the first production student consumer of that published package: outline + product coverage + one LESSON reader with id/en/zh-CN explanation-language toggle and content progress only. Architecture is subject-agnostic; pilot content may remain Mathematics. Checkpoint, practice, mastery, video, parent syllabus, and entitlements remain later slices.
- `VS-005` keeps provenance operationally small: original content derives author/reviewer evidence from the admin and publish action, while external content still needs a source and permission reference.
- KaTeX and bounded PostgreSQL PNG/JPEG storage are selected for the first formula/diagram use. Object storage remains deferred until measured volume or protected-delivery needs justify it.
- `VS-006` and `VS-007` were absorbed into `VS-005` before shaping; later proposed slice identifiers remain unchanged.
- `VS-009` proves plan-independent practice and mistake remediation. `VS-017` later adds assigned practice through an active plan.
- `VS-011` proves contextual Q&A without a plan. `VS-018` later proves a guided session with a bounded plan effect.
- `VS-012` owns timed-attempt recovery and exactly-once submission. `VS-013` owns report interpretation and follow-up recommendations that can be started without a study plan.
- Do not shape Epic C before `VS-009` and `VS-013` can supply real evidence unless a bounded diagnostic-only need is explicitly selected.
- Family, commerce, and broad operations are separate later lanes and do not block the student-learning path. YukCSCA keeps only one active production slice at a time unless the product owner explicitly changes this rule.
- Agentic behavior begins only after deterministic reviewed content, assessment evidence, and bounded retrieval exist. The agent never becomes the authority for grading, mastery, entitlements, or plan feasibility.

## Dependency activation policy

Add a dependency only in the accepted slice that first uses it. The slice plan records why the existing stack is insufficient, security/operating impact, and removal strategy.

| Candidate               | Earliest useful slice                                                      | Evidence before addition                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| TanStack Query          | First screen with shared server state and real invalidation complexity     | Query ownership, invalidation rules, loading/error UX, and removal of overlapping request state                          |
| React Hook Form + Zod   | First multi-step form whose complexity exceeds native/local-state handling | One validation authority aligned with TypeSpec; no duplicate schema drift                                                |
| KaTeX                   | `VS-005` first reviewed lesson/question with mathematical notation         | Accessibility, CSP/font, low-bandwidth, and representative rendering tests                                               |
| Object-storage adapter  | First measured need beyond `VS-005` bounded PostgreSQL image storage       | Ownership, signed access, malware checks, retention, deletion, retry policy, and a migration path from PostgreSQL        |
| AI provider adapter     | `VS-011`                                                                   | Reviewed sources, deterministic tools, schemas, prompt-injection defenses, budgets, traces, and multilingual evaluations |
| Shared rate-limit store | Multiple API replicas or measured per-process insufficiency                | Topology/abuse evidence and operational ownership                                                                        |

## Deferred by default

- Microservices, Kubernetes, message brokers, distributed workflow engines
- Redis, MinIO, pgvector, separate search service, or multiple databases without a first measured use
- Spring AI or another model framework before bounded agent tools and evaluations exist
- Python runtime service, GraphQL, PWA/service-worker caching, and speculative offline sync

Deferral is not prohibition. The accepted slice must demonstrate the problem, compare a simpler design, and document security, operating, ownership, and rollback consequences.

## Revision history

| Version | Date | Change |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| 0.5.21 | 2026-08-07 | Implemented `VS-008` backend from `VS-008-R2-accepted`: V8 `student_content_progress`, published-package projector, five student academic HTTP operations, pilot open-access STUDENT policy, and focused unit + PostgreSQL/Testcontainers evidence. Moved slice to `IN_PROGRESS`; .  
| 0.5.20 | 2026-08-07 | Implemented `VS-008` Learn frontend from accepted checkpoint `VS-008-R2-accepted`: `features/learn` (package list, subject browse, LESSON reader, content progress, bearer images, KaTeX), promoted Learn routes off preview workspace gate, localized en/id/zh-CN, focused tests green. Slice stays `CONTRACT_READY` pending backend student APIs and product-owner journey acceptance. |
| 0.5.19 | 2026-08-07 | Completed `VS-008` frontend consumer review of `VS-008-R2-initial` with zero `CR-NN`; recorded matching accepted checkpoint `VS-008-R2-accepted`; expanded production Learn route/guard notes; moved the slice to `CONTRACT_READY`. Backend and frontend implementation remain unstarted. |
| 0.5.18 | 2026-08-07 | Initialized and compiled the five-operation `VS-008` student academic TypeSpec boundary (`contracts/academic-student.tsp`: list/browse packages, LESSON GET with explicit language-unavailable body, content-progress PUT, published image GET); regenerated OpenAPI/web declarations; recorded `VS-008-R2-initial`; retained `SHAPING` pending frontend consumer review. No backend or frontend implementation started. |
| 0.5.17 | 2026-08-07 | Selected and shaped `VS-008` as the first student consumer of published academic content: subject-extensible browse + LESSON reader with explanation-language toggle (id/en/zh-CN), content progress only (not mastery), pilot open-access for activated students, no exam-track lesson split, no checkpoint/practice. Created delivery brief revision 1 (`SHAPING`); approved product decisions `D-01`–`D-04`. Built on dual official `sourceLinks` baseline (V1.5). |
| 0.5.16 | 2026-08-07 | Corrected official-source modeling before student Learn: replaced singular `sourceUrl` + tags with language-keyed `sourceLinks` (en and/or zh-CN PDF locators); synchronized requirements V1.5, stories 0.3.3, glossary, coverage, architecture, and VS-005 revision notes. |
| 0.5.15 | 2026-08-07 | Recorded product-owner acceptance of the VS-005 configured-admin academic-package journey as enough for the pilot; moved VS-005 to `DONE`; set current baseline to VS-005 and left the next production slice unselected. Multi-subject seeding and student consumption remain later proposed slices. |
| 0.5.14 | 2026-08-07 | Generalized the `VS-005` academic package architecture for multi-subject extensibility without expanding pilot acceptance: subject profile + open exam structure, one package per subject, mock rules bound to package structure. Mathematics remains the only creatable pilot subject; full Physics/other seeding deferred. |
| 0.5.13 | 2026-08-01 | Implemented and verified the `VS-005` backend in its assigned worktree: exact configured-admin recognition across Google and credential sign-in, V6 academic persistence, the accepted eight-operation admin API, bounded PNG/JPEG handling, publication validation and immutable revision replacement, archive, authorization, and minimized audit. Moved the slice to `IN_PROGRESS`; frontend integration and product-owner journey acceptance remain pending. |
| 0.5.12 | 2026-07-31 | Completed the `VS-005-R4-initial` frontend consumer review; accepted and implemented `CR-01` for explicit unpublished-correction state; regenerated and confirmed the revised declarations; recorded `VS-005-R5-accepted`; and moved `VS-005` to `CONTRACT_READY` with zero open requests and implementation unstarted. |
| 0.5.11 | 2026-07-31 | Initialized and compiled the eight-operation `VS-005` admin academic-package TypeSpec boundary, regenerated and reviewed OpenAPI/web declarations, confirmed generated TypeScript consumption, recorded `VS-005-R4-initial`, and retained `SHAPING` while frontend consumer review remains pending. |
| 0.5.10 | 2026-07-31 | Recorded approved `VS-005` `D-02`: the official PDF remains reference-only; administrators maintain the source link; YukCSCA publishes concise Bahasa Indonesia, English, and Simplified Chinese outline summaries; and the UI uses one compact official-source action rather than copied wording or repeated notices. Synchronized requirements V1.4, stories 0.3.2, glossary, coverage, and slice revision 3, then returned `VS-005` to `SHAPING`. |
| 0.5.9 | 2026-07-31 | Recorded approved `VS-005` `D-01` Option A; rebuilt the slice from supplied official CSCA syllabus and rendered SJTU sample-paper evidence; simplified the preparation schema and provenance workflow; selected KaTeX plus bounded PostgreSQL image storage; made undeclared official dates explicit instead of scraped; and retained `AWAITING_DECISION` for the official syllabus's publication restriction (`D-02`). |
| 0.5.8 | 2026-07-31 | Selected `VS-005`, created its consolidated first-admin and governed academic-package shaping brief, completed the initial documentation/adjacent-contract/technology review, repaired coverage ownership after the prior `VS-006`/`VS-007` consolidation, and moved the slice to `AWAITING_DECISION` for the configured identity's existing-role conflict before TypeSpec or implementation. |
| 0.5.7 | 2026-07-31 | Combined the proposed first-admin, official-syllabus, and initial governed-content outcomes into `VS-005`; retired unshaped `VS-006` and `VS-007` without renumbering later proposed slices, and updated their downstream dependencies. |
| 0.5.6 | 2026-07-31 | Recorded product-owner acceptance of the bounded VS-004 profile/default-language journey with no reported problems, confirmed that `/app/profile` and `/app/profile/languages` are the only independently production-accessible student settings routes at this stage, and moved VS-004 to `DONE` without selecting or starting the next production slice. |
| 0.5.5 | 2026-07-31 | Implemented and focused-tested the VS-004 backend partial-update boundary, including student-only authorization, atomic validation, rolling birth-year correction, row-serialized no-op/concurrent updates, private responses, and value-free effective-change events; moved VS-004 to `IN_PROGRESS` pending frontend and integrated evidence. |
| 0.5.4 | 2026-07-31 | Recorded completed zero-request frontend consumer review of `VS-004-R3-initial`, established matching accepted checkpoint `VS-004-R4-accepted`, and moved VS-004 to `CONTRACT_READY` for separate backend/frontend implementation worktrees. |
| 0.5.3 | 2026-07-31 | Initialized and compiled the additive VS-004 student-profile partial-update contract, regenerated and reviewed OpenAPI/web declarations, confirmed generated TypeScript consumption, recorded `VS-004-R3-initial`, and retained `SHAPING` pending frontend consumer review. |
| 0.5.2 | 2026-07-31 | Recorded approved `VS-004` `D-01` Option A: students may correct birth year within the existing rolling Asia/Jakarta range; it remains non-legal age evidence, all history is preserved, and audit evidence excludes old/new values. Returned the slice to `SHAPING` for contract initialization. |
| 0.5.1 | 2026-07-31 | Selected and shaped `VS-004` student-profile and default-explanation-language maintenance, completed its adjacent-contract and documentation-sufficiency review, and moved it to `AWAITING_DECISION` for the post-activation birth-year correction policy before TypeSpec or implementation. |
| 0.5.0 | 2026-07-30 | Reprioritised P0 around the academic-content and student-learning critical path; separated direct preparation from plan orchestration; split contextual Q&A, timed mock execution, mock analysis, follow-up recommendations, and plan integration into independent slices; renumbered only unshaped proposed rows; synchronized requirements V1.3, stories 0.3.1, coverage, glossary, and prototype traceability. |
| 0.4.15 | 2026-07-30 | Recorded product-owner acceptance of the integrated VS-003 recovery journey with no reported problems and moved the slice to `DONE`; no subsequent production slice was selected or started. |
| 0.4.14 | 2026-07-30 | Integrated and code-surface reviewed the VS-003 production frontend, repaired the email-fragment reset handoff and retry/password-boundary handling, and retained `IN_PROGRESS` pending the production-built product-owner journey and experience review. |
| 0.4.13 | 2026-07-29 | Implemented and focused-tested the VS-003 backend boundary, including recovery persistence and SMTP delivery, generic request behavior, atomic password replacement, all-active-refresh-session revocation, concurrency controls, cleanup, and security events; moved the slice to `IN_PROGRESS` pending frontend and integrated evidence. |
| 0.4.12 | 2026-07-29 | Recorded completed frontend consumer review of `VS-003-R3-initial`, zero `CR-NN` requests, and accepted checkpoint `VS-003-R4-accepted`; moved `VS-003` to `CONTRACT_READY` while leaving implementation unstarted pending explicit worktree assignment. |
| 0.4.11 | 2026-07-29 | Recorded approved `VS-003` `D-01` Option A: successful password reset revokes all active refresh sessions while existing stateless access JWTs expire naturally within 15 minutes; returned the slice to `SHAPING` for contract initialization. |
| 0.4.10 | 2026-07-29 | Selected and shaped `VS-003` credential recovery, completed its adjacent-contract and documentation-sufficiency review, and moved it to `AWAITING_DECISION` for the explicit post-reset session-revocation policy before TypeSpec or implementation. |
| 0.4.9 | 2026-07-29 | Verified complete VS-002 credential authentication flow (email registration, Mailpit outbox delivery, Argon2id hashing, Google collision handling, UI contrast/alignment fixes, and test evidence); moved VS-002 to `DONE`. |
| 0.4.8 | 2026-07-28 | Implemented the VS-002 identity migration, credential lifecycle, versioned Argon2id hashing, policy evidence, SMTP outbox/Mailpit delivery, abuse controls, public transport, and focused backend/frontend integration evidence; moved the slice to `VERIFYING`. |
| 0.4.7 | 2026-07-28 | Completed frontend consumer review of `VS-002` initial TypeSpec contract, verified complete screen states and user flows against `DESIGN.md` and generated declarations, established `VS-002-R6-accepted` with zero `CR-NN` requests, and moved `VS-002` to `CONTRACT_READY`. |
| 0.4.6 | 2026-07-28 | Recorded approved `VS-002` `D-04`: credential-only accounts keep a null display name until role-profile activation, collect/derive no profile name from email, and permit only a non-persisted presentation fallback. Returned the slice to `SHAPING`. |
| 0.4.5 | 2026-07-28 | Recorded approved `VS-002` `D-03` Option A: credential completion requires the active universal Terms version and Privacy Notice version, stores minimum version/timestamp evidence, and leaves age/guardian consequences to role activation. |
| 0.4.4 | 2026-07-28 | Recorded approved `VS-002` `D-02` Option A: a verified collision with an existing Google account leaves that account unchanged, creates no password credential or link, and directs the user to authenticate with Google before any future linking/password setup. |
| 0.4.3 | 2026-07-28 | Recorded the approved `VS-002` `D-01` Option A boundary: verification begins with an expiring email claim, and the password credential plus `UNASSIGNED` account are created atomically only after explicit mailbox-verification completion; TypeSpec remains blocked. |
| 0.4.2 | 2026-07-28 | Created the `VS-002` production credential-authentication brief, completed its first shaping and adjacent-contract review, and moved the selected slice through `SHAPING` to `AWAITING_DECISION` before any TypeSpec or implementation. |
| 0.4.1 | 2026-07-28 | Selected `VS-002` as the next backend-led shaping task while leaving its brief, human-decision review, and initial contract to the backend/slice owner. |
| 0.4.0 | 2026-07-28 | Regrouped 74 proposed micro-slices into 32 capability-sized closed loops, retained delivered `VS-000`/`VS-001`, preserved ownership of all 51 P0 requirement sections, and synchronized prototype/coverage references without changing product requirements. |
| 0.3.18 | 2026-07-27 | Marked PX-002 `DONE` at its explicitly non-production journey boundary, recorded its low-fidelity UI and incomplete-requirement limitations, added the prototype-to-production promotion process, and assigned proposed credential ownership later renumbered by `0.4.0`. |
| 0.3.17 | 2026-07-26 | Moved PX-002 to `VERIFYING` after reviewer repairs and current frontend, connected-journey, localization, accessibility, responsive, boundary, and generated-artifact evidence; product-owner final review remains pending. |
| 0.3.16 | 2026-07-24 | Added `US-AUTH-03` and `US-AUTH-04` for later production email/password registration, verification, sign-in, and recovery without creating a production slice or changing PX-002's fixture boundary. |
| 0.3.15 | 2026-07-24 | Added PX-002 as the current shaping milestone, qualified fixture-backed credential entry beside production Google authentication, and reconciled the PX-001 milestone row to `DONE`. |
| 0.3.14 | 2026-07-23 | Marked PX-001 `DONE` after the product owner verified the current revision-6 experience and found no remaining visual or journey issue; production-slice selection may resume. |
| 0.3.13 | 2026-07-23 | Moved PX-001 to `VERIFYING` after reviewer repairs, complete frontend gates, connected desktop/mobile journeys, responsive screenshots, and production/preview boundary checks. |
| 0.3.12 | 2026-07-23 | Removed PX-001 environment-flag gating; authenticated students access visibly labelled, in-memory preview routes directly. |
| 0.3.11 | 2026-07-23 | Expanded PX-001 to the goal-to-remediation journey, representative mock lifecycle, and supporting language/family/access visibility. |
| 0.3.10 | 2026-07-23 | Made the complete connected P0 student experience—not an intermediate shell phase—the PX-001 acceptance boundary. |
| 0.3.9 | 2026-07-23 | Selected `PX-001` as the active non-production experience milestone and kept every referenced production capability slice `PROPOSED`. |
| 0.3.8 | 2026-07-22 | Added experience/shaping/contract horizons and the DESIGN.md-guided prototype lane without expanding the speculative TypeSpec surface. |
| 0.3.7 | 2026-07-22 | Closed `VS-001` after real-flow confirmation, persisted-state inspection, reproducible contract generation, focused final tests, and log redaction. |
| 0.3.6 | 2026-07-22 | Moved `VS-001` to `VERIFYING` after integrating its contract, migration, backend flow, onboarding UI, and focused automated evidence. |
| 0.3.5 | 2026-07-22 | Moved `VS-001` to `CONTRACT_READY` after the profile TypeSpec compiled and generated declarations were reviewed. |
| 0.3.4 | 2026-07-22 | Approved the complete `VS-001` human-decision scope and moved the slice into TypeSpec shaping. |
| 0.3.3 | 2026-07-22 | Returned `VS-000` to `DONE` after the product owner confirmed the repaired real Google-account relogin journey. |
| 0.3.2 | 2026-07-22 | Moved the `VS-000` regression repair to `VERIFYING` after automated and local-stack checks; real Google-account confirmation remains pending. |
| 0.3.1 | 2026-07-22 | Reopened `VS-000` for the returning-user sign-in regression and safe failure-side-effect repair. |
| 0.3.0 | 2026-07-21 | Added bounded human decision gates, documentation-sufficiency review, domain-language maintenance, and lazy decision records. |
| 0.2.0 | 2026-07-21 | Replaced the generic dependency-only plan with a versioned vertical-slice roadmap, lifecycle, explicit TypeSpec gate, and concrete next slice. |
| 0.1.0 | 2026-07-20 | Initial implementation principles and dependency activation list. |
