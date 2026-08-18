# VS-010A — Chinese exam-language terminology preview, in-context help, and notebook

## Metadata

| Field                        | Value                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status                       | `CONTRACT_READY`                                                                                                                                                                                                                                                                                            |
| Human gate                   | `APPROVED`                                                                                                                                                                                                                                                                                                  |
| Plan revision                | 12                                                                                                                                                                                                                                                                                                          |
| Updated                      | 2026-08-15                                                                                                                                                                                                                                                                                                  |
| Primary actor                | Activated `STUDENT` on a published package that has Chinese (`zh-CN`) exam-language terms. First platform admin authors the term bank. First content: Mathematics.                                                                                                                                          |
| Story IDs                    | `US-TERM-01`, `US-TERM-02`, `US-TERM-03`; partial `US-HINT-01` (record language help, do not treat word/phrase as independent mastery); partial `US-ADM-02`                                                                                                                                                 |
| Requirement sections         | English: 4.4 (canonical term identity), 4.5, 4.7 (P0 notebook clause), 5.3 (Chinese language assistance); Chinese: the matching clauses                                                                                                                                                                     |
| Depends on                   | [`VS-005`](VS-005-academic-foundation.md), [`VS-008`](VS-008-student-learn-content.md), [`VS-009`](VS-009-assessment-practice-remediation.md)                                                                                                                                                               |
| Related ADRs                 | [`ADR-0001`](../decisions/ADR-0001-azure-speech-term-pronunciation.md) — Azure Speech for pre-rendered term audio                                                                                                                                                                                           |
| TypeSpec source              | Additive `contracts/academic-admin.tsp`, `contracts/academic-student.tsp`, `contracts/assessment-student.tsp`, `contracts/common.tsp`                                                                                                                                                                       |
| API operations               | Admin draft: `terms[]`, `requiredTermIds`, `authoredTermAttachments` (no new admin routes). **9** new student ops: 8 academic terminology + 1 assessment Language help. Additive optional fields on lesson browse/read and `AssistanceSummary`. Required `SessionItemView.languageHelpAvailable` (`CR-01`). |
| Backend/slice owner          | Backend vertical-slice worker. `academic` owns the term bank, preview, notebook, and lookup. `assessment` owns `LANGUAGE_ASSIST` events.                                                                                                                                                                    |
| Frontend owner               | Frontend consumer worker. Production Learn owns preview, lesson rail, and notebook. Assessment owns in-item Language help.                                                                                                                                                                                  |
| Initial contract checkpoint  | `VS-010A-R8-initial` — TypeSpec compiled; hashes in verification evidence                                                                                                                                                                                                                                   |
| CR-applied checkpoint        | `VS-010A-R10-cr-applied` — `CR-01` accepted; hashes in verification evidence                                                                                                                                                                                                                                |
| Accepted contract checkpoint | `VS-010A-R10-accepted` — identical hashes to `VS-010A-R10-cr-applied`. Backend and frontend may implement from this boundary.                                                                                                                                                                               |

## User-observable outcome

A student on a Chinese-language CSCA package can preview a topic’s required terms, look up a word or phrase again in the lesson or during practice without seeing a full translation, and review collected terms in one notebook — without treating viewing as mastery, and without an agent or a formal mock. The first published package is Chinese Mathematics. The same model is for later Chinese Physics and Chemistry.

## What this slice is

Chinese exam language can hide the subject. This slice is the **language bridge** for **Chinese (`zh-CN`) exam-language** packages. It is **not** Mathematics-only.

Architecture follows VS-005 / VS-008: subject-agnostic package + exam language. Pilot content is Mathematics. Physics and Chemistry reuse this term bank, preview, Language help, notebook, cloze, and term class when those packages exist. This slice does not seed those subjects.

1. A **reviewed term bank** (one identity per meaning).
2. A **topic preview** (cards before the lesson).
3. **Language help on a question only when the student asks** (word or phrase, not a translation).
4. **One notebook** that remembers where each term was met and offers due matching-pairs review.

It is one loop (`US-TERM-01`–`03`), not three products. A preview without a reusable term identity is just another lesson page. In-question help without a notebook loses the evidence. A notebook with no sources is an empty list.

`VS-008` already lets students read a LESSON. `VS-009` already scores checkpoints and records math hints. This slice does not reopen those loops. It adds terminology as first-class reviewed content and records word/phrase help beside math hints.

### Why not smaller or larger

Smaller leaves a hole: preview-only has no in-question help; help-only still hides the first lesson; notebook-only has nothing to collect.

Larger belongs later: full-question **Translate**, **Ask agent** (`VS-011`), sentence-structure hints, diagnostics (`VS-015`), plan tasks (`VS-017`), mock language analysis (`VS-013`), video (`VS-010B`), a general Chinese dictionary, or student-authored vocab.

Approved decisions `D-01`–`D-06` are in the human-gate table. Product behavior is written in the sections below, not in the grill transcript.

### How we use other products as a lens

Non-normative. Requirements stay authoritative.

| Familiar pattern  | What we take                                                              | What we do not take                                              |
| ----------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Textbook glossary | A short required list before the chapter; meet the same words in the text | A dump of every word in the lesson                               |
| Duolingo review   | Optional matching pairs; due items, not a growing wall of cards           | Locking the lesson behind a game; treating language as the skill |
| Contextual cloze  | Due review uses a real stem fragment when one exists                      | A second scored exam; showing answers or a full paper            |
| VS-009 hints      | Record help; strong help is not independent mastery                       | Treating a word lookup as strong help                            |

YukCSCA teaches CSCA subjects. Chinese exam language is the bridge. Students cannot invent definitions. The platform is not a dictionary of arbitrary Chinese.

### Agentic readiness (no agent in this slice)

Scoring, collection, familiarity, and assistance logs stay deterministic. A later agent may **explain** a reviewed term. It must not invent a definition, write the notebook, or change mastery.

Stable context for `VS-011` (not a public API yet):

```text
TermContext {
  accountId, subject, packageId, packageRevisionId,
  termId, termClass, examLanguage = zh-CN,
  source: PREVIEW | LESSON | ITEM | NOTEBOOK | LANGUAGE_MISTAKE,
  lessonResourceId?, sessionId?, itemId?, questionId?,
  assistanceSummary { languageAssistUsed = false in this slice, maxLanguageTier },
  familiarity, lastReviewResult?
}
```

## Capability and adjacent contract horizon

- Owning capability: reviewed Chinese exam-language term bank (first use Mathematics), topic preview, on-request word/phrase help, notebook, language-help recording. Subject-agnostic; later Chinese Physics and Chemistry packages consume the same operations.
- Closely related stories inspected but not accepted:
  - `US-LANG-03` exam-language change effects → `VS-014`
  - `US-COURSE-03` separate math vs language checkpoint scoring → stays authored zh-CN questions from `VS-009`
  - `US-AGENT-04` ask from a term → `VS-011`
  - `US-DIAG-01` / `US-DIAG-02` diagnostic language evidence → `VS-015`
  - `US-MOCK-05A` post-mock terminology practice → `VS-013`
  - `US-ADM-08` video → `VS-010B`
- Included now: Term entity, preview unit, reveal-on-request Language help, one notebook, publish-time pronunciation clips, `LANGUAGE_ASSIST` events that do not set `languageAssistUsed`.
- Deferred from TypeSpec (do not advertise): `SENTENCE` / Translate tiers; `RelatedResourceRef.TERMINOLOGY`; Physics/Chemistry on `AcademicSubject`; live formal-mock session APIs; student-authored vocab; jieba/dictionary.
- Deferred: live formal-mock lock UI, named spaced-repetition algorithm, agent write path, Translate.
- Additive evolution:
  - Existing `StudyResourceKind.TERMINOLOGY` becomes the **preview unit** (a list of required term ids), not the term identity.
  - Student academic APIs gain preview, notebook, lookup, and audio. `RelatedResourceRef` may later include `TERMINOLOGY`.
  - Assessment assistance log gains kind `LANGUAGE_ASSIST`. `languageAssistUsed` stays **false** until a later Translate control exists.
  - Notebook rows are new tables. They are not mistake rows.
- Why this boundary: see “Why not smaller or larger.”

## In scope

### Admin

- Author a package-scoped **term bank**. Each term has one identity and one **domain meaning**, plus Chinese surface form(s), pinyin, explanation-language definitions (`id` / `en` / `zh-CN`), English equivalent, **term class**, topic bindings, and optional symbols and example. Domain meaning is the canonical scientific or mathematical sense (not “math-only”).
- Bind a **small required set** to each topic. Exam-wording terms (`EXAM_INSTRUCTION`, `LOGICAL_EXPRESSION`) are authored once and reused across topics. `TOPIC_TERM` entries bind to the outline items they belong to (calculus, algebra, and so on live on those bindings — not on term class).
- Publish a `TERMINOLOGY` resource as the **preview unit**: ordered required term ids and an optional matching-pairs activity.
- Optionally attach specific word or phrase spans on a question. The admin does not mark every character. The platform also auto-matches exact surface forms (including aliases such as `因式分解` / `分解因式`).

### Preview (before the lesson)

- Opening a topic’s LESSON offers the preview first (or resumes an unfinished one).
- Cards show characters, **pinyin always**, optional Play, definition, English equivalent, and domain meaning.
- **Practice these terms** (matching pairs) is optional. **Continue to lesson** is never locked.
- Required terms enter the notebook when the preview is opened or completed. The student does not have to tap every card.
- Viewing and optional check results are recorded. Neither is mastery. The check is not an `AssessmentSet` and never writes `CHECKPOINT_PASSED`.

### Lesson

- A **topic term rail** stays on the LESSON so a forgotten preview term is one tap away.
- Required and instruction/logic forms on the lesson may be tappable. This is study, not a scored attempt.

### Language help on a scored item

Checkpoint, topic practice, and (later) mock use the same rule:

