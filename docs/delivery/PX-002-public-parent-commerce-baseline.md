# PX-002 — Public, parent, and commerce product-experience baseline

> **Classification: non-production product-journey delivery brief.** PX-002
> validates the consumer-facing P0 journey through deterministic frontend
> fixtures alongside the implemented production Google identity boundary. It
> does not create product requirements, production credential authentication,
> parent roles, relationships, orders, payments, entitlements, notifications,
> or support operations.

## Metadata

| Field                         | Value                                                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status                        | `SHAPING`                                                                                                                                                                               |
| Human gate                    | `APPROVED`                                                                                                                                                                              |
| Plan revision                 | 2                                                                                                                                                                                       |
| Updated                       | 2026-07-24                                                                                                                                                                              |
| Primary actors                | Public visitor; production Google `UNASSIGNED` user; fixture-backed credential persona; parent/payer preview persona                                                                    |
| Production-backed entry       | `VS-000` Google authentication/session and `VS-001` student activation                                                                                                                  |
| Exploratory requirement areas | 0.1; 1.1–1.3; 2.1–2.3; 10.1–10.4; 11.1–11.5; 13.1–13.2; applicable security, privacy/minor, localization/accessibility, and financial-consistency NFRs                                  |
| Exploratory story families    | `US-AUTH-*`, `US-PROF-*`, `US-ACCOUNT-*`, `US-FAM-*`, `US-PARENT-*`, `US-TRIAL-*`, `US-PRODUCT-*`, `US-PAY-*`, `US-ORDER-*`, `US-REFUND-*`, `US-RENEW-*`, `US-NOTIFY-*`, `US-SUPPORT-*` |
| Depends on                    | `PX-001`, `VS-000`, `VS-001`, root `DESIGN.md`                                                                                                                                          |
| Worker prompt                 | [`worker-product-baseline-PX002.md`](../prompts/worker-product-baseline-PX002.md)                                                                                                       |
| TypeSpec source               | None; existing TypeSpec and generated declarations remain unchanged                                                                                                                     |
| API operations                | Existing Google identity/session and student-activation operations only                                                                                                                 |
| Implementation owner          | Web frontend                                                                                                                                                                            |

The paired requirements remain normative. The worker prompt expands execution
detail but is subordinate to this accepted boundary. Every referenced
production story and vertical slice remains incomplete unless its own
contract-backed brief is accepted and delivered.

## Objective and user-observable outcome

A visitor can understand YukCSCA before registering, compare conventional
fixture-backed credential entry with production Google sign-in, choose a
student or parent continuation, and traverse connected public, family,
privacy, purchase, payment-state, entitlement, and aftercare previews without
creating production identity, relationship, or financial state.

The four required connected journeys are:

```text
A. Visitor -> product -> account entry -> role -> Student continuation
B. Visitor -> account entry -> Parent preview -> family link -> overview
C. Linked-student overview -> product -> checkout -> provider outcome
   -> order -> receipt -> entitlement
D. Order/entitlement -> renewal, refund, duplicate-payment, or support preview
```

Journey A must demonstrate both identity branches:

```text
Production Google -> UNASSIGNED -> role selection -> existing production
student activation -> existing PX-001 student preview

Credential fixture -> verification/login preview -> preview role intent
-> fixture-backed PX-001 student preview only
```

## Why this is the current boundary

PX-001 proved the student learning journey but left public discovery, ordinary
credential-entry expectations, role choice, parent support, and the
buyer/recipient/payment lifecycle disconnected. Those gaps prevent a reviewer
from evaluating the full consumer experience and its handoffs.

PX-002 is large by vertical-slice standards because it is an explicitly
non-production journey milestone. Its purpose is to validate navigation,
terminology, privacy explanation, money-state comprehension, responsive
hierarchy, and future contract needs across several later slices. It does not
authorize a broad production implementation.

Production outcomes are recorded in `US-AUTH-03` and `US-AUTH-04`, but no
credential-authentication slice or contract is created now. Exact account,
password, verification, recovery, abuse-control, session, and provider
semantics must be shaped when that vertical slice is selected.

## In scope

- Public Home, product discovery, product detail, trial explanation, For
  Parents, privacy, and terms surfaces.
- Conventional email/password registration, verification, login, and recovery
  presented as deterministic frontend preview behavior.
- The existing production Google entry, session, and logout behavior.
- Role selection for a production Google `UNASSIGNED` identity and for an
  explicit preview credential persona.
- Production Google Student handoff to the existing student activation flow.
- Credential-preview Student handoff to fixture-backed PX-001 behavior only.
- Fixture-backed parent activation and a separate parent application shell.
- Parent-created pending student, invitation acceptance, relationship/privacy,
  linked-student overview, reporting, risk, and unlinking concepts.
