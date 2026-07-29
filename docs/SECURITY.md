# Security model

> **Classification: supporting control model.** Product security, privacy, minor-protection, content, and financial obligations are normative only in the requirements. This document records current controls and implementation gates; it cannot weaken those obligations.

## High-value assets

Minor-user identity and relationships, learning conversations, assessment answers, mastery evidence, payment/entitlement state, reviewed content, tutor documents, admin privileges, model/provider credentials, and university-requirement sources.

## Implemented baseline controls

### Identity and sessions

- Google credentials are verified server-side for signature, issuer, audience, expiry, and verified email and bound by provider `sub`.
- YukCSCA access tokens are short-lived; refresh tokens are random, rotating, hashed at rest, and revoked on logout or replay.
- Authentication endpoints use bounded per-process rate limiting and emit durable security events.
- Authentication and authorization failures use canonical `application/problem+json` bodies with stable codes. Bearer-filter failures preserve RFC 6750 `WWW-Authenticate` challenges, and rate-limit failures preserve `Retry-After`.
- Allowed browser origins and refresh-cookie attributes are configured and integration-tested.
- Expired and old revoked sessions are removed by a retention job.

### Email credentials

- Registration creates only a canonical, expiring email-verification claim and
  durable SMTP outbox entry. It creates no account, password credential, role,
  or session before explicit verification completion.
- Verification links carry the raw credential in the browser fragment. The
  server stores only its SHA-256 digest and reconstructs outbound retry tokens
  from a random claim ID plus a separate HMAC secret.
- Passwords are normalized to NFC, checked as 15–128 Unicode code points
  against a local whole-password blocklist, and stored only with the versioned
  `{argon2id-v1}` encoder at 19 MiB, two iterations, and parallelism one.
- Credential completion atomically consumes the claim, creates one nullable-name
  `UNASSIGNED` account and authenticator, and records only the configured Terms
  version, Privacy Notice version, and server acceptance time. It issues no
  session.
- A valid claim that collides with an existing Google-owned canonical email is
  closed without adding a password, policy evidence, account, link, or session.
- Registration and resend remain generic; credential login uses dummy hash work
  for unknown identities. Per-IP and digest-keyed per-identifier budgets bound
  anonymous work without durable raw IP, email, password, or token values.
- SMTP delivery uses bounded timeouts and a PostgreSQL outbox with bounded
  exponential retry. Security events contain only event categories and
  account IDs where post-proof attribution is safe.
- Password-recovery requests return one generic acknowledgement for eligible,
  Google-only, and unknown identities. Only an eligible credential account
  receives purpose-specific, expiring, single-use recovery state and an SMTP
  delivery.
- Recovery tokens use a separate HMAC purpose from verification tokens and are
  stored only as SHA-256 digests. Resend cooldown, one-pending-claim uniqueness,
  per-IP and digest-keyed identifier limits, bounded delivery retry, and
  retention cleanup constrain abuse and stale state.
- Completion serializes with credential sign-in and competing recovery
  attempts, reuses the existing password policy and Argon2id encoder, consumes
  the claim, replaces the password, and revokes every active refresh session in
  one transaction. It issues no access token, refresh token, or cookie;
  existing access JWTs expire naturally within 15 minutes.
- Recovery request, delivery, rejection, and success events exclude raw email,
  password, token, message, provider payload, and session credentials.

### Student activation

- Student activation accepts only an authenticated account whose authoritative database role is `UNASSIGNED`; other assigned roles are rejected.
- Profile creation and the one-way transition to `STUDENT` share one transaction and a unique account constraint. A same-account retry returns the existing profile instead of creating another.
- Only birth year is collected for age-appropriate behavior, using a rolling Asia/Jakarta range corresponding to ages 12 through 21. It is not represented as legal age verification, and parent linking is not required by this slice.
- Activation returns a replacement short-lived access token carrying the new role while leaving the refresh session unchanged. The durable success event contains the account identifier and event time, not submitted profile fields or Google credentials.
- Student-profile request, response, activation, and shared current-user string representations redact personal fields. Validation failures are converted to stable field/code pairs before framework exception logging can render rejected values.