- First paint is a **clean Chinese stem**. No chips, no translation, no agent.
- One quiet **Language help** control. Opening it shows only admin-preset and auto-matched word/phrase chips.
- Tap a chip → the same **term card**. New term is added. Already saved → “Already in your notebook” plus the “Met in …” line. No second row.
- After a wrong answer, **“Was the wording hard?”** opens that same help and may set error cause `TERMINOLOGY_MISUNDERSTANDING`. It does not open Translate. The platform does not decide math vs language.
- Word/phrase taps write `LANGUAGE_ASSIST` (`WORD` or `PHRASE`). They do **not** set `languageAssistUsed` and do **not** block checkpoint or revalidation pass.
- Once Language help is open, selected text that matches a published term opens the card. Unknown text: “not in the reviewed term bank.” No invented definition. No student-authored word.

### Term class

Term class is the **exam-language role**, not the syllabus topic. Calculus vs algebra is already `outlineItemIds`. Mixing those into class would duplicate the outline and overwhelm the notebook.

Research used: requirement 4.5 (academic vocabulary / question instructions / logical expressions); math-item vocabulary work that splits technical topic words from the wording that appears in many items (Monroe & Panchyshyn technical vs subtechnical/process; content vs function words). Student need: after 80+ terms, tell “this is on every paper” from “this is this topic.”

| `termClass`          | Student group | What it is                            | Examples                                    | Typical bindings         |
| -------------------- | ------------- | ------------------------------------- | ------------------------------------------- | ------------------------ |
| `EXAM_INSTRUCTION`   | Exam wording  | What the item tells the student to do | 求, 证明, 化简, 计算, 判断                  | Many topics              |
| `LOGICAL_EXPRESSION` | Exam wording  | How the stem is structured            | 若…则…, 当且仅当, 充分, 必要                | Many topics              |
| `TOPIC_TERM`         | Topic terms   | Domain vocabulary for one area        | 单调递增, 公因式, 导数 (later 加速度, 摩尔) | One or few outline items |

The notebook stays **one list**. Each row may show a small class chip. Optional secondary filter: **Exam wording** | **Topic terms**. Due remains the only primary toggle. Do not add Algebra / Calculus / Geometry as classes.

### Notebook

- **One list.** Each row: characters, pinyin, class chip, one “Met in …” line (latest place and topic: preview, lesson, checkpoint, or practice).
- Primary: **Due** toggle and search. Optional: Exam wording / Topic terms. Not four equal homes.
- Due review is **recognition or contextual-use** (`US-TERM-03`):
  - **Matching pairs** when no usable snippet exists (preview check, or a term never seen in a stem).
  - **Contextual cloze** when the platform has a short authentic fragment (preferred for due review of terms met in a lesson or question).
- Next due follows that evidence, not only elapsed time. No named SM-2 algorithm.
- Cloze is not an `AssessmentSet` and never writes `CHECKPOINT_PASSED`.

### Contextual cloze review

Matching pairs can teach “单调递增 = monotonically increasing” in isolation while the student still fails the same words inside a long stem. When a term was met in published lesson or question text, due review prefers a **one-blank cloze** on a short fragment of that text:

```text
已知函数 f(x) 在区间 (0, +∞) 上 [ ______ ]，则 f'(x) > 0。
Options: 单调递增 | 单调递减 | 奇函数 | 偶函数
```

Rules:

- Build the snippet from **published** content around the matched surface form, or from the term’s authored example. Prefer the place recorded in “Met in …”.
- Show at most one sentence or clause. Replace the target term with a blank. Distractors are other published terms of the same class or the same topic.
- Never show answer keys, student responses, or a full item. Do not copy an attempt question dump into the notebook.
- If no safe snippet exists, fall back to matching pairs.
- Formal-mock sessions still cannot open review.

### Pronunciation

- At publish, pre-render a short clip per Chinese surface form through `SpeechSynthesisPort` using Azure `zh-CN-XiaoxiaoNeural`. Store the bytes like VS-005 images (PostgreSQL, not object storage).
- Students play audio through an authorized GET. Missing or failed audio hides Play and leaves pinyin visible.
- The student path never calls Azure.

### Cross-cutting

- Chrome appears when the opened **published** content has Chinese (`zh-CN`) exam-language terms. Subject is whatever the package is (Mathematics now; Physics or Chemistry later). English-exam packages and packages with no term bank show no terminology chrome.
- Explanation language, exam language, and interface language stay independent. This slice does not create exam-language enrollment (`VS-014`).
- Formal-mock policy is reserved: Language help and notebook writes stay off when a future formal session is active. No mock UI ships here.

## Out of scope

- Jieba, runtime segmentation, or a third-party dictionary as meaning.
- Student-created definitions, personal vocab lists, or bookmarks (P1).
- Live Azure or browser speech of selected text; reading a definition or whole question aloud.
- Sentence-structure hints; full-question **Translate**; **Ask agent** (`D-04`, later).
- Agent chat or LLM-authored definitions.
- Formal mock execution, post-mock language analysis, diagnostics, study-plan tasks.
- Seeding Physics, Chemistry, or other subject packages (they reuse this model when those slices publish Chinese content).
- An English-exam terminology notebook.
- Object storage, search cluster, cache, or a new backend module.
- Changing VS-009 pass rules, except recording `LANGUAGE_ASSIST` events that leave `languageAssistUsed` false.
- Promoting PX-001 fixture terminology cards as production data.

## How terms appear

### Lesson versus question

| Surface       | First paint                                            | After the student asks                                       |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| Topic preview | Cards                                                  | Optional matching pairs                                      |
| LESSON        | Topic rail; required/instruction forms may be tappable | Same card                                                    |
| Scored item   | Clean Chinese stem + quiet Language help               | Word/phrase chips, then the term card                        |
| After a miss  | Ordinary result / math path                            | “Was the wording hard?” opens the same chips — not Translate |

```text
Clean Chinese stem
  + answer controls
  + Language help          (quiet; not Translate)
        │
        ▼  student opens it, or answers “Was the wording hard?”
  Same stem, with word/phrase chips (admin-preset ∪ auto-match)
        │
        ▼  tap a chip
  Term card (pinyin + Play + definition)
        ├─ new      → add, say added
        └─ already  → “Already in your notebook” + Met in …
```

**Language help** never means “here is the whole question in Indonesian or English.” That later **Translate** action, if shipped, sits under the original Chinese stem and becomes strong language assistance (`languageAssistUsed`). **Ask agent** is `VS-011`.

## Preconditions and dependencies

- Existing state: published packages with `LESSON` / `TERMINOLOGY` / `REMEDIATION` (`VS-005`); student LESSON reader and content progress (`VS-008`); assessment sessions, math hints, `languageAssistUsed=false`, `RelatedResourceRef` without `TERMINOLOGY` (`VS-009`).
- Required content: one published package with a zh-CN topic, a non-empty term bank, one preview bound to that topic, and one LESSON whose body contains at least one required surface form. Tests use synthetic fixtures. Production content is admin-authored.
- Fallbacks: no terms → no terminology chrome. Missing explanation-language gloss is explicit, never a silent substitute. Missing audio → Play unavailable, pinyin visible. Speech down at publish → package may still publish. Non-`STUDENT` → 403. Tests never call Azure.

## Technology and dependency impact

- Existing stack is enough for the term bank, matching, notebook, and student reads. Short audio can follow the VS-005 image pattern.
- First new technology: **Azure Speech TTS** behind `SpeechSynthesisPort`, first use = one clip per published Chinese surface form at publish (`D-03`, `ADR-0001`). Voice is `zh-CN-XiaoxiaoNeural`. No jieba, dictionary API, object store, or browser-speech product voice.
- Alternatives rejected: pinyin only (`D-03`); browser Web Speech (cannot guarantee this voice); live per-tap Azure (privacy and cost); object storage (too heavy for 1–3 second clips).
- Impact: speech key is a secret; CI mocks the port; publish has a timeout and a per-publish clip budget; student audio GET is authorized like images; logs may record `termId` and clip status, never the key, SSML, or unmatched selected text.
- Migration: additive Flyway after V9 for terms, notebook, review events, and audio bytes. Hide Play and keep pinyin if the adapter is removed. Academic owns persistence. Assessment owns only `LANGUAGE_ASSIST` events.
- ADR: [`ADR-0001`](../decisions/ADR-0001-azure-speech-term-pronunciation.md).

## User flow

1. Admin authors terms, binds a required set to a topic, and publishes the preview with the package.
2. The student opening that LESSON is offered the preview (or resumes it).
3. They study the cards. They may run matching pairs. They may continue without it.
4. Required terms are in the notebook. The LESSON shows the topic rail.
5. On a checkpoint or practice item the stem is clean. If wording blocks them, they open Language help, tap a chip, and see the card. New terms are added; saved terms say they are already there.
6. After a wrong answer, “Was the wording hard?” can open the same help and record a language-related mistake cause. Word/phrase help does not block pass credit.
7. The student opens one notebook, sees class and where each term was met, and reviews due items with cloze when a snippet exists, otherwise matching pairs.
8. In a future formal mock (not built here), Language help and notebook writes stay hidden.

## Acceptance and implementation matrix

