# VS-010A — Chinese exam-language terminology preview, in-context help, and notebook

## Metadata

| Field                        | Value                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Status                       | `SHAPING`                                                                                                                                                          |
| Human gate                   | `APPROVED`                                                                                                                                                         |
| Plan revision                | 7                                                                                                                                                                  |
| Updated                      | 2026-08-15                                                                                                                                                         |
| Primary actor                | Activated `STUDENT` on a published package that has Chinese (`zh-CN`) exam-language terms. First platform admin authors the term bank. First content: Mathematics. |
| Story IDs                    | `US-TERM-01`, `US-TERM-02`, `US-TERM-03`; partial `US-HINT-01` (record language help, do not treat word/phrase as independent mastery); partial `US-ADM-02`        |
| Requirement sections         | English: 4.4 (canonical term identity), 4.5, 4.7 (P0 notebook clause), 5.3 (Chinese language assistance); Chinese: the matching clauses                            |
| Depends on                   | [`VS-005`](VS-005-academic-foundation.md), [`VS-008`](VS-008-student-learn-content.md), [`VS-009`](VS-009-assessment-practice-remediation.md)                      |
| Related ADRs                 | [`ADR-0001`](../decisions/ADR-0001-azure-speech-term-pronunciation.md) — Azure Speech for pre-rendered term audio                                                  |
| TypeSpec source              | Additive `contracts/academic-admin.tsp`, `contracts/academic-student.tsp`, `contracts/assessment-student.tsp` (not initialized)                                    |
| API operations               | Not initialized                                                                                                                                                    |
| Backend/slice owner          | Backend vertical-slice worker. `academic` owns the term bank, preview, notebook, and lookup. `assessment` owns `LANGUAGE_ASSIST` events.                           |
| Frontend owner               | Frontend consumer worker. Production Learn owns preview, lesson rail, and notebook. Assessment owns in-item Language help.                                         |
| Initial contract checkpoint  | Not yet established                                                                                                                                                |
| Accepted contract checkpoint | Not yet established                                                                                                                                                |

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

| Review area                                                   | Evidence inspected                             | Status  | Gap or decision ID                                                 |
| ------------------------------------------------------------- | ---------------------------------------------- | ------- | ------------------------------------------------------------------ |
| End-to-end actor flow and adjacent handoffs                   | `US-TERM-01`–`03`; VS-008; VS-009              | `CLEAR` | Preview → lesson → on-request item help → notebook. Mock reserved. |
| Experience flow, screen states, recovery, and navigation      | Learn and Practice routes; `D-06`              | `CLEAR` | Clean stem; Language help on request; matching pairs not a gate.   |
| Requirement/story coverage and exclusions                     | EN/CN 4.5, 4.7, 5.3; stories 0.3.5             | `CLEAR` | Word/phrase now; 4.5 Translate / sentence help remain later.       |
| Domain terms, states, invariants, and ownership               | Glossary; VS-005 `TERMINOLOGY` page            | `CLEAR` | Term identity ≠ preview resource.                                  |
| Authorization, privacy, minors, consent, and retention        | Pilot academic access; assessment notes        | `CLEAR` | Reviewed cards; do not log unmatched selected text.                |
| Failure, retry, idempotency, stale state, and recovery        | VS-008 progress; VS-009 attempts               | `CLEAR` | Idempotent notebook; historical attempts keep their copy.          |
| Contract, migration, external side effects, and compatibility | Student academic APIs omit `TERMINOLOGY` today | `CLEAR` | Gate approved. TypeSpec may be initialized.                        |
| Technology/dependency need, alternatives, and ADR threshold   | PLAN dependency table; `ADR-0001`              | `CLEAR` | Azure Speech at publish only. Tests mock the port.                 |
| Frontend ownership, prototype promotion, and design impact    | `features/learn`, `features/assessment`        | `CLEAR` | Preview, rail, notebook, Language help, Play beside pinyin.        |
| Acceptance evidence and observability                         | VS-009 event style                             | `CLEAR` | Value-free events: term id, class, source, tier.                   |

## Human decision gate

