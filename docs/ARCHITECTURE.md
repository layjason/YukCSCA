# Current architecture

> **Classification: descriptive current state.** This document describes the repository as implemented. It does not create or modify product requirements. Verify changing details against code and configuration.

## System shape

YukCSCA is a pnpm workspace containing a React web application, one Spring Boot modular-monolith API, a TypeSpec contract package, and one PostgreSQL database.

```text
apps/web/       React application
contracts/      TypeSpec source and generated OpenAPI
services/api/   Spring Boot modular monolith
```

Local orchestration uses Docker Compose. CI uses GitHub Actions. There are no microservices, queues, caches, vector stores, object-storage services, Python services, or AI SDKs in the current baseline.

```text
Browser ──► Nginx web container ──► Spring Boot API ──► PostgreSQL 18
             │                       │
             ├─ serves built React   └─ owns auth/session decisions
             └─ proxies /api and health only
```

## Active technology

| Area           | Current implementation                                                                      |
| -------------- | ------------------------------------------------------------------------------------------- |
| Workspace      | pnpm 11 workspace with one lockfile; Node.js 24                                             |
| Web            | React 19, Vite 8, strict TypeScript 5.9, React Router, i18next                              |
| API contract   | TypeSpec 1.14 → OpenAPI 3.1 → generated TypeScript declarations                             |
| API            | Java 21, Spring Boot 4.1, Spring Security, JPA, Flyway                                      |
| Data           | PostgreSQL 18                                                                               |
| Tests          | Vitest/Testing Library, JUnit/Testcontainers, Playwright                                    |
| Operations     | Actuator health, structured logs, Docker Compose, GitHub Actions                            |
| Security tools | Gitleaks; dependency updates are manually reviewed; GitHub premium security checks inactive |

## Contract boundary

TypeSpec under `contracts/` is the only hand-edited public HTTP definition. Generated OpenAPI and frontend declarations are committed review artifacts and contain no business logic.

An HTTP change is complete only when TypeSpec, generated artifacts, backend transport behavior, frontend client behavior, and relevant tests agree.

Public error bodies use the shared TypeSpec problem shape and `application/problem+json`. Stable application codes are required. Spring Security preserves the RFC 6750 bearer challenge while adding the same structured body for filter-chain `401` and `403` responses; authentication rate limiting uses that canonical writer and also returns `Retry-After`.

## Backend boundaries

The backend currently has `identity` and `profile` modules. Identity owns users, Google identities, YukCSCA sessions, roles, security events, and session retention. Profile owns student-profile state and activation validation. Profile reaches identity only through a narrow application-facing account activation API; it does not import identity persistence or infrastructure.

```text
<module>/
├── api/             HTTP translation and request validation
├── application/     use cases and transaction boundaries
├── domain/          business state and rules
└── infrastructure/  persistence, security, and provider adapters
```

Within a module, dependencies point toward application/domain code. Another module may not import a repository, JPA entity, controller, or infrastructure implementation. A new module is created with its first accepted vertical slice, never as empty scaffolding.

Flyway owns the PostgreSQL schema. Migrations are append-only after the first shared deployment. Integration tests run the production migrations against PostgreSQL through Testcontainers.

The Compose named volume mounts `/var/lib/postgresql`, matching the official PostgreSQL 18+ image's versioned `PGDATA` layout below that directory. The older `/var/lib/postgresql/data` convention applies to PostgreSQL 17 and earlier and must not be substituted without an explicit data-migration plan.

## Frontend boundaries

```text
app -> features -> shared
```

- `app` owns routing and composition.
- A feature owns its UI, state, validation, and API adapter.
- `shared` contains reusable primitives and may not import a feature.
- Access tokens remain in memory; refresh credentials are server-managed `HttpOnly` cookies.
- The shell resolves interface language from a valid local choice, then a supported browser locale, then English; explicit interface-language changes persist locally.
- Student-profile default explanation language is persisted during activation. Interface locale and per-subject exam language remain separate concepts and are not inferred from it.
- Vite and Nginx expose the same web-origin proxy surface: `/api` plus health-only `/actuator/health`; other Actuator routes are not proxied through the web application.

## Implemented identity slice

The current public identity slice is the Google-only qualification stated directly in the requirements. The browser obtains a Google ID credential; the API verifies signature, issuer, audience, expiry, and verified email and identifies the provider account by `sub`.

```text
Google credential ──► POST /api/v1/auth/google ──► provider verification
                                           │
                                           ├─► hashed refresh session in PostgreSQL
                                           └─► access token in response + HttpOnly refresh cookie

HttpOnly cookie ──► POST /api/v1/auth/refresh ──► rotate refresh token family
Sign out         ──► POST /api/v1/auth/logout  ──► revoke session + clear cookie
```

YukCSCA then issues a short-lived access JWT and a rotating refresh token. Refresh tokens are stored only as hashes, replay revokes the token family, logout revokes the session, authentication endpoints are rate-limited, security events are persisted, and expired/old revoked sessions are cleaned up.

New accounts are `UNASSIGNED`. The web routes them to the student-activation form. `POST /api/v1/student-profile` atomically creates the profile and moves the account to `STUDENT`; it returns canonical current-user state plus a replacement access token without rotating the refresh session. `GET /api/v1/student-profile/me` exposes only the authenticated student's own profile. Flyway migration `V3__student_profile.sql` owns the profile table and its unique account relationship.

The repository does not yet implement profile editing, other role onboarding, the P0 learning loop, parent linking, content management, assessment, billing, tutoring, or AI behavior.

## External integrations

Provider calls belong behind application ports and infrastructure adapters. Domain code never depends directly on OAuth, LLM, payment, email, meeting, or storage SDKs. Deterministic services retain control of authorization, grading, mastery, feasibility, entitlements, publication, and money.