- Public/parent product details, trial boundaries, recipient selection,
  checkout, local-payment methods, sample instructions, deterministic provider
  outcomes, orders, receipts, entitlements, refunds, duplicate-payment cases,
  and manual renewal.
- Notification preferences, account export/deletion explanation, and
  contextual support previews.
- Initial, loading, empty, validation, submitting, recoverable-error,
  unavailable, expired, already-completed, success, and state-loss behavior.
- English, Bahasa Indonesia, and Simplified Chinese interface copy.
- Mobile-first, keyboard, focus, dialog, reduced-motion, and responsive
  evidence.

## Out of scope

- Production email/password accounts, credentials, verification delivery,
  password reset, sessions, cookies, tokens, or authentication endpoints.
- Production Parent, Tutor, or Admin activation and role mutation.
- Production parent-student relationship, student creation, invitations,
  consent, or authorization.
- Real product catalog, prices, orders, provider calls, QR codes, bank/card
  credentials, charges, receipts, tax invoices, entitlements, refunds, or
  renewals.
- Production notification delivery, exports, deletion requests, uploads, or
  support tickets.
- Tutor, Admin, content-management, finance-operations, or support-agent
  applications.
- TypeSpec, generated declarations, backend code, Flyway migrations, database
  state, browser persistence, analytics, or production observability.
- Claims that preview completion advances or closes any referenced production
  story.

## Production and preview authority matrix

| Surface or action                                        | Authority                   | Allowed result                                                                   | Prohibited implication                                                 |
| -------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Public information and product samples                   | Preview fixture             | Understand representative product language and limits                            | Published production catalog, verified coverage, or live price         |
| Continue with Google                                     | Production `VS-000`         | Real provider verification, account/session restoration, canonical `CurrentUser` | Mock Google identity or bypassed production authentication             |
| Email/password register, verify, login, recover          | Preview fixture             | Local validation and transition between preview states                           | Account, credential, email, reset operation, token, cookie, or session |
| Role selection                                           | Mixed                       | Record preview intent; production Google Student may continue to `VS-001`        | Mutating production role from preview state                            |
| Student activation                                       | Production for Google only  | Existing `VS-001` transaction and canonical user state                           | Credential-preview activation request                                  |
| Student learning journey                                 | Existing PX-001 preview     | In-memory student experience                                                     | Production academic persistence or mastery                             |
| Parent activation and workspace                          | Preview fixture             | In-memory parent persona and navigation                                          | Production `PARENT` role/profile                                       |
| Family and parent visibility                             | Preview fixture             | Fictional relationship and privacy-safe sample summaries                         | Real relationship or private student access                            |
| Checkout and payment                                     | Preview fixture             | One internally consistent sample order and deterministic states                  | Charge, provider authorization, or payable instruction                 |
| Receipt and entitlement                                  | Preview fixture             | Sample receipt only after Paid; one preview entitlement                          | Tax invoice or production access grant                                 |
| Refund, renewal, notification, export, deletion, support | Preview fixture or signpost | Understand request flow and consequences                                         | Submitted production operation or promised outcome                     |
| Production logout                                        | Production `VS-000`         | Revoke the real Google-backed refresh session                                    | Treating preview-persona reset as production logout                    |
| Preview exit/reset                                       | Preview fixture             | Discard in-memory state and return to a safe entry                               | Revoking or changing production identity                               |

## Route and navigation model

Final route names may be consolidated when that improves the experience, but
the following capabilities must remain reachable and traceable.

### Public

```text
/
/products
/products/:productId
/trial
/for-parents
/login
/register
/forgot-password
/verify-email
/privacy
/terms
```

The public shell owns Home, How it works/Trial, Products, For Parents, Sign in,
Create account, interface language, and a restrained legal/support footer. It
must never render authenticated student or parent navigation.

### Role and parent onboarding

```text
/onboarding/role
/onboarding/parent
/onboarding/parent/privacy
/onboarding/parent/complete
```

Role selection is a decision point, not proof of a persisted role. Admin is not
a public choice. Tutor is unavailable/signposted. Student and Parent explain
their distinct data and permission boundaries before continuation.

### Parent workspace and family

```text
/parent/home
/parent/family
/parent/family/create-student
/parent/invitations/:invitationId
/parent/students/:studentId
/parent/students/:studentId/report
/parent/students/:studentId/access
/parent/purchases
/parent/orders
/parent/orders/:orderId
/parent/account
/parent/account/notifications
/parent/account/privacy
/parent/support
```

Parent primary navigation is Home, Family/Students, Reports, Purchases, and
Account. Nested order, student, notification, privacy, and support routes remain
secondary.

### Shared commerce and aftercare

