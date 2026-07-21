# Development guide

> **Classification: executable contributor guide.** Commands and check names should match the repository. This document does not define product behavior; the requirements do.

## Required toolchain

- Node.js 24
- pnpm 11.14.0 through Corepack
- Java 21
- Maven 3.9.11 through `services/api/mvnw`
- Docker Engine with Compose 2.22 or newer

The repository enforces these versions. `make doctor` also rejects Docker Compose versions older than the Compose Watch minimum. Run it before development when the shell, IDE toolchain, or Docker installation changes.

## Bootstrap

```bash
corepack enable
corepack install --global pnpm@11.14.0
make doctor
pnpm install --frozen-lockfile
```

Do not substitute npm, system Maven, H2, or an unpinned global formatter/linter.

## Local development

### One-command container development

```bash
cp .env.example .env
# Replace the Google client-ID placeholders and local JWT secret.

make dev
```

`make dev` runs `docker compose up --build --watch`: PostgreSQL, API, and web start together, logs remain attached, and Compose rebuilds/replaces only the affected application service when watched source, dependency, Dockerfile, or Nginx configuration changes. Open `http://localhost:5173`; press `Ctrl+C` to stop the stack. PostgreSQL data remains in its named volume.

Compose Watch requires Docker Compose 2.22 or later. `make doctor` verifies this requirement.

### Host hot-reload and debugging

For the fastest frontend hot-module reload, Spring debugging, or direct IDE attachment:

```bash
make dev-host
# Then run `make api` and `make web` in separate terminals.
```

This mode keeps PostgreSQL in Docker while Vite and Spring run on the host. The web application is still served at `http://localhost:5173`.

### Production-style detached stack

For a detached stack without file watching:

```bash
docker compose config --quiet
docker compose up --detach --build --wait
make smoke
docker compose down
```

Use a separate Compose project name for disposable validation; never remove a developer data volume as part of a test cleanup.

## Vertical-slice workflow

Feature implementation starts from the selected row in `docs/PLAN.md` and its `docs/delivery/VS-NNN-*.md` file. If no slice file exists, shape one from `docs/delivery/SLICE_TEMPLATE.md` before changing product behavior. The full lifecycle is defined in [`docs/delivery/README.md`](delivery/README.md).

Before TypeSpec or implementation:

1. Read only the linked requirement sections, stories, and `docs/requirements/COVERAGE.md`.
2. Complete the slice's **documentation-sufficiency review** in the slice template.
3. If material product, privacy, money, state, contract, or architecture meaning remains unresolved, follow [`docs/delivery/HUMAN_REVIEW.md`](delivery/HUMAN_REVIEW.md): record stable decision IDs, mark the gate `AWAITING_DECISION`, ask one bounded question at a time, and do not implement the affected behavior until the gate is `NOT_REQUIRED` or `APPROVED` for the recorded scope.

For public HTTP work, the slice reaches `CONTRACT_READY` only after blocking human decisions are resolved, the TypeSpec operation set compiles, and generated OpenAPI has been reviewed. Then implement migration/domain/application behavior, HTTP adapters, frontend flow, tests, observability, and documentation as one coherent slice.

Update the slice's acceptance matrix and verification evidence with exact test names and command results. Plan versions and Git review provide documentation traceability; do not add a pnpm script solely to validate plan metadata.

## Contract-first changes

Edit TypeSpec, never generated artifacts:

```bash
pnpm generate
pnpm check:generated
```

Public API work updates the contract, backend HTTP boundary, frontend generated types/client behavior, and positive plus negative/edge tests together. Regeneration must leave no diff.

## Formatting

Use the unified repository targets:

```bash
make format        # Prettier plus Spotless apply
make format-check  # Prettier plus Spotless check
```

These targets use the workspace-pinned Prettier and Maven Wrapper. Do not replace them with global formatters.

## Focused tests

Run a narrow test while iterating, then run the applicable full gate before handoff:

```bash
# One frontend test file
pnpm --filter @yukcsca/web exec vitest run src/features/auth/authApi.test.ts

# One Java unit-test class
cd services/api && ./mvnw --batch-mode -Dtest=SessionServiceTest test

# One Java integration-test class through Failsafe/Testcontainers
cd services/api && ./mvnw --batch-mode -Dit.test=AuthHttpIT verify
```

