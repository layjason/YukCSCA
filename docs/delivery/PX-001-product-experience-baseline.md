# PX-001 — Complete P0 student product-experience baseline

> **Classification: non-production product-journey delivery brief.** PX-001 validates the visible P0 student product model, navigation, interaction continuity, responsive hierarchy, and frontend data needs through deterministic fixtures. It does not create product requirements, satisfy the referenced production stories, or authorize fabricated academic data in production.

## Metadata

| Field                         | Value                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status                        | `SHAPING`                                                                                                                                                                                                                       |
| Human gate                    | `APPROVED`                                                                                                                                                                                                                      |
| Plan revision                 | 4                                                                                                                                                                                                                               |
| Updated                       | 2026-07-23                                                                                                                                                                                                                      |
| Primary actor                 | Activated student using the authenticated student application                                                                                                                                                                   |
| Production-backed entry       | `VS-000` authentication/session and `VS-001` student activation                                                                                                                                                                 |
| Exploratory requirement areas | 1.1,1.2,1.3,1.4; student-side 2.2–2.3 and 10.4; 3.1,3.2,3.3,3.4,3.5; 4.1,4.2,4.3,4.4,4.5,4.6; 5.1,5.2,5.3,5.4; 6.1,6.2,6.3,6.4; 7.1,7.2,7.3,7.4; 8.1 and 8.3; 11.1,11.2                                                         |
| Exploratory story families    | `US-LANG-*`, `US-FAM-01`–`03`, `US-GOAL-*`, `US-DIAG-*`, `US-PLAN-*`, `US-COURSE-*`, `US-SYL-01`, `US-TERM-*`, `US-PRACTICE-*`, `US-HINT-01`, `US-MISTAKE-*`, `US-AGENT-*`, `US-MOCK-*`, `US-MOT-*`, `US-WEEK-01`, `US-TRIAL-*` |
| Depends on                    | `VS-000`, `VS-001`, root `DESIGN.md`                                                                                                                                                                                            |
| TypeSpec source               | None; existing TypeSpec and generated declarations remain unchanged                                                                                                                                                             |
| API operations                | Existing identity/session and student-activation operations only                                                                                                                                                                |
| Implementation owner          | Web frontend                                                                                                                                                                                                                    |

The requirement and story references define semantic guardrails and traceability. All production slices behind those references remain `PROPOSED`; PX-001 may not mark them implemented or use its fixtures as production acceptance evidence.

## User-observable outcome

An activated student can move through one coherent P0 experience:

```text
Login
-> student activation
-> academic goals
-> subject and exam-language recommendation
-> student confirmation
-> representative diagnostic and result
-> first plan and feasibility review
-> Today
-> lesson and checkpoint handoff
-> assigned practice and feedback
-> mistake classification and remediation
-> Progress
```

The same workspace also provides a representative mock-exam journey from selection through result and remediation. All screens include the applicable states, accessibility, localization, responsive behavior, and purposeful motion, while clearly distinguishing real identity behavior from non-persistent preview learning behavior.

## Why this is the current boundary

`VS-000` and `VS-001` provide a real identity and activation path, but the current post-activation experience does not communicate how goals become subjects, diagnostics, a feasible plan, daily tasks, learning, mistakes, remediation, mock evidence, and future priorities. PX-001 makes those relationships visible before the repository commits to the next production HTTP boundary.

The milestone is deliberately broader than a shell or six destination pages, but narrower than production implementation. It must prove a complete student journey and the frontend boundaries needed by future slices without implementing real matching, scoring, mastery, planning, AI, parent linkage, access entitlement, or persistence.

## In scope

- Existing production login, session restoration, student activation, current identity, and logout.
- Goal-to-plan preview onboarding: goals, recommendation, subject/language confirmation, diagnostic, result, first plan, and feasibility review.
- One authenticated application shell with stable primary navigation: Today, Learn, Practice, Mock Exam, Progress, and Profile.
- Official-syllabus coverage versus personal-learning-status presentation.
- One complete lesson/checkpoint/practice/mistake/remediation/progress journey.
- Embedded deterministic agentic reasoning such as why a task was assigned, what changed, likely mistake cause, and next action.
- One representative short mock-exam lifecycle with exam-mode assistance restrictions.
- Student-side family-permission explanation and future/unavailable relationship actions.
- Trial, preview, available, locked, and unavailable access presentation without checkout.
- Strict separation of interface language, default/temporary explanation language, and per-subject exam language.
- Loading, empty, unavailable, restricted, validation, submitting, recoverable failure/retry, stale/already-completed, plan-risk, preview-state-lost, correct/corrective, and success states where applicable.
- English, Bahasa Indonesia, and Simplified Chinese localization; formula, Chinese-character, and pinyin-safe rendering.
- Mobile, tablet, and desktop behavior; keyboard and screen-reader semantics; normal and reduced motion.
- Focused frontend coverage plus two connected Playwright journeys in the configured desktop and mobile projects.

