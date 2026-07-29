alter table user_account alter column display_name drop not null;

create table email_verification_claim (
    id uuid primary key,
    canonical_email varchar(320) not null,
    token_hash varchar(64) not null unique,
    status varchar(32) not null,
    expires_at timestamptz not null,
    resend_available_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_email_verification_claim_status check (
        status in ('PENDING', 'ACCOUNT_CREATED', 'GOOGLE_COLLISION', 'SUPERSEDED', 'EXPIRED')
    )
);

create unique index uq_email_verification_claim_active_email
    on email_verification_claim(canonical_email)
    where status = 'PENDING';
create index idx_email_verification_claim_retention
    on email_verification_claim(status, updated_at);

create table credential_authenticator (
    user_id uuid primary key references user_account(id) on delete cascade,
    password_hash varchar(512) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table account_policy_acceptance (
    user_id uuid primary key references user_account(id) on delete cascade,
    terms_version varchar(100) not null,
    privacy_notice_version varchar(100) not null,
    accepted_at timestamptz not null
);

create table credential_email_outbox (
    id uuid primary key,
    claim_id uuid not null references email_verification_claim(id) on delete cascade,
    recipient_email varchar(320) not null,
    status varchar(32) not null,
    attempt_count integer not null default 0,
    next_attempt_at timestamptz not null,
    sent_at timestamptz,
    terminal_category varchar(64),
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_credential_email_outbox_claim unique (claim_id),
    constraint chk_credential_email_outbox_status check (
        status in ('QUEUED', 'SENT', 'TERMINAL_FAILURE')
    ),
    constraint chk_credential_email_outbox_attempts check (attempt_count >= 0)
);

create index idx_credential_email_outbox_dispatch
    on credential_email_outbox(status, next_attempt_at);
