# User-story coverage audit

> **Classification: supporting traceability, non-normative.** Exact references show that a requirement section has at least one candidate story. They do not prove semantic completeness, implementation readiness, or delivery. The paired requirements remain authoritative.

## Snapshot

| Field | Value |
| --- | --- |
| Requirement baseline | English/Chinese V1.6, 2026-08-14 |
| Story baseline | `USER_STORIES.md` version 0.3.5 |
| Audit date | 2026-08-14 |
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
| 1.1 | Registration and Login | `US-AUTH-01`, `US-AUTH-02`, `US-AUTH-03`, `US-AUTH-04`, `US-PROF-03`, `US-ADMIN-01` | Owners: delivered `VS-000`, `VS-002`, `VS-003`, `VS-005` (first-admin recognition); proposed `VS-023`. PX-002 remains fixture-only where qualified. |
| 1.2 | Profile Management | `US-PROF-01`, `US-PROF-02`, `US-PROF-03`, `US-PROF-04`, `US-ACCOUNT-01` | Owners: delivered `VS-001`, `VS-004`; proposed `VS-023`, `VS-028`. |
| 1.3 | Roles and Permissions | `US-PROF-01`, `US-PROF-03`, `US-ADMIN-01` | Owners: delivered `VS-001`, `VS-005` (unique pilot admin); proposed `VS-023`. |
| 1.4 | Learning and Language Preferences | `US-LANG-01`, `US-LANG-02`, `US-LANG-03` | Owners: delivered `VS-004` (default explanation language); delivered `VS-008` (temporary session switch on LESSON); proposed `VS-014`; language dimensions remain independent. |
| 2.1 | Parent Creates a Student Account | `US-FAM-00`, `US-FAM-04` | Owner: proposed `VS-024`, including pending-to-activated lifecycle. |
| 2.2 | Student Invites a Parent to Link | `US-FAM-01`, `US-FAM-02` | Owner: proposed `VS-025`. |
| 2.3 | Relationship Management | `US-FAM-03` | Owner: proposed `VS-026`. |
| 3.1 | Academic Goals and Required Profile Information | `US-GOAL-01` | Owner: proposed `VS-014`; goal input does not gate direct preparation. |
| 3.2 | Automatic CSCA Subject Matching and Prefill | `US-GOAL-02` | Owner: proposed `VS-014`; claims retain source, applicability, freshness, and uncertainty. |
| 3.3 | Manual Subject Adjustments | `US-GOAL-03` | Owner: proposed `VS-014`. |
| 3.4 | Baseline Diagnostic Assessment | `US-DIAG-01`, `US-DIAG-02` | Owner: proposed `VS-015`; diagnostic uses the shared assessment-attempt boundary and does not auto-activate a plan. |
| 3.5 | Study-Plan Feasibility Assessment | `US-PLAN-01`, `US-PLAN-02`, `US-PLAN-03` | Owner: proposed `VS-016`; may use existing practice/mistake/mock evidence. |
| 4.1 | Course Catalog and Launch Scope | `US-COURSE-01` | Owners: delivered `VS-005` (admin package publish); delivered `VS-008` (student subject-agnostic browse of published packages; partial story — no prerequisites/linked practice/entitlement). |
| 4.2 | Official Syllabus Source and Platform Curriculum Alignment | `US-SYL-01`, `US-ADM-03` | Owners: delivered `VS-005` (admin outline and language-keyed official-source link(s) for en and/or zh-CN PDF editions); delivered `VS-008` (student official-source panel with 1–2 language-edition open actions + outline + product coverage; personal column = content progress only; parent actor deferred); YukCSCA-authored Bahasa Indonesia, English, and Simplified Chinese outline summaries remain distinct from platform objectives and link to the official source(s); undeclared official dates are recorded as not stated. |
| 4.3 | Focused Learning-Unit Content | `US-COURSE-02`, `US-COURSE-04`, `US-ADM-08` | Owners: delivered `VS-005` (admin LESSON/TEXT/MATH/IMAGE); delivered `VS-008` (student LESSON reader + content progress); proposed `VS-010B` (reviewed short video upload or scene/script → review → student play). |
| 4.4 | Explanation-Language and Exam-Language Bridging | `US-LANG-03`, `US-COURSE-02` | Owners: delivered `VS-004`; delivered `VS-008` (lesson explanation-language toggle; no exam-track lesson split); proposed `VS-014`. |
| 4.5 | Chinese Mathematics Terminology Preview and In-Question Support | `US-TERM-01`, `US-TERM-02`, `US-TERM-03` | Owner: shaping [`VS-010A`](../delivery/VS-01) (`D-01` loop A). |
| 4.6 | In-Course Assessment | `US-COURSE-03` | Owners: delivered `VS-005` (admin questions/mock definition); delivered `VS-009` (student CHECKPOINT sessions + bounded objective evidence; accepted TypeSpec `VS-009-R8-accepted`; product-owner journeys 2026-08-14). |
| 5.1 | Topic Practice | `US-PRACTICE-01` | Owner: delivered `VS-009` (plan-independent TOPIC_PRACTICE on shared assessment substrate; accepted TypeSpec `VS-009-R8-accepted`; product-owner journeys 2026-08-14). |
| 5.2 | Plan-Assigned Practice | `US-PRACTICE-02` | Owner: proposed `VS-017`; explicitly requires an active plan. |
| 5.3 | Hints, Language Assistance, and Solutions | `US-TERM-01`, `US-HINT-01` | Owners: delivered `VS-009` mathematical tiered hints + post-submit solutions (`VS-009-R8-accepted`); shaping [`VS-010A`](../delivery/VS-010A-chinese-terminology.md) (Chinese language-assist + terminology). |
| 5.4 | Mistake Notebook and Immediate Remediation | `US-MISTAKE-01`, `US-MISTAKE-02`, `US-MISTAKE-03` | Owner: delivered `VS-009` (mistake notebook, published REMEDIATION + revalidation; product-owner journeys 2026-08-14). |
| 6.1 | Daily Task Entry Point | `US-AGENT-01`, `US-AGENT-02` | Owner: proposed `VS-017`; requires an active plan. |
| 6.2 | Guided Learning Sessions | `US-AGENT-03` | Owner: proposed `VS-018`; follows plan creation because it records a plan effect. |
| 6.3 | Contextual Questions and Answers | `US-AGENT-04`, `US-AGENT-06` | Owners: proposed first `VS-011` (text Q&A, `US-AGENT-04`); proposed later follow-on after `VS-010B` + first `VS-011` for derived video answers (`US-AGENT-06`, not `VS-012`); `VS-013` adds mock-report Q&A context. |
| 6.4 | Plan Remediation and Reprioritization | `US-AGENT-05` | Owner: proposed `VS-019`; material changes require confirmation and current plan version. |
| 7.1 | Mock-Exam Selection | `US-MOCK-01`, `US-TRIAL-03` | Owners: proposed `VS-012`, `VS-030`; no plan dependency. |
| 7.2 | Exam Experience | `US-MOCK-02`, `US-MOCK-03`, `US-TRIAL-03` | Owners: proposed `VS-012`, `VS-030`; timed recovery and exactly-once submission remain coupled. |
| 7.3 | Results and Analysis | `US-MOCK-04`, `US-TRIAL-03` | Owners: proposed `VS-013`, `VS-030`; no plan dependency. |
| 7.4 | Post-Mock Remediation Candidates, Plan Integration, and Revalidation | `US-MOCK-05A`, `US-MOCK-05B` | `7.4A` owner: proposed `VS-013`; `7.4B` owner: proposed `VS-019`. |
| 8.1 | Daily Goals and Learning Streaks | `US-MOT-01`, `US-MOT-02` | Owner: proposed `VS-017`. |
| 8.3 | Weekly Review | `US-WEEK-01` | Owner: proposed `VS-017`. |
| 10.1 | Learning Overview | `US-PARENT-01` | Owner: proposed `VS-035`. |
| 10.2 | Weekly Reports and Risk Alerts | `US-PARENT-02`, `US-PARENT-03` | Owner: proposed `VS-035`. |
| 10.3 | Payment and Tutoring Management | `US-PARENT-04`, `US-PAY-01` | Owners: proposed `VS-031`, `VS-032`; P1 tutoring workflow remains outside P0. |
| 10.4 | Privacy Boundaries | `US-FAM-02`, `US-PARENT-01` | Owners: proposed `VS-025`, `VS-035`. |
| 11.1 | Free Trial | `US-TRIAL-01`, `US-TRIAL-02`, `US-TRIAL-03` | Owner: proposed `VS-030`. |
| 11.2 | Products and Entitlements | `US-TRIAL-01`, `US-PRODUCT-01` | Owners: proposed `VS-030`, `VS-031`. |
| 11.3 | Indonesian Local Payment Methods | `US-PAY-01`, `US-PAY-02` | Owner: proposed `VS-031`. |
| 11.4 | Automatic and Manual Renewal | `US-RENEW-01` | Owner: proposed `VS-036`; P0 remains manual renewal plus expiry reminder. |
| 11.5 | Orders, Receipts, and Refunds | `US-PAY-02`, `US-ORDER-01`, `US-REFUND-01` | Owners: proposed `VS-031`, `VS-033`. |
| 13.1 | Learning Notifications | `US-NOTIFY-01`, `US-NOTIFY-02` | Owner: proposed `VS-034`. |
| 13.2 | Customer Service and Issue Reporting | `US-SUPPORT-01`, `US-SUPPORT-02` | Owner: proposed `VS-021`. |
| 14.1 | First Platform Admin | `US-ADMIN-01` | Owner: delivered `VS-005`; first platform admin setup precedes broad admin operations. |
| 14.2 | User and Relationship Management | `US-ADM-01` | Owner: proposed `VS-029`; admin actions do not edit learning outcomes. |
| 14.4 | Syllabus and Learning-Content Management | `US-ADM-02`, `US-ADM-03`, `US-ADM-08` | Owners: delivered `VS-005`; proposed `VS-010B` for optional reviewed short-video assets. Localized syllabus outline items and platform objectives are mapped cleanly, and the admin maintains official source link(s) per published language edition (en and/or zh-CN). |
| 14.5 | Question and Mock-Paper Management | `US-ADM-04` | Owner: delivered `VS-005`; published questions support text, LaTeX, and approved diagrams and are selected for the first timed mock definition. |
| 14.6 | Content Source and Rights Records | `US-ADM-05`, `US-ADM-08` | Owners: delivered `VS-005`; proposed `VS-010B` for uploaded or produced video provenance. Provenance is derived automatically for YukCSCA-original content, external content retains source and permission evidence, and the official syllabus remains reference-only behind a compact source action. |
| 14.7 | Order, Payment, and Refund Management | `US-FINOPS-01` | Owner: proposed `VS-033`. |
| 14.9 | AI and Content Quality Management | `US-SUPPORT-02`, `US-ADM-06` | Owners: proposed `VS-020`, `VS-021`; `VS-010B` / later `US-AGENT-06` keep generated video in Draft until human review. |
| 14.10 | Operating Analytics | `US-ADM-07` | Owner: proposed `VS-022`. |

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