| AC ID | Given / When / Then                                                                                                                                                                                                                                                                                                                     | UI evidence                                                 | API/domain behavior                                              | Persistence/audit                  | Test evidence                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| AC-01 | Given a published topic with a required set, when the student opens the preview, then each required term shows characters, pinyin, explanation-language definition, English equivalent, and domain meaning under one term id. Pinyin stays visible if Play is present, missing, or failed.                                              | Preview cards; language-unavailable explicit; Play optional | One term identity; no silent language substitute                 | Preview exposure; not mastery      | Contract + academic IT + preview UI |
| AC-02 | Given preview completion, then viewing does not write `CHECKPOINT_PASSED` or any mastery signal, and each required term exists once in the notebook. Matching pairs are optional and do not lock Continue to lesson.                                                                                                                    | Continue to lesson; no mastered claim                       | Notebook upsert `(account, termId)`                              | Source `REQUIRED_COURSE`           | Domain + UI                         |
| AC-03 | Given the LESSON, then the topic rail is available and required/instruction forms may be tappable. Given a scored item, the stem stays clean until Language help is opened; then chips open the same term card.                                                                                                                         | Lesson rail; quiet Language help                            | Spans computed at publish; item presentation is on request       | Lookup may add `CLICKED`           | Reader + player                     |
| AC-04 | Given a matching selection after Language help is open, then the student sees that surface form, pinyin, and meaning, and the original item stays in Chinese.                                                                                                                                                                           | Card over unchanged stem                                    | No full-question translation                                     | `LANGUAGE_ASSIST` and/or collect   | Player                              |
| AC-05 | Given a word or phrase lookup on an item, then it is recorded separately from math hints and does not set `languageAssistUsed` or block checkpoint or revalidation pass.                                                                                                                                                                | Term card, not Translate                                    | `AssistanceEvent.kind=LANGUAGE_ASSIST`, tier `WORD` / `PHRASE`   | Event log; strong flag stays false | Assessment domain                   |
| AC-06 | Given a required term, a tapped matching term, or a language-related mistake, then one notebook row exists. A later tap on a saved term says it is already in the notebook and shows “Met in …”.                                                                                                                                        | One list; honest already-saved                              | Idempotent upsert                                                | Notebook + event                   | Domain + UI                         |
| AC-07 | Given a due review, when a published snippet exists for that term, then the student gets a one-blank cloze on that fragment with same-class or same-topic distractors. When no snippet exists, matching pairs are used. Familiarity and next due follow the result, not only elapsed time. Neither activity writes `CHECKPOINT_PASSED`. | Cloze or pairs; no answer key                               | Review kind `CONTEXT_CLOZE` or `MATCH_PAIRS`                     | Review event                       | Domain + UI                         |
| AC-08 | Given a formal-mock flag (future), then Language help and notebook writes are unavailable.                                                                                                                                                                                                                                              | No control in that mode                                     | Reserved deny                                                    | No collect                         | Policy unit now; UI in `VS-012`     |
| AC-09 | Given a missing explanation-language gloss, then the limitation is explicit and domain meaning does not change.                                                                                                                                                                                                                         | Visible fallback                                            | No implicit language swap                                        | Unchanged term identity            | API + UI                            |
| AC-10 | Given an English-only item or a package with no published terms, then no terminology chrome is shown.                                                                                                                                                                                                                                   | Clean LESSON / practice                                     | Content-gated                                                    | None                               | UI + API                            |
| AC-11 | Given a stored clip, when the student activates Play, then authorized audio plays. Given a missing clip, Play is unavailable and pinyin stays visible.                                                                                                                                                                                  | Play; missing-audio state                                   | Speech only at publish; student GET never calls Azure            | Bounded audio bytes                | Port mock + GET + UI                |
| AC-12 | Given a scored item, Language help is not the first chrome. Opened chips are only admin-preset and auto-matched spans. After a wrong answer, “Was the wording hard?” opens that same mode and does not show a full translation.                                                                                                         | Quiet control; post-miss prompt                             | No `languageAssistUsed`; optional `TERMINOLOGY_MISUNDERSTANDING` | Event + mistake cause              | Player                              |

## Documentation sufficiency review

Complete this before contract work. `GAP` or `CONFLICT` that changes material behavior needs a decision ID.

| Review area                                                   | Evidence inspected                             | Status  | Gap or decision ID                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| End-to-end actor flow and adjacent handoffs                   | `US-TERM-01`–`03`; VS-008; VS-009              | `CLEAR` | Preview → lesson → on-request item help → notebook. Mock reserved.                                    |
| Experience flow, screen states, recovery, and navigation      | Learn and Practice routes; `D-06`              | `CLEAR` | Clean stem; Language help on request; matching pairs not a gate.                                      |
| Requirement/story coverage and exclusions                     | EN/CN 4.5, 4.7, 5.3; stories 0.3.5             | `CLEAR` | Word/phrase now; 4.5 Translate / sentence help remain later.                                          |
| Domain terms, states, invariants, and ownership               | Glossary; VS-005 `TERMINOLOGY` page            | `CLEAR` | Term identity ≠ preview resource.                                                                     |
| Authorization, privacy, minors, consent, and retention        | Pilot academic access; assessment notes        | `CLEAR` | Reviewed cards; do not log unmatched selected text.                                                   |
| Failure, retry, idempotency, stale state, and recovery        | VS-008 progress; VS-009 attempts               | `CLEAR` | Idempotent notebook; historical attempts keep their copy.                                             |
| Contract, migration, external side effects, and compatibility | Student academic APIs omit `TERMINOLOGY` today | `CLEAR` | Gate approved. Initial TypeSpec is `VS-010A-R8-initial`. `CR-01` applied as `VS-010A-R10-cr-applied`. |
| Technology/dependency need, alternatives, and ADR threshold   | PLAN dependency table; `ADR-0001`              | `CLEAR` | Azure Speech at publish only. Tests mock the port.                                                    |
| Frontend ownership, prototype promotion, and design impact    | `features/learn`, `features/assessment`        | `CLEAR` | Rev 9: routes, shared term card, PX-001 isolation. Rev 10: `CR-01` accepted.                          |
| Acceptance evidence and observability                         | VS-009 event style                             | `CLEAR` | Value-free events: term id, class, source, tier.                                                      |

## Human decision gate

Follow [`HUMAN_REVIEW.md`](HUMAN_REVIEW.md). `APPROVED` applies only to the recorded decisions.

| Field             | Value                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Gate status       | `APPROVED`                                                                                                                       |
| Decision owner    | Product owner                                                                                                                    |
| Approval scope    | `D-01`–`D-08` as recorded. Accepted TypeSpec is `VS-010A-R10-accepted`. Backend and frontend may implement from this checkpoint. |
| Approval evidence | Product-owner chat 2026-08-14, including “do not show language help up front” on scored items.                                   |

| ID     | Question                                                        | Resolution                                                                                                                                                                                              | Owner         | Status     | Artifacts                                                                                           |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `D-01` | What is the closed loop?                                        | Term bank + preview + in-context lookup + notebook (`US-TERM-01`–`03`).                                                                                                                                 | Product owner | `APPROVED` | Slice created; PLAN `SHAPING`.                                                                      |
| `D-02` | How do terms attach without marking every word?                 | Auto-match required and instruction/logic surface forms; admin may preset spans; topic rail; no student-authored words.                                                                                 | Product owner | `APPROVED` | “How terms appear.”                                                                                 |
| `D-03` | Pronunciation? Azure `zh-CN-XiaoxiaoNeural`?                    | Pre-render clips at publish. Pinyin always visible. No live student-path TTS.                                                                                                                           | Product owner | `APPROVED` | `ADR-0001`; PLAN TTS first use.                                                                     |
| `D-04` | All four language-assist tiers now?                             | **Word and phrase only.** Sentence help, Translate, and Ask agent are later and must not replace the Chinese stem. Word/phrase does not set `languageAssistUsed`.                                       | Product owner | `APPROVED` | In scope / out of scope. Requirement 4.5 later tiers stay true.                                     |
| `D-05` | Is the recognition check an assessment set?                     | No. Lightweight terminology activity. Never writes `CHECKPOINT_PASSED`.                                                                                                                                 | Slice owner   | `APPROVED` | Determined by `US-TERM-02` and VS-009 pass meaning.                                                 |
| `D-06` | Is the check a lesson lock? Is item help shown up front?        | Matching pairs are optional. Scored items start clean. Language help reveals chips. “Was the wording hard?” opens that same mode, not Translate.                                                        | Product owner | `APPROVED` | Earlier hard-gate preference withdrawn.                                                             |
| `D-07` | How should due review and term class scale past isolated pairs? | Cloze on a published snippet when “Met in …” can supply one; else pairs. Term class is exam-language role (`EXAM_INSTRUCTION` / `LOGICAL_EXPRESSION` / `TOPIC_TERM`), not calculus-vs-algebra.          | Product owner | `APPROVED` | 2026-08-15. Slice only; PLAN not bumped.                                                            |
| `D-08` | Is terminology Mathematics-only?                                | No. First published use is Chinese Mathematics. The model and APIs are Chinese exam-language (`zh-CN`) on any subject package. Physics and Chemistry reuse them later. Do not seed those subjects here. | Product owner | `APPROVED` | 2026-08-15. Requirement 4.5 stays the P0 Math story; design is not subject-locked. PLAN not bumped. |

## State model

### Owned states

```text
Term (package revision, reviewed academic content)
  DRAFT → PUBLISHED (active revision) → superseded by a later revision

PreviewProgress (account, terminologyResourceId)
  NOT_STARTED → IN_PROGRESS → PREVIEW_COMPLETE
  // not mastery; may reuse content-progress with kind TERMINOLOGY

NotebookEntry (account, termId)     // one row, many sources
  sources: REQUIRED_COURSE | CLICKED | LANGUAGE_MISTAKE
  familiarity: NEW → LEARNING → FAMILIAR
                 ^                |
                 +---- missed ----+
  due: not_due | due
  // missed review or language-mistake source → LEARNING + due

AssistanceEvent.kind
  MATH_HINT         // VS-009
  LANGUAGE_ASSIST   // this slice (WORD | PHRASE); does not set languageAssistUsed
```

### Invariants

- One `termId` per domain meaning inside a package. Explanation-language glosses do not fork identity. The same operations serve any subject; they are not Mathematics-only routes.
- Viewing a preview or a card never writes mastery or `CHECKPOINT_PASSED`.
- Notebook upsert is idempotent on `(accountId, termId)`.
- Word/phrase help is recorded and is **not** strong assistance in this slice.
- Unmatched selection creates neither a term nor a notebook row.
- Interface, explanation, and exam languages stay independent. No exam-language enrollment here.
- Formal-mock sessions must not disclose Language help or accept notebook writes.

### Concurrency, retry, and stale-state rules

- Idempotency: preview progress; notebook upsert; language-help disclose per `(sessionId, itemId, tier)`.
- Term cards always come from the **active published revision**. Historical attempts keep their question copy and do not re-match a newer bank.
- Repeat tap on the same term does not create a second notebook row. It may refresh last-seen time.

## TypeSpec contract plan

Public HTTP is initialized as checkpoint `VS-010A-R8-initial`. `CR-01` is applied as `VS-010A-R10-cr-applied`. Accepted checkpoint is `VS-010A-R10-accepted` (identical hashes). Status is `CONTRACT_READY`.

### Operations

Initialized student surface:

