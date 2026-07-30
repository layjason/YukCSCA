# YukCSCA User Story Backlog

**Backlog version:** 0.3.1
**Updated:** 2026-07-30
**Status:** Supporting decomposition; non-normative

**Language convention:** User stories, flows, and acceptance criteria are written in English. Acceptance criteria use Given/When/Then semantics.
**Source authority:** The paired YukCSCA requirements remain normative. This backlog decomposes those requirements into implementable user outcomes and must not override them.

## 1. How this backlog should be used

A user story is implementation-ready only when it represents one actor pursuing one outcome that can be demonstrated end to end. A story may cross UI, API, domain, persistence, events, and tests; it must not be split into “frontend story” and “backend story.”

Recommended form:

> **As a** specific actor, **I want** one capability or decision, **so that** one user value is achieved.

Each story below contains:

- a closed-loop outcome;
- the normal user flow;
- acceptance criteria covering success and relevant validation, authorization/privacy, retry, or stale-state behavior;
- explicit exclusions to prevent scope growth.

### Relationship to `PLAN.md` and vertical slices

- Requirements define product truth.
- User stories define small user-observable outcomes.
- `PLAN.md` selects delivery order and status.
- A vertical slice may implement one story or a tightly coupled set of stories, but it must still have one demonstrable outcome.
- TypeSpec describes the public HTTP contract after a story/slice is shaped; it is not the user story itself.

## 2. Story quality rules

1. Avoid verbs such as “manage,” “support,” or “handle” unless the exact state transition is named.
2. Do not combine create, edit, delete, approve, pay, refund, and report into one story.
3. A story closes only when the actor can observe the result.
4. Acceptance criteria must include the most important failure and permission boundary, not only the happy path.
5. Explanation language and exam language are separate in every applicable story.
6. Mastery requires evidence; opening content, watching video, or receiving an LLM opinion is never enough.
7. Parent access is summary-first and never includes complete private conversations or notes by default.
8. Tutoring purchase creates a request for manual matching, not an instant named-tutor booking.
9. Direct subject preparation, contextual Q&A, topic practice, mistake remediation, and the core mock lifecycle do not require an active study plan; only stories that explicitly read or update a plan may depend on one.
10. Official syllabus topics remain separate from YukCSCA-authored learning objectives and content. The pilot uses simple Draft, Published, and Archived states, and each assessment attempt saves the exact question data shown to the student.

## 3. Proposed story backlog

## Epic A — Identity, Profiles, and Language

> **PX-002 prototype qualification:** PX-002 may represent the long-term P0
> email/password account-entry experience through deterministic frontend
> fixtures alongside production Google sign-in. This preview does not close a
> production authentication story or remove the required later production
> capability. `US-AUTH-03` and `US-AUTH-04` record the later production
> outcomes; their credential-authentication slice and contract must be shaped
> before implementation.

### US-AUTH-01 — Sign in with Google

- **Priority:** P0
- **Actor:** Any new or returning user
- **Requirement reference:** 1.1

**User story**

> As a user, I want to sign in with Google so that I can access YukCSCA without creating another password.

**Closed-loop outcome**

A verified Google identity becomes one authenticated YukCSCA account with no inferred product role.

**Main flow**

1. Open the sign-in page.
2. Choose Google sign-in and complete provider verification.
3. Return to YukCSCA as an authenticated user.
4. Continue to role-specific onboarding when the account is still unassigned.

**Acceptance Criteria**

- Given a valid Google credential for the configured application, when it is submitted, then the same Google subject maps to exactly one YukCSCA account and an authenticated session is created.
- Given an expired, malformed, or wrong-audience credential, when sign-in is attempted, then no account session is issued and a safe error is shown.
- Given a newly created account, when sign-in succeeds, then the account remains unassigned and receives no student, parent, tutor, or admin permissions automatically.
- Given repeated sign-in with the same Google identity, when authentication succeeds, then no duplicate YukCSCA account is created.

**Not included in this story:** Student profile creation, parent linking, tutor approval, and admin account setup.

### US-AUTH-02 — Restore and end a session

- **Priority:** P0
- **Actor:** Authenticated user
- **Requirement reference:** 1.1

**User story**

> As an authenticated user, I want my session to be restored securely and to sign out explicitly so that access remains convenient and controlled.

**Closed-loop outcome**

The user can return without signing in again while the refresh session is valid, and can revoke that session by signing out.

**Main flow**

1. Open YukCSCA with an existing valid session.
2. Allow the application to restore the current identity.
3. Use protected pages.
4. Select sign out to end access on that browser.

**Acceptance Criteria**

- Given a valid refresh session, when the access session expires, then YukCSCA restores the session without exposing the refresh credential to application code.
- Given a revoked, expired, or replayed refresh credential, when restoration is attempted, then protected access is denied and the user is returned to sign-in.
- Given an authenticated user, when the user signs out, then the current refresh session is revoked and protected pages are no longer accessible.
- Given an unauthenticated request, when a protected page or current-user endpoint is opened, then no private account data is disclosed.

**Not included in this story:** A user-facing multi-device session manager.

### US-AUTH-03 — Register and sign in with verified email credentials

- **Priority:** P0
- **Actor:** New or returning user
- **Requirement reference:** 1.1

**User story**

> As a user, I want to create and access YukCSCA with a verified email address
> and password so that I can use the platform without a third-party identity
> provider.

**Closed-loop outcome**

An eligible verified email address becomes exactly one credential account, an
email already owned by another authentication method keeps that account
unchanged, and valid credentials establish an authenticated YukCSCA session
without inferring a product role.

**Main flow**

1. Enter an email address and request verification.
2. Receive the verification message and open its valid link.
3. Choose and confirm a password that satisfies the accepted policy, accept
   the active universal Terms version, and acknowledge the active Privacy
   Notice version.
4. Explicitly complete verification so the credential account is created
   without issuing a session.
5. Sign in with the verified email and password.
6. Continue to role-specific onboarding while the account remains unassigned.

**Acceptance Criteria**

- Given a valid unused email address, when verification is requested, then one
  expiring email-verification claim and eligible delivery attempt are created
  without creating an account, password credential, role, or session.
- Given a pending verification claim or an email without a verified credential,
  when sign-in is attempted, then no authenticated session is issued and a safe
  verification restart path is offered without disclosing account state.
- Given a valid, unexpired, single-use verification credential, a conforming
  confirmed password, acceptance of the active universal Terms version, and
  acknowledgement of the active Privacy Notice version, when the user
  explicitly completes verification, then the credential is consumed and
  exactly one verified `UNASSIGNED` credential account plus accepted password
  hash and minimum version/timestamp policy evidence are created atomically
  without issuing a session.
- Given role-neutral credential registration, then it does not collect age or
  infer role, minor status, guardian identity, or guardian consent; those
  consequences belong to the accepted role-activation flow.
- Given a credential-only account before role-profile activation, then its
  display name is absent, no profile name is collected, and no name is derived
  or persisted from the email address. API consumers accept a null display
  name and may show a localized presentation-only fallback that is never
  persisted.
- Given production Terms or Privacy content/version configuration is missing,
  when credential enrollment is attempted, then no account is created and
  Google sign-in remains available.
- Given a valid verification credential for an email already bound to an
  existing Google account, when completion is attempted, then the claim is
  closed without creating or storing a password credential, account, link, or
  session; the existing account remains unchanged and the user is directed to
  sign in with Google. Adding a password or linking methods requires an
  authenticated existing account and remains outside this story.
- Given a verified account and valid credentials, when sign-in succeeds, then
  a secure YukCSCA session is created and a new account remains `UNASSIGNED`.
- Given an unknown email, wrong password, malformed request, expired
  verification credential, or excessive attempts, when the operation is
  attempted, then no account/session state is disclosed or issued and a safe,
  rate-limited error is returned.
- Given repeated registration, verification, or sign-in requests, when they
  are processed, then the same email does not create duplicate credential
  accounts and a verification credential cannot be reused.

**Not included in this story:** Password recovery, production Parent/Student
activation or profile-data collection, authenticated password addition or
social-account linking, multi-factor authentication, or a user-facing session
manager.

### US-AUTH-04 — Recover an email/password account

- **Priority:** P0
- **Actor:** User with a credential account
- **Requirement reference:** 1.1

**User story**

> As a user who cannot remember my password, I want to reset it through my
> verified email address so that I can regain access without revealing whether
> an account exists.

**Closed-loop outcome**

The user can request a non-enumerating recovery message, replace the password
through a valid single-use recovery credential, and sign in with the new
password.

**Main flow**

1. Enter the account email on the recovery page.
2. Receive the same safe confirmation whether or not the account exists.
3. Open a valid recovery link for a verified credential account.
4. Choose and confirm a conforming new password.
5. Return to sign-in and authenticate with the new password.

**Acceptance Criteria**

- Given any syntactically valid email address, when recovery is requested, then
  the response does not disclose whether an account exists.
- Given an eligible verified credential account, when recovery is requested,
  then one bounded-lifetime, single-use recovery credential is issued through
  the accepted email-delivery boundary without storing its plaintext value.
- Given an invalid, expired, already-used, or account-mismatched recovery
  credential, when reset is attempted, then the password remains unchanged and
  a safe restart path is shown.
- Given a valid recovery credential and conforming new password, when reset
  succeeds, then the credential cannot be reused and the old password no
  longer authenticates.
- Given repeated recovery requests or reset attempts, when rate limits are
  exceeded, then processing is bounded without exposing account existence or
  sensitive credential data.
- Given successful reset, when session-security consequences are applied, then
  they follow the explicit revocation policy accepted by the future
  credential-authentication slice.

**Not included in this story:** Recovery through an unverified destination,
customer-service identity override, multi-factor recovery, or implementation
of an email provider outside the accepted production slice.

### US-PROF-01 — Activate a student account

- **Priority:** P0
- **Actor:** Unassigned user
- **Requirement reference:** 1.2, 1.3

**User story**

> As a prospective student, I want to create my learner profile so that YukCSCA can personalize my preparation.

**Closed-loop outcome**

A valid unassigned account becomes a student account with exactly one learner profile.

**Main flow**

1. Choose the Student role.
2. Enter the minimum learner profile fields.
3. Choose a supported default explanation language.
4. Submit and enter the student dashboard.

**Acceptance Criteria**

- Given an authenticated unassigned account, when a valid learner profile is submitted, then one profile is stored and the account role becomes Student atomically.
- Given missing required fields, implausible birth year, unsupported language, or overlong values, when submitted, then no profile or role change is persisted and field-level errors are returned.
- Given an account already assigned to Parent, Tutor, or Admin, when student activation is attempted, then the request is rejected.
- Given a completed student profile, when the student signs in again, then onboarding is not repeated.

**Not included in this story:** Learning-goal selection and diagnostics.

### US-PROF-02 — Edit a student profile

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 1.2

**User story**

> As a student, I want to update my non-sensitive profile information so that my account remains accurate.

**Closed-loop outcome**

Allowed profile fields change without deleting learning records or silently changing exam enrollment.

**Main flow**

1. Open profile settings.
2. Edit an allowed field such as nickname, grade, or city.
3. Review validation feedback.
4. Save and see the updated profile.

**Acceptance Criteria**

- Given a student editing an allowed field, when valid data is saved, then the new value is shown on the next read.
- Given an invalid value, when save is attempted, then the existing profile remains unchanged.
- Given a change to current grade or city, when saved, then prior diagnostics, mastery, orders, and learning history remain intact.
- Given a contact field that requires verification, when changed, then the new contact is not treated as verified until verification completes.

**Not included in this story:** Changing target exam subjects or account deletion.

### US-PROF-03 — Activate a parent account

- **Priority:** P0
- **Actor:** Unassigned user
- **Requirement reference:** 1.1, 1.2, 1.3

**User story**

> As a parent, I want to activate a parent profile so that I can support a student without using the student's account.

**Closed-loop outcome**

A valid unassigned identity becomes a parent account with one parent profile and no student data access until a relationship is created.

**Main flow**

1. Choose the Parent role.
2. Enter the minimum parent profile and notification details.
3. Accept the applicable terms and privacy explanation.
4. Enter the parent dashboard with no linked student yet.

**Acceptance Criteria**

- Given an authenticated unassigned account, when a valid parent profile is submitted, then one parent profile is created and the account role becomes Parent atomically.
- Given missing required fields, unsupported contact values, or overlong input, when submitted, then no profile or role change is persisted.
- Given an account already assigned to Student, Tutor, or Admin, when parent activation is attempted, then the request is rejected.
- Given a newly activated parent, when the dashboard opens, then no student learning data is returned until a valid relationship exists.

**Not included in this story:** Creating or linking a student.

### US-PROF-04 — Edit a parent profile

- **Priority:** P0
- **Actor:** Parent
- **Requirement reference:** 1.2

**User story**

> As a parent, I want to update my profile and notification contact information so that service communication remains accurate.

**Closed-loop outcome**

