# VS-000 — Google sign-in and secure session lifecycle

## Metadata

| Field                | Value                                                      |
| -------------------- | ---------------------------------------------------------- |
| Status               | `DONE`                                                     |
| Human gate           | `NOT_REQUIRED` — retrospective delivered slice             |
| Plan revision        | 1                                                          |
| Updated              | 2026-07-21                                                 |
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

| Outcome                                   | Repository evidence                                 |
| ----------------------------------------- | --------------------------------------------------- |
| Same Google subject maps to one account   | Identity domain/store behavior and `AuthHttpIT`     |
| Invalid provider credential is rejected   | Google verifier tests and HTTP integration coverage |
| New account remains `UNASSIGNED`          | `UserRole` contract/domain and auth response tests  |
| Refresh rotates and replay revokes family | `SessionServiceTest` and integration coverage       |
| Logout revokes session                    | Auth service/controller integration coverage        |
| Sensitive DTOs are not logged             | `SensitiveDtoLoggingTest`                           |

## Known exclusions

- Student and parent role activation
- Parent-created student accounts
- Tutor application/approval
- Admin provisioning
- User-facing multi-device session management
- Long-term email/password registration and recovery

## Revision history

| Revision | Date       | Change                                                                  |
| -------- | ---------- | ----------------------------------------------------------------------- |
| 1        | 2026-07-21 | Recorded the already implemented identity slice in the delivery system. |