## Out of scope

- New Spring Boot endpoints, TypeSpec operations, generated declarations, Flyway migrations, or production data writes.
- Real university-requirement resolution or subject-matching algorithms.
- Real diagnostic scoring, plan generation, feasibility calculation, mastery, spaced review, or reprioritization.
- Real AI generation, general-purpose chat, or an AI service call.
- Real lesson/question publishing, content authoring, or copyrighted/unknown-source exam material.
- Real mock autosave, authoritative timer, exactly-once submission, attempt history, or score claims.
- Real parent invitations, relationships, authorization changes, or a parent application shell.
- Real trial consumption, entitlements, payments, checkout, subscriptions, refunds, or purchase flows.
- Tutor/admin applications, tutoring booking, Physics/Chemistry learning flows, or broader Study in China expansion.
- A new UI/CSS/animation/state/chart framework or speculative shared component library.
- Treating a route scaffold, shell, disconnected mockups, happy path, dashboard, or chat screen as the completed milestone.

## Preview labelling and data boundary

- Authenticated `STUDENT` users can access the PX-001 routes without environment-specific enablement.
- The shell shows one restrained Preview indicator and contextual labels identify fixture-backed academic, plan, family, access, and mock values.
- `/app/profile` uses real current-user identity and logout. Its learning-language, family, and access subsections clearly distinguish production facts from preview explanations.
- Preview state is in memory. Refresh may lose progress and must produce an honest restart or safe destination.
- Do not use browser storage to imply durable academic progress.
- No preview answer, score, mistake, plan, access state, family state, or mock result is written to the API, cookies, analytics, or logs.
- Fixture values are never described as production records, verified university data, official CSCA results, or durable student history.

## Route and ownership map

| Route                                   | Purpose                                                                       | Classification                                           | Ownership                             |
| --------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| `/login`                                | Existing Google entry and session behavior                                    | Production                                               | `features/auth`                       |
| `/onboarding/student`                   | Existing production student activation                                        | Production                                               | `features/onboarding`                 |
| `/onboarding/student/goals`             | Academic goal and availability capture                                        | Authenticated preview                                    | `prototype/student/onboarding`        |
| `/onboarding/student/subjects`          | Recommendation, source state, manual adjustment, and language confirmation    | Authenticated preview                                    | `prototype/student/onboarding`        |
| `/onboarding/student/diagnostic`        | Short original diagnostic in selected exam language                           | Authenticated preview                                    | `prototype/student/onboarding`        |
| `/onboarding/student/diagnostic/result` | Evidence-caveated preview strengths/gaps and starting point                   | Authenticated preview                                    | `prototype/student/onboarding`        |
| `/onboarding/student/plan-review`       | First plan, workload, risk, and adjustment review                             | Authenticated preview                                    | `prototype/student/onboarding`        |
| `/app/today`                            | Goal/plan context, task reasoning, daily work, interruption recovery          | Production identity composed with preview academic state | `app` composition plus prototype view |
| `/app/learn`                            | Course/topic structure, continuation, access, and syllabus entry              | Authenticated preview                                    | `prototype/student/learning`          |
| `/app/learn/syllabus`                   | Platform coverage separate from personal status                               | Authenticated preview                                    | `prototype/student/learning`          |
| `/app/learn/:lessonId`                  | Lesson, terminology, checkpoint handoff, and assigned practice                | Authenticated preview                                    | `prototype/student/learning`          |
| `/app/practice`                         | Assigned/topic practice, resume, mistakes, access                             | Authenticated preview                                    | `prototype/student/practice`          |
| `/app/practice/:sessionId`              | Question, hint, language help, submit/retry                                   | Authenticated preview                                    | `prototype/student/practice`          |
| `/app/practice/:sessionId/result`       | Corrective feedback, likely cause, and remediation                            | Authenticated preview                                    | `prototype/student/practice`          |
| `/app/practice/mistakes`                | In-memory mistake list and due/future review state                            | Authenticated preview                                    | `prototype/student/practice`          |
| `/app/practice/mistakes/:mistakeId`     | Mistake detail, classification, remediation, and review status                | Authenticated preview                                    | `prototype/student/practice`          |
| `/app/mock-exams`                       | Sample exam selection, language/scope/access                                  | Authenticated preview                                    | `prototype/student/mock-exam`         |
| `/app/mock-exams/:examId/instructions`  | Timing, navigation, preview policy, exam-mode restrictions                    | Authenticated preview                                    | `prototype/student/mock-exam`         |
| `/app/mock-exams/:examId/session`       | Short timed preview, question navigation, review marks, in-memory save        | Authenticated preview                                    | `prototype/student/mock-exam`         |
| `/app/mock-exams/:examId/result`        | Preview result, weaknesses, caveats, and remediation                          | Authenticated preview                                    | `prototype/student/mock-exam`         |
| `/app/progress`                         | Weekly orientation, syllabus/personal distinction, evidence, risk, next focus | Authenticated preview                                    | `prototype/student/progress`          |
| `/app/profile`                          | Real current identity and logout; honest editing status                       | Production account behavior                              | Production feature/composition        |
| `/app/profile/languages`                | Interface, explanation, temporary explanation, and exam-language distinctions | Production locale plus preview academic language state   | `prototype/student/settings`          |
| `/app/profile/family`                   | Student-side parent visibility/privacy explanation and future actions         | Authenticated preview                                    | `prototype/student/settings`          |
| `/app/profile/access`                   | Preview/trial/available/locked states and no-checkout boundary                | Authenticated preview                                    | `prototype/student/settings`          |

