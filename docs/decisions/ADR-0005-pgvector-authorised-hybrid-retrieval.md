# ADR-0005 — pgvector in existing PostgreSQL for authorised hybrid retrieval

| Field         | Value                                 |
| ------------- | ------------------------------------- |
| Status        | `ACCEPTED`                            |
| Date          | 2026-09-01                            |
| Related slice | `VS-011` (`D-09`)                     |
| Depends on    | `ADR-0004`; published academic blocks |

`VS-011` must search beyond the current lesson when the student asks “where else in this package”. Product owner 2026-09-01 required a real retrieval loop in this slice, not getters-only. The first measured vector use is the **pgvector extension on the existing PostgreSQL 18 database**, storing embeddings of published, student-authorisable TEXT/MATH chunks keyed by `packageRevisionId`. Lexical search (`tsvector` / BM25-equivalent) runs on the same chunks. Hits are authorised in Java before snippets reach the model.

This is not a second database, not an open-web index, and not MCP. Current-object getters still run first. Conversations do not retarget when a hit is another lesson; the hit is a **source locator**.

## Considered alternatives

- Getters only, send the whole current object — enough for short lessons; product owner rejected it for long lessons and cross-lesson questions.
- Dedicated vector service (Pinecone, Weaviate, a separate search cluster) — extra ops and a new datastore product; reversible later if measured need appears.
- Model-written regex over lesson text — ReDoS and weaker ranking than lexical + vector.
- Defer embeddings to a follow-on slice — would leave 6.3 “current object only” and split the CV-facing agent loop the product owner wanted in VS-011.

## Consequences

- Flyway enables pgvector and creates `agent_content_chunk` in the API database. Academic never imports the agent module and never embeds during publish. The agent indexes through a published-block read port after publish (lazy on first search of that revision, or a PostgreSQL-polled job). Lexical search remains available while vectors catch up.
- CI uses a fake `EmbeddingModel`. Production embedding provider is the same Spring AI configuration story as `ADR-0004`.
- Rollback: disable `searchAuthorisedContent`; getters and the Ask loop remain. Dropping the extension is a later ops step after the tool is off.
- VS-011 implements this in **wave 3** after getters (wave 1) and lexical search (wave 2). The student HTTP contract does not change between waves.
- MCP, Redis, a graph store, and open-web search stay out.