## Validation

Run the smallest relevant checks during iteration:

```bash
pnpm contract:build
pnpm typecheck:web
pnpm lint:web
pnpm test:web
pnpm build:web
cd services/api && ./mvnw --batch-mode verify
```

Run the aggregate gate for cross-stack or baseline changes:

```bash
make verify
```

User-journey or container changes also require:

```bash
pnpm e2e:web
docker compose config --quiet
docker compose build web api
docker compose up --detach --no-build --wait --wait-timeout 180
make smoke
docker compose down
```

Spring integration tests use PostgreSQL through Testcontainers and the production Flyway migrations. External providers are mocked; automated tests do not call billable or production services.

## Automated checks

The push and pull-request CI workflow exposes separately attributable required jobs:

| Check         | Responsibility                                                 |
| ------------- | -------------------------------------------------------------- |
| `repository`  | frozen install, repository formatting, shell syntax            |
| `contracts`   | TypeSpec/OpenAPI/frontend declaration reproducibility          |
| `frontend`    | TypeScript, ESLint, Vitest, production build                   |
| `backend`     | fast Spotless gate, unit/integration/package, retained reports |
| `secret-scan` | Gitleaks                                                       |

Every `uses:` reference is pinned to an immutable SHA. No automated dependency-update pull requests are configured. Maintainers update npm, Maven, GitHub Actions, and container dependencies through isolated pull requests that preserve Node 24, Java 21, Maven 3.9.11, and the repository's applicable validation gates. CodeQL, dependency review, and GitHub native secret scanning are not active for the current private repository because the required GitHub security entitlements are not enabled; Gitleaks remains the active repository secret scan.

The separate `Runtime validation` workflow runs only on manual dispatch. Its `e2e` job exercises the mocked-boundary desktop/mobile browser journey and retains Playwright traces. Its `containers` job proves the built Nginx/API/PostgreSQL stack, health routing, smoke checks, and security headers. These jobs do not run on every push or pull request and are not required branch checks; run the workflow before a release and after browser-journey, container, Compose, proxy, health, or cross-stack changes. Add a real backend to `e2e` only with the first journey whose acceptance criteria require persisted server behavior.

## Troubleshooting

- **Wrong tool version:** run `make doctor`. Use Corepack for pnpm and the Maven Wrapper for Java commands.
- **Docker or Testcontainers cannot connect:** start Docker Desktop, confirm `docker info`, then rerun the test. Integration tests require a reachable Docker daemon.
- **A local port is occupied:** override Compose ports for that invocation, for example `POSTGRES_PORT=55432 API_PORT=18080 WEB_PORT=15173 make dev`.
- **The API fails immediately without a profile:** this is intentional fail-fast behavior because base `application.yml` requires database and authentication environment variables. Use `make api`, which activates the safe `local` profile, or provide the complete deployment environment explicitly.
- **Google login is unavailable:** replace both Google client-ID placeholders in `.env` with the same OAuth Web Client ID. The local placeholders allow startup but cannot authenticate a real Google account.
- **A Compose service is unhealthy:** inspect `docker compose ps` and `docker compose logs <service>`; never paste credentials or real user data into an issue or chat.

## Definition of done

A change is done only when:

- its accepted vertical-slice ID/revision, linked requirements/stories, and acceptance criteria are identified;
- TypeSpec contract, slice plan, implementation, migration, tests, and current-state documentation agree;
- each non-trivial use case has a success test and a validation, authorization, privacy, or edge test;
- applicable local checks pass with exact results reported;
- mobile, accessibility, authorization, privacy, audit, failure, and observability consequences are reviewed where relevant;
- generated artifacts and the worktree contain no unintended diff;
- rollback or feature-disable behavior is understood.

Tests are never deleted, weakened, skipped, or marked flaky merely to pass CI.

## Repository owner setup

After the first push, create a `main` branch ruleset that:

- requires pull requests, at least one approval, stale-approval dismissal, conversation resolution, and an up-to-date branch;
- blocks force pushes and branch deletion;
- requires `repository`, `contracts`, `frontend`, `backend`, and `secret-scan`;
- enables GitHub Code Security and Secret Protection only when the repository has the required entitlement, then adds their proven checks to the ruleset.

Run the workflows once before selecting required check names, then prove the ruleset with a small documentation-only pull request.