Only Today, Learn, Practice, Mock Exam, Progress, and Profile belong in primary navigation. Nested onboarding, lessons, activities, mistakes, exam sessions, and settings are task flows. One typed manifest supplies path, label key, active state, role visibility, placement, availability, prototype status, and requirement-area traceability where practical; it is not authorization.

## Routing and guard behavior

```text
anonymous -> /login
UNASSIGNED -> /onboarding/student
STUDENT + preview onboarding incomplete -> /onboarding/student/goals
STUDENT + preview onboarding complete -> /app/today
other role -> unsupported/unavailable destination outside student shell
```

- Ordinary activation success installs the canonical current-user/access state in its response; no redundant refresh is added.
- Existing stale-conflict recovery may refresh the session before navigation.
- After activation, the student continues to goals.
- Preview guards protect step order without redirect loops.
- Lost in-memory state routes to an honest restart or safe destination rather than reconstructing fake history.
- Authentication and role authorization remain production behavior and are never bypassed for preview or E2E convenience.

## Traceability and representation matrix

| PX surface                     | Requirement areas | Story references                                     | Classification             | Minimum evidence                         |
| ------------------------------ | ----------------- | ---------------------------------------------------- | -------------------------- | ---------------------------------------- |
| Login/session/logout           | 1.1, 1.3          | `US-AUTH-01`, `US-AUTH-02`                           | Production                 | Existing/focused auth tests              |
| Student activation             | 1.2–1.4           | `US-PROF-01`, `US-LANG-01` qualification             | Production                 | Existing/focused activation tests        |
| Academic goals                 | 3.1               | `US-GOAL-01`                                         | Prototype                  | Validation tests and Journey A           |
| Subject/language matching      | 3.2–3.3           | `US-GOAL-02`, `US-GOAL-03`, `US-LANG-03`             | Prototype                  | Route tests and Journey A                |
| Diagnostic/result              | 3.4               | `US-DIAG-01`, `US-DIAG-02`                           | Prototype                  | State tests and Journey A                |
| Plan/feasibility               | 3.4–3.5           | `US-PLAN-01`–`03`                                    | Prototype                  | Risk/adjustment tests and Journey A      |
| Learn/course structure         | 4.1, 4.3–4.4      | `US-COURSE-01`, `US-COURSE-02`, `US-COURSE-04`       | Prototype                  | Page/route tests                         |
| Syllabus coverage              | 4.2               | `US-SYL-01`                                          | Prototype                  | Coverage/personal-status test            |
| Terminology/language help      | 4.4–4.5, 5.3      | `US-LANG-02`, `US-TERM-01`–`03`                      | Prototype                  | Language-separation tests                |
| Checkpoint                     | 4.6               | `US-COURSE-03`                                       | Prototype                  | Journey A and state test                 |
| Practice/hints                 | 5.1–5.3           | `US-PRACTICE-01`, `US-PRACTICE-02`, `US-HINT-01`     | Prototype                  | Correct/incorrect/retry tests            |
| Mistake/remediation            | 5.4, 6.4          | `US-MISTAKE-01`–`03`, `US-AGENT-05`                  | Prototype                  | Mistake/remediation tests and Journey A  |
| Today/agentic reasoning        | 6.1–6.3           | `US-AGENT-01`–`04`                                   | Prototype                  | Task-reason interaction tests            |
| Mock lifecycle                 | 7.1–7.4           | `US-MOCK-01`–`05`, `US-TRIAL-03`                     | Prototype                  | Mock tests and Journey B                 |
| Daily/weekly self-management   | 8.1, 8.3          | `US-MOT-01`, `US-MOT-02`, `US-WEEK-01`               | Prototype                  | Today/Progress state tests               |
| Student-side family visibility | 2.2–2.3, 10.4     | `US-FAM-01`–`03`, privacy boundary in `US-PARENT-01` | Prototype explanation only | Privacy-copy and unavailable-action test |
| Trial/access                   | 11.1–11.2         | `US-TRIAL-01`–`03`                                   | Prototype                  | Available/locked/no-checkout tests       |

