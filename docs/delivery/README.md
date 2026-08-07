# Delivery documentation system

> **Classification: executable delivery process, non-normative product content.** Product meaning remains in the paired requirements. This process turns accepted user outcomes into bounded, contract-first implementation work.

## Why this exists

Coding agents perform poorly when asked to infer a feature from a large requirements document, a broad backlog, and a generic repository plan. YukCSCA therefore uses four distinct layers:

1. **Requirements** — normative product truth.
2. **User stories** — reusable decomposition of user-observable outcomes.
3. **Delivery plan index** — versioned order, status, and dependencies for slices.
4. **Delivery brief** — either one production vertical slice or one explicitly non-production product-journey milestone.

A bounded human-decision gate sits between shaping and contract readiness when these layers do not determine a material choice. It is a gate, not a fifth source of product truth. See [`HUMAN_REVIEW.md`](HUMAN_REVIEW.md).

TypeSpec remains the executable public HTTP boundary. A slice plan does not replace TypeSpec, and TypeSpec does not replace user behavior or acceptance criteria.

## Required artifact for implementation

Every accepted production feature slice has exactly one file under `docs/delivery/` named:

```text
VS-NNN-short-name.md
```

A slice file must be complete enough for a new agent to implement the outcome without reopening the entire product design. It includes:

- selected story IDs and exact requirement sections;
- one demonstrable user outcome;
- explicit in-scope and out-of-scope behavior;
- frontend route/state/ownership, prototype promotion, and design-system impact;
- technology/dependency need, alternatives, operating impact, removal, and ADR disposition;
- TypeSpec operation and model inventory;
- domain state transitions, persistence ownership, and migration impact;
- authorization, privacy, audit, idempotency, and failure behavior;
- observability events that avoid unnecessary private content;
- acceptance-criterion-to-test evidence;
- ordered implementation steps and handoff requirements.

Use [`SLICE_TEMPLATE.md`](SLICE_TEMPLATE.md). Do not create empty future slice files. A proposed roadmap row becomes a file only when shaping begins.

An accepted product-journey prototype has exactly one file named:

```text
PX-NNN-short-name.md
```

A `PX-NNN` brief exists only to validate cross-feature navigation, terminology, responsive hierarchy, interaction continuity, and data needs before production contracts exist. It must link the relevant requirement/story areas without claiming to implement them, isolate fabricated models and state from generated declarations and production features, prohibit production persistence and production semantic claims, define one integrated experience outcome and its complete acceptance evidence, and state promotion/deletion criteria. Implementation may be ordered internally, but an incomplete shell or disconnected page set cannot satisfy an accepted connected-journey milestone. A completed PX milestone never changes a referenced production slice from `PROPOSED`.

## Slice lifecycle

| Status              | Meaning                                                              | Required evidence                                                                                                                   |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `PROPOSED`          | Sequenced hypothesis only                                            | Roadmap row in `docs/PLAN.md`                                                                                                       |
| `SHAPING`           | Product and technical boundaries are being resolved                  | Slice file exists; documentation sufficiency review is underway                                                                     |
| `AWAITING_DECISION` | A material human decision blocks the affected contract or behavior   | Stable decision IDs, recommendation, owner, and exact missing/conflicting evidence are recorded                                     |
| `CONTRACT_READY`    | Backend-initialized public boundary is jointly reviewed and compiles | Initial and accepted checkpoints recorded; frontend consumer review complete; no contract request or human decision remains open    |
| `IN_PROGRESS`       | Implementation has started                                           | Accepted delivery brief; TypeSpec is contract-ready first when public HTTP behavior changes; task checklist is updated              |
| `VERIFYING`         | User flow is implemented and evidence is being collected             | Frontend, backend, persistence, and tests are integrated                                                                            |
| `DONE`              | The selected outcome is demonstrable                                 | A VS proves the real closed loop; a PX proves its labelled non-production outcome and isolation; all applicable evidence is updated |
| `BLOCKED`           | A named decision or dependency prevents progress                     | Blocker, owner, and unblock condition recorded                                                                                      |
| `SUPERSEDED`        | Replaced by a newer plan revision or slice                           | Replacement link and reason recorded                                                                                                |