```text
/checkout
/checkout/payment
/checkout/instructions
/orders
/orders/:orderId
/orders/:orderId/refund
/entitlements/:entitlementId/renew
/account/notifications
/account/privacy
/account/export
/account/delete
/support
/support/new
/support/:ticketId
```

One typed route registry, or smaller typed manifests composed through one
registry, owns audiences, availability, primary/secondary placement, active
state, labels, production roles, preview personas, and requirement
traceability. Desktop and mobile navigation may not duplicate route arrays.

## Identity, role, and guard model

Production and preview identity are independent:

```text
ProductionAuthState
  status: loading | anonymous | authenticated
  user: CurrentUser | null
  access token: memory only
  refresh session: server-managed HttpOnly cookie

PreviewCredentialSession
  status: absent | registering | verificationPending | active | expired
  previewSessionId: opaque fixture identifier
  displayEmail: fictional or masked fixture-safe value
  roleIntent: none | student | parent
  password: never retained after active-form validation
```

Invariants:

- A preview session never populates production `CurrentUser`, access token,
  refresh cookie, account ID, or role.
- Preview credentials authorize fixture-backed routes only.
- Production guards never accept a preview session.
- Password values never reach API adapters, storage, analytics, logs, URLs,
  screenshots, traces, error reports, or shared fixture state.
- Google-authenticated `UNASSIGNED` Student selection routes to the existing
  production activation form.
- Credential-preview Student selection routes to PX-001 fixture state without
  invoking production activation.
- Google-authenticated `UNASSIGNED` Parent selection records preview intent
  only; the canonical role remains `UNASSIGNED`.
- An already assigned production Student cannot use preview role choice to
  imply a production Parent role.
- Unsafe return destinations are rejected; no open redirect is introduced.

Root behavior:

```text
anonymous / -> public Home
anonymous protected route -> Login with safe return destination
Google UNASSIGNED / -> role selection
preview credential / -> preview role/onboarding continuation
production STUDENT / -> existing PX-001 routing decision
unsupported production role -> honest unavailable state
lost preview context -> restart explanation and safe public/role entry
```

## Connected journey maps

### Journey A — Visitor to Student

1. Open public Home and understand the learning loop.
2. Inspect one subject-language product and its trial/coverage limits.
3. Choose Create account.
4. Choose either production Google or preview email/password entry.
5. For credential preview: locally validate, show verification preview, and
   discard passwords before creating minimal preview identity state.
6. Choose Student.
7. Google path enters existing production student activation.
8. Credential path enters only fixture-backed PX-001.
9. Both paths retain explicit Production/Preview labelling at their boundary.

### Journey B — Visitor to Parent

1. Open Home or For Parents and Create account.
2. Enter through production Google or preview credential flow.
3. Choose Parent without mutating production role.
4. Complete parent activation preview and privacy explanation.
5. Enter the no-linked-student parent Home.
6. Create one pending fictional student or accept a valid fixture invitation.
7. Review relationship permissions and open the privacy-safe overview.

### Journey C — Parent purchase

1. Start from an active fixture relationship.
2. Inspect subject, exam language, coverage, limits, validity, price, and
   included benefits.
3. Select the active linked student as recipient.
4. Review payer, recipient, immutable product snapshot, amount, deadline,
   terms, and refund summary.
5. Select an available local-payment fixture.
6. Confirm exactly one sample order.
7. View visibly non-payable instructions.
8. Apply a deterministic provider outcome.
9. Paid creates exactly one preview entitlement and eligible sample receipt;
   unpaid states create neither.

### Journey D — Commercial aftercare

1. Open an order or entitlement with expiry/payment context.
2. Choose manual renewal, refund, duplicate-payment, or support.
3. Review eligibility and consequences.
4. Submit one fixture request without sensitive attachments or provider data.
5. Track a deterministic preview status.

## State models

### Credential entry

```text
REGISTER_IDLE
  -> VALIDATION_ERROR
  -> SUBMITTING
  -> DUPLICATE_EMAIL_FIXTURE | VERIFICATION_PENDING

VERIFICATION_PENDING
  -> RESEND_COOLDOWN
  -> EXPIRED_OR_INVALID
  -> PREVIEW_VERIFIED

LOGIN_IDLE
  -> INVALID_CREDENTIAL_FIXTURE | SUBMITTING
  -> PREVIEW_ACTIVE

RECOVERY_IDLE
  -> SUBMITTING
  -> NON_ENUMERATING_CONFIRMATION
```

No state transition sends a message, creates a credential, or resets a
password.

### Role and parent

