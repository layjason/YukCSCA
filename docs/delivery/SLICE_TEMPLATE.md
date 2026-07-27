# VS-NNN — Slice title

## Metadata

| Field                | Value               |
| -------------------- | ------------------- |
| Status               | `SHAPING`           |
| Human gate           | `NOT_REQUIRED`      |
| Plan revision        | 1                   |
| Updated              | YYYY-MM-DD          |
| Primary actor        |                     |
| Story IDs            |                     |
| Requirement sections | English: ; Chinese: |
| Depends on           |                     |
| Related ADRs         | None                |
| TypeSpec source      |                     |
| API operations       |                     |
| Implementation owner |                     |

## User-observable outcome

Write one sentence describing what the actor can complete and observe through the real application.

## Why this slice is the current boundary

Explain why this is a closed loop, why it is not smaller, and why adjacent behavior is excluded.

## In scope

-

## Out of scope

-

## Preconditions and dependencies

- Existing implemented state:
- Required data/content/provider setup:
- Feature flags or safe fallback:

## Technology and dependency impact

Complete this section even when no stack change is needed.

- Existing stack sufficient, with evidence:
- New or replaced technology and exact first use:
- Alternatives considered, including no new dependency:
- Security, privacy, bundle/runtime, build/deploy, operating, and licensing impact:
- Migration, compatibility, rollback, removal, and owner:
- ADR: `Not required — reason`, or `ADR-NNNN`

## User flow

1.
2.
3.

## Acceptance and implementation matrix

| AC ID | Given / When / Then | UI evidence | API/domain behavior | Persistence/audit | Test evidence |
| ----- | ------------------- | ----------- | ------------------- | ----------------- | ------------- |
| AC-01 |                     |             |                     |                   |               |

## Documentation sufficiency review

Complete this before contract work. Use `CLEAR`, `GAP`, or `CONFLICT`; a `GAP` or `CONFLICT` that changes material behavior must receive a decision ID below.

| Review area                                                   | Evidence inspected | Status | Gap or decision ID |
| ------------------------------------------------------------- | ------------------ | ------ | ------------------ |
| End-to-end actor flow and adjacent handoffs                   |                    |        |                    |
| Experience flow, screen states, recovery, and navigation      |                    |        |                    |
| Requirement/story coverage and exclusions                     |                    |        |                    |
| Domain terms, states, invariants, and ownership               |                    |        |                    |
| Authorization, privacy, minors, consent, and retention        |                    |        |                    |
| Failure, retry, idempotency, stale state, and recovery        |                    |        |                    |
| Contract, migration, external side effects, and compatibility |                    |        |                    |
| Technology/dependency need, alternatives, and ADR threshold   |                    |        |                    |
| Frontend ownership, prototype promotion, and design impact    |                    |        |                    |
| Acceptance evidence and observability                         |                    |        |                    |

## Human decision gate

Follow [`HUMAN_REVIEW.md`](HUMAN_REVIEW.md). Ask one question at a time and at most three per review round. `APPROVED` applies only to the recorded decisions and approval scope.

| Field             | Value                                                          |
| ----------------- | -------------------------------------------------------------- |
| Gate status       | `NOT_REQUIRED`, `AWAITING_DECISION`, `APPROVED`, or `REOPENED` |
| Decision owner    |                                                                |
| Approval scope    |                                                                |
| Approval evidence | Issue/chat/PR reference and date, or `Not yet approved`        |

| ID     | Blocking question and scenario | Agent recommendation | Owner | Status | Resolution and artifacts updated |
| ------ | ------------------------------ | -------------------- | ----- | ------ | -------------------------------- |
| `D-01` |                                |                      |       | `OPEN` |                                  |

## State model

### Owned states

```text
STATE_A -> STATE_B
```

### Invariants

-

### Concurrency, retry, and stale-state rules

- Idempotency boundary:
- Optimistic/stale update behavior:
- Duplicate event/callback behavior:

## TypeSpec contract plan

TypeSpec must be written and compile before implementation begins when the slice changes public HTTP behavior.

### Operations

| Operation | Method and route | Auth | Success | Required failures |
| --------- | ---------------- | ---- | ------- | ----------------- |
|           |                  |      |         |                   |

### Models and validation

| Model | Important fields | Validation/nullability | Ownership |
| ----- | ---------------- | ---------------------- | --------- |
|       |                  |                        |           |

### Contract decisions

- Cookie/token behavior:
- Error codes and problem details:
- Pagination/filtering if applicable:
- Compatibility or migration impact:

## Backend plan

- Module and package ownership:
- Application use cases and transaction boundaries:
- Domain rules:
- Ports/adapters:
- Flyway migration:
- Scheduled/async behavior, if any:

