# VS-009 — Checkpoint and topic practice with mistake → remediation → revalidation

## Metadata

| Field                        | Value                                                                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status                       | `CONTRACT_READY`                                                                                                                                                                 |
| Human gate                   | `APPROVED`                                                                                                                                                                       |
| Plan revision                | 6                                                                                                                                                                                |
| Updated                      | 2026-08-11                                                                                                                                                                       |
| Primary actor                | Authenticated activated `STUDENT` (admin authors assessment content)                                                                                                             |
| Story IDs                    | `US-COURSE-03`; `US-PRACTICE-01`; partial `US-HINT-01` (mathematical tiered hints only); `US-MISTAKE-01`–`03`                                                                    |
| Requirement sections         | English: 4.6, 5.1, 5.3 (math hints + post-submit solutions; Chinese language-assist deferred), 5.4; Chinese: corresponding clauses                                               |
| Depends on                   | [`VS-005`](VS-005-academic-foundation.md), [`VS-008`](VS-008-student-learn-content.md)                                                                                           |
| Related ADRs                 | None required for stack; assessment module boundary recorded in this brief                                                                                                       |
| TypeSpec source              | `contracts/assessment-student.tsp` (new); additive `contracts/academic-admin.tsp`; additive `contracts/academic-student.tsp`; `contracts/main.tsp` import                        |
| API operations               | Admin draft: AssessmentSet + hint tiers + solution metadata; **13** student assessment ops under `/api/v1/assessment/**`; 2 academic REMEDIATION ops under `/api/v1/academic/**` |
| Backend/slice owner          | Backend vertical-slice worker; **new `assessment` module** + academic ports; admin package schema extension in `academic`                                                        |
| Frontend owner               | Frontend consumer worker; production Learn checkpoint handoff + Practice/Mistakes under `features/assessment` (or equivalent); no prototype imports                              |
| Initial contract checkpoint  | `VS-009-R3-initial` — TypeSpec `assessment-student.tsp` `a20fd365ef79da30554f2988694e8f7fd39d92bb`                                                                               |
| Post-CR contract checkpoint  | `VS-009-R5-cr-applied` — TypeSpec `assessment-student.tsp` `5bc4cd5bc3a067dfd91701acc5007eec08c6e95b` (superseded by accepted)                                                   |
| Accepted contract checkpoint | `VS-009-R5-accepted` — same artifact hashes as `VS-009-R5-cr-applied` after FE re-review (zero further CR)                                                                       |

## User-observable outcome

An activated student who finished a LESSON can run a published **checkpoint** (or start a **topic practice** set), use **tiered mathematical hints**, and—when items are wrong—close one **mistake → published remediation study → independent revalidation** loop with durable attempt evidence; the platform records **bounded objective evidence** without claiming calibrated long-term mastery or requiring an active study plan.

## Why this slice is the current boundary

`VS-008` delivered the first production student academic loop: published package browse, LESSON reader, and content progress only. Content complete deliberately **never** unlocks assessment, mastery, or practice. Without a scored loop, the critical path cannot produce the attempt/mistake evidence that diagnostics, plans, mocks, and the future agentic tutor must consume.

This slice is one **closed evidence loop**, not three micro-products:

```text
Published package (active revision)
  + AssessmentSet (CHECKPOINT | TOPIC_PRACTICE)
  + Questions (hint tiers, exam language, explanations, common-mistake notes)
  + REMEDIATION resources
        │
        ▼
  Outer loop: choose set / start revalidation
  Inner loop: item → hints → answer → feedback
        │
        ├─ CHECKPOINT pass → bounded objective evidence
        └─ incorrect items → Mistake → REMEDIATION (corrective) → Revalidation (retest)
```

### Pedagogical architecture (maps requirements to proven models)

Non-normative design lens; **paired requirements remain authoritative**.

| Model                             | Stages                                                                                                       | YukCSCA mapping in VS-009                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bloom mastery cycle**           | Instruction → formative assessment → **corrective** instruction → **retest**                                 | LESSON (VS-008) → CHECKPOINT → REMEDIATION resource → REVALIDATION session                                                                    |
| **VanLehn ITS**                   | **Inner loop** (within task/item): feedback, graduated hints; **Outer loop** (across tasks): what to do next | Inner = session item player + hint ladder + score; Outer = set selection, fail→remediation→revalidation, later plan/agent (`VS-011`/`VS-017`) |
| **Hint ladder** (ITS “hint loop”) | Progressively informative hints before full solution                                                         | Ordered math `hintTiers`; last tier `STRONG` blocks independent pass credit                                                                   |

**Design rule carried into this substrate:** conversational / agentic tutors should **keep** deterministic scoring, attempt logs, assistance logs, and mistake state; **change** later only how dialogue scaffolds the same loops (`VS-011`). Generative systems that invent grades without structured learner state are explicitly rejected for YukCSCA.

### Why not smaller (anti-fragmentation)

Comparable platforms and tutoring research converge on a **shared substrate**:

| Pattern                                                                                         | Implication                                                                                     |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| CSCA Prep-style products: topic/difficulty practice → **review mistakes** → weak-area targeting | Mistake notebook is the same pipeline as practice, not a bolt-on                                |
| Khan-style mastery: in-problem hints; viewing ≠ skill                                           | Tiered hints + independent recheck belong with first scored attempts                            |
| Duolingo-style review: wrong items return                                                       | Revalidation is first-class state (schedule can stay simple: immediate post-remediation)        |
| Brilliant-style pedagogy: mistakes are clues; correct ≠ fully landed                            | Record **assistance**; one lucky/assisted correct must not close a weakness alone               |
| ITS keep/change research (inner–outer loop; knowledge tracing kept outside LLM)                 | Build attempt/mistake/evidence ports **once** so agents attach as tools, not rewrite assessment |
| DeepTutor-style agentic tutors: shared personalization substrate                                | Isolated chat modules fragment learning; structured evidence must exist first                   |

Product owner direction (grill-me 2026-08-11): **prefer one coherent assessment substrate** over many thin overlapping slices that force repeated contract and UI rewrites.

### Why not larger

Still out of this slice (independently valuable later):

- Chinese **language-assist** tiers and terminology notebook (`VS-010`)
- Plan-assigned practice and daily orchestration (`VS-017` / 5.2)
- Timed mock execution (`VS-012`) and post-mock recommendations (`VS-013`)
- Contextual agent Q&A and guided sessions (`VS-011`, `VS-018`)
- Full calibrated mastery / knowledge-tracing algorithms and multi-day spaced schedules
- Entitlements, parent mistake visibility, LLM-authored remediation or scored items
- Free-response / multi-select beyond single-answer; bookmarks/challenge practice (P1)

### Agentic readiness (without shipping the agent)

YukCSCA remains **evidence-first**: deterministic code owns scoring, pass/fail, mistake lifecycle, and objective-evidence writes. An LLM may later **explain or guide** using authorized context; it must never alone change mastery, grades, or entitlements (`AGENTS.md`, SECURITY).

This slice ships the **tool substrate** future agents need:

| Substrate element                               | Why agents need it                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| Immutable **attempt question copy**             | Grounded explanation; no hallucinated stem after republish              |
| **Assistance event log** (tier, strength, time) | Detect over-help; schedule no-help recheck; honest evidence weight      |
| **Mistake aggregate** + optional cause/note     | Weakness inventory (`OPEN` / remediate / revalidate)                    |
| **AssessmentContext** on every session          | Attach Q&A to lesson / item / mistake / remediation without ad-hoc IDs  |
| **`LearningEvidencePort`**                      | Outer-loop recommenders and diagnostics without JPA coupling            |
| Extensible **session purpose** enum             | `REVALIDATION` now; later `DIAGNOSTIC` / plan-task without second store |

**Future agent role (explicit non-scope now):** outer-loop orchestration (“start remediation,” “open due revalidation,” “explain this mistake”) and conversational inner-loop scaffolding **on top of** already-scored items—not a second grader.

Concrete **context envelope** (stable fields for `VS-011` tools; not a public HTTP surface until that slice):

```text
AssessmentContext {
  accountId, subject, packageId, packageRevisionId,
  sessionId, sessionPurpose, examLanguage,
  setId?, lessonResourceId?, mistakeId?,
  outlineItemIds[], objectiveIds[],
  itemId?, questionId?,
  assistanceSummary { maxTier, strongUsed, languageAssistUsed=false },
  lastResult { correct?, checkpointPassed? }
}
```

## External research synthesis (non-normative)

Used to stress-test product shape; **paired requirements remain normative**. Sources inspected 2026-08-11 (web + arXiv synthesis).