`docs/requirements/COVERAGE.md` is not changed during shaping. At completion, update it only if useful to record that these areas were visually prototyped; never replace `PROPOSED`/production coverage with PX evidence.

## Experience baseline by area

### Goal-to-plan onboarding

Academic goals must represent target enrollment year, exam date, target university, target major or broad category, program/application or scholarship type, intended language of instruction, weekly availability/preferred days, one primary target, and the valid “not decided yet” provisional path. The values remain preview inputs and are not verified university data.

Subject matching shows Mathematics English/Chinese tracks, reasons, uncertainty, a source/publication/verification date or clearly labelled preview-source state, manual adjustment, per-subject exam language, and default explanation language. Each recommendation visibly uses the normative status vocabulary `Explicitly Required`, `System Recommended`, `Pending Confirmation`, or `Manually Added`. Removing or declining an explicitly required sample subject requires a preview risk warning and confirmation. It must teach:

```text
interface language != explanation language != exam language
```

Changing one dimension must not silently change another. Exam-language adjustment warns that question sets, terminology evidence, diagnostic needs, and plan feasibility may change.

The diagnostic uses approximately three original questions, selected-answer and interruption states, submission, an evidence-caveated result, topic strengths/gaps, insufficient-evidence labels, and language observations where relevant. It never shows an official CSCA score.

Plan review shows a bounded first-week proposal, duration/completion criteria, exam date, time remaining, availability, estimated workload, priorities, and canonical feasibility states `On Track`, `At Risk`, and `High Risk`. The expanded prompt's “Feasible” and “Currently infeasible” wording is explanatory copy, not a second state model. Risk paths require consequence review and an explicit preview adjustment before continuing.

### Today and agentic reasoning

Today uses real identity only for the greeting. All academic data is labelled preview. It shows goal/plan context, feasibility, one dominant task, why it was assigned, time estimate, completion rule, remaining tasks, daily goal/progress, remediation/review, schedule context, and interruption recovery.

Deterministic embedded UI answers “Why this task?”, “What changed?”, “What likely caused this mistake?”, “What should I do next?”, and “Why did priority change?”. A contextual drawer may support the current task, but no general chat or fake dynamic intelligence is the product center.

### Learn, syllabus, lesson, and terminology

Learn shows Mathematics English/Chinese course structure, continuation, prerequisite/topic sequence, availability/access, and syllabus entry without a marketplace grid.

Syllabus explicitly separates platform content coverage from student personal status. Any source/version/verification values are clearly sample data and may not claim official/current verification.

The representative lesson includes objective, explanation, original worked example, optional terminology support, checkpoint handoff, summary, and assigned practice. A Chinese Mathematics example demonstrates characters, pinyin where useful, definition in explanation language, and a clear distinction between language help and a mathematical hint. Temporary explanation switching resets after the preview session and never changes exam/interface language.

### Practice, feedback, mistakes, and remediation

Practice home shows assigned and topic-selected entries, resume, mistakes, duration/count, and access state. The activity includes exam language, optional explanation help, progressive hints, keyboard selection, validation, submit, submitting, recoverable failure, and answer-preserving retry.

Correct feedback explains reasoning. Incorrect feedback uses qualified labels such as “Likely cause” and distinguishes knowledge, prerequisite, language, carelessness, and time-management possibilities without presenting fixture classification as infallible AI judgment.

An incorrect preview creates an in-memory mistake with topic, attempted answer, explanation, likely cause, remediation, and future review state. The primary journey continues through remediation to Progress instead of ending at the correct answer.

### Mock exam

Mock home shows one sample exam, language, scope, duration, readiness/access context, and honest empty history. Instructions explain preview status, timer, navigation, review marks, submission, and the absence of AI/translation solving.