Allowed parent-profile fields change while verified contact status and relationship records remain consistent.

**Main flow**

1. Open profile settings.
2. Edit an allowed field.
3. Reverify a changed important contact when required.
4. Save and see the updated profile.

**Acceptance Criteria**

- Given a valid unrestricted field change, when saved, then the next profile read returns the new value.
- Given an important contact change, when saved, then the new contact is not treated as verified until verification completes.
- Given invalid input, when save is attempted, then the previous profile remains unchanged.
- Given a profile change, then existing parent-student relationships, orders, and receipts remain intact.

**Not included in this story:** Changing relationship permissions or deleting the account.

### US-LANG-01 — Set the default explanation language

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 1.4

**User story**

> As a student, I want to choose my default explanation language so that lessons and tutor explanations are understandable to me.

**Closed-loop outcome**

The chosen explanation language applies to explanatory content while exam language remains unchanged.

**Main flow**

1. Open language settings.
2. Choose Bahasa Indonesia, English, or Simplified Chinese.
3. Save the preference.
4. Open learning content and see explanations in the selected language.

**Acceptance Criteria**

- Given a supported explanation language, when the student saves it, then course explanations, agent answers, supplementary solutions, and terminology definitions use that language where content exists.
- Given a subject enrolled in English or Chinese exam language, when the explanation language changes, then the subject and question language do not change.
- Given an unsupported language value, when it is submitted, then the server rejects it and preserves the previous preference.
- Given existing learning records, when the preference changes, then mastery, attempts, and plans are preserved.

**Not included in this story:** Interface locale and temporary per-session switching.

### US-LANG-02 — Temporarily switch explanation language

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 1.4

**User story**

> As a student, I want to switch explanation language for one learning session so that I can clarify a difficult concept without changing my permanent preference.

**Closed-loop outcome**

The active course or agent session uses a temporary language and returns to the default afterward.

**Main flow**

1. Open a course or agent session.
2. Choose another supported explanation language.
3. Continue the current session.
4. End the session and return to the saved default.

**Acceptance Criteria**

- Given an active learning session, when the student chooses another supported explanation language, then subsequent explanations in that session use it.
- Given a temporary switch, when the session ends or a new independent session begins, then the saved default language is restored.
- Given a temporary switch, then the exam-language terms and original question language remain unchanged.
- Given unsupported or unavailable translated content, then the platform clearly falls back or explains the limitation rather than silently changing meaning.

**Not included in this story:** Persisting a new default language.

### US-LANG-03 — Change a confirmed subject exam language

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 1.4, 4.4

**User story**

> As a student, I want to change a confirmed subject's exam language after reviewing the impact so that my preparation matches the exam I will take.

**Closed-loop outcome**

The subject retains its identity while its exam-language track changes through a confirmed rematching process.

**Main flow**

1. Open the confirmed subject settings.
2. Choose another supported exam language.
3. Review changes to terminology, future questions, diagnostics, and future plan tasks.
4. Confirm the change.

**Acceptance Criteria**

- Given a supported subject-language combination, when the student proposes a change, then the impact on terminology tasks, future questions, diagnostics, entitlements, and the active plan is shown before confirmation.
- Given confirmation, then future work uses the new exam-language track while historical attempts remain attached to their original track.
- Given a required or purchased track conflict, then the platform shows the risk or entitlement limitation and does not silently discard access or progress.
- Given the update fails, then the previous confirmed exam language and active plan remain intact.

**Not included in this story:** Changing the default explanation language.

### US-ADMIN-01 — Configure the first platform admin account

- **Priority:** P0
- **Actor:** Platform owner
- **Requirement reference:** 1.1, 1.3, 14.1

**User story**

> As the platform owner, I want to set one verified account as the first platform admin so that the pilot admin dashboard can be used without building admin-account management first.

**Closed-loop outcome**

The configured account signs in normally and can open the pilot admin dashboard. Other users do not receive admin access.

**Main flow**

1. Add one verified email address or provider identity to the deployment configuration.
2. Let that person sign in through the existing login flow.
3. Recognise the exact account as the platform admin.
4. Open the admin dashboard and record important admin actions.

**Acceptance Criteria**

- Given the exact configured identity, when the user signs in successfully, then the account can access the admin features delivered in the pilot.
- Given any other identity, when the user signs in, then no admin access is granted automatically.
- Given the application starts more than once, then the same account remains the admin and no duplicate account or role is created.
- Given an important admin action, then the admin account, time, result, and required reason are recorded.
- Given the pilot UI, then there is no public admin registration, admin invitation, admin-account creation page, or permission-management page.

**Not included in this story:** A second admin account, separate admin roles, delegated permissions, or self-service admin account management.

### US-ACCOUNT-01 — Request account deletion

- **Priority:** P0
- **Actor:** Student or parent
- **Requirement reference:** 1.2; privacy NFR

**User story**

> As a user, I want to request account deletion after seeing the consequences so that I can exercise control over my data.

**Closed-loop outcome**

A deletion request follows a deterministic lifecycle that protects legal, financial, relationship, and learning-record obligations.

**Main flow**

1. Open account lifecycle settings.
2. Review effects on entitlements, linked relationships, active tutoring, and retained records.
3. Confirm the deletion request.
4. Receive a trackable outcome or required next action.

**Acceptance Criteria**

- Given an eligible account with no blocking obligation, when deletion is confirmed, then access is disabled and deletable data is removed or scheduled according to policy.
- Given active paid entitlements, unsettled refunds, or active tutoring, when deletion is requested, then the platform explains the blocker and does not silently lose obligations.
- Given a linked parent-student relationship, when deletion completes, then the relationship state is updated consistently for both accounts.
- Given records that must legally or operationally be retained, then the platform identifies the category and does not claim immediate total erasure.

**Not included in this story:** Data export and granular deletion of individual learning events.

### US-ACCOUNT-02 — Request a personal-data export

- **Priority:** P0
- **Actor:** Student or parent
- **Requirement reference:** Privacy and Protection of Minors NFR

**User story**

> As a user, I want to request an export of data YukCSCA can lawfully provide so that I can understand and retain my records.

**Closed-loop outcome**

An authenticated request enters a trackable export lifecycle and produces an authorized, time-limited result or an explained limitation.

**Main flow**

1. Open privacy settings.
2. Review export scope and identity-verification requirements.
3. Submit the request.
4. Receive and access the export through an authorized time-limited method.

**Acceptance Criteria**

- Given an authenticated eligible user, when an export is requested, then one traceable request is created without immediately exposing data in the browser response.
- Given export completion, then only data the requester owns or may lawfully access is included.
- Given linked student data, then parent access follows the same summary and privacy boundaries as the product rather than exporting private conversations by default.
- Given an expired or already-used download authorization, when access is attempted, then the export is not disclosed.

**Not included in this story:** Exporting internal fraud signals, other users' private data, or protected assessment content.

## Epic B — Parent–Student Relationship
### US-FAM-00 — Parent creates a student account

- **Priority:** P0
- **Actor:** Parent
- **Requirement reference:** 2.1

**User story**

> As a parent, I want to create a student account with minimum information so that the student can activate their own learning access later.

**Closed-loop outcome**

A parent creates one pending student identity, receives the permitted relationship access, and the student receives a secure activation path.

**Main flow**

1. Open family settings.
2. Enter the student's minimum required information.
3. Review the privacy and access boundaries.
4. Create the pending student account.
5. Deliver the activation method to the student.

**Acceptance Criteria**

- Given an authenticated parent and valid minimum student data, when submitted, then one pending student account and one parent-student relationship are created atomically.
- Given a duplicate verified identity or an existing conflicting relationship, when creation is attempted, then no duplicate student account is created.
- Given creation succeeds, then the student receives a secure first-login or activation method and must confirm personal information and applicable terms before learning access.
- Given the pending relationship, then the parent receives only the default summary and payment-management permissions defined by the requirements.

**Not included in this story:** The student's activation confirmation flow and multiple dependent students in the first version.

### US-FAM-04 — Activate a parent-created student account

- **Priority:** P0
- **Actor:** Pending student
- **Requirement reference:** 2.1

**User story**

> As a student whose account was created by a parent, I want to activate it and confirm my information so that I control my own learning access.

**Closed-loop outcome**

A valid pending student identity becomes an active student account without creating a duplicate account or changing the established parent relationship.

**Main flow**

1. Open the secure activation method.
2. Authenticate or bind the verified identity required by the pilot.
3. Confirm or correct permitted personal information and applicable terms.
4. Enter the student onboarding flow.

**Acceptance Criteria**

- Given a valid unused activation authorization, when the student verifies identity and confirms required information, then the pending account becomes active exactly once.
- Given an expired, revoked, mismatched, or already-used authorization, then activation is denied without exposing student data.
- Given the verified identity already belongs to another YukCSCA account, then the system prevents duplicate account creation and routes the conflict for safe resolution.
- Given activation succeeds, then the existing parent relationship remains visible with the same disclosed access boundaries.

**Not included in this story:** Changing the primary parent or completing the diagnostic.

### US-FAM-01 — Invite a primary parent

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 2.2

**User story**

> As a student, I want to invite one primary parent so that they can support my learning and purchases without using my account.

**Closed-loop outcome**

A pending relationship invitation is created with clear privacy boundaries.

**Main flow**

1. Open family settings.
2. Review what a linked parent can and cannot see.
3. Enter the parent's verified contact or select an existing account.
4. Send the invitation and view its pending state.

**Acceptance Criteria**

- Given a student with no primary parent, when a valid invitation is sent, then one pending invitation is created and the parent is notified.
- Given an already linked primary parent, when another primary invitation is attempted, then the platform blocks or explicitly starts a replacement process.
- Given the invitation screen, then it clearly states that complete agent conversations and private notes are not shared by default.
- Given an expired or revoked invitation, when it is opened, then no relationship is created.

**Not included in this story:** Admin dispute resolution and multiple guardian permission models.

### US-FAM-02 — Accept a student-parent link

- **Priority:** P0
- **Actor:** Parent
- **Requirement reference:** 2.2, 10.4

**User story**

> As a parent, I want to accept a student's invitation so that I can view approved summaries and support the student.

**Closed-loop outcome**

Both accounts see an active relationship with the same permission explanation.

**Main flow**

1. Open the invitation while authenticated as a parent.
2. Review the student identity and access boundaries.
3. Accept the link.
4. Open the parent dashboard for that student.

**Acceptance Criteria**

- Given a valid pending invitation addressed to the parent, when accepted, then the relationship becomes active for both accounts.
- Given a mismatched parent account, when acceptance is attempted, then the relationship is not created.
- Given an active link, when the parent opens the student's data, then only summary-level permitted information is returned.
- Given the student later opens family settings, then the linked parent's identity and current relationship state are visible.

**Not included in this story:** Purchasing and unlinking.

### US-FAM-03 — Unlink a parent and student

- **Priority:** P0
- **Actor:** Student or parent
- **Requirement reference:** 2.3

**User story**

> As a linked student or parent, I want to request unlinking so that the relationship can end without corrupting orders or learning records.

**Closed-loop outcome**

The relationship ends while ownership of historical payments, receipts, and student learning data remains clear.

**Main flow**

1. Open relationship settings.
2. Review unlinking consequences.
3. Confirm unlinking.
4. See the relationship removed or moved to review when a dispute exists.

**Acceptance Criteria**

- Given a normal active link, when either party confirms unlinking, then future parent summary access ends.
- Given orders previously paid by the parent, when unlinking completes, then the payer can still access their own receipts and refund records but cannot access new student learning data.
- Given an active tutoring booking or unresolved dispute, when unlinking is requested, then the platform preserves service obligations and may route the relationship to admin review.
- Given unlinking completion, then student mastery, plans, and entitlements are not deleted.

**Not included in this story:** Changing the designated student beneficiary of a completed purchase.

## Epic C — Goals, Subject Matching, Diagnostics, and Planning
### US-GOAL-01 — Record the preparation goal

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 3.1

**User story**

> As a student, I want to record my target exam date and study availability so that YukCSCA can plan realistic preparation.

**Closed-loop outcome**

A validated goal profile becomes the current planning input.

**Main flow**

1. Enter the target exam date.
2. Enter weekly available study time and preferred study days.
3. Select known university/major intentions or mark them undecided.
4. Save the goal profile.

**Acceptance Criteria**

- Given a future exam date and valid weekly availability, when saved, then the goal profile becomes available to diagnostics and planning.
- Given a past exam date or impossible availability values, when submitted, then the profile is rejected with actionable validation.
- Given undecided university or major choices, when saved, then the student may continue with a provisional CSCA preparation path.
- Given one or more target choices, when saved, then exactly one current primary target is identified for the first complete matching and planning flow.
- Given a later goal change, then previous learning evidence is retained and plan feasibility is marked for recalculation.

**Not included in this story:** Subject confirmation and diagnostic assessment.

### US-GOAL-02 — Receive sourced exam-subject recommendations

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 3.2