```text
NO_ROLE_INTENT -> STUDENT_INTENT | PARENT_INTENT

PARENT_INTENT
  -> PROFILE_INCOMPLETE
  -> PRIVACY_REVIEW
  -> PARENT_PREVIEW_ACTIVE
  -> NO_LINK | PENDING_STUDENT | ACTIVE_LINK

INVITATION
  -> VALID | EXPIRED | MISMATCHED | ALREADY_USED
  -> ACTIVE_LINK

ACTIVE_LINK
  -> UNLINK_REVIEW
  -> REVIEW_REQUIRED | UNLINKED
```

Unlinking ends future preview summary access but preserves the fictional
student history and the payer's sample order/receipt history.

### Order, payment, and entitlement

```text
CHECKOUT_READY
  -> ORDER_CREATING
  -> ORDER_PENDING

ORDER_PENDING
  -> PROVIDER_PROCESSING
  -> PAID | FAILED | EXPIRED | CANCELLED

PAID
  -> RECEIPT_AVAILABLE
  -> ENTITLEMENT_ACTIVE
  -> ENTITLEMENT_EXPIRING
  -> ENTITLEMENT_EXPIRED

PAID
  -> REFUND_PENDING_REVIEW
  -> REFUND_APPROVED | REFUND_REJECTED
  -> REFUNDED
```

Repeated confirmation returns the existing preview order. Repeated Paid
processing returns the existing preview entitlement. A browser screen is never
authoritative; the UI explains that a verified provider callback would own the
production transition.

Manual renewal creates a new independent sample order. QRIS and Virtual Account
renewal are never described as recurring automatic billing.

## Fixture and scenario inventory

Central deterministic fixtures must cover at least:

```text
publicVisitor
newGoogleAccount
previewCredentialRegister
previewCredentialVerification
previewCredentialLogin
previewCredentialInvalidLogin
previewCredentialResetRequested
previewCredentialStudent
previewCredentialParent
returningStudent
unassignedRoleChoice
parentSetupIncomplete
parentNoLinkedStudent
pendingStudentCreated
validStudentInvitation
expiredStudentInvitation
linkedParentActiveStudent
linkedParentInsufficientEvidence
linkedParentPlanRisk
productAvailable
productPartialCoverage
checkoutReady
paymentMethodUnavailable
orderPending
orderPaid
orderFailed
orderExpired
orderRefunded
entitlementActive
entitlementExpiring
refundEligible
refundIneligible
manualRenewalDue
notificationDeliveryFailed
supportTicketOpen
previewStateLost
```

Fixtures are fictional and original. They contain no real passwords, contact
destinations, QR codes, bank/card credentials, provider references, personal
data, or verified university/product claims. Product, amount, payer, recipient,
order, receipt, and entitlement values remain internally consistent within one
preview session.

## Frontend architecture boundary

Planned ownership:

```text
app
├── production features -> shared
├── prototype/student   -> shared
└── prototype/consumer  -> shared
```

- `app` owns composition, routing, guards, and layouts.
- Production `features` may not import prototype modules.
- `prototype/consumer/` owns public sample content, credential preview, role
  intent, parent/family, commerce, notification, account, support, fixtures,
  scenarios, and in-memory state.
- PX-001 and PX-002 may share only genuinely generic primitives through
  `shared`; neither prototype imports the other.
- Application composition may hand an explicit preview persona into the
  existing student prototype without altering production auth state.
- Generated API declarations are not extended or disguised as preview models.
- Local React state/context/reducers are preferred; no workflow engine, global
  state library, commerce SDK, payment SDK, or animation library is introduced.
- Refresh may lose preview state. The UI explains the reset and provides one
  safe restart.

`docs/ARCHITECTURE.md` is updated only after these boundaries exist in code.

## Requirement and future-owner traceability

