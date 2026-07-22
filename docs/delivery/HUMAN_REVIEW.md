# Human-in-the-loop decision gates

> **Classification: executable delivery process, non-normative product content.** This guide controls when an agent must ask for a human decision and how that decision is written back into the repository. It does not create product requirements.

## Purpose

YukCSCA agents should challenge incomplete plans, contradictory language, and unsafe assumptions, but they must not turn normal implementation into an endless interview. Human review is required only when the available documents, contract, and code cannot determine a material product or architectural decision.

This repository adapts the useful parts of design grilling and domain-modeling into one bounded workflow:

1. inspect the evidence before asking;
2. test the proposed flow with concrete scenarios;
3. ask one material question at a time;
4. recommend a default rather than delegating all reasoning to the human;
5. update the correct document immediately after the answer;
6. continue without further permission once the approved boundary is clear.

## Evidence to inspect before asking

An agent must first inspect, in order:

1. the selected slice and its linked English and Chinese requirement sections;
2. the linked user stories and `docs/requirements/COVERAGE.md`;
3. `docs/GLOSSARY.md` for canonical domain language;
4. architecture, security, TypeSpec, migrations, implementation, and tests relevant to the flow;
5. earlier decisions under `docs/decisions/`, when any exist.

The question must identify the exact contradiction, missing branch, or undefined term found in those sources. Do not ask the human to repeat information already present.

## Mandatory human-decision triggers

Ask before continuing the affected behavior when uncertainty could change any of the following:

- the actor, user-observable outcome, required flow, or acceptance boundary;
- a role, authorization rule, parent/minor boundary, consent, retention, deletion, or private-data exposure;
- payment, refund, entitlement, tutoring hours, order ownership, or another financial state;
- a domain state transition, invariant, ownership boundary, or meaning of a canonical term;
- scored assessment, mastery evidence, exam-language behavior, or reviewed-content authority;
- a destructive or externally visible side effect;
- a breaking public contract or migration behavior;
- a hard-to-reverse architecture choice with meaningful operating or security cost;
- a contradiction between the paired requirements, slice, stories, glossary, TypeSpec, code, or tests;
- an acceptance criterion that cannot be demonstrated end to end from the current documents.

## Do not ask for these

The agent should decide and document these autonomously when existing repository rules are sufficient:

- reversible local implementation details;
- ordinary file placement within the established module structure;
- test names, fixtures, refactors, or error-handling mechanics already implied by the accepted contract;
- naming already settled by `docs/GLOSSARY.md`;
- whether to follow existing security, accessibility, localization, or generated-code rules;
- broad permission to implement an already approved `CONTRACT_READY` slice;
- speculative future preferences unrelated to the current closed loop.

Do not ask “What do you want?” or present an unbounded list of possibilities. Investigate first and narrow the decision.

## Question protocol

A shaping review follows these limits:

- Ask **one question at a time**.
- Ask at most **three blocking questions in one review round**.
- Give each question a stable slice-local ID such as `D-01`.
- State the source or scenario that exposed the gap.
- Present two or three concrete options when alternatives exist.
- State the agent's recommended option and why.
- State what changes depending on the answer: requirement, story, contract, state model, privacy, migration, or architecture.
- Make the question answerable by choosing an option or giving a short correction.

After three questions, update all resolved artifacts and summarize any remaining blockers. Do not continue asking indefinitely. A later review round is justified only by newly discovered evidence or a materially changed answer.

## Gate states

Each active slice records one human-gate state:

| Gate state          | Meaning                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `NOT_REQUIRED`      | The current documents determine all material behavior.                                                |
| `AWAITING_DECISION` | At least one blocking question is unresolved; implementation of the affected behavior must not start. |
| `APPROVED`          | The named decisions and approval scope are recorded; the slice may proceed to contract readiness.     |
| `REOPENED`          | New evidence contradicts or materially expands an earlier approval.                                   |

A gate approval is scoped to the recorded decisions. It is not blanket approval for unrelated behavior.

## Artifact routing after a decision

Update only the artifact that owns the resolved information:

| Resolved information                                                                      | Artifact to update                                                      |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Product obligation or qualification changed                                               | Both normative requirement documents, with explicit human approval      |
| Actor/outcome decomposition or acceptance flow clarified without changing product meaning | `USER_STORIES.md` and `COVERAGE.md`                                     |
| Delivery boundary, state transition, error behavior, or implementation order resolved     | The active `VS-NNN-*.md` or `PX-NNN-*.md` and its plan revision         |
| Canonical domain term resolved                                                            | `docs/GLOSSARY.md`                                                      |
| Public HTTP shape resolved                                                                | TypeSpec, only after the human gate permits contract work               |
| Hard-to-reverse, non-obvious trade-off resolved                                           | A concise decision record under `docs/decisions/`                       |
| Implemented current state                                                                 | `docs/ARCHITECTURE.md`, after implementation rather than during shaping |

An agent may improve traceability or decomposition without changing product semantics. It must not silently edit the normative requirements to make implementation easier.

## Domain-language review

`docs/GLOSSARY.md` is YukCSCA's domain-language document; do not create a parallel `CONTEXT.md`.

During shaping, the agent must:

- challenge overloaded terms with concrete alternatives;
- compare proposed language with the requirements and current code;
- use scenarios to expose different meanings;
- update the glossary as soon as a term is resolved;
- keep implementation details, APIs, and database design out of the glossary.

Important distinctions that must not collapse include:

- account identity versus student or parent profile;
- parent account versus active parent-student relationship;
- lesson completion versus evidence-backed mastery;
- explanation language versus interface language versus exam language;
- paid order versus granted entitlement;
- tutoring request versus confirmed booking.

## Decision-record threshold

Create a decision record lazily only when all three conditions apply:

1. reversing the choice later would be meaningfully costly;
2. the choice would be surprising without its context;
3. real alternatives were considered and a trade-off was made.

Routine slice decisions remain in the slice's human-decision table. See `docs/decisions/README.md` for the concise format.

## Working while blocked

When a slice is `AWAITING_DECISION`, the agent may still:

- inspect code and documents;
- produce a recommended decision with consequences;
- improve unrelated traceability;
- implement clearly independent work only when it cannot prejudge or constrain the pending decision.

It must not implement the ambiguous contract, persist speculative states, or advertise unresolved behavior.