### Repository and delivery

- Secrets and real user/student data are prohibited from the repository and logs.
- GitHub Actions are SHA-pinned. Dependency upgrades are proposed and validated as isolated maintainer-reviewed changes; no automated dependency-update pull requests are configured. Gitleaks scans pushes, pull requests, and the weekly schedule.
- CodeQL, dependency review, and GitHub native secret scanning are not active for the current private repository because the required GitHub security entitlements are not enabled.
- Containers expose health checks; the API runs as a non-root user.

## Required feature gates

These controls must ship with the first feature that needs them:

### Fixture-backed credential previews

- An accepted PX milestone may render email/password registration,
  verification, login, and recovery only inside an explicit preview boundary.
- Preview password values remain in the active form only long enough for local
  validation and must not reach production APIs, storage, cookies, analytics,
  logs, URLs, screenshots, traces, or generated contract models.
- Preview identity/persona state must remain separate from production
  `CurrentUser`, access tokens, refresh sessions, accounts, roles, and guards.
  It may authorize fixture-backed preview routes only.
- Preview verification and recovery must not send messages, mint tokens, reset
  passwords, or claim production completion. Google, VS-002 credential
  authentication, and the VS-003 recovery backend are production-backed;
  VS-003 frontend and end-to-end completion remain in progress.
- VS-002 owns production registration, verification, credential login,
  abuse controls, audit behavior, and the shared session handoff. Fixture
  identity must still remain isolated for PX-002-only consumers. VS-003 owns
  production password recovery.

### Roles, parents, tutors, and administration

- Deny access by default and enforce server-side role plus object-level authorization.
- Parent linking does not grant private-conversation access by default.
- Tutor access is limited to assigned and authorized learning context.
- Sensitive administrative changes record actor, reason, target, time, and outcome without leaking unnecessary personal data.
- Minor-related age, consent, retention, deletion, and guardian disclosures are reviewed before collecting the associated data.

### Content and assessment

- Content records provenance, licensing/authorization, author, reviewer, version, and publication state.
- Scored items and answer keys require human review and immutable version references.
- Leaked, scraped, or unauthorized official questions are prohibited.

### Files and provider integrations

- Validate extension, MIME signature, size, malware status, ownership, retention, and download authorization.
- Use signed, short-lived object access and never expose provider credentials to the browser.
- Verify payment webhooks cryptographically and process them idempotently.
- External calls use minimal data, explicit consent where required, timeouts, bounded retries, and safe failure behavior.

### LLM and learning-agent behavior

- Retrieved text is data, never instruction; tool authorization is independent of model output.
- Structured output and tool parameters are schema-validated.
- Deterministic services own grading, mastery, plans, permissions, entitlements, publication, and money.
- Model, prompt, retrieval, rubric, evaluator, cost, and latency versions are traceable without retaining unnecessary private content.
- Budgets, timeouts, retry limits, maximum steps, golden evaluations, and human escalation exist before release.
- A model may not both generate and approve high-impact academic content.

## Google login configuration

1. Create a Google Cloud project dedicated to YukCSCA.
2. Configure the OAuth consent screen with the minimum product identity and privacy links.
3. Create an OAuth 2.0 Web application client.
4. Add the exact local, preview, staging, and production HTTPS origins.
5. Put the same public client ID in `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`.
6. Never put a Google client secret in the React application.
7. Request only basic sign-in identity unless a separate accepted feature needs additional scopes and consent.
8. Outside local development, use HTTPS, `YUKCSCA_COOKIE_SECURE=true`, and a deployment secret manager.

Google tokens authenticate the provider identity; they are never YukCSCA domain authorization tokens.

## Reporting vulnerabilities

Do not open public issues containing vulnerabilities, credentials, personal data, private chats, assessment answers, payment data, or copyrighted content. Until a dedicated security mailbox exists, use the hosting platform's private vulnerability-reporting feature. Rotate any credential that may have entered logs, prompts, screenshots, commits, or agent transcripts.
