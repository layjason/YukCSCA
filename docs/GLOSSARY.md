# Domain glossary

> **Classification: supporting definitions.** The bilingual requirements are authoritative if wording or scope conflicts with this glossary.

This is YukCSCA's canonical domain-language file. Agents must challenge overloaded terms during slice shaping and update this file immediately after terminology is resolved. Do not create a parallel `CONTEXT.md`. Keep API names, database fields, libraries, and implementation decisions out of this glossary.

When two words could describe the same concept, choose one canonical term and add an **Avoid** note only when the alias is likely to cause real confusion.

- **Explanation language:** Language used to teach a concept. It is independent from interface language and exam language.
- **Exam language:** Original language of a CSCA subject/question, initially English or Chinese for Mathematics.
- **Official-source claim:** Factual statement whose authority, source locator, effective/verification date, applicability, and status are retained. It does not grant permission to copy protected source content.
- **Platform-derived claim:** YukCSCA-authored interpretation, recommendation, learning objective, coverage judgement, explanation, or remediation relationship. It must not be labelled official.
- **Official syllabus version:** One stored official-source record containing authority, edition, one or more language-edition source locators (typically English and/or Simplified Chinese PDFs on the official host), available declared-date status, last checked date, and source locations. It does not copy protected syllabus wording into platform content.
- **Official source link:** Admin-maintained absolute URL for one official CSCA syllabus PDF language edition (`en` or `zh-CN`). Distinct from YukCSCA outline summary languages (`id` / `en` / `zh-CN`).
- **Syllabus outline item:** A YukCSCA-authored summary aligned to one position in an official syllabus structure. It has Bahasa Indonesia, English, and Simplified Chinese versions and must not be labelled as official wording. **Avoid:** “official syllabus topic” when referring to the platform summary.
- **Official-source action:** Compact, visually distinct control(s) that open admin-maintained official PDF locator(s), presented with authority, edition, and last checked date instead of repeated disclaimer text. One panel may expose one or two language-edition actions when both official PDFs exist.
- **Topic mapping:** Relationship between a syllabus outline item and one or more YukCSCA learning objectives.
- **Academic content:** Reusable data such as a learning objective, lesson, terminology entry, remediation unit, question, or mock paper. It must not contain frontend routes or page-layout state.
- **Terminology entry:** One canonical reviewed term identity for a **Chinese exam-language** CSCA package: surface form(s), pinyin, explanation-language definition, and English equivalent. First published use is Chinese Mathematics; the same kind of entry is reused for later Chinese Physics and Chemistry. Required terms bind on each **LESSON**; the lesson preview lists that lesson’s entries only. A `TERMINOLOGY` study resource is not the student preview. **Avoid:** treating a shared outline dictionary, an unreviewed dictionary hit, or “Mathematics-only vocabulary” as the product concept.
- **Term class:** Exam-language role of a terminology entry, not its syllabus topic or subject. `EXAM_INSTRUCTION` (what the item tells the student to do: 求, 证明, 化简), `LOGICAL_EXPRESSION` (how the stem is structured: 若…则…, 当且仅当), or `TOPIC_TERM` (domain vocabulary bound to outline items: 单调递增, 导数; later 加速度, 摩尔). **Avoid:** encoding algebra/calculus/geometry or Mathematics/Physics/Chemistry as a term class — subject is the package; topic is the outline mapping.
- **Terminology notebook:** The student’s opt-in bookmarked terminology entries. Opening or completing a lesson preview does not write the notebook. Bookmark adds; unbookmark removes (including terms saved earlier). Viewing a card is not topic mastery.
- **Language assistance:** Help for exam-language wording (word or phrase meaning, and later authored stronger tiers). On a scored item it is a compact explanation-language gloss on the underlined span, not a restated Chinese headword or a full term card. It is recorded separately from a mathematical hint. Strong language assistance is not independent mastery.
- **Terminology familiarity:** Evidence-backed review state for one student and one terminology entry (`NEW`, `LEARNING`, `FAMILIAR`, plus due/not-due). It is not topic mastery.
- **Content language version:** English, Chinese, Indonesian, accessibility, or media form of the same academic content.
- **Reviewed short video:** A human-reviewed, Published lesson, remediation, or question-explanation video with captions or transcript for one explanation-language version. Watching it is not mastery. It is optional when a complete text, formula, and image alternative exists. **Avoid:** calling a Draft render or an agent clip a reviewed short video.
- **Derived explanation video:** An optional later clip produced from authorised Q&A context after the text answer. It is labelled as a derived explanation, is not official, and is not automatically a course resource.
- **Scene specification:** Template-bound, schema-validated structured data — a reviewed template reference, parameters, and narration segments — that a reviewed render template turns into a narrated video. Admin-authored and model-generated specifications take the same validation and rendering path. **Avoid:** calling it a scene script or animation code; it is never executable scene code.
- **Attempt question copy:** Server-side snapshot of the exact question text, choices, answer, and scoring data saved when a student starts an assessment attempt. Correct answers and scoring keys remain server-side until the allowed feedback point. Later edits do not change that attempt.
- **Practice or diagnostic set:** A named group of published questions with its purpose, subject, exam language, and optional timing or scoring settings.
- **Mock paper:** A timed assessment created by selecting published questions and setting its duration and scoring.
- **Follow-up recommendation:** A suggested lesson, review, practice task, terminology activity, or strategy change based on learning evidence. It is not added to a study plan until the student confirms it.
- **Learning objective:** A YukCSCA-authored assessable skill or concept tracked for learning progress and optionally mapped to syllabus outline items. It is separate from both official source material and the localized outline summary.
- **Mastery state:** Evidence-backed estimate for a learner and objective; never a raw LLM opinion.
- **Error cause:** Classified reason for an incorrect attempt, such as a conceptual gap, prerequisite gap, terminology misunderstanding, carelessness, or time management.
- **Remediation:** Reteaching, prerequisite work, retrieval practice, and revalidation scheduled from an error cause.
- **Plan feasibility:** Deterministic comparison between remaining work, exam date, learner availability, and expected workload.
- **Published content:** Content available to students after required fields, source information, permissions, and basic quality checks are complete.
- **Agent trace:** Versioned record of model, prompt, tools, retrieval references, structured output, cost, latency, and evaluation metadata.
- **Tutor request:** Student/parent request handled and manually matched by platform operations; not a marketplace booking.
- **Parent summary:** Limited progress, risk, and action information; it excludes private learning conversations by default.
- **Account identity:** Authenticated platform identity created from a verified provider credential. It does not itself grant a Student, Parent, Tutor, or Admin product role. **Avoid:** using “account” when the intended concept is a role profile or relationship.
- **Email-verification claim:** Expiring pre-account state created when verification is requested for an email address. It is not an account identity, password credential, role, or session and does not establish mailbox control until a valid single-use verification action is explicitly completed.
- **Display name:** Optional presentation label for an account identity, supplied by a verified provider or an accepted role-profile activation flow. Its absence is valid. Never derive or persist it from an email address; a UI may use a localized presentation-only fallback.
- **Role profile:** Actor-specific product data attached to an account identity, such as a student profile or parent profile.
- **Parent-student relationship:** Explicit invitation/acceptance state that authorizes bounded parent access to one student. A parent profile alone grants no student visibility.
- **Learning completion:** Evidence that a required activity or checkpoint was completed. Completion may contribute to mastery but is not equivalent to mastery.
- **Entitlement:** Authoritative permission for a named student to access a product benefit for a defined scope and validity period. A paid order may create an entitlement, but the two are not the same state.
- **Tutoring booking:** Confirmed tutor assignment and mutually accepted lesson time created from a tutoring request. **Avoid:** calling a paid tutoring request a booking before matching and time confirmation.
