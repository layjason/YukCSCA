# YukCSCA Platform Requirements Summary

**Version:** V1.4
**Date:** 2026-07-31
**Target Market:** Indonesian high school students planning to pursue undergraduate study in China, and their families

> **NORMATIVE PRODUCT AUTHORITY:** This document and its paired Chinese version are the sole authoritative product requirements for YukCSCA. Architecture descriptions, implementation plans, contracts, issues, and code may implement or propose a subset, but they do not amend or override these requirements. Both language versions must change together.

## Document History

| Version | Date       | Change                                                                                  |
| ------- | ---------- | --------------------------------------------------------------------------------------- |
| V1.4    | 2026-07-31 | Replaced publication of copied official-syllabus wording with localized YukCSCA summaries linked to the official source, including Bahasa Indonesia. |
| V1.3    | 2026-07-30 | Separated direct preparation from plan orchestration, split plan-independent mock remediation from plan integration, and introduced a portable academic-content direction. |
| V1.2    | 2026-07-24 | Qualified fixture-backed email/password previews while preserving Google-only production authentication. |
| V1.1    | 2026-07-20 | Added stable navigation and revision history. |
| V1      | 2026-07-19 | Established the initial consolidated normative requirements baseline.                   |

## Contents

- [0. Product Positioning and Platform Roles](#product-positioning)
- [(I) Functional Requirements](#functional-requirements)
  - [1. User Accounts and Identity Management](#accounts-identity)
  - [2. Parent–Student Relationship Management](#parent-student)
  - [3. Learning Goals, Subject Matching, and Diagnostic Assessment](#goals-diagnostics)
  - [4. Courses and Learning Materials](#courses-materials)
  - [5. Question Practice and Mistake Review](#practice-review)
  - [6. Agentic Tutor](#agentic-tutor)
  - [7. Full Mock-Exam Lifecycle](#mock-exams)
  - [8. Learning Motivation and Self-Management](#motivation)
  - [9. Platform-Managed One-on-One Tutoring](#tutoring)
  - [10. Parent Support](#parent-support)
  - [11. Free Trial, Subscriptions, and Local Payments](#payments)
  - [12. Study in China Platform Expansion](#study-in-china)
  - [13. Notifications and Customer Support](#notifications-support)
  - [14. Back-Office Administration](#administration)
- [(II) Non-Functional Requirements](#non-functional-requirements)
  - [1. Performance](#performance)
  - [2. Availability and Reliability](#availability-reliability)
  - [3. Security and Access Control](#security-access)
  - [4. Privacy and Protection of Minors](#privacy-minors)
  - [5. AI Academic Quality and Safety](#ai-quality-safety)
  - [6. Content Copyright and Source Traceability](#copyright-traceability)
  - [7. Localization, Language Consistency, Usability, and Accessibility](#localization-accessibility)
  - [8. Payment and Financial Consistency](#financial-consistency)
  - [9. Maintainability and Content Updates](#maintainability-updates)
  - [10. Observability and Operations](#observability-operations)

---

<a id="product-positioning"></a>

## 0. Product Positioning and Platform Roles

### 0.1 Product Positioning

#### 0.1.1 Product Definition

YukCSCA is an Indonesia-localized learning platform that uses **CSCA preparation as the initial entry point and undergraduate study preparation for China as the long-term scenario**. The first iteration offers **Mathematics in English and Mathematics in Chinese** as the core purchasable subjects. Both tracks share the same mathematical knowledge framework while providing courses, questions, terminology training, and mock exams in different exam languages. Physics, Chemistry, and Professional Chinese will be added later. The platform provides official syllabus mapping, diagnostic assessment, study-plan feasibility assessment, personalized planning, micro-lessons, practice, mistake review, mock exams, an agentic tutor, and a platform-managed one-on-one tutoring service when necessary.

The platform is not merely a question bank, course player, or general-purpose chatbot. It supports two valid preparation entry paths:

1. **Direct preparation:** choose a supported subject and exam-language track → learn, practise, and take mocks → collect evidence and follow-up recommendations → optionally create a study plan.
2. **Guided preparation:** record a target → review sourced subject requirements → complete a diagnostic → generate and confirm a feasible study plan → use daily orchestration.

Both paths converge on the same reviewed content, assessment-attempt, mastery-evidence, mistake, remediation, and mock models. A goal, diagnostic, or active study plan must not gate disclosed trial access or direct subject preparation unless a specific capability explicitly reads or updates a plan.

After the first phase has been validated, the platform will gradually support additional needs such as university and major information, CSCA requirement matching, application timelines, Professional Chinese, HSK, academic terminology, and pre-departure preparation, giving students reasons to continue using the platform after completing the CSCA exam.

#### 0.1.2 Target Users

The platform prioritizes the following users:

1. **Core students:** Indonesian students in Grades 10–12 who plan to pursue undergraduate study in China within the next 3–24 months.
2. **Students close to the exam:** Students who already know their CSCA subjects but lack systematic review, mock exams, and time-management support.
3. **Students with weak foundations or cross-language needs:** Students whose school preparation is inconsistent and who need to first understand concepts in a familiar explanation language before transitioning to English or Chinese exam terminology and original-language questions.
4. **Self-directed learners:** Students who cannot or do not want to pay for long-term, expensive synchronous classes and prefer lower-cost, self-paced study.
5. **Parent payers:** Parents responsible for selecting and paying for services and monitoring progress, without needing direct access to all private learning conversations.
6. **Students who need human support:** Students who have already used the agent and self-study content but still require a tutor for specific concepts, exam strategy, or language comprehension.

#### 0.1.3 Market Problems

YukCSCA does not address a market with “no CSCA materials.” It addresses the following structural problems in existing materials and services:

1. **Exam and university requirements are fragmented:** CSCA subject combinations vary by scholarship type, university, major, and language of instruction, making it difficult for students to determine what they need to prepare.
2. **There is plenty of content but no clear path:** Competitors already provide large question banks, mock exams, videos, and AI explanations, but students may still need to decide for themselves what to study next, why they should study it, and whether they have truly mastered it.
3. **Mistakes do not form a remediation loop:** A mistake notebook and explanations alone do not guarantee improvement. Students need error classification, prerequisite remediation, spaced review, and revalidation.
4. **Language bridging is insufficient:** Existing products commonly require students to study directly in English or Chinese and lack a complete bridge of “configurable explanation language → exam terminology preview → original-language question reading → gradual reduction of assistance.” Bahasa Indonesia should be an important supported language, but the platform must not assume that every student uses the same explanation language.
5. **Synchronous tutoring is expensive and time-constrained:** Paid group classes and one-on-one tutoring already exist in Indonesia, demonstrating willingness to pay, but fixed schedules and prices of several million rupiah are unsuitable for many families.
6. **Parent involvement lacks appropriate boundaries:** High school students are often supported and funded by parents, but parents need progress, risk indicators, and actionable recommendations rather than default access to all private learning content.
7. **Exam information and content reliability are inconsistent:** Some third-party pages have unclear sources, inconsistent updates, or information that does not fully align with official rules. Users need verifiable sources and update dates.

#### 0.1.4 Core Value Propositions

For students:

> Learn in the language you understand best and sit the exam using original English or Chinese questions; know what to study each day, whether the current plan can be completed on time, and turn every mistake into the next learning task.

For parents:

> Purchase services at an affordable local price, clearly understand how the course maps to the official syllabus, whether the student is progressing according to plan, and what supportive actions are needed, without excessive monitoring.

For tutors:

> See the student’s actual weaknesses before class and use one-on-one time for issues that most require human judgment and explanation.

For the platform:

> Cover most learning scenarios through scalable, low-cost self-study and agentic support, then use human tutoring for high-value and high-complexity cases, creating a scalable blended-learning model.

#### 0.1.5 Competitive Positioning

YukCSCA does not position itself around “the largest number of questions,” “having an AI chat box,” or “also having a streak.” Public market pages show that CSCA.id, CSCA Academy, and other products already provide question banks, timed mock exams, AI explanations, mistake review, study plans, and streaks. Indonesian training providers also offer group classes, mock exams, and one-on-one tutoring.

YukCSCA must therefore differentiate through:

- **Closed-loop agentic learning:** The agent does not only answer questions; it continuously adjusts tasks based on goals, diagnostic results, practice, and mock-exam performance.
- **Error causes and remediation:** The platform does not only save mistakes; it identifies knowledge gaps, language misinterpretation, carelessness, or time-management issues, then schedules reteaching and revalidation.
- **Configurable explanation language and exam-language bridging:** Students choose a default explanation language in Settings. Courses and the agent explain in that language, while questions, terminology, and mock exams remain organized around the student’s selected English or Chinese exam language.
- **Transparent official-syllabus coverage and trusted content governance:** University requirements show sources and verification dates. Courses are mapped item by item to the official CSCA syllabus and display coverage status. Courses, questions, and videos include authorship, authorization, and review records.
- **Continuous service from agent to human tutor:** Students submit tutoring needs with learning context attached; the platform contacts the student or parent, manually matches an appropriate tutor, and writes confirmed meetings, materials, homework, and feedback back into the study plan.
- **Parent-friendly purchasing and support:** The platform supports local payment methods, parent-sponsored purchases, and lightweight progress summaries.
- **Expansion from exam preparation to China-study readiness:** The platform reuses student goals and learning data to gradually expand into university requirements, application milestones, and pre-enrollment preparation.

#### 0.1.6 Product Boundaries

The first version explicitly will not:

- Promise guaranteed passing, guaranteed admission, or unverified fixed score improvements.
- Present a general-purpose AI chatbot as a complete learning agent.
- Depend on leaked materials, unknown-source “real questions,” or unauthorized official exam questions.
- Launch an unreviewed open marketplace where any tutor can freely join, or expose a public tutor list, price comparison, or self-service tutor selection to students and parents.
- Build a complete proprietary video-conferencing infrastructure; mature services should be integrated first.
- Launch complex social communities, public score rankings, or mandatory parent monitoring.
- Guarantee the legal validity of application materials or replace final university review.

---

### 0.2 Primary Platform Roles

The platform has only four primary front-end roles: **Student, Parent, Tutor, and Admin**. In the pilot, the first Admin account performs all delivered admin responsibilities. Separate admin roles are introduced only when the platform adds more administrators.

#### 0.2.1 Student

**Role Definition:** The primary learner and main product user.

**Core Goals:**

- Confirm required CSCA subjects and preparation timeline.
- Follow a path appropriate to the student’s current level rather than practicing without direction.
- Clearly understand changes in mastery, weaknesses, and exam readiness.
- Obtain tutor support when self-study is insufficient.
- Continue using the platform for university applications and China-study preparation after the CSCA exam.

**Main Pain Points:**

- Uncertainty about which exam subjects are required by different universities, majors, and languages of instruction.
- Differences between Indonesian high school curricula and CSCA scope, terminology, and difficulty.
- Fragmented materials and no clear learning sequence or daily task list.
- Repeating the same mistakes even after reading explanations.
- Procrastination during long-term self-study and difficulty recovering after interruptions.
- High cost and inflexible scheduling of traditional tutoring.

**Required Capabilities:**

- Register independently, log in, and maintain a profile.
- Enter target university, major, language of instruction, application type, exam date, and available study time so that the system can prefill recommended exam subjects, while retaining the ability to add other subjects manually.
- Select or change the default explanation language in Settings without affecting confirmed exam languages or subjects.
- Complete a diagnostic assessment and receive a study plan.
- View the feasibility of the plan, remaining workload, required time commitment, and risk alerts, then adjust the plan based on recommendations.
- View the official syllabus coverage map to understand platform content coverage, personal progress, and knowledge points that still need mastery.
- Study courses, complete practice, review mistakes, and take mock exams.
- Use a context-aware agent for explanations and task adjustments.
- View mastery, progress, weekly review, and exam-readiness information.
- Invite or unlink a parent and clearly understand what the parent can access.
- Use benefits purchased by the student or a parent.
- Purchase or use one-on-one tutoring entitlements, submit tutoring needs, available times, and contact details, and wait for the platform to contact the student or parent and match a tutor.
- After Admin matching, view the assigned tutor, confirmed time, external meeting information, text or PDF lesson materials, homework requirements, and post-class summary.
- Submit homework as text and/or PDF, review tutor feedback, and resubmit when requested.
- Report issues with courses, questions, AI answers, or services.

**Data and Permission Boundaries:**

- Students own their learning profiles, personal notes, and learning conversations.
- Parents can access summaries, risks, orders, and tutor-session summaries by default, but not complete private conversations.
- Tutors access only the learning brief authorized and required for the tutoring session.
- Students cannot alter official scores, orders, content-review records, or tutor settlement data.

**Success Criteria:**

- Complete the first “goal → diagnostic → plan → feasibility assessment → learning → assessment” loop.
- Understand current plan risk and official syllabus progress, and adjust time commitment when needed.
- Continue following the plan and receive remediation tasks after failure.
- Demonstrate improvement through later quizzes or mock exams.

#### 0.2.2 Parent

**Role Definition:** The student’s supporter, payer, and limited monitor—not a substitute user of the student’s learning account.

**Core Goals:**

- Select and pay for an appropriate learning service.
- Understand whether the student is learning consistently, falling materially behind, or needing additional support.
- Encourage the student, help adjust plans, or purchase tutoring without excessive intrusion into privacy.
- Manage orders, refunds, subscriptions, and tutoring bookings.

**Main Pain Points:**

- Difficulty determining whether an online preparation product is effective and whether its content is trustworthy.
- Limited visibility into whether the student uses a purchased service.
- Lack of familiarity with CSCA subjects, exam pacing, and Chinese university requirements.
- Difficulty balancing insufficient visibility with excessive monitoring.
- Unclear local payment, refund, and entitlement allocation processes.

**Required Capabilities:**

- Register independently and create a student account, or accept a student invitation to link accounts.
- View the linked student’s learning summary, plan completion, plan feasibility, official syllabus progress, mock-exam trend, and risk alerts.
- View actionable recommendations instead of only raw data.
- Purchase subscriptions, courses, or tutoring for a specified student.
- View orders, entitlements, payment receipts, refunds, and booking status.
- Adjust notification preferences and manage the relationship link.
- Purchase platform-managed one-on-one tutoring for a specified student, submit tutoring needs and available times, and wait for manual contact from the platform.
- After matching, view the assigned tutor, confirmed time, booking status, meeting-information status, homework-completion status, and a feedback summary.
- Confirm timing, request rescheduling, or request a tutor replacement through the platform or agreed external contact channel; parents do not browse the full tutor pool.

**Data and Permission Boundaries:**

- Parents cannot access complete agent conversations or private notes by default.
- Parents can access only data for linked students and orders they paid for.
- Parents cannot directly alter scores, mastery levels, or tutor conclusions.
- Minor-related permissions and consent must comply with applicable Indonesian requirements.

**Success Criteria:**

- Confirm that purchased entitlements are assigned to the correct student.
- Understand plan feasibility, syllabus progress, and risks through the weekly report, then take at least one actionable support step when needed.
- Complete payment, booking, or result review without frequent manual customer-service assistance.

#### 0.2.3 Tutor

**Role Definition:** The human teaching layer in the platform-managed one-on-one tutoring service, responsible for high-value problems that the agent and self-study content cannot resolve sufficiently. Tutors do not receive bookings through a public marketplace; Admins internally match and assign tutors based on subject, language, student needs, and time.

**Core Goals:**

- Receive Admin-assigned tutoring work that matches subject, language, expertise, and availability.
- Understand the student’s goals and actual weaknesses before class.
- Deliver targeted teaching through an external online meeting.
- Provide lesson materials, post-class summaries, and actionable homework.
- Review homework submitted as text or PDF, provide feedback, and receive accurate settlement for completed sessions.

**Main Pain Points:**

- Insufficient pre-class information in ordinary online tutoring, causing class time to be spent on repeated diagnosis.
- Incomplete student descriptions that make it difficult to identify root causes.
- Fragmented manual matching, meeting-link, material, attendance, homework, feedback, and settlement workflows.
- Unclear assignment rules, teaching-quality requirements, and settlement standards.

**Required Capabilities:**

- Submit identity, education, subject, exam-language, explanation-language, and teaching-experience information for review.
- Provide or update availability, specialist topics, and service status to the platform; the Admin-maintained internal tutor record is the formal matching source.
- View bookings assigned by Admins and the authorized pre-class learning brief.
- Publish or update the external meeting provider, link, meeting ID, password, and instructions; an Admin may enter this information on the tutor’s behalf.
- Publish pre-class, in-class, and post-class materials as platform text or PDF.
- Record attendance and lesson-completion status.
- Submit lesson summaries, areas for improvement, and follow-up recommendations.
- Publish homework instructions as text and optionally attach a PDF.
- Review homework submitted as text and/or PDF, provide text and/or PDF feedback, and request resubmission when necessary.
- View session completion, disputes, and settlement status.
- Receive student ratings and provide explanations in disputes.

**Data and Permission Boundaries:**

- Tutors access only the assigned booking data authorized by the student and needed for the current lesson.
- Tutors cannot access unrelated private conversations, payment information, the complete tutor pool, or other tutors’ session content.
- Tutors can access only materials, homework, submissions, and feedback associated with their own assigned bookings.
- Tutors cannot alter system diagnostics, official mock-exam scores, payment status, or matching decisions.
- Materials uploaded for a specific booking do not automatically enter the formal course library; formal publication still requires content review.
- Tutors must not publicly share student submissions, meeting links, or personal learning data.

**Success Criteria:**

- The pre-class brief reduces repeated diagnostic time.
- Students can find the assigned tutor, confirmed meeting information, lesson materials, and homework requirements through the platform.
- Tutors can complete the loop “publish homework → student submits → tutor provides feedback → student resubmits when required.”
- Post-class conclusions and homework results are written back into the student’s study plan.
- Assignment, meeting, material, homework, completion, rating, dispute, and settlement status are fully traceable.

#### 0.2.4 Admin

**Role Definition:** The platform governance and operations role responsible for the trusted operation of content, AI, users, tutoring, and transactions.

**Core Goals:**

- Ensure that official learning content is accurate, traceable, and sustainably maintainable.
- Ensure verifiable mapping between course content and the official CSCA syllabus, and respond promptly to syllabus-version changes.
- Ensure that university and exam information includes sources, dates, and review mechanisms.
- Maintain the internal tutor pool, manually contact students or parents, match tutors, confirm times, and control one-on-one service quality and risk.
- Handle user, payment, refund, complaint, and relationship-link disputes.
- Monitor the learning loop, conversion, AI quality, and platform reliability.

**Main Pain Points:**

- Academic content, AI answers, and university information change over time and may contain errors.
- Unreviewed tutors, unknown-source content, and exaggerated marketing damage trust.
- Payment, entitlement, refund, and tutor-settlement states may become inconsistent.
- As the operations team grows, giving every administrator full access would increase privacy and operational risk.
- Without event data, the team cannot determine whether features actually improve learning.

**Required Capabilities:**

- Use one Admin account in the pilot and record important admin actions; define separate admin roles before adding more administrators.
- Search for and handle issues involving students, parents, tutors, and linked relationships.
- Review and maintain the internal tutor pool, including subjects, languages, specialist areas, availability, internal pricing, workload, ratings, and service status.
- Review paid tutoring requests, contact students or parents through external chat, record the result, and manually match a tutor.
- Enter or confirm the assigned tutor, lesson time, external meeting, lesson materials, homework, submissions, feedback, and session status.
- Suspend tutor services and handle tutor replacement, rescheduling, refunds, and complaints.
- Manage official syllabus versions and mappings to courses, question banks, assessments, and mock exams, including coverage and publication status.
- Manage content authorship, sources, authorization, review, and permitted usage scope.
- Manage orders, payments, refunds, entitlements, tutoring hours, manual-contact records, tutor matching, bookings, meeting access, lesson materials, homework, submissions, and feedback status.
- Review and handle AI errors, low-confidence answers, and frequently disputed content.
- Publish announcements, handle support tickets, and view core operating metrics.
- Remove incorrect or high-risk content when necessary.

**Data and Permission Boundaries:**

- Admin access is minimized by responsibilities such as content, academics, support, tutoring, and finance.
- Access to private learning content requires a clear business justification and must be logged.
- Manual changes to entitlements, refunds, content status, tutor status, matching outcomes, booking time, or entered teaching information require a recorded reason, the actual provider, and the system operator.
- Operating data should use aggregated or de-identified forms wherever possible.

**Success Criteria:**

- Critical content, order, tutoring, and AI issues are traceable from identification through resolution.
- Courses, questions, and university information can be updated without engineering support.
- The platform can identify where students leave the learning loop and which content or answers repeatedly cause problems.

#### 0.2.5 Role Relationship Principles

- Students may register independently and are not required to be created by a parent first.
- Parents may also create a student account, after which the student confirms profile information and terms on first login.
- Linked students and parents retain separate accounts, profiles, and permissions.
- Parents may pay, but entitlements must be assigned explicitly to a specified student.
- Tutors are not administrators of student accounts and may access only assigned and authorized tutoring data.
- Students and parents do not browse the complete tutor pool; Admins manually match tutors based on needs, language, time, and tutor capability.
- External chat is used for contact and confirmation, but the final tutor, time, meeting, materials, homework, and service status must be recorded in YukCSCA as the formal record.

### 0.3 Market Validation Conclusions

- **The demand direction is valid:** The population of Indonesian students pursuing undergraduate study in China and the new CSCA requirements create a real entry point. However, there is no publicly available, audited annual count of Indonesian CSCA candidates, so accurate revenue potential cannot be inferred solely from broad student-population figures.
- **Core learning functions have market validation:** Question banks, mock exams, AI explanations, mistake notebooks, study plans, group classes, and one-on-one tutoring already have competitor supply and paid pricing.
- **Product differentiation still requires validation:** “Closed-loop agentic learning + configurable explanation language with dual English/Chinese Mathematics tracks + trusted information governance + human tutoring write-back” is a reasonable differentiation, but must be validated through MVP usage data and interviews rather than inferred solely from competitor pages.
- **Feature-priority principle:** Features with strong demand and essential to the learning loop are P0. Features that deepen service but increase operational cost are P1. Complex social features, open marketplaces, and full application-management functions are P2.
- **Compliance cannot be postponed entirely:** The target users include minors, and Indonesia already has governance requirements for children’s use of electronic systems. The first version may simplify parent workflows but must retain basic age, consent, privacy, data-minimization, and safety design.

---

<a id="functional-requirements"></a>

# (I) Functional Requirements

<a id="accounts-identity"></a>

## 1. User Accounts and Identity Management

### 1.1 Registration and Login (P0)

> **Pilot delivery qualification:** The initial bounded pilot launched with Google sign-in. Production credential registration and login were subsequently delivered by `VS-002`, and credential recovery by `VS-003`.

> **PX-002 prototype qualification:** PX-002 originally represented the email/password account-entry experience through deterministic frontend fixtures alongside production Google sign-in. Production credential registration and sign-in were subsequently delivered by `VS-002`, and credential recovery by `VS-003`. The prototype qualification no longer limits the production authentication methods currently available.

- **Independent student registration:** Students can register using at least email. Mobile-number or third-party login may be introduced gradually according to launch channels. Students enter the platform after verification. Intent: reduce initial friction while avoiding excessive authentication integrations in the first version.
- **Parent registration:** Parents can register independent parent accounts and later create or link a student. Intent: support parents as decision-makers and payers.
- **Tutor accounts:** Tutors can submit application information; accounts can accept bookings only after Admin approval. Intent: control teaching-service quality.
- **Admin login:** Admin accounts are created internally and are not open to public registration. Intent: protect back-office access.
- **Login and logout:** Users can securely log in, log out, and view the current session state. Intent: keep multi-device usage clear and controlled.
- **Password recovery:** Users can reset passwords through a verified email address or mobile number. Intent: reduce account loss and customer-service costs.

### 1.2 Profile Management (P0)

- **Student profile:** Name or nickname, birth year, current grade, city, preferred language, target exam date, and related information.
- **Parent profile:** Name, contact details, relationship to the student, and notification preferences.
- **Tutor profile:** Name, profile image, subjects, languages, education, introduction, bookable status, and approval status.
- **Profile changes:** Users may edit unrestricted fields; important contact details must be reverified after change.
- **Account deletion:** Users can request account deletion. The platform explains the consequences for entitlements, linked relationships, and data processing before completion.

### 1.3 Roles and Permissions (P0)

- Each role can access only functions and data related to its responsibilities.
- The same natural person may have parent and payer capabilities, but student-learning records and parent profiles remain separate.
- The pilot has one Admin account with all delivered admin features. Separate Admin permissions are only needed when more administrators are introduced; the front end still exposes only the four primary roles.

### 1.4 Learning and Language Preferences (P0)

- **Default explanation language:** Students can choose any currently supported explanation language in Settings. Launch support must include at least Bahasa Indonesia, English, and Simplified Chinese. Intent: allow students to understand concepts in the language most familiar to them rather than forcing Bahasa Indonesia as the only explanation language.
- **Separation of explanation and exam language:** Changing the default explanation language affects course explanations, AI answers, supplementary solutions, and terminology definitions only. It does not automatically change the student’s exam subjects or question language.
- **Temporary language switching:** Students may temporarily switch the explanation language within a single course or agent session. After the session ends, the system returns to the language configured in Settings.
- **Exam language:** Each subject separately records its exam language, such as Mathematics (English) or Mathematics (Chinese). The language is prefilled from goal information and subject matching, and may be changed after confirmation.
- **Preference changes:** Existing scores, mastery, and learning records remain intact after changing the explanation language. When the exam language changes, the system warns that the question bank, terminology tasks, diagnostic requirements, and study plan may change.

<a id="parent-student"></a>

## 2. Parent–Student Relationship Management

### 2.1 Parent Creates a Student Account (P0)

- A parent can create a student account using the minimum required information.
- The system sends the student a first-login or activation method.
- On first login, the student confirms personal information and applicable terms.
- After creation, the parent receives default access to the student’s learning summary and payment-management functions.

### 2.2 Student Invites a Parent to Link (P0)

- A student can invite a parent through a link, invitation code, or contact information.
- Before acceptance, the system clearly shows which data the parent can and cannot access.
- After linkage, the parent can view progress summaries, purchase entitlements, and receive reminders.

### 2.3 Relationship Management (P0)

- In the first version, one student is linked by default to one primary parent; multiple-parent linkage is a later extension.
- The first version prioritizes a complete one-parent-to-one-student loop; management of multiple students such as siblings is a later extension.
- Both student and parent may initiate unlinking. Cases involving minors or incomplete orders are handled according to platform rules.
- Parents cannot view full private conversations between the student and the agent by default. They may view learning outcomes, risks, and tutor-session summaries.

<a id="goals-diagnostics"></a>

## 3. Learning Goals, Subject Matching, and Diagnostic Assessment

### 3.1 Academic Goals and Required Profile Information (P0)

- Students may record a target exam date, weekly availability, preferred study days, target universities, majors, scholarship context, and intended language of instruction.
- The goal profile is required for sourced subject matching, feasibility assessment, and study-plan orchestration, but it does not gate direct preparation for a supported subject/exam-language track.
- Students may mark university or major choices as undecided and continue with a clearly labelled provisional preparation path.
- One current primary target is used for the first complete matching and planning flow; additional targets may remain comparison inputs.
- Later goal changes retain historical learning evidence and mark affected recommendations or plans for recalculation.

### 3.2 Automatic CSCA Subject Matching and Prefill (P0)

- The platform recommends likely CSCA subjects and exam languages from the student's target information and verified university, major, scholarship, or programme requirements.
- Every recommendation is an evidence-backed claim with authority, source locator, effective date, last verification date, applicability conditions, and a status such as verified, conflicting, provisional, or insufficient evidence.
- Where reliable requirements conflict or are incomplete, the platform shows alternatives and uncertainty rather than presenting one combination as certain.
- Target-university requirements remain authoritative for subject selection; YukCSCA recommendations do not replace official admission guidance.
- A student who already knows the required subject combination may bypass automatic matching and proceed to manual confirmation or direct preparation.

### 3.3 Manual Subject Adjustments (P0)

- Students can accept, remove, or add a supported subject/exam-language track before confirmation.
- When a manual change may not satisfy a selected target requirement, the platform shows the affected target, evidence source, and risk before confirmation.
- Mathematics (English) and Mathematics (Chinese) share canonical mathematical objectives while retaining distinct exam-language terminology, item variants, assistance rules, and mock forms.
- Removing a subject stops future subject-specific plan tasks but preserves historical lessons, attempts, reports, and remediation evidence.
- When verified target data changes, the platform shows added, retained, and potentially removed subject differences and requires confirmation before updating an active plan.

### 3.4 Baseline Diagnostic Assessment (P0)

- Students may complete a topic-based diagnostic for a confirmed subject and exam language; direct learning, practice, and mocks remain available without completing a diagnostic unless a product or entitlement explicitly requires it.
- English Mathematics and Chinese Mathematics use the shared canonical mathematical framework; Chinese Mathematics additionally measures terminology and question-stem comprehension.
- Diagnostic delivery uses the shared assessment-attempt model with a diagnostic purpose and a configured question set rather than a separate incompatible exam subsystem.
- An interrupted attempt can resume under the applicable attempt rules, and a final report is produced only after the minimum valid evidence threshold is met.
- Results show overall level, topic evidence, typical errors, language-comprehension evidence where applicable, evidence gaps, and a recommended starting point.
- Diagnostic completion may propose planning inputs, but it does not automatically activate or silently overwrite a study plan.

### 3.5 Study-Plan Feasibility Assessment (P0)

- When a student requests guided planning, the system compares the exam date, confirmed subjects, weekly availability, reviewed curriculum workload, diagnostic evidence, and available lesson/practice/mistake/mock evidence. Intent: avoid generating a formally complete but practically impossible plan.
- A feasibility classification is calculated only when workload estimates and learner evidence are sufficient; otherwise the system shows provisional or insufficient-evidence status and identifies what is missing.
- The result shows time remaining, weekly available time, estimated required time, current platform-curriculum progress, evidence basis, and risk level.
- Risk states include at least **on track, at risk, and high risk**, with explainable reasons.
- Where current effort is insufficient, the platform proposes actionable adjustments such as increasing study time, prioritising high-importance or high-risk objectives, reducing non-core tasks, or changing the target date.
- Changes to target date, availability, subject, exam language, curriculum release, or study intensity trigger recalculation without deleting historical evidence.
- A plan becomes active only after the student reviews the workload and confirms the current proposal. If the proposal has become stale, activation is rejected safely and a refreshed proposal is shown.
<a id="courses-materials"></a>

## 4. Courses and Learning Materials

### 4.1 Course Catalog and Launch Scope (P0)

- Courses are organized by exam subject, exam language, module, topic, and knowledge point.
- Each topic displays learning objectives, estimated time, prerequisites, completion status, and linked practice.
- The first iteration provides both **Mathematics (English)** and **Mathematics (Chinese)**. They share the same mathematical knowledge structure, formulas, difficulty, and mastery model, while providing terminology, examples, practice, and mock exams in the corresponding exam language.
- Physics, Chemistry, and Professional Chinese are introduced later according to market data and content readiness, using the same learning architecture rather than redesigning the complete workflow for each new subject.

### 4.2 Official Syllabus Source and YukCSCA Topic Mapping (P0)

- For every sold subject, the platform stores the official CSCA syllabus authority and version, an admin-maintained official source link or locator, the declared publication or effective date when the source provides one or an explicit Not Stated status, and the last checked date.
- The platform publishes YukCSCA-authored syllabus outline summaries in Bahasa Indonesia, English, and Simplified Chinese. They follow the official document's module/topic order and retain a source location, but do not reproduce or claim to be the official wording.
- The official source is presented as one compact, visually distinct source action with its authority, edition, and last checked date. The interface does not repeat long “see the official wording” notices for every topic.
- Syllabus outline summaries remain separate from YukCSCA-authored learning objectives, prerequisites, common-error categories, lessons, questions, and remediation content.
- A YukCSCA learning objective may map to one or more syllabus outline items. Each mapping keeps a short reason and the person who last reviewed it.
- The coverage page shows the selected official syllabus version, its localized outline summaries, mapped YukCSCA learning objectives, official-source action, and whether related lessons, practice, checkpoints, and mocks are available.
- Product coverage uses at least **Fully Covered, Partially Covered, In Development, and Not Covered**. A “full coverage” claim is calculated against one named official syllabus version, not against the number of topics YukCSCA has created.
- Personal learning status uses at least **Not Started, Learning, Review Due, Learned, and Stable Mastery** and is displayed separately from product coverage.
- Students can open the related lesson, practice, mistake review, terminology, or remediation content from a syllabus outline item or learning objective.
- Personal progress is updated from checkpoints, practice, rechecks, and mocks; opening a page or watching a video alone does not prove mastery.
- When the official syllabus changes, the platform keeps the old and new source records, shows changed outline summaries and affected mappings, and leaves historical attempts and reports unchanged.

### 4.3 Focused Learning-Unit Content (P0)

- A focused learning unit targets one assessable platform learning objective and may use structured text, formulas, diagrams, worked examples, terminology cards, short video, interactive blocks, or a reviewed combination.
- Video is optional and must not block publication when an accessible, academically complete alternative exists.
- Content variants use the student's explanation language where available while retaining canonical formulas, definitions, objective identity, and exam-language terminology.
- Missing explanation-language or exam-language variants are explicit; the system must not silently substitute a different exam language.
- Video or audio variants provide captions/transcripts and low-bandwidth alternatives.
- Students can resume supported media or content position and mark completion, but completion alone does not establish mastery.

### 4.4 Explanation-Language and Exam-Language Bridging (P0)

- The platform manages **explanation language** and **exam language** separately. Explanation language is used for concept teaching, AI responses, and solution explanations. Exam language determines the default language of question stems, terminology, practice, and mock exams.
- Students can select a default explanation language in Settings and temporarily switch it within a learning session. The system must not assume that all students use Bahasa Indonesia.
- Mathematics (English) displays English questions and terminology by default; Mathematics (Chinese) displays Chinese questions and terminology by default.
- Key terminology uses the same internal term identifier and mathematical meaning across explanation languages to prevent conceptual drift between translations.
- Changing the explanation language does not change exam subjects. Changing the exam language causes the system to update terminology tasks, future questions, and diagnostic requirements for the selected language.

### 4.5 Chinese Mathematics Terminology Preview and In-Question Support (P0)

- Before a new topic, Chinese Mathematics courses teach required academic vocabulary, question instructions, and logical expressions, including Chinese characters, pinyin, definitions in the default explanation language, English equivalents, and mathematical meaning.
- During Chinese Mathematics study, course practice and scheduled questions display the original Chinese question by default and do not show a full translation automatically.
- In learning mode, students can click or select a word or phrase to view pinyin, a definition in the default explanation language, contextual meaning, related mathematical symbols, and a short example.
- The system provides increasing levels of language assistance: word definition, phrase definition, sentence-structure hint, and full meaning explanation. Every assistance level used is recorded.
- Terms clicked by the student, core course terminology, and language-related mistakes are added automatically to the terminology notebook and scheduled for later review based on performance.
- Translation and agent assistance are disabled by default during formal timed mock exams. Language-comprehension analysis is shown after submission.

### 4.6 In-Course Assessment (P0)

- Each lesson ends with a small number of comprehension or application questions.
- For Chinese Mathematics, assessment covers both mathematical knowledge and essential terminology or question-stem comprehension rather than only calculation.
- Passing updates the topic mastery state and advances the student to the next task.
- When the student does not pass, the system provides an explanation or prerequisite task based on whether the issue is knowledge, language, or prerequisite-related, followed by another assessment.

### 4.7 Learning-Material Actions (P1)

- Students can bookmark courses and questions and create personal notes.
- **The terminology notebook is a P0 capability for Chinese Mathematics:** It automatically collects core terms, clicked terms, and language-related mistakes, and records pinyin, definitions, linked knowledge points, recent review, and familiarity status.
- The platform may provide authorized handouts or online-readable materials with clearly stated download permissions.

<a id="practice-review"></a>

## 5. Question Practice and Mistake Review

### 5.1 Topic Practice (P0)

- Students can start practice without a study plan by subject, syllabus outline item, YukCSCA learning objective, difficulty, and exam language.
- Each practice set shows item count, expected time, assessment purpose, and the published question set used.
- Feedback may be immediate or after set submission according to the disclosed mode.
- Topic-practice evidence can later inform a diagnostic report or plan, but an active plan is not required to begin or complete the set.

### 5.2 Plan-Assigned Practice (P0)

- This capability requires an active study plan and reads the plan-assigned task, target objective, expected effort, and plan version.
- Assigned practice may combine new objectives, recent mistakes, remediation tasks, and spaced review according to confirmed priorities.
- Completion updates the assigned task and may propose later task changes through the plan-orchestration boundary.
- If the referenced plan version is stale, replaced, paused, or unavailable, the platform preserves submitted evidence and requests safe reconciliation instead of silently updating another plan.

### 5.3 Hints, Language Assistance, and Solutions (P0)

- Students can request tiered problem-solving hints instead of only revealing the answer.
- Chinese Mathematics learning mode also provides tiered language assistance. The system separately records whether the student used a mathematical hint or language support.
- After submission, the system displays the correct answer, key steps, common mistakes, language-misinterpretation points, and links to relevant courses.
- Correct answers obtained after strong hints or a full meaning explanation are not treated as independent mastery. The system reduces the contribution of that attempt to mastery and schedules a no-assistance reassessment.
- AI-generated supplementary explanations must be grounded in reviewed questions, solutions, and course materials, and should use the student’s default explanation language. Low-confidence responses provide an option for human review or feedback.

### 5.4 Mistake Notebook and Immediate Remediation (P0)

- Incorrect responses enter the mistake record with the attempt question copy, latest response, error count, related learning objective and syllabus outline items, assistance used, and an error cause such as a conceptual gap, prerequisite gap, terminology misunderstanding, carelessness, or time management.
- Students can add a private error explanation or note.
- The platform can offer and complete an immediate deterministic remediation action without an active study plan.
- Scheduling remediation into future dates or changing plan priorities requires the plan-orchestration capability and the applicable confirmation rules.
- A mistake is not permanently closed after one guessed or assisted correct answer; revalidation evidence determines whether stable mastery has improved.

### 5.5 Bookmarks and Challenge Practice (P1)

- Students can bookmark important questions and practice them again.
- Students may choose advanced challenge practice, but it cannot replace the normal study plan.

<a id="agentic-tutor"></a>

## 6. Agentic Tutor

### 6.1 Daily Task Entry Point (P0)

- The agent provides daily tasks based on the exam date, study plan, mastery, and recent learning behavior.
- Students can view why each task was assigned, its estimated time, and its completion criteria.
- If a student cannot complete the planned workload, the student can adjust available time for the day and the system reschedules incomplete tasks accordingly.

### 6.2 Guided Learning Sessions (P0)

- The agent can conduct a complete session using the loop “explain → ask → receive student answer → give feedback → practice → summarize.”
- The agent first asks or assesses understanding, then decides whether to continue, explain differently, or return to a prerequisite topic.
- Each session ends with a brief summary and an update to the study plan.

### 6.3 Contextual Questions and Answers (P0)

- Students can ask from a lesson, assessment item, mistake, terminology entry, remediation unit, or mock report without requiring an active study plan.
- The agent receives only the authorised current lesson, question, mistake, or mock context, the subject exam language, the current explanation language, and relevant recent learning evidence.
- Answers default to the student's explanation language while preserving the subject's English or Chinese exam terminology.
- Answers distinguish **reviewed-source answer**, **derived explanation**, and **insufficient evidence / human review required**; they must not imply that a model-generated explanation is official.
- The sources and exact lesson or question content used for the answer are traceable, and the student can report a disputed answer.

### 6.4 Plan Remediation and Reprioritization (P0)

- This capability requires an active study plan; follow-up recommendations may already exist from lessons, mistakes, diagnostics, or mocks without being added to a study plan.
- The system distinguishes minor deterministic ordering within confirmed priorities from a material change to subject weighting, workload, dates, or learning goals.
- Minor changes remain explainable and auditable. Material changes show the evidence, expected impact, and affected tasks and require student confirmation before becoming active.
- Reprioritization compares against an explicit plan version; stale or concurrently changed plans are not overwritten.
- The agent proposes or explains changes, but deterministic planning rules and confirmed product state remain authoritative.

### 6.5 Escalation to Human Tutoring (P1)

- Students can attach the current course, question, mistake, mock-exam report, or agent conversation as the context for a tutoring request.
- The agent recommends purchasing or using one-on-one tutoring entitlements when repeated explanations are ineffective, the content is disputed, or the student requests a tutor.
- After a student or parent submits a tutoring request, the platform displays “We will contact you and match a tutor” rather than showing a tutor list or creating a booking with a specific tutor immediately.
- An Admin contacts the student or parent through an external chat channel to confirm the issue, language, time, and other necessary details.
- After the tutor and time are confirmed, the Admin records the formal booking, assigned tutor, meeting, and service details in the platform.
- The assigned tutor receives an authorized learning brief, and tutoring outcomes, homework, and feedback are written back into the study plan.

<a id="mock-exams"></a>

## 7. Full Mock-Exam Lifecycle

### 7.1 Mock-Exam Selection (P0)

- Provide full timed mock exams, subject-level mocks, and stage assessments. Mathematics mocks are available in separate English and Chinese versions and default to the student’s confirmed exam language.
- Each mock exam clearly shows question count, time limit, language, applicable scope, and whether it contributes to the ability trend.
- Free users can experience at least one representative complete mock-exam workflow.

### 7.2 Exam Experience (P0)

- Support a timer, question navigation, marking for review, remaining-time reminders, and submission confirmation. Formal mock exams disable click-to-translate, full-question explanations, and AI problem solving by default.
- Responses are autosaved, and the exam can be recovered according to platform rules after a brief network interruption, page refresh, or device issue.
- The system submits automatically when time expires to prevent result loss.

### 7.3 Results and Analysis (P0)

- After submission, display score, accuracy, time spent, topic performance, incorrect questions, and time allocation.
- Reports distinguish actionable issues such as weak knowledge, calculation error or carelessness, terminology and question comprehension, translation dependency, reading speed, and time management.
- Students can open solutions, mistake review, or related courses directly from the report.

### 7.4 Post-Mock Recommendations, Study-Plan Update, and Recheck (P0)

- **7.4A — Follow-up recommendations:** After analysing a mock, the platform recommends the most useful next actions, such as reviewing a lesson, revisiting mistakes, practising terminology, completing targeted questions, or improving pacing. Students can start these actions even when they do not have an active study plan.
- Each recommendation shows the evidence and reason behind it and clearly indicates that it has not yet been added to a study plan.
- **7.4B — Add to study plan:** When an active study plan exists, the platform shows how the selected recommendations would affect workload and priorities. The student must confirm before the plan is updated.
- If the study plan has changed, been paused, or is unavailable, the recommendations remain accessible and no other plan is changed.
- After completing the follow-up work, the student may take a focused recheck or later mock. The platform compares the new evidence with the original result without replacing the original report.
<a id="motivation"></a>

## 8. Learning Motivation and Self-Management

### 8.1 Daily Goals and Learning Streaks (P0)

- Students set a daily learning goal or accept a system recommendation.
- Completing the goal records the learning streak and stage progress.
- After an interruption, the system provides a recovery task or a limited streak-repair mechanism so that one missed day does not cause complete abandonment.

### 8.2 Experience Points, Levels, and Badges (P1)

- Rewards are granted for meaningful learning actions such as completing effective study, reviewing mistakes, passing assessments, and improving mock-exam performance.
- The system does not reward only time online, repeated clicking, or unproductive question grinding.
- Each badge explains its requirements and does not imply a misleading academic ranking.

### 8.3 Weekly Review (P0)

- Each week, students see completed content, personal syllabus progress, mastery changes, plan completion, changes in plan feasibility, and priorities for the next week.
- Students can select reasons for learning difficulties, and the system adjusts intensity or recommends support accordingly.

### 8.4 Leaderboards and Social Motivation (P2)

- Leaderboard participation is optional and uses nicknames.
- Rankings prioritize consistency or improvement rather than shaming lower-foundation students through absolute scores.
- Leaderboards are not treated as a core retention mechanism in the first version.

<a id="tutoring"></a>

## 9. Platform-Managed One-on-One Tutoring

### 9.1 Service Product and Request Submission (P1)

- One-on-one tutoring is sold as a single session, tutoring-hour package, or tutoring entitlement within a subscription, not as a public time slot for a named tutor.
- Before purchase, the student or parent provides the student, tutoring subject, exam language, preferred explanation language, issue description, acceptable dates and time ranges, contact details, and preferred contact channel.
- The student can attach a course, question, mistake, mock-exam report, or agent conversation as learning context.
- The student confirms whether the tutor eventually assigned may access a learning brief required for the lesson.
- The product page clearly explains that the platform will contact the user and manually match a tutor after payment; purchase does not mean that a specific tutor and lesson time are already confirmed.

### 9.2 Post-Payment Status and Contact Commitment (P1)

- After successful payment or tutoring-hour deduction, the system creates a Tutoring Request rather than a formal booking tied to a specific tutor.
- The student and parent can view the order, purchased hours, request details, processing state, expected contact time, contact channel, and cancellation or refund entry point.
- The initial status is Paid — Awaiting Platform Contact.
- Product and order pages explain the expected contact window, matching process, time-confirmation process, and handling when no match can be made.
- If the platform cannot provide an appropriate tutor or acceptable time within the stated commitment, the user can continue waiting, change requirements, retain the tutoring-hour balance, or request a refund according to policy.

### 9.3 Manual Contact and Requirement Confirmation (P1)

- An Admin contacts the student or parent through WhatsApp, phone, email, or another consented external chat channel.
- The Admin confirms the tutoring objective, student issue, exam language, explanation language, availability, time zone, and other necessary details.
- The full external conversation does not need to be copied into the platform, but the Admin records the contact time, channel, contact person, confirmation outcome, and necessary notes.
- When the user changes timing, language, or tutoring goals, the Admin updates the tutoring request in the system.
- The platform tells users that external communication is used for confirmation and that the final information displayed in YukCSCA is the formal booking record.

### 9.4 Internal Tutor Pool Management (P1)

- The complete tutor list is visible mainly to authorized Admins and is not exposed to students or parents for public browsing, filtering, price comparison, or self-service selection.
- Internal tutor records include at least identity and approval status, subjects, exam languages, explanation languages, specialist knowledge points, teaching experience, availability, time zone, internal price or settlement rules, current workload, ratings, complaints, and service status.
- Tutors may submit or update profile and availability information; Admins review and update the formal internal record.
- Tutor states include at least Available for Assignment, Temporarily Unavailable, Suspended, and Deactivated.
- Admins can view assigned lessons and current student load to prevent over-allocation and scheduling conflicts.

### 9.5 Manual Tutor Matching by Admin (P1)

- Admins choose an appropriate tutor using subject, exam language, explanation language, student issue, acceptable time, tutor expertise, service status, and current workload.
- The matching process can record candidate tutors, contact outcomes, rejection reasons, and the final selection.
- Students and parents do not see candidate tutor lists before matching is complete.
- When no tutor fully satisfies the requirements, the Admin contacts the user to confirm whether another time, language, or tutor arrangement is acceptable.
- The final match must be confirmed by an authorized Admin, with matching time and operator recorded.

### 9.6 Time Confirmation and Formal Booking Creation (P1)

- After separately confirming availability with the tutor and the student or parent, the Admin records the final lesson time, duration, time zone, and assigned tutor.
- The student or parent sees Awaiting Time Confirmation. After confirmation, the tutoring request becomes a formal booking.
- The formal booking displays at least the assigned tutor’s display name, short introduction, supported subject and languages, tutoring topic, lesson time, duration, and booking state.
- Students and parents see only the tutor assigned to the booking and do not see the complete internal tutor record, internal pricing, or other tutor lists.
- If the user considers the assigned tutor unsuitable, the user can request a tutor replacement for Admin handling; no self-service tutor reselection is provided.
- The system prevents the same tutor from being assigned to overlapping lessons.

### 9.7 Tutoring Status Management (P1)

- Internal states include at least Pending Payment, Paid — Awaiting Contact, Contacted, Matching in Progress, Awaiting User Time Confirmation, Tutor Assigned, Booking Confirmed, Meeting Information Published, Awaiting Class, Awaiting Post-Class Summary, Awaiting Homework, Completed, Cancelled, Refund Pending, and Refunded.
- Student and parent views may simplify these to Awaiting Platform Contact, Tutor Matching in Progress, Awaiting Time Confirmation, Booking Confirmed, Awaiting Class, Post-Class Tasks in Progress, Completed, Cancelled, or Refunded.
- Every state change records the operator, timestamp, and necessary reason.
- Important state changes are sent through in-platform notifications, email, or a consented external channel.

### 9.8 Cancellation, Rescheduling, and Tutor Replacement (P1)

- Students, parents, tutors, or Admins can initiate rescheduling, cancellation, or tutor replacement within policy.
- The system clearly displays the refunded amount, returned tutoring hours, rematching outcome, or applicable penalty.
- When a tutor cancels at short notice, the Admin prioritizes rescheduling, a replacement tutor, or a refund.
- After tutor replacement or rescheduling, the Admin updates the formal booking, meeting access, homework deadlines, and reminders.
- Every manual action records the reason and outcome.

### 9.9 External Online-Meeting Information (P1)

- YukCSCA does not provide audio or video calling directly.
- The tutor can publish the external meeting provider, meeting link, meeting ID, required password, and joining instructions within the formal booking. An Admin can also enter the information supplied by the tutor.
- The first version supports manually entered links for Google Meet, Zoom, Microsoft Teams, Tencent Meeting, or another permitted service and does not require automatic meeting creation.
- Meeting information is visible only to the booked student, tutor, authorized parent, and necessary Admins and must not be displayed publicly.
- After an Admin or tutor updates meeting information, the platform notifies the student and parent.
- The booking page displays the lesson time, tutor time zone, student local time zone, device reminders, and a Join Meeting action.
- After cancellation or refund, the student no longer sees an active meeting entry point.
- The platform does not record external lessons by default. Any recording requires separate, explicit consent.

### 9.10 Pre-Class Learning Brief (P1)

- With student authorization, the assigned tutor can view the target subject, exam language, default explanation language, recent plan, relevant mastery, mistakes, hint usage, and mock-exam performance needed for the current session.
- For Chinese Mathematics, the brief may also show terminology, question-comprehension, and translation-dependency issues relevant to the lesson.
- The brief contains only information necessary for the current lesson and does not expose unrelated complete agent conversations, private notes, orders, or other tutors’ session content.
- Before class, the student can add text notes or a PDF reference file.

### 9.11 Publishing Lesson Materials (P1)

- The assigned tutor can publish pre-class, in-class, or post-class materials within the booking. An Admin can enter tutor-supplied content when the tutor cannot use the system.
- Lesson materials support platform text and PDF files; the first version does not require other file formats.
- Each item records a title, description, linked knowledge point, intended stage, actual content provider, system operator, and publication time.
- Materials are visible only to the related student, tutor, and necessary Admins. Parents see that materials exist but do not automatically access the full content.
- The system records the PDF version and related booking.
- Students are notified when important materials are added or updated.
- Tutoring materials do not automatically enter the formal course library. Public reuse requires separate content review.

### 9.12 Attendance and Session Status (P1)

- After the class begins, the student and tutor can separately record attendance. An Admin can also record a state based on manual confirmation.
- Session states include at least Both Attended, Student No-Show, Tutor No-Show, Technical Issue, Incomplete, and Completed.
- When records conflict, the booking enters a review state.
- After class, the tutor confirms the actual lesson-completion status. Admins can review booking records, external-contact summaries, and both parties’ explanations during a dispute.
- Automatic attendance data from external meeting providers is not required for the first version.

### 9.13 Post-Class Summary (P1)

- The tutor submits lesson content, resolved issues, student performance, remaining weaknesses, language-comprehension issues, follow-up recommendations, and lesson-completion status.
- When the tutor cannot use the system, an Admin can enter tutor-supplied information, with the actual provider and system operator recorded separately.
- The student can view the complete post-class summary. Parents see a summary and recommended actions by default.
- A post-class summary becomes new teaching evidence in the student’s learning record but does not overwrite system diagnostics or formal mock-exam scores.
- The agent uses tutor conclusions to adjust later explanations, review tasks, or tutoring recommendations.

### 9.14 Tutor-Published Homework (P1)

- The tutor can create homework before, during, or after a lesson. An Admin may enter homework supplied by the tutor.
- Homework includes at least a title, text instructions, linked knowledge points, publication time, due date, and submission requirements.
- The tutor may attach a PDF homework file. The first version does not require images, videos, or other document formats.
- The system records the actual homework provider and the system operator.
- The tutor or Admin can specify whether late submission and resubmission are allowed and whether the homework enters the student’s study plan.
- Post-class homework enters the student’s task list and study plan by default.
- Students and parents can view the due date and homework status. Parents do not see the student’s complete submission by default.

### 9.15 Student Homework Submission (P1)

- Students can submit a text answer, one or more PDF files, or both text and PDF.
- The interface displays PDF names, upload status, and submission time.
- Students can add a text note, such as identifying a question they could not solve or a step they want the tutor to review.
- When resubmission is allowed, the student can submit a new version. Historical versions are retained and the current active version is clearly identified.
- A submission after the deadline is marked Late. Whether it remains accepted is determined by the tutor or Admin setting.
- Failed uploads can be retried without losing PDFs already uploaded successfully.
- Students can view and edit only their own homework submissions.

### 9.16 Tutor Review, Feedback, and Resubmission (P1)

- The tutor can review the student’s submitted text and PDFs. An Admin must not make an academic judgment on the tutor’s behalf but may enter formal feedback supplied by the tutor.
- Feedback supports text and a PDF containing annotations or reference material.
- The system records the actual feedback provider and the system operator.
- Feedback states include at least Awaiting Review, Reviewed, Revision Required, and Completed.
- By knowledge point, the tutor can mark Mastered, Partially Mastered, Remediation Needed, or Further Tutoring Recommended.
- The tutor can request resubmission and provide revision instructions.
- After a new version is submitted, the tutor can compare the historical and current versions.
- The student is notified when feedback is published or resubmission is requested.
- Parents see homework status and a feedback summary by default, not the complete submission files or line-by-line feedback.

### 9.17 Writing Homework Outcomes Back into the Study Plan (P1)

- Knowledge points marked as not mastered or requiring remediation are added to the student’s later remediation tasks.
- Courses requiring relearning, homework requiring revision, and tutor-recommended practice enter the student’s task list.
- Homework outcomes can serve as supporting evidence for mastery but cannot directly replace formal diagnostics, in-course assessments, or mock exams.
- The agent adjusts explanation methods, practice volume, and review timing using tutor feedback and explains which tasks were added because of tutor feedback.
- Tutors can view later completion status for homework they are responsible for but do not gain continuous access to unrelated learning data.

### 9.18 Booking Messages and External-Chat Boundary (P1)

- The platform may provide a simple text message area for coordination within a formal booking.
- Manual contact and matching may use external channels such as WhatsApp, but the final tutor, time, meeting, materials, homework, feedback, and state must be recorded in the platform.
- Platform messages do not support open friend requests, group chat, or private messaging with unassigned tutors.
- Important actions such as meeting links, cancellation, rescheduling, and homework submission must use structured platform functions rather than relying only on chat.
- Platform messages retain the sender and timestamp. The platform Admin can access only the information necessary to handle a complaint; later multi-admin access must be scoped before use.

### 9.19 Rating, Disputes, and Settlement (P1)

- Students can rate the assigned tutor and report an issue after the lesson.
- Admins can handle disputes involving matching, absence, technical failure, lesson materials, homework feedback, cancellation, refund, or other service issues.
- Tutoring-hour completion, homework-flow status, and tutor-settlement status remain traceable.
- Tutor settlement is based only on sessions that meet platform completion requirements and is not triggered merely by matching a tutor or publishing a meeting link.
- Dispute handling can reference the formal booking record, external-contact summary, meeting-publication time, attendance, materials, homework, and feedback records.

<a id="parent-support"></a>

## 10. Parent Support

### 10.1 Learning Overview (P0)

- Parents can view the linked student’s weekly study time, task completion, personal syllabus progress, plan feasibility, topic progress, and recent mock-exam trend.
- Information is presented primarily as summaries and actionable recommendations; parents are not expected to understand every question-level detail.

### 10.2 Weekly Reports and Risk Alerts (P0)

- The platform generates a weekly learning report and sends it according to the parent’s notification preferences.
- Risk alerts are issued when the student has not studied for an extended period, is materially behind plan, or is approaching the exam date.
- Alerts offer actionable choices such as sending encouragement, adjusting the plan, purchasing tutoring, or temporarily dismissing the reminder.

### 10.3 Payment and Tutoring Management (P0/P1)

- Parents can view the student’s current entitlements, expiration dates, and usage.
- Parents can purchase subscriptions, courses, or platform-managed one-on-one tutoring for a specified student and submit needs, availability, and contact details.
- Parents can view orders they paid for, receipts, refunds, manual-contact status, tutor matching, time confirmation, booking status, and post-class service status.

### 10.4 Privacy Boundaries (P0)

- Parents can view learning data and tutor-session summaries by default, but not complete agent conversations or private notes.
- Students and parents see a clear permission explanation when establishing the relationship link.
- More detailed permissions may be added later, but the first version remains simple, transparent, and limited to necessary access.

<a id="payments"></a>

## 11. Free Trial, Subscriptions, and Local Payments

### 11.1 Free Trial (P0)

- Unregistered users can browse product information and a limited amount of public content.
- Registered students can experience at least one complete “learn → practice → feedback” flow and one representative mock-exam workflow.
- The trial page clearly displays available benefits, remaining uses, or the remaining trial period and does not use misleading scarcity or unclear restrictions.

### 11.2 Products and Entitlements (P0)

- Self-study products are primarily sold by **subject and exam language**, such as a Mathematics (English) Plan and a Mathematics (Chinese) Plan, with monthly or fixed-duration purchase options.
- Support single-session one-on-one tutoring and packages of tutoring hours. Tutoring products are sold by service and hours; students and parents do not select a tutor from a public list.
- Product details clearly display the exam subject, exam language, included course modules, official syllabus coverage, practice questions, terminology training, AI usage allowance, number of mock exams, tutoring entitlements, and validity period.
- Each product page provides access to the corresponding official syllabus comparison and displays the official source link, current coverage status, and modules not yet covered.
- Products that do not fully cover the official syllabus must clearly state their actual scope and cannot use names or claims that could make users assume full coverage.
- When students purchase multiple subjects, entitlements, validity periods, and learning records are displayed and managed separately for each subject.
- Self-study entitlements are automatically assigned to the selected student after successful payment. A tutoring payment creates a request awaiting manual contact and matching rather than a booking with a specific tutor.

### 11.3 Indonesian Local Payment Methods (P0)

- **Recommended launch methods:** QRIS, bank Virtual Accounts, GoPay, ShopeePay, and payment cards.
- Virtual Accounts should prioritize commonly used banks such as BCA, BRI, BNI, Mandiri, and Permata.
- A parent can act as the payer while assigning the purchased entitlement to a linked student.
- The payment page displays the amount, product, recipient student, validity period, payment deadline, and order status.

### 11.4 Automatic and Manual Renewal (P0/P1)

- The first version must support one-time payment and expiration reminders.
- Automatic renewal is offered only when supported by the payment channel and explicitly authorized by the user, with the next charge date and cancellation method clearly displayed.
- When QRIS or a Virtual Account does not support automatic renewal, the system sends a new payment link or QR code and must not describe the manual payment as automatic renewal.

### 11.5 Orders, Receipts, and Refunds (P0)

- Users can view Pending Payment, Paid, Cancelled, Refunded, and Payment Failed orders.
- Payment status is determined by the payment-gateway callback, and the platform prevents duplicate entitlement issuance.
- Users can request a refund under applicable rules or report duplicate payment; Admins record the reason and resolution.

### 11.6 Future Payment Expansion (P1)

- Add OVO, DANA, Indomaret, Alfamart, and other methods according to conversion data.
- PayLater is not a launch-priority method for a product primarily serving high school students.

<a id="study-in-china"></a>

## 12. Study in China Platform Expansion

### 12.1 University and Major Information (P1)

- Students can search Chinese universities, majors, languages of instruction, and basic application information.
- Each key requirement displays its source and last update date.
- Students can bookmark universities and create a target list.

### 12.2 CSCA Requirement Matching (P1)

- The system displays required CSCA subjects and exam languages based on university, major, and language of instruction.
- When different universities require different combinations of Physics, Chemistry, or Professional Chinese, the system displays each combination separately.
- After a student changes the target list, the system checks whether the current study subjects still satisfy the selected requirements.

### 12.3 Application Timeline and Tasks (P1)

- Students can record application rounds, application deadlines, CSCA score-submission deadlines, and scholarship milestones.
- The system generates checkable tasks and sends reminders as deadlines approach.
- Completed and overdue items retain their status for student and parent review.

### 12.4 Document Checklist and Progress (P2)

- Support per-university tracking of passport, transcript, language score, personal statement, medical examination, police-clearance certificate, and other document statuses.
- The first version records status and reminders only and does not promise automated legal-validity assessment of documents.

### 12.5 Consultation and Later Preparation (P2)

- Students can book application consultation, language preparation, or pre-departure tutoring.
- After the CSCA exam, the learning account remains usable for Professional Chinese, HSK, academic terminology, and pre-enrollment courses.

<a id="notifications-support"></a>

## 13. Notifications and Customer Support

### 13.1 Learning Notifications (P0/P1)

- Support reminders for daily tasks, falling behind plan, mock exams, subscription expiration, tutoring-request receipt, manual contact, matching progress, time confirmation, tutor assignment, meeting-information updates, lesson-material publication, homework deadlines, homework submission, tutor feedback, and resubmission requests.
- P0 supports in-platform and email notifications. WhatsApp or other external channels are introduced in P1 according to user demand, template approval, and operating cost.
- Users can independently control notification channels and notification types.
- Nonessential marketing notifications require separate opt-in and can be disabled at any time.

### 13.2 Customer Service and Issue Reporting (P0)

- Users can submit issues related to accounts, payments, content, AI answers, and tutoring.
- Each issue creates a trackable record that supports additional information, replies, and closure.
- When an issue concerns an incorrect question or disputed AI response, the ticket is linked to the relevant course, question, or conversation context.

### 13.3 Announcements and Policy Updates (P1)

- Admins can publish exam, course, payment, and service announcements.
- Important rule changes must show an effective date and be communicated to affected users.

<a id="administration"></a>

## 14. Back-Office Administration

### 14.1 First Platform Admin (P0)

- The pilot has one platform admin account. The account is identified through deployment configuration and signs in through the same verified login flow as other users.
- Public admin registration is not allowed. The pilot does not need an admin invitation flow, an admin-account creation page, or a permission-management page.
- The first admin can use all admin features delivered in the pilot. Important admin actions record the admin account, time, result, and a reason when one is required.
- Before a second admin account is introduced, the platform must define the required roles and permissions.

### 14.2 User and Relationship Management (P0)

- Admins can search students, parents, tutors, and account status.
- Admins can handle suspension, restoration, account deletion, abnormal contact information, and parent–student relationship disputes.
- Admins must not arbitrarily alter student-learning outcomes or access unnecessary private content.

### 14.3 Internal Tutor Pool Management (P1)

- Tutor accounts and the complete tutor list are created, viewed, and maintained mainly in the Admin back office and are not publicly exposed to students or parents.
- Manage tutor identity and approval, subjects, exam languages, explanation languages, specialist knowledge points, teaching experience, availability, time zone, internal pricing or settlement rules, current workload, ratings, complaints, and service status.
- Tutors may submit profile and availability changes; Admins review and update the formal record.
- View assigned students, future lessons, tutoring hours, settlement, and incident records.
- Approve, reject, request additional evidence, suspend, restore, or deactivate tutors.
- Support internal filtering by subject, language, time, workload, and service status for manual matching.

### 14.4 Syllabus and Learning-Content Management (P0)

- The first platform admin manages the pilot's academic content.
- Official CSCA syllabus source records and localized YukCSCA outline summaries are stored separately from YukCSCA's learning objectives, prerequisites, common mistakes, terminology, lessons, questions, explanations, and remediation content.
- Content uses stable IDs and reusable fields so the same data can later be used by the web app, a mobile app, or another YukCSCA client. Frontend routes, page layout, and temporary interface state are not stored as academic content.
- Content has three simple states: Draft, Published, and Archived. The admin can create and edit content directly. A basic CSV or JSON import may be added when it clearly saves time, but it is not required for the first release.
- Before publication, the platform checks required links, supported languages, formulas or files, question answers and scoring, and source or permission information. Invalid content remains in Draft, while existing Published content stays available.
- When published content is corrected, completed attempts and reports continue to use the exact content that was shown at the time.

### 14.5 Question and Mock-Paper Management (P0)

- A question records its subject, exam language, question text, answer choices when needed, correct answer or scoring rule, explanation, difficulty, related syllabus outline items or learning objectives, and publication status.
- The admin can create, edit, publish, and archive questions. Draft questions can be changed freely.
- The admin creates a diagnostic, practice set, checkpoint, or mock paper by setting its purpose, subject, exam language, duration, scoring, visibility, and the published questions it contains.
- When a student starts an attempt, the platform saves the exact question text, choices, answer, and scoring information used for that attempt. Correct answers, scoring keys, and solutions remain server-side and are not exposed to the client before the allowed submission or feedback point. Later question edits do not change completed attempts or their scores.
- Before publication, the platform checks that every selected question is published and compatible with the assessment. A published set or mock paper may later be archived or replaced without affecting past attempts.

### 14.6 Content Source and Rights Records (P0)

- Each official syllabus source, paid lesson, question, explanation, remediation asset, and media asset records the relevant author/provider, source locator or internal authorship, source type, permission or licence basis, and review state.
- Source types include at least platform original, commissioned, licensed, open licence, factual reference, and user upload.
- Content that lacks the required source or permission evidence cannot be published.
- Official websites may support factual claims about exam structure, dates, policies, and syllabi, but their pages, databases, or protected questions must not be copied beyond the permitted use.
- Advanced rights-expiry automation, territory/audience matrices, package-level rights rollups, and dedicated rights-review roles are later-stage capabilities.

### 14.7 Order, Payment, and Refund Management (P0)

- Search orders by payment channel, payer, entitlement-recipient student, and payment status.
- Handle payment exceptions, duplicate payments, manual refunds, and entitlement adjustments.
- Every manual adjustment requires a reason and an audit record.

### 14.8 Tutoring Requests, Manual Matching, and Teaching Workflow Management (P1)

- Provide a tutoring-request list showing payer, student, subject, exam language, explanation language, issue, learning context, available times, contact information, payment state, assigned operator, contact state, matching state, and overdue risk.
- Record external contact time, channel, contact person, confirmation outcome, and necessary notes.
- Review candidate tutors from the internal pool and record contact outcomes, rejection reasons, and the final match.
- Enter the assigned tutor, final time, time zone, session duration, and user confirmation, then create the formal booking.
- View and update request, matching, booking, meeting, attendance, cancellation, rescheduling, tutor replacement, completion, rating, dispute, and refund states.
- Enter or update the external meeting provider, link, meeting ID, password, and instructions.
- Review tutor-published or Admin-entered text/PDF materials, homework, student text/PDF submissions, tutor feedback, and resubmission status.
- When entering tutor materials, post-class summaries, homework, or feedback, record the actual content provider, system operator, entry time, and reason for proxy entry separately.
- Admins must not make an unconfirmed academic judgment on the tutor’s behalf.
- Restrict access and open an investigation for suspected infringement, malicious files, invalid meeting links, or rule violations.
- When no tutor can be matched within the promised window, process continued waiting, changed requirements, retained tutoring balance, or refund.
- Every manual adjustment, file restriction, refund, matching action, and dispute outcome records the operator, timestamp, reason, and result.
- Tutor settlement is based only on sessions meeting completion conditions and remains consistent with formal booking completion.

### 14.9 AI and Content Quality Management (P0)

- View user-flagged incorrect answers, low-confidence responses, and frequently disputed content.
- Review AI accuracy and complaints by explanation language, exam language, subject, and knowledge point, avoiding evaluation in only one language.
- Admins or academic reviewers can correct reference content, terminology definitions, and language content; the platform records what changed and when.
- AI answering can be temporarily disabled or routed to human handling for high-risk or repeatedly incorrect content.

### 14.10 Operating Analytics (P0)

- View registration, target-profile completion, subject confirmation, diagnostic completion, plan-feasibility status, first learning-loop completion, personal syllabus progress, active usage, mock exams, trial-to-paid conversion, tutoring requests, contact timeliness, matching time, match success rate, time-confirmation rate, lesson-completion rate, homework-completion rate, renewal, and refund metrics.
- View usage and issue data by official syllabus module, course, question, and tutor.
- Analytics are used to improve the product and teaching and must not be used to promise unvalidated score improvement publicly.

---

<a id="non-functional-requirements"></a>

# (II) Non-Functional Requirements

<a id="performance"></a>

## 1. Performance

- Under normal mobile-network conditions, the 75th-percentile time to first interaction for primary pages should not exceed 3 seconds. Large videos and reports may load progressively.
- The 95th-percentile response time for ordinary back-end business APIs should not exceed 2 seconds. AI, payment, video-conferencing, messaging, and other third-party calls are monitored separately.
- The agent should display a request-received state within approximately 1 second. The 95th-percentile time to the first meaningful segment of a normal answer should not exceed 8 seconds. Longer tasks display progress.
- Answering, navigating between questions, and saving during mock exams must not be visibly blocked by analytics or recommendation workloads.

<a id="availability-reliability"></a>

## 2. Availability and Reliability

- The first-stage monthly availability target is at least 99.5%. Planned maintenance is announced in advance.
- Mock-exam answers are autosaved and can be restored according to platform rules after a brief network interruption, page refresh, or device issue.
- Payment callbacks, entitlement issuance, and refund processing use idempotency or equivalent duplicate-prevention mechanisms.
- Critical learning records, orders, external-contact summaries, tutor matching, formal bookings, meeting materials, tutoring-session records, homework text, PDF submissions, feedback, and version history are backed up regularly, with recovery procedures tested.
- Homework text drafts can be autosaved. Failed PDF uploads can be retried, and successfully uploaded files and historical versions must not be lost.

<a id="security-access"></a>

## 3. Security and Access Control

- All platform traffic uses encrypted transport, and passwords are stored using secure password hashing.
- Product roles follow the principle of least privilege. The first Admin account is the only admin identity in the pilot; separate Admin permissions must be defined before additional administrators are added.
- Critical back-office actions, refunds, content publication, relationship changes, and tutor-status changes retain audit logs.
- The platform does not store full bank-card information directly. Sensitive payment information is handled by compliant payment providers.
- Controls and alerts are established for abnormal login activity, brute-force attempts, bulk scraping, and content theft.
- External meeting links, lesson PDFs, homework PDFs, and feedback PDFs require identity and formal-booking authorization and must not use permanent public-access links.
- PDF uploads enforce file-type and file-size limits and undergo basic malicious-file checks before access is allowed.
- Only the first platform Admin can view the full internal tutor pool, internal pricing, workload, candidate matches, and external-contact records during the pilot. Access rules must be defined before additional administrators are added.

<a id="privacy-minors"></a>

## 4. Privacy and Protection of Minors

- The platform collects only the minimum information needed for learning, payment, and tutoring.
- Birth year, contact information, parent relationships, classroom records, and learning conversations have explicit purposes and access permissions.
- Minor users receive clear guardian-consent and privacy notices where required. The first version does not force every student to link a parent.
- Parents can view learning summaries by default, but not complete private conversations or personal notes.
- Parents can view the tutoring-request state, manual-contact state, assigned tutor, formal booking, meeting-information status, homework-completion status, and a feedback summary by default, but not the internal tutor pool, candidate tutors, the student’s complete homework text, PDF submissions, or line-by-line review.
- External contact details, meeting access, tutoring materials, homework, student submissions, and tutor feedback are available only to related service participants and necessary Admins.
- Users can request access, correction, export, or deletion of data that the platform can lawfully process.

<a id="ai-quality-safety"></a>

## 5. AI Academic Quality and Safety

- AI answers are grounded first in platform-reviewed courses, questions, and explanations and must not present model guesses as official rules.
- University requirements, exam policies, and registration information display sources and update dates.
- The AI can express uncertainty and provides routes for user feedback or tutor escalation.
- Regular evaluation covers different explanation languages, Mathematics in English, Mathematics in Chinese, and cross-language terminology scenarios. It tracks accuracy, terminology consistency, citation completeness, teaching steps, and appropriate refusal behavior.
- The AI must not provide answers during formal timed mock exams. Learning mode and exam mode are clearly separated.

<a id="copyright-traceability"></a>

## 6. Content Copyright and Source Traceability

- The platform publishes only original, commissioned, licensed, open-licence, or lawfully referenced content.
- Official sites may be cited as factual sources for exam structure, dates, policies, and syllabi, but their pages, databases, and protected questions must not be copied without permission.
- Paid learning content, official syllabus sources, questions, explanations, remediation content, and assets remain traceable to their author/provider, source, permission basis, and review state.
- Replacing a lesson, question, translation, or media asset does not automatically transfer the prior source or permission evidence to the replacement.
- User-uploaded content requires upload authority and supports timely restriction, takedown, and investigation.
- Tutor or admin-entered teaching materials retain the actual provider, system recorder, permitted audience, and reuse boundary.
- Student submissions are used only for authorised teaching, feedback, dispute handling, and learning-state updates and are not republished as commercial content without explicit lawful permission.

<a id="localization-accessibility"></a>

## 7. Localization, Language Consistency, Usability, and Accessibility

- Students can configure a default explanation language. Explanation language, interface language, and exam language are independent settings and must not silently override one another.
- Launch support includes at least Bahasa Indonesia, English, and Simplified Chinese as explanation languages. Formulas, definitions, and key-term meanings remain consistent across explanation-language versions of the same knowledge point.
- Mathematics (English) and Mathematics (Chinese) preserve the correct exam language in question stems, explanations, terminology, and mock exams. Chinese content supports accurate word segmentation, pinyin display, and word or phrase selection.
- Critical actions are usable on mobile devices. Full mock exams are also optimized for desktop use.
- Videos provide selectable subtitles or transcripts, and images and diagrams include necessary textual descriptions.
- Formulas, Chinese characters, pinyin, and special symbols render correctly on mainstream devices.
- Low-bandwidth users receive clear loading states and text-based alternatives.
- Tutoring-request pages clearly display the expected contact time, current state, and contact channel. Formal booking pages clearly display the tutor time zone and student-local time zone.
- Meeting access, lesson materials, homework, submission status, and feedback must be usable on mobile devices.
- Homework text input supports draft saving. PDF upload displays file name, size, progress, success or failure state, and a retry action.

<a id="financial-consistency"></a>

## 8. Payment and Financial Consistency

- Platform orders, payment-gateway results, student entitlements, and refund records remain reconcilable.
- The system handles payment expiration, failure, duplicate callbacks, and the user closing the page before completion.
- Amounts, taxes or fees, validity periods, automatic-renewal status, and refund rules are clearly displayed before payment.
- The platform can generate a receipt for each order and retains required financial records.

<a id="maintainability-updates"></a>

## 9. Maintainability and Content Updates

- Courses, official syllabus versions, learning objectives, topic mappings, terminology, lessons, questions, remediation content, university requirements, tutoring operations, and notifications can be updated through the admin dashboard without republishing every client.
- Academic content uses stable IDs and reusable fields so the same source can serve multiple YukCSCA clients or future platforms.
- The pilot uses simple Draft, Published, and Archived states. Each attempt stores the question and scoring data that the student received so later edits do not change historical attempts, reports, mastery evidence, or plan decisions.
- Official requirements and syllabus sources show authority, version/effective date, source locator, last verification date, and review-due status.
- Changes to the official syllabus remain distinguishable from changes to YukCSCA-authored learning content.
- Basic structured import or export may be added later when it reduces manual work; it is not required for the first release.

<a id="observability-operations"></a>

## 10. Observability and Operations

- Record key events including registration, goal-profile completion, system subject prefilling, manual subject adjustment, explanation-language settings, word selection and tiered language assistance, diagnostics, plan-feasibility assessment and adjustment, syllabus-map viewing, learning sessions, practice, mock exams, tutoring-request submission, payment, manual contact, matching, time confirmation, tutor assignment, meeting publication and updates, lesson-material publication, homework creation, text or PDF submission, tutor feedback, resubmission, lesson completion, refunds, and settlement.
- Establish alerts for service errors, payment exceptions, high AI error rates, and exam-season traffic anomalies.
- Operating analytics avoid directly exposing private conversation content and use aggregated or de-identified data wherever possible.
- Before publishing learning-effectiveness data externally, disclose the sample, time period, and calculation method.
