-- VS-009: student assessment sessions, item attempts, assistance, mistakes, objective evidence.

create table assessment_session (
    id uuid primary key,
    account_id uuid not null references user_account(id),
    subject varchar(32) not null,
    package_id uuid not null references academic_package(id),
    package_revision_id uuid not null references academic_revision(id),
    purpose varchar(32) not null,
    status varchar(32) not null,
    set_id uuid,
    mistake_id uuid,
    lesson_resource_id uuid,
    exam_language varchar(16) not null,
    feedback_mode varchar(16) not null,
    plan_task_id uuid,
    set_title_json jsonb,
    strong_hints_disabled boolean not null default false,
    max_tier_disclosed integer not null default 0,
    strong_used boolean not null default false,
    language_assist_used boolean not null default false,
    checkpoint_passed boolean,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    submitted_at timestamptz,
    constraint chk_assessment_session_purpose
        check (purpose in ('CHECKPOINT', 'TOPIC_PRACTICE', 'REVALIDATION')),
    constraint chk_assessment_session_status
        check (status in ('IN_PROGRESS', 'SUBMITTED', 'CANCELLED')),
    constraint chk_assessment_session_exam_language
        check (exam_language in ('en', 'zh-CN')),
    constraint chk_assessment_session_feedback_mode
        check (feedback_mode in ('IMMEDIATE', 'SET_END')),
    constraint chk_assessment_session_max_tier
        check (max_tier_disclosed >= 0)
);

create index idx_assessment_session_owner_status
    on assessment_session (account_id, status, updated_at desc);

create index idx_assessment_session_owner_subject
    on assessment_session (account_id, subject, status);

create table assessment_item_attempt (
    id uuid primary key,
    session_id uuid not null references assessment_session(id) on delete cascade,
    account_id uuid not null references user_account(id),
    item_order integer not null,
    question_id uuid not null,
    status varchar(16) not null,
    selected_option_key varchar(40),
    correct boolean,
    strong_assistance boolean not null default false,
    disclosed_tier_count integer not null default 0,
    question_copy_json jsonb not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    locked_at timestamptz,
    constraint uq_assessment_item_session_order unique (session_id, item_order),
    constraint chk_assessment_item_status check (status in ('OPEN', 'LOCKED')),
    constraint chk_assessment_item_order check (item_order >= 0),
    constraint chk_assessment_item_disclosed check (disclosed_tier_count >= 0)
);

create index idx_assessment_item_session on assessment_item_attempt (session_id);

create table assessment_assistance_event (
    id uuid primary key,
    session_id uuid not null references assessment_session(id) on delete cascade,
    item_attempt_id uuid not null references assessment_item_attempt(id) on delete cascade,
    account_id uuid not null references user_account(id),
    kind varchar(32) not null,
    tier_index integer not null,
    strength varchar(16) not null,
    occurred_at timestamptz not null,
    constraint chk_assessment_assistance_kind check (kind in ('MATH_HINT')),
    constraint chk_assessment_assistance_strength check (strength in ('STANDARD', 'STRONG')),
    constraint chk_assessment_assistance_tier check (tier_index >= 0),
    constraint uq_assessment_assistance_item_tier unique (item_attempt_id, tier_index)
);

create index idx_assessment_assistance_session on assessment_assistance_event (session_id);

create table assessment_mistake (
    id uuid primary key,
    account_id uuid not null references user_account(id),
    subject varchar(32) not null,
    package_id uuid not null references academic_package(id),
    package_revision_id uuid not null references academic_revision(id),
    question_id uuid not null,
    exam_language varchar(16) not null,
    status varchar(32) not null,
    error_cause varchar(40),
    private_note varchar(2000),
    error_count integer not null,
    last_attempt_id uuid,
    last_session_id uuid,
    source_set_id uuid,
    max_tier_disclosed integer not null default 0,
    strong_used boolean not null default false,
    language_assist_used boolean not null default false,
    attempt_question_json jsonb not null,
    latest_response_json jsonb not null,
    outline_item_ids jsonb not null default '[]'::jsonb,
    objective_ids jsonb not null default '[]'::jsonb,
    next_due_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_assessment_mistake_identity unique (account_id, package_id, question_id),
    constraint chk_assessment_mistake_status
        check (status in (
            'OPEN',
            'REMEDIATION_IN_PROGRESS',
            'AWAITING_REVALIDATION',
            'REVALIDATION_PASSED'
        )),
    constraint chk_assessment_mistake_error_count check (error_count >= 1),
    constraint chk_assessment_mistake_exam_language check (exam_language in ('en', 'zh-CN'))
);

create index idx_assessment_mistake_owner_updated
    on assessment_mistake (account_id, updated_at desc);

create index idx_assessment_mistake_owner_status
    on assessment_mistake (account_id, status);

create table assessment_objective_evidence (
    id uuid primary key,
    account_id uuid not null references user_account(id),
    subject varchar(32) not null,
    package_id uuid not null references academic_package(id),
    objective_id uuid not null,
    signal varchar(40) not null,
    source_session_id uuid not null references assessment_session(id),
    occurred_at timestamptz not null,
    constraint chk_assessment_objective_evidence_signal
        check (signal in ('CHECKPOINT_PASSED'))
);

create index idx_assessment_objective_evidence_account
    on assessment_objective_evidence (account_id, objective_id, occurred_at desc);

create index idx_assessment_objective_evidence_session
    on assessment_objective_evidence (source_session_id);
