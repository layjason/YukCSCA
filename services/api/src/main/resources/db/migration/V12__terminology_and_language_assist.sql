-- VS-010A: reviewed term pronunciation, preview progress, notebook, review events,
-- and LANGUAGE_ASSIST on assessment assistance (does not set languageAssistUsed).

create table academic_term_pronunciation (
    id uuid primary key,
    package_revision_id uuid not null references academic_revision(id),
    term_id uuid not null,
    surface_form varchar(40) not null,
    media_type varchar(32) not null,
    content bytea not null,
    byte_size bigint not null,
    sha256 varchar(64) not null,
    created_at timestamptz not null,
    constraint uq_academic_term_pronunciation unique (package_revision_id, term_id, surface_form),
    constraint chk_academic_term_pronunciation_media check (media_type = 'audio/mpeg'),
    constraint chk_academic_term_pronunciation_size check (byte_size between 1 and 524288),
    constraint chk_academic_term_pronunciation_sha256 check (sha256 ~ '^[a-f0-9]{64}$')
);

create index idx_academic_term_pronunciation_term
    on academic_term_pronunciation (term_id, surface_form);

create table student_terminology_preview_progress (
    id uuid primary key,
    account_id uuid not null references user_account(id),
    package_id uuid not null references academic_package(id),
    resource_id uuid not null,
    status varchar(32) not null,
    last_revision_id uuid references academic_revision(id),
    required_term_ids jsonb,
    updated_at timestamptz not null,
    constraint uq_student_terminology_preview unique (account_id, package_id, resource_id),
    constraint chk_student_terminology_preview_status
        check (status in ('IN_PROGRESS', 'PREVIEW_COMPLETE'))
);

create index idx_student_terminology_preview_account
    on student_terminology_preview_progress (account_id, updated_at desc);

create table student_terminology_notebook (
    id uuid primary key,
    account_id uuid not null references user_account(id),
    term_id uuid not null,
    package_id uuid not null references academic_package(id),
    subject varchar(32) not null,
    term_class varchar(32) not null,
    familiarity varchar(16) not null,
    due boolean not null,
    last_review_at timestamptz,
    sources jsonb not null,
    met_in jsonb not null,
    encounter_snippet varchar(400),
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_student_terminology_notebook unique (account_id, term_id),
    constraint chk_student_terminology_notebook_class
        check (term_class in ('EXAM_INSTRUCTION', 'LOGICAL_EXPRESSION', 'TOPIC_TERM')),
    constraint chk_student_terminology_notebook_familiarity
        check (familiarity in ('NEW', 'LEARNING', 'FAMILIAR'))
);

create index idx_student_terminology_notebook_account
    on student_terminology_notebook (account_id, due, updated_at desc);

create table student_terminology_review (
    id uuid primary key,
    account_id uuid not null references user_account(id),
    term_id uuid not null,
    kind varchar(32) not null,
    selected_option_key varchar(40) not null,
    correct boolean not null,
    correct_option_key varchar(40) not null,
    familiarity_after varchar(16) not null,
    occurred_at timestamptz not null,
    constraint chk_student_terminology_review_kind
        check (kind in ('CONTEXT_CLOZE', 'MATCH_PAIRS')),
    constraint chk_student_terminology_review_familiarity
        check (familiarity_after in ('NEW', 'LEARNING', 'FAMILIAR'))
);

create index idx_student_terminology_review_account
    on student_terminology_review (account_id, occurred_at desc);

alter table assessment_assistance_event
    drop constraint chk_assessment_assistance_kind;
alter table assessment_assistance_event
    add constraint chk_assessment_assistance_kind
        check (kind in ('MATH_HINT', 'LANGUAGE_ASSIST'));

alter table assessment_assistance_event
    drop constraint chk_assessment_assistance_strength;
alter table assessment_assistance_event
    add constraint chk_assessment_assistance_strength
        check (strength in ('STANDARD', 'STRONG', 'WORD', 'PHRASE'));

alter table assessment_assistance_event
    drop constraint uq_assessment_assistance_item_tier;
alter table assessment_assistance_event
    add constraint uq_assessment_assistance_item_kind_tier
        unique (item_attempt_id, kind, tier_index);

alter table assessment_item_attempt
    add column language_help_json jsonb;
