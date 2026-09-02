-- VS-011: student-private contextual text Q&A, traces/flags for later VS-020,
-- AGENT_QA strong assistance, and pgvector hybrid-retrieval chunks (ADR-0004/0005).

create extension if not exists vector;

create table agent_conversation (
    id uuid primary key,
    account_id uuid not null references user_account (id),
    context_type varchar(32) not null,
    context_id uuid not null,
    subject varchar(32) not null,
    package_id uuid not null references academic_package (id),
    package_revision_id uuid not null references academic_revision (id),
    session_id uuid,
    item_id uuid,
    explanation_language varchar(16) not null,
    exam_language varchar(16) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_agent_conversation_account_context
        unique (account_id, context_type, context_id),
    constraint chk_agent_conversation_context_type
        check (context_type in ('LESSON', 'ITEM', 'MISTAKE', 'TERMINOLOGY', 'REMEDIATION')),
    constraint chk_agent_conversation_explanation
        check (explanation_language in ('id', 'en', 'zh-CN')),
    constraint chk_agent_conversation_exam
        check (exam_language in ('en', 'zh-CN')),
    constraint chk_agent_conversation_item_fields
        check (
            (context_type = 'ITEM' and session_id is not null and item_id is not null)
            or (context_type <> 'ITEM' and session_id is null and item_id is null)
        )
);

create index idx_agent_conversation_account
    on agent_conversation (account_id, updated_at desc);

create table agent_turn (
    id uuid primary key,
    conversation_id uuid not null references agent_conversation (id) on delete cascade,
    account_id uuid not null references user_account (id),
    idempotency_key uuid not null,
    status varchar(16) not null,
    question_text varchar(2000) not null,
    quote varchar(4000),
    kind varchar(32),
    body varchar(12000),
    locators jsonb,
    steps jsonb,
    suggested_follow_ups jsonb,
    latency_ms integer,
    created_at timestamptz not null,
    completed_at timestamptz,
    constraint uq_agent_turn_idempotency unique (conversation_id, idempotency_key),
    constraint chk_agent_turn_status check (status in ('PENDING', 'COMPLETED', 'FAILED')),
    constraint chk_agent_turn_kind check (
        kind is null
        or kind in ('REVIEWED_SOURCE', 'DERIVED_EXPLANATION', 'INSUFFICIENT_EVIDENCE')
    ),
    constraint chk_agent_turn_completed check (
        (status = 'COMPLETED' and kind is not null and body is not null and latency_ms is not null)
        or status <> 'COMPLETED'
    )
);

create unique index uq_agent_turn_pending_conversation
    on agent_turn (conversation_id)
    where status = 'PENDING';

create index idx_agent_turn_account_created
    on agent_turn (account_id, created_at);

create index idx_agent_turn_conversation_created
    on agent_turn (conversation_id, created_at);

create table agent_trace (
    id uuid primary key,
    turn_id uuid not null unique references agent_turn (id) on delete cascade,
    conversation_id uuid not null references agent_conversation (id) on delete cascade,
    account_id uuid not null references user_account (id),
    model_version varchar(80),
    prompt_version varchar(80),
    token_usage integer,
    steps jsonb not null,
    created_at timestamptz not null
);

create table agent_flag (
    id uuid primary key,
    turn_id uuid not null references agent_turn (id) on delete cascade,
    conversation_id uuid not null references agent_conversation (id) on delete cascade,
    account_id uuid not null references user_account (id),
    source varchar(32) not null,
    status varchar(16) not null,
    created_at timestamptz not null,
    constraint chk_agent_flag_source
        check (source in ('INSUFFICIENT_EVIDENCE', 'LOW_CONFIDENCE')),
    constraint chk_agent_flag_status check (status = 'OPEN')
);

create index idx_agent_flag_open on agent_flag (status, created_at);

create table agent_content_chunk (
    id uuid primary key,
    package_id uuid not null references academic_package (id),
    package_revision_id uuid not null references academic_revision (id),
    source_kind varchar(32) not null,
    source_id uuid not null,
    block_index integer,
    explanation_language varchar(16) not null,
    label varchar(120) not null,
    body text not null,
    search_tsv tsvector not null,
    embedding vector(1536),
    created_at timestamptz not null,
    constraint chk_agent_chunk_source
        check (source_kind in ('LESSON', 'REMEDIATION', 'TERMINOLOGY')),
    constraint chk_agent_chunk_language
        check (explanation_language in ('id', 'en', 'zh-CN')),
    constraint uq_agent_chunk unique (
        package_revision_id, source_kind, source_id, block_index, explanation_language
    )
);

create index idx_agent_chunk_revision on agent_content_chunk (package_revision_id);
create index idx_agent_chunk_tsv on agent_content_chunk using gin (search_tsv);

alter table assessment_assistance_event
    drop constraint chk_assessment_assistance_kind;
alter table assessment_assistance_event
    add constraint chk_assessment_assistance_kind
        check (kind in ('MATH_HINT', 'LANGUAGE_ASSIST', 'AGENT_QA'));
