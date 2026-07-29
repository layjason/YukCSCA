create table password_recovery_claim (
    id uuid primary key,
    user_id uuid not null references user_account(id) on delete cascade,
    canonical_email varchar(320) not null,
    token_hash varchar(64) not null unique,
    status varchar(32) not null,
    expires_at timestamptz not null,
    resend_available_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_password_recovery_claim_status check (
        status in ('PENDING', 'CONSUMED', 'SUPERSEDED', 'EXPIRED')
    )
);

create unique index uq_password_recovery_claim_active_user
    on password_recovery_claim(user_id)
    where status = 'PENDING';
create index idx_password_recovery_claim_retention
    on password_recovery_claim(status, updated_at);

create table password_recovery_email_outbox (
    id uuid primary key,
    claim_id uuid not null references password_recovery_claim(id) on delete cascade,
    recipient_email varchar(320) not null,
    status varchar(32) not null,
    attempt_count integer not null default 0,
    next_attempt_at timestamptz not null,
    sent_at timestamptz,
    terminal_category varchar(64),
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_password_recovery_email_outbox_claim unique (claim_id),
    constraint chk_password_recovery_email_outbox_status check (
        status in ('QUEUED', 'SENT', 'TERMINAL_FAILURE')
    ),
    constraint chk_password_recovery_email_outbox_attempts check (attempt_count >= 0)
);

create index idx_password_recovery_email_outbox_dispatch
    on password_recovery_email_outbox(status, next_attempt_at);
