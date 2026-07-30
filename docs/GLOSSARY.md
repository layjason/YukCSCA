# Domain glossary

> **Classification: supporting definitions.** The bilingual requirements are authoritative if wording or scope conflicts with this glossary.

This is YukCSCA's canonical domain-language file. Agents must challenge overloaded terms during slice shaping and update this file immediately after terminology is resolved. Do not create a parallel `CONTEXT.md`. Keep API names, database fields, libraries, and implementation decisions out of this glossary.

When two words could describe the same concept, choose one canonical term and add an **Avoid** note only when the alias is likely to cause real confusion.

- **Explanation language:** Language used to teach a concept. It is independent from interface language and exam language.
- **Exam language:** Original language of a CSCA subject/question, initially English or Chinese for Mathematics.
- **Official-source claim:** Factual statement whose authority, source locator, effective/verification date, applicability, and status are retained. It does not grant permission to copy protected source content.
- **Platform-derived claim:** YukCSCA-authored interpretation, recommendation, learning objective, coverage judgement, explanation, or remediation relationship. It must not be labelled official.
- **Official syllabus version:** One stored version of an official CSCA syllabus, including its source, date, and exact topic wording.
- **Syllabus topic:** A module, topic, or statement taken directly from an official syllabus. **Avoid:** using this term for a YukCSCA-authored learning objective.
- **Topic mapping:** Relationship between an official syllabus topic and one or more YukCSCA learning objectives.
- **Academic content:** Reusable data such as a learning objective, lesson, terminology entry, remediation unit, question, or mock paper. It must not contain frontend routes or page-layout state.
- **Content language version:** English, Chinese, Indonesian, accessibility, or media form of the same academic content.
- **Attempt question copy:** Server-side snapshot of the exact question text, choices, answer, and scoring data saved when a student starts an assessment attempt. Correct answers and scoring keys remain server-side until the allowed feedback point. Later edits do not change that attempt.
- **Practice or diagnostic set:** A named group of published questions with its purpose, subject, exam language, and optional timing or scoring settings.
- **Mock paper:** A timed assessment created by selecting published questions and setting its duration and scoring.
- **Follow-up recommendation:** A suggested lesson, review, practice task, terminology activity, or strategy change based on learning evidence. It is not added to a study plan until the student confirms it.
- **Learning objective:** A YukCSCA-authored assessable skill or concept tracked for learning progress and optionally mapped to official syllabus topics. It is not official syllabus wording unless copied and cited as such.
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