| PX-002 surface                               | Requirement/story                              | Accepted depth              | Authority                                                     | Future production owner                                        | Required evidence                      |
| -------------------------------------------- | ---------------------------------------------- | --------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------- |
| Public Home and For Parents                  | Product positioning; `US-TRIAL-01`             | Surface complete            | Preview content                                               | `VS-059`                                                       | Routes and responsive screenshots      |
| Product/trial detail                         | 11.1–11.2; `US-TRIAL-01`–`03`, `US-PRODUCT-01` | Flow complete               | Preview                                                       | `VS-059`–`VS-062`                                              | Route tests and journey                |
| Google entry/session                         | 1.1; `US-AUTH-01`, `US-AUTH-02`                | Reused real boundary        | Production                                                    | `VS-000`                                                       | Existing auth plus boundary regression |
| Email/password register/verify/login/recover | 1.1; `US-AUTH-03`, `US-AUTH-04`                | Flow complete               | Preview                                                       | Future credential-authentication slice assigned during shaping | Boundary tests and Journey A           |
| Role selection                               | 1.2–1.3; `US-PROF-01`, `US-PROF-03`            | Flow complete               | Mixed                                                         | `VS-001`, `VS-002`                                             | Route/guard tests                      |
| Student continuation                         | `US-PROF-01`                                   | Flow complete handoff       | Production activation or PX-001 preview by identity authority | `VS-001` and later academic slices                             | Journey A                              |
| Parent activation                            | 1.1–1.3; `US-PROF-03`                          | Flow complete               | Preview                                                       | `VS-002`                                                       | Journey B                              |
| Parent-created student                       | 2.1; `US-FAM-00`, `US-FAM-04`                  | Representative flow         | Preview                                                       | `VS-009`, `VS-010`                                             | Journey B and conflict test            |
| Invitation/link/unlink                       | 2.2–2.3; `US-FAM-01`–`03`                      | Flow complete               | Preview                                                       | `VS-011`, `VS-012`                                             | State tests                            |
| Parent overview/privacy                      | 10.1, 10.4; `US-PARENT-01`, `US-FAM-02`        | Surface complete            | Preview                                                       | `VS-055`                                                       | Screenshot and privacy test            |
| Weekly report/risk                           | 10.2; `US-PARENT-02`, `US-PARENT-03`           | Surface complete            | Preview                                                       | `VS-056`, `VS-057`                                             | Scenario tests                         |
| Entitlement/service summary                  | 10.3; `US-PARENT-04`                           | Surface complete            | Preview                                                       | `VS-058`                                                       | Parent route test                      |
| Checkout/order                               | 11.3; `US-PAY-01`                              | Flow complete               | Preview                                                       | `VS-063`                                                       | Journey C and duplicate-confirm test   |
| Provider outcome/entitlement                 | 11.3; `US-PAY-02`                              | Representative lifecycle    | Preview                                                       | `VS-064`                                                       | Reducer/state tests                    |
| Orders/receipts                              | 11.5; `US-ORDER-01`                            | Surface complete            | Preview                                                       | `VS-065`                                                       | Paid/unpaid tests                      |
| Refund/duplicate payment                     | 11.5; `US-REFUND-01`                           | Representative flow         | Preview                                                       | `VS-066`                                                       | Eligibility/state tests                |
| Manual renewal                               | 11.4; `US-RENEW-01`                            | Representative flow         | Preview                                                       | `VS-067`                                                       | New-order test                         |
| Notification preferences                     | 13.1; `US-NOTIFY-01`, `US-NOTIFY-02`           | Surface complete            | Preview                                                       | `VS-068`, `VS-069`                                             | Preference/default tests               |
| Account export/deletion                      | 1.2; `US-ACCOUNT-01`, `US-ACCOUNT-02`          | Signposted/explanation only | Preview                                                       | `VS-005`, `VS-006`                                             | Route/copy tests                       |
| Support                                      | 13.2; `US-SUPPORT-01`                          | Representative flow         | Preview                                                       | `VS-070`                                                       | Context-safety test                    |

No row changes a future owner's `PROPOSED` status or counts as production
acceptance.

## Experience, accessibility, localization, and motion requirements

Every task follows:

```text
Orient -> Act -> Acknowledge -> Wait honestly -> Resolve -> Recover
```

- Root `DESIGN.md` controls visual hierarchy, semantic tokens, motion, and
  anti-patterns.
- Public, parent, and commerce experiences share the warm, calm YukCSCA
  language without forcing the student shell onto other audiences.
- One dominant action appears per task region. Payment and privacy decisions
  remain calm and free of urgency, celebration, confetti, or dark patterns.
- Mobile is the baseline. Public Home, role choice, parent Home, checkout, and
  order detail must be inspected at 360px, approximately 768px, and 1440px.
- Touch targets are at least 44px; safe areas and anchored actions never cover
  content; tables become readable mobile structures.
- Public navigation, grouped role/product/payment choices, dialogs, forms, and
  recovery actions are keyboard operable with visible focus.
- `fieldset`/`legend`, linked validation errors, status announcements,
  `aria-current`, route focus, dialog focus trap/Escape, and non-color state
  cues are used where applicable.
- Short CSS motion may acknowledge press, selection, step continuity, provider
  processing, and resolved state. `prefers-reduced-motion: reduce` preserves
  the same information and actions.
- All user-visible copy is localized in English, Bahasa Indonesia, and
  Simplified Chinese. IDR, dates, status terms, privacy, and financial copy are
  locale-aware.
- Interface language remains independent from student explanation and exam
  languages. Parent report language follows the parent interface locale.

## Security, privacy, minor, and financial invariants

- Preview passwords are discarded after active-form validation and never
  transmitted, persisted, logged, captured, or embedded in fixture state.
- No preview flow issues production credentials, sessions, tokens, cookies, or
  roles.
