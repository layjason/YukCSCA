# User-story coverage audit

> **Classification: supporting traceability, non-normative.** Exact references show that a requirement section has at least one candidate story. They do not prove semantic completeness, implementation readiness, or delivery. The paired requirements remain authoritative.

## Snapshot

| Field | Value |
| --- | --- |
| Requirement baseline | English/Chinese V1.2, 2026-07-24 |
| Story baseline | `USER_STORIES.md` version 0.2.2 |
| Audit date | 2026-07-28 |
| P0 exact-reference coverage | **51 / 51 functional sections** |
| P1 exact-reference coverage | **25 / 33 functional sections** |
| P2 exact-reference coverage | **1 / 3 functional sections** |

All 51 P0 functional sections have candidate stories and a roadmap owner. The
roadmap groups tightly coupled stories into capability-sized slices, but this
traceability does not accept a contract or replace exact requirement mapping
during shaping.

## P0 coverage matrix

| Requirement | Requirement title | Candidate stories | Coverage note |
| --- | --- | --- | --- |
| 1.1 | Registration and Login | `US-AUTH-01`, `US-AUTH-02`, `US-AUTH-03`, `US-AUTH-04`, `US-PROF-03`, `US-ADMIN-01` | Owners: delivered `VS-000`; next selected `VS-002`; proposed `VS-003`, `VS-005`, `VS-011`. PX-002 remains fixture-only. |
| 1.2 | Profile Management | `US-PROF-01`, `US-PROF-02`, `US-PROF-03`, `US-PROF-04`, `US-ACCOUNT-01` | Owners: delivered `VS-001`; proposed `VS-004`, `VS-005`, `VS-010`. |
| 1.3 | Roles and Permissions | `US-PROF-01`, `US-PROF-03`, `US-ADMIN-01` | Owners: delivered `VS-001`; proposed `VS-005`, `VS-011`. |
| 1.4 | Learning and Language Preferences | `US-LANG-01`, `US-LANG-02`, `US-LANG-03` | Owners: proposed `VS-004`, `VS-014`, `VS-017`; language dimensions remain independent. |
| 2.1 | Parent Creates a Student Account | `US-FAM-00`, `US-FAM-04` | Owner: proposed `VS-006`, including both sides of the pending-to-activated lifecycle. |
| 2.2 | Student Invites a Parent to Link | `US-FAM-01`, `US-FAM-02` | Owner: proposed `VS-007`. |
| 2.3 | Relationship Management | `US-FAM-03` | Owner: proposed `VS-008`. |
| 3.1 | Academic Goals and Required Profile Information | `US-GOAL-01` | Owner: proposed `VS-014`. |
| 3.2 | Automatic CSCA Subject Matching and Prefill | `US-GOAL-02` | Owner: proposed `VS-014`. |
| 3.3 | Manual Subject Adjustments | `US-GOAL-03` | Owner: proposed `VS-014`. |
| 3.4 | Baseline Diagnostic Assessment | `US-DIAG-01`, `US-DIAG-02`, `US-PLAN-01` | Owner: proposed `VS-015`, preserving the diagnostic-to-first-plan loop. |
| 3.5 | Study-Plan Feasibility Assessment | `US-PLAN-02`, `US-PLAN-03` | Owner: proposed `VS-015`. |
| 4.1 | Course Catalog and Launch Scope | `US-COURSE-01` | Owners: proposed `VS-013`, `VS-016`. |
| 4.2 | Official Syllabus Mapping and Course Coverage Map | `US-SYL-01`, `US-ADM-03` | Owners: proposed `VS-012`, `VS-013`, `VS-016`. |
| 4.3 | Micro-Lesson Content | `US-COURSE-02`, `US-COURSE-04` | Owners: proposed `VS-013`, `VS-017`. |
| 4.4 | Explanation-Language and Exam-Language Bridging | `US-LANG-03`, `US-COURSE-02` | Owners: proposed `VS-004`, `VS-014`, `VS-017`. |
| 4.5 | Chinese Mathematics Terminology Preview and In-Question Support | `US-TERM-01`, `US-TERM-02`, `US-TERM-03` | Owner: proposed `VS-018`, keeping the terminology evidence loop coherent. |
| 4.6 | In-Course Assessment | `US-COURSE-03` | Owners: proposed `VS-013`, `VS-017`. |
| 5.1 | Topic Practice | `US-PRACTICE-01` | Owner: proposed `VS-019`. |
| 5.2 | Study-Plan Practice | `US-PRACTICE-02` | Owner: proposed `VS-019`. |
| 5.3 | Hints, Language Assistance, and Solutions | `US-TERM-01`, `US-HINT-01` | Owners: proposed `VS-018`, `VS-019`. |
| 5.4 | Mistake Notebook | `US-MISTAKE-01`, `US-MISTAKE-02`, `US-MISTAKE-03` | Owner: proposed `VS-019`. |
| 6.1 | Daily Task Entry Point | `US-AGENT-01`, `US-AGENT-02` | Owner: proposed `VS-020`. |
| 6.2 | Guided Learning Sessions | `US-AGENT-03` | Owner: proposed `VS-021`. |
| 6.3 | Contextual Questions and Answers | `US-AGENT-04` | Owner: proposed `VS-021`. |
| 6.4 | Automatic Remediation and Plan Reprioritization | `US-AGENT-05` | Owner: proposed `VS-021`; material reprioritization still requires student approval. |
| 7.1 | Mock-Exam Selection | `US-MOCK-01`, `US-TRIAL-03` | Owners: proposed `VS-023`, `VS-027`. |
| 7.2 | Exam Experience | `US-MOCK-02`, `US-MOCK-03`, `US-TRIAL-03` | Owners: proposed `VS-023`, `VS-027`; timed recovery and exactly-once submission remain coupled. |
| 7.3 | Results and Analysis | `US-MOCK-04`, `US-TRIAL-03` | Owners: proposed `VS-023`, `VS-027`. |
| 7.4 | Post-Mock Remediation Loop | `US-MOCK-05` | Owner: proposed `VS-024`. |
| 8.1 | Daily Goals and Learning Streaks | `US-MOT-01`, `US-MOT-02` | Owner: proposed `VS-020`. |
| 8.3 | Weekly Review | `US-WEEK-01` | Owner: proposed `VS-020`. |
| 10.1 | Learning Overview | `US-PARENT-01` | Owner: proposed `VS-026`. |
| 10.2 | Weekly Reports and Risk Alerts | `US-PARENT-02`, `US-PARENT-03` | Owner: proposed `VS-026`. |
| 10.3 | Payment and Tutoring Management | `US-PARENT-04`, `US-PAY-01` | Owners: proposed `VS-028`, `VS-029`; P1 tutoring workflow remains outside P0. |
| 10.4 | Privacy Boundaries | `US-FAM-02`, `US-PARENT-01` | Owner: proposed `VS-026`; relationship authorization originates in `VS-007`. |
| 11.1 | Free Trial | `US-TRIAL-01`, `US-TRIAL-02`, `US-TRIAL-03` | Owner: proposed `VS-027`. |
| 11.2 | Products and Entitlements | `US-TRIAL-01`, `US-PRODUCT-01` | Owner: proposed `VS-027`. |
| 11.3 | Indonesian Local Payment Methods | `US-PAY-01`, `US-PAY-02` | Owner: proposed `VS-028`. |
| 11.4 | Automatic and Manual Renewal | `US-RENEW-01` | Owner: proposed `VS-031`; P0 remains manual renewal plus expiry reminder. |
| 11.5 | Orders, Receipts, and Refunds | `US-PAY-02`, `US-ORDER-01`, `US-REFUND-01` | Owners: proposed `VS-028`, `VS-030`. |
| 13.1 | Learning Notifications | `US-NOTIFY-01`, `US-NOTIFY-02` | Owner: proposed `VS-025`. |
| 13.2 | Customer Service and Issue Reporting | `US-SUPPORT-01`, `US-SUPPORT-02` | Owner: proposed `VS-032`. |
| 14.1 | Admin Accounts and Permissions | `US-ADMIN-01` | Owner: proposed `VS-011`. |
| 14.2 | User and Relationship Management | `US-ADM-01` | Owner: proposed `VS-011`; admin actions do not edit learning outcomes. |
| 14.4 | Course, Syllabus, and Content Management | `US-ADM-02`, `US-ADM-03` | Owners: proposed `VS-012`, `VS-013`. |
| 14.5 | Question Bank and Mock-Exam Management | `US-ADM-04` | Owner: proposed `VS-013`. |
| 14.6 | Content Source and Authorization Ledger | `US-ADM-05` | Owner: proposed `VS-012`. |
| 14.7 | Order, Payment, and Refund Management | `US-FINOPS-01` | Owner: proposed `VS-030`. |
| 14.9 | AI and Content Quality Management | `US-SUPPORT-02`, `US-ADM-06` | Owners: proposed `VS-022`, `VS-032`. |
| 14.10 | Operating Analytics | `US-ADM-07` | Owner: proposed `VS-033`. |