| Operation               | Method and route                                                            | Auth      | Success                                                                                                               | Required failures                                                               |
| ----------------------- | --------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Get topic preview       | `GET /api/v1/academic/packages/{subject}/terminology/{resourceId}`          | `STUDENT` | Preview + required cards + optional match targets                                                                     | 401 / 403 / 404 / 400                                                           |
| Upsert preview progress | `PUT .../terminology/{resourceId}/progress`                                 | `STUDENT` | Progress; `IN_PROGRESS` / `PREVIEW_COMPLETE` collect required terms                                                   | 401 / 403 / 404; `FORMAL_ASSISTANCE_DISABLED`; `TERMINOLOGY_VALIDATION_FAILED`  |
| Submit preview check    | `POST .../terminology/{resourceId}/checks`                                  | `STUDENT` | Pair scores; not mastery                                                                                              | 401 / 403 / 404; `FORMAL_ASSISTANCE_DISABLED`; validation                       |
| Resolve lookup          | `POST /api/v1/academic/term-lookups`                                        | `STUDENT` | `MATCHED` card + notebook row, or `NOT_IN_BANK`                                                                       | 401 / 403 / 404; `FORMAL_ASSISTANCE_DISABLED`; validation                       |
| List notebook           | `GET /api/v1/academic/terminology-notebook`                                 | `STUDENT` | Entries (`dueOnly`, `q`, `classGroup`, optional `subject`)                                                            | 401 / 403 / 400                                                                 |
| Get notebook entry      | `GET /api/v1/academic/terminology-notebook/{termId}`                        | `STUDENT` | Entry + card                                                                                                          | 401 / 403 / 404 / 400                                                           |
| Submit review           | `POST /api/v1/academic/terminology-notebook/{termId}/reviews`               | `STUDENT` | Familiarity + due from the result                                                                                     | 401 / 403 / 404; `FORMAL_ASSISTANCE_DISABLED`; validation                       |
| Get pronunciation       | `GET /api/v1/academic/terms/{termId}/audio`                                 | `STUDENT` | `audio/mpeg` bytes                                                                                                    | 401 / 403 / 404                                                                 |
| Disclose language help  | `POST /api/v1/assessment/sessions/{sessionId}/items/{itemId}/language-help` | `STUDENT` | Spans on the item; `languageAssistUsed` stays false. First-paint chrome uses `languageHelpAvailable`, not this probe. | 409 `LANGUAGE_ASSIST_DISABLED`; 403 `FORMAL_ASSISTANCE_DISABLED`; same as hints |

Admin: no new routes. `AcademicPackageDraft.terms[]`; `StudyResource.requiredTermIds` when kind is `TERMINOLOGY`; `Question.authoredTermAttachments`. Publish validation (implementation) requires Chinese surface, pinyin, and domain meaning; `TOPIC_TERM` should have at least one outline id.

Additive on existing student reads: `LessonSummary.terminologyPreview`, `PublishedLessonDetail.terminology` (rail + spans). Both omitted when the package has no Chinese exam-language terms.

### Models and validation

| Model                | Important fields                                                                                                                                     | Validation                                                                                                                                                                     | Ownership                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| `TermDraft`          | `id`, `termClass`, `surfaceForms[]` (text + pinyin), `definitions`, `englishEquivalent`, `domainMeaning`, optional symbols/example, `outlineItemIds` | Class required. ≥1 surface form; pinyin and domain meaning required; missing explanation-language gloss allowed and flagged. Topic class should have ≥1 outline id at publish. | Academic package revision |
| `TerminologyPreview` | Existing `TERMINOLOGY` resource + `requiredTermIds[]` + student cards + `lessonResourceIds` + optional match targets                                 | Required ids must exist in the same draft                                                                                                                                      | Academic                  |
| `TermCard`           | `termId`, `subject`, `termClass`, surfaces, `definition` union (`AVAILABLE` \| `LANGUAGE_UNAVAILABLE`), `englishEquivalent`, `domainMeaning`         | No silent language substitute                                                                                                                                                  | Academic                  |
| `NotebookEntry`      | `termId`, `subject`, `sources[]`, `familiarity`, `due`, `metIn`, `pendingReview` when due                                                            | One per account + term                                                                                                                                                         | Academic                  |
| `TermLookupResult`   | `MATCHED` or `NOT_IN_BANK` (HTTP 200)                                                                                                                | Exactly one of `termId` or `selectedText`; ITEM requires session + item                                                                                                        | Academic                  |
| `AssistanceSummary`  | Existing fields unchanged. Additive optional `maxLanguageTier`, `languageHelpDisclosed`. `languageAssistUsed` stays false for word/phrase            | Additive optional; VS-009 clients keep compiling                                                                                                                               | Assessment                |
| `SessionItemView`    | Existing VS-009 fields. Required `languageHelpAvailable`. Optional `languageHelp` after disclose                                                     | First-paint chrome uses the flag only (`CR-01`). True when disclose is allowed; false for English-only items, packages with no published terms, and reserved formal-mock.      | Assessment                |
| `LanguageHelpView`   | `trigger`, `spans[]` (term id, surface, UTF-16 offsets, `alreadyInNotebook`)                                                                         | Present only after disclose                                                                                                                                                    | Assessment                |

### Contract decisions

- Cookies: existing bearer + refresh cookie. No new cookies.
- Errors: `NOT_IN_BANK` is a 200 outcome, not a problem. `LANGUAGE_ASSIST_DISABLED` is 409 on disclose when the item has no Chinese term bank. `FORMAL_ASSISTANCE_DISABLED` is 403 on lookup, preview writes, review, and disclose. `TERMINOLOGY_VALIDATION_FAILED` is 400 with path/code violations. Missing explanation-language gloss is a per-card `LANGUAGE_UNAVAILABLE` body, not an HTTP error.
- Notebook filter: required `explanationLanguage`; `dueOnly`, `q`, optional `classGroup` (`EXAM_WORDING` \| `TOPIC_TERM`), optional `subject` (so later Chinese Physics/Chemistry do not reopen this resource), cursor/limit.
- Compatibility: additive optional fields on VS-008/VS-009 models, except required `SessionItemView.languageHelpAvailable` (`CR-01`) — same metadata-before-action pattern as `hintLadder`. Existing VS-009 constructors set `false`. No new Maven module and no `terminology.tsp`. The live VS-009 backend emits this field in VS-010A implementation, not in this contract step.
- Collection: GET preview is side-effect free. `PUT` progress to `IN_PROGRESS` or `PREVIEW_COMPLETE` upserts required terms (`REQUIRED_COURSE`).
- Review: one due item uses `CONTEXT_CLOZE` or `MATCH_PAIRS` with `selectedOptionKey`. Preview matching pairs is a separate `POST .../checks` over the required set.
- Audio: publish-time `audio/mpeg` only. Student GET never calls Azure. Optional `surfaceForm` selects a non-primary clip.
- Not advertised: `RelatedResourceRef` still omits `TERMINOLOGY`; no `SENTENCE` / Translate tier; `AcademicSubject` remains `MATHEMATICS` until a later slice seeds another package.

## Contract collaboration

The backend agent owns this slice and TypeSpec. Contract ownership is not product authority. A checkpoint records slice revision, TypeSpec files, generation result, and a handoff reference.

### Readiness reviews

| Review                                                     | Owner               | Status     | Evidence                                                                                            |
| ---------------------------------------------------------- | ------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| Slice drafted and human gate resolved                      | Backend/slice owner | `DONE`     | `D-01`–`D-08` approved                                                                              |
| Initial TypeSpec compiles and generated output is reviewed | Backend/slice owner | `DONE`     | `VS-010A-R8-initial`; `pnpm generate` + `pnpm typecheck:web`                                        |
| Frontend consumer review                                   | Frontend owner      | `COMPLETE` | Revision 9 review of `VS-010A-R8-initial`; filed `CR-01`                                            |
| Contract requests resolved                                 | Backend/slice owner | `COMPLETE` | `CR-01` **ACCEPTED** and applied as `VS-010A-R10-cr-applied`                                        |
| Frontend consumer re-review                                | Frontend owner      | `COMPLETE` | Revision 11 re-review of `VS-010A-R10-cr-applied`; `CR-01` satisfied; zero further `CR-NN`          |
| Accepted contract checkpoint recorded                      | Backend + frontend  | `COMPLETE` | `VS-010A-R10-accepted` — identical hashes to `VS-010A-R10-cr-applied`; backend confirmed 2026-08-15 |

### Contract change requests