**User story**

> As a student, I want sourced CSCA subject and exam-language recommendations so that I can distinguish verified requirements from provisional guidance.

**Closed-loop outcome**

The system produces an explainable recommendation set whose claims retain authority, applicability, and freshness evidence.

**Main flow**

1. Complete or update target information, or request a provisional recommendation.
2. Run subject matching against current verified requirement records.
3. Review each subject-language recommendation, source, applicability, and confidence/status.
4. Proceed to confirmation or choose a direct preparation track.

**Acceptance Criteria**

- Given sufficient target information and verified rules, when matching runs, then each recommendation shows its reason, authority, source locator, effective/verification date, and applicability conditions.
- Given conflicting or incomplete reliable requirements, then the system shows alternatives or uncertainty rather than presenting one combination as certain.
- Given a stale or review-due source, then the recommendation is visibly qualified and cannot be presented as currently verified.
- Given no reliable match, then the student is told what evidence is missing and may choose a provisional or direct-preparation path.
- Given the student already knows the required subjects, then they can bypass matching without fabricating a recommendation.

**Not included in this story:** Final subject confirmation and commercial entitlement purchase.

### US-GOAL-03 — Confirm or adjust target subjects

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 3.3

**User story**

> As a student, I want to confirm or adjust the recommended subjects so that my learning plan reflects my actual decision.

**Closed-loop outcome**

A reviewed subject-language selection becomes the canonical target enrollment.

**Main flow**

1. Review recommended subjects.
2. Accept, remove, or add a supported subject-language track.
3. Read any compatibility warning.
4. Confirm the final selection.

**Acceptance Criteria**

- Given a recommendation, when the student confirms it, then the selected subject-language tracks become the planning and diagnostic targets.
- Given a manual change that may not satisfy a selected university requirement, then the platform shows a warning before confirmation.
- Given Mathematics (English) and Mathematics (Chinese), then they use the same mathematical framework but remain distinct exam-language tracks.
- Given a confirmed selection is changed later, then existing attempts remain attached to their original subject-language track and feasibility is recalculated.

**Not included in this story:** Payment entitlement checks.

### US-DIAG-01 — Start and resume a diagnostic

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 3.4

**User story**

> As a student, I want to complete a diagnostic in my confirmed exam language and resume after interruption so that YukCSCA can measure my starting point.

**Closed-loop outcome**

A diagnostic attempt stores sufficient valid responses and can resume until submitted.

**Main flow**

1. Choose a confirmed subject diagnostic.
2. Answer topic-based questions in the subject's exam language.
3. Leave and resume if necessary.
4. Submit after reaching the minimum valid response volume.

**Acceptance Criteria**

- Given a confirmed subject, when the diagnostic starts, then question language matches that subject's exam language.
- Given Chinese Mathematics, then the diagnostic also includes terminology or question-stem comprehension evidence.
- Given an interrupted unfinished attempt, when the student returns, then saved responses and position are restored.
- Given fewer than the minimum valid responses, when submission is attempted, then no final diagnostic result is produced.

**Not included in this story:** First-week plan generation.

### US-DIAG-02 — View diagnostic results

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 3.4

**User story**

> As a student, I want an understandable diagnostic report so that I know my strengths, weaknesses, and starting point.

**Closed-loop outcome**

The submitted attempt produces an evidence-based report separated by mathematics and exam-language comprehension where applicable.

**Main flow**

1. Submit a valid diagnostic.
2. Open the report.
3. Review overall level, topic evidence, typical errors, and language comprehension.
4. Open the recommended starting topic.

**Acceptance Criteria**

- Given a valid submitted diagnostic, then the report shows overall level, topic-level evidence, typical error patterns, and a recommended starting point.
- Given Chinese Mathematics, then mathematical weakness and terminology/question-comprehension weakness are shown separately.
- Given insufficient evidence for a topic, then the report marks it as not sufficiently assessed rather than guessing mastery.
- Given the report, then the student can navigate to the next recommended learning action.

**Not included in this story:** Predicting a guaranteed exam score.

### US-PLAN-01 — Generate and confirm the first feasible plan

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 3.4, 3.5

**User story**

> As a student, I want YukCSCA to propose a feasible initial plan from my goals and available evidence so that I can begin structured study without discarding work already completed.

**Closed-loop outcome**

A bounded plan proposal uses current goal, workload, diagnostic, practice, mistake, remediation, and mock evidence and becomes active only after review and confirmation.

**Main flow**

1. Request guided planning after recording the required goal inputs.
2. Review the evidence basis, priorities, tasks, workload, and risk.
3. Adjust intensity or choose an allowed feasibility response.
4. Confirm the proposed plan version.

**Acceptance Criteria**

- Given sufficient goal, workload, and learner evidence, when generation runs, then the proposal explains which diagnostic, practice, mistake, remediation, or mock evidence affected each priority.
- Given no prior practice or mock evidence, then a valid diagnostic may provide the minimum learner evidence; missing evidence is never invented.
- Given existing direct-preparation evidence, then it is retained and can influence the proposal rather than being reset by onboarding.
- Given insufficient workload or learner evidence, then the result is provisional or blocked with the missing inputs identified.
- Given the student confirms the current proposal version, then exactly that version becomes active.
- Given the proposal became stale before confirmation, then activation is rejected safely and a refreshed proposal is shown.

**Not included in this story:** Daily task completion and later reprioritization.

### US-PLAN-02 — Assess plan feasibility

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 3.5

**User story**

> As a student, I want to know whether my preparation plan can be completed before the exam so that I do not follow an impossible schedule.

**Closed-loop outcome**

The platform classifies the plan as On Track, At Risk, or High Risk and explains the decision.

**Main flow**

1. Open plan feasibility.
2. Review remaining time, available time, estimated required time, and syllabus progress.
3. Read the risk level and reasons.
4. Choose an adjustment when needed.

**Acceptance Criteria**

- Given current exam date, subjects, diagnostic evidence, availability, remaining workload, and review obligations, when assessed, then one risk level is returned with reasons.
- Given insufficient weekly time, then the system proposes actionable changes rather than silently compressing all work.
- Given High Risk, then daily planning displays a warning and does not present the original schedule as safely achievable.
- Given a change to exam date, subjects, exam language, availability, or intensity, then feasibility is marked stale and recalculated.

**Not included in this story:** Guaranteed completion or score prediction.

### US-PLAN-03 — Apply a feasibility adjustment

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 3.5

**User story**

> As a student, I want to choose a proposed plan adjustment so that my tasks become more realistic while preserving my work.

**Closed-loop outcome**

A confirmed adjustment updates future tasks, stage goals, and completion estimate without rewriting historical evidence.

**Main flow**

1. Select a suggested adjustment such as more weekly time, narrowed priority, reduced non-core work, or a later exam date.
2. Review the impact.
3. Confirm the change.
4. See the revised plan and feasibility state.

**Acceptance Criteria**

- Given an actionable adjustment, when confirmed, then future tasks, stage goals, and estimated completion date are updated together.
- Given existing completed tasks and attempts, then they remain unchanged and traceable.
- Given a major priority reduction, then excluded or deferred topics are clearly identified.
- Given a failed update, then the previous active plan remains usable and no partial schedule is persisted.

**Not included in this story:** Automatic changes without student confirmation.

## Epic D — Courses, Syllabus, Practice, and Mistake Review
### US-COURSE-01 — Browse the subject course structure

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 4.1

**User story**

> As a student, I want to browse courses by subject, exam language, module, topic, and knowledge point so that I can understand the learning path.

**Closed-loop outcome**

The student can locate a learning unit and see readiness information before starting.

**Main flow**

1. Open a confirmed subject.
2. Browse modules and topics.
3. Review objective, prerequisites, estimated time, completion state, and linked practice.
4. Open one learning unit.

**Acceptance Criteria**

- Given a subject entitlement or trial access, when the catalog opens, then content is grouped by subject and exam language before module/topic.
- Given a topic, then its objective, estimated time, prerequisites, current status, and linked practice are visible.
- Given unavailable content, then it is labeled In Development or Not Yet Covered and cannot appear complete.
- Given Mathematics English and Chinese tracks, then shared mathematical structure is consistent while language-specific content remains distinct.

**Not included in this story:** Public product comparison and payment.

### US-SYL-01 — View official syllabus coverage

- **Priority:** P0
- **Actor:** Student or parent
- **Requirement reference:** 4.2

**User story**

> As a student or parent, I want to compare YukCSCA content with the official CSCA syllabus so that I understand the product's true coverage.

**Closed-loop outcome**

A coverage map tied to a named official syllabus version separates product content coverage from the student's personal progress.

**Main flow**

1. Open the syllabus coverage map.
2. Review official syllabus metadata and source.
3. Expand a module or knowledge point.
4. See platform coverage and personal learning status separately.

**Acceptance Criteria**

- Given a sold subject, then the map shows official syllabus name, version/publication date, source link, and last verification date.
- Given a knowledge point, then platform coverage uses only Fully Covered, Partially Covered, In Development, or Not Yet Covered.
- Given a linked student, then personal status is displayed separately from platform coverage.
- Given incomplete content, then no product or map label implies full coverage.

**Not included in this story:** Admin editing of syllabus mappings.

### US-COURSE-02 — Study a focused learning unit

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 4.3, 4.4

**User story**

> As a student, I want to study one focused learning unit and reach its checkpoint so that I am ready to demonstrate understanding.

**Closed-loop outcome**

The student consumes the required lesson content, preserves progress, and reaches the assessment entry without receiving unearned mastery.

**Main flow**

1. Open the assigned unit.
2. Review the concept explanation, formulas, examples, and terminology in the correct language dimensions.
3. Complete any unscored embedded interactions required for the lesson.
4. Reach the lesson checkpoint entry and see the next required action.

**Acceptance Criteria**

- Given a learning unit, then explanation language follows the current session preference while exam terms remain in the subject language.
- Given the student leaves and returns, then valid lesson progress resumes according to the supported content type.
- Given the required lesson content is completed, then the unit's content-progress state updates and the checkpoint becomes available.
- Given content completion without checkpoint evidence, then the knowledge point is not marked mastered.

**Not included in this story:** Scoring the in-course checkpoint or a guided agent session.

### US-COURSE-03 — Complete an in-course checkpoint

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 4.6

**User story**

> As a student, I want a short checkpoint after a lesson so that progression is based on evidence rather than viewing content.

**Closed-loop outcome**

A lesson checkpoint records independent evidence and routes the student to progression or targeted remediation.

**Main flow**

1. Finish the learning content.
2. Answer a small set of comprehension or application questions.
3. Submit the checkpoint.
4. Continue to the next task or receive targeted remediation and reassessment.

**Acceptance Criteria**

- Given a completed lesson, when its checkpoint opens, then it contains a small bounded set aligned to the lesson objective.
- Given Chinese Mathematics, then the checkpoint separately captures mathematical and essential terminology or question-stem evidence where relevant.
- Given a passing result, then the topic mastery evidence updates and the next task becomes available.
- Given a non-passing result, then the system routes to knowledge, language, or prerequisite remediation followed by another assessment rather than marking mastery.

**Not included in this story:** Exact mastery thresholds and long-form mock exams.

### US-COURSE-04 — Resume and control a micro-lesson

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 4.3

**User story**

> As a student, I want to resume a micro-lesson and use accessible playback or text alternatives so that unstable connectivity does not force me to restart.

**Closed-loop outcome**

The student can consume the lesson through supported media controls and return to the saved position without gaining unearned mastery.

**Main flow**

1. Open a text, image, formula, or short-video lesson.
2. Use subtitles, transcript, text summary, or playback-speed controls where applicable.
3. Leave after progress is saved.
4. Return to the previous position and finish viewing.

**Acceptance Criteria**

- Given a supported video lesson, then playback speed, subtitles, and a text summary are available according to the published content.
- Given saved lesson progress, when the student returns, then the last valid position is restored without marking the checkpoint complete.
- Given low bandwidth or media failure, then a meaningful text alternative and retry state are available.
- Given the student marks viewing complete, then the lesson-view state changes but mastery still requires assessment evidence.

**Not included in this story:** The lesson checkpoint and offline service-worker caching.

### US-TERM-01 — Use Chinese terminology assistance

- **Priority:** P0
- **Actor:** Student in Chinese Mathematics
- **Requirement reference:** 4.5, 5.3

**User story**

> As a Chinese Mathematics student, I want selectable word or phrase assistance so that I can understand exam language without translating the entire question.

**Closed-loop outcome**

The student receives bounded language help and the attempt records exactly what assistance was used.

**Main flow**

1. Open a Chinese Mathematics question or lesson.
2. Select a word or phrase.
3. View segmentation, pinyin, and meaning.
4. Continue solving the original-language item.

**Acceptance Criteria**