## Escalating insufficient coverage during shaping

Coverage is a review aid, not proof that a flow is implementation-ready. During a slice's documentation-sufficiency review, an agent must raise a bounded human decision when the linked requirements and stories still cannot determine a material branch, actor handoff, state transition, privacy boundary, financial effect, or acceptance outcome.

Route the result according to ownership:

- update both requirement languages only when the product obligation itself changes and the human explicitly approves it;
- update `USER_STORIES.md` when decomposition or acceptance flow was incomplete but product meaning is unchanged;
- update this file when requirement-to-story mapping or a known gap changes;
- update the active slice when the resolved information is implementation-boundary detail;
- update `docs/GLOSSARY.md` when the root problem was ambiguous domain language.

Agents must not use a `Covered` row to justify inventing missing behavior, and they must not ask the human to re-answer facts already present in the source documents. The questioning limits and decision format are defined in `docs/delivery/HUMAN_REVIEW.md`.

## Remaining backlog gaps outside P0

### P1

- `4.7` — Learning-Material Actions (P1)
- `5.5` — Bookmarks and Challenge Practice (P1)
- `8.2` — Experience Points, Levels, and Badges (P1)
- `9.17` — Writing Homework Outcomes Back into the Study Plan (P1)
- `9.18` — Booking Messages and External-Chat Boundary (P1)
- `9.19` — Rating, Disputes, and Settlement (P1)
- `11.6` — Future Payment Expansion (P1)
- `13.3` — Announcements and Policy Updates (P1)

