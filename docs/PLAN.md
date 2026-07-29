# YukCSCA delivery plan

> **NON-NORMATIVE:** This document selects and sequences implementation slices. It does not create product requirements or acceptance criteria. The paired requirements remain authoritative; user stories decompose them; each accepted slice file is the executable implementation brief.

## Plan metadata

| Field                        | Value                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Plan ID                      | `YUK-P0-DELIVERY`                                                                                    |
| Plan version                 | `0.4.12`                                                                                             |
| Updated                      | 2026-07-29                                                                                           |
| Current baseline             | `VS-001` student-account activation — `DONE`                                                         |
| Current experience milestone | [`PX-002`](delivery/PX-002-public-parent-commerce-baseline.md) consumer experience baseline — `DONE` |
| Current production slice     | [`VS-003`](delivery/VS-003-credential-recovery.md) credential recovery — `CONTRACT_READY`            |
| Requirement baseline         | English/Chinese V1.2, 2026-07-24                                                                     |
| Story baseline               | `USER_STORIES.md` version 0.2.6                                                                      |

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

Each row is a capability-sized closed loop. A row may group tightly coupled stories when separating them would create a non-valuable intermediate state or repeatedly reopen the same lifecycle and contract. The paired requirements remain the only product authority; rows do not pre-authorize fields, operations, or acceptance criteria.

[`COVERAGE.md`](requirements/COVERAGE.md) audits all 51 P0 functional sections against these owners.

### Phase A — Identity, profiles, family, and administration

| Slice                                              | User-observable outcome                                                            | Stories                    | Main dependency                      | Status           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------- | ------------------------------------ | ---------------- |
| [`VS-000`](delivery/VS-000-google-auth.md)         | Sign in, restore a secure session, inspect current identity, and sign out          | `US-AUTH-01`, `US-AUTH-02` | Baseline                             | `DONE`           |
| [`VS-001`](delivery/VS-001-student-activation.md)  | Activate one student profile from an `UNASSIGNED` identity                         | `US-PROF-01`               | `VS-000`                             | `DONE`           |
| [`VS-002`](delivery/VS-002-credential-auth.md)     | Register, verify, and sign in with production credentials without inferring a role | `US-AUTH-03`               | `VS-000`; email and abuse decisions  | `DONE`           |
| [`VS-003`](delivery/VS-003-credential-recovery.md) | Recover a credential account through a non-enumerating single-use flow             | `US-AUTH-04`               | `VS-002`                             | `CONTRACT_READY` |
| `VS-004`                                           | Maintain a student profile and permanent explanation-language preference           | `US-PROF-02`, `US-LANG-01` | `VS-001`                             | `PROPOSED`       |
| `VS-005`                                           | Activate and maintain a parent profile with contact reverification                 | `US-PROF-03`, `US-PROF-04` | `VS-000`                             | `PROPOSED`       |
| `VS-006`                                           | Parent creates a pending student who can later activate that identity              | `US-FAM-00`, `US-FAM-04`   | `VS-005`                             | `PROPOSED`       |
| `VS-007`                                           | Student invites a parent who accepts an authorized primary relationship            | `US-FAM-01`, `US-FAM-02`   | `VS-001`, `VS-005`                   | `PROPOSED`       |
| `VS-008`                                           | Student or parent unlinks while preserving required history                        | `US-FAM-03`                | `VS-007`; ownership decisions        | `PROPOSED`       |
| `VS-009`                                           | Request and retrieve a privacy-safe personal-data export                           | `US-ACCOUNT-02`            | Activated account                    | `PROPOSED`       |
| `VS-010`                                           | Request and complete or hold account deletion with visible consequences            | `US-ACCOUNT-01`            | Activated account; blocker decisions | `PROPOSED`       |
| `VS-011`                                           | Authorized admins manage permissions, accounts, and relationships with audit       | `US-ADMIN-01`, `US-ADM-01` | `VS-000`; relevant account state     | `PROPOSED`       |

### Phase B — Academic content control plane

| Slice    | User-observable/operational outcome                                             | Stories                  | Main dependency | Status     |
| -------- | ------------------------------------------------------------------------------- | ------------------------ | --------------- | ---------- |
| `VS-012` | Record provenance and publish versioned official syllabus and resource mappings | `US-ADM-05`, `US-ADM-03` | `VS-011`        | `PROPOSED` |
| `VS-013` | Publish a governed bilingual assessed-learning package                          | `US-ADM-02`, `US-ADM-04` | `VS-012`        | `PROPOSED` |

