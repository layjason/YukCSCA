# Current architecture

> **Classification: descriptive current state.** This file records implemented
> boundaries, not product requirements or future commitments. Verify changing
> details against code and configuration.

## Topology and stack

YukCSCA is a pnpm workspace with one React web app, one Spring Boot modular
monolith, one TypeSpec package, and one PostgreSQL database.

```text
apps/web/       React application
contracts/      TypeSpec source and generated OpenAPI
services/api/   Spring Boot modular monolith

Browser -> Nginx/React -> Spring Boot API -> PostgreSQL 18
             |
             +-> proxies /api and health only
```

| Area       | Current implementation                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Workspace  | Node.js 24, pnpm 11, one lockfile                                      |
| Web        | React 19, Vite 8, strict TypeScript, React Router, i18next, CSS tokens |
| Contract   | TypeSpec 1.14 → OpenAPI 3.1 → generated TypeScript declarations        |
| API/data   | Java 21, Spring Boot 4.1, Spring Security, JPA, Flyway, PostgreSQL 18  |
| Testing    | Vitest, Testing Library, JUnit, Testcontainers, Playwright             |
| Operations | Docker Compose, Actuator health, structured logs, GitHub Actions       |

No microservices, queues, caches, vector/object stores, Python services, AI
SDKs, or external UI/animation frameworks are active.

## Contract and backend boundaries

- TypeSpec under `contracts/` is the only hand-edited public HTTP contract.
  Generated OpenAPI and frontend declarations are committed outputs, never
  patched manually.
- HTTP changes update TypeSpec, generated artifacts, backend transport,
  frontend client behavior, and tests together.
- Public failures use the shared `application/problem+json` shape and stable
  codes. Bearer failures preserve `WWW-Authenticate`; rate limits preserve
  `Retry-After`.

The API currently contains `identity` and `profile` modules:

```text
<module>/
├── api/             HTTP translation and request validation
├── application/     use cases and transactions
├── domain/          business state and rules
└── infrastructure/  persistence, security, provider adapters
```

Identity owns accounts, Google identities, roles, sessions, security events,
and retention. Profile owns student activation and profile state, reaching
identity only through an application-facing activation API. Modules never
import another module's repository, JPA entity, controller, or infrastructure.
New modules appear only with their first accepted use case.

Flyway owns the schema; shared migrations are append-only. Integration tests use
the production migrations with PostgreSQL through Testcontainers.

## Frontend boundaries

```text
app -> features -> shared
   \-> prototype/student  -> shared
   \-> prototype/consumer -> shared
```

- `app` owns routes, guards, layouts, and composition.
- `features` owns production UI, state, validation, and API adapters.
- `prototype/*` owns explicitly non-production fixture flows.
- `shared` imports neither features nor prototypes. Production and prototype
  runtime modules never import each other.
- `app/routes.ts` is the typed navigation and audience manifest.
- Root `DESIGN.md` defines visual roles; `styles.css` mirrors its semantic
  tokens, focus behavior, and reduced-motion rules.
- Interface, explanation, and per-subject exam languages remain independent.
- Access tokens stay in memory; refresh credentials remain server-managed
  `HttpOnly` cookies.
- Vite and Nginx expose the same-origin `/api` and health-only proxy surface.

## Implemented production flows

Production authentication is Google-only:

```text
Google credential -> /api/v1/auth/google -> verified Google identity
                                      |-> access JWT
                                      +-> hashed refresh session + HttpOnly cookie

refresh cookie -> /api/v1/auth/refresh -> rotated token family
sign out       -> /api/v1/auth/logout  -> revoked session + cleared cookie
```

The API verifies signature, issuer, audience, expiry, verified email, and Google
`sub`. Refresh tokens are stored only as hashes; replay revokes the family.
Authentication is rate-limited, security events are persisted, and expired or
old revoked sessions are cleaned up.

New accounts are `UNASSIGNED`. `POST /api/v1/student-profile` atomically creates
one student profile and changes the account to `STUDENT`; it returns canonical
current-user state and a replacement access token. The profile is private to
its authenticated student.

Production email/password credentials, recovery, other role onboarding, profile
editing, learning, family, content, commerce, tutoring, and AI behavior do not
exist yet.

## Prototype boundaries

Both prototypes keep domain state in deterministic React context/reducer memory.
That state makes no production API, browser-storage, cookie, analytics, or
telemetry writes, and refresh may reset it.

### PX-001 student preview

- `prototype/student/` owns goal, diagnostic, plan, learning, practice,
  remediation, mock, language, access, and state-loss scenarios.
- App guards connect production `STUDENT` activation to the preview while
  preserving anonymous, `UNASSIGNED`, unsupported-role, and incomplete-preview
  redirects.
- Fixture academic state is visibly labelled Preview and never expands
  generated API types.

### PX-002 consumer preview

- `prototype/consumer/` owns public discovery, fixture credentials, role intent,
  Parent/family, commerce, notification, account, and support journeys.
- `PreviewCredentialSession` never becomes production `CurrentUser`, tokens,
  cookies, or role. Google Student still uses production activation; fixture
  Student enters PX-001; Parent intent remains preview-only.
- Scope guards separately protect Student, Parent, and linked-recipient commerce
  routes. Parent commerce requires one active linked fixture student.
- Commerce fixtures demonstrate deterministic order IDs, immutable terminal
  outcomes, provider authority, and exactly-once entitlement from a matching
  Paid order. Payment instructions are visibly non-payable samples.
- PX-002 is a low-fidelity, mostly text-led journey model, not a production UI
  or data-model baseline. Each owning slice must re-read the latest requirements
  and design guidance, implement under `features`, and deliberately reuse,
  rewrite, or delete its prototype code.

## Integration rule

External OAuth, email, payment, LLM, meeting, storage, and similar providers
belong behind application ports and infrastructure adapters. Deterministic
services—not providers or models—retain authority for access, grading, mastery,
feasibility, publication, entitlements, and money.