## Frontend plan

- Existing routes, layouts, components, and styles affected:
- Route/navigation entry, exit, and adjacent handoffs:
- Production feature folder and shared-boundary ownership:
- Prototype code classified for reuse, rewrite, or deletion:
- Contract-backed mock or real API boundary:
- Forms, client state, and validation authority:
- Loading, empty, error, retry, and stale states:
- Mobile, keyboard, screen-reader, localization, and low-bandwidth behavior:

## Experience and interaction plan

Follow root [`DESIGN.md`](../../DESIGN.md) and [`docs/design/README.md`](../design/README.md).

- Existing design roles sufficient, with evidence:
- `DESIGN.md` token/component/motion changes required before CSS:
- Shared primitive versus feature-owned styling:
- User goal and entry context:
- Exit state and next handoff:
- One primary action and secondary actions:
- Dominant surface/pastel semantic role:
- State transition and acknowledgement behavior:
- Purposeful micro-interactions or animation:
- Reduced-motion behavior:
- Prototype-only assumptions, if any:
- Mobile/desktop and Indonesian/English/Chinese visual-review evidence:

## Authorization, privacy, and safety

- Actor authorization:
- Field-level/minimum-data response:
- Minor/guardian consequence:
- Audit/security events:
- Sensitive logging restrictions:

## Observability

| Event/metric | Trigger | Allowed properties | Prohibited content |
| ------------ | ------- | ------------------ | ------------------ |
|              |         |                    |                    |

## Test plan

### Contract and backend

-

### Frontend component/integration

-

### End-to-end/manual evidence

-

## Implementation sequence

1. Complete the documentation sufficiency review and resolve all blocking human decisions.
2. Resolve technology/dependency need, alternatives, impact, removal, and the ADR threshold.
3. Resolve frontend ownership, prototype promotion/deletion, route/task flow, full UI state set, design-system impact, and interaction intent.
4. Update `DESIGN.md` before CSS when a shared token, component role, or motion rule changes.
5. Write/update TypeSpec and review generated OpenAPI.
6. Implement frontend against a contract-backed mock and backend/persistence against the same contract in risk-first order.
7. Integrate the real HTTP flow early and add HTTP/component coverage.
8. Add journey coverage for the actor-observable closed loop.
9. Verify observability, accessibility, localization, mobile/desktop layout, reduced motion, privacy, and failure recovery.
10. Update architecture, traceability, design/CSS alignment, and this plan's evidence.

## Definition of done

- [ ] Requirement/story references remain correct.
- [ ] Documentation sufficiency review is complete and every material gap/conflict is resolved or explicitly out of scope.
- [ ] Human gate is `NOT_REQUIRED` or `APPROVED`; approval scope and updated artifacts are recorded.
- [ ] Scope and exclusions match the delivered flow.
- [ ] The existing stack is confirmed sufficient, or each new/replaced technology records its first use, alternatives, impacts, rollback/removal, owner, and ADR disposition.
- [ ] TypeSpec compiles and generated artifacts match the accepted contract.
- [ ] Backend, frontend, migration, and tests implement the same states and errors.
- [ ] All acceptance criteria have named evidence.
- [ ] Authorization, privacy, minor safety, and audit behavior were reviewed.
- [ ] Mobile, accessibility, localization, low-bandwidth, reduced-motion, and failure states were verified where applicable.
- [ ] Frontend routes/components/styles and prototype reuse/rewrite/deletion are recorded; superseded preview paths are removed when production replaces them.
- [ ] The UI follows root `DESIGN.md`, uses semantic tokens, avoids prohibited generic/AI-like patterns, and records any intentional deviation.
- [ ] Any shared token/component/motion change was made in `DESIGN.md` first and remains aligned with CSS/shared primitives.
- [ ] The preceding and following journey handoff are coherent; prototype-only behavior is isolated from production contracts and routes.
- [ ] Observability contains no unnecessary private content.
- [ ] `docs/ARCHITECTURE.md`, `docs/PLAN.md`, and `docs/requirements/COVERAGE.md` reflect the result.
- [ ] Exact verification commands and results are recorded.

## Verification evidence

| Evidence               | Result  |
| ---------------------- | ------- |
| Contract build         | Not run |
| Technology/ADR review  | Not run |
| Backend tests          | Not run |
| Frontend tests         | Not run |
| Frontend visual review | Not run |
| End-to-end/manual flow | Not run |

## Revision history

| Revision | Date       | Change                 |
| -------- | ---------- | ---------------------- |
| 1        | YYYY-MM-DD | Initial shaping draft. |
