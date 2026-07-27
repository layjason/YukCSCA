# Decision records

> **Classification: supporting architectural rationale.** Decision records explain important choices; they do not override the paired requirements or an accepted slice.

Create this directory's first decision record only when a choice is:

1. costly to reverse;
2. surprising without context; and
3. the result of a genuine trade-off.

Routine product and implementation decisions stay in the active slice plan. Canonical terms belong in `docs/GLOSSARY.md`.

Create an ADR during shaping of the first concrete slice that needs the
decision. Do not create one before a related outcome exists, use it to
pre-approve speculative infrastructure, or substitute it for the slice plan.

## Naming

Use sequential files:

```text
ADR-0001-short-title.md
ADR-0002-short-title.md
```

## Concise format

```markdown
# ADR-0001 — Short decision title

| Field         | Value                    |
| ------------- | ------------------------ |
| Status        | `PROPOSED` or `ACCEPTED` |
| Date          | YYYY-MM-DD               |
| Related slice | `VS-NNN`                 |

State the context, chosen option, and why in one to three short paragraphs.

## Considered alternatives

Include only alternatives worth remembering.

## Consequences

Include only non-obvious constraints, migration effects, or future reversal cost.
```

A decision record should remain short. If it becomes a feature specification, move that material back to the relevant slice plan.