- Given a valid selected Chinese word or phrase, then the platform shows accurate segmentation, pinyin, and contextual meaning.
- Given language assistance is used, then it is recorded separately from mathematical hints.
- Given a formal mock where assistance is disabled, then no terminology assistance control is available.
- Given strong meaning assistance, then the attempt cannot be treated as fully independent mastery.

**Not included in this story:** Full-question translation during formal mock exams.

### US-TERM-02 — Preview required Chinese terminology

- **Priority:** P0
- **Actor:** Student in Chinese Mathematics
- **Requirement reference:** 4.5

**User story**

> As a Chinese Mathematics student, I want to preview the required terminology before a topic so that language does not hide the mathematics.

**Closed-loop outcome**

The student completes a bounded terminology preview linked to the upcoming topic.

**Main flow**

1. Open the assigned topic preview.
2. Study Chinese characters, pinyin, explanation-language definition, English equivalent, and mathematical meaning.
3. Complete a short recognition check.
4. Continue to the topic lesson.

**Acceptance Criteria**

- Given a Chinese Mathematics topic, then its required academic vocabulary, instructions, and logical expressions are available before the lesson.
- Given each term, then Chinese characters, pinyin, explanation-language definition, English equivalent, and mathematical meaning use one canonical term identity.
- Given unsupported translation content, then the limitation is explicit and the system does not silently substitute a different mathematical meaning.
- Given preview completion, then viewing alone does not claim topic mastery, but terminology exposure and check evidence are recorded.

**Not included in this story:** In-question assistance and long-term review scheduling.

### US-TERM-03 — Review the terminology notebook

- **Priority:** P0
- **Actor:** Student in Chinese Mathematics
- **Requirement reference:** 4.5

**User story**

> As a Chinese Mathematics student, I want clicked and mistaken terms collected for later review so that language weaknesses improve over time.

**Closed-loop outcome**

Relevant terms enter a terminology notebook and due items produce review evidence.

**Main flow**

1. Open the terminology notebook.
2. Review terms collected from course requirements, clicks, and language-related mistakes.
3. Complete a due recognition or contextual-use review.
4. See the next review state update.

**Acceptance Criteria**

- Given a required course term, selected term, or language-related mistake, then one canonical terminology record is created or updated without duplicate counting.
- Given the notebook, then source, topic, recent assistance, and review status are visible.
- Given a due review, when completed, then later scheduling reflects the student's evidence rather than only time since exposure.
- Given a formal mock, then notebook and assistance controls remain unavailable until submission.

**Not included in this story:** The exact spaced-review algorithm.

### US-PRACTICE-01 — Start topic practice

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 5.1

**User story**

> As a student, I want to practice a selected topic at an appropriate difficulty so that I can strengthen a specific knowledge point.

**Closed-loop outcome**

A bounded practice set is created, completed, scored, and linked to learning evidence.

**Main flow**

1. Choose subject, exam language, module/topic, and difficulty.
2. Review question count and estimated duration.
3. Answer the set.
4. Submit and review feedback according to the activity mode.

**Acceptance Criteria**

- Given a selected subject-language track, then generated questions use that exam language.
- Given the practice setup, then question count and estimated completion time are shown before starting.
- Given immediate-feedback mode, then feedback appears after each response; given set-feedback mode, it appears only after submission.
- Given completion, then attempts and relevant mastery evidence are stored once.

**Not included in this story:** Plan-generated practice and mock exams.

### US-PRACTICE-02 — Complete plan-assigned practice

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 5.2

**User story**

> As a student with an active plan, I want to complete the practice assigned by that plan so that the task and subsequent orchestration use my real evidence.

**Closed-loop outcome**

A submitted practice result updates the referenced plan task or is safely held for reconciliation when the plan version is stale.

**Main flow**

1. Open an assigned practice task from the active plan.
2. Complete the disclosed set in the subject's exam language.
3. Submit the set.
4. Review task completion and any proposed later-plan effect.

**Acceptance Criteria**

- Given an active plan task, when opened, then the assignment shows the target objective, expected effort, selection reason, and plan version.
- Given completion against the current plan version, then the task and daily progress update once.
- Given a stale, replaced, paused, or unavailable plan, then submitted evidence is preserved but no unrelated plan is modified.
- Given an item retry or duplicate result callback, then plan progress is not counted twice.
- Given no active plan, then this route is unavailable while topic practice remains available through `US-PRACTICE-01`.

**Not included in this story:** Generating a study plan or approving material reprioritization.

### US-HINT-01 — Request tiered hints

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 5.3

**User story**

> As a student, I want progressive hints instead of an immediate answer so that I can continue thinking independently.

**Closed-loop outcome**

Each hint level is disclosed, recorded, and reflected in mastery interpretation.

**Main flow**

1. Attempt a question.
2. Request the first hint.
3. Request stronger hints only if needed.
4. Submit an answer and review the solution.

**Acceptance Criteria**

- Given an unanswered or active question, when the first hint is requested, then it guides the next step without revealing the full solution.
- Given stronger hints or a full explanation, then each assistance level is recorded on the attempt.
- Given a correct answer after strong assistance, then the attempt contributes less to mastery and schedules later no-assistance reassessment.
- Given a submitted question, then the solution includes key steps, common mistakes, and links to relevant learning content.

**Not included in this story:** AI-generated scored questions.

### US-MISTAKE-01 — Capture an incorrect response

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 5.4

**User story**

> As a student, I want incorrect responses added automatically to my mistake notebook so that I do not lose important weaknesses.

**Closed-loop outcome**

An incorrect attempt creates or updates one traceable mistake record.

**Main flow**

1. Submit an incorrect answer.
2. Open the resulting feedback.
3. Open the mistake notebook entry.
4. See its history, knowledge point, assistance use, and review status.

**Acceptance Criteria**

- Given an incorrect scored response, then a mistake entry is created or its existing record is updated.
- Given the entry, then latest attempt, error count, linked knowledge point, hints/language assistance, and current review status are visible.
- Given duplicate processing or page refresh, then the same attempt does not increment the error count twice.
- Given a question is later edited or archived, then the mistake record still shows the exact question used in the original attempt.

**Not included in this story:** Student error-cause note and scheduled revalidation.

### US-MISTAKE-02 — Classify and annotate a mistake

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 5.4

**User story**

> As a student, I want to record why I made a mistake so that future remediation addresses the real cause.

**Closed-loop outcome**

The mistake stores one current cause classification plus an optional private student note.

**Main flow**

1. Open a mistake.
2. Choose knowledge gap, calculation error, language misinterpretation, carelessness, or time management.
3. Add an optional note.
4. Save and see the remediation recommendation update.

**Acceptance Criteria**

- Given a mistake, when the student selects a supported cause and saves, then the classification is stored with timestamp and source.
- Given a private note, then it is visible to the student and not exposed to a linked parent by default.
- Given a changed classification, then previous attempts remain traceable and the new classification affects future recommendations only.
- Given blank optional notes, then classification can still be saved.

**Not included in this story:** Admin academic correction of question content.

### US-MISTAKE-03 — Revalidate a reviewed mistake

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 5.4

**User story**

> As a student, I want a later no-assistance reassessment so that one lucky correct answer does not falsely close a weakness.

**Closed-loop outcome**

A due mistake moves through review and becomes stable only after sufficient later evidence.

**Main flow**

1. Open a due review task.
2. Answer an equivalent or repeated item without strong assistance.
3. Receive the result.
4. See the mistake remain open, move to review, or become stably mastered.

**Acceptance Criteria**

- Given a due mistake, when reassessment is completed independently and correctly, then its status improves but is not necessarily permanently closed after one answer.
- Given another incorrect response or strong assistance, then the review remains active and a later task is scheduled.
- Given sufficient delayed independent evidence, then the mistake can become stably mastered.
- Given the status changes, then the original error history remains accessible.

**Not included in this story:** Exact mastery algorithm calibration.

## Epic E — Agentic Learning
### US-AGENT-01 — View today's recommended tasks

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 6.1

**User story**

> As a student, I want a clear daily task list with reasons and time estimates so that I know what to do next.

**Closed-loop outcome**

The dashboard presents a feasible ordered task list derived from current evidence.

**Main flow**

1. Open today's dashboard.
2. Review ordered tasks.
3. Inspect why each task was assigned, its estimated time, and completion rule.
4. Start one task.

**Acceptance Criteria**

- Given an active plan, then today's tasks reflect exam date, available time, mastery, due reviews, and recent behavior.
- Given each task, then its reason, estimated duration, and completion criterion are visible.
- Given a High Risk plan, then the dashboard shows the risk warning with the tasks.
- Given no active plan, then the platform directs the student to the missing goal, diagnostic, or confirmation step.

**Not included in this story:** Executing the complete guided session.

### US-AGENT-02 — Reduce today's available study time

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 6.1

**User story**

> As a student, I want to reduce today's available time so that incomplete tasks are rescheduled instead of simply becoming failures.

**Closed-loop outcome**

The current day is shortened and unfinished work is redistributed transparently.

**Main flow**

1. Open today's plan.
2. Change today's available time.
3. Review which tasks remain, shorten, or move.
4. Confirm the adjusted day.

**Acceptance Criteria**

- Given a lower valid time budget, when recalculation runs, then tasks are prioritized by learning value and due risk.
- Given moved tasks, then their new dates and reasons are visible.
- Given already completed tasks, then they remain completed.
- Given a change that makes the broader plan infeasible, then plan-risk status is recalculated and shown.

**Not included in this story:** Changing permanent weekly availability.

### US-AGENT-03 — Complete a guided learning session

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 6.2

**User story**

> As a student, I want the agent to guide me through explanation, questioning, feedback, practice, and summary so that a session produces evidence and a next step.

**Closed-loop outcome**

One session ends with a recorded summary and plan update rather than an open-ended chat.

**Main flow**

1. Start a guided task.
2. Receive an explanation or diagnostic question.
3. Respond and receive adaptive feedback.
4. Complete practice.
5. Review the session summary and next task.

**Acceptance Criteria**

- Given a guided session, then the agent first assesses or elicits understanding before choosing the next explanation.
- Given evidence of a missing prerequisite, then the session may branch to that prerequisite and states why.
- Given the session ends, then a concise summary, evidence produced, remaining issue, and plan effect are stored.
- Given the student exits early, then the session is marked incomplete and does not claim mastery.

**Not included in this story:** General-purpose unrestricted chatting.

### US-AGENT-04 — Ask a grounded contextual question

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 6.3

**User story**

> As a student, I want to ask from my current learning context so that I receive a grounded explanation without needing an active study plan.

**Closed-loop outcome**

The student receives a traceable answer, an explicit insufficiency response, or a human-review path from authorised context.

**Main flow**

1. Ask from a lesson, item, mistake, terminology entry, or remediation unit.
2. Review the answer in the current explanation language with exam terminology preserved.
3. Inspect source basis or report the answer when needed.

**Acceptance Criteria**

- Given authorised current context, when the student asks, then the answer uses the exact lesson or question context provided and only the relevant bounded learner evidence.
- Given no active study plan, then the question remains available.
- Given reviewed source support, then the answer is labelled as a reviewed-source answer and retains traceable references.
- Given a derived explanation, then it is visibly distinguished from official or reviewed source wording.
- Given insufficient or conflicting evidence, then the agent says so and offers feedback or human review instead of guessing.
- Given formal timed mock mode, then contextual answer tools are unavailable until submission.

**Not included in this story:** Guided-session orchestration or plan reprioritization.

### US-AGENT-05 — Approve a major plan reprioritization

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 6.4

**User story**

> As a student, I want to review and approve major plan changes after new weakness is detected so that the agent cannot silently redirect my preparation.

**Closed-loop outcome**

A proposed high-impact change is explained, accepted or rejected, and recorded in plan history.

**Main flow**

1. Complete an assessment that reveals a new weakness.
2. Open the proposed priority change.
3. Review reason, affected tasks, and expected effect.
4. Accept or reject the change.

**Acceptance Criteria**

- Given a new high-impact weakness, then the platform proposes rather than silently applies a major reprioritization.
- Given the proposal, then affected knowledge points, tasks, dates, and rationale are visible.
- Given acceptance, then future tasks change and the decision is recorded.
- Given rejection, then the previous plan remains active and the risk or unresolved weakness remains visible.

**Not included in this story:** Minor automatic ordering changes within already confirmed priorities.

## Epic F — Mock Exams and Revalidation
### US-MOCK-01 — Choose an appropriate mock exam

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 7.1

**User story**

> As a student, I want to compare available mock exams so that I can choose the correct scope, language, and difficulty.

**Closed-loop outcome**

The student starts a clearly described mock that matches access rights and exam language.

**Main flow**

1. Open mock exams.
2. Filter or review full, subject, and stage assessments.
3. Check question count, time limit, language, scope, and trend impact.
4. Start an eligible mock.

**Acceptance Criteria**

- Given a confirmed subject, then the default mock language matches that subject's exam language.
- Given a mock card, then question count, time limit, language, scope, and trend contribution are shown before start.
- Given a free trial user, then at least one representative complete mock workflow is available within its disclosed limit.
- Given insufficient entitlement, then the mock cannot start and the access rule is explained.