1. **Bloom mastery learning:** instruction → formative check → **correctives** targeting failed objectives → **retest** (often similar, not identical items). Maps to LESSON → CHECKPOINT → REMEDIATION → REVALIDATION.
2. **VanLehn (2006) ITS behavior:** **inner loop** (within problem: correctness, feedback, graduated hints) vs **outer loop** (next task selection). VS-009 owns both for the closed student path; plan/agent later specialize outer loop.
3. **ITS → conversational AI guidance:** keep knowledge tracing / structured learner models and graduated hints; do **not** let an LLM replace them as the sole knowledge state. Hybrid: structured diagnosis feeds dialogue.
4. **CSCA-oriented practice products:** topic/difficulty practice, timed mocks, mistake review, weak-area analytics—not lesson viewing alone.
5. **Khan Academy:** hints during problem-solving; mastery challenges re-test skills; familiarity ≠ mastery.
6. **Duolingo:** end-of-session mistake review; spaced return of weak items (we implement eligibility + status first; multi-day SR deferred).
7. **Brilliant:** mistakes as learning moments; correct answers do not always mean the concept has landed—assistance-weighted evidence.
8. **DeepTutor / multi-agent tutoring systems:** shared personalization substrate across problem solving and practice generation; fragmented modules lose pedagogical continuity.
9. **LMS quiz platforms (e.g. LearnDash patterns):** save-and-resume, retake rules, lock behind progression—inform session resume and checkpoint unlock after content-complete.
10. **Mastery threshold literature** often cites ~80–90% on formative checks; YukCSCA pilot uses a **stricter, transparent** rule for small checkpoints (all correct + no strong help) to avoid inventing a calibrated percentage without evidence (`D-10`). Threshold fields remain extensible on `AssessmentSet` for later.

## Capability and adjacent contract horizon

- **Owning lifecycle:** student assessment sessions for published `AssessmentSet`s; scored attempts; tiered math hints; mistake notebook; immediate deterministic remediation via published `REMEDIATION` resources; revalidation sessions; bounded objective evidence.
- **Closely related but not fully accepted:**
  - Full `US-HINT-01` Chinese language-assist tiers and terminology notebook → `VS-010`.
  - `US-COURSE-03` Chinese Math dual evidence (math + terminology stem) → supported only as **authored questions** in zh-CN sets; automatic terminology notebook out.
  - `US-PRACTICE-02` plan-assigned practice → `VS-017` (`planTaskId` nullable extension on session start).
  - Full calibrated mastery / Stable Mastery algorithm → later evidence slices.
  - Agent Q&A from item/mistake (`US-AGENT-04`) → `VS-011` (consumes context ports).
- **Included now:** admin authoring of AssessmentSets + mathematical hint tiers + solution/common-mistake notes; student CHECKPOINT after LESSON content-complete; free TOPIC_PRACTICE; shared attempt/mistake pipeline; REMEDIATION open for study; revalidation with preferred alternate items; exam-language choice at set start; session resume while `IN_PROGRESS`.
- **Additive evolution:**
  - New `AssessmentSetPurpose` / session purposes without new attempt tables.
  - Language-assist events as a second assistance **kind** on the same log shape.
  - `planTaskId` optional on session start (null until `VS-017`).
  - Agent tools read `LearningEvidencePort` / mistake detail; never write mastery directly.
  - Optional `passThreshold` later without removing all-correct pilot policy.
- **Why smaller/larger is worse:** see anti-fragmentation and exclusions above.

## In scope

### Admin / content (same slice)

- Extend published academic package draft/revision schema with:
  - **`AssessmentSet`**:
    - `id`, `purpose` (`CHECKPOINT` | `TOPIC_PRACTICE`)
    - `title` (localized)
    - `examLanguage` (`en` | `zh-CN`)
    - `difficulty` (optional; used for practice filter; align with existing `QuestionDifficulty`)
    - ordered `questionIds` (1–12 for CHECKPOINT recommended max **5** enforced as soft admin guidance; hard max **12**)
    - `outlineItemIds` / `objectiveIds`
    - **`lessonResourceId` required when purpose = CHECKPOINT**
    - `estimatedMinutes` optional
    - `feedbackMode`: `IMMEDIATE` (default) | `SET_END` (req 5.1)
    - `passPolicy` for CHECKPOINT: pilot fixed `ALL_CORRECT_NO_STRONG_ASSISTANCE` (encode as enum for future thresholds)
    - optional `remediationResourceIds[]` (preferred explicit fail-path links; else resolve by shared objective/outline)
  - **Mathematical hint tiers** on each `Question`: ordered `hintTiers[]` with content blocks + `strength: STANDARD | STRONG` (at most one trailing STRONG recommended; if multiple STRONG, any STRONG disclosure counts as strong assistance).
  - **Post-submit solution metadata** (student-visible only after item lock): reuse `explanations` localized content; add optional `commonMistakeNotes` (localized short notes) and optional `relatedResourceIds` (LESSON/REMEDIATION links) to satisfy req 5.3 “common mistakes + links to relevant courses” without AI.
  - Pilot package can publish: ≥1 CHECKPOINT linked to a LESSON, ≥1 TOPIC_PRACTICE, questions with ≥2 hint tiers where the demo path uses hints, ≥1 REMEDIATION mapped for fail path, and preferably ≥1 **alternate** question sharing the same objective for revalidation.
- Admin UI: AssessmentSet editor, question multi-select, hint tier editor, CHECKPOINT→LESSON link, remediation links, publish validation.
- Publish validation fails closed if: CHECKPOINT missing `lessonResourceId` or empty `questionIds`; question ids missing; hint tiers not strictly ordered; unknown resource ids in remediation links.

### Student assessment

- **Pilot access:** activated `STUDENT` (same open-access posture as VS-008 via policy port; entitlements later).
- **Checkpoint path:** after LESSON `CONTENT_COMPLETE` only (`D-11`); choose **exam language** among published CHECKPOINT editions for that lesson; start session; inner loop; pass/fail per `D-10`.
- **Topic practice path:** Practice hub → subject + outline/objective + difficulty + exam language → matching published `TOPIC_PRACTICE` set (or honest empty); complete with score; **no** `CHECKPOINT_PASSED`.
- **Feedback mode:**
  - `IMMEDIATE` (default): after each item lock, show correctness + explanation + common-mistake notes + related links; hints allowed before lock.
  - `SET_END`: answers may be changed until set submit; feedback after submit (still record per-item assistance).
- **Hints:** progressive math tiers only; each disclose logged; `STRONG` warned in UI; any STRONG on a CHECKPOINT session blocks pass.
- **Attempts:** immutable **attempt question copy** at first item disclosure (stem, options, keys server-side, exam language, package revision, ordered hint metadata without undisclosed bodies); duplicate submit does not double-count.
- **Session resume:** `IN_PROGRESS` sessions reloadable by owner until submit or abandon policy (abandon = soft cancel; no score).
- **Mistakes:** incorrect scored response creates/updates one mistake (idempotent per attempt id); history, assistance summary, objective/outline refs, status.
- **Annotation:** optional `errorCause` + optional private note (`D-09`). Causes (glossary-aligned): `CONCEPTUAL_GAP` | `PREREQUISITE_GAP` | `TERMINOLOGY_MISUNDERSTANDING` | `CARELESSNESS` | `TIME_MANAGEMENT`.
- **Remediation resolution (deterministic):**
  1. Explicit `remediationResourceIds` on the AssessmentSet (or question) if present and published;
  2. Else published `REMEDIATION` resources sharing ≥1 objective id with the missed question;
  3. Else sharing ≥1 outline item id;
  4. Else offer re-open related LESSON only + honest “no dedicated remediation unit” empty state (still allow revalidation after lesson re-complete **or** after acknowledging solution study—**prefer requiring REMEDIATION or LESSON content-complete** so the fail path is not a free pass; if only LESSON available, re-complete or re-open with progress already CONTENT_COMPLETE counts as corrective complete for pilot).
- **Remediation study:** open REMEDIATION with explanation-language toggle (profile default + temporary session override like VS-008); progress via **extended academic content progress** for resource kind `REMEDIATION` (one progress model).
- **Revalidation eligibility:** immediate when mistake is `AWAITING_REVALIDATION` after required corrective complete (`D-05`).
- **Revalidation item policy (`D-16`):**
  1. Prefer a published question with same primary objective (or outline), **same exam language**, **different questionId**, from the package active revision (or from the original set’s sibling items);
  2. Else reuse the original question (allowed for pilot when no alternate exists);
  3. Session purpose `REVALIDATION`; **STRONG hints disabled**; STANDARD hints optional but any assistance prevents status upgrade to `REVALIDATION_PASSED` (independent evidence rule);
  4. Success → `REVALIDATION_PASSED`, clear due-now; failure → back to `OPEN` with history retained.
- **Bounded objective evidence:** on CHECKPOINT pass only, write evidence signal(s) for linked `objectiveIds` / lesson (`CHECKPOINT_PASSED`); never UI “Mastered” / “Stable Mastery”.
- **Languages independent:** interface ≠ explanation (remediation/lesson) ≠ exam (question language). Exam language chosen per session start; not written to goals profile (`VS-014`).
- Production Practice/Mistakes/checkpoint routes; Learn checkpoint CTA after content complete.
- Observability: value-free events; no stems/answers/notes/keys in logs.

## Out of scope

- Chinese language-assist tiers, pinyin segmentation UI, terminology notebook (`VS-010`).
- Plan-assigned practice, plan version reconciliation (`VS-017` / 5.2).
- Timed mock papers, exactly-once mock submit (`VS-012`).
- Agent chat, RAG tutor, LLM-generated scored questions, hints, or remediation bodies (`VS-011+`).
- Parent or tutor visibility into private notes/mistakes.
- Full mastery meter / Bayesian or neural knowledge tracing calibration.
- Multi-day spaced-repetition scheduler (nullable `nextDueAt` column allowed as **unused** extension; eligibility is immediate post-remediation).
- Free-response / multi-select beyond single-answer; bookmarks / challenge practice (P1).
- Entitlements, trial gates, commerce.
- Moving LESSON content progress out of `academic`.
- Object storage, queues, Redis, new AI SDKs.

## Preconditions and dependencies

