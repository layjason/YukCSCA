# Delivery documentation system

> **Classification: executable delivery process, non-normative product content.** Product meaning remains in the paired requirements. This process turns accepted user outcomes into bounded, contract-first implementation work.

## Why this exists

Coding agents perform poorly when asked to infer a feature from a large requirements document, a broad backlog, and a generic repository plan. YukCSCA therefore uses four distinct layers:

1. **Requirements** — normative product truth.
2. **User stories** — reusable decomposition of user-observable outcomes.
3. **Delivery plan index** — versioned order, status, and dependencies for slices.
4. **Vertical-slice plan** — the only implementation brief for one accepted end-to-end change.

A bounded human-decision gate sits between shaping and contract readiness when these layers do not determine a material choice. It is a gate, not a fifth source of product truth. See [`HUMAN_REVIEW.md`](HUMAN_REVIEW.md).

TypeSpec remains the executable public HTTP boundary. A slice plan does not replace TypeSpec, and TypeSpec does not replace user behavior or acceptance criteria.

## Required artifact for feature implementation

Every accepted feature slice has exactly one file under `docs/delivery/` named:

```text
VS-NNN-short-name.md
```

A slice file must be complete enough for a new agent to implement the outcome without reopening the entire product design. It includes:

- selected story IDs and exact requirement sections;
- one demonstrable user outcome;
- explicit in-scope and out-of-scope behavior;
- UI flow and route ownership;
- TypeSpec operation and model inventory;
- domain state transitions, persistence ownership, and migration impact;
- authorization, privacy, audit, idempotency, and failure behavior;
- observability events that avoid unnecessary private content;
- acceptance-criterion-to-test evidence;
- ordered implementation steps and handoff requirements.

Use [`SLICE_TEMPLATE.md`](SLICE_TEMPLATE.md). Do not create empty future slice files. A proposed roadmap row becomes a file only when shaping begins.

## Slice lifecycle

| Status              | Meaning                                                            | Required evidence                                                                                                        |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `PROPOSED`          | Sequenced hypothesis only                                          | Roadmap row in `docs/PLAN.md`                                                                                            |
| `SHAPING`           | Product and technical boundaries are being resolved                | Slice file exists; documentation sufficiency review is underway                                                          |
| `AWAITING_DECISION` | A material human decision blocks the affected contract or behavior | Stable decision IDs, recommendation, owner, and exact missing/conflicting evidence are recorded                          |
| `CONTRACT_READY`    | Public boundary is accepted and compiles                           | TypeSpec models/operations exist; generated contract reviewed; no unimplemented behavior is advertised outside the slice |
| `IN_PROGRESS`       | Implementation has started                                         | Contract-ready plan; task checklist is being updated                                                                     |
| `VERIFYING`         | User flow is implemented and evidence is being collected           | Frontend, backend, persistence, and tests are integrated                                                                 |
| `DONE`              | The actor can complete the real closed loop                        | Acceptance evidence, applicable checks, documentation, and architecture snapshot are updated                             |
| `BLOCKED`           | A named decision or dependency prevents progress                   | Blocker, owner, and unblock condition recorded                                                                           |
| `SUPERSEDED`        | Replaced by a newer plan revision or slice                         | Replacement link and reason recorded                                                                                     |

A slice may not move from `SHAPING` or `AWAITING_DECISION` to implementation before it is `CONTRACT_READY` when it changes public HTTP behavior. `AWAITING_DECISION` is used only for material blockers, not ordinary implementation preferences.

## Plan versioning

Documentation versions are deliberate review markers, not package versions and not runtime API versions.

- `docs/PLAN.md` has a repository delivery-plan version such as `0.3.0`.
- Every slice has an independent integer `Plan revision` beginning at `1`.
- Increase the slice revision when scope, state transitions, contract shape, acceptance mapping, or implementation order materially changes.
- Small wording fixes do not require a new revision.
- Git history records the diff; the slice `Revision history` records why the implementation brief changed.
- Do not add pnpm scripts or generated lock files solely to validate plan metadata. Review the version and traceability in the pull request.

## Agent execution protocol

For any feature request, an agent must:

1. Read `AGENTS.md`, `docs/README.md`, and the active row in `docs/PLAN.md`.
2. Read the slice file and only the linked requirement/story sections first.
3. Inspect current architecture, TypeSpec, and the nearest directory `AGENTS.md`.
4. Complete the slice's documentation-sufficiency review. If a material ambiguity remains, follow `HUMAN_REVIEW.md`, mark the gate `AWAITING_DECISION`, and ask one bounded question at a time.
5. After each answer, update the owning artifact immediately: paired requirements, stories/coverage, glossary, slice, TypeSpec, or a rare decision record.
6. Change TypeSpec first for approved public HTTP behavior, then generated declarations, backend, frontend, persistence, tests, and documentation in one coherent slice.
7. Update the slice checklist with exact evidence; never mark `DONE` from code existence alone.
8. Update `ARCHITECTURE.md` only with implemented current state, not planned state.

## Focused shaping review

A good shaping review stress-tests the slice instead of asking broad preference questions. The agent should construct concrete scenarios around success, authorization, privacy, retry, stale state, failure, and adjacent actor handoffs. A question is justified only when different reasonable answers would change the accepted flow, state model, contract, data boundary, or irreversible architecture.

Limits:

- one question at a time;
- no more than three blocking questions per review round;
- every question includes the evidence gap, concrete options where applicable, a recommended answer, and the consequence of each choice;
- unresolved questions stay in the slice and block only affected behavior;
- no renewed approval loop after the gate is approved and the slice reaches `CONTRACT_READY`.

The repository uses `docs/GLOSSARY.md` as its domain-language model. Resolve overloaded terms there, not in a new `CONTEXT.md`. Record a separate decision under `docs/decisions/` only when the choice is costly to reverse, surprising, and a genuine trade-off.

## Slice sizing rules

A good slice normally has:

- one primary actor;
- one observable outcome;
- one main state transition or a tightly coupled transaction;
- a small operation set, commonly one command plus the reads needed to observe it;
- a demonstrable success path and at least one validation, authorization/privacy, and retry/stale-state path;
- no unrelated CRUD bundle.

Split a slice when it combines different actors, independent approvals, unrelated lifecycle transitions, or separate commercial/learning outcomes. Keep a coupled transaction together when splitting would make neither half demonstrable, such as verified payment plus exactly-once entitlement issuance.

## Pull-request handoff

The pull request should link the slice ID and state:

- plan revision implemented;
- TypeSpec files and operations changed;
- acceptance criteria proven by test name or manual evidence;
- migrations and rollback/disable behavior;
- exact commands run and results;
- remaining risks or intentionally deferred behavior.

The repository uses review discipline and plan revisions for this traceability. No additional pnpm documentation-check script is required.