**Not included in this story:** Purchasing access.

### US-MOCK-02 — Take a timed mock with recovery

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 7.2

**User story**

> As a student, I want answers autosaved and the exam recoverable after a brief interruption so that technical issues do not erase my work.

**Closed-loop outcome**

A timed attempt preserves responses and exam integrity until submission or expiry.

**Main flow**

1. Start the timed mock.
2. Navigate, answer, and mark questions for review.
3. Experience autosave while the timer continues.
4. Recover after a permitted refresh or brief connection issue.

**Acceptance Criteria**

- Given an active attempt, then answers, review marks, and navigation state are autosaved without blocking question interaction.
- Given a permitted brief interruption, when the student returns, then the attempt resumes with saved answers and the authoritative remaining time.
- Given a formal mock, then translation, full explanations, and AI problem solving are unavailable by default.
- Given recovery beyond allowed policy or an already submitted attempt, then the platform does not reopen the exam as active.

**Not included in this story:** Cross-device concurrent exam attempts.

### US-MOCK-03 — Submit or auto-submit a mock

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 7.2

**User story**

> As a student, I want a clear submission flow and automatic submission at time expiry so that my result is not lost.

**Closed-loop outcome**

An active attempt transitions exactly once to a submitted attempt.

**Main flow**

1. Select submit before time expires or continue until expiry.
2. Review unanswered-question confirmation when manually submitting.
3. Confirm submission.
4. Wait for result generation.

**Acceptance Criteria**

- Given manual submission with remaining unanswered items, then the student receives a confirmation warning.
- Given confirmation, then the attempt is submitted exactly once and can no longer accept answers.
- Given timer expiry, then the server submits the latest saved responses automatically.
- Given repeated submit requests or refresh, then no duplicate result or mastery update is created.

**Not included in this story:** Result analysis.

### US-MOCK-04 — Review a mock analysis

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 7.3

**User story**

> As a student, I want a mock report that explains score loss so that I can take targeted action.

**Closed-loop outcome**

The report turns raw results into navigable issue categories.

**Main flow**

1. Open the completed mock.
2. Review score, accuracy, time, topic performance, and incorrect items.
3. Review issue categories such as knowledge, language, carelessness, reading speed, and time management.
4. Open a linked solution, course, or mistake.

**Acceptance Criteria**

- Given a scored mock, then score, accuracy, total time, topic performance, incorrect questions, and time allocation are displayed.
- Given available evidence, then actionable issue categories are separated rather than shown as one generic weakness.
- Given an issue or incorrect item, then the student can navigate to a relevant solution, mistake entry, or course.
- Given insufficient evidence for a cause, then the report does not present that cause as certain.

**Not included in this story:** Guaranteed score prediction.

### US-MOCK-05A — Start recommended follow-up practice without a study plan

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 7.4A

**User story**

> As a student, I want clear recommendations after a mock so that I can immediately work on my weakest areas even when I do not have a study plan.

**Closed-loop outcome**

The mock report recommends concrete next actions and lets the student open one of them without implying that the study plan has been changed.

**Main flow**

1. Open the completed mock report.
2. Review the recommended lessons, mistake reviews, terminology practice, targeted questions, or pacing actions.
3. Read the evidence and reason for each recommendation.
4. Start one recommended action directly.

**Acceptance Criteria**

- Given a completed mock with enough evidence, then the report ranks useful next actions and explains why each one is recommended.
- Given no active study plan, then the student can still open and complete a recommended lesson, review, or practice task.
- Given insufficient evidence, then the platform marks the recommendation as uncertain or omits it rather than presenting it as fact.
- Given a recommendation has not been added to a study plan, then the interface does not claim that the plan was updated.

**Not included in this story:** Changing an active study plan.

### US-MOCK-05B — Add selected mock recommendations to the study plan

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 7.4B

**User story**

> As a student with an active study plan, I want to review and confirm which mock recommendations should be added so that my plan changes intentionally and I can later check whether I improved.

**Closed-loop outcome**

The student confirms selected recommendations, the current plan is updated once, and later results can be compared with the original mock.

**Main flow**

1. Select recommendations from a mock report.
2. Review their effect on workload, priorities, and dates.
3. Confirm the update to the current study plan.
4. Complete the follow-up work and a focused recheck or later mock.
5. Compare the original and later results.

**Acceptance Criteria**

- Given an active current plan, when recommendations are selected, then the workload and priority changes are shown before confirmation.
- Given student confirmation, then the selected actions are added to the current plan once.
- Given the plan changed, was paused, or was replaced before confirmation, then the update is stopped and the student is asked to review the latest plan.
- Given later evidence, then the platform compares it with the original mock without replacing the original report.

**Not included in this story:** Automatically changing a plan without student confirmation.

## Epic G — Motivation, Parent Support, and Notifications
### US-MOT-01 — Set and complete a daily goal

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 8.1

**User story**

> As a student, I want a daily learning goal so that I can build a consistent routine around meaningful work.

**Closed-loop outcome**

The student selects a realistic goal and completion updates streak and stage progress once.

**Main flow**

1. Accept the recommended goal or set an allowed goal.
2. Complete qualifying learning tasks.
3. See goal progress update.
4. Finish the goal and receive the streak result.

**Acceptance Criteria**

- Given no daily goal, then the student can accept a recommendation or choose within allowed limits.
- Given meaningful qualifying work, then progress updates according to completed evidence rather than time online or clicks.
- Given goal completion, then the streak and stage progress update once.
- Given repeated event delivery, then no duplicate streak day or reward is created.

**Not included in this story:** Experience points, levels, badges, and leaderboards.

### US-MOT-02 — Recover after a missed day

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 8.1

**User story**

> As a student, I want a manageable recovery task after missing study so that one interruption does not cause abandonment.

**Closed-loop outcome**

A missed-day state offers a bounded restart and reconciles the plan.

**Main flow**

1. Return after missing a planned day.
2. Review a supportive recovery option.
3. Complete a reduced restart task or use an allowed repair.
4. See the plan rescheduled.

**Acceptance Criteria**

- Given a missed planned day, then the platform uses non-shaming language and presents a concrete recovery path.
- Given a recovery task, then its completion criteria and plan effect are visible.
- Given an allowed limited streak repair, then eligibility and remaining use are transparent.
- Given repeated missed days that materially affect feasibility, then the platform surfaces plan risk rather than preserving a misleading streak only.

**Not included in this story:** Competitive ranking.

### US-WEEK-01 — Review the learning week

- **Priority:** P0
- **Actor:** Student
- **Requirement reference:** 8.3

**User story**

> As a student, I want a weekly review so that I can understand progress, setbacks, and next priorities.

**Closed-loop outcome**

A completed week produces a summary and one confirmed adjustment or continuation decision.

**Main flow**

1. Open the weekly review.
2. Review completed content, syllabus progress, mastery changes, plan completion, and feasibility change.
3. Choose reasons for difficulty if applicable.
4. Confirm next-week intensity or recommended support.

**Acceptance Criteria**

- Given a completed calendar week with activity, then the review shows evidence-backed changes and next priorities.
- Given no or little activity, then the review states that clearly without fabricating progress.
- Given a selected difficulty reason, then the next plan may adjust intensity or recommend support.
- Given a material plan change, then student confirmation is required.

**Not included in this story:** Parent weekly report delivery.

### US-PARENT-01 — View the linked student's overview

- **Priority:** P0
- **Actor:** Parent
- **Requirement reference:** 10.1, 10.4

**User story**

> As a parent, I want an actionable learning overview so that I can support the student without inspecting every question or conversation.

**Closed-loop outcome**

The parent sees summary metrics, risk, and recommended actions only for an active linked student.

**Main flow**

1. Choose a linked student.
2. Review weekly study, task completion, personal syllabus progress, feasibility, topic progress, and mock trend.
3. Read recommended parent actions.
4. Navigate to an allowed support action.

**Acceptance Criteria**

- Given an active parent-student link, then the overview shows summary-level learning and risk information.
- Given no active link, then no student learning data is returned.
- Given the overview, then complete agent conversations, private notes, full homework text, and internal tutor records are not exposed.
- Given stale or insufficient data, then the overview indicates the limitation rather than implying current progress.

**Not included in this story:** Changing the student's scores, mastery, or plan directly.

### US-PARENT-02 — Act on a parent risk alert

- **Priority:** P0
- **Actor:** Parent
- **Requirement reference:** 10.2

**User story**

> As a parent, I want risk alerts with constructive choices so that I can help without overreacting.

**Closed-loop outcome**

A qualifying risk creates a notification that can be acknowledged through an allowed action.

**Main flow**

1. Receive an alert for prolonged inactivity, material plan delay, or approaching exam risk.
2. Open the alert and its evidence.
3. Choose encouragement, suggest plan review, purchase support, or dismiss temporarily.
4. See the action recorded.

**Acceptance Criteria**

- Given a configured qualifying risk, then one deduplicated alert is sent according to notification preferences.
- Given the alert, then it explains the reason and offers only allowed supportive actions.
- Given dismissal, then the same unchanged risk is suppressed for the defined period but remains visible in the dashboard.
- Given the parent selects plan adjustment, then the student is invited to review it; the parent does not directly rewrite the plan.

**Not included in this story:** Emergency wellbeing monitoring.

### US-PARENT-03 — Receive the weekly learning report

- **Priority:** P0
- **Actor:** Parent
- **Requirement reference:** 10.2

**User story**

> As a parent, I want a weekly learning report delivered according to my preferences so that I can support the student consistently.

**Closed-loop outcome**

One privacy-safe weekly report is generated, delivered, and accessible for the linked student.

**Main flow**

1. Receive the weekly report notification through an enabled channel.
2. Open the report.
3. Review study activity, plan status, progress, risk, and recommended support actions.
4. Follow an allowed action.

**Acceptance Criteria**

- Given an active relationship and enabled weekly-report preference, then one deduplicated report is generated for the reporting period.
- Given the report, then complete agent conversations, private notes, full homework submissions, and unnecessary question-level data are excluded.
- Given little or no current evidence, then the report states the limitation instead of fabricating progress.
- Given delivery failure, then the report remains available in the parent dashboard and the failed channel is observable for retry policy.

**Not included in this story:** Emergency alerts and marketing messages.

### US-PARENT-04 — View student entitlements and service status

- **Priority:** P0
- **Actor:** Parent
- **Requirement reference:** 10.3

**User story**

> As a parent, I want to view a linked student's entitlements, expiration, usage, and purchased-service status so that I can manage support responsibly.

**Closed-loop outcome**

The parent sees only authorized commercial and service summaries for the linked student.

**Main flow**

1. Choose the linked student.
2. Open entitlements and services.
3. Review subject access, expiration, usage, orders paid by the parent, and tutoring status where applicable.
4. Open an allowed renewal, receipt, or support action.

**Acceptance Criteria**

- Given an active relationship, then current entitlements, expiration dates, disclosed usage limits, and allowed service statuses are visible.
- Given an entitlement paid by another authorized payer, then the parent sees only the access summary unless receipt ownership permits more.
- Given an ended relationship, then future student service details are no longer returned while the payer retains access to their own historical receipts and refund records.
- Given stale provider or reconciliation state, then the page identifies the pending state rather than claiming final access.

**Not included in this story:** Directly changing learning progress or internal tutor matching data.

### US-NOTIFY-01 — Configure notification preferences

- **Priority:** P0
- **Actor:** Student, parent, or tutor
- **Requirement reference:** 13.1

**User story**

> As a user, I want to control notification channels and types so that I receive useful reminders without unwanted marketing.

**Closed-loop outcome**

The saved preference controls future eligible in-platform and email notifications.

**Main flow**

1. Open notification settings.
2. Enable or disable supported learning/service notification types.
3. Choose available channels.
4. Separately opt in or out of marketing.
5. Save.

**Acceptance Criteria**

- Given supported notification settings, when saved, then future notifications follow the user's channel and type choices.
- Given essential transactional or security messages, then the platform clearly distinguishes any messages that cannot be disabled.
- Given marketing, then it is disabled unless separately opted in and can be withdrawn at any time.
- Given an unsupported channel such as unavailable WhatsApp integration, then it is not presented as active.

**Not included in this story:** Operating staff alert configuration.

### US-NOTIFY-02 — Receive a scheduled learning reminder

- **Priority:** P0
- **Actor:** Student or parent
- **Requirement reference:** 13.1

**User story**

> As a user, I want enabled learning reminders delivered at useful times so that important study or support actions are not missed.

**Closed-loop outcome**

An eligible event produces one preference-compliant notification with a safe deep link.

**Main flow**

1. A due task, weekly report, entitlement expiry, or qualifying risk becomes eligible.
2. The platform evaluates notification preferences and deduplication rules.
3. The notification is delivered through an enabled channel.
4. The user opens the related action.