- A parent preview sees only relationship-authorized fictional summaries and
  never private conversations, private notes, full question history, internal
  staff records, or controls over mastery/plan evidence.
- A checkout recipient is self or an active linked fixture student, never an
  arbitrary email/person.
- No real card input, QR code, bank number, provider request, charge, receipt,
  tax invoice, entitlement, refund, or notification exists.
- Paid is applied only through an injected deterministic provider scenario.
  Pending/Failed/Expired never grant entitlement or receipt.
- Duplicate confirmation and duplicate Paid processing remain idempotent
  inside the preview session.
- Marketing is off by default and remains distinct from essential security or
  transaction concepts.
- Support context does not copy credentials, payment secrets, private learning
  text, or unnecessary minor data.
- TypeSpec, generated declarations, backend, migrations, production storage,
  and production telemetry remain unchanged.

## Documentation sufficiency review

| Review area                                          | Evidence inspected                                                   | Status  | Qualification                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| End-to-end consumer flow and handoffs                | Paired requirements V1.2; worker prompt; PX-001; current routes/auth | `CLEAR` | Four connected journeys required                                           |
| Account-entry production/preview boundary            | Requirement 1.1 qualification; `VS-000`; `VS-001`; security model    | `CLEAR` | Google production, credentials fixture-only                                |
| Requirement/story coverage and exclusions            | `USER_STORIES.md` 0.2.2; `COVERAGE.md`; `PLAN.md`                    | `CLEAR` | Production stories exist; slice and contract remain deferred until shaping |
| Roles, family, privacy, and minor safety             | Requirements 1–2 and 10; family/parent stories                       | `CLEAR` | No production role or relationship                                         |
| Product, recipient, money, and aftercare             | Requirements 11 and 13; payment/order stories                        | `CLEAR` | Deterministic non-payable preview only                                     |
| State, recovery, idempotency, and provider authority | Worker prompt state inventory; financial NFRs                        | `CLEAR` | Preview reducer demonstrates concepts, not production guarantees           |
| Architecture and contract boundary                   | `ARCHITECTURE.md`; `SECURITY.md`; TypeSpec ownership rules           | `CLEAR` | No HTTP, backend, generated, or migration change                           |
| Design, accessibility, localization, evidence        | `DESIGN.md`; design guide; web agent rules                           | `CLEAR` | Desktop/tablet/mobile and three-language evidence required                 |

No known documentation conflict blocks implementation. The worker must still
inspect current code before moving this brief to `IN_PROGRESS` and record any
new material conflict through `HUMAN_REVIEW.md`.

## Human decision gate

| Field             | Value                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Gate status       | `APPROVED`                                                                                                                               |
| Decision owner    | Product owner                                                                                                                            |
| Approval scope    | PX-002 consumer journey; production Google versus fixture credential boundary; no production identity, role, family, or commerce effects |
| Approval evidence | Product-owner instruction and accepted worker prompt, 2026-07-24                                                                         |

| ID     | Question and scenario                                                                                                                                    | Resolution                                                                                                                                                                                                                | Status     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `D-01` | May conventional email/password registration, verification, login, and recovery appear beside Google before production credential authentication exists? | Yes, only through deterministic frontend fixtures with no account, credential, message, reset, session, contract, persistence, or production-completion effect. Google remains the sole production authentication method. | `RESOLVED` |

Implementation details that are reversible and already constrained by
`DESIGN.md`, existing architecture, or this brief do not require another
approval round.

## Acceptance and evidence matrix