### Phase C — Goals, diagnostics, and feasible planning

| Slice    | User-observable outcome                                                                 | Stories                                       | Main dependency    | Status     |
| -------- | --------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------ | ---------- |
| `VS-014` | Set a goal, review sourced recommendations, and confirm or adjust subject/exam language | `US-GOAL-01`–`03`, `US-LANG-03`               | `VS-001`, `VS-012` | `PROPOSED` |
| `VS-015` | Complete a resumable diagnostic and confirm an evidence-based feasible first-week plan  | `US-DIAG-01`, `US-DIAG-02`, `US-PLAN-01`–`03` | `VS-013`, `VS-014` | `PROPOSED` |

### Phase D — Learning, evidence, agent, and mock loops

| Slice    | User-observable outcome                                                                    | Stories                                                                | Main dependency              | Status     |
| -------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------- | ---------- |
| `VS-016` | Browse course hierarchy while separating official coverage from personal progress          | `US-COURSE-01`, `US-SYL-01`                                            | `VS-012`, `VS-013`, access   | `PROPOSED` |
| `VS-017` | Resume and complete a lesson, checkpoint, and remediation with temporary language control  | `US-COURSE-02`–`04`, `US-LANG-02`                                      | `VS-013`, `VS-016`           | `PROPOSED` |
| `VS-018` | Preview, use, collect, and review required Chinese terminology                             | `US-TERM-01`–`03`                                                      | `VS-012`, `VS-017`           | `PROPOSED` |
| `VS-019` | Complete practice and its mistake-classification, note, remediation, and revalidation loop | `US-PRACTICE-01`, `US-PRACTICE-02`, `US-HINT-01`, `US-MISTAKE-01`–`03` | `VS-013`, `VS-015`           | `PROPOSED` |
| `VS-020` | Use an ordered daily plan, adjust time, recover from missed days, and review the week      | `US-AGENT-01`, `US-AGENT-02`, `US-MOT-01`, `US-MOT-02`, `US-WEEK-01`   | `VS-015`, learning evidence  | `PROPOSED` |
| `VS-021` | Complete a contextual guided session and approve material plan reprioritization            | `US-AGENT-03`–`05`                                                     | `VS-017`, `VS-019`, `VS-020` | `PROPOSED` |
| `VS-022` | Review, correct, disable, or reroute flagged AI/content output                             | `US-ADM-06`                                                            | `VS-011`, `VS-021`           | `PROPOSED` |
| `VS-023` | Select, recover, submit exactly once, and review one timed mock                            | `US-MOCK-01`–`04`                                                      | `VS-013`, `VS-014`, access   | `PROPOSED` |
| `VS-024` | Complete post-mock remediation and compare later retest evidence                           | `US-MOCK-05`                                                           | `VS-019`, `VS-020`, `VS-023` | `PROPOSED` |

### Phase E — Parent, notification, trial, commerce, and operations

| Slice    | User-observable/operational outcome                                                       | Stories                                 | Main dependency                     | Status     |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------- | ---------- |
| `VS-025` | Configure notification preferences and receive authorized in-app or email delivery        | `US-NOTIFY-01`, `US-NOTIFY-02`          | Account state; first event producer | `PROPOSED` |
| `VS-026` | Parent reviews a privacy-safe overview, weekly report, risk, and action                   | `US-PARENT-01`–`03`                     | `VS-007`, `VS-020`, `VS-025`        | `PROPOSED` |
| `VS-027` | Visitor or registered student sees truthful products and representative trial flows       | `US-TRIAL-01`–`03`, `US-PRODUCT-01`     | `VS-013`, `VS-017`, `VS-023`        | `PROPOSED` |
| `VS-028` | Create an order, verify provider payment, grant entitlement once, and view receipt/status | `US-PAY-01`, `US-PAY-02`, `US-ORDER-01` | `VS-007`, `VS-027`; provider        | `PROPOSED` |
| `VS-029` | Parent views authorized student entitlement and purchased-service summaries               | `US-PARENT-04`                          | `VS-007`, `VS-028`                  | `PROPOSED` |
| `VS-030` | Submit and reconcile refund or duplicate-payment cases without duplicate side effects     | `US-REFUND-01`, `US-FINOPS-01`          | `VS-011`, `VS-028`                  | `PROPOSED` |
| `VS-031` | Receive expiry notice and create a truthful manual-renewal order                          | `US-RENEW-01`                           | `VS-025`, `VS-028`                  | `PROPOSED` |
| `VS-032` | Submit, reply to, escalate, and close a contextual support issue                          | `US-SUPPORT-01`, `US-SUPPORT-02`        | `VS-011`; first supported context   | `PROPOSED` |
| `VS-033` | Authorized operations staff view permission-scoped, privacy-safe metrics                  | `US-ADM-07`                             | `VS-011`; implemented event sources | `PROPOSED` |

