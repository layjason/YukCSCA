create unique index uq_user_account_single_admin
    on user_account (role)
    where role = 'ADMIN';

create table academic_package (
    id uuid primary key,
    subject varchar(32) not null unique,
    status varchar(32) not null,
    draft_revision bigint not null default 0,
    draft jsonb not null,
    active_revision_id uuid,
    has_unpublished_changes boolean not null default false,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_academic_package_subject check (subject = 'MATHEMATICS'),
    constraint chk_academic_package_status check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    constraint chk_academic_package_draft_revision check (draft_revision >= 0)
);

create table academic_revision (
    id uuid primary key,
    package_id uuid not null references academic_package(id),
    revision_number bigint not null,
    content jsonb not null,
    published_by_user_id uuid not null references user_account(id),
    published_at timestamptz not null,
    constraint uq_academic_revision_number unique (package_id, revision_number),
    constraint chk_academic_revision_number check (revision_number > 0)
);

alter table academic_package
    add constraint fk_academic_package_active_revision
    foreign key (active_revision_id) references academic_revision(id);

create table academic_image (
    id uuid primary key,
    media_type varchar(32) not null,
    content bytea not null,
    byte_size bigint not null,
    width integer not null,
    height integer not null,
    sha256 varchar(64) not null,
    sanitization_status varchar(32) not null,
    origin varchar(32) not null,
    provider varchar(200),
    source_locator varchar(2000),
    permission_reference varchar(1000),
    author_user_id uuid not null references user_account(id),
    reviewed_by_user_id uuid references user_account(id),
    reviewed_at timestamptz,
    created_at timestamptz not null,
    constraint chk_academic_image_media_type check (media_type in ('image/png', 'image/jpeg')),
    constraint chk_academic_image_byte_size check (byte_size between 1 and 5242880),
    constraint chk_academic_image_dimensions check (
        width between 1 and 4096 and height between 1 and 4096
    ),
    constraint chk_academic_image_sha256 check (sha256 ~ '^[a-f0-9]{64}$'),
    constraint chk_academic_image_sanitization check (sanitization_status = 'REENCODED'),
    constraint chk_academic_image_origin check (
        origin in ('YUKCSCA_ORIGINAL', 'LICENSED', 'OPEN_LICENSE')
    )
);

create index idx_academic_image_sha256 on academic_image(sha256);

create table academic_audit (
    id uuid primary key,
    actor_user_id uuid not null references user_account(id),
    action varchar(64) not null,
    target_type varchar(32) not null,
    target_id uuid,
    result varchar(32) not null,
    reason varchar(500),
    occurred_at timestamptz not null
);

create index idx_academic_audit_target_time
    on academic_audit(target_type, target_id, occurred_at desc);