Follow [`HUMAN_REVIEW.md`](HUMAN_REVIEW.md). `APPROVED` applies only to the recorded decisions.

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Gate status       | `APPROVED`                                                                                     |
| Decision owner    | Product owner                                                                                  |
| Approval scope    | `D-01`–`D-08` as recorded. TypeSpec may start. Implementation waits `CONTRACT_READY`.          |
| Approval evidence | Product-owner chat 2026-08-14, including “do not show language help up front” on scored items. |

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

Public HTTP changes require TypeSpec that compiles before implementation. The human gate is approved. TypeSpec is **not yet initialized**.

### Operations

Proposed student surface (indicative, not accepted):

| Operation               | Method and route                                                   | Auth      | Success                                                        | Required failures                                  |
| ----------------------- | ------------------------------------------------------------------ | --------- | -------------------------------------------------------------- | -------------------------------------------------- |
| Get topic preview       | `GET /api/v1/academic/packages/{subject}/terminology/{resourceId}` | `STUDENT` | Preview + required terms                                       | 401 / 403 / 404; `LANGUAGE_UNAVAILABLE`            |
| Upsert preview progress | `PUT .../terminology/{resourceId}/progress`                        | `STUDENT` | Progress                                                       | 401 / 403 / 404                                    |
| Resolve lookup          | `POST /api/v1/academic/term-lookups`                               | `STUDENT` | Card or `NOT_IN_BANK`                                          | 401 / 403; formal-mock 403                         |
| List notebook           | `GET /api/v1/academic/terminology-notebook`                        | `STUDENT` | Entries (`dueOnly`, `q`, optional `classGroup`)                | 401 / 403                                          |
| Get notebook entry      | `GET /api/v1/academic/terminology-notebook/{termId}`               | `STUDENT` | Entry + card                                                   | 401 / 403 / 404                                    |
| Submit review           | `POST /api/v1/academic/terminology-notebook/{termId}/reviews`      | `STUDENT` | Updated familiarity                                            | 401 / 403 / 404; formal-mock 403                   |
| Disclose language help  | Additive on the existing assessment item                           | `STUDENT` | Updated `AssistanceSummary` (`languageAssistUsed` still false) | Same as hint disclose + `LANGUAGE_ASSIST_DISABLED` |
| Get pronunciation       | `GET /api/v1/academic/terms/{termId}/audio`                        | `STUDENT` | Bounded audio                                                  | 401 / 403 / 404                                    |

Admin: term-bank array on the package draft; `TERMINOLOGY` resource lists `requiredTermIds`; publish validates required glosses.

### Models and validation

| Model                | Important fields                                                                                                                                                                                                              | Validation                                                                                                                                                                                    | Ownership                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `Term`               | `id`, `class` (`EXAM_INSTRUCTION` \| `LOGICAL_EXPRESSION` \| `TOPIC_TERM`), `surfaceForms[]`, `pinyin`, definitions by explanation language, `englishEquivalent`, `domainMeaning`, optional symbols/example, `outlineItemIds` | Class required. At least one zh-CN surface form; pinyin and domain meaning required; missing explanation-language gloss allowed and flagged. Topic class should have at least one outline id. | Academic package revision |
| `TerminologyPreview` | Existing `StudyResource` + `requiredTermIds[]` + optional check items                                                                                                                                                         | Required ids must exist in the same draft                                                                                                                                                     | Academic                  |
| `NotebookEntry`      | `termId`, `sources[]`, `familiarity`, `due`, `lastReviewAt`, latest “Met in …”                                                                                                                                                | One per account + term                                                                                                                                                                        | Academic                  |
| `AssistanceSummary`  | Existing fields. `languageAssistUsed` stays false for word/phrase                                                                                                                                                             | Unchanged wire shape                                                                                                                                                                          | Assessment                |

### Contract decisions

- Cookies: existing bearer + refresh cookie. No new cookies.
- Errors: reuse academic/assessment problem types. Add `NOT_IN_BANK`, `LANGUAGE_ASSIST_DISABLED`, `FORMAL_ASSISTANCE_DISABLED`.
- Notebook filter: `dueOnly`, `q`, and optional `classGroup=examWording|topicTerm`.
- Compatibility: additive. VS-009 clients that ignore new fields keep working.

## Contract collaboration