The session uses approximately three original questions and provides an accessible timer, question navigation, answered/unanswered and mark-for-review states, in-memory save acknowledgement, review, confirmation dialog, manual submit, and preview state-loss recovery. “Saved for this preview session” is permitted; production-save claims are not.

The result shows a clearly labelled sample outcome, topic strengths/weaknesses, bounded time/language observations, remediation, and a local preview priority change. It must not claim official readiness or production evidence.

### Progress, motivation, and recovery

Progress answers what was completed, what changed, what needs review, why priority changed, current preview feasibility, and the next action. It separates platform coverage from personal status and includes weekly activity, mistakes/remediation, mock preview result, new-student empty state, missed-day recovery, and future priority confirmation without fabricating durable history.

### Profile, language, family, and access

Profile shows real name/email/role/session identity and existing logout. Unsupported editing is unavailable.

Languages show interface, default/temporary explanation, and per-subject exam language as independent state. Interface changes use the implemented locale mechanism; academic language values remain preview unless already production-backed by activation.

Family shows no-linked-parent, an unavailable/future invite or unlink entry, and privacy-safe explanation: a parent may receive summary progress/risk, syllabus progress, access, and allowed service summaries, but not private agent conversations, private notes, or unrelated learning content by default. No real relationship or authorization change occurs.

Access shows preview/trial status, available subject/language, bounded lesson/practice/mock access, locked content, why it is locked, and a future purchase entry that cannot initiate checkout.

## State model and fixture scenarios

```text
initial -> loading -> ready -> submitting -> success/corrective result -> next route
                    \-> validation error
                    \-> recoverable error -> retry with input preserved
ready -> empty
ready -> unavailable
ready -> access restricted
ready -> stale/already completed -> canonical route
ready -> plan at risk/high risk -> adjustment review
ready -> prototype state lost -> restart or production-safe route
```

Use a small deterministic adapter and only the models required for targets, recommendations, languages, diagnostic, result, feasibility, daily tasks, lesson/checkpoint, practice/hints, mistake/remediation, mock/result, progress, family explanation, and access.

Minimum injectable scenarios:

- new student;
- active plan;
- insufficient study time/High Risk;
- loading;
- empty;
- recoverable error;
- practice correct;
- practice incorrect;
- practice submit error;
- mock not started;
- mock in progress;
- mock completed;
- access restricted;
- preview state lost;
- unsupported role.

Fixtures use fictional identities and original content, contain no real personal history, make no official-source or guaranteed-score claims, remain deterministic for tests, and are not exposed through a visible scenario switcher.

## Frontend architecture

```text
app -> features -> shared
   \-> prototype -> shared
```

- `app` owns routing, guards, layouts, the typed manifest, focus management, and production/prototype/unavailable composition.
- `features` owns production auth, activation, and real account actions.
- `prototype/student` owns preview models, fixtures, state, services, scenarios, onboarding, learning, practice, mock, progress, and preview settings.
- Production features and prototype modules may not import each other.
- `shared` imports neither and receives only genuinely repeated or accessibility-critical primitives.
- Generated API types are never expanded or disguised as prototype types.
- Prefer React/local context and a small service interface. Do not add Redux, Zustand, XState, a generic engine, or another state dependency.
- Create no empty folders or primitives merely to reproduce an illustrative tree.

## Language invariants

- Interface language controls product chrome only and follows the implemented locale mechanism.
- Default explanation language is an academic preference; activation provides the only currently production-backed value.
- Temporary explanation language affects only the active preview learning session and resets afterward.
- Exam language belongs to each subject track and controls sample question/term presentation.
- Changing one language dimension never silently changes another.
- Mathematics English and Chinese share the mathematical concept structure but remain distinct exam-language and terminology experiences.
- Formula direction/punctuation, Chinese characters, and pinyin must remain readable in all supported interface locales.

## Experience, accessibility, responsive, and motion requirements

Every flow follows:

```text
Orient -> Act -> Acknowledge -> Wait honestly -> Resolve -> Recover
```