- **Existing:** VS-005 packages (questions, LESSON/TERMINOLOGY/REMEDIATION kinds); VS-008 LESSON progress + Learn UI; activated STUDENT; KaTeX; pilot open-access policy.
- **Content:** ≥1 PUBLISHED package with LESSON, CHECKPOINT (per exam language editions as authored), TOPIC_PRACTICE, hint-capable questions, REMEDIATION, preferably alternate revalidation items. Tests may use synthetic revisions.
- **Safe fallback:** no sets → empty Practice / no checkpoint CTA; not content-complete → locked checkpoint with reason; missing exam-language edition → cannot start; non-STUDENT → 401/403; no remediation resource → LESSON fallback path documented above.

## Technology and dependency impact

- **Existing stack sufficient:** Spring Boot modular monolith, TypeSpec, React, PostgreSQL/Flyway, KaTeX, Testcontainers.
- **New module:** `assessment` — first evidence-backed attempts (**exact first use**).
- **Academic extensions:** AssessmentSet + hint tiers + solution metadata in package JSONB; student REMEDIATION projection; content progress accepts `REMEDIATION` resource kind; published assessment catalog port.
- **Flyway:** next migrations after V8 (e.g. `V9__assessment_core.sql`) for sessions, item attempts, assistance events, mistakes, objective evidence.
- **No new runtime dependency** (no AI provider).
- **Alternatives rejected:**
  - Thin “score only” slice → rewrite for mistakes/hints/agent context.
  - Separate checkpoint vs practice pipelines → contract/UI drift.
  - LLM remediation as primary path → violates deterministic content + security.
  - All attempt tables inside `academic` forever → god-module (`D-12`).
- **ADR:** `Not required — in-process module is modular-monolith norm; ports keep rollback simple.`

## User flow

### A — Lesson checkpoint (Bloom formative)

1. Student completes LESSON (`CONTENT_COMPLETE`).
2. Learn shows **Start checkpoint** (never “Mastered”).
3. Student selects exam language for available CHECKPOINT editions.
4. Session starts; server pins package revision and materializes ordered items (question copies).
5. **Inner loop:** for each item — optional STANDARD/STRONG hints → lock answer → if `IMMEDIATE`, feedback + explanation + common-mistake notes + related links.
6. Set completes (auto after last item or explicit submit when `SET_END`).
7. **Pass** (all correct + no strong assistance): bounded objective evidence; success state; offer next lesson/practice without mastery claim.
8. **Fail:** mistakes upserted; open mistake → optional cause/note → **Study remediation** → complete REMEDIATION (or LESSON fallback) → **Revalidate now**.
9. Revalidation (strong help off): prefer alternate item → independent success upgrades mistake; failure reopens with history.

### B — Topic practice (plan-independent outer entry)

1. Open production **Practice**.
2. Choose subject, topic (outline/objective), difficulty, exam language.
3. See item count + estimated minutes for matching set (or empty).
4. Same inner loop; score summary; no checkpoint pass flag.
5. Incorrect items enter the **same** mistake → remediation → revalidation loop.

### C — Resume

1. Student leaves mid-session.
2. Returns via Practice “Continue” or session URL; server restores `IN_PROGRESS` state and disclosed hints; no re-roll of question order.

## Student assessment experience (presentation contract)

| Surface                 | Intent                                                         | Dominant pastel / role      |
| ----------------------- | -------------------------------------------------------------- | --------------------------- |
| Lesson → checkpoint CTA | After content complete; primary **Start checkpoint**           | Mint/lime ready             |
| Exam-language chooser   | Explicit EN / 中文; never inferred                             | Neutral chips               |
| Session player          | One-item focus; n/N; hint control; options                     | Cream reading; quiet chrome |
| Hint disclosure         | Progressive; STRONG warned                                     | Amber caution               |
| Item feedback           | Correct/incorrect; explanation; common mistakes; related links | Mint / sky                  |
| Set result              | Score; pass/fail only for CHECKPOINT; mistake links            | Mint success / sky review   |
| Practice hub            | Filters + sets; not vanity equal card grid                     | Study desk                  |
| Mistake list/detail     | History, assistance, optional cause/note, remediation CTA      | Sky/cream                   |
| Remediation reader      | Same block renderer as LESSON; content complete                | Cream                       |
| Revalidation            | “Check without strong help”; independent evidence framing      | Lime primary                |

**Copy discipline**

- Use: Checkpoint passed, Needs review, Remediation complete, Ready to revalidate, Revalidation passed, Practice complete, Content complete, In progress.
- Avoid as claims from this slice alone: Mastered, Stable Mastery, Guaranteed score, Official exam result.

**Motion:** purposeful transitions; reduced-motion instant; no confetti / perpetual glow (`DESIGN.md`).

## Acceptance and implementation matrix

| AC  | Given / When / Then                                                                                                                      | Required evidence          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 01  | Admin publishes package with CHECKPOINT (lesson-linked), TOPIC_PRACTICE, hint tiers, REMEDIATION links; invalid CHECKPOINT fails publish | Admin validation + IT      |
| 02  | STUDENT with LESSON content-complete opens checkpoint; without it, denied with clear lock reason                                         | API + UI                   |
| 03  | Student chooses exam language present on a published set; no inference from interface/explanation language                               | API + UI                   |
| 04  | Pre-submit payloads omit correct keys and undisclosed hint bodies                                                                        | Contract + security tests  |
| 05  | Math hints disclose in order; each tier recorded; STRONG flagged                                                                         | Domain + UI                |
| 06  | CHECKPOINT pass iff all items correct **and** no STRONG assistance; else fail path                                                       | Parameterized domain tests |
| 07  | Pass writes bounded objective evidence; UI does not say Mastered                                                                         | Domain + copy review       |
| 08  | Incorrect item upserts mistake once per attempt id (idempotent retry)                                                                    | Persistence IT             |
| 09  | Optional cause + private note; blank allowed; not required for remediation                                                               | API + UI                   |
| 10  | Remediation resolution prefers explicit ids, else objective/outline match; student completes REMEDIATION progress                        | Domain + journey           |
| 11  | After corrective complete, revalidation eligible immediately; STRONG disabled; assistance blocks REVALIDATION_PASSED                     | Domain + UI                |
| 12  | Revalidation prefers alternate question same objective+examLanguage; falls back to original when none                                    | Domain tests               |
| 13  | TOPIC_PRACTICE scores without CHECKPOINT_PASSED; wrongs feed mistakes                                                                    | API + UI                   |
| 14  | `IMMEDIATE` vs `SET_END` feedback modes behave per set config                                                                            | API + UI                   |
| 15  | `IN_PROGRESS` session resumes for owner                                                                                                  | API + UI                   |
| 16  | Non-STUDENT denied; no cross-account session/mistake read                                                                                | AuthZ tests                |
| 17  | Republish: in-flight sessions keep copies; new sessions use active revision                                                              | Domain tests               |
| 18  | Production routes do not import prototype; generated types only                                                                          | Boundary review            |
| 19  | Mobile-first player; 44px targets; keyboard; id/en/zh-CN; reduced motion                                                                 | Visual/a11y checklist      |
| 20  | `AssessmentContext` / evidence port fields present for future agents; no LLM called                                                      | Schema/port review         |

## Documentation sufficiency review

| Review area                                          | Evidence inspected                                                    | Status  | Gap or decision ID     |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ------- | ---------------------- |
| End-to-end actor flow and adjacent handoffs          | VS-008; VS-005; PLAN; grill Q1–Q15; Bloom/VanLehn mapping             | `CLEAR` | `D-01`–`D-16`          |
| Experience flow, screen states, recovery, navigation | DESIGN.md; PX-001 practice prototype (reference); LMS resume patterns | `CLEAR` | —                      |
| Requirement/story coverage and exclusions            | 4.6, 5.1, 5.3 partial, 5.4; stories listed                            | `CLEAR` | Partial `US-HINT-01`   |
| Domain terms, states, invariants, ownership          | Glossary; error causes; attempt copy; remediation                     | `CLEAR` | `D-03`, `D-05`, `D-16` |
| Authorization, privacy, minors                       | Pilot STUDENT; private notes; minimize logs                           | `CLEAR` | `D-09`                 |
| Failure, retry, idempotency, stale state             | Attempt idempotency; resume; republish snapshots                      | `CLEAR` | —                      |
| Contract, migration, compatibility                   | New assessment TypeSpec; admin additive; V9+                          | `CLEAR` | —                      |
| Technology / ADR                                     | New assessment module; no AI                                          | `CLEAR` | `D-12`                 |
| Frontend / prototype / design                        | features/assessment; rewrite not promote                              | `CLEAR` | —                      |
| Acceptance + observability                           | AC matrix; value-free events                                          | `CLEAR` | —                      |
| Agentic future without scope creep                   | Keep structured ITS substrate; agent out                              | `CLEAR` | `D-01`, `D-14`         |

## Human decision gate

| Field             | Value                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gate status       | `APPROVED`                                                                                                                                                                                                                                 |
| Decision owner    | Product owner                                                                                                                                                                                                                              |
| Approval scope    | Closed-loop outcome; AssessmentSet dual purpose; pass rule; math hints; remediation/revalidation; module boundary; exam-language choice; free topic practice; anti-fragmentation substrate; revalidation item preference (research refine) |
| Approval evidence | Product-owner grill-me 2026-08-11 (Q1–Q15); research refine 2026-08-11 (inner/outer loop, Bloom correctives, revalidation alternates)                                                                                                      |