| AC ID   | Given / When / Then                                                                                                                                                                                                            | Required evidence                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `AC-01` | An anonymous visitor opens `/`, then a useful localized public Home explains the product loop, language model, trial, coverage, and parent value without exposing private data.                                                | Route tests and 1440/768/360 screenshots |
| `AC-02` | Login/Register is opened, then conventional credential forms and a clear production Google option are both understandable and truthfully labelled.                                                                             | Component tests and visual review        |
| `AC-03` | Credential registration, verification, login, or recovery is completed, then only minimal fixture identity state changes and no production account/message/reset/session exists.                                               | Boundary and flow tests                  |
| `AC-04` | A password is entered, then it never reaches APIs, storage, logs, URLs, analytics, screenshots, traces, or retained fixture state.                                                                                             | Instrumented boundary tests              |
| `AC-05` | A production Google `UNASSIGNED` user or preview credential persona reaches role selection, then Student and Parent continuations preserve their distinct production/preview authority; Tutor is unavailable and Admin absent. | Guard/route tests                        |
| `AC-06` | Google Student is selected, then existing production activation is reused; credential-preview Student enters PX-001 fixtures without calling activation.                                                                       | Journey A and API-spy assertions         |
| `AC-07` | Parent is selected, then parent onboarding and no-linked Home complete without mutating production role or profile.                                                                                                            | Journey B                                |
| `AC-08` | A pending student or invitation scenario is used, then valid/expired/mismatched/conflict/link/unlink states preserve the documented privacy boundary.                                                                          | Family state tests                       |
| `AC-09` | A parent opens linked-student support, then only privacy-safe summary, report, risk, and entitlement examples appear and no plan/mastery edit is available.                                                                    | Route tests and screenshots              |
| `AC-10` | A product is inspected, then subject, exam language, recipient, coverage, missing scope, benefits, limits, validity, price, renewal, and trial boundaries are explicit.                                                        | Product tests and Journey C              |
| `AC-11` | Checkout is confirmed repeatedly, then exactly one immutable sample order exists and unavailable methods, arbitrary recipients, real QR/card data, and hidden charges are prevented.                                           | Reducer/component tests                  |
| `AC-12` | Provider outcomes are injected, then only Paid yields one receipt and one entitlement; duplicate Paid yields no duplicate; unpaid states yield neither.                                                                        | Deterministic state tests                |
| `AC-13` | Refund, duplicate-payment, or manual renewal is opened, then eligibility/consequences are honest, no refund is promised, and renewal creates a separate one-time sample order.                                                 | Aftercare tests and Journey D            |
| `AC-14` | Notification, export/deletion, and support surfaces are used, then optional consent defaults off and no production request or unsafe context copy occurs.                                                                      | Preference/account/support tests         |
| `AC-15` | Applicable initial/loading/empty/validation/submitting/error/retry/unavailable/expired/already-complete/state-lost states occur, then relevant input/selection is preserved and one safe recovery action is offered.           | Scenario tests                           |
| `AC-16` | Critical journeys are used by keyboard and with reduced motion, then focus, grouped choices, dialogs, status, touch targets, and state meaning remain accessible.                                                              | Accessibility tests and browser evidence |
| `AC-17` | English, Indonesian, or Simplified Chinese is selected, then route, identity, parent, privacy, payment, and support copy remains complete and language dimensions stay independent.                                            | Locale parity and screenshots            |
| `AC-18` | Public, student, parent, and shared routes render on desktop/mobile, then typed metadata controls audience, availability, active state, and navigation without duplicated arrays.                                              | Manifest tests                           |
| `AC-19` | PX-002 is inspected, then production auth role and preview persona remain separate and no prototype module reaches production parent/payment APIs.                                                                             | Import/boundary tests and static review  |
| `AC-20` | The final diff is reviewed, then TypeSpec, generated declarations, backend, migrations, production storage, and production telemetry are unchanged.                                                                            | Diff and generated checks                |
| `AC-21` | Journeys A–D run in configured desktop/mobile projects where practical, then each accepted handoff and failure/aftercare path is demonstrable without an authentication bypass.                                                | Connected E2E evidence                   |

## Test and verification plan

During implementation, run focused route/component/reducer tests for the active
area. Before final handoff, preserve all PX-001, production authentication, and
student-activation tests and run the applicable frontend gates:

```bash
pnpm typecheck:web
pnpm lint:web
pnpm test:web
pnpm build:web
pnpm e2e:web
```

Run and record:

```bash
pnpm check:generated
git diff -- contracts services/api
git diff -- apps/web/src/shared/api/generated
git diff --check
```

The expected contract/backend/generated diffs are empty. Do not run Maven,
Compose, or repository-wide verification unless the actual implementation
crosses those boundaries or focused evidence exposes broader risk.

Browser evidence must cover public Home, role selection, parent Home, checkout,
and order detail at desktop, tablet, and mobile widths, plus keyboard focus and
reduced motion. It must not capture real or preview-entered passwords.

## Integrated implementation sequence

1. Reinspect the committed PX-001 result, current routes, auth state, prompt,
   and dirty tree; move this brief to `IN_PROGRESS` only if its boundary still
   matches.
2. Define typed public/parent/account route metadata and independent
   production-auth, credential-preview, role-intent, family, and commerce
   state boundaries.
3. Build the public shell, Home, Products, Trial, For Parents, legal, and
   language entry surfaces.
4. Add conventional credential forms and deterministic registration,
   verification, login, and recovery preview states around the existing
   production Google option.
5. Add role selection and prove Google Student, credential Student, Parent,
   Tutor, Admin, assigned-user, and unsafe-return behavior.
6. Build parent preview onboarding, shell, no-linked state, family creation,
   invitation, relationship, privacy, unlink, overview, report, and risk
   surfaces.
7. Build shared product detail, recipient selection, checkout, payment method,
   sample instructions, deterministic order/provider, receipt, and entitlement
   behavior.
8. Add refund, duplicate-payment, manual renewal, notification, account
   lifecycle, and support depth at the accepted level.