**Acceptance Criteria**

- Given an eligible notification and enabled channel, then one message is generated with the correct user, locale, and authorized destination.
- Given the same event is retried, then duplicate delivery is prevented according to the channel policy.
- Given the user disabled the notification type, then no optional reminder is sent through that channel.
- Given a deep link, then authentication and authorization are rechecked before private data is shown.

**Not included in this story:** Marketing campaigns and staff-only operational alerts.

## Epic H — Trial, Products, Payments, and Support
### US-TRIAL-01 — Browse public product information

- **Priority:** P0
- **Actor:** Visitor
- **Requirement reference:** 11.1, 11.2

**User story**

> As a visitor, I want to inspect products and limited public content so that I can decide whether to register.

**Closed-loop outcome**

A non-registered visitor can understand scope, language, coverage, pricing basis, and trial value without accessing private learning features.

**Main flow**

1. Open the public catalog.
2. Compare subject-language products.
3. Review syllabus coverage and uncovered modules.
4. Review trial benefits and registration call to action.

**Acceptance Criteria**

- Given a public visitor, then product subject, exam language, included scope, validity, and coverage status are visible.
- Given partial coverage, then uncovered or in-development modules are explicitly shown.
- Given public access, then no private student data, paid lesson, or protected question bank is exposed.
- Given trial marketing, then limits are stated without misleading scarcity.

**Not included in this story:** Checkout and registered trial consumption.

### US-TRIAL-02 — Complete a representative trial learning loop

- **Priority:** P0
- **Actor:** Registered student
- **Requirement reference:** 11.1

**User story**

> As a registered student, I want to complete one representative learn-practice-feedback flow so that I can evaluate the learning experience before purchase.

**Closed-loop outcome**

A disclosed trial entitlement permits one bounded closed learning loop and records remaining access.

**Main flow**

1. Open the trial dashboard.
2. Start the available lesson.
3. Complete linked practice.
4. Review feedback and the remaining trial allowance.

**Acceptance Criteria**

- Given an eligible registered student, then the trial exposes at least one complete learn-practice-feedback flow.
- Given each trial-limited resource, then remaining uses or time are visible before consumption.
- Given the entitlement is exhausted, then further protected access is blocked without deleting completed trial learning records.
- Given retries caused by technical failure before completion, then the trial is not consumed more than policy allows.

**Not included in this story:** Representative mock trial, handled by the mock story and entitlement rules.

### US-TRIAL-03 — Complete a representative trial mock workflow

- **Priority:** P0
- **Actor:** Registered student
- **Requirement reference:** 11.1, 7.1, 7.2, 7.3

**User story**

> As a registered student, I want to complete one representative mock workflow so that I can evaluate YukCSCA's exam experience before purchase.

**Closed-loop outcome**

A disclosed trial entitlement permits one bounded mock attempt from selection through result review.

**Main flow**

1. Review the trial mock's scope, language, time, and consumption rule.
2. Start and complete the timed attempt.
3. Submit or reach time expiry.
4. Review the permitted representative analysis and remaining trial access.

**Acceptance Criteria**

- Given an eligible registered student, then at least one representative mock can be selected in a supported exam language.
- Given the trial mock begins, then its disclosed attempt allowance is reserved idempotently and is not consumed twice by refresh or retry.
- Given a completed attempt, then a representative score and analysis workflow is available without exposing protected paid content beyond the trial scope.
- Given a technical failure before the platform records a valid attempt, then the trial allowance is restored or preserved according to the disclosed policy.

**Not included in this story:** Unlimited retakes or access to the full paid mock bank.

### US-PRODUCT-01 — Review a purchasable subject plan

- **Priority:** P0
- **Actor:** Student or parent
- **Requirement reference:** 11.2

**User story**

> As a buyer, I want complete product details so that I know exactly what the subject plan includes.

**Closed-loop outcome**

A product page discloses benefit, scope, limits, validity, coverage, and intended student before checkout.

**Main flow**

1. Open a subject-language product.
2. Review included modules, coverage, practice, terminology, AI allowance, mocks, and validity.
3. Select a linked student or self as recipient.
4. Proceed to checkout.

**Acceptance Criteria**

- Given a product, then subject and exam language are unambiguous.
- Given included benefits, then usage limits, validity, and tutoring entitlements are stated before payment.
- Given non-full syllabus coverage, then the actual coverage and missing modules are prominently disclosed.
- Given multiple subject purchases, then each product's entitlement and learning record remain separately identifiable.

**Not included in this story:** Payment processing.

### US-PAY-01 — Create a local-payment order

- **Priority:** P0
- **Actor:** Student or parent payer
- **Requirement reference:** 10.3, 11.3

**User story**

> As a payer, I want to create an order using a supported Indonesian payment method for a specified student so that the correct learner receives access.

**Closed-loop outcome**

A pending order is created with a fixed product, recipient, amount, expiry, and payment instruction.

**Main flow**

1. Choose product and recipient student.
2. Choose a supported launch payment method.
3. Review amount, validity, payment deadline, and recipient.
4. Confirm and receive payment instructions.

**Acceptance Criteria**

- Given an eligible payer and recipient, when checkout is confirmed, then one pending order is created with immutable commercial details.
- Given a parent payer, then the recipient must be the linked student explicitly selected.
- Given the payment page, then amount, product, recipient, validity, deadline, and order state are visible.
- Given an unsupported or unavailable payment method, then no payable order is falsely presented as ready.

**Not included in this story:** Gateway callback and entitlement issuance.

### US-PAY-02 — Issue entitlement after verified payment

- **Priority:** P0
- **Actor:** Payer and recipient student
- **Requirement reference:** 11.3, 11.5; financial NFR

**User story**

> As a payer, I want successful payment to grant the selected entitlement exactly once so that payment and access remain consistent.

**Closed-loop outcome**

A verified gateway result transitions the order and grants one matching entitlement idempotently.

**Main flow**

1. Complete payment with the provider.
2. Allow the provider callback to reach YukCSCA.
3. Open the order status.
4. Open the recipient student's new entitlement.

**Acceptance Criteria**

- Given a verified successful gateway callback, then the order becomes Paid and the selected entitlement is granted to the recorded recipient.
- Given duplicate success callbacks, then no duplicate entitlement or charge record is created.
- Given failed, expired, or unverified callbacks, then no entitlement is granted.
- Given the user closes the browser before callback, then final status is still reconciled from the gateway rather than browser state.

**Not included in this story:** Refund execution.

### US-ORDER-01 — View orders and receipts

- **Priority:** P0
- **Actor:** Payer
- **Requirement reference:** 11.5

**User story**

> As a payer, I want to view order history and receipts so that I can track payments and entitlements.

**Closed-loop outcome**

Every owned order has a visible reconciled state and a receipt when eligible.

**Main flow**

1. Open order history.
2. Filter or select an order.
3. Review Pending, Paid, Cancelled, Refunded, or Failed state.
4. Open or download the receipt for a paid order.

**Acceptance Criteria**

- Given an authenticated payer, then only orders they own or are authorized to view are returned.
- Given a paid order, then the receipt reflects the authoritative amount, product, payer, recipient, and transaction reference.
- Given a pending or failed order, then no paid receipt is generated.
- Given later refund, then the order and receipt history retain the original payment and show the refund outcome.

**Not included in this story:** Tax invoicing beyond the launch receipt requirement.

### US-REFUND-01 — Request a refund or report duplicate payment

- **Priority:** P0
- **Actor:** Payer
- **Requirement reference:** 11.5

**User story**

> As a payer, I want to submit a refund or duplicate-payment request so that a financial issue can be resolved transparently.

**Closed-loop outcome**

A request is created, reviewed, resolved, and reconciled with order and entitlement state.

**Main flow**

1. Open an eligible order.
2. Choose refund or duplicate-payment issue.
3. Review policy and expected effect.
4. Submit reason and evidence.
5. Track the resolution.

**Acceptance Criteria**

- Given an eligible order, when a request is submitted, then a traceable case links to the order and records the requested reason.
- Given an ineligible order, then the platform explains the applicable rule and does not promise a refund.
- Given an approved refund, then payment, refund, entitlement, and order states reconcile exactly once.
- Given an admin resolution, then operator, time, reason, amount, and outcome are audited.

**Not included in this story:** Chargeback processing outside the payment-provider integration.

### US-RENEW-01 — Receive an expiry reminder and renew manually

- **Priority:** P0
- **Actor:** Student or parent payer
- **Requirement reference:** 11.4

**User story**

> As a payer, I want an expiry reminder and a new one-time payment path so that access can continue without misleading automatic-renewal claims.

**Closed-loop outcome**

An expiring entitlement produces a disclosed reminder and a new independent order when the payer chooses to renew.

**Main flow**

1. Receive an entitlement-expiry reminder.
2. Review the expiring product, recipient, date, and renewal terms.
3. Choose manual renewal.
4. Create and pay a new order through a supported method.

**Acceptance Criteria**

- Given an entitlement approaching expiry and enabled preferences, then the reminder identifies the product, recipient, expiry date, and renewal method.
- Given QRIS or Virtual Account manual renewal, then the platform creates a new payment link or QR code and never labels it automatic renewal.
- Given the payer does not renew, then the original entitlement expires according to its recorded validity without creating a charge.
- Given a successful new payment, then the new entitlement period is reconciled exactly once according to product rules.

**Not included in this story:** Recurring automatic charging, which remains a later payment-channel-dependent slice.

### US-SUPPORT-01 — Submit a contextual support issue

- **Priority:** P0
- **Actor:** Any authenticated user
- **Requirement reference:** 13.2

**User story**

> As a user, I want to report an account, payment, content, AI, or tutoring issue with relevant context so that support can investigate efficiently.

**Closed-loop outcome**

One ticket is created with category, description, ownership, and safe contextual links.

**Main flow**

1. Open support from a general page or relevant content.
2. Choose the issue category.
3. Describe the problem and attach permitted context.
4. Submit and receive a ticket reference.

**Acceptance Criteria**

- Given a valid issue, when submitted, then a trackable ticket is created and visible to the requester.
- Given a question or AI dispute, then the ticket links the relevant attempt question copy, course, or conversation context without requiring the user to copy sensitive data.
- Given unauthorized context, then it is not attached or disclosed.
- Given repeated submission caused by retry, then the platform avoids unintended duplicate tickets where an idempotency key is available.

**Not included in this story:** Admin resolution workflow.

### US-SUPPORT-02 — Resolve a support ticket

- **Priority:** P0
- **Actor:** First platform admin
- **Requirement reference:** 13.2, 14.9

**User story**

> As the first platform admin, I want to review, reply to, and close a ticket so that users receive a traceable resolution.

**Closed-loop outcome**

The ticket moves through owned states with replies, evidence, and closure reason.

**Main flow**

1. Open the assigned queue.
2. Review permitted user and contextual data.
3. Request more information or record an internal investigation.
4. Reply with a resolution.
5. Close or escalate the ticket.

**Acceptance Criteria**

- Given the first platform admin, then only ticket data necessary to resolve the issue is shown.
- Given a reply or state change, then operator, timestamp, and outcome are recorded.
- Given an academic or AI dispute requiring review, then the ticket can be escalated without being falsely marked resolved.
- Given closure, then the requester sees the final response and can reopen or appeal only according to policy.

**Not included in this story:** Changing student scores directly from support.

## Epic I — Back-Office Academic and Operational Control
### US-ADM-01 — Maintain users and relationship disputes

- **Priority:** P0
- **Actor:** First platform admin
- **Requirement reference:** 14.2

**User story**

> As the first platform admin, I want to search accounts and resolve lifecycle or relationship issues so that access problems are handled without altering learning outcomes.

**Closed-loop outcome**

A permitted user or relationship case ends in a reasoned, audited state change or escalation.

**Main flow**

1. Search by permitted account or relationship attributes.
2. Review the minimum necessary account and relationship state.
3. Suspend, restore, progress deletion, correct abnormal contact state, or resolve/escalate a relationship dispute.
4. Record reason and outcome.

**Acceptance Criteria**

- Given the first platform admin, then student, parent, tutor, and account-status searches return only the minimum fields needed for the selected operation.
- Given a suspension, restoration, deletion progression, contact correction, or relationship decision, then operator, timestamp, reason, previous state, and outcome are audited.
- Given a non-Admin identity, when a back-office action is attempted, then it is denied without disclosing unnecessary private data.
- Given any user-management action, then the admin cannot arbitrarily edit mastery, diagnostic results, mock scores, or private conversations.

**Not included in this story:** Content, finance, tutoring-workflow administration, or multi-admin permission management.

### US-ADM-02 — Add learning objectives, content, and syllabus mappings

- **Priority:** P0
- **Actor:** First platform admin
- **Requirement reference:** 4.2, 14.4

**User story**

> As the first platform admin, I want to add YukCSCA learning objectives, map them to official syllabus topics, and publish lessons, terminology, questions, and remediation content so that students can use the first complete learning path.