The backend agent owns this slice and TypeSpec. Contract ownership is not product authority. A checkpoint records slice revision, TypeSpec files, generation result, and a handoff reference.

### Readiness reviews

| Review                                                     | Owner               | Status    | Evidence               |
| ---------------------------------------------------------- | ------------------- | --------- | ---------------------- |
| Slice drafted and human gate resolved                      | Backend/slice owner | `DONE`    | `D-01`–`D-08` approved |
| Initial TypeSpec compiles and generated output is reviewed | Backend/slice owner | `PENDING` |                        |
| Frontend consumer review                                   | Frontend owner      | `PENDING` |                        |
| Contract requests resolved                                 | Backend/slice owner | `PENDING` |                        |
| Accepted contract checkpoint recorded                      | Backend/slice owner | `PENDING` |                        |

### Contract change requests

| ID  | Consumer scenario or constraint | Proposed change | Backend decision and reason | Human decision ID | Status | Applied/review evidence |
| --- | ------------------------------- | --------------- | --------------------------- | ----------------- | ------ | ----------------------- |
| —   | No requests recorded.           | —               | —                           | —                 | —      | —                       |

## Backend plan

- Modules: **`academic`** — term bank, preview, notebook, familiarity, lookup, audio bytes. **`assessment`** — `LANGUAGE_ASSIST` events only. No new Maven module.
- Use cases: publish validation; publish-time speech per new or changed surface form; preview progress; lookup; notebook upsert; review; disclose word/phrase help.
- Domain rules: reviewed meaning only; idempotent notebook; preview ≠ mastery; word/phrase is not strong assistance; audio optional; pinyin required.
- Ports: `SpeechSynthesisPort` (Azure adapter, mocked in tests). Extend `LearningEvidencePort` with term exposure, familiarity, and language-help summaries. No dictionary adapter.
- Flyway: versions after V9. Prefer structured term records keyed by term id, not free text blocks as identity. Notebook, review events, pronunciation bytes. Assistance kind is additive on the existing event table.
- No scheduled jobs. Due is computed from last review evidence.

## Frontend plan

- Affected routes: `/app/learn/:subject`, lesson, checkpoint, `/app/practice/sessions/:sessionId`, mistake detail.
- New routes (exact path at frontend review):
  - Preview: `/app/learn/:subject/terminology/:resourceId` (preferred) or a topic-scoped equivalent.
  - Notebook: `/app/learn/terms` (Learn is the language-bridge home). Practice uses an overlay, not a second notebook.
- Folders: `features/learn` owns preview, rail, notebook, and the term card. `features/assessment` owns Language help and posting assistance. Do not add `features/terminology` unless those folders cannot hold the first use. A presentational card may live in `shared` only if it imports neither feature API.
- Prototype: PX-001 fixture cards are field evidence only. Do not promote fixture strings. Keep prototype isolated.
- API: real fetch first; generated mocks only in `DEV` when the backend is down.
- Authority: preview progress and notebook state are server-authoritative. The client highlights from a server span list. It does not send whole stems on every tap.
- States: empty bank; language unavailable; not in bank; already saved; formal disabled; empty due (success); soft notice if the required set changed after preview complete (do not wipe the notebook).
- Access: 44px targets; term-card focus trap; `lang="zh"` on characters; pinyin is not the only name; chrome in `id` / `en` / `zh-CN`; chips must not rely on color alone.

## Experience and interaction plan

Follow root [`DESIGN.md`](../../DESIGN.md) and [`docs/design/README.md`](../design/README.md).

- Existing roles are enough: lesson sections, player overlays, list/detail (mistakes). The term card is a restrained context surface, not a flashcard deck.
- No `DESIGN.md` token change expected. If a term-chip token is needed, add it in `DESIGN.md` first.
- Feature-owned chip and card styles; shared buttons and focus.
- Goal: language should not hide the subject. Forgotten terms come back on a due schedule.
- Exits: preview → LESSON; dismiss card → back to the stem; notebook review → next due or empty due.
- Primary actions: preview → Continue to lesson; card → close / back to item; notebook → review due. Secondary: Language help, Practice these terms, search.
- Language help uses a different pastel context from math hints (cream/sky vs existing hint treatment).
- Short confirmation on preview complete and review result. No mastery badge.
- No card-flip animation. Reduced motion: static underline on chips.
- PX-001 inline lesson list is replaced by the rail and preview route.
- Visual review before `DONE`: mobile and desktop; Indonesian, English, and Chinese chrome.

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

