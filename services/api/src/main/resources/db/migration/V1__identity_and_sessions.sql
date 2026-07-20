create table user_account (
    id uuid primary key,
    email varchar(320) not null unique,
    display_name varchar(160) not null,
    avatar_url text,
    role varchar(32) not null,
    onboarding_completed boolean not null default false,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table auth_identity (
    id uuid primary key,
    user_id uuid not null references user_account(id) on delete cascade,
    provider varchar(32) not null,
    provider_subject varchar(255) not null,
    created_at timestamptz not null,
    constraint uq_auth_identity_provider_subject unique (provider, provider_subject),
    constraint uq_auth_identity_user_provider unique (user_id, provider)
);

create index idx_auth_identity_user on auth_identity(user_id);

create table auth_session (
    id uuid primary key,
    user_id uuid not null references user_account(id) on delete cascade,
    token_hash varchar(64) not null unique,
    family_id uuid not null,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    replaced_by_id uuid,
    created_at timestamptz not null,
    last_used_at timestamptz
);

create index idx_auth_session_user on auth_session(user_id);
create index idx_auth_session_family on auth_session(family_id);
create index idx_auth_session_expiry on auth_session(expires_at);
