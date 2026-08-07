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

The API currently contains `identity`, `profile`, and `academic` modules:

```text
<module>/
├── api/             HTTP translation and request validation
├── application/     use cases and transactions
├── domain/          business state and rules
└── infrastructure/  persistence, security, provider adapters
```

Identity owns accounts, Google identities, roles, sessions, security events,
credential authenticators, pending email-verification claims, policy evidence,
verification delivery outbox state, password-recovery claims and delivery
state, and retention. Profile owns student activation and student-owned profile
maintenance, reaching identity only through application-facing account,
authentication, and security-event APIs. Academic owns the pilot Mathematics
package draft, immutable published revisions, bounded academic images, and
minimized administrative audit. It reaches identity only through the
application-facing current-account API. Modules
never import another module's repository, JPA entity, controller, or
infrastructure. New modules appear only with their first accepted use case.

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
- `app/routes.ts` is the complete typed authority for concrete paths, access
  groups, audience, navigation, availability, labels, and requirement
  traceability. `App.tsx` maps every route ID to one screen and composes the
  manifest access groups through the matching guards and layouts.
- Root `DESIGN.md` defines visual roles; `styles.css` mirrors its semantic
  tokens, focus behavior, and reduced-motion rules.
- Interface, explanation, and per-subject exam languages remain independent.
- Access tokens stay in memory; refresh credentials remain server-managed
  `HttpOnly` cookies.
- Vite and Nginx expose the same-origin `/api` and health-only proxy surface.

## Implemented production flows

Production authentication supports Google and the VS-002 credential boundary:

```text
Google credential -> /api/v1/auth/google -> verified Google identity
                                      |-> access JWT
                                      +-> hashed refresh session + HttpOnly cookie

refresh cookie -> /api/v1/auth/refresh -> rotated token family
sign out       -> /api/v1/auth/logout  -> revoked session + cleared cookie

email -> pending claim + durable delivery outbox -> SMTP verification message
valid explicit verification + password + active policies
      -> nullable-name UNASSIGNED account + Argon2id credential (no session)
email + password -> shared access JWT + hashed rotating refresh session

credential email -> generic recovery acknowledgement
                 |-> eligible account: pending claim + durable SMTP outbox
valid single-use recovery token + conforming password
                 -> new Argon2id hash + consumed claim
                 -> all active refresh sessions revoked (no new session)
```

The API verifies signature, issuer, audience, expiry, verified email, and Google
`sub`. Refresh tokens are stored only as hashes; replay revokes the family.
Authentication is rate-limited, security events are persisted, and expired or
old revoked sessions are cleaned up.

Credential verification tokens are HMAC-bound to random claim IDs,
digest-only at rest, purpose-specific, expiring, and single-use. PostgreSQL
serializes canonical-email ownership across Google and credential creation.
The outbox retries bounded SMTP delivery without storing the raw token or
message body. Credential-only accounts retain a null display name until an
accepted role-profile activation supplies one.

Password recovery reuses the credential password policy, HMAC secret, SMTP
configuration, canonical-email serialization, and rate-limit conventions while
keeping purpose-specific claim and outbox state. Requests return the same
acknowledgement for credential, Google-only, and unknown identities. Recovery
tokens are digest-only at rest, expiring, supersedable, and single-use.
Successful completion replaces the password and revokes every active refresh
session atomically; existing stateless access JWTs expire naturally within
their configured 15-minute lifetime.

New accounts are `UNASSIGNED`. `POST /api/v1/student-profile` atomically creates
one student profile and changes the account to `STUDENT`; it returns canonical
current-user state and a replacement access token. The profile is private to
its authenticated student.

The deployment may configure one exact verified account through
`YUKCSCA_FIRST_ADMIN_EMAIL`. Its first successful Google or credential sign-in
promotes only an `UNASSIGNED` account to the unique `ADMIN`; repeat sign-in and
refresh are idempotent and other roles are never overwritten. V6 enforces the
single-admin pilot constraint.

The `academic` module implements the accepted eight-operation administrator
boundary for subject preparation packages. Package lifecycle is subject-agnostic
(one package per subject; draft/publish/archive; JSONB revisions). Creatable
subjects and default exam structure live in an allow-listed subject profile
(pilot: Mathematics with its CSCA 2025 defaults). Publication validates the
official-source reference, three-language authored outline, mappings,
resources, questions, LaTeX/image blocks, provenance, and a mock that matches
the package's own exam structure in one transaction. Incomplete whole drafts
can be saved with expected-revision checks. Published JSONB revisions are
immutable. PNG/JPEG assets are bounded, decoded, re-encoded without submitted
metadata, hashed, and stored in PostgreSQL separately from revision documents.
Archive retains revisions, images, and value-free audit evidence. Student
consumption remains outside this slice.

`PATCH /api/v1/student-profile/me` updates only supplied learner-profile fields
for the authenticated owning `STUDENT`. The application validates the complete
patch before mutation, locks the existing profile row, treats empty or
identical patches as successful no-ops, and returns the authoritative private
profile without changing identity, role, or session state. Effective updates
and their value-free security event commit in one transaction. The endpoint
uses the existing V3 schema; no migration or new dependency is required.

The VS-003 password-recovery backend and production frontend are `DONE` after
focused contract, PostgreSQL/Flyway, backend, frontend, security/privacy, and
product-owner journey evidence. The frontend consumes the generated recovery
contract, reads fragment or query credentials, removes them from browser
history, and exposes retry and return-to-sign-in states. Other role onboarding,
learning, family, content, commerce, tutoring, and AI behavior do not exist yet.
The VS-004 backend and production profile/default-language settings frontend are
`DONE` after contract, PostgreSQL/Flyway, backend, frontend, route-boundary,
security/privacy, code-surface, and product-owner journey evidence. The
independently production-accessible student settings surface is deliberately
limited to `/app/profile` and `/app/profile/languages`; `/app/more` remains
inside the preview-workspace gate, and learning, family, access, commerce, and
other workspace destinations remain prototype-only or unimplemented until their
owning slices are accepted. VS-002 is also `DONE` after full implementation,
verification, and product owner signoff.

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
