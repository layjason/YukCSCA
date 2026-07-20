# YukCSCA documentation

## Product authority

> **NORMATIVE PRODUCT AUTHORITY:** [English requirements](requirements/YukCSCA平台需求_EN.md) and [中文需求](requirements/YukCSCA平台需求_CN.md) are the only authoritative statements of what YukCSCA must do. They are equal, paired documents and must remain semantically synchronized.

Implementation, contracts, architecture notes, security guidance, plans, issues, and code comments may explain or implement a subset of the requirements. They do not amend, narrow, or override them. A temporary delivery qualification is valid only when it is written into both requirement documents.

If the two requirement documents disagree, or another artifact conflicts with them, stop the affected work and resolve the requirements first.

## Documentation map

| Document                                                     | Classification               | Purpose                                                                                       |
| ------------------------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------- |
| [Requirements — English](requirements/YukCSCA平台需求_EN.md) | **Normative**                | Complete product behavior and non-functional obligations.                                     |
| [需求文档 — 中文](requirements/YukCSCA平台需求_CN.md)        | **规范性**                   | 完整产品行为与非功能性要求，与英文版具有同等权威。                                            |
| [Architecture](ARCHITECTURE.md)                              | Descriptive current state    | What the repository implements now and where its code boundaries are.                         |
| [Development](DEVELOPMENT.md)                                | Executable contributor guide | Toolchain, local workflow, validation, CI checks, and repository settings.                    |
| [Security](SECURITY.md)                                      | Supporting control model     | Implemented controls and gates that must exist before sensitive features are introduced.      |
| [Plan](PLAN.md)                                              | **Non-normative plan**       | Possible implementation sequence and dependency activation triggers; not acceptance criteria. |
| [Glossary](GLOSSARY.md)                                      | Supporting definitions       | Shared vocabulary; requirements win if wording ever conflicts.                                |

Repository-wide coding rules live in [`AGENTS.md`](../AGENTS.md). The public HTTP boundary is defined by TypeSpec under [`contracts/`](../contracts/). Those are engineering authorities for how accepted requirement slices are implemented, not alternate product requirements.

## Maintenance convention

- Change product meaning in both requirement documents in the same change.
- Keep requirement version, date, contents, stable navigation anchors, and revision history synchronized.
- Put current implementation facts in `ARCHITECTURE.md`, not in a decision-history file.
- Put repeatable commands and quality gates in `DEVELOPMENT.md`, not in transient audit reports.
- Put uncertain sequencing, future dependencies, and experiments in `PLAN.md` and label them non-normative.
- Delete superseded guidance instead of retaining “old” and “new” versions in parallel.
- Prefer links to the authoritative source over copying the same rule into several documents.
