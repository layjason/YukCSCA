# ADR-0004 — Spring AI 2.0 as the first learning-agent adapter

| Field         | Value                                              |
| ------------- | -------------------------------------------------- |
| Status        | `ACCEPTED`                                         |
| Date          | 2026-09-01                                         |
| Related slice | `VS-011` (`D-02`)                                  |
| Depends on    | Bounded tools, schemas, traces, and evals in scope |

`VS-011` is the first slice that must call a model. The reusable harness that slice is required to bring — schema-validated structured output, allow-listed typed tools, embeddings for authorised hybrid search, budgets, and observations — already exists in Spring AI 2.0.1 `ChatClient` / `EmbeddingModel`, which targets Spring Boot 4.0/4.1 and matches this repository’s Java 21 / Boot 4.1.0 modular monolith. The adapter lives behind `AgentChatPort` in a new `agent` module; academic and assessment stay reachable only through application ports.

This decision does **not** add MCP servers, Redis, a graph store, a workflow engine, or a second video runtime. Grounding remains typed tool calls over authorised PostgreSQL/deterministic context, plus hybrid search whose vector half is [`ADR-0005`](ADR-0005-pgvector-authorised-hybrid-retrieval.md). The configured `ChatModel` and `EmbeddingModel` are environment-selected; CI uses fakes. Prompt/completion content stays out of logs and default observations.

## Considered alternatives

- Raw provider HTTP plus a handwritten tool/JSON-schema loop — rebuilds structured-output retry, tool caps, token observations, and embedding calls that `US-AGENT-06` would otherwise duplicate.
- LangChain4j or another agent runtime — overlapping surface, weaker Boot 4 alignment.
- Defer any model framework until a later slice — would ship VS-011 as a one-off loop and force a second harness for derived video.

## Consequences

- First Maven dependency is `spring-ai-bom` **2.0.1** plus the ChatClient/embedding/tool/observation stack, added only in the accepted `VS-011` implementation, not as an empty module.
- Rollback is `yukcsca.agent.enabled=false` and, if needed, replacing the `AgentChatPort` adapter; conversation rows remain student learning data.
- Product-owned pieces remain in-repo: prompt-injection handling beyond word lists, multilingual golden evaluations, versioned agent traces, answer-kind labelling, and Java authorisation of every tool hit. Spring AI evaluators are test utilities, not the product eval surface.
- Status is `ACCEPTED` with `VS-011` `D-02` (product owner 2026-09-01).