- Each page has semantic landmarks, one `h1`, logical headings, visible focus, and a clear dominant action.
- Navigation, forms, answer groups, lesson, practice, mistakes, and mock session are keyboard operable.
- Grouped answers use `fieldset`/`legend`; validation uses `aria-invalid` and linked descriptions.
- Results use appropriate status announcements; timer semantics do not announce every second.
- Submission confirmation traps focus and supports expected escape/close behavior.
- Route changes move focus to the page heading/main content without repeated disruptive announcements.
- State is never communicated by color alone; touch targets are at least 44px and contrast remains sufficient.
- Mobile is the everyday-learning baseline; tablet is intentional; desktop is optimized for long lessons, syllabus, Progress, and mock exams.
- Bottom navigation respects safe areas and never covers content; forms/questions/translations do not force horizontal scrolling.
- No critical action depends on hover or precise pointer movement.
- Buttons, selections, navigation, disclosures, save acknowledgement, progress, and route/state changes use short CSS motion to explain cause and effect.
- No perpetual/bounce-heavy/decorative motion, fake typing, or routine confetti.
- `prefers-reduced-motion: reduce` preserves content, state meaning, focus, and next actions.
- `DESIGN.md` semantic tokens control color. Pastels are contextual; success/warning/danger use dedicated semantic roles.

## Documentation sufficiency review

| Review area                          | Evidence inspected                                                                                                                                            | Status  | Qualification                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------- |
| End-to-end flow and handoffs         | Expanded worker prompt; current auth/activation/router; linked goal, diagnostic, plan, learning, practice, agent, mock, motivation, family, and trial stories | `CLEAR` | Two integrated journeys accepted                   |
| Experience, routes, states, recovery | Expanded route/state inventory; `DESIGN.md`; design workflow; Playwright projects                                                                             | `CLEAR` | Shell-only completion prohibited                   |
| Requirement/story coverage           | Paired requirement areas and `COVERAGE.md` P0 matrix                                                                                                          | `CLEAR` | All references exploratory unless VS-000/001       |
| Domain terms/evidence                | Story distinctions for plan risk, syllabus coverage, mastery, assistance, mistakes, and mock evidence                                                         | `CLEAR` | Canonical story terms override prompt synonyms     |
| Authorization/privacy/minors         | Agent/security rules; student-side parent/privacy requirements                                                                                                | `CLEAR` | Explanation only; no relationship or data exposure |
| Failure/retry/stale/state loss       | Existing activation recovery plus deterministic in-memory scenarios                                                                                           | `CLEAR` | No persistence/idempotency claim                   |
| Contract/migration/external effects  | Existing TypeSpec/generated boundary                                                                                                                          | `CLEAR` | No changes permitted                               |
| Acceptance/observability             | Vitest/Testing Library and two configured Playwright projects                                                                                                 | `CLEAR` | No real analytics for prototype events             |

## Human decision gate

| Field             | Value                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Gate status       | `APPROVED`                                                                                                                           |
| Decision owner    | Product owner                                                                                                                        |
| Approval scope    | Complete frontend prototype scope plus direct authenticated-student availability without an environment flag, recorded in revision 4 |
| Approval evidence | Repository conversation on 2026-07-23: product owner removed the prototype environment-control requirement because of its complexity |

| ID     | Question and scenario                                                                                        | Resolution                                                                                                                                             | Status     |
| ------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `D-01` | Does PX-001 require an environment flag or separate disabled-route behavior?                                 | No. Authenticated students can access the routes directly; visible Preview labels and strict in-memory/no-API boundaries distinguish fixture behavior. | `RESOLVED` |
| `D-02` | Does preview activity create real scoring, mastery, plans, mistakes, family state, access, or mock evidence? | No. Every academic/commercial/relationship outcome is labelled preview, non-persistent, and non-authoritative.                                         | `RESOLVED` |
| `D-03` | May PX-001 stop after shell or destination mockups?                                                          | No. Completion requires both connected journeys plus full cross-cutting quality evidence.                                                              | `RESOLVED` |
| `D-04` | Which feasibility labels control when the prompt uses alternate wording?                                     | Canonical story states `On Track`, `At Risk`, and `High Risk` control; “feasible/infeasible” may appear only as explanatory copy.                      | `RESOLVED` |

Reopen the gate if implementation would introduce production persistence, public HTTP behavior, real source/requirement claims, scored/mastery semantics, parent authorization, entitlement consumption, or another role shell.

## Acceptance and evidence matrix

