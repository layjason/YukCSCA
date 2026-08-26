# YukCSCA coding-agent contract

This is the repository-wide source of truth for coding agents. A nearer `AGENTS.md` inherits these rules and may add stricter directory-specific constraints.

## Quick reference

- The paired requirements are normative; `PLAN.md`, user stories, and slice plans are not.
- Implement production feature work only from one accepted `VS-NNN` vertical-slice plan under `docs/delivery/`. A non-production product-journey prototype may proceed only from one accepted `PX-NNN` delivery brief in the same directory; shape the owning brief first when none exists.
- Use the bounded human-decision gate when material behavior is unresolved; investigate first, ask one question at a time, and do not ask about reversible implementation details.
- Preserve existing staged, unstaged, and untracked user work.
- Keep the modular monolith and add no speculative infrastructure or empty modules.
- Change public HTTP behavior contract-first and regenerate; never patch generated artifacts.
- For UI work, read root `DESIGN.md` and `docs/design/README.md`; preserve the simple white/pastel academic language and purposeful motion.
- Keep interface, explanation, and exam languages independent.
- Treat minor data, authorization, content provenance, and external-provider output as security boundaries.
- Add success plus failure/authorization/edge coverage, then run the applicable repository gates.
- Do not commit, push, change branches, or modify remote settings without explicit authorization.

Current implementation status belongs in `docs/ARCHITECTURE.md`; do not duplicate a second status snapshot here.

## Mission and product boundary

Build a trustworthy, mobile-first CSCA learning platform for Indonesian high-school students and their families. Optimize for demonstrable learning outcomes, reviewed content, privacy, traceability, accessibility, and maintainability—not raw feature count or answer generation.

The product is not a generic chatbot, an open tutor marketplace, or an official admissions authority. Never claim guaranteed scores, admission, legal validity, or official status.

## Sources of truth

Read before feature implementation:

1. `README.md` and `docs/README.md`
2. The active row in `docs/PLAN.md` and its owning `docs/delivery/VS-NNN-*.md` or `docs/delivery/PX-NNN-*.md` file
3. Only the linked sections of both requirement documents and the linked stories `docs/requirements/USER_STORIES.md`
4. `docs/requirements/COVERAGE.md` for known decomposition gaps
5. `docs/delivery/HUMAN_REVIEW.md` when the slice has a decision gate or the documents appear insufficient
6. `docs/GLOSSARY.md` and any related records under `docs/decisions/`
7. Root `DESIGN.md` and `docs/design/README.md` for UI/interaction work
8. `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and `docs/DEVELOPMENT.md`
9. The nearest directory-level `AGENTS.md`
10. `contracts/` for public HTTP behavior, then current implementation and tests

If the requested work has no accepted delivery brief, perform shaping first. Do not infer an implementation scope from the full backlog or broad requirement section alone.

Apply repository authorities in this order:

1. Bilingual product requirements—the sole normative product authority
2. Accepted delivery brief—the bounded implementation and acceptance mapping; a `PX-NNN` brief may explore presentation and journey continuity but never creates production product meaning
3. TypeSpec—the executable public HTTP boundary for that accepted slice
4. `DESIGN.md`—the visual and interaction authority for already accepted behavior; it never creates product behavior
5. Current-state architecture/security/development constraints
6. Existing implementation and tests

`docs/requirements/YukCSCA平台需求_EN.md` and `docs/requirements/YukCSCA平台需求_CN.md` are semantically paired. Neither language is secondary. `docs/PLAN.md` is explicitly non-normative and never supplies acceptance criteria. If the requirements disagree, or another artifact conflicts with them, stop the affected work, cite the conflict, and resolve the requirements rather than silently choosing a meaning.

## Human-in-the-loop decision protocol

Human review is a bounded safety and product-quality gate, not a default conversational loop. Follow [`docs/delivery/HUMAN_REVIEW.md`](docs/delivery/HUMAN_REVIEW.md).

Before asking a question, inspect the linked requirements, stories, coverage, glossary, architecture, TypeSpec, code, and tests. Ask only when the unresolved answer could materially change product flow, role/privacy/minor behavior, money or entitlements, domain state or ownership, scored learning semantics, a breaking contract, a destructive side effect, or a hard-to-reverse architectural trade-off.

When a question is required:

- record it in the slice with a stable decision ID;
- ask one question at a time and at most three per review round;
- cite the conflicting or missing evidence and test it with a concrete scenario;
- provide two or three concrete options when useful, plus the agent's recommendation and impact;
- update the owning artifact immediately after the human resolves it;
- mark the slice `AWAITING_DECISION` and do not implement the affected behavior while a blocking decision remains.

Do not ask for reversible implementation details, routine repository conventions, or renewed permission to implement an already approved `CONTRACT_READY` slice. Once the approved boundary is recorded, continue autonomously unless new contradictory evidence reopens the gate.

`docs/GLOSSARY.md` is the canonical domain-language file for this repository; do not add a parallel `CONTEXT.md`. Create concise records under `docs/decisions/` only for choices that are costly to reverse, surprising without context, and based on a real trade-off.

## Delivery execution

- `docs/PLAN.md` is a versioned roadmap and status index. It does not contain detailed implementation tasks for every future feature.
- Every accepted production feature has one `VS-NNN` plan file under `docs/delivery/` using `SLICE_TEMPLATE.md`. An accepted non-production journey prototype has one `PX-NNN` brief there. Do not create empty future briefs.
- A production slice must name one user-observable outcome, exact story/requirement references, exclusions, states, TypeSpec operations, persistence ownership, authorization/privacy rules, failure/idempotency behavior, observability, test evidence, and ordered implementation steps.
- A production slice may be implemented by two agents working from the same slice revision. The backend agent owns the `VS-NNN`, human-decision gate, TypeSpec contract, and lifecycle; the frontend agent owns the consumer review and frontend implementation.
- The backend agent drafts the slice first, escalates material gaps through `HUMAN_REVIEW.md`, then initializes and compiles TypeSpec. The frontend agent reviews that initial contract and records any change request in the same slice before `CONTRACT_READY`.
- A `PX-NNN` brief may reference several future stories only to test navigation, terminology, responsive hierarchy, and handoffs. It must isolate fixtures from generated contracts and production features, identify every fabricated state, forbid production persistence and semantic claims, define one integrated experience outcome plus an ordered implementation sequence, and state promotion/deletion criteria. A shell-only or disconnected-page subset may not be marked complete when the brief accepts a connected journey. Completing it never advances a referenced `VS-NNN` row.
- A public-HTTP slice may not enter implementation before its status is `CONTRACT_READY`, its TypeSpec compiles, initial and accepted contract checkpoints plus the frontend consumer review are recorded, and no contract-change request remains unresolved.
- Keep TypeSpec organized by product/domain boundary, not duplicated per plan. The slice references exact operations and source files.
- Mark a production slice `DONE` only after the actor completes the real application flow and every acceptance criterion has named evidence. Mark a PX milestone `DONE` only after its explicitly non-production outcome and isolation criteria have named evidence. Code presence or generated OpenAPI alone is insufficient.
- Increment the slice `Plan revision` when scope, state transitions, contract shape, or acceptance mapping materially changes. Git history records the diff; revision history records the reason.
- Do not add pnpm scripts, generated files, or lockfile logic solely to validate plan/story documentation metadata.

## Before changing files

- Inspect `git status`, staged and unstaged diffs, the current branch, and recent relevant history. Preserve changes you did not create.
- When working on shared committed history and the task could overlap another branch, fetch remote refs before implementation, then compare relevant commits and files—especially changes under `docs/`, `contracts/`, migrations, and the target feature. Do not fetch merely for a local read-only explanation, an uncommitted initial baseline, or when the user has explicitly limited work to local state.
- A fetch does not authorize merge, rebase, checkout, reset, deletion, commit, or push. Never change branches with uncommitted user work unless the user explicitly approves the operation.
- Search the repository before adding a new abstraction or use case. If another branch or module already implements the requested behavior, report the evidence and ask before duplicating it.
- State assumptions when the source material does not determine behavior. Use the human-decision protocol before making a choice that changes product semantics, public contracts, privacy, money, roles, domain ownership, or scope.

## Requirement traceability

Every feature change must identify its requirement or accepted issue and preserve these invariants:

- Explanation language and exam language are separate dimensions. Changing one must not silently change the other.
- Mastery is evidence-backed. Hints, language assistance, attempt history, error causes, remediation, and revalidation affect interpretation; an LLM opinion alone never changes mastery.
- Plan feasibility is deterministic and recalculated from relevant inputs such as exam date, subjects, diagnostic evidence, available time, and remaining work.
- Only reviewed, published, provenance-recorded, and authorized content may enter scored assessment or production retrieval.
- Parent access is summary- and risk-oriented; private student conversations are excluded by default.
- Tutor access is assignment-bound and least-privilege. Students and parents never browse a public tutor marketplace; matching remains platform-managed.
- Administrative changes to content, access, tutoring, entitlements, payments, or other sensitive state require authorization, reason capture, and an audit trail.
- Production authentication for the first bounded pilot remains Google-only and creates `UNASSIGNED` identities.
- An accepted PX milestone may present email/password registration, verification, login, and recovery through an explicit fixture-backed preview boundary. The preview must not create credentials, accounts, sessions, contracts, persistence, or production-completion claims.
- Production email/password authentication remains a later accepted vertical slice.
- The target audience includes minors. Age, consent, data minimization, retention, deletion, and safety consequences must be considered in every data-bearing slice.

For non-trivial behavior, record acceptance criteria covering the user-visible outcome, authorization/privacy posture, persisted state, failure behavior, and relevant observability.

## Architecture and dependency rules

- Keep the current modular monolith unless the user explicitly approves a change backed by measured need, simpler alternatives, operating/security impact, and a removal plan. The non-normative plan does not pre-approve a microservice, queue, cache, datastore, vector store, AI framework, or orchestration platform.
- Create a backend module or frontend feature folder only with its first implemented use case. Empty future scaffolding is prohibited.
- Controllers translate HTTP only. Business decisions and transaction boundaries live in application/domain services.
- A backend module never imports another module's repository, JPA entity, or infrastructure package. Cross-module access uses an application-facing port or explicit API.
- Provider integrations sit behind ports/adapters. Domain code must not depend directly on OAuth, LLM, payment, email, meeting, or storage SDKs.
- Prefer the smallest reversible design. New dependencies need a short rationale, an identified first use, and removal of overlapping dependencies where practical.
- Do not retain duplicate legacy and new paths for speculative compatibility. Add a compatibility path only when a real consumer and removal plan are documented.

## Contract-first HTTP changes

- TypeSpec under `contracts/` is the only hand-edited public HTTP contract. Never hand-edit `contracts/generated/openapi.yaml` or generated frontend declarations.
- A public API change keeps TypeSpec, generated OpenAPI, frontend generated types/client behavior, backend DTO/controller behavior, and contract/integration tests coherent within the same accepted slice and contract checkpoint. Backend and frontend implementation may proceed separately after `CONTRACT_READY`. Frontend API clients attempt real fetch calls first, falling back to contract-backed OpenAPI mocks only during local development (`import.meta.env.DEV`) when the backend is offline or `404`/`401`.
- The frontend agent does not hand-edit TypeSpec. It records a concrete consumer request in the active slice; the backend agent accepts, declines, or escalates it with evidence. A request that changes product meaning, authorization, privacy, money, state ownership, or another human-gate concern requires human review.
- Declare authentication, authorization posture, validation constraints, nullability, enums, error responses, and cookie behavior explicitly.
- Breaking or product-semantic API changes require user review and a migration plan before implementation. Routine contract work already authorized by an accepted feature does not require a redundant approval checkpoint.
- After contract changes, run `pnpm check:generated`. Regeneration must leave the committed artifacts unchanged.

## Concrete prohibited patterns

The examples below are representative, not exhaustive. Do not preserve an invalid pattern merely because its exact spelling is absent here.

Do not couple interface, explanation, and exam languages or silently assume Bahasa Indonesia:

```typescript
// Prohibited: three independent preferences collapse into one inferred value.
const explanationLanguage = profile.examLanguage ?? interfaceLanguage ?? 'id';
```

Keep the three concepts independently named and persisted at the boundary that owns each preference. A browser-locale fallback may initialize the interface only; it must not set the student's explanation or exam language.

Do not retain duplicate fields or code paths for speculative compatibility:

```typescript
// Prohibited: no identified consumer or removal plan justifies both fields.
type Preferences = {
  explanationLanguage?: Language;
  preferredLanguage?: Language;
};
```

Migrate real consumers in the same coherent change and keep one canonical field. If temporary compatibility is genuinely required, identify the consumer, precedence, telemetry, deadline, and removal owner.

Do not handwrite or patch around the public contract:

```typescript
// Prohibited: this wire DTO can drift from TypeSpec-generated declarations.
type CurrentUserResponse = { id: string; role: string };
```

Change TypeSpec first and regenerate. Likewise, never hand-edit generated OpenAPI or frontend declarations.

Do not cross a backend module through its infrastructure:

```java
// Prohibited from another module.
import com.yukcsca.identity.infrastructure.UserAccountRepository;
```

Use an application-facing port or explicit public use case instead.

## Frontend rules

- Use strict TypeScript and `.tsx`; do not add JavaScript application files.
- Do not use explicit `any`. Use `unknown` only at an external or untyped boundary, then validate or narrow it immediately. Do not add marker comments as a substitute for a real type.
- Reuse generated OpenAPI schema types instead of handwritten wire DTOs.
- Follow `app -> features | prototype -> shared` when an accepted `PX-NNN` brief is active. `features` owns implemented production behavior, `prototype` owns explicitly exploratory fixtures and flows, the two may not import each other, and `shared` may import neither. Without an active PX brief, keep `app -> features -> shared`.
- Keep access tokens in memory. Never persist refresh tokens or Google credentials in browser storage.
- All user-visible text belongs in localization resources. Preserve Bahasa Indonesia, English, and Simplified Chinese support without coupling interface, explanation, and exam languages.
- Build mobile-first and bandwidth-conscious behavior with keyboard access, semantic HTML, visible focus, and basic screen-reader support.
- Treat root `DESIGN.md` as the visual/interaction contract. Use the shared CSS variables, one dominant action per task region, restrained pastel context surfaces, and purposeful motion with reduced-motion support.
- Do not default to gradients, glassmorphism, glow, abstract blobs, random pastel cards, equal-weight dashboard card grids, decorative AI/robot imagery, or perpetual animation.
- Use `lucide-react` for product icons. Prefer Lucide icon-only controls with localized `aria-label` for repeated secondary actions (for example remove/delete-in-list); keep text labels on primary and high-stakes actions. Do not hand-author one-off SVGs or use emoji for UI chrome when Lucide has a match.
- Design the complete task sequence and its initial, loading, empty, validation, failure, stale, success, and recovery states before polishing an isolated component.
- Add or change a semantic design token in `DESIGN.md` first, then mirror it in the shared CSS foundation; do not scatter raw color values through feature styles.
- Comment decisions, invariants, and non-obvious edge cases—not every function. Code comments and API documentation use clear English; user-facing content is localized.
- Add component/API tests for a success state and at least one validation, failure, accessibility, or edge state.
- Use workspace-pinned commands through pnpm: `pnpm exec prettier`, `pnpm lint:web`, `pnpm typecheck:web`, and `pnpm test:web`. Do not rely on unrelated globally installed Node tools. Always format modified frontend files (`apps/web/**/*.{ts,tsx,css}`) with `pnpm exec prettier --write` before completing a task.

## Backend rules

- Java 21, Spring Boot, the official Maven Wrapper, PostgreSQL, and Flyway are fixed unless an ADR changes them. Developer and CI host commands always use `services/api/mvnw`; do not substitute a system Maven version. A container build stage may use the explicitly pinned Maven image in `services/api/Dockerfile`, whose Maven and Java versions must remain aligned with the wrapper and project toolchain.
- Prefer Java records and explicit code over adding Lombok. Do not introduce Lombok only to reduce small amounts of boilerplate.
- Use constructor injection. Production code must not use field injection.
- JPA entities never cross the API boundary. HTTP responses use records/DTOs, and services expose domain/application results rather than repositories.
- Stateless request-shape validation belongs at the HTTP boundary with Jakarta Bean Validation. Stateful invariants, authorization, ownership, and database-dependent validation belong in application/domain services.
- Use value objects when they make a repeated domain invariant unrepresentable; do not wrap primitives mechanically when no invariant or behavior exists.
- Document critical domain decisions and public application contracts with Javadoc when preconditions, postconditions, state transitions, or security invariants are not obvious. Controllers, trivial delegators, DTOs, getters, and setters do not need ceremonial comments.
- Use UTC instants for persisted event time and UUID identifiers unless an accepted domain requirement says otherwise.
- Integration tests use PostgreSQL through Testcontainers, never H2. Production and tests use the same Flyway migrations.
- Flyway migrations are append-only after the first shared deployment. Never rewrite an applied migration. Before that deployment, an initial migration may be corrected only when the change and validation evidence are explicit.
- External calls require timeouts, bounded retries where safe, failure mapping, and an adapter interface.
- Always format modified Java files with Spotless (`services/api/mvnw spotless:apply`) and verify that `services/api/mvnw spotless:check` passes before completing a task.
- Logs describe meaningful operations and failures with appropriate levels. Never add noisy per-function logging.

## Security, privacy, and AI

- Deny access by default and minimize collected fields, retention, and role visibility.
- Never commit secrets, tokens, real personal data, student answers, private chats, copyrighted exam material, or production exports.
- Never log bearer tokens, Google credentials, refresh cookies, private prompts/chats, payment secrets, or unnecessary identifying data.
- Google login verifies signature, issuer, audience, expiry, and verified email server-side and identifies the Google account by `sub` before issuing YukCSCA credentials.
- Store refresh tokens only as hashes. Keep access tokens in browser memory and refresh tokens in `HttpOnly` cookies that are `Secure` outside local development.
- Validate file type, MIME signature, size, malware status, ownership, retention, and authorization before any future file storage or retrieval.
- LLM output is untrusted. Authorization, grading, mastery, billing, entitlements, feasibility, publication, and high-impact decisions require deterministic code and validated inputs.
- When the first bounded agent slice is accepted, use schema-validated output; allow-listed, typed, authorized, bounded tools; prompt-injection defenses; trace versioning; budgets/timeouts; golden evaluations; and human review for disputed or low-confidence output.
- A model may not both generate and approve high-impact academic content.

## Documentation rules

- Update affected documentation in the same change as code, contract, configuration, or operational behavior.
- Always format modified documentation and markdown files with `pnpm exec prettier --write <file...>` to ensure consistent whitespace, tables, and wrap style.
- Keep the bilingual requirement documents semantically synchronized. When requirements themselves change, update `Version`/`版本` and `Date`/`日期` in both files using the actual system date in `Asia/Jakarta`, and record a concise reason in an existing change-history section. Do not invent timestamps or add per-edit changelogs to every documentation file.
- Update `ARCHITECTURE.md` when current implementation boundaries or active technology change. Update `PLAN.md` for plan version, slice order/status, dependencies, experiments, or dependency candidates; update the active slice file for detailed implementation evidence.
- Update root `DESIGN.md` when the shared visual language, semantic tokens, component roles, motion rules, or anti-pattern boundaries change. Keep application CSS aligned and do not create a competing feature-level design system.
- Update `docs/requirements/USER_STORIES.md` and `COVERAGE.md` when requirement decomposition changes. Never copy a broad requirement section into a slice without selecting a closed-loop story.
- Documentation must distinguish configured, locally executed, CI-proven, and remotely enforced status. Never describe a staged workflow or repository setting as active before it exists remotely.
- Do not change product requirements merely to make an implementation or test pass. Surface the mismatch instead.

## Testing and validation

- Every non-trivial use case needs at least one success test and one validation, authorization, privacy, or edge-case test.
- Always rerun the applicable test suites whenever changes are made: run `pnpm test:web` (or targeted component tests) for frontend changes, and execute the relevant Maven/JUnit integration or unit tests for backend changes. Verify that all assertions and timers pass cleanly before reporting task completion.
- Never delete, weaken, skip, quarantine, or mark a test flaky merely to pass CI. If a test appears wrong, explain the requirement conflict and obtain approval before changing its asserted behavior.
- Mock external LLM, payment, email, OAuth, storage, and meeting-provider calls in automated tests. CI must not contact billable or production services.
- If a required tool or dependency is missing, report it and install only through the repository's declared package manager or wrapper. Request network/cache access when needed; do not silently skip a check or create an alternate temporary dependency cache.
- Fix failures caused by the current change. Report unrelated failures with exact evidence and do not broaden the patch without authorization, except for an immediate security/data-loss hazard that makes continued work unsafe.

Use proportionate, risk-based validation to conserve time and output. During iteration and handoff, run the smallest test and check set that directly covers the changed behavior plus its plausible regressions. Do not run full backend, frontend, or repository-wide suites by default when targeted commands provide sufficient evidence. Run broader gates only when the change crosses stacks or contracts, changes shared configuration or a release baseline, targeted evidence exposes broader risk, or the user explicitly requests them. Report any broader checks intentionally not run.

The available focused commands include:

```bash
pnpm contract:build
pnpm check:generated
pnpm typecheck:web
pnpm lint:web
pnpm test:web
pnpm build:web
cd services/api && ./mvnw --batch-mode verify
```

Run `make verify` for contract-to-frontend, cross-stack, dependency, shared configuration, or release-baseline changes. Run Playwright for user journeys and Compose build/health/smoke checks for container or cross-service behavior. For material UI changes, also verify a narrow mobile viewport, a desktop viewport, keyboard focus order, reduced motion, and layout-sensitive content in Indonesian, English, and Chinese; record visual evidence when the active slice requires it.

## Git and delivery protocol

- Keep one issue and one coherent change per branch/worktree once shared history exists. Split work into reviewable slices without leaving intermediate states that fail their applicable checks.
- Do not stage unrelated files or disturb the user's existing index. Stage only when requested or when the active task explicitly requires a staged handoff.
- Never commit, push, force-push, merge, rebase, create a pull request, or modify remote repository settings unless the user explicitly asks.
- Suggested commit messages follow Conventional Commits: `type(scope): imperative summary`. Use the language requested by the user; do not add `Co-authored-by` or `Signed-off-by` trailers unless requested.

## Completion report

Return:

- files changed;
- behavior and requirement coverage changed;
- tests/checks run with exact results;
- security/privacy and migration consequences;
- risks, assumptions, and observed unrelated issues;
- explicitly excluded follow-up work;
- a suggested Conventional Commit message when the change is ready, without committing it.
