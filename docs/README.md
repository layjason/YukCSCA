# YukCSCA documentation

## Authority model

> **NORMATIVE PRODUCT AUTHORITY:** [English requirements](requirements/YukCSCA平台需求_EN.md) and [中文需求](requirements/YukCSCA平台需求_CN.md) are the only authoritative statements of what YukCSCA must do. They are equal, paired documents and must remain semantically synchronized.

Implementation artifacts may select, clarify, and implement a subset. They never amend or silently narrow the requirements. A delivery qualification is valid only when it appears in both requirement documents.

The engineering authority stack is:

1. **Paired requirements** — product meaning and obligations.
2. **Accepted delivery brief** — a production `VS-NNN` slice, or an explicitly non-production `PX-NNN` journey prototype that cannot create product meaning.
3. **TypeSpec** — executable public HTTP boundary when the accepted production slice changes HTTP behavior; a no-HTTP PX brief must leave it unchanged.
4. **Root `DESIGN.md`** — visual and interaction authority for already accepted behavior; it never creates product behavior.
5. **Architecture/security/development documents** — current constraints and repeatable engineering practice.
6. **Implementation and tests** — delivered behavior and evidence.

If the bilingual requirements disagree, or a lower layer conflicts with a higher layer, stop the affected work and resolve the conflict rather than choosing silently.

## Documentation map

| Document                                                     | Classification                   | Purpose                                                                                  |
| ------------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------- |
| [Requirements — English](requirements/YukCSCA平台需求_EN.md) | **Normative**                    | Complete English product behavior and NFR obligations.                                   |
| [需求文档 — 中文](requirements/YukCSCA平台需求_CN.md)        | **规范性**                       | 与英文版具有同等权威的完整中文需求。                                                     |
| [User stories](requirements/USER_STORIES.md)                 | Supporting decomposition         | Small actor/outcome stories and Given/When/Then acceptance candidates.                   |
| [Story coverage](requirements/COVERAGE.md)                   | Supporting traceability          | Requirement-to-story coverage audit and known backlog gaps.                              |
| [Delivery plan](PLAN.md)                                     | **Versioned non-normative plan** | P0 vertical-slice order plus selected experience milestones, status, and dependencies.   |
| [Delivery process](delivery/README.md)                       | Executable delivery guide        | Slice lifecycle, TypeSpec gate, plan revisions, and agent handoff rules.                 |
| [Human decision gates](delivery/HUMAN_REVIEW.md)             | Executable shaping guide         | Bounded questioning, escalation triggers, approval scope, and decision write-back rules. |
| [Decision records](decisions/README.md)                      | Supporting rationale             | Lazy concise records for hard-to-reverse, surprising trade-offs.                         |
| [Slice template](delivery/SLICE_TEMPLATE.md)                 | Executable template              | Required structure for an accepted vertical-slice implementation brief.                  |
| [Design workflow](design/README.md)                          | Executable design guide          | Agent workflow for tokens, prototypes, states, motion, accessibility, and review.        |
| [Architecture](ARCHITECTURE.md)                              | Descriptive current state        | What the repository implements now and current code boundaries.                          |
| [Development](DEVELOPMENT.md)                                | Executable contributor guide     | Toolchain, local workflow, validation, CI, and repository setup.                         |
| [Security](SECURITY.md)                                      | Supporting control model         | Implemented controls and gates before sensitive features.                                |
| [Glossary](GLOSSARY.md)                                      | Supporting definitions           | Shared vocabulary; requirements win on conflict.                                         |

Repository-wide durable coding rules live in [`AGENTS.md`](../AGENTS.md). Root [`DESIGN.md`](../DESIGN.md) is the persistent visual and interaction contract for coding agents. Directory-specific rules live in the nearest nested `AGENTS.md`. Public HTTP behavior is hand-edited only in TypeSpec under [`contracts/`](../contracts/).

## Agent reading order

### Feature implementation

1. `AGENTS.md`
2. `docs/PLAN.md` and the selected `docs/delivery/VS-NNN-*.md` or `docs/delivery/PX-NNN-*.md`
3. Only the linked English and Chinese requirement sections
4. The linked stories and `requirements/COVERAGE.md`
5. `delivery/HUMAN_REVIEW.md` when documents are insufficient or a gate is open
6. `GLOSSARY.md` and related decision records
7. Root `DESIGN.md` and `design/README.md` for UI or interaction work
8. `ARCHITECTURE.md`, `SECURITY.md`, `DEVELOPMENT.md`
9. The nearest directory `AGENTS.md`
10. Existing TypeSpec, implementation, migrations, and tests

If requested implementation has no accepted delivery brief, shape it first. Do not infer a broad implementation plan from the backlog alone. When the documents do not determine material behavior, use the bounded human-decision gate rather than guessing or starting an unlimited interview.

### Bug fix or maintenance

Read the relevant current-state documentation, nearest agent rules, implementation, and tests. Link the bug to the slice or requirement whose delivered behavior is being corrected. A new product outcome still requires a slice plan.

## Documentation ownership

- Change product meaning in both requirement documents in the same change.
- Add or revise user stories when requirement decomposition changes; update the coverage audit version/snapshot.
- Put delivery order and status only in `PLAN.md`.
- Put one accepted production implementation brief in `delivery/VS-NNN-*.md`, or one explicitly non-production journey brief in `delivery/PX-NNN-*.md`. Keep its scoped human decisions in that same file.
- Put canonical domain language in `GLOSSARY.md`; do not add a parallel `CONTEXT.md`.
- Create a concise decision record only for a hard-to-reverse, surprising choice with real alternatives.
- Put current implemented facts only in `ARCHITECTURE.md`.
- Put repeatable commands and quality gates only in `DEVELOPMENT.md`.
- Put shared visual tokens, component roles, motion principles, and anti-pattern boundaries in root `DESIGN.md`; put the agent application workflow in `design/README.md`.
- Put durable repository behavior in `AGENTS.md`, not in a temporary slice plan.
- Keep TypeSpec in domain-oriented `.tsp` files; the slice plan references exact operations rather than creating duplicate contract prose.
- Delete superseded guidance or mark a slice `SUPERSEDED` with a replacement. Do not keep competing “old” and “new” instructions active.

## Versioning convention

- Requirement versions are synchronized in both normative documents.
- The user-story backlog has its own version.
- `PLAN.md` has a delivery-plan version.
- Every slice has an integer plan revision and a revision history.
- Runtime/API/package versions remain independent from documentation versions.
- Plan and backlog versions are reviewed through Git and pull-request evidence. Do not add a pnpm script solely to check documentation metadata.