| ID     | Blocking question and scenario                     | Recommendation                                                                                                     | Owner         | Status     | Resolution                                                       |
| ------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------- | ---------- | ---------------------------------------------------------------- |
| `D-01` | Single closed-loop vs micro-slices?                | One substrate: checkpoint + topic practice + mistake→remediation→revalidation                                      | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-02` | How is checkpoint defined?                         | First-class `AssessmentSet` purpose CHECKPOINT linked to lesson                                                    | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-03` | Pass/fail evidence without full mastery algorithm? | Attempts + bounded objective evidence; no Mastered claim                                                           | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-04` | Immediate remediation unit?                        | Published REMEDIATION (+ LESSON fallback)                                                                          | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-05` | Revalidation timing / close rule?                  | Immediate after remediation; independent success clears due-now; history kept                                      | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-06` | US-HINT-01 depth?                                  | Full **mathematical** tiered hints; Chinese language-assist deferred                                               | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-07` | Admin authoring in same slice?                     | Yes — sets + hints + remediation wiring                                                                            | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-08` | Exam language before VS-014?                       | Explicit choice at set start; session-scoped                                                                       | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-09` | Error-cause required?                              | Optional cause + optional private note                                                                             | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-10` | Checkpoint pass rule?                              | All items correct **and** no strong assistance                                                                     | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-11` | Checkpoint unlock?                                 | Only after LESSON CONTENT_COMPLETE                                                                                 | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-12` | Module placement?                                  | New `assessment` module + academic ports                                                                           | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-13` | Free topic practice in VS-009?                     | Yes                                                                                                                | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-14` | Shared product object?                             | One AssessmentSet; purposes CHECKPOINT \| TOPIC_PRACTICE                                                           | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-15` | Same pass gate for practice?                       | Shared attempt/mistake/hint model; practice softer completion                                                      | Product owner | `APPROVED` | 2026-08-11                                                       |
| `D-16` | Revalidation item selection?                       | Prefer alternate same objective+examLanguage; else original; STRONG off; any assistance blocks REVALIDATION_PASSED | Product owner | `APPROVED` | 2026-08-11 research refine (Bloom retest + independent evidence) |

## State model

### Owned states

```text
AssessmentSet (in published package revision):
  purpose: CHECKPOINT | TOPIC_PRACTICE
  examLanguage, questionIds[], lessonResourceId? (required if CHECKPOINT),
  feedbackMode: IMMEDIATE | SET_END,
  passPolicy: ALL_CORRECT_NO_STRONG_ASSISTANCE (checkpoint pilot),
  remediationResourceIds?[]

AssessmentSession (student-owned):
  status: IN_PROGRESS -> SUBMITTED | CANCELLED
  purpose: CHECKPOINT | TOPIC_PRACTICE | REVALIDATION
  examLanguage (chosen at start)
  packageId, packageRevisionId (pinned)
  setId?  mistakeId? (revalidation)
  planTaskId? = null (reserved)
  feedbackMode (copied from set)
  assistanceSummary at submit

ItemAttempt:
  status: OPEN | LOCKED
  selectedOptionKey?
  correct?
  hintTiersDisclosed: 0..n
  strongAssistance: boolean
  attemptQuestionCopy (immutable JSON)

AssistanceEvent:
  kind: MATH_HINT   // LANGUAGE_ASSIST reserved for VS-010
  tierIndex, strength, at

Mistake (unique per account + packageId + questionId):
  OPEN
    -> REMEDIATION_IN_PROGRESS
    -> AWAITING_REVALIDATION
    -> REVALIDATION_PASSED
    -> OPEN   // failed revalidation or new error
  errorCause?, privateNote?
  errorCount, lastAttemptId, lastSessionId
  nextDueAt?  // nullable extension; unused for multi-day SR in this slice

ObjectiveEvidence (append-only signals):
  objectiveId, signal: CHECKPOINT_PASSED,
  sourceSessionId, at
  // never sole UI authority for “Mastered”

Content progress (academic):
  LESSON: VS-008 unchanged
  REMEDIATION: NOT_STARTED | IN_PROGRESS | CONTENT_COMPLETE
```

### Invariants

- Content complete (LESSON) ≠ checkpoint pass ≠ mastery.
- Correct keys and undisclosed hints never leave the server before allowed disclosure/feedback.
- Any STRONG math hint on a CHECKPOINT session blocks pass (`D-10`).
- TOPIC_PRACTICE never writes `CHECKPOINT_PASSED` (`D-15`).
- REVALIDATION_PASSED requires correct answer **and** zero assistance events on that revalidation session (`D-16`).
- Mistake error count increments once per distinct scored attempt id.
- Private notes are student-only in this slice.
- Interface / explanation / exam languages remain independent.
- LLM output is not an input to scoring or evidence writes.
- Assessment does not import academic JPA; academic does not import assessment JPA.

### Concurrency, retry, and stale-state rules

- **Start session:** create session; pin revision; materialize item order; copy question snapshots on first view.
- **Disclose hint:** monotonic tier; duplicate same tier idempotent.
- **Lock item / submit set:** idempotent; no double mistake increment.
- **Resume:** owner-only; cancelled sessions not resumable.
- **Republish:** in-flight sessions keep copies; new starts use active revision.
- **Remediation progress:** academic upsert; revalidation eligibility = mistake state + corrective complete rule.
- **Idempotency-Key** recommended on session submit for flaky mobile networks.

## TypeSpec contract plan

**Initialized** at revision 3 as checkpoint `VS-009-R3-initial`. **CR-01–CR-04 applied** at revision 5 as `VS-009-R5-cr-applied`. **Accepted** at revision 6 as `VS-009-R5-accepted` (identical wire hashes after FE re-review). Executable sources are TypeSpec; this table is the slice index.

### Admin (additive on `contracts/academic-admin.tsp`)

| Change             | Detail                                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enums              | `HintStrength`, `AssessmentSetPurpose`, `AssessmentFeedbackMode`, `CheckpointPassPolicy`                                                                                                                                      |
| `HintTier`         | `strength: STANDARD \| STRONG`; `blocks: ContentBlock[]` (max 20 blocks)                                                                                                                                                      |
| `Question`         | optional `hintTiers` (max 8); optional `commonMistakeNotes`; optional `relatedResourceIds`                                                                                                                                    |
| `AssessmentSet`    | `id`, `purpose`, `title`, `examLanguage`, optional `difficulty`, ordered `questionIds` (1–12), outline/objective ids, optional `lessonResourceId`, `estimatedMinutes`, `feedbackMode`, `passPolicy`, `remediationResourceIds` |
| Package draft      | optional `assessmentSets` on input and draft record (omit = empty; additive for historical drafts)                                                                                                                            |
| Publish validation | Implementation-owned: CHECKPOINT requires lesson + ≥1 question; ids exist; ordered hints (not a separate HTTP op)                                                                                                             |

### Student assessment operations (`contracts/assessment-student.tsp`)

| Operation                 | Method and route                                                            | Auth    | Success                                                              | Required failures                                     |
| ------------------------- | --------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `listAssessmentSets`      | `GET /api/v1/assessment/packages/{subject}/sets`                            | STUDENT | filter purpose, outlineItemId, objectiveId, difficulty, examLanguage | 401/403/404                                           |
| `getCheckpointForLesson`  | `GET /api/v1/assessment/packages/{subject}/lessons/{resourceId}/checkpoint` | STUDENT | startable, lockReason, editions[]                                    | 401/403/404                                           |
| `listAssessmentSessions`  | `GET /api/v1/assessment/sessions?status?&subject?`                          | owner   | resume summaries (default `IN_PROGRESS`)                             | 401/403                                               |
| `startAssessmentSession`  | `POST /api/v1/assessment/sessions`                                          | STUDENT | `201` session + items                                                | 400 validation / 409 locked or conflict / 401/403/404 |
| `getAssessmentSession`    | `GET /api/v1/assessment/sessions/{sessionId}`                               | owner   | full resume or review state                                          | 401/403/404/409 not resumable                         |
| `discloseHint`            | `POST /api/v1/assessment/sessions/{sessionId}/items/{itemId}/hints`         | owner   | next tier body                                                       | 401/403/404/409 exhausted/blocked                     |
| `submitItemAnswer`        | `PUT /api/v1/assessment/sessions/{sessionId}/items/{itemId}/answer`         | owner   | item + optional immediate feedback                                   | 401/403/404/409/400                                   |
| `submitSession`           | `POST /api/v1/assessment/sessions/{sessionId}/submit`                       | owner   | `SessionResult`; optional `Idempotency-Key`                          | 401/403/404/409                                       |
| `cancelSession`           | `POST /api/v1/assessment/sessions/{sessionId}/cancel`                       | owner   | cancelled session                                                    | 401/403/404/409                                       |
| `listMistakes`            | `GET /api/v1/assessment/mistakes`                                           | STUDENT | cursor page                                                          | 401/403                                               |
| `getMistake`              | `GET /api/v1/assessment/mistakes/{mistakeId}`                               | owner   | detail + remediation candidates                                      | 401/403/404                                           |
| `updateMistakeAnnotation` | `PATCH /api/v1/assessment/mistakes/{mistakeId}`                             | owner   | cause/note                                                           | 401/403/404/400                                       |
| `startRevalidation`       | `POST /api/v1/assessment/mistakes/{mistakeId}/revalidation`                 | owner   | `201` session purpose=`REVALIDATION`                                 | 401/403/404/409 not eligible                          |

