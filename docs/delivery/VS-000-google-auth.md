# VS-000 — Google sign-in and secure session lifecycle

## Metadata

| Field                | Value                                                      |
| -------------------- | ---------------------------------------------------------- |
| Status               | `DONE`                                                     |
| Human gate           | `NOT_REQUIRED` — retrospective delivered slice             |
| Plan revision        | 2                                                          |
| Updated              | 2026-07-22                                                 |
| Primary actor        | New or returning user                                      |
| Story IDs            | `US-AUTH-01`, `US-AUTH-02`                                 |
| Requirement sections | 1.1 pilot delivery qualification                           |
| Depends on           | Repository baseline, Google OAuth web client configuration |
| TypeSpec source      | `contracts/auth.tsp`, `contracts/common.tsp`               |
| API operations       | `googleLogin`, `refresh`, `logout`, `me`                   |

## User-observable outcome

A user can sign in through Google, return through a rotating refresh session, inspect the current identity, and sign out without receiving an inferred product role.

## Delivered boundary

The current repository implements the bounded Google-only pilot. New users remain `UNASSIGNED`; student/parent activation belongs to later slices. Google credentials are provider assertions, not YukCSCA authorization tokens.

## Contract and state summary

```text
Google identity -> UNASSIGNED account -> access token + hashed refresh session
valid refresh -> rotated session
refresh replay -> token-family revocation
logout -> current session revoked + cookie cleared
```

Public operations are defined in TypeSpec under `/api/v1/auth`. The refresh token is an HttpOnly cookie; browser application code receives only the access token and current-user response.

## Acceptance evidence snapshot

| Outcome                                   | Repository evidence                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| Same Google subject maps to one account   | `AuthHttpIT.returningGoogleUserCanSignInAgainWithoutCreatingADuplicateAccount` |
| Invalid provider credential is rejected   | Google verifier tests and HTTP integration coverage                            |
| New account remains `UNASSIGNED`          | `UserRole` contract/domain and auth response tests                             |
| Refresh rotates and replay revokes family | `SessionServiceTest` and integration coverage                                  |
| Logout revokes session                    | Auth service/controller integration coverage                                   |
| Sensitive DTOs are not logged             | `SensitiveDtoLoggingTest`                                                      |

## Returning-user regression repair

A direct local journey on 2026-07-22 proved that the first Google sign-in and logout succeeded but a later sign-in with the same Google subject failed. The returning identity exposed a lazy `UserAccount` proxy after the login transaction closed. The controller had already persisted a refresh session and added its cookie before access-token construction failed, and the internal exception was then surfaced incorrectly as `401`.

This repair is limited to the already accepted `US-AUTH-01` and `US-AUTH-02` boundary. It does not add a new public operation or change a success payload. TypeSpec adds the shared safe `500` problem response to the existing authentication operations so unexpected server failures are not misreported as credential failures.

| Repair AC | Required behavior                                                                                                                                                           | Evidence required                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `R-01`    | A user can sign in, sign out, and sign in again with the same Google subject; both successful sign-ins return the same YukCSCA user ID and only one account exists.         | PostgreSQL HTTP integration test covering the complete repeated-sign-in sequence. |
| `R-02`    | Returning-identity lookup supplies usable current-user state after its transaction closes; access-token construction does not depend on an uninitialized persistence proxy. | Repository/application integration exercised through `R-01`.                      |
| `R-03`    | If access-token response construction fails, no refresh session, success event, or refresh cookie is issued.                                                                | HTTP integration test with a controlled access-token failure.                     |
| `R-04`    | An unexpected failure on a public authentication route is returned as a safe `500`, not a misleading bearer-authentication `401`.                                           | HTTP integration assertion for status and absence of credential material.         |

The repair must retain Google credential redaction, hashed refresh-token storage, the existing cookie attributes, refresh rotation/replay behavior, and the public TypeSpec contract.

## Repair verification evidence

| Evidence                         | Result                                                                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repeated sign-in integration     | `AuthHttpIT.returningGoogleUserCanSignInAgainWithoutCreatingADuplicateAccount` passes against PostgreSQL and proves the same user ID is returned with one persisted account.                                                 |
| Failure atomicity and safe error | `AuthInternalFailureHttpIT.accessTokenFailureReturnsSafeServerErrorWithoutIssuingSession` passes and proves `500 INTERNAL_ERROR` with no refresh session, success event, or cookie.                                          |
| Full backend verification        | `./mvnw --batch-mode verify` passes: 14 unit tests and 10 PostgreSQL-backed integration tests, with Spotless clean.                                                                                                          |
| Contract generation              | TypeSpec compiles and regeneration leaves both generated artifacts byte-identical to their pre-run repair state. The repository clean-tree assertion remains pending because the intended generated changes are uncommitted. |
| Frontend verification            | `pnpm check:web` passes TypeScript, ESLint, 9 Vitest tests, and the production build; `pnpm e2e:web` passes in Chromium and mobile Chrome.                                                                                   |
| Local stack                      | Rebuilt API is healthy and `scripts/smoke.sh` passes for the API and web endpoints.                                                                                                                                          |
| Real Google journey              | Product owner confirmed on 2026-07-22 that sign in -> sign out -> sign in again with the same Google account succeeds and preserves login state.                                                                             |

## Known exclusions

- Student and parent role activation
- Parent-created student accounts
- Tutor application/approval
- Admin provisioning
- User-facing multi-device session management
- Long-term email/password registration and recovery

## Revision history

| Revision | Date       | Change                                                                                                                  |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2        | 2026-07-22 | Repaired returning-user login and failure atomicity; real Google-account retest confirmed and slice returned to `DONE`. |
| 1        | 2026-07-21 | Recorded the already implemented identity slice in the delivery system.                                                 |