### P2

- `8.4` — Leaderboards and Social Motivation (P2)
- `12.5` — Consultation and Later Preparation (P2)

Before any missing P1/P2 area is accepted for implementation, add small user stories and avoid copying the requirement section wholesale. `US-TUTOR-12` currently spans 9.14–9.16 and should be decomposed further before that tutoring workflow is implemented.

## Cross-cutting requirements are not backlog stories

The non-functional requirements are mandatory acceptance dimensions for every affected slice rather than independent “technical stories.” Each slice plan must explicitly select and test the applicable controls:

- performance budgets and non-blocking exam behavior;
- availability, autosave, recovery, idempotency, and backup consequences;
- least privilege, audit, secure files, rate limiting, and sensitive logging;
- minor privacy, consent, data minimization, export/deletion, and parent/tutor boundaries;
- AI grounding, uncertainty, multilingual evaluation, and exam-mode refusal;
- content provenance, authorization, versioning, and takedown;
- localization, language separation, mobile accessibility, and low-bandwidth alternatives;
- financial reconciliation and exactly-once entitlement/refund behavior;
- maintainability through back-office updates and explainable historical versions;
- privacy-safe observability with defined metrics and freshness.

## Definition of coverage-ready

A story is considered coverage-ready for shaping only when:

- one actor and one observable outcome are clear;
- every normative bullet in the linked requirement section is either covered or explicitly assigned to another story;
- exclusions do not silently drop required behavior;
- success, validation, authorization/privacy, retry/idempotency, and stale-state behavior are represented where relevant;
- the story can be mapped to a bounded TypeSpec operation set without advertising future behavior;
- applicable NFRs can be named in the vertical-slice plan.

Exact-reference counts should be recomputed whenever the requirement or backlog version changes. This repository intentionally uses review and plan versions rather than adding a pnpm documentation-check script.