### Academic student additive (`contracts/academic-student.tsp`)

| Operation                          | Method and route                                                                        | Detail                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `getPublishedRemediation`          | `GET /api/v1/academic/packages/{subject}/remediation/{resourceId}?explanationLanguage=` | Mirror LESSON body union (`AVAILABLE` \| `LANGUAGE_UNAVAILABLE`) + progress + outline/objective ids |
| `upsertRemediationContentProgress` | `PUT /api/v1/academic/packages/{subject}/remediation/{resourceId}/progress`             | Same progress model as LESSON; corrective complete for revalidation eligibility                     |

### Models (summary)

| Model                            | Notes                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionItemView`                | Pre-submit safe; `hintLadder[]` strength metadata without bodies; `disclosedHints` bodies only after disclose                                              |
| `HintTierMeta`                   | `tierIndex`, `strength`, `disclosed` (CR-01)                                                                                                               |
| `ItemFeedback`                   | correctness, `correctOptionKey`, explanations, commonMistakeNotes, **`relatedResources: RelatedResourceRef[]`** (CR-04; no bare UUID list on student wire) |
| `RelatedResourceRef`             | `resourceId`, `kind: LESSON \| REMEDIATION`, `title`                                                                                                       |
| `SessionResult`                  | correctCount, total, checkpointPassed?, mistakeIds[], evidenceWritten[], context                                                                           |
| `AssessmentSessionResumeSummary` | Continue row fields without stems/keys (CR-03)                                                                                                             |
| `AssessmentContextSummary`       | Agent-ready envelope (AC-20); returned on session and result                                                                                               |
| `MistakeAttemptQuestion`         | Immutable stem/options/examLanguage/outline/objective (CR-02)                                                                                              |
| `MistakeLatestResponse`          | selectedOptionKey, correct, optional feedback, session/attempt ids, respondedAt (CR-02)                                                                    |
| `MistakeSummary`                 | status, errorCount, assistance, **`stemPreview`** (max 3 blocks) (CR-02)                                                                                   |
| `MistakeDetail`                  | annotation + **`attemptQuestion`** + **`latestResponse`** + remediationCandidates + revalidationEligible                                                   |
| `LearningEvidenceSnapshot`       | objectiveId, `CHECKPOINT_PASSED`, sourceSessionId, at                                                                                                      |
| `CheckpointForLesson`            | startable, lockReason, editions by exam language                                                                                                           |

### Contract decisions

- Auth: existing bearer + refresh cookie; no new cookie.
- Errors: `application/problem+json`; codes `CHECKPOINT_LOCKED` (with `lockReason`), `SESSION_ALREADY_SUBMITTED`, `SESSION_NOT_RESUMABLE`, `REVALIDATION_NOT_ELIGIBLE`, `STRONG_HINT_BLOCKED`, `HINT_EXHAUSTED`, `ITEM_ALREADY_LOCKED`, `SET_NOT_AVAILABLE`, `ASSESSMENT_VALIDATION_FAILED`.
- Pagination: mistakes `cursor` + `limit` (1–100).
- Compatibility: additive admin draft fields; new `/api/v1/assessment` namespace; additive REMEDIATION academic routes.
- Security: JSON `Cache-Control: no-store`; correct keys and undisclosed hint **bodies** never leave server before disclosure; **strength metadata** on `hintLadder` is intentional (no solution body); private notes owner-only; session list has no stems/keys.
- Admin draft still stores `relatedResourceIds` on questions; student feedback **resolves** them to `RelatedResourceRef` (kind + title) at response time.
- Reserved: `planTaskId` null in VS-009; `languageAssistUsed` always false; `nextDueAt` nullable unused for multi-day SR.
- Session list default: omit `status` → treat as `IN_PROGRESS` for Practice Continue.

## Contract collaboration

| Review                                                     | Owner               | Status     | Evidence                                                                                                   |
| ---------------------------------------------------------- | ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| Slice drafted and human gate resolved                      | Backend/slice owner | `COMPLETE` | Revisions 1–2; `D-01`–`D-16`                                                                               |
| Initial TypeSpec compiles and generated output is reviewed | Backend/slice owner | `COMPLETE` | `VS-009-R3-initial`: see verification evidence                                                             |
| Frontend consumer review (initial)                         | Frontend owner      | `COMPLETE` | Revision 4 review of `VS-009-R3-initial`; filed `CR-01`–`CR-04`                                            |
| Contract requests resolved                                 | Backend/slice owner | `COMPLETE` | All four **ACCEPTED** and applied in revision 5 (`VS-009-R5-cr-applied`)                                   |
| Frontend consumer re-review                                | Frontend owner      | `COMPLETE` | Revision 6 re-review of `VS-009-R5-cr-applied`; accepted as `VS-009-R5-accepted`; **zero further `CR-NN`** |
| Accepted contract checkpoint recorded                      | Backend + frontend  | `COMPLETE` | `VS-009-R5-accepted` (identical hashes to R5-cr-applied); slice `CONTRACT_READY`                           |

### Contract change requests

| ID      | Consumer scenario or constraint                                                                                                                                                                                | Proposed change                                                                                            | Backend decision and reason                                                                                                                                                                                                    | Human decision ID | Status     | Applied/review evidence                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `CR-01` | STRONG hint warn before disclosure; REVALIDATION must pre-disable STRONG without probing. `SessionItemView` lacked undisclosed strength metadata; slice already required ordered hint metadata without bodies. | Full `hintLadder: HintTierMeta[]` (`tierIndex`, `strength`, `disclosed`); bodies stay in `disclosedHints`. | **ACCEPT.** Matches attempt-copy invariant and AC-05 / `D-10` / revalidation STRONG-off without logging assistance. Weaker `nextHintStrength` alone insufficient for progressive labels. No product-meaning change.            | —                 | `RESOLVED` | Applied in R5; FE re-review rev 6 confirmed `hintLadder` + `HintTierMeta` on generated OpenAPI/web                 |
| `CR-02` | Mistake notebook must show exact attempt question + latest response (req 5.4, US-MISTAKE-01); list needs identification without N+1 session loads.                                                             | `MistakeDetail.attemptQuestion` + `latestResponse`; `MistakeSummary.stemPreview`.                          | **ACCEPT.** Normative attempt-question-copy and mistake notebook requirements; revalidation alternate items must not replace the notebook identity. Stem preview capped at 3 blocks (list-safe); full stem on detail.          | —                 | `RESOLVED` | Applied in R5; FE re-review rev 6 confirmed attempt copy / latest response / stemPreview                           |
| `CR-03` | Practice Continue needs durable discovery of owner `IN_PROGRESS` sessions (Flow C, AC-15); client-only sessionId storage is insufficient.                                                                      | `GET /api/v1/assessment/sessions?status?&subject?` → `AssessmentSessionResumeSummary[]`.                   | **ACCEPT.** Required for accepted resume flow; owner-only list; no stems/keys/hints on summary; default status `IN_PROGRESS`. Deep-link `getAssessmentSession` unchanged.                                                      | —                 | `RESOLVED` | Applied in R5; FE re-review rev 6 confirmed `listAssessmentSessions` + resume summary progress fields              |
| `CR-04` | Post-submit solution links need kind + title for navigable LESSON/REMEDIATION (req 5.3); bare UUIDs force speculative dual GETs.                                                                               | Replace student `relatedResourceIds` with `relatedResources: RelatedResourceRef[]`.                        | **ACCEPT (replace on student wire).** Aligns with `RemediationCandidate` pattern; admin draft keeps `relatedResourceIds` as authorship ids; server resolves kind/title. TERMINOLOGY omitted from student projection in VS-009. | —                 | `RESOLVED` | Applied in R5; FE re-review rev 6 confirmed student `relatedResources` only (admin `relatedResourceIds` unchanged) |

### Frontend consumer re-review (`VS-009-R5-cr-applied` → `VS-009-R5-accepted`)

Reviewed **2026-08-11** as frontend-worker after backend applied all CRs.

**Artifacts verified:** `git hash-object` matches recorded `VS-009-R5-cr-applied` table (`assessment-student.tsp` `5bc4cd5bc3a067dfd91701acc5007eec08c6e95b`; OpenAPI `3ee7348d85bcee7e2eaccb5af2b2c3321fa92823`; web `89496ada0772807d5e38bd205fa2febde490a4fc`). Admin/academic-student additive REMEDIATION ops unchanged vs R3 as expected.

**Verdict:** **Accept.** All four CRs satisfy the closed-loop consumer journeys. **Zero further `CR-NN`.** Accepted checkpoint **`VS-009-R5-accepted`** (same hashes). Slice **`CONTRACT_READY`**. Backend and frontend may implement from this boundary.

#### CR satisfaction matrix

| CR      | Required consumer behavior                                                    | Applied shape (verified)                                                                                                                                                          | Verdict       |
| ------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `CR-01` | Warn before STRONG; pre-disable STRONG on REVALIDATION without disclose probe | `SessionItemView.hintLadder: HintTierMeta[]` with `tierIndex`, `strength`, `disclosed`; bodies only in `disclosedHints`; doc says ladder length equals `hintTierCount`            | **Satisfied** |
| `CR-02` | Notebook shows exact attempt question + latest response; list identifiable    | `MistakeDetail.attemptQuestion` (stem/options safe) + `latestResponse` (selected key, correct, optional feedback); `MistakeSummary.stemPreview` max 3 blocks                      | **Satisfied** |
| `CR-03` | Practice Continue discovers owner in-progress sessions                        | `GET /sessions?status?&subject?` → `AssessmentSessionResumeSummary[]` with title, answered/locked counts, purpose, examLanguage, feedbackMode; default IN_PROGRESS; no stems/keys | **Satisfied** |
| `CR-04` | Navigable post-submit course links                                            | `ItemFeedback.relatedResources: RelatedResourceRef[]` with `kind: LESSON \| REMEDIATION` + `title`; bare UUID array removed from student wire; admin keeps authorship ids         | **Satisfied** |

#### Closed-loop sufficiency (post-CR)

| Journey step                                    | Contract support                                               | Verdict                        |
| ----------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| A — Checkpoint after LESSON complete            | `getCheckpointForLesson` + start + player + submit + pass/fail | **Sufficient**                 |
| A — Inner loop hints with STRONG caution        | `hintLadder` + `discloseHint` + assistance summary             | **Sufficient**                 |
| A/B — IMMEDIATE / SET_END                       | `feedbackMode` + answer PUT + `submitSession`                  | **Sufficient**                 |
| A/B — Fail → mistake → remediation → revalidate | mistake detail + academic REMEDIATION + `startRevalidation`    | **Sufficient**                 |
| B — Topic practice hub                          | `listAssessmentSets` filters + empty list                      | **Sufficient**                 |
| C — Continue / resume                           | `listAssessmentSessions` + `getAssessmentSession`              | **Sufficient**                 |
| Solution links after feedback                   | `relatedResources` kind+title                                  | **Sufficient**                 |
| Agent context envelope (AC-20)                  | `AssessmentContextSummary` on session/result                   | **Sufficient** (session-level) |
| Admin authoring                                 | draft `assessmentSets` / `hintTiers` / solution metadata       | **Sufficient**                 |

#### Explicit non-requests retained (implementation binding)

- IMMEDIATE last-item finalization still FE-orchestrated via `submitSession` + optional `Idempotency-Key`.
- SUBMITTED `getAssessmentSession` review projection still assumed (items + feedback + `context.checkpointPassed`); score may be derived from items; fail deep-links may use `SessionResult.mistakeIds` at submit time or `listMistakes`.
- Resume item focus still FE-inferred (no `currentItemId`).
- Mistake status transitions server-owned; FE refreshes after remediation progress.
- Revalidation Continue row may have `title: null` — FE uses purpose-based copy (“Revalidate”).
- `RemediationCandidate.kind` remains full `StudyResourceKind`; production routes only LESSON/REMEDIATION and does not invent TERMINOLOGY notebook UI in VS-009.
- Private notes remain detail-only (not on list).
- Reserved: `planTaskId`, language-assist, multi-day `nextDueAt` not exposed as live controls.

#### Generated TypeScript consumption check (post-CR)

- Ops: prior twelve assessment ops **plus** `AssessmentStudentApi_listAssessmentSessions`; REMEDIATION academic pair unchanged.
- New models usable without handwritten DTOs: `HintTierMeta`, `RelatedResourceRef`, `MistakeAttemptQuestion`, `MistakeLatestResponse`, `AssessmentSessionResumeSummary`.
- Discriminants: `RelatedResourceRef.kind` is `"LESSON" | "REMEDIATION"`; `ContentBlock.kind` unchanged for stem/hint bodies.
- Student wire has **no** `ItemFeedback.relatedResourceIds`; admin draft still has `relatedResourceIds` on questions (authoring only).

### Frontend consumer review (`VS-009-R3-initial`) — historical

Reviewed **2026-08-11** as frontend-worker against:

- slice revision 3 outcome + plan revision 4 review record;
- journeys A (lesson checkpoint), B (topic practice), C (resume);
- AC 01–20; decisions `D-01`–`D-16`;
- requirements EN 4.6, 5.1, 5.3 (math hints + post-submit solutions; language-assist out), 5.4;
- stories `US-COURSE-03`, `US-PRACTICE-01`, partial `US-HINT-01`, `US-MISTAKE-01`–`03`;
- TypeSpec: `contracts/assessment-student.tsp` (+ additive admin/student academic), hashes matching `VS-009-R3-initial`;
- generated `contracts/generated/openapi.yaml` and `apps/web/src/shared/api/generated/openapi.ts`;
- VS-008 Learn production patterns (guards, no-store, explanation-language independence) as adjacent consumers.

**Verdict (historical, rev 4):** Strong substrate but **not consumer-ready** until `CR-01`–`CR-04` resolved. Superseded by revision 6 re-review acceptance of `VS-009-R5-accepted`.

#### Preflight facts (implementation binding)

| Fact                                     | Value                                                                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice revision / checkpoint under review | Plan rev 4 review of **`VS-009-R3-initial`** (accepted checkpoint not established)                                                                                                                                                                                              |
| Actor                                    | Activated production `STUDENT` (admin authoring is same slice, separate surface)                                                                                                                                                                                                |
| Canonical entry routes (planned)         | Learn checkpoint CTA → `/app/learn/:subject/lessons/:resourceId/checkpoint`; Practice hub `/app/practice`; session `/app/practice/sessions/:sessionId`; mistakes `/app/practice/mistakes[/:mistakeId]`; remediation `/app/learn/:subject/remediation/:resourceId`               |
| Restored-session `/`                     | Unchanged by this slice (Today/profile per current product); Practice/Learn are primary-nav, not root redirect                                                                                                                                                                  |
| Direct URL / reload                      | Session and mistake detail must reload from server by id; Continue needs `CR-03`                                                                                                                                                                                                |
| Prototype adjacent                       | Rewrite `prototype/student/practice/*`; production `features/assessment` (+ learn handoff) must not import prototype; promote Practice/Mistakes off preview workspace gate (same class of fix as VS-008 Learn)                                                                  |
| Data authority                           | Assessment/session/mistake/remediation progress = production API only; exam language = explicit chooser at start (never interface/explanation inference); temporary explanation language on remediation/lesson = session UI only; profile default explanation language = VS-004 |
| Regression neighbors                     | VS-008 Learn content-complete CTA region; app shell Practice nav; auth/activation guards                                                                                                                                                                                        |

#### Contract sufficiency matrix

| Consumer need                                                           | Contract support                                                                                                   | Verdict                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Checkpoint CTA after LESSON complete; locked reason without start       | `getCheckpointForLesson` → `startable`, `lockReason`, `editions[]`                                                 | **Sufficient**                                                                                       |
| Explicit exam-language choice (no inference)                            | Editions by `examLanguage`; `startAssessmentSession` requires `examLanguage` + `setId`                             | **Sufficient**                                                                                       |
| Practice hub filters (subject, outline/objective, difficulty, language) | `listAssessmentSets` query params + `AssessmentSetSummary` (count, minutes, mode)                                  | **Sufficient**                                                                                       |
| Empty practice / no checkpoint edition                                  | Empty list `[]`; `startable=false` + lock reasons                                                                  | **Sufficient**                                                                                       |
| Start CHECKPOINT / TOPIC_PRACTICE; pin revision; materialize items      | `startAssessmentSession` → `201` `AssessmentSession` with `items[]`                                                | **Sufficient**                                                                                       |
| Pre-submit omit keys and undisclosed hint bodies (AC-04)                | `SessionItemView` + `ItemFeedback` only after allow                                                                | **Sufficient**                                                                                       |
| Progressive math hints; log tiers; STRONG warn **before** open          | Disclose op + disclosed bodies only; **no undisclosed strength meta**                                              | **`CR-01`**                                                                                          |
| IMMEDIATE vs SET_END                                                    | `feedbackMode`; answer PUT locks vs keeps OPEN; submitSession for set end / final score                            | **Sufficient** (FE auto-`submitSession` after last IMMEDIATE lock is client orchestration)           |
| CHECKPOINT pass flag + evidence without “Mastered” copy                 | `SessionResult.checkpointPassed`, `evidenceWritten[]`, context; copy is FE discipline                              | **Sufficient**                                                                                       |
| TOPIC_PRACTICE scores without checkpoint pass                           | `checkpointPassed` null for non-CHECKPOINT purpose                                                                 | **Sufficient**                                                                                       |
| Mistake upsert + list/detail + optional cause/note                      | list/get/patch mistakes; `ErrorCause`; private note on detail                                                      | **Partial — `CR-02`** (meta OK; **missing attempt copy / latest response / list preview**)           |
| Remediation candidates + LESSON fallback empty honesty                  | `remediationCandidates[]` with `kind`/`title`/`preferred`; academic REMEDIATION GET+progress                       | **Sufficient** (status transitions `REMEDIATION_IN_PROGRESS` are server-owned; FE refreshes mistake) |
| Revalidation start; STRONG off; alternate preference                    | `startRevalidation` → session `purpose=REVALIDATION`; conflict `REVALIDATION_NOT_ELIGIBLE` / `STRONG_HINT_BLOCKED` | **Sufficient** with **`CR-01`** (disable STRONG without probing)                                     |
| Resume `IN_PROGRESS` by session URL                                     | `getAssessmentSession`; cancelled → 409                                                                            | **Partial — deep link OK; Practice Continue discovery → `CR-03`**                                    |
| Post-submit solution links to courses                                   | `relatedResourceIds` bare UUIDs                                                                                    | **`CR-04`**                                                                                          |
| Agent-ready context envelope (AC-20)                                    | `AssessmentContextSummary` on session/result (session-level; item ids FE-composable)                               | **Sufficient** for VS-009 (item/question fields deferred to VS-011 tools)                            |
| AuthZ / problem codes / no-store                                        | Bearer; 401/403/404/409/400 validation; `Cache-Control: no-store`                                                  | **Sufficient**                                                                                       |
| Admin AssessmentSet + hints + solution metadata                         | Additive draft `assessmentSets`, `hintTiers`, `commonMistakeNotes`, `relatedResourceIds`                           | **Sufficient** for admin editor (publish validation implementation-owned)                            |
| Independent interface / explanation / exam languages                    | Exam on session; explanation query on remediation/lesson; no cross-write                                           | **Sufficient**                                                                                       |

#### Journey / state matrix (implementation binding)

| Concern    | Required cases                                                                           | Contract + routing notes                                                                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry      | Learn CTA; Practice hub; direct session/mistake/remediation URLs; restored `/`           | Checkpoint + sets ops OK. Register production routes; promote Practice/Mistakes off preview gate. Root `/` not assessment.                                                                                                                    |
| Identity   | Signed out; STUDENT; wrong role; expired session                                         | 401/403; never show fixture stems/keys/notes on failure.                                                                                                                                                                                      |
| Navigation | Shell Practice/Learn active; back from player → hub/lesson; sign-out clears token        | Paths as frontend plan; set/mistake titles need localized title fields (sets OK; mistakes need `CR-02` preview).                                                                                                                              |
| Reload     | Mid-session; after item lock; after submit; after annotation; after remediation progress | Session GET by id; **assume** SUBMITTED review returns all items locked with feedback + `context.checkpointPassed` set so score/pass can be shown without a second result resource (explicit non-request below). Continue list needs `CR-03`. |
| Prototype  | Preview absent/present; production never imports prototype practice                      | Rewrite prototype practice; remove mastery vocabulary from production.                                                                                                                                                                        |
| Data       | Load/empty/lock/hint/submit/fail/pass/mistake/remediation/revalidate/retry               | Map problem codes to recoverable UI; DEV offline/401/404 fallback only per repo rules; never mock 5xx success.                                                                                                                                |
| Layout     | Mobile-first player; 44px; keyboard radiogroup; id/en/zh-CN; reduced motion              | Experience plan; KaTeX via shared.                                                                                                                                                                                                            |

#### Explicit non-requests (accepted assumptions until contradicted)

- **IMMEDIATE finalization:** After the last item locks under `IMMEDIATE`, FE calls `submitSession` (optional `Idempotency-Key`); server need not auto-submit on last answer as long as `submitSession` is idempotent for already-submitted owners.
- **SUBMITTED review projection:** `getAssessmentSession` on `SUBMITTED` returns full item feedback (including `correct` / `feedback`) and fills `context.checkpointPassed` for CHECKPOINT; FE may compute `correctCount` from items and deep-link mistakes via `listMistakes` if `mistakeIds` are not on the session resource. If backend cannot guarantee review projection, open a follow-up CR for nested `result` on session.
- **Resume item focus:** FE selects the first incomplete item (OPEN without durable lock under IMMEDIATE; first unanswered or last focused under SET_END using local UI state). No `currentItemId` field required for pilot.
- **Mistake status machine writes:** `OPEN` → `REMEDIATION_IN_PROGRESS` → `AWAITING_REVALIDATION` are server-side when remediation progress / eligibility rules apply; FE only reads `status` + `revalidationEligible` after academic progress PUT + mistake GET.
- **Private notes on list:** Owner list may omit `privateNote` (detail only)—preferred for list payload size; comment in TypeSpec that claimed list notes is documentation drift only.
- **`planTaskId` / language-assist / multi-day `nextDueAt`:** Correctly reserved; production UI must not present plan-assigned practice, Chinese language-assist, or spaced due dates as live controls.
- **Admin publish validation:** Fail-closed CHECKPOINT rules stay on existing publish path (no new admin HTTP op).
- **Images / KaTeX:** Reuse academic student image GET + shared content blocks; no new media contract.

#### Generated TypeScript consumption check

- Ops present: `AssessmentStudentApi_listAssessmentSets`, `_getCheckpointForLesson`, `_startAssessmentSession`, `_getAssessmentSession`, `_discloseHint`, `_submitItemAnswer`, `_submitSession`, `_cancelSession`, `_listMistakes`, `_getMistake`, `_updateMistakeAnnotation`, `_startRevalidation`; `AcademicStudentApi_getPublishedRemediation`, `_upsertRemediationContentProgress`.
- Shared admin enums/models usable: `HintStrength`, `AssessmentSetPurpose`, `AssessmentFeedbackMode`, `CheckpointPassPolicy`, `ContentBlock`, `LocalizedText`, `StudyResourceKind`.
- Problem unions include assessment-specific conflict codes; validation problem with `violations[]` matches existing field-error patterns.
- After `CR-01`–`CR-04`, no handwritten competing wire DTOs should be required.

## Backend plan

- **`assessment` module:** sessions, item attempts, assistance events, scoring, mistakes, revalidation eligibility, objective evidence, student HTTP API.
- **`academic` module:** AssessmentSet + hint/solution fields in draft/publish; REMEDIATION student projection; content progress for REMEDIATION; `PublishedAssessmentCatalog` application port for assessment.
- **Ports:**
  - `PublishedAssessmentCatalog` — sets, questions, remediation candidates for active revision.
  - `StudentContentProgressQuery` / command — LESSON complete gate; REMEDIATION complete.
  - `LearningEvidencePort` — read API for later modules/agents.
  - `ContentAccessPolicy` — pilot STUDENT open-access (shared pattern with VS-008).
- **Domain services:** `AssessmentSessionService`, `ScoringPolicy`, `MistakeService`, `RevalidationPolicy`, `RemediationResolver`.
- **Flyway:** V9+ assessment tables (sessions, items, assistance_events, mistakes, objective_evidence); indexes on (account_id, status), (account_id, package_id, question_id).
- **Transactions:** submit session = score + mistakes + evidence in one TX.
- **Async / AI:** none.

## Frontend plan

- **Routes:**
  - Learn: checkpoint CTA; `/app/learn/:subject/lessons/:resourceId/checkpoint`
  - `/app/practice` hub; `/app/practice/sessions/:sessionId`
  - `/app/practice/mistakes`, `/app/practice/mistakes/:mistakeId`
  - `/app/learn/:subject/remediation/:resourceId` (or shared study reader)
- **Guards:** activated STUDENT; promote Practice/Mistakes off preview workspace gate.
- **Feature folder:** `features/assessment/`; learn handoff may call assessment API from `features/learn`; block/KaTeX via `shared` only.
- **Prototype:** rewrite `prototype/student/practice/*`; never import into production features.
- **States:** locked checkpoint, empty practice, resume, hint loading, submit in-flight, pass/fail, mistake empty, remediation complete, revalidation ineligible, network retry, 403/404.
- **i18n/a11y:** chrome id/en/zh-CN; radiogroup answers; hint button labels; focus on item change.

## Experience and interaction plan

- Primary actions: Start checkpoint, Start practice, Show next hint, Check answer / Submit set, Study remediation, Revalidate, Continue session.
- One dominant action per region.
- No decorative AI/robot imagery.
- Visual review: mobile + desktop session player; id/en/zh-CN; reduced motion; KaTeX stems/options.

## Authorization, privacy, and safety

- Activated `STUDENT` only for student assessment APIs; admin package authoring unchanged in role.
- Minors: attempts/mistakes sensitive—minimize fields; private notes never to parents in this slice.
- Ownership enforced in application layer (no IDOR).
- Keys and full hint ladders not on list endpoints.
- Audit: value-free events for start/submit/pass/fail/revalidation; never log note/stem/answer/key.

## Observability

| Event/metric                      | Trigger         | Allowed properties                                                 | Prohibited  |
| --------------------------------- | --------------- | ------------------------------------------------------------------ | ----------- |
| `assessment.session.started`      | start           | purpose, subject, examLanguage, setId, questionCount, feedbackMode | stems       |
| `assessment.hint.disclosed`       | hint            | sessionId, itemId, tierIndex, strength                             | hint body   |
| `assessment.item.locked`          | answer lock     | correct, strongAssistance                                          | option text |
| `assessment.session.submitted`    | submit          | purpose, correctCount, total, checkpointPassed                     | answers     |
| `assessment.mistake.upserted`     | incorrect       | mistakeId, status, errorCount                                      | note, stem  |
| `assessment.revalidation.started` | start           | mistakeId, usedAlternateQuestion                                   | —           |
| `assessment.evidence.written`     | checkpoint pass | signal, objectiveCount                                             | —           |

## Test plan

### Contract and backend

- TypeSpec compile + `pnpm check:generated`.
- Publish validation for sets/hints/remediation links.
- Checkpoint lock without content-complete.
- Hint order + STRONG pass matrix.
- IMMEDIATE vs SET_END.
- Mistake idempotency; annotation optional.
- Remediation resolver ordering.
- Revalidation alternate vs fallback; assistance blocks pass.
- TOPIC_PRACTICE vs CHECKPOINT evidence.
- Resume IN_PROGRESS.
- AuthZ; no key leakage; module boundary compile isolation.

### Frontend

- CTA lock/ready; exam language; player hints; feedback; results; practice empty; mistakes; remediation; revalidation; resume; guards; i18n parity; prototype isolation.

### End-to-end / manual

- Admin publish wired package → LESSON complete → checkpoint pass.
- Fail → remediation → revalidation (alternate if present).
- Topic practice → mistake loop.
- Resume mid-session.
- Mobile + desktop + reduced motion.

## Implementation sequence

1. This brief is ownership; do not implement from PLAN one-liner alone.
2. Gate remains `APPROVED` for `D-01`–`D-16` unless new contradictory evidence.
3. ~~Initialize TypeSpec; regenerate; initial checkpoint~~ **Done** — `VS-009-R3-initial` (revision 3).
4. ~~Frontend consumer review of `VS-009-R3-initial`~~ **Done (rev 4)** — filed `CR-01`–`CR-04`.
5. ~~Backend disposes `CR-01`–`CR-04`~~ **Done (rev 5)** — all **ACCEPTED** and applied; checkpoint `VS-009-R5-cr-applied`.
6. ~~Frontend re-review~~ **Done (rev 6)** — zero further CR; accepted checkpoint `VS-009-R5-accepted`; status **`CONTRACT_READY`**.
7. Backend: V9+ schema; academic publish validation; ports; domain; HTTP; tests.
8. Admin UI: AssessmentSet + hints + remediation links; pilot content.
9. Frontend: Learn handoff; Practice; player; mistakes; remediation reader (from `VS-009-R5-accepted` only).
10. Integrate real package early; verify AC-20 agent context fields.
11. Update `ARCHITECTURE.md`, `PLAN.md`, `COVERAGE.md`, glossary if needed; `DONE` only after product-owner accepts **checkpoint pass**, **fail→remediation→revalidation**, and **topic practice→mistake** journeys.

## Definition of done

- [ ] Story mapping honest (full US-COURSE-03 / US-PRACTICE-01 / US-MISTAKE-01–03; partial US-HINT-01).
- [ ] Documentation sufficiency complete; `D-01`–`D-16` reflected in contract/code.
- [ ] Human gate remains `APPROVED` (or reopened with evidence).
- [x] TypeSpec compiles; initial + accepted checkpoints; FE consumer review; no open CR (`VS-009-R5-accepted`, `CONTRACT_READY`).
- [x] Backend assessment module + academic extensions + migrations + tests match checkpoint (2026-08-11 backend-worker).
- [ ] Frontend production replaces prototype for accepted loop; no prototype imports.
- [ ] All AC rows have named evidence.
- [ ] Authorization, privacy (private notes), no key leakage reviewed.
- [ ] Mobile, a11y, localization, reduced motion verified.
- [ ] Architecture/PLAN/COVERAGE updated; agentic ports documented without claiming VS-011 done.
- [ ] Product owner accepts the three real journeys above.

## Verification evidence

| Evidence                      | Result                                                                                                                                                                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract build                | `pnpm contract:build` — TypeSpec 1.14 compile OK after CR application (2026-08-11)                                                                                                                                                                                                |
| Generate + web typecheck      | `pnpm generate` + `pnpm typecheck:web` — passed after `CR-01`–`CR-04` apply                                                                                                                                                                                                       |
| Initial contract checkpoint   | `VS-009-R3-initial` (historical)                                                                                                                                                                                                                                                  |
| Post-CR contract checkpoint   | `VS-009-R5-cr-applied` established (hashes below)                                                                                                                                                                                                                                 |
| Frontend contract review      | **Complete (rev 4)** on R3-initial; **re-review complete (rev 6)** on R5 — **accepted**                                                                                                                                                                                           |
| CR disposition                | All `CR-01`–`CR-04` **RESOLVED** (accepted, applied, FE-confirmed); **zero open CR**                                                                                                                                                                                              |
| Accepted contract checkpoint  | **`VS-009-R5-accepted`** — same hashes as R5-cr-applied; status **`CONTRACT_READY`**                                                                                                                                                                                              |
| Technology/ADR review         | Complete at shaping — existing stack + new assessment module                                                                                                                                                                                                                      |
| Backend tests                 | 2026-08-11: unit + Testcontainers HTTP IT for assessment + academic extensions — **PASS** (`./mvnw -Dtest=com.yukcsca.assessment.**,com.yukcsca.academic.**`; Flyway V9 applied; BUILD SUCCESS). Backend implementation complete; **not** product-owner `DONE` until FE journeys. |
| Frontend tests / visual / e2e | Not run (frontend implementation remains out of backend goal)                                                                                                                                                                                                                     |
| Research synthesis            | Expanded 2026-08-11 (Bloom, VanLehn, ITS keep/change, practice platforms)                                                                                                                                                                                                         |
| Product grill decisions       | `D-01`–`D-16` APPROVED 2026-08-11                                                                                                                                                                                                                                                 |

### `VS-009-R3-initial` artifact hashes (`git hash-object`) — historical

| Artifact                                       | Hash                                       |
| ---------------------------------------------- | ------------------------------------------ |
| `contracts/assessment-student.tsp`             | `a20fd365ef79da30554f2988694e8f7fd39d92bb` |
| `contracts/generated/openapi.yaml`             | `9a4833fad2777b20b8806b2c00a4050b3eaf4087` |
| `apps/web/src/shared/api/generated/openapi.ts` | `02f7c3bad96bebefb7f91d4518d7e262cf1a3e09` |

### `VS-009-R5-cr-applied` artifact hashes (`git hash-object`)

| Artifact                                       | Hash                                                         |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `contracts/assessment-student.tsp`             | `5bc4cd5bc3a067dfd91701acc5007eec08c6e95b`                   |
| `contracts/academic-admin.tsp`                 | `e7b6d7785b051476b989040f6487dc521c51a292` (unchanged vs R3) |
| `contracts/academic-student.tsp`               | `3ad04d4b865c69389759a32e180f9f032e362dac` (unchanged vs R3) |
| `contracts/main.tsp`                           | `ea6d742258f200e86d29cd62b4868271498ae9cf` (unchanged vs R3) |
| `contracts/generated/openapi.yaml`             | `3ee7348d85bcee7e2eaccb5af2b2c3321fa92823`                   |
| `apps/web/src/shared/api/generated/openapi.ts` | `89496ada0772807d5e38bd205fa2febde490a4fc`                   |

**`VS-009-R5-accepted`:** identical hashes to the table above (FE re-review rev 6; no wire change).

**Operation inventory (15 student-facing ops):** 13 `AssessmentStudentApi_*` under `/api/v1/assessment/**` (includes `listAssessmentSessions`); `AcademicStudentApi_getPublishedRemediation`; `AcademicStudentApi_upsertRemediationContentProgress`. Admin draft models extended (no new admin HTTP routes).

**Intentionally not run:** full `make verify`, backend `./mvnw verify`, Playwright, Compose — contract review/acceptance only; no domain or production UI implementation in re-review.

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6        | 2026-08-11 | Frontend consumer re-review of `VS-009-R5-cr-applied`: verified all four applied CR shapes against journeys A–C / AC / req 5.3–5.4; **zero further `CR-NN`**; recorded accepted checkpoint **`VS-009-R5-accepted`** (identical hashes); moved status to **`CONTRACT_READY`**. No TypeSpec edits; no feature implementation in this step.                                                                                                                                           |
| 5        | 2026-08-11 | Backend disposed `CR-01`–`CR-04` (all **ACCEPTED**): `hintLadder` on `SessionItemView`; mistake `attemptQuestion` / `latestResponse` / `stemPreview`; `listAssessmentSessions` + resume summary; `ItemFeedback.relatedResources` replacing bare UUIDs on student wire. Regenerated OpenAPI/web; recorded `VS-009-R5-cr-applied`. Status remains `SHAPING` pending frontend re-review; zero open CR; not yet `CONTRACT_READY`.                                                      |
| 4        | 2026-08-11 | Frontend consumer review of `VS-009-R3-initial`: journey/AC/requirement matrix recorded; filed open `CR-01`–`CR-04` (hint ladder strength metadata; mistake attempt question copy + latest response + list stem preview; IN_PROGRESS session discovery for Practice Continue; related resource refs with kind/title). Status remains `SHAPING`; no TypeSpec edits by frontend; no feature implementation; accepted checkpoint still pending backend CR disposition + FE re-review. |
| 3        | 2026-08-11 | Initial TypeSpec contract: new `assessment-student.tsp` (12 ops); additive admin AssessmentSet/hint tiers/solution metadata; additive academic REMEDIATION read+progress; regenerated OpenAPI/web declarations; recorded `VS-009-R3-initial`; status remains `SHAPING` pending frontend consumer review. No backend/frontend feature implementation.                                                                                                                               |
| 2        | 2026-08-11 | Deep-research refine: Bloom formative→corrective→retest and VanLehn inner/outer loop mapped explicitly; agent context envelope; feedbackMode IMMEDIATE/SET_END; session resume; remediation resolution algorithm; revalidation alternate-item policy `D-16`; solution/common-mistake admin fields; error-cause enum; REMEDIATION content-progress ownership fixed; expanded ACs 01–20; research synthesis extended.                                                                |
| 1        | 2026-08-11 | Initial shaping: assessment substrate; agentic-ready evidence ports; admin+student same slice; grill `D-01`–`D-15`; status `SHAPING`.                                                                                                                                                                                                                                                                                                                                              |
