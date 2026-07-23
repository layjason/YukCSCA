# User-story coverage audit

> **Classification: supporting traceability, non-normative.** Exact references show that a requirement section has at least one candidate story. They do not prove semantic completeness, implementation readiness, or delivery. The paired requirements remain authoritative.

## Snapshot

| Field | Value |
| --- | --- |
| Requirement baseline | English/Chinese V1.2, 2026-07-24 |
| Story baseline | `USER_STORIES.md` version 0.2.2 |
| Audit date | 2026-07-24 |
| P0 exact-reference coverage | **51 / 51 functional sections** |
| P1 exact-reference coverage | **25 / 33 functional sections** |
| P2 exact-reference coverage | **1 / 3 functional sections** |

P0 exact-reference coverage became complete after adding explicit stories for parent activation and parent-created students, in-course assessment, Chinese terminology preview/review, parent weekly reporting and entitlement visibility, manual renewal, notification delivery, user/relationship administration, and financial reconciliation.

## P0 coverage matrix

| Requirement | Requirement title | Candidate stories | Coverage note |
| --- | --- | --- | --- |
| 1.1 | Registration and Login | `US-AUTH-01`, `US-AUTH-02`, `US-AUTH-03`, `US-AUTH-04`, `US-PROF-03`, `US-ADMIN-01` | `VS-000` implements Google-only production authentication. `US-AUTH-03` and `US-AUTH-04` preserve the later production email/password and recovery outcomes, but have no accepted production slice or contract. PX-002 may preview those flows through deterministic fixtures without creating production identity or closing either story. |
| 1.2 | Profile Management | `US-PROF-01`, `US-PROF-02`, `US-PROF-03`, `US-PROF-04`, `US-ACCOUNT-01` | `VS-001` delivers student activation; editing, parent profile, and account lifecycle remain separate slices. |
| 1.3 | Roles and Permissions | `US-PROF-01`, `US-PROF-03`, `US-ADMIN-01` | `VS-001` delivers the bounded `UNASSIGNED` to `STUDENT` transition; other provisioning and permissions remain separate slices. |
| 1.4 | Learning and Language Preferences | `US-LANG-01`, `US-LANG-02`, `US-LANG-03` | `VS-001` persists the activation-time default explanation language; later editing, session override, and exam language remain separate. |
| 2.1 | Parent Creates a Student Account | `US-FAM-00`, `US-FAM-04` | Split into parent creation and student activation so the two-actor lifecycle is demonstrable. |
| 2.2 | Student Invites a Parent to Link | `US-FAM-01`, `US-FAM-02` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 2.3 | Relationship Management | `US-FAM-03` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 3.1 | Academic Goals and Required Profile Information | `US-GOAL-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 3.2 | Automatic CSCA Subject Matching and Prefill | `US-GOAL-02` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 3.3 | Manual Subject Adjustments | `US-GOAL-03` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 3.4 | Baseline Diagnostic Assessment | `US-DIAG-01`, `US-DIAG-02`, `US-PLAN-01` | Diagnostic attempt, report, and first-week plan are separate outcomes. |
| 3.5 | Study-Plan Feasibility Assessment | `US-PLAN-02`, `US-PLAN-03` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 4.1 | Course Catalog and Launch Scope | `US-COURSE-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 4.2 | Official Syllabus Mapping and Course Coverage Map | `US-SYL-01`, `US-ADM-03` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 4.3 | Micro-Lesson Content | `US-COURSE-02`, `US-COURSE-04` | Lesson consumption/media controls and assessed completion are separated. |
| 4.4 | Explanation-Language and Exam-Language Bridging | `US-LANG-03`, `US-COURSE-02` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 4.5 | Chinese Mathematics Terminology Preview and In-Question Support | `US-TERM-01`, `US-TERM-02`, `US-TERM-03` | Terminology preview, in-question assistance, and notebook review are separate loops. |
| 4.6 | In-Course Assessment | `US-COURSE-03` | Dedicated checkpoint/remediation story added. |
| 5.1 | Topic Practice | `US-PRACTICE-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 5.2 | Study-Plan Practice | `US-PRACTICE-02` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 5.3 | Hints, Language Assistance, and Solutions | `US-TERM-01`, `US-HINT-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 5.4 | Mistake Notebook | `US-MISTAKE-01`, `US-MISTAKE-02`, `US-MISTAKE-03` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 6.1 | Daily Task Entry Point | `US-AGENT-01`, `US-AGENT-02` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 6.2 | Guided Learning Sessions | `US-AGENT-03` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 6.3 | Contextual Questions and Answers | `US-AGENT-04` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 6.4 | Automatic Remediation and Plan Reprioritization | `US-AGENT-05` | Major reprioritization requires student approval; minor ordering rules must be shaped in the slice. |
| 7.1 | Mock-Exam Selection | `US-MOCK-01`, `US-TRIAL-03` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 7.2 | Exam Experience | `US-MOCK-02`, `US-MOCK-03`, `US-TRIAL-03` | Timed recovery and exactly-once submission are tightly coupled but may use one slice. |
| 7.3 | Results and Analysis | `US-MOCK-04`, `US-TRIAL-03` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 7.4 | Post-Mock Remediation Loop | `US-MOCK-05` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 8.1 | Daily Goals and Learning Streaks | `US-MOT-01`, `US-MOT-02` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 8.3 | Weekly Review | `US-WEEK-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 10.1 | Learning Overview | `US-PARENT-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 10.2 | Weekly Reports and Risk Alerts | `US-PARENT-02`, `US-PARENT-03` | Weekly report delivery and risk-alert action are distinct stories. |
| 10.3 | Payment and Tutoring Management | `US-PARENT-04`, `US-PAY-01` | P0 entitlement visibility is separated from P1 tutoring workflow status. |
| 10.4 | Privacy Boundaries | `US-FAM-02`, `US-PARENT-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 11.1 | Free Trial | `US-TRIAL-01`, `US-TRIAL-02`, `US-TRIAL-03` | Public browsing, learn/practice trial, and representative mock trial are separate loops. |
| 11.2 | Products and Entitlements | `US-TRIAL-01`, `US-PRODUCT-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 11.3 | Indonesian Local Payment Methods | `US-PAY-01`, `US-PAY-02` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 11.4 | Automatic and Manual Renewal | `US-RENEW-01` | P0 is manual renewal plus expiry reminder; automatic charging remains channel-dependent later scope. |
| 11.5 | Orders, Receipts, and Refunds | `US-PAY-02`, `US-ORDER-01`, `US-REFUND-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 13.1 | Learning Notifications | `US-NOTIFY-01`, `US-NOTIFY-02` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 13.2 | Customer Service and Issue Reporting | `US-SUPPORT-01`, `US-SUPPORT-02` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 14.1 | Admin Accounts and Permissions | `US-ADMIN-01` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 14.2 | User and Relationship Management | `US-ADM-01` | Admin lifecycle/relationship actions explicitly prohibit editing learning outcomes. |
| 14.4 | Course, Syllabus, and Content Management | `US-ADM-02`, `US-ADM-03` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 14.5 | Question Bank and Mock-Exam Management | `US-ADM-04` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 14.6 | Content Source and Authorization Ledger | `US-ADM-05` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |
| 14.7 | Order, Payment, and Refund Management | `US-FINOPS-01` | Financial reconciliation is isolated from user refund-request flow. |
| 14.9 | AI and Content Quality Management | `US-SUPPORT-02`, `US-ADM-06` | Quality review requires multilingual dimensions and bounded disable/reroute behavior. |
| 14.10 | Operating Analytics | `US-ADM-07` | Exact reference present; slice shaping must still map every normative bullet and NFR consequence. |

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

### Deferred P0 production delivery

- `US-AUTH-03` and `US-AUTH-04` now decompose production email/password
  registration, verification, sign-in, and recovery. Their vertical-slice
  boundary, verification/recovery credential design, session-revocation
  policy, abuse controls, email provider, and TypeSpec contract remain to be
  shaped. PX-002 fixture evidence must not be counted as production delivery.

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