| AC ID   | Given / When / Then                                                                                                                                                                                          | Required evidence                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `AC-01` | Given anonymous, unassigned, student preview-incomplete, student preview-complete, and unsupported-role states, then each reaches its documented route without redirect loops.                               | Router/guard tests                       |
| `AC-02` | Given ordinary activation success, canonical response state is installed without refresh; stale conflict preserves refresh recovery.                                                                         | Activation tests                         |
| `AC-03` | Desktop and mobile navigation, labels, active state, role visibility, placement, availability, and traceability derive from one typed manifest.                                                              | Manifest/shell tests                     |
| `AC-04` | Given an authenticated student opens fixture-backed routes, the shell and contextual copy label them Preview while data remains in memory and never crosses production API, analytics, or record boundaries. | Boundary tests and production build      |
| `AC-05` | Goal entry supports validation, undecided/provisional target, one primary target, and preserves input on errors.                                                                                             | Onboarding integration tests             |
| `AC-06` | Recommendation shows reasons/uncertainty/sample source state and lets the student confirm or adjust subject/exam-language choices without coupling language dimensions.                                      | Recommendation/language tests            |
| `AC-07` | Representative diagnostic moves through original questions to an evidence-caveated result and supports interruption/state-loss recovery without an official score.                                           | Diagnostic tests and Journey A           |
| `AC-08` | Plan review shows first-week tasks, workload, completion criteria, canonical feasibility, risk reasons, and consequence-aware adjustment before Today.                                                       | Plan tests and Journey A                 |
| `AC-09` | Learn, syllabus, lesson, terminology, and checkpoint visibly separate platform coverage, personal status, explanation help, exam language, and mastery evidence.                                             | Learning/language tests                  |
| `AC-10` | Today explains task purpose, estimate, completion, plan risk, remaining work, and interruption recovery using real identity only for greeting.                                                               | Today/agentic tests                      |
| `AC-11` | Practice covers assigned/topic entry, hints, correct/corrective feedback, qualified cause, answer-preserving retry, mistake capture, remediation, and Progress acknowledgement.                              | Practice/mistake tests and Journey A     |
| `AC-12` | Mock preview covers selection, instructions, timer/navigation/review marks, in-memory save, confirmation, exam-help restriction, result caveat, and remediation.                                             | Mock tests and Journey B                 |
| `AC-13` | Progress represents daily/weekly activity, syllabus/personal distinction, mistakes, recovery, risk change, mock preview, and next focus without fabricated durable history.                                  | Progress tests                           |
| `AC-14` | Profile uses real identity/logout while Languages, Family, and Access accurately show independent language state, privacy boundaries, preview/trial/locked states, and unavailable real actions.             | Profile/settings tests                   |
| `AC-15` | Every applicable flow provides loading, empty, unavailable, restricted, validation, submitting, recoverable error/retry, stale, risk, state-lost, and success/corrective behavior.                           | Scenario adapter/page tests              |
| `AC-16` | Primary onboarding, lesson, practice, mistake, and mock flows work by keyboard with correct focus, answer semantics, announcements, confirmation-dialog behavior, and reduced motion.                        | Accessibility tests and E2E              |
| `AC-17` | English, Bahasa Indonesia, and Simplified Chinese keys are complete; long copy, formulas, Chinese characters, and pinyin remain usable; all language dimensions stay independent.                            | Key-parity tests and visual review       |
| `AC-18` | Mobile/tablet/desktop layouts remain intentional, primary navigation remains reachable, and mock/syllabus/lesson/progress use desktop space without dashboard density.                                       | Screenshots/traces and responsive review |
| `AC-19` | Production features and prototype modules remain isolated; generated types are unchanged; no backend, contract, migration, storage, or analytics boundary is crossed.                                        | Typecheck, lint, diff review             |
| `AC-20` | Both connected journeys run in the configured desktop and mobile Playwright projects without an authentication bypass.                                                                                       | Playwright traces/screenshots            |

## Test and verification plan

During implementation, run only focused tests for the active area. Before final PX handoff, run the complete applicable frontend gate because routing, localization, and the whole web baseline change.

Focused suites must cover:

- routing, guards, nested layouts, manifest, focus movement, preview labelling, and unsupported roles;
- goal validation, undecided target, recommendation, manual adjustment, language separation, diagnostic/result, plan risk, and adjustment;
- Today task reasoning, lesson/checkpoint, practice correct/incorrect/error retry, mistake/remediation, and Progress;
- mock instructions, navigation, review marks, answer review, confirmation, exam-help restriction, result, and remediation;
- real Profile identity, language distinctions, family privacy explanation, trial/locked access, and no checkout;
- keyboard/focus/semantics, reduced motion, localization parity, in-memory/no-API fixture boundaries, and generated-contract non-change.

Connected browser journeys in both configured desktop and mobile projects:

```text
Journey A: activated student -> goals -> subjects -> diagnostic -> result -> plan review
           -> Today -> lesson -> checkpoint -> assigned practice -> incorrect feedback
           -> mistake classification -> remediation -> Progress

Journey B: Mock Exam -> instructions -> sample session -> mark for review
           -> review/submit confirmation -> result -> remediation recommendation
```

Final commands:

```bash
pnpm typecheck:web
pnpm lint:web
pnpm test:web
pnpm build:web
pnpm e2e:web
```