A production slice may not move from `SHAPING` or `AWAITING_DECISION` to implementation before it is `CONTRACT_READY` when it changes public HTTP behavior. A no-HTTP `PX-NNN` brief may move from `SHAPING` to `IN_PROGRESS` once its documentation review is complete and its human gate is `NOT_REQUIRED` or `APPROVED`. `AWAITING_DECISION` is used only for material blockers, not ordinary implementation preferences.

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
2. Read the active delivery brief and only its linked requirement/story sections first.
3. Inspect current architecture, TypeSpec, the nearest directory `AGENTS.md`, and root `DESIGN.md` plus `docs/design/README.md` for UI work.
4. Complete the slice's documentation-sufficiency review, including technology/dependency and frontend/design impact. If a material ambiguity remains, follow `HUMAN_REVIEW.md`, mark the gate `AWAITING_DECISION`, and ask one bounded question at a time.
5. After each answer, update the owning artifact immediately: paired requirements, stories/coverage, glossary, slice, TypeSpec, or a rare decision record.
6. BACKEND agent validates the capability and adjacent-contract horizon, drafts the `VS-NNN`, and runs its human gate. For public HTTP it then initializes TypeSpec and records the initial checkpoint.
7. FRONTEND agent reviews the slice and generated contract as a consumer and records concrete `CR-NN` requests in the same slice. The backend agent accepts, declines, or escalates each request with evidence.
8. The backend agent marks `CONTRACT_READY` only after an accepted checkpoint is recorded and no request or human decision remains open. Both agents then implement separately from that slice revision and checkpoint.
9. Integrate the real flow early, update the slice checklist with exact evidence, and never mark `DONE` from code existence alone.
10. Update `ARCHITECTURE.md` only with implemented current state, not planned state. For a no-HTTP PX brief, keep prototype state behind its documented boundary and do not change TypeSpec.

## Focused shaping review

A good shaping review stress-tests the slice instead of asking broad preference questions. The agent should construct concrete scenarios around success, authorization, privacy, retry, stale state, failure, and adjacent actor handoffs. A question is justified only when different reasonable answers would change the accepted flow, state model, contract, data boundary, or irreversible architecture.

Limits:

- one question at a time;
- no more than three blocking questions per review round;
- every question includes the evidence gap, concrete options where applicable, a recommended answer, and the consequence of each choice;
- unresolved questions stay in the slice and block only affected behavior;
- no renewed approval loop after the gate is approved and the slice reaches `CONTRACT_READY`.

The repository uses `docs/GLOSSARY.md` as its domain-language model. Resolve overloaded terms there, not in a new `CONTEXT.md`. Record a separate decision under `docs/decisions/` only when the choice is costly to reverse, surprising, and a genuine trade-off.

## Two-agent contract workflow

Keep coordination inside the active slice; do not create a second contract-request document.

1. **Backend first:** validate the capability and adjacent-contract horizon, draft the `VS-NNN`, resolve or escalate its human decisions, initialize TypeSpec, generate its outputs, and record the initial checkpoint.
2. **Frontend review:** complete the frontend/experience sections and review the initialized contract against concrete screen states and user flows.
3. **Request loop:** record a `CR-NN` in the slice. The backend agent accepts and applies it, declines it with a supported alternative, or opens a `D-NN` through `HUMAN_REVIEW.md`.
4. **Readiness:** after frontend re-review and with no open request or decision, the backend agent records the accepted checkpoint and marks `CONTRACT_READY`.
5. **Implementation:** both agents work from that revision and checkpoint, update their own evidence, and do not cross ownership boundaries.
6. **Later changes:** a material request after readiness increments the slice revision, returns it to `SHAPING`, and pauses affected implementation until reviewed again.

A checkpoint records the slice revision, TypeSpec files/operations, generation result, and a commit or handoff reference when available. A slice without a public-HTTP change records that disposition and skips this contract loop.

Use the compact role prompts: [`backend-worker.md`](../prompts/backend-worker.md), [`frontend-worker.md`](../prompts/frontend-worker.md), or [`reviewer-worker.md`](../prompts/reviewer-worker.md). In Grok, reuse the project agents of the same names under [`.grok/agents/`](../../.grok/agents/) (`backend-worker`, `frontend-worker`, `reviewer-worker`) via `/config-agents` or `subagent_type`.

## Slice sizing rules

A production slice owns one capability-sized, demonstrable journey. It may
include a required actor handoff and several tightly coupled transitions when
they share one lifecycle or aggregate and are all needed to reach stable user
value.

Before TypeSpec work, inspect adjacent stories that may share this state or
contract. Record which relevant states, actors, invariants, and transitions are
included now and which remain deferred. Deferred behavior is not added to
TypeSpec or advertised by the UI.

Split at an independently valuable boundary, especially a separate
authorization/privacy decision, transaction, destructive lifecycle, external
authority, or releasable outcome. Keep work together when splitting would
create a non-valuable intermediate state or force the next slice to reopen the
same contract immediately. Operation count follows the accepted outcome; it is
not a fixed sizing target.

## Pull-request handoff

The pull request should link the slice ID and state:

- agent role and plan revision implemented;
- reviewed contract checkpoint plus TypeSpec files and operations changed;
- contract requests opened or resolved by the change;
- acceptance criteria proven by test name or manual evidence;
- migrations and rollback/disable behavior;
- exact commands run and results;
- remaining risks or intentionally deferred behavior.

The repository uses review discipline and plan revisions for this traceability. No additional pnpm documentation-check script is required.