## P0 ordering notes

- The table is a dependency-aware roadmap, not a commitment to implement every row before validating demand.
- `VS-000` and `VS-001` retain their delivered IDs. Version `0.4.0` performed
  the one-time renumbering of proposed work; after a detailed brief is created,
  its ID is immutable and later replacement uses `SUPERSEDED`.
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
| AI provider adapter     | `VS-021`                                                                   | Reviewed sources, deterministic tools, schemas, prompt-injection defenses, budgets, traces, and multilingual evaluations |
| Shared rate-limit store | Multiple API replicas or measured per-process insufficiency                | Topology/abuse evidence and operational ownership                                                                        |

## Deferred by default

- Microservices, Kubernetes, message brokers, distributed workflow engines
- Redis, MinIO, pgvector, separate search service, or multiple databases without a first measured use
- Spring AI or another model framework before bounded agent tools and evaluations exist
- Python runtime service, GraphQL, PWA/service-worker caching, and speculative offline sync

Deferral is not prohibition. The accepted slice must demonstrate the problem, compare a simpler design, and document security, operating, ownership, and rollback consequences.

## Revision history

| Version | Date       | Change                                                                                                                                                                                                                                                                        |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.4.12  | 2026-07-29 | Recorded completed frontend consumer review of `VS-003-R3-initial`, zero `CR-NN` requests, and accepted checkpoint `VS-003-R4-accepted`; moved `VS-003` to `CONTRACT_READY` while leaving implementation unstarted pending explicit worktree assignment.                      |
| 0.4.11  | 2026-07-29 | Recorded approved `VS-003` `D-01` Option A: successful password reset revokes all active refresh sessions while existing stateless access JWTs expire naturally within 15 minutes; returned the slice to `SHAPING` for contract initialization.                               |
| 0.4.10  | 2026-07-29 | Selected and shaped `VS-003` credential recovery, completed its adjacent-contract and documentation-sufficiency review, and moved it to `AWAITING_DECISION` for the explicit post-reset session-revocation policy before TypeSpec or implementation.                          |
| 0.4.9   | 2026-07-29 | Verified complete VS-002 credential authentication flow (email registration, Mailpit outbox delivery, Argon2id hashing, Google collision handling, UI contrast/alignment fixes, and test evidence); moved VS-002 to `DONE`.                                                   |
| 0.4.8   | 2026-07-28 | Implemented the VS-002 identity migration, credential lifecycle, versioned Argon2id hashing, policy evidence, SMTP outbox/Mailpit delivery, abuse controls, public transport, and focused backend/frontend integration evidence; moved the slice to `VERIFYING`.              |
| 0.4.7   | 2026-07-28 | Completed frontend consumer review of `VS-002` initial TypeSpec contract, verified complete screen states and user flows against `DESIGN.md` and generated declarations, established `VS-002-R6-accepted` with zero `CR-NN` requests, and moved `VS-002` to `CONTRACT_READY`. |
| 0.4.6   | 2026-07-28 | Recorded approved `VS-002` `D-04`: credential-only accounts keep a null display name until role-profile activation, collect/derive no profile name from email, and permit only a non-persisted presentation fallback. Returned the slice to `SHAPING`.                        |
| 0.4.5   | 2026-07-28 | Recorded approved `VS-002` `D-03` Option A: credential completion requires the active universal Terms version and Privacy Notice version, stores minimum version/timestamp evidence, and leaves age/guardian consequences to role activation.                                 |
| 0.4.4   | 2026-07-28 | Recorded approved `VS-002` `D-02` Option A: a verified collision with an existing Google account leaves that account unchanged, creates no password credential or link, and directs the user to authenticate with Google before any future linking/password setup.            |
| 0.4.3   | 2026-07-28 | Recorded the approved `VS-002` `D-01` Option A boundary: verification begins with an expiring email claim, and the password credential plus `UNASSIGNED` account are created atomically only after explicit mailbox-verification completion; TypeSpec remains blocked.        |
| 0.4.2   | 2026-07-28 | Created the `VS-002` production credential-authentication brief, completed its first shaping and adjacent-contract review, and moved the selected slice through `SHAPING` to `AWAITING_DECISION` before any TypeSpec or implementation.                                       |
| 0.4.1   | 2026-07-28 | Selected `VS-002` as the next backend-led shaping task while leaving its brief, human-decision review, and initial contract to the backend/slice owner.                                                                                                                       |
| 0.4.0   | 2026-07-28 | Regrouped 74 proposed micro-slices into 32 capability-sized closed loops, retained delivered `VS-000`/`VS-001`, preserved ownership of all 51 P0 requirement sections, and synchronized prototype/coverage references without changing product requirements.                  |
| 0.3.18  | 2026-07-27 | Marked PX-002 `DONE` at its explicitly non-production journey boundary, recorded its low-fidelity UI and incomplete-requirement limitations, added the prototype-to-production promotion process, and assigned proposed credential ownership later renumbered by `0.4.0`.     |
| 0.3.17  | 2026-07-26 | Moved PX-002 to `VERIFYING` after reviewer repairs and current frontend, connected-journey, localization, accessibility, responsive, boundary, and generated-artifact evidence; product-owner final review remains pending.                                                   |
| 0.3.16  | 2026-07-24 | Added `US-AUTH-03` and `US-AUTH-04` for later production email/password registration, verification, sign-in, and recovery without creating a production slice or changing PX-002's fixture boundary.                                                                          |
| 0.3.15  | 2026-07-24 | Added PX-002 as the current shaping milestone, qualified fixture-backed credential entry beside production Google authentication, and reconciled the PX-001 milestone row to `DONE`.                                                                                          |
| 0.3.14  | 2026-07-23 | Marked PX-001 `DONE` after the product owner verified the current revision-6 experience and found no remaining visual or journey issue; production-slice selection may resume.                                                                                                |
| 0.3.13  | 2026-07-23 | Moved PX-001 to `VERIFYING` after reviewer repairs, complete frontend gates, connected desktop/mobile journeys, responsive screenshots, and production/preview boundary checks.                                                                                               |
| 0.3.12  | 2026-07-23 | Removed PX-001 environment-flag gating; authenticated students access visibly labelled, in-memory preview routes directly.                                                                                                                                                    |
| 0.3.11  | 2026-07-23 | Expanded PX-001 to the goal-to-remediation journey, representative mock lifecycle, and supporting language/family/access visibility.                                                                                                                                          |
| 0.3.10  | 2026-07-23 | Made the complete connected P0 student experience—not an intermediate shell phase—the PX-001 acceptance boundary.                                                                                                                                                             |
| 0.3.9   | 2026-07-23 | Selected `PX-001` as the active non-production experience milestone and kept every referenced production capability slice `PROPOSED`.                                                                                                                                         |
| 0.3.8   | 2026-07-22 | Added experience/shaping/contract horizons and the DESIGN.md-guided prototype lane without expanding the speculative TypeSpec surface.                                                                                                                                        |
| 0.3.7   | 2026-07-22 | Closed `VS-001` after real-flow confirmation, persisted-state inspection, reproducible contract generation, focused final tests, and log redaction.                                                                                                                           |
| 0.3.6   | 2026-07-22 | Moved `VS-001` to `VERIFYING` after integrating its contract, migration, backend flow, onboarding UI, and focused automated evidence.                                                                                                                                         |
| 0.3.5   | 2026-07-22 | Moved `VS-001` to `CONTRACT_READY` after the profile TypeSpec compiled and generated declarations were reviewed.                                                                                                                                                              |
| 0.3.4   | 2026-07-22 | Approved the complete `VS-001` human-decision scope and moved the slice into TypeSpec shaping.                                                                                                                                                                                |
| 0.3.3   | 2026-07-22 | Returned `VS-000` to `DONE` after the product owner confirmed the repaired real Google-account relogin journey.                                                                                                                                                               |
| 0.3.2   | 2026-07-22 | Moved the `VS-000` regression repair to `VERIFYING` after automated and local-stack checks; real Google-account confirmation remains pending.                                                                                                                                 |
| 0.3.1   | 2026-07-22 | Reopened `VS-000` for the returning-user sign-in regression and safe failure-side-effect repair.                                                                                                                                                                              |
| 0.3.0   | 2026-07-21 | Added bounded human decision gates, documentation-sufficiency review, domain-language maintenance, and lazy decision records.                                                                                                                                                 |
| 0.2.0   | 2026-07-21 | Replaced the generic dependency-only plan with a versioned vertical-slice roadmap, lifecycle, explicit TypeSpec gate, and concrete next slice.                                                                                                                                |
| 0.1.0   | 2026-07-20 | Initial implementation principles and dependency activation list.                                                                                                                                                                                                             |
