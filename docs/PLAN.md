# Implementation plan

> **NON-NORMATIVE:** This document is a changeable implementation hypothesis. It is not a product requirement, promise, release commitment, or acceptance criterion. The bilingual requirements define what the product must do; accepted issues define the next bounded slice.

## Planning principles

- Implement one end-to-end requirement slice at a time.
- Prefer learning-loop completeness over feature count.
- Validate implementation assumptions against the requirements and product assumptions with usage evidence before expanding infrastructure.
- Add a module, dependency, provider, or datastore only with its first implemented use case.

## Possible dependency activation

| Candidate                   | Earliest useful trigger                                                       | Evidence required before addition                                                                           |
| --------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| TanStack Query              | First screen with shared server state, mutations, and real invalidation needs | Query-key/invalidation design, loading/error UX, and removal of overlapping request state                   |
| React Hook Form + Zod       | First multi-step profile, goal, or diagnostic intake                          | Complex form evidence and one clear validation authority alongside TypeSpec                                 |
| KaTeX                       | First reviewed lesson or assessment containing mathematical notation          | CSP/font plan, accessible text, and representative rendering tests                                          |
| PostgreSQL full-text search | First catalog/search use case                                                 | Representative data, query requirements, and query-plan evidence                                            |
| Object-storage adapter      | First authorized content asset or student-file upload                         | Ownership, validation, malware, retention, deletion, and signed-access design                               |
| AI provider adapter         | First bounded guided-learning or remediation use case                         | Reviewed content, deterministic tools, schemas, injection defenses, budgets, traces, and golden evaluations |
| Shared rate-limit store     | Multiple API replicas or evidence that per-process limits are insufficient    | Measured topology/abuse need and operational ownership                                                      |

These are candidates, not pre-approved dependencies.

## Deferred by default

- Microservices and Kubernetes
- Message brokers and distributed workflow engines
- Redis, MinIO, pgvector, or a separate search service
- Spring AI or another model framework
- A Python runtime service
- PWA/service-worker caching
- GraphQL
- Multiple databases

Deferral is not a permanent prohibition. Addition requires a measured problem, comparison with a simpler option, security/operating impact, an owner, and a removal plan if the experiment fails.