**Closed-loop outcome**

YukCSCA learning objectives and topic mappings are defined, and valid content moves from Draft to Published for the student learning experience.

**Main flow**

1. Add YukCSCA learning objectives and map each objective to one or more official syllabus topics.
2. Add terminology, a lesson, questions, explanations, and remediation content.
3. Fix missing links, language fields, formulas or files, answers, scoring, and source information.
4. Preview and publish the content and topic mappings.

**Acceptance Criteria**

- Given a YukCSCA learning objective, then it has its own ID, is mapped to one or more official syllabus topics with a short rationale, and is never presented as official syllabus wording.
- Given new content, then it has a stable ID and can be reused by different YukCSCA clients without storing frontend routes or page-layout fields.
- Given missing required information or broken links, then publication is blocked with clear errors.
- Given valid content, when it is published, then students can read it through the learning experience and track coverage against the syllabus version.
- Given publication fails, then the draft remains unpublished and existing published content remains available.
- Given published content is later corrected, then completed attempts and reports continue to use the content the student originally received.

**Not included in this story:** Multiple reviewer roles, complex release management, or a general-purpose CMS.

### US-ADM-03 — Add an official CSCA syllabus version

- **Priority:** P0
- **Actor:** First platform admin
- **Requirement reference:** 4.2, 14.4

**User story**

> As the first platform admin, I want to record an official CSCA syllabus version and its topic hierarchy so that official exam requirements can be tracked.

**Closed-loop outcome**

One official syllabus version, its source, effective dates, and its official topic hierarchy are published and available for reference.

**Main flow**

1. Record the official syllabus authority, source locator, effective dates, and official topic structure.
2. Compare it with the previously stored version when one exists.
3. Review and publish the official syllabus version.

**Acceptance Criteria**

- Given an official source, then the authority, source link or locator, publication or effective date, last checked date, and exact topic labels are stored.
- Given an official syllabus topic, then it remains distinct from platform learning objectives and is identified as official wording.
- Given a newer syllabus version, then added, removed, or changed topics are shown before it is published.
- Given a coverage claim, then it names the syllabus version used for the calculation.

**Not included in this story:** Student mastery calculation or copying protected official questions.

### US-ADM-04 — Publish questions and create one mock paper

- **Priority:** P0
- **Actor:** First platform admin
- **Requirement reference:** 14.5

**User story**

> As the first platform admin, I want to publish valid questions and select them for a mock paper so that students can take the first complete mock exam.

**Closed-loop outcome**

Published questions are selected for one valid mock paper, and each student attempt keeps the exact question and scoring data it used.

**Main flow**

1. Add or import draft questions and their supported exam-language content.
2. Set the mock paper's subject, language, duration, scoring, visibility, and question list.
3. Fix any unpublished question, invalid score, broken link, or missing source information.
4. Publish the questions and mock paper.

**Acceptance Criteria**

- Given a draft question, then the admin can edit its text, choices, answer or scoring rule, explanation, language, difficulty, and related syllabus topics or learning objectives.
- Given a mock paper, then it contains only selected published questions that match its subject and exam language.
- Given a student starts an attempt, then the attempt saves the exact question text, choices, answer, and scoring information used at that time.
- Given a question is edited later, then completed attempts and scores do not change.
- Given an invalid or unpublished question, then the mock paper cannot be published and a clear error is shown.

**Not included in this story:** Automatic adaptive question selection or student attempt execution.

### US-ADM-05 — Check content sources and permissions

- **Priority:** P0
- **Actor:** First platform admin
- **Requirement reference:** 14.6

**User story**

> As the first platform admin, I want to record where academic content came from and whether YukCSCA may use it so that unverified or unlicensed material is not published.

**Closed-loop outcome**

Each publishable syllabus source, lesson, question, explanation, remediation item, or file has enough source and permission information, or publication remains blocked.

**Main flow**

1. Open a draft content item or file.
2. Record its author or provider, source, source type, and permission or licence information when required.
3. Mark the source check as complete or needing correction.
4. Publish only after the required information is complete.

**Acceptance Criteria**

- Given a publishable item, then its author or provider, source, source type, permission basis, and review status are visible.
- Given required source or permission information is missing, then publication is blocked.
- Given an official website is used as a factual source, then citation of facts is kept separate from permission to copy protected pages, databases, or questions.
- Given content is replaced, then the replacement records its own source and permission information.

**Not included in this story:** Separate rights-review roles or complex licence-expiry management.

### US-ADM-06 — Review AI answer quality

- **Priority:** P0
- **Actor:** First platform admin
- **Requirement reference:** 14.8, 14.9; AI quality NFR

**User story**

> As the first platform admin, I want to investigate disputed or low-confidence AI answers so that incorrect guidance can be corrected and contained.

**Closed-loop outcome**

A flagged answer receives a reviewed disposition and may trigger content correction, routing change, or temporary disablement.

**Main flow**

1. Open the quality queue by subject, exam language, explanation language, or knowledge point.
2. Review the answer with its approved sources and relevant context.
3. Record correct, incorrect, uncertain, or unsafe disposition.
4. Apply an allowed remediation and notify affected workflows.

**Acceptance Criteria**

- Given a flagged answer, then the reviewer sees only necessary pseudonymized context and relevant approved sources.
- Given a confirmed high-impact error, then a corrective action and affected-content analysis are recorded.
- Given repeatedly unreliable content, then AI answering for that scope can be disabled or routed to human handling.
- Given a model/prompt/content correction, then the original incident remains traceable.

**Not included in this story:** Editing a student's private conversation without authorization.

### US-ADM-07 — View privacy-safe operating analytics

- **Priority:** P0
- **Actor:** First platform admin
- **Requirement reference:** 14.10; observability NFR

**User story**

> As the first platform admin, I want decision-useful product and service metrics so that I can improve activation, learning, payments, and support without reading private conversations.

**Closed-loop outcome**

The platform admin can view aggregated funnel, learning, commerce, and service metrics with defined definitions and freshness.

**Main flow**

1. Choose an available dashboard.
2. Filter by date, subject, exam language, or operational dimension.
3. Review definitions and data freshness.
4. Export or act only through the available audited action.

**Acceptance Criteria**

- Given a non-Admin identity, then operating analytics are not visible.
- Given analytics, then private conversation text and unnecessary minor-identifying data are excluded by default.
- Given a metric, then its definition, period, and freshness are available.
- Given externally published learning-effectiveness claims, then sample, time period, and calculation method must be disclosed.

**Not included in this story:** Unvalidated causal claims about score improvement.

### US-FINOPS-01 — Reconcile a payment exception

- **Priority:** P0
- **Actor:** First platform admin
- **Requirement reference:** 14.7

**User story**

> As the first platform admin, I want to investigate payment exceptions and apply controlled adjustments so that orders, refunds, and entitlements remain consistent.

**Closed-loop outcome**

A payment exception ends in an audited reconciliation across gateway, order, refund, and entitlement records.

**Main flow**

1. Search by payment channel, payer, recipient student, order reference, or status.
2. Review provider and platform reconciliation evidence.
3. Resolve duplicate payment, payment exception, refund, or entitlement adjustment.
4. Record the final reconciled state.

**Acceptance Criteria**

- Given the first platform admin, then order search supports payment channel, payer, entitlement recipient, and payment status without exposing unrelated learning data.
- Given a manual refund or entitlement adjustment, then a reason is required and the previous and resulting states are audited.
- Given a duplicate callback or repeated admin submission, then financial and entitlement changes are applied exactly once.
- Given evidence is insufficient or provider state is unresolved, then the case remains pending rather than being forced into a paid or refunded state.

**Not included in this story:** Provider-side chargeback adjudication outside the supported integration.

## Epic J — Platform-Managed One-to-One Tutoring
### US-TUTOR-01 — Submit a tutoring request

- **Priority:** P1
- **Actor:** Student or parent
- **Requirement reference:** 6.5, 9.1

**User story**

> As a student or parent, I want to submit a tutoring need with relevant learning context so that the platform can match appropriate human help.

**Closed-loop outcome**

A paid or entitlement-backed tutoring request is created without promising a named tutor or time.

**Main flow**

1. Choose single session, package hour, or available entitlement.
2. Select student, subject, exam language, explanation language, issue, acceptable times, and contact channel.
3. Attach permitted learning context and consent for a learning brief.
4. Submit the request.

**Acceptance Criteria**

- Given sufficient entitlement or successful purchase, when valid details are submitted, then one tutoring request is created.
- Given the request page, then it clearly states that payment creates a request for manual contact and matching, not an immediate named-tutor booking.
- Given attached learning context, then only selected course/question/mistake/mock/agent context is linked.
- Given missing time, contact, subject, or consent decision, then submission is rejected with usable validation.

**Not included in this story:** Tutor browsing and self-service slot selection.

### US-TUTOR-02 — View tutoring request progress

- **Priority:** P1
- **Actor:** Student or parent
- **Requirement reference:** 9.2, 9.7

**User story**

> As a requester, I want to see the current tutoring status and expected next step so that I know what the platform is doing.

**Closed-loop outcome**

The request displays a simplified user-facing state, contact commitment, and allowed actions.

**Main flow**

1. Open the request.
2. Review purchased hours, submitted needs, current state, expected contact window, and contact channel.
3. Follow the next action or request cancellation/refund when policy allows.

**Acceptance Criteria**

- Given a newly paid request, then the initial user-visible state is Awaiting Platform Contact.
- Given internal matching transitions, then the user sees only the approved simplified status, not candidate tutors or internal pricing.
- Given the platform cannot match within its commitment, then wait, change requirements, retain hours, or refund options are shown according to policy.
- Given a state change, then timestamp and relevant notification are recorded.

**Not included in this story:** Detailed internal matching notes.

### US-TUTOR-03 — Record manual requirement confirmation

- **Priority:** P1
- **Actor:** Tutoring admin
- **Requirement reference:** 9.3

**User story**

> As a tutoring admin, I want to record the outcome of external contact so that the formal request reflects the student's confirmed needs.

**Closed-loop outcome**

A contact attempt and confirmed requirement set are auditable without copying the entire external conversation.

**Main flow**

1. Contact the student or parent through the consented channel.
2. Confirm goal, issue, languages, availability, time zone, and contact person.
3. Record contact metadata and necessary notes.
4. Update the tutoring request state.

**Acceptance Criteria**

- Given a contact attempt, then time, channel, contact person, outcome, and operator are recorded.
- Given changed requirements, then the formal tutoring request is updated and its history remains visible.
- Given no response, then the request can remain pending with next contact action rather than falsely becoming matched.
- Given external chat content, then the full conversation is not required to be copied into YukCSCA.

**Not included in this story:** Automatic WhatsApp conversation ingestion.

### US-TUTOR-04 — Maintain an internal tutor profile

- **Priority:** P1
- **Actor:** Tutor and authorized admin
- **Requirement reference:** 9.4, 14.3

**User story**

> As a tutor, I want to submit profile and availability information for admin review so that I can be considered for suitable lessons.

**Closed-loop outcome**

An approved internal tutor record has controlled service status, capability, availability, and workload data.

**Main flow**

1. Tutor submits or updates profile and availability.
2. Admin reviews evidence and formal fields.
3. Admin approves, requests information, suspends, restores, or deactivates.
4. Eligible tutor appears only in the internal matching pool.

**Acceptance Criteria**

- Given a tutor application or change, then it does not become formally active until authorized admin review.
- Given an approved tutor, then subjects, exam languages, explanation languages, expertise, time zone, availability, and service status are recorded.
- Given suspended or deactivated status, then the tutor is excluded from new matching.
- Given a student or parent, then the full tutor pool, internal pricing, workload, and candidate matching data are not accessible.

**Not included in this story:** Public tutor marketplace.

### US-TUTOR-05 — Match a tutor manually

- **Priority:** P1
- **Actor:** Tutoring admin
- **Requirement reference:** 9.5

**User story**

> As a tutoring admin, I want to evaluate internal tutor candidates so that I can choose an appropriate available tutor.

**Closed-loop outcome**

One authorized admin records the candidate process and confirms a final proposed match.

**Main flow**

1. Open the confirmed tutoring request.
2. Filter eligible tutors by subject, languages, expertise, availability, status, and workload.
3. Record candidate contact outcomes or rejection reasons.
4. Select the final candidate.

**Acceptance Criteria**

- Given a request, then only eligible tutors matching required service status are considered.
- Given candidate evaluation, then contact outcome or rejection reason can be recorded without exposing it to the student or parent.
- Given no complete match, then the admin records the gap and requests acceptable alternatives from the user.
- Given a final match, then the confirming admin and time are audited.

**Not included in this story:** Creating the formal booking before time confirmation.

### US-TUTOR-06 — Confirm time and create a formal booking

- **Priority:** P1
- **Actor:** Student or parent with admin
- **Requirement reference:** 9.6

**User story**