9. Complete scenario states, localization, accessibility, responsive layout,
   and purposeful/reduced motion.
10. Add route, component, reducer, import-boundary, privacy, idempotency, and
    connected-journey evidence.
11. Inspect desktop/tablet/mobile visuals and repair hierarchy, overflow,
    truthfulness, privacy, and financial-state ambiguity.
12. Update current-state architecture and final evidence only after
    implementation exists; mark `VERIFYING` or `DONE` only when every
    applicable criterion has named evidence.

## Definition of done

- [ ] Journeys A–D form one connected, understandable consumer experience.
- [ ] Public information explains the product without private data or false
      coverage, score, urgency, or official-status claims.
- [ ] Production Google and fixture credential paths are equally discoverable
      and unmistakably different in authority.
- [ ] Preview passwords, identities, roles, family, and commerce state remain
      isolated from production APIs, auth state, storage, logs, analytics, and
      evidence artifacts.
- [ ] Google Student reuses `VS-001`; credential Student reaches only PX-001
      fixtures; Parent never mutates production role.
- [ ] Family/privacy and parent-support surfaces expose no private student
      conversation, note, staff record, or mastery/plan control.
- [ ] Product, payer, recipient, amount, subject, exam language, validity,
      coverage, limits, deadline, order state, and authority remain explicit.
- [ ] Duplicate confirmation/paid outcomes are idempotent and no unpaid state
      yields a receipt or entitlement.
- [ ] Refund and renewal copy makes no promise or automatic-charge claim.
- [ ] State completeness, restart/recovery, keyboard, focus, dialogs,
      responsive behavior, reduced motion, and all three interface locales have
      named evidence.
- [ ] TypeSpec, generated declarations, backend, migrations, production
      storage, and production telemetry remain unchanged.
- [ ] Referenced stories/slices remain production-incomplete and every preview
      surface has a promotion/deletion owner.
- [ ] `docs/ARCHITECTURE.md`, `docs/PLAN.md`, `COVERAGE.md`, and this brief
      accurately describe the final result.
- [ ] Product owner completes the bounded final consumer-journey and visual
      review before `DONE`.

## Known limitations and remaining decisions

- Preview identity, parent, family, commercial, notification, and support state
  is memory-only and may reset on refresh.
- Public products, prices, coverage, payment methods, dates, orders, provider
  results, receipts, entitlements, and cases are fictional samples.
- Production credential outcomes exist as `US-AUTH-03` and `US-AUTH-04`, but
  no credential-authentication slice ID, contract, or implementation exists.
  Create those artifacts only when the production vertical slice enters
  shaping.
- Production parent activation, family authorization, catalog, payment
  provider, entitlement, receipt, refund, notification, export/deletion, and
  support semantics still require their own human-reviewed vertical slices.
- No blocking decision remains for this preview boundary. New evidence that
  changes money, privacy, role, minor, or production-auth semantics reopens the
  human gate.

## Promotion and deletion rule

Promotion remains:

```text
validated preview
-> selected production story/slice
-> bounded human decisions
-> TypeSpec contract
-> generated declarations
-> production frontend/backend/persistence/provider behavior
-> integration evidence
```

Preview models must not be copied directly into TypeSpec. Each production slice
revalidates authorization, retention, minor consent, payer/recipient,
immutability, idempotency, provider verification, expiry, receipt ownership,
refund, unlinking, notification, audit, and observability semantics. Reuse only
presentation code that still fits the accepted contract and delete superseded
fixtures/routes rather than retaining parallel paths indefinitely.

## Verification evidence

| Evidence                                     | Result                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Documentation sufficiency                    | Complete for plan revision 2                                                                   |
| Human decision gate                          | Approved on 2026-07-24                                                                         |
| Current implementation inspection            | Completed during shaping; PX-001 is committed and the PX-002 implementation does not yet exist |
| Contract build/generated check               | Not run; no contract change is planned                                                         |
| Frontend typecheck/lint/tests/build          | Not run; implementation has not started                                                        |
| Connected browser journeys                   | Not run; implementation has not started                                                        |
| Responsive/accessibility/localization review | Not run; implementation has not started                                                        |
| Backend/migration verification               | Not run; no backend or migration change is planned                                             |

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                             |
| -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2        | 2026-07-24 | Linked the production credential stories `US-AUTH-03` and `US-AUTH-04` while preserving the fixture-only PX-002 boundary and deferring the production slice and contract to shaping.                                                               |
| 1        | 2026-07-24 | Created the accepted no-HTTP PX-002 shaping boundary, including production Google versus fixture credential authority, public/role/parent/family/commerce journeys, safety invariants, traceability, acceptance evidence, and promotion ownership. |