1. Backend agent drafted this slice and closed the human gate (`D-01`–`D-06`).
2. Backend agent initializes TypeSpec, generates artifacts, and records the initial checkpoint. Status stays `SHAPING`.
3. Frontend agent reviews the slice and contract, then completes frontend, experience, accessibility, localization, and prototype promotion or deletion plans.
4. Frontend records any `CR-NN`. Backend accepts, declines, or escalates, regenerates, and obtains re-review.
5. Backend records the accepted checkpoint and moves the slice to `CONTRACT_READY` only when nothing remains open.
6. Backend and frontend implement from that same revision and checkpoint. Change `DESIGN.md` before CSS if a shared visual rule changes.
7. Integrate the real HTTP flow early. Add contract, backend, frontend, and journey evidence.
8. Slice owner advances lifecycle only after both sides record evidence.
9. Verify privacy, failure recovery, mobile/desktop, reduced motion, and localization before `DONE`.

## Definition of done

- [ ] Requirement and story references remain correct.
- [ ] Documentation sufficiency review is complete; material gaps are resolved or explicitly out of scope.
- [ ] Human gate is `APPROVED`; scope and artifacts are recorded.
- [ ] Delivered flow matches in-scope and out-of-scope lists.
- [ ] Stack change (`ADR-0001`) records first use, alternatives, impact, rollback, and owner.
- [ ] TypeSpec compiles; generated artifacts match the accepted contract.
- [ ] Initial and accepted contract checkpoints are recorded; frontend review is complete; every `CR-NN` is resolved.
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

| Evidence                     | Result          |
| ---------------------------- | --------------- |
| Contract build               | Not run         |
| Initial contract checkpoint  | Not established |
| Frontend contract review     | Not run         |
| Accepted contract checkpoint | Not established |
| Technology/ADR review        | Not run         |
| Backend tests                | Not run         |
| Frontend tests               | Not run         |
| Frontend visual review       | Not run         |
| End-to-end/manual flow       | Not run         |

## Later candidates (not this slice)

Do not implement unless a later decision pulls them in. They do not change the paired requirements.

- Hide pinyin once familiarity is `FAMILIAR`.
- Reviewed confusion pairs (充分 vs 必要).
- “Request this term” when a selection misses the bank.
- Term-linked remediation when the error cause is terminology.
- Question-level language-misinterpretation notes (requirement 5.3; VS-009 has generic notes).

Do not add: LLM definitions, a runtime dictionary, student-owned decks, HSK or stroke order, an English-Math notebook, or fake Ask-agent chrome.

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                                 |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7        | 2026-08-15 | `D-08`: first content is Chinese Mathematics; model and APIs are Chinese exam-language on any subject. Physics/Chemistry reuse later; not seeded here. Domain meaning, not math-only field name. PLAN not bumped.                                      |
| 6        | 2026-08-15 | Due review prefers contextual cloze from a published “Met in …” snippet; matching pairs remain the fallback. Term class is `EXAM_INSTRUCTION` / `LOGICAL_EXPRESSION` / `TOPIC_TERM` (exam-language role, not syllabus topic). `D-07`. PLAN not bumped. |
| 5        | 2026-08-15 | Wording pass. Product behavior stated once in plain language. Removed leftover Due/This topic/Weak/All and “strong language help in this slice” contradictions.                                                                                        |
| 4        | 2026-08-14 | `D-06`: Language help on request; matching pairs do not lock the lesson; one notebook; honest already-saved. Human gate `APPROVED`.                                                                                                                    |
| 3        | 2026-08-14 | `D-04`: word/phrase only; Translate and Ask agent later.                                                                                                                                                                                               |
| 2        | 2026-08-14 | `D-03` pronunciation; `D-05` lightweight check; `ADR-0001`.                                                                                                                                                                                            |
| 1        | 2026-08-14 | Initial shaping. `D-01`, `D-02`.                                                                                                                                                                                                                       |