> As a student or parent, I want to confirm the proposed tutor and lesson time so that a tutoring request becomes a real booking.

**Closed-loop outcome**

Mutual time confirmation creates one non-conflicting formal booking with the assigned tutor.

**Main flow**

1. Admin records the proposed tutor, date, time, duration, and time zones.
2. Student or parent reviews the assigned tutor summary and proposed time.
3. Confirm or request a change.
4. On confirmation, open the formal booking.

**Acceptance Criteria**

- Given a proposed match, then the user sees only the assigned tutor's approved display information and proposed lesson details.
- Given user confirmation and tutor availability, then one formal booking is created and the request state updates.
- Given an overlapping tutor booking, then confirmation is blocked.
- Given user rejection, then no formal booking is created and the request returns to admin handling.

**Not included in this story:** Self-service tutor reselection.

### US-TUTOR-07 — Publish secure meeting access

- **Priority:** P1
- **Actor:** Tutor or authorized admin
- **Requirement reference:** 9.9

**User story**

> As a tutor, I want to publish external meeting details inside the booking so that participants can join safely.

**Closed-loop outcome**

The active booking exposes time-zone-aware meeting access only to authorized participants.

**Main flow**

1. Open the formal booking.
2. Enter provider, link, meeting ID/password, and instructions.
3. Publish or update the meeting information.
4. Notify participants and use Join Meeting at lesson time.

**Acceptance Criteria**

- Given an active booking, then the tutor or authorized admin can publish a permitted external meeting provider and access details.
- Given the booked student, assigned tutor, authorized parent, or necessary admin, then meeting access is visible; other users receive no access.
- Given an update, then participants are notified and the latest details are shown with both tutor and student-local time zones.
- Given cancellation or refund, then the active Join Meeting entry point is removed.

**Not included in this story:** YukCSCA-hosted audio/video or default recording.

### US-TUTOR-08 — Share a minimal pre-class learning brief

- **Priority:** P1
- **Actor:** Assigned tutor
- **Requirement reference:** 9.10

**User story**

> As an assigned tutor, I want an authorized learning brief so that class time focuses on the student's actual difficulty.

**Closed-loop outcome**

The tutor can view only booking-relevant learning evidence that the student authorized.

**Main flow**

1. Student reviews or grants learning-brief consent.
2. System prepares the relevant subject, languages, plan, mastery, mistakes, hint use, and mock evidence.
3. Tutor opens the brief before class.
4. Student may add a note or PDF reference.

**Acceptance Criteria**

- Given explicit student authorization and an assigned tutor, then the tutor can open the booking-specific brief.
- Given the brief, then unrelated agent conversations, private notes, orders, other tutors' sessions, and unnecessary data are excluded.
- Given Chinese Mathematics, then relevant terminology and translation-dependency evidence may be included.
- Given consent withdrawal before access where policy permits, then future tutor access is removed without corrupting the booking record.

**Not included in this story:** Permanent tutor access to the whole student profile.

### US-TUTOR-09 — Publish lesson materials

- **Priority:** P1
- **Actor:** Assigned tutor or authorized admin
- **Requirement reference:** 9.11

**User story**

> As a tutor, I want to publish text or PDF materials for the booking so that the student can prepare and review.

**Closed-loop outcome**

A versioned booking material becomes visible to authorized participants and triggers a student notification.

**Main flow**

1. Open the booking.
2. Create text or upload a PDF.
3. Record title, description, linked knowledge point, intended stage, and actual provider.
4. Publish or update the material.

**Acceptance Criteria**

- Given an assigned tutor or authorized admin, then valid text/PDF material can be attached to the booking.
- Given a PDF, then file type, size, upload state, malicious-file checks, and access authorization are enforced.
- Given publication or update, then the student is notified and the material version remains traceable.
- Given tutoring material, then it does not automatically become public course content.

**Not included in this story:** Other file formats in the first version.

### US-TUTOR-10 — Record attendance and completion status

- **Priority:** P1
- **Actor:** Student, tutor, or authorized admin
- **Requirement reference:** 9.12

**User story**

> As a tutoring participant, I want to record attendance so that disputes and completion are handled fairly.

**Closed-loop outcome**

Independent attendance declarations resolve to a session state or a review state.

**Main flow**

1. After class start, student and tutor record attendance.
2. Tutor records completion outcome.
3. If records conflict, admin reviews supporting information.
4. Final session state is published.

**Acceptance Criteria**

- Given a started lesson, then student and tutor can separately record attendance.
- Given matching declarations, then the booking can move to the corresponding attendance state.
- Given conflicting declarations, then the booking moves to review instead of automatically blaming either party.
- Given a final admin decision, then operator, reason, evidence reference, and outcome are audited.

**Not included in this story:** Automatic provider attendance integration.

### US-TUTOR-11 — Publish a post-class summary

- **Priority:** P1
- **Actor:** Tutor or authorized admin
- **Requirement reference:** 9.13

**User story**

> As a tutor, I want to publish a structured class summary so that the student and learning agent know what changed.

**Closed-loop outcome**

The booking receives evidence-based outcomes that inform, but do not overwrite, formal learning records.

**Main flow**

1. Enter lesson content, resolved issues, performance, remaining weakness, language issues, recommendations, and completion state.
2. Submit the summary.
3. Student reads the full summary.
4. Parent receives the allowed summary and recommendations.
5. Agent uses it for future planning.

**Acceptance Criteria**

- Given a completed or incomplete lesson, then a structured summary can be submitted with actual provider and system operator distinguished.
- Given the student, then the complete summary is visible; given the parent, then only the permitted summary and recommended actions are visible.
- Given tutor conclusions, then they become new learning evidence but do not overwrite diagnostic or mock scores.
- Given plan impact, then future recommendations may change with an explanation.

**Not included in this story:** Tutor directly editing mastery or official scores.

### US-TUTOR-12 — Assign, submit, and review tutoring homework

- **Priority:** P1
- **Actor:** Tutor and student
- **Requirement reference:** 9.14–9.16

**User story**

> As a student, I want to receive, submit, and revise tutoring homework so that one-to-one support continues after class.

**Closed-loop outcome**

A booking homework moves from assigned to submitted, reviewed, and completed or resubmission-required with preserved versions.

**Main flow**

1. Tutor publishes instructions, due date, and submission format.
2. Student drafts text and/or uploads an allowed PDF.
3. Student submits.
4. Tutor reviews and publishes feedback.
5. Student resubmits when requested.

**Acceptance Criteria**

- Given a homework assignment, then instructions, due date, related knowledge point, and allowed submission format are visible.
- Given text drafting, then a recoverable draft is preserved; given PDF upload, then progress, success/failure, and retry states are visible.
- Given submission, then the exact submitted version and time are recorded.
- Given tutor feedback, then comments, status, and resubmission request are visible while all prior submission versions remain traceable.

**Not included in this story:** Automatic grading of all tutor homework.

### US-TUTOR-13 — Request cancellation, rescheduling, or replacement

- **Priority:** P1
- **Actor:** Student, parent, tutor, or admin
- **Requirement reference:** 9.8

**User story**

> As a tutoring participant, I want to request a service change so that schedule or tutor problems can be resolved under clear policy.

**Closed-loop outcome**

A change request ends in updated booking, rematching, cancellation, or refund with all dependent data reconciled.

**Main flow**

1. Open the booking.
2. Choose reschedule, cancel, or tutor replacement and provide a reason.
3. Review policy, penalty, returned hours, or estimated refund.
4. Submit for confirmation and track the outcome.

**Acceptance Criteria**

- Given a request within policy, then the applicable effect on money, hours, timing, and matching is shown before confirmation.
- Given tutor short-notice cancellation, then admin handling prioritizes reschedule, replacement, or refund.
- Given an approved change, then booking, meeting access, homework deadlines, and reminders update consistently.
- Given every manual decision, then reason, operator, time, and outcome are audited.

**Not included in this story:** Unreviewed self-service tutor replacement.

## Epic K — Study-in-China Expansion
### US-UNI-01 — Search verified university and major information

- **Priority:** P1
- **Actor:** Student
- **Requirement reference:** 12.1

**User story**

> As a student, I want to search Chinese universities and majors so that I can build realistic study targets.

**Closed-loop outcome**

A search result exposes basic application information with source and last-update metadata.

**Main flow**

1. Search or filter by university, major, and language of instruction.
2. Open a result.
3. Review basic requirements and source metadata.
4. Bookmark or add it to a target list.

**Acceptance Criteria**

- Given searchable data, then results can be filtered by university, major, and language of instruction.
- Given a key requirement, then source and last update or verification date are visible.
- Given outdated or unverified data, then its status is disclosed rather than presented as current.
- Given no result, then the platform does not invent a requirement.

**Not included in this story:** Legal admission determination.

### US-UNI-02 — Maintain a target university list

- **Priority:** P1
- **Actor:** Student
- **Requirement reference:** 12.1

**User story**

> As a student, I want to bookmark target universities and majors so that subject matching and timelines use my actual choices.

**Closed-loop outcome**

The target list stores distinct university-major-language combinations and triggers requirement re-evaluation.

**Main flow**

1. Open a university-major option.
2. Add it to the target list.
3. Review all targets.
4. Remove or update a target when plans change.

**Acceptance Criteria**

- Given a valid option, when added, then the exact university, major, and language of instruction are stored.
- Given duplicate addition, then no duplicate target is created.
- Given a target change, then CSCA requirement matching is marked for recalculation.
- Given removal, then historical planning decisions remain explainable.

**Not included in this story:** Application submission.

### US-UNI-03 — Match CSCA requirements across targets

- **Priority:** P1
- **Actor:** Student
- **Requirement reference:** 12.2

**User story**

> As a student, I want to compare CSCA subject-language requirements across my target list so that I can see gaps in my current study plan.

**Closed-loop outcome**

Each target retains its own requirement combination and the system summarizes compatible and conflicting needs.

**Main flow**

1. Open requirement matching for the target list.
2. Review each target's required subjects and exam languages.
3. Review union, conflicts, and unsupported combinations.
4. Update the study subjects or target list.

**Acceptance Criteria**

- Given multiple targets, then each requirement combination is shown separately before any summary.
- Given differing Physics, Chemistry, or Professional Chinese requirements, then differences are not collapsed into a misleading single rule.
- Given current study subjects, then coverage and gaps are identified.
- Given source conflicts or uncertainty, then human confirmation or updated verification is recommended.

**Not included in this story:** Guaranteed admission eligibility.

### US-UNI-04 — Track application milestones

- **Priority:** P1
- **Actor:** Student or linked parent
- **Requirement reference:** 12.3

**User story**

> As a student, I want a dated application timeline so that I do not miss university, CSCA score, or scholarship deadlines.

**Closed-loop outcome**

A milestone becomes a checkable task with reminders and retained completed/overdue state.

**Main flow**

1. Add or import a milestone for an application round, deadline, score submission, or scholarship.
2. Review the generated task.
3. Receive reminders.
4. Mark it completed or let it become overdue.

**Acceptance Criteria**

- Given a milestone with a valid date and target, then a task is created.
- Given an approaching deadline, then reminders follow the user's notification preferences.
- Given completion or overdue state, then the history remains visible to the student and permitted linked parent.
- Given changed official information, then the source/version change is shown and affected milestones can be reviewed.

**Not included in this story:** Submitting applications to universities.

### US-UNI-05 — Track a document checklist

- **Priority:** P2
- **Actor:** Student
- **Requirement reference:** 12.4

**User story**

> As a student, I want per-university document status tracking so that I can prepare application materials systematically.

**Closed-loop outcome**

Each target has a checklist whose status and reminders are visible without claiming legal validity.

**Main flow**

1. Open a target university.
2. Add or use checklist items such as passport, transcript, language score, statement, medical exam, or police clearance.
3. Update each status.
4. Review missing and upcoming items.

**Acceptance Criteria**

- Given a target, then checklist items are tracked independently for that target.
- Given a status update, then it is stored with time and optional due date.
- Given reminders, then they follow notification preferences.
- Given a completed status, then the platform does not claim the document is legally valid or accepted by the university.

**Not included in this story:** Automated legal or authenticity verification.

## 4. Definition of Ready for a vertical slice

A story is ready to become a slice only when:

- its actor and outcome are unchanged by unresolved product questions;
- in-scope and out-of-scope behavior are explicit;
- acceptance criteria cover success, failure, authorization/privacy, and retry or stale-state behavior where relevant;
- requirement references are confirmed in both language versions;
- required states, ownership, retention, and audit behavior are decided;
- the TypeSpec operation set can be written without advertising unimplemented behavior.

## 5. Definition of Done

A story is done only when:

- the actor can complete the flow through the real application;
- TypeSpec, generated artifacts, backend, frontend, persistence, and tests agree;
- acceptance criteria have executable evidence;
- localization and accessibility apply to the delivered flow;
- observability records meaningful events without unnecessary private content;
- documentation and `PLAN.md` status are updated with exact verification results.