Format only PX-changed files with the workspace-pinned formatter. Do not run Maven, Compose, contract generation, or the full repository gate unless the actual diff crosses those boundaries. Explicitly confirm TypeSpec, generated API declarations, backend, and migrations are unchanged.

## Integrated implementation sequence

Internal stages manage work order; none is an independently acceptable PX handoff.

1. Inspect authorities, current implementation, staged/unstaged work, and resolve drift; move PX-001 to `IN_PROGRESS` when revision 4 still matches.
2. Build Stage A: route manifest, nested routing, layouts, shell, guards, focus management, visible preview labelling, fixture boundary, and unsupported-role behavior.
3. Build Stage B: activation handoff, goals, subject/language recommendation and confirmation, diagnostic/result, and plan/feasibility review.
4. Build Stage C: useful Today, Learn, Practice, Mock Exam, Progress, Profile, syllabus, language, family, and access destinations.
5. Build Stage D: complete Today-to-remediation learning loop with mistake capture and Progress update.
6. Build Stage E: representative mock list-to-result-to-remediation loop.
7. Build Stage F: full states, accessibility, responsive behavior, localization, motion/reduced motion, focused tests, browser journeys, and visual evidence.
8. Update `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, this brief, and `docs/PLAN.md` with implemented facts and exact results.
9. Update `docs/requirements/COVERAGE.md` only if a clearly labelled non-production prototype note improves traceability; never mark production stories implemented.
10. Mark PX-001 `VERIFYING`, then `DONE` only when `AC-01` through `AC-20` and both connected journeys have named evidence.

## Definition of done

- [ ] Goal-to-plan onboarding, all primary destinations, learning/remediation, and representative mock journey form one coherent student product.
- [ ] `AC-01` through `AC-20` have named passing evidence.
- [ ] Fixture-backed routes are visibly labelled Preview and protected by the authenticated student guard.
- [ ] Real authentication, session restoration, activation, current identity, and logout remain production-backed and unduplicated.
- [ ] All academic, plan, mistake, family, trial/access, and mock outcomes are visibly preview-only and non-persistent.
- [ ] Interface, explanation, temporary explanation, and per-subject exam language remain independent.
- [ ] Complete applicable states and restart/recovery behavior are verified.
- [ ] Keyboard, focus, screen-reader semantics, mobile/tablet/desktop, three languages, formula/Chinese/pinyin rendering, and normal/reduced motion are verified.
- [ ] No TypeSpec, generated declaration, backend, migration, production storage, or real analytics change exists.
- [ ] Architecture and development documentation describe only the implemented final boundary.
- [ ] Referenced production stories and slices remain `PROPOSED` unless separately accepted.
- [ ] Every prototype surface has an explicit promotion or deletion owner in its future production slice.

## Promotion and deletion rule

When a production slice becomes active, its accepted requirements, TypeSpec, authorization, persistence, failure/idempotency rules, and evidence semantics replace PX assumptions. Reuse only presentation/view-model code that still fits. Introduce a production adapter to generated declarations and delete obsolete fixtures/routes. Do not maintain parallel production/prototype paths without a named consumer, expiry, and removal owner.

## Verification evidence

| Evidence                             | Result                               |
| ------------------------------------ | ------------------------------------ |
| Documentation sufficiency            | Complete for revision 4              |
| Human gate                           | Approved on 2026-07-23               |
| Focused frontend tests               | Not run — implementation not started |
| Full frontend gate                   | Not run — implementation not started |
| Journey A desktop/mobile             | Not run — implementation not started |
| Journey B desktop/mobile             | Not run — implementation not started |
| Visual/accessibility/language review | Not run — implementation not started |
| Contract/backend/migration diff      | Not applicable unless scope changes  |

## Revision history

| Revision | Date       | Change                                                                                                                                                                                                                                                       |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4        | 2026-07-23 | Removed environment-flag gating and its disabled-route matrix; authenticated students access visibly labelled preview routes whose fixture state remains in memory and outside production data boundaries.                                                   |
| 3        | 2026-07-23 | Expanded PX-001 to the complete goal-to-remediation and representative mock journeys, full route/requirement traceability, family/access visibility, language separation, state inventory, and cross-cutting evidence required by the updated worker prompt. |
| 2        | 2026-07-23 | Replaced the restrictive phase handoff with one integrated lesson/practice/result/Progress baseline and explicit destination/state quality requirements.                                                                                                     |
| 1        | 2026-07-23 | Created the non-production boundary, exposure policy, non-mastery semantics, and initial phased proposal.                                                                                                                                                    |
