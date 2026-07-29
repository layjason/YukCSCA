# YukCSCA

YukCSCA is a mobile-first CSCA learning platform for Indonesian high-school students and their families. The repository currently provides a development-ready contract/web/API baseline, hardened Google identity and session behavior, and completed email-credential authentication and recovery slices; the P0 learning loop has not been implemented.

## Product requirements

> **The bilingual requirements are the sole normative product authority. Plans, architecture descriptions, contracts, issues, and implementation do not override them.**

- [YukCSCA Platform Requirements — English](docs/requirements/YukCSCA平台需求_EN.md)
- [YukCSCA 平台需求 — 中文](docs/requirements/YukCSCA平台需求_CN.md)

Both documents have equal authority and must remain semantically synchronized. See the [documentation index](docs/README.md) for the complete authority model.

## Active stack

- React 19, Vite 8, strict TypeScript 5.9, i18next, Vitest, and Playwright
- Java 21, Spring Boot 4.1, Spring Security, JPA, Flyway, and PostgreSQL 18
- TypeSpec 1.14 → OpenAPI 3.1 → generated frontend TypeScript declarations
- pnpm workspace, Docker Compose, and SHA-pinned GitHub Actions

The implemented structure is described in [Current architecture](docs/ARCHITECTURE.md). The versioned P0 slice roadmap lives in the explicitly non-normative [Delivery plan](docs/PLAN.md); each accepted feature has one concrete brief under [`docs/delivery/`](docs/delivery/README.md).

## Quick start

Required: Node.js 24, pnpm 11.14.0, Java 21, and Docker with Compose 2.22 or newer.

```bash
corepack enable
corepack install --global pnpm@11.14.0
make doctor
pnpm install --frozen-lockfile

cp .env.example .env
make dev
```

`make dev` starts PostgreSQL, API, and web through Compose Watch. Source/configuration changes automatically rebuild and replace the affected application container; press `Ctrl+C` to stop the development stack. Detailed container, host-debugging, contract, CI, and repository-owner instructions are in [Development](docs/DEVELOPMENT.md).

The application starts with safe local placeholders, but real Google sign-in requires a Google OAuth Web Client ID in both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. See [Google login configuration](docs/SECURITY.md#google-login-configuration).

## Verify

```bash
make verify
pnpm e2e:web
docker compose config --quiet
```

`make verify` checks deterministic API generation, repository formatting, frontend type/lint/test/build, and PostgreSQL-backed Maven verification.

## Repository map

```text
apps/web/       React application
services/api/   Spring Boot modular monolith
contracts/      TypeSpec source and generated OpenAPI
docs/           requirements, story coverage, delivery slices, and current-state guides
```

For feature work, read [`AGENTS.md`](AGENTS.md), the active row in [`docs/PLAN.md`](docs/PLAN.md), its vertical-slice file, the linked requirement/story sections, the nearest directory rules, and TypeSpec before editing public behavior.
