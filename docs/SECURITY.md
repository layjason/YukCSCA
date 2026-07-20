# Security model

> **Classification: supporting control model.** Product security, privacy, minor-protection, content, and financial obligations are normative only in the requirements. This document records current controls and implementation gates; it cannot weaken those obligations.

## High-value assets

Minor-user identity and relationships, learning conversations, assessment answers, mastery evidence, payment/entitlement state, reviewed content, tutor documents, admin privileges, model/provider credentials, and university-requirement sources.

## Implemented baseline controls

### Identity and sessions

- Google credentials are verified server-side for signature, issuer, audience, expiry, and verified email and bound by provider `sub`.
- YukCSCA access tokens are short-lived; refresh tokens are random, rotating, hashed at rest, and revoked on logout or replay.
- Authentication endpoints use bounded per-process rate limiting and emit durable security events.
- Allowed browser origins and refresh-cookie attributes are configured and integration-tested.
- Expired and old revoked sessions are removed by a retention job.

### Repository and delivery

- Secrets and real user/student data are prohibited from the repository and logs.
- GitHub Actions are SHA-pinned. Dependency upgrades are proposed and validated as isolated maintainer-reviewed changes; no automated dependency-update pull requests are configured. Gitleaks scans pushes, pull requests, and the weekly schedule.
- CodeQL, dependency review, and GitHub native secret scanning are not active for the current private repository because the required GitHub security entitlements are not enabled.
- Containers expose health checks; the API runs as a non-root user.

## Required feature gates

These controls must ship with the first feature that needs them:

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