| ID      | Consumer scenario or constraint                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Proposed change                                                                                                                                                                                                                                                                                                                                                                                              | Backend decision and reason                                                                                                                                                                                                                                                                       | Human decision ID | Status     | Applied/review evidence                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CR-01` | Scored-item first paint must be a **clean Chinese stem** plus a **quiet Language help** control only when the item/package actually has a Chinese term bank (`D-06`, AC-10, AC-12). Inferring from `examLanguage === zh-CN` would show chrome on a Chinese package with no published terms. Probing `discloseLanguageHelp` to learn availability would flash a control, then hide it on `409 LANGUAGE_ASSIST_DISABLED`. `AssistanceSummary.languageHelpDisclosed` is session-level _after_ a disclose, so it cannot decide first paint. | Add required `languageHelpAvailable: boolean` on `SessionItemView`. True when disclose is allowed (zh-CN item, published term bank on the package, not formal-disabled). False for English-only items, packages with no published terms, and reserved formal-mock. First paint uses this flag only; chips stay in `languageHelp` after disclose. Same metadata-before-action pattern as VS-009 `hintLadder`. | **ACCEPT.** Implements already-approved `D-06` / AC-10 / AC-12. Optional flag would recreate probe-or-infer. Session-level `languageHelpDisclosed` cannot decide per-item first paint. Required boolean matches `hintLadder`. No product-meaning, privacy, or scored-state change; no new `D-NN`. | —                 | `RESOLVED` | Applied on `SessionItemView`; regenerated OpenAPI/web; `VS-010A-R10-cr-applied`. FE re-review rev 11 confirmed required `languageHelpAvailable` on TypeSpec, OpenAPI, and generated web types. |

### Frontend consumer review (`VS-010A-R8-initial`)

Reviewed **2026-08-15** as frontend-worker against:

- slice revision 8 contract + this revision 9 review record;
- student loop preview → lesson rail → on-request Language help → one notebook; admin term-bank authoring on the existing package draft;
- AC-01–AC-12; decisions `D-01`–`D-08`;
- requirements EN/CN 4.4, 4.5, 4.7 (P0 notebook clause), 5.3 (word/phrase only);
- stories `US-TERM-01`–`03`, partial `US-HINT-01`, partial `US-ADM-02`;
- TypeSpec hashes matching `VS-010A-R8-initial` (`git hash-object` re-verified this review);
- generated `contracts/generated/openapi.yaml` and `apps/web/src/shared/api/generated/openapi.ts`;
- production Learn / Practice / admin editor, route manifest, `RootDecisionPage`, `StudentExperienceGuard`, PX-001 fixture terminology list.

**Verdict:** The student academic surface is a strong closed loop (one `TermCard`, side-effect-free preview GET, progress/collection on PUT, lookup `MATCHED` / `NOT_IN_BANK`, notebook filters, cloze-or-pairs review, authorized audio). Admin can author the bank without new routes. **Not consumer-ready** until `CR-01` is resolved: the player cannot honor AC-10 / `D-06` first paint without probing disclose or inferring from exam language.

**Backend disposition (revision 10):** `CR-01` **ACCEPTED** and applied as `VS-010A-R10-cr-applied`. Status stays `SHAPING`. No feature implementation.

### Frontend consumer re-review (`VS-010A-R10-cr-applied`)

Reviewed **2026-08-15** as frontend-worker against the R10 wire (hashes re-verified with `git hash-object`).

**Verdict:** **Consumer-ready.** `CR-01` is satisfied. Zero further contract requests. Frontend accepts this wire as `VS-010A-R10-accepted` (identical hashes to `VS-010A-R10-cr-applied`). No TypeSpec edits and no production UI in this step.

**Backend confirmation (revision 12):** Hashes re-verified; zero open `CR-NN` / `D-NN`. Status **`CONTRACT_READY`**. Backend and frontend may implement from `VS-010A-R10-accepted`.

| Request | Consumer need                                                                 | Applied wire                                                                                                                                                                                                      | Re-review     |
| ------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `CR-01` | First-paint Language help without probing disclose or inferring exam language | Required `SessionItemView.languageHelpAvailable: boolean` on TypeSpec, OpenAPI (`required` array), and generated `openapi.ts`. Disclose docs say clients must not probe. Chips remain in optional `languageHelp`. | **Satisfied** |

Re-checked the revision 9 sufficiency matrix. Rows that were “Resolved in R10 — FE must re-verify” are now **Satisfied**. All other rows remain **Sufficient**. Non-requests from revision 9 still hold. Assessment feature types re-export the generated `SessionItemView`; no handwritten competing DTO is required.

Jia can still get a clean Chinese stem: the quiet control appears only when `languageHelpAvailable` is true. Sari’s admin draft shape is unchanged.

The preflight, sufficiency matrix, journey matrix, and non-requests below remain the revision 9 implementation binding, with the `CR-01` rows updated to **Satisfied**.

#### Preflight facts (implementation binding)

| Fact                                     | Value                                                                                                                                                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice revision / checkpoint under review | Plan rev 11 re-review of **`VS-010A-R10-cr-applied`**; accepted checkpoint **`VS-010A-R10-accepted`** (identical hashes)                                                                                                                             |
| Actor                                    | Activated production `STUDENT` on a published zh-CN package. Unique pilot `ADMIN` authors `draft.terms[]`.                                                                                                                                           |
| Canonical entry                          | Learn browse / continue → preview `/app/learn/:subject/terminology/:resourceId` when unfinished → lesson. Notebook `/app/learn/terms`. Language help on `/app/practice/sessions/:sessionId`. Admin: existing package editor.                         |
| Restored-session `/`                     | Unchanged: production `STUDENT` → `/app/learn`. Prototype Today / parent preview / credential-session must not override a production account.                                                                                                        |
| Direct URL / reload                      | Preview, notebook, notebook entry, lesson, session, result reload from server ids. Lesson URL with `previewResourceId` GETs preview before showing the body (or redirects). Session GET must return disclosed `languageHelp` after a prior disclose. |
| Prototype adjacent                       | PX-001 `prototype/student/learning/LessonPage` fixture cards stay isolated. Production must not import them. Learn/Practice already production-gated.                                                                                                |
| Data authority                           | Preview/notebook/lookup/audio = academic student API. Disclose / `languageAssistUsed` / mistake cause = assessment API. Explanation language = profile + session toggle. Exam language = package/session. Interface = i18n.                          |
| Regression neighbors                     | VS-008 lesson reader + explanation toggle + resume + checkpoint CTA. VS-009 hints, pass rules, mistakes, revalidation. Admin draft full-replace PUT. App-shell Learn/Practice active states.                                                         |

#### Contract sufficiency matrix

| Consumer need                                                                                       | Contract support                                                                                       | Verdict                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Topic preview before LESSON; resume unfinished                                                      | `LessonSummary.terminologyPreview` + `GET .../terminology/{id}` + progress                             | **Sufficient** (direct lesson URL uses extra preview GET — accepted)     |
| Cards: characters, pinyin, explanation definition, English equivalent, domain meaning; one `termId` | `TermCard` + `TermDefinition` union                                                                    | **Sufficient** (AC-01, AC-09)                                            |
| GET preview does not collect; open/complete does                                                    | Side-effect-free GET; `PUT .../progress` `IN_PROGRESS` / `PREVIEW_COMPLETE` upserts `REQUIRED_COURSE`  | **Sufficient** (AC-02)                                                   |
| Matching pairs optional; never locks Continue; not mastery                                          | `matchingPairsAvailable` + `POST .../checks`; `lessonResourceIds`; no `CHECKPOINT_PASSED`              | **Sufficient** (pair-level UI from `matchTargets`; server counts)        |
| Soft notice when required set changed after complete                                                | `PreviewProgress.requiredSetUpdatedSinceCompleted`                                                     | **Sufficient**                                                           |
| Lesson rail + tappable required/instruction forms                                                   | `LessonTerminology.rail` + `spans` (UTF-16, TEXT blocks)                                               | **Sufficient** (AC-03)                                                   |
| Scored item first paint clean; quiet Language help only when terms exist                            | Required `SessionItemView.languageHelpAvailable`; `languageHelp` only after disclose                   | **Satisfied** (AC-10, AC-12, `D-06`)                                     |
| Chips = admin-preset ∪ auto-match; tap → same card; stem stays Chinese                              | `LanguageHelpView.spans`; lookup by `termId` / `selectedText`                                          | **Sufficient** (AC-03, AC-04)                                            |
| Already saved + “Met in …”                                                                          | `alreadyInNotebook` + `NotebookEntry.metIn` on lookup and spans                                        | **Sufficient** (AC-06)                                                   |
| Not in bank; no invented definition; no notebook write                                              | `NOT_IN_BANK` HTTP 200                                                                                 | **Sufficient**                                                           |
| Word/phrase recorded; `languageAssistUsed` stays false; pass not blocked                            | `LANGUAGE_ASSIST` + `AssistanceSummary.languageAssistUsed`; disclose does not set the strong flag      | **Sufficient** (AC-05)                                                   |
| “Was the wording hard?” opens the same help, not Translate                                          | `LanguageHelpTrigger.WORDING_HARD`; `ErrorCause.TERMINOLOGY_MISUNDERSTANDING` already on mistake PATCH | **Sufficient** (FE may PATCH cause after submit — see non-requests)      |
| One notebook; Due + search; Exam wording / Topic terms                                              | `dueOnly`, `q`, `classGroup`; `pendingReview` on due rows                                              | **Sufficient** (AC-06, AC-07)                                            |
| Cloze when snippet exists; else pairs; result updates familiarity/due                               | `TermReviewPrompt` union; `POST .../reviews` → `TermReviewResult`                                      | **Sufficient** (AC-07)                                                   |
| Play when clip exists; pinyin always visible                                                        | `audioAvailable` + `GET /terms/{termId}/audio`; 404                                                    | **Sufficient** (AC-11)                                                   |
| Empty / English package: no terminology chrome                                                      | Omit `terminology` / `terminologyPreview`; `languageHelpAvailable=false`; disclose 409                 | **Satisfied**                                                            |
| Formal-mock reserved deny                                                                           | `403 FORMAL_ASSISTANCE_DISABLED` on writes/disclose                                                    | **Sufficient** for policy unit (AC-08 UI in `VS-012`)                    |
| Admin term bank, required set, optional question attachments                                        | `draft.terms[]`; `StudyResource.requiredTermIds`; `Question.authoredTermAttachments`                   | **Sufficient** (no new admin routes; publish rules implementation-owned) |
| Independent interface / explanation / exam languages                                                | Explanation on academic queries; exam on package/session; no cross-write                               | **Sufficient**                                                           |
| AuthZ / no-store / audio cache                                                                      | Bearer; 401/403/404/400; preview/notebook `no-store`; audio `private, immutable`                       | **Sufficient** (audio republish cache noted as implementation risk)      |

#### Journey / state matrix (implementation binding)

| Concern    | Required cases                                                                                                           | Contract + routing notes                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry      | Browse/continue; direct preview/lesson/notebook/session URLs; restored `/`                                               | Intercept unfinished preview from `LessonSummary` or lesson+preview GET. `/` stays `/app/learn`.                                                                                             |
| Identity   | Signed out; `STUDENT`; wrong role; expired session                                                                       | 401/403; never fill cards from PX-001 fixtures on failure.                                                                                                                                   |
| Navigation | Learn active on preview/notebook; Practice active on player; back preview→browse or lesson; sign-out                     | New routes production. Practice overlay opens `/app/learn/terms`, not a second notebook.                                                                                                     |
| Reload     | Preview mid-study; after progress PUT; after check; lesson after rail tap; session after disclose; notebook after review | GET by id. Disclosed chips must survive session GET. Review prompt comes from `pendingReview` / entry GET.                                                                                   |
| Prototype  | Preview persona absent/present; production never imports fixture terms                                                   | PX-001 lesson list remains prototype-only.                                                                                                                                                   |
| Data       | All states in the frontend plan table                                                                                    | Map `TERMINOLOGY_VALIDATION_FAILED` to fields; `NOT_IN_BANK` is success; `LANGUAGE_ASSIST_DISABLED` / formal 403 are honest failures; DEV fallback only offline/`401`/`404`; never mock 5xx. |
| Layout     | 390 / 1280; long `id`/`zh-CN`; keyboard; reduced motion; 44px; `lang="zh"`                                               | Experience plan. No `DESIGN.md` token change expected.                                                                                                                                       |

#### Explicit non-requests (accepted assumptions until contradicted)

- **Lesson preview progress:** `LessonTerminology` omits `PreviewProgress`. FE will `GET` preview when `previewResourceId` is present rather than require a duplicate field. Reopen only if that extra GET cannot express resume or the required-set notice.
- **Preview pair grading UI:** `matchTargets` includes `matchKey`. FE may shuffle display and show per-pair correctness locally; `correctCount` / `totalCount` remain the recorded result. Not a scored `AssessmentSet`.
- **Next due after review:** `TermReviewResult.entry` is the reviewed row. FE re-lists `dueOnly` for the next prompt. No `nextDueTermId` field required.
- **WORDING_HARD vs idempotent disclose:** If Language help was already opened with `STUDENT_REQUEST`, FE records the student’s “wording was hard” answer locally and `PATCH`es the mistake `errorCause` after the mistake exists (session submit). Do not depend on disclose to upgrade the trigger.
- **Language help on mistake detail:** Out of this player. Mistake detail keeps VS-009 attempt copy + cause; collection already happened on the session. A notebook link is enough.
- **Formal-mock chrome:** No mock session type ships here. FE does not invent a lock UI. `403` mapping is enough for AC-08 now.
- **`TERMINOLOGY.versions`:** Existing VS-005 publish still requires resource versions. Student preview ignores that body. Admin keeps a minimal version until backend implementation relaxes it. Not a new student field.
- **TermCard `outlineItemIds`:** Bare UUIDs. Notebook “Met in …” uses `metIn.topicTitle`. FE will not render outline UUIDs as labels.
- **Audio cache:** `Cache-Control: private, immutable` on `/terms/{termId}/audio` can stale after republish. FE fetches with the session bearer (blob URL, same as images). Backend should consider a weak validator or surface-specific cache key at implementation; not a student field request.
- **Translate / Ask agent / `RelatedResourceRef.TERMINOLOGY` / Physics-Chemistry `AcademicSubject`:** Correctly unadvertised. Production UI must not show those controls.

#### Generated TypeScript consumption check

- Ops present: `AcademicStudentApi_getTerminologyPreview`, `upsertPreviewProgress`, `submitPreviewCheck`, `resolveTermLookup`, `listTerminologyNotebook`, `getTerminologyNotebookEntry`, `submitTermReview`, `getTermPronunciation`; `AssessmentStudentApi_discloseLanguageHelp`.
- Additive optional fields present: `LessonSummary.terminologyPreview`, `PublishedLessonDetail.terminology`, `AssistanceSummary.maxLanguageTier` / `languageHelpDisclosed`, `SessionItemView.languageHelp`, admin `TermDraft` / `requiredTermIds` / `authoredTermAttachments`.
- Shared models usable without handwritten wire DTOs: `TermCard`, `TermDefinition` union, `NotebookEntry`, `TermLookupResult` union, `LanguageHelpView`, `PreviewProgress`.
- `SessionItemView.languageHelpAvailable` is required on generated declarations. No competing DTO.

## Backend plan

- Modules: **`academic`** — term bank, preview, notebook, familiarity, lookup, audio bytes. **`assessment`** — `LANGUAGE_ASSIST` events only. No new Maven module.
- Use cases: publish validation; publish-time speech per new or changed surface form; preview progress; lookup; notebook upsert; review; disclose word/phrase help.
- Domain rules: reviewed meaning only; idempotent notebook; preview ≠ mastery; word/phrase is not strong assistance; audio optional; pinyin required.
- Ports: `SpeechSynthesisPort` (Azure adapter, mocked in tests). Extend `LearningEvidencePort` with term exposure, familiarity, and language-help summaries. No dictionary adapter.
- Flyway: versions after V9. Prefer structured term records keyed by term id, not free text blocks as identity. Notebook, review events, pronunciation bytes. Assistance kind is additive on the existing event table.
- No scheduled jobs. Due is computed from last review evidence.

## Frontend plan

Completed at revision 9 against `VS-010A-R8-initial`. Re-review at revision 11 accepts `VS-010A-R10-accepted`. Implementation may proceed from this checkpoint.

### Routes and navigation

| Route id (planned)  | Path                                           | Access             | Role                                                                                          |
| ------------------- | ---------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `learn-terminology` | `/app/learn/:subject/terminology/:resourceId`  | `student-settings` | Topic preview. Production. Not `prototypeOnly`.                                               |
| `learn-terms`       | `/app/learn/terms`                             | `student-settings` | One notebook. Learn is the language-bridge home.                                              |
| `learn-term-detail` | `/app/learn/terms/:termId`                     | `student-settings` | Reload-safe card + due review.                                                                |
| Existing            | `/app/learn/:subject`, lesson, checkpoint      | already production | Browse intercepts unfinished preview; lesson rail; checkpoint CTA unchanged.                  |
| Existing            | `/app/practice/sessions/:sessionId` (+ result) | already production | Quiet Language help; “Was the wording hard?” after a miss.                                    |
| Existing            | `/app/practice/mistakes/:mistakeId`            | already production | No second Language-help player. Link to notebook; cause `TERMINOLOGY_MISUNDERSTANDING` stays. |
| Existing            | `/admin/academic-packages/:id`                 | already production | Term bank + required set + optional question attachments. No new admin HTTP.                  |

- Register the three new routes as production in `apps/web/src/app/routes.ts` (`availability: implemented`, `access: student-settings`, `audience: student`). Learn `activePaths` already covers `/app/learn`.
- Do not add a primary-nav item. Notebook entry: Learn package/browse secondary link (“Terms”), preview/lesson/player “Notebook”, and a Practice overlay that routes to `/app/learn/terms` (same list, not a second store).
- Browse `Continue` / outline lesson links today go to `/app/learn/:subject/lessons/:resourceId`. When `LessonSummary.terminologyPreview` exists and progress is `NOT_STARTED` or `IN_PROGRESS`, navigate to the preview route instead (replace). Direct lesson URL / reload: if `PublishedLessonDetail.terminology.previewResourceId` is set, `GET` that preview (side-effect free) and redirect unless `PREVIEW_COMPLETE`. `requiredSetUpdatedSinceCompleted` is a soft notice with a link back to preview; never wipe the notebook.
- Restored-session `/` is unchanged: production `STUDENT` → `/app/learn`. Prototype Today / PX-001 lesson fixtures must not override that.
- Sign-out, wrong role, and signed-out: existing `StudentExperienceGuard` / `AuthGuard` / `AdminGuard`. Student APIs 401/403. Admin draft stays on the package editor.

### Ownership

- `features/learn` — preview page, lesson rail, notebook list/detail/review, browse intercept.
- `features/assessment` — quiet Language help, chip layer on the stem, “Was the wording hard?”, disclose + existing mistake cause PATCH.
- `features/academic-admin` — term-bank editor tab; `requiredTermIds` picker on `TERMINOLOGY` resources; optional `authoredTermAttachments` on questions. Treat omitted `terms[]` as empty on load; **always send `terms` on draft save** (full-replace PUT).
- `shared/components` (or `shared/terminology`) — presentational term card + Play. **No feature API imports.** `lang="zh"` on characters; pinyin is not the accessible name.
- `shared/api/terminologyStudentApi.ts` — student academic terminology adapters (preview, progress, check, lookup, notebook, review, audio). Learn and assessment both consume this so features do not import each other. Assessment keeps `discloseLanguageHelp` in `assessmentApi`.
- Do **not** add `features/terminology`. Do **not** import `prototype/student` fixtures or `fixture.terms.*` keys into production.

### Data authority

| Visible value                                     | Authority                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| Preview cards, match targets, lesson rail, spans  | Canonical production GET (preview / lesson)                                |
| Preview progress, notebook rows, familiarity, due | Canonical PUT/POST response, then replace local state                      |
| Language-help chips                               | `discloseLanguageHelp` result; persist via session GET after disclose      |
| Term card after a tap                             | `resolveTermLookup` (`MATCHED` card + `alreadyInNotebook` + `entry.metIn`) |
| “Not in the reviewed term bank”                   | `NOT_IN_BANK` (HTTP 200) + the student’s local selected text               |
| Missing gloss                                     | `definition.availability === LANGUAGE_UNAVAILABLE` — never swap language   |
| Play enabled                                      | `audioAvailable` on that surface form; 404 hides Play, pinyin stays        |
| Language help visible                             | **`CR-01` `languageHelpAvailable`** — not `examLanguage`, not a probe      |
| Interface language                                | i18n only                                                                  |
| Explanation language                              | Profile default + in-session toggle; query param on academic GETs          |
| Exam language                                     | Package / session; never copied into explanation or interface              |
| PX-001 fixture cards                              | Prototype only; never shown as account data                                |

After a failed save, keep the student’s pairs / selected option / search query. After success, replace with the authoritative body. Do not treat a 5xx as DEV fallback success.

### UI states (implement before polish)

| Surface         | States                                                                                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Preview         | Profile-language pending; loading; ready cards; `LANGUAGE_UNAVAILABLE` on a card; matching-pairs (optional); check submitting; check result (local pair feedback from `matchTargets`, counts from server); progress PUT failure + retry; Continue enabled even when pairs are skipped; required-set-changed notice |
| Lesson          | Existing lesson states + rail loading-with-lesson; hide rail when `terminology` omitted; tappable TEXT spans only; card overlay; lookup failure; already-saved                                                                                                                                                     |
| Language help   | First paint clean (`CR-01` false → no control); quiet control; disclose loading; chips; empty chips + select-to-lookup still allowed when available; `NOT_IN_BANK`; formal/409 honest failure; already-saved                                                                                                       |
| After a miss    | Existing feedback + “Was the wording hard?” (only when `languageHelpAvailable` and item incorrect). Opens the same disclose with `WORDING_HARD`. Never Translate.                                                                                                                                                  |
| Notebook        | Loading; empty notebook (valid); empty due (success, “you’re caught up”); list; search; class filter; entry load; review submitting; review result; next due via re-list `dueOnly`; 403 formal-disabled                                                                                                            |
| Admin term bank | Empty bank; editor validation (surface, pinyin, domain meaning, class, topic bindings); publish violations mapped to fields; do not require the admin to mark every question character                                                                                                                             |

### Localization, accessibility, interaction

- Every chrome string (headings, Due/search/filters, Language help, “Was the wording hard?”, already-saved, not-in-bank, Play, Continue, Practice these terms, empty/error/retry, toasts, `aria-label`) lives in `en` / `id` / `zh-CN` resources. Verify long Indonesian and Chinese strings, not key presence only.
- Characters use `lang="zh"`. Accessible name is characters + explanation-language definition (or the unavailable phrase), not pinyin alone.
- Term-card dialog: focus trap, Escape closes, restore focus to the chip/rail control. 44px targets. Chips use text + underline, not color alone.
- Keyboard: preview cards, matching targets, rail, Language help, chips, review options are native buttons/radios. No card-flip. Reduced motion: static chip underline; no celebration animation.
- Do not announce unmatched selected text to logs or analytics (slice privacy rule).

### Prototype promotion / deletion

- `prototype/student/learning/LessonPage.tsx` inline `lesson.terminology` list and `prototype/student/fixtures` `公因式` / `因式分解` rows stay on the isolated PX-001 lesson. Do not promote those strings, definitions, or the inline list.
- Production Learn replaces that pattern with the preview route + lesson rail. Leave the prototype lesson working for remaining PX-001 journeys.
- Production Practice/Learn routes stay off the preview-workspace gate (already true after VS-008/VS-009). Do not re-gate terminology behind prototype onboarding.

### Adjacent regression

- VS-008 lesson reader: explanation-language toggle, resume, content progress, checkpoint CTA. Preview intercept must not mark lesson `CONTENT_COMPLETE` or skip the CTA.
- VS-009 player: math hints, STRONG warn, revalidation STRONG-off, feedback, mistakes. Language help is a separate pastel (cream/sky) from hint treatment. Word/phrase must not flip `languageAssistUsed` or block pass copy.
- Admin package editor: existing tabs keep saving; new `terms[]` / `requiredTermIds` / `authoredTermAttachments` must round-trip. Current publish still expects `TERMINOLOGY.versions` (VS-005). Admin may keep a minimal title version until backend relaxes that in implementation; student preview ignores that body.

## Experience and interaction plan

Follow root [`DESIGN.md`](../../DESIGN.md) and [`docs/design/README.md`](../design/README.md).

- Existing roles are enough: Dest page hero + lesson sections (preview), lesson rail, player overlay (Language help / term card), list/detail (notebook, same rhythm as mistakes). The term card is a restrained context surface, not a flashcard deck and not a dictionary page.
- No `DESIGN.md` token change expected. Reuse `block-cream` / `block-sky` for Language help (distinct from existing hint treatment). If a dedicated term-chip token is later needed, add it in `DESIGN.md` first.
- Feature-owned chip/card/rail CSS; shared buttons, focus, toast, Dest hero.
- **Student goal:** Chinese exam wording must not hide the subject. Jia opens a topic, sees a short required list (characters, always-visible pinyin, optional Play, her explanation-language definition, English equivalent, domain meaning), may skip the pairs game, then studies the lesson with a rail if she forgets. On a checkpoint the stem stays a real exam stem. She asks for help. The original Chinese does not disappear. The notebook is one list she can trust — Due first, not four homes.
- **Admin goal:** Sari authors one identity per meaning, binds a small required set to a topic, and optionally pins a few hard spans on a question. She does not highlighter-mark every character. Exam-wording terms (`求`, `若…则…`) are authored once and reused.
- Exits: preview → LESSON (never locked); dismiss card → back to stem/lesson; notebook review → next due or empty-due success.
- Primary actions: preview **Continue to lesson**; card **Close**; notebook **Review due**. Secondary: Language help, Practice these terms, search, Play, class filter.
- Short confirmation on preview complete and review result. **No mastery badge, no “term mastered”, no `CHECKPOINT_PASSED` copy.**
- No card-flip. Reduced motion: static underline on chips.
- Visual review before `DONE`: 390px and 1280px; `id` / `en` / `zh-CN` chrome; keyboard order; reduced motion. Screenshots under `output/playwright/VS-010A/`.

## Authorization, privacy, and safety

- Activated `STUDENT` on student APIs. Unique pilot `ADMIN` on the term-bank draft. Pilot `ContentAccessPolicy` unchanged.
- Students never receive another student’s notebook, unpublished terms, or admin identity. Assessment pre-feedback still omits answer keys.
- The notebook is student learning state. Parents do not see it here (`VS-035` later, summary only).
- Logs: term-bank counts on publish; lookup/review counts by term id. No unmatched selected text, definition bodies, stems, answers, speech keys, or SSML.

## Observability

| Event/metric                    | Trigger                               | Allowed properties                                           | Prohibited content                  |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| `terminology.preview.completed` | Preview marked complete               | Internal account id, package id, resource id, required count | Card bodies, pinyin                 |
| `terminology.lookup.resolved`   | Match or not-in-bank                  | term id?, matched, source, session id?                       | Selected raw text, definitions      |
| `terminology.assist.disclosed`  | Word/phrase help opened               | session id, item id, tier                                    | Card body                           |
| `terminology.review.recorded`   | Due review submitted                  | term id, result, next familiarity                            | Live stem copy                      |
| `terminology.audio.rendered`    | Publish synthesized or skipped a clip | term id, status, byte length?                                | Speech key, SSML, surface-form text |

## Test plan

### Contract and backend

- Publish rejects a required term missing a Chinese surface form or domain meaning.
- Preview returns the requested explanation-language gloss or an explicit unavailable payload.
- Notebook upsert is idempotent across required, click, and language-mistake sources.
- Word/phrase disclose writes `LANGUAGE_ASSIST` and leaves `languageAssistUsed` false.
- Unknown lookup returns `NOT_IN_BANK` and writes nothing.
- Formal-mock flag denies lookup and review.

### Frontend

- Preview cards + Continue to lesson; optional matching pairs; no mastery wording.
- Lesson rail; item Language help reveal; already-in-notebook; not-in-bank.
- Language help is visually distinct from math hints and hidden when formal-disabled.
- Notebook: one list, Due toggle, class chip, cloze-or-pairs review, already-saved, empty due.

### End-to-end / manual

- Admin authors three terms (academic, instruction, logic), publishes preview + lesson + zh-CN checkpoint.
- Student: preview → lesson rail → clean checkpoint stem → Language help → notebook due review.
- English explanation language with Chinese exam terms stays uncoupled.
- Mobile and desktop; `id` / `en` / `zh-CN` chrome.

## Implementation sequence

1. Backend agent drafted this slice and closed the human gate (`D-01`–`D-08`).
2. ~~Backend agent initializes TypeSpec, generates artifacts, and records the initial checkpoint. Status stays `SHAPING`.~~ **Done** — `VS-010A-R8-initial` (revision 8).
3. ~~Frontend agent reviews the slice and contract, then completes frontend, experience, accessibility, localization, and prototype promotion or deletion plans.~~ **Done** — revision 9 consumer review of `VS-010A-R8-initial`; filed `CR-01`.
4. ~~Frontend records any `CR-NN`. Backend accepts, declines, or escalates, regenerates, and obtains re-review.~~ **`CR-01` ACCEPTED** and applied as `VS-010A-R10-cr-applied`.
5. ~~Frontend re-review.~~ **Done (rev 11)** — `CR-01` satisfied; zero further `CR-NN`; accepted checkpoint `VS-010A-R10-accepted` (identical hashes).
6. ~~Backend records `CONTRACT_READY`.~~ **Done (rev 12)** — status `CONTRACT_READY`.
7. Backend and frontend implement from `VS-010A-R10-accepted`. Change `DESIGN.md` before CSS if a shared visual rule changes. **Backend complete** for this checkpoint (V12, student terminology APIs, publish-time speech port, assessment Language help). Frontend implementation is separate.
8. Integrate the real HTTP flow early. Add contract, backend, frontend, and journey evidence.
9. Slice owner advances lifecycle only after both sides record evidence.
10. Verify privacy, failure recovery, mobile/desktop, reduced motion, and localization before `DONE`.

## Definition of done

- [x] Requirement and story references remain correct.
- [x] Documentation sufficiency review is complete; material gaps are resolved or explicitly out of scope.
- [x] Human gate is `APPROVED`; scope and artifacts are recorded.
- [ ] Delivered flow matches in-scope and out-of-scope lists.
- [x] Stack change (`ADR-0001`) records first use, alternatives, impact, rollback, and owner.
- [x] TypeSpec compiles; generated artifacts match the accepted contract.
- [x] Initial and accepted contract checkpoints are recorded; frontend review is complete; every `CR-NN` is resolved.
- [ ] Backend, frontend, migration, and tests implement the same states and errors.
- [ ] Every acceptance criterion has named evidence.
- [ ] Authorization, privacy, minor safety, and audit were reviewed.
- [ ] Mobile, accessibility, localization, low-bandwidth, reduced-motion, and failure states were verified where they apply.
- [ ] Routes, components, and prototype reuse or deletion are recorded.
- [ ] UI follows `DESIGN.md`. Any shared token change was made there first.
- [ ] Journey handoffs are coherent. Prototype-only behavior stays isolated.
- [ ] Observability contains no private content that does not belong.
- [ ] `docs/ARCHITECTURE.md`, `docs/PLAN.md`, and `docs/requirements/COVERAGE.md` reflect the result.
- [ ] Exact verification commands and results are recorded.

## Verification evidence

| Evidence                     | Result                                                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract build               | `pnpm generate` passed after `CR-01` (TypeSpec 1.14 compile + OpenAPI + frontend declarations).                                                                                                                            |
| Initial contract checkpoint  | `VS-010A-R8-initial` established (hashes below).                                                                                                                                                                           |
| Frontend contract review     | Revision 9 review of `VS-010A-R8-initial` complete. Filed `CR-01`.                                                                                                                                                         |
| CR disposition               | `CR-01` **ACCEPTED** and applied; checkpoint `VS-010A-R10-cr-applied`. Zero open `CR-NN`.                                                                                                                                  |
| Frontend re-review           | Revision 11 re-review of `VS-010A-R10-cr-applied` complete. `CR-01` **Satisfied**. Zero further `CR-NN`.                                                                                                                   |
| Accepted contract checkpoint | **`VS-010A-R10-accepted`** — identical hashes to `VS-010A-R10-cr-applied` (table below). Backend confirmed 2026-08-15. Status **`CONTRACT_READY`**.                                                                        |
| Web typecheck                | `pnpm typecheck:web` passed after regeneration. Existing VS-009 `SessionItemView` constructors include `languageHelpAvailable: false`.                                                                                     |
| Technology/ADR review        | Azure Speech only at publish behind `SpeechSynthesisPort`; tests use `TestSpeechSynthesisPort`. CI does not contact Azure.                                                                                                 |
| Backend tests                | Focused unit + HTTP ITs **passed** 2026-08-18 (73 tests after reviewer repair). Commands and classes recorded below. TypeSpec hashes unchanged (`VS-010A-R10-accepted`). Independent reviewer verdict `PASS_WITH_REPAIRS`. |
| Frontend tests               | `pnpm --filter @yukcsca/web test` — 54 files / 264 tests passed after adding `languageHelpAvailable: false` to existing VS-009 constructors. No Language-help UI added.                                                    |
| Frontend visual review       | Not run                                                                                                                                                                                                                    |
| End-to-end/manual flow       | Not run                                                                                                                                                                                                                    |

### `VS-010A-R8-initial` artifact hashes (`git hash-object`)

| Artifact                                       | Hash                                                   |
| ---------------------------------------------- | ------------------------------------------------------ |
| `contracts/academic-admin.tsp`                 | `9b94951485bcaee130e88cbf855aaccbf15d94f3`             |
| `contracts/academic-student.tsp`               | `b2573fedd35482e194ebeef22c17c7f5d858c4c2`             |
| `contracts/assessment-student.tsp`             | `eded6a58bb4e698305456a567bbe6c08b7179920`             |
| `contracts/common.tsp`                         | `1266e37d4df60f07efb59f73d2429f2aebea210a`             |
| `contracts/main.tsp`                           | `ea6d742258f200e86d29cd62b4868271498ae9cf` (unchanged) |
| `contracts/generated/openapi.yaml`             | `ab5962632b68d92b4f7f1b13402757a06ddf7ecf`             |
| `apps/web/src/shared/api/generated/openapi.ts` | `c292e473abbce5328eec4f33d8763f86f4558bed`             |

**Operation inventory (9 new student ops):** `AcademicStudentApi_getTerminologyPreview`, `upsertPreviewProgress`, `submitPreviewCheck`, `resolveTermLookup`, `listTerminologyNotebook`, `getTerminologyNotebookEntry`, `submitTermReview`, `getTermPronunciation`; `AssessmentStudentApi_discloseLanguageHelp`. Admin draft models extended (no new admin HTTP routes). Additive optional fields on `LessonSummary`, `PublishedLessonDetail`, and `AssistanceSummary`. Required `SessionItemView.languageHelpAvailable` (`CR-01`).

### `VS-010A-R10-cr-applied` artifact hashes (`git hash-object`)

| Artifact                                       | Hash                                                         |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `contracts/academic-admin.tsp`                 | `9b94951485bcaee130e88cbf855aaccbf15d94f3` (unchanged vs R8) |
| `contracts/academic-student.tsp`               | `b2573fedd35482e194ebeef22c17c7f5d858c4c2` (unchanged vs R8) |
| `contracts/assessment-student.tsp`             | `d6c93bd805a4b26bd227d06ca9d0035664987808`                   |
| `contracts/common.tsp`                         | `1266e37d4df60f07efb59f73d2429f2aebea210a` (unchanged vs R8) |
| `contracts/main.tsp`                           | `ea6d742258f200e86d29cd62b4868271498ae9cf` (unchanged)       |
| `contracts/generated/openapi.yaml`             | `2624f91a85be3827796e786ca256b2a6be643bce`                   |
| `apps/web/src/shared/api/generated/openapi.ts` | `2f5b10f3ae20fc4294d06ce201f0591c8b995616`                   |

Accepted checkpoint `VS-010A-R10-accepted` uses the same hashes.

**Backend implementation evidence (2026-08-18):**

```text
cd services/api && ./mvnw --batch-mode -Dtest=AcademicDraftProcessorTest,PublishedPackageProjectorTest,AcademicAssessmentDraftValidationTest,CheckpointPassEvaluatorTest,TerminologyProjectorTest,StudentTerminologyNotebookTest,FormalAssistancePolicyTest,AcademicTerminologyHttpIT,AssessmentLanguageHelpHttpIT,AcademicStudentHttpIT,AssessmentStudentHttpIT,AcademicAdminHttpIT,DatabaseMigrationIT test
# BUILD SUCCESS — Tests run: 73, Failures: 0, Errors: 0, Skipped: 0
```

Named coverage: `AcademicDraftProcessorTest` (omit terms; missing surface/pinyin/domainMeaning; TOPIC_TERM outline; unknown requiredTermIds/attachments), `TerminologyProjectorTest` (UTF-16/alias; no extra TOPIC_TERM auto-match; admin-preset can add a non-required `TOPIC_TERM`), `StudentTerminologyNotebookTest` (idempotent upsert + familiarity/due), `FormalAssistancePolicyTest`, `CheckpointPassEvaluatorTest` (language assist is not a pass input), `AcademicTerminologyHttpIT` (preview GET/PUT/check, lookup MATCHED/NOT_IN_BANK, notebook/review, audio 200/404, English omit chrome, formal 403), `AssessmentLanguageHelpHttpIT` (English `languageHelpAvailable=false` + disclose 409; zh-CN disclose spans only required + exam-wording; `languageAssistUsed=false`; checkpoint pass; revalidation pass with only LANGUAGE_ASSIST; formal 403). Existing `AcademicStudentHttpIT` / `AssessmentStudentHttpIT` / `AcademicAdminHttpIT` still pass without `terms[]`.

Independent backend review (2026-08-18): `PASS_WITH_REPAIRS`. One in-scope defect repaired: scored-item auto-match no longer chips non-required `TOPIC_TERM` that only share outline ids. Residual items are low (LearningEvidencePort not extended, republish re-synthesizes clips, unique-key races accepted at pilot). Frontend remains `NOT_ASSESSED`.

**Intentionally not run:** `make verify`, full `./mvnw verify`, Playwright, Compose, frontend suites — frontend UI is not in this change; contract artifacts were not edited. PLAN not bumped (`CONTRACT_READY` until both sides complete).

## Later candidates (not this slice)

Do not implement unless a later decision pulls them in. They do not change the paired requirements.

- Hide pinyin once familiarity is `FAMILIAR`.
- Reviewed confusion pairs (充分 vs 必要).
- “Request this term” when a selection misses the bank.
- Term-linked remediation when the error cause is terminology.
- Question-level language-misinterpretation notes (requirement 5.3; VS-009 has generic notes).

Do not add: LLM definitions, a runtime dictionary, student-owned decks, HSK or stroke order, an English-Math notebook, or fake Ask-agent chrome.

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                                                                                                                       |
| -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12       | 2026-08-15 | Backend confirmed `VS-010A-R10-accepted` hashes; zero open `CR-NN` / `D-NN`; moved slice to **`CONTRACT_READY`**. PLAN `0.5.37`. Implementation unstarted.                                                                                                                                                                                   |
| 11       | 2026-08-15 | Frontend re-review of `VS-010A-R10-cr-applied`: `CR-01` confirmed on TypeSpec, OpenAPI, and generated web types; zero further `CR-NN`; accepted checkpoint `VS-010A-R10-accepted` (identical hashes). Status remains `SHAPING`. Backend should mark `CONTRACT_READY`. No TypeSpec edits by frontend. PLAN not bumped.                        |
| 10       | 2026-08-15 | Backend **ACCEPTED** `CR-01`: required `SessionItemView.languageHelpAvailable`. Regenerated OpenAPI/web; recorded `VS-010A-R10-cr-applied`. Existing VS-009 constructors set `false`. Status remains `SHAPING` pending frontend re-review. Not `CONTRACT_READY`. PLAN not bumped.                                                            |
| 9        | 2026-08-15 | Frontend consumer review of `VS-010A-R8-initial`: journey/AC/requirement matrix recorded; frontend, experience, UI-state, accessibility, localization, and prototype isolation plans completed; filed open `CR-01` (`languageHelpAvailable` on `SessionItemView`). Status remains `SHAPING`. No TypeSpec edits by frontend. PLAN not bumped. |
| 8        | 2026-08-15 | Initial TypeSpec `VS-010A-R8-initial`: subject-agnostic term bank on the package draft; student preview/progress/check/lookup/notebook/review/audio; assessment Language-help disclose. Status remains `SHAPING`. PLAN not bumped.                                                                                                           |
| 7        | 2026-08-15 | `D-08`: first content is Chinese Mathematics; model and APIs are Chinese exam-language on any subject. Physics/Chemistry reuse later; not seeded here. Domain meaning, not math-only field name. PLAN not bumped.                                                                                                                            |
| 6        | 2026-08-15 | Due review prefers contextual cloze from a published “Met in …” snippet; matching pairs remain the fallback. Term class is `EXAM_INSTRUCTION` / `LOGICAL_EXPRESSION` / `TOPIC_TERM` (exam-language role, not syllabus topic). `D-07`. PLAN not bumped.                                                                                       |
| 5        | 2026-08-15 | Wording pass. Product behavior stated once in plain language. Removed leftover Due/This topic/Weak/All and “strong language help in this slice” contradictions.                                                                                                                                                                              |
| 4        | 2026-08-14 | `D-06`: Language help on request; matching pairs do not lock the lesson; one notebook; honest already-saved. Human gate `APPROVED`.                                                                                                                                                                                                          |
| 3        | 2026-08-14 | `D-04`: word/phrase only; Translate and Ask agent later.                                                                                                                                                                                                                                                                                     |
| 2        | 2026-08-14 | `D-03` pronunciation; `D-05` lightweight check; `ADR-0001`.                                                                                                                                                                                                                                                                                  |
| 1        | 2026-08-14 | Initial shaping. `D-01`, `D-02`.                                                                                                                                                                                                                                                                                                             |
