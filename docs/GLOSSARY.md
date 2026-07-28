# Domain glossary

> **Classification: supporting definitions.** The bilingual requirements are authoritative if wording or scope conflicts with this glossary.

This is YukCSCA's canonical domain-language file. Agents must challenge overloaded terms during slice shaping and update this file immediately after terminology is resolved. Do not create a parallel `CONTEXT.md`. Keep API names, database fields, libraries, and implementation decisions out of this glossary.

When two words could describe the same concept, choose one canonical term and add an **Avoid** note only when the alias is likely to cause real confusion.

- **Explanation language:** Language used to teach a concept. It is independent from interface language and exam language.
- **Exam language:** Original language of a CSCA subject/question, initially English or Chinese for Mathematics.
- **Learning objective:** Smallest syllabus-mapped unit tracked for mastery.
- **Mastery state:** Evidence-backed estimate for a learner and objective; never a raw LLM opinion.
- **Error cause:** Classified reason for an incorrect attempt, such as a conceptual gap, prerequisite gap, terminology misunderstanding, carelessness, or time management.
- **Remediation:** Reteaching, prerequisite work, retrieval practice, and revalidation scheduled from an error cause.
- **Plan feasibility:** Deterministic comparison between remaining work, exam date, learner availability, and expected workload.
- **Published content:** Content with source/provenance, authorization, author/reviewer, version, and review status.
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
