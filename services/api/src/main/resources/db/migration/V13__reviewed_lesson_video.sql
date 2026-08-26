-- VS-010B: optional reviewed short-video assets on lesson/remediation units.
-- Video/caption bytes live in S3-compatible object storage; this schema owns
-- metadata, provenance, upload slots, scene specifications, the polled render
-- queue, and the per-resource video playback position on content progress.

create table academic_video_asset (
    id uuid primary key,
    source varchar(32) not null,
    status varchar(32) not null,
    explanation_language varchar(16) not null,
    media_type varchar(32) not null,
    storage_key varchar(500) not null unique,
    captions_key varchar(500) unique,
    byte_size bigint,
    duration_seconds integer,
    width integer,
    height integer,
    sha256 varchar(64),
    captions_available boolean not null default false,
    rejection jsonb,
    origin varchar(32) not null,
    provider varchar(200),
    source_locator varchar(2000),
    permission_reference varchar(1000),
    author_user_id uuid not null references user_account(id),
    reviewed_by_user_id uuid references user_account(id),
    reviewed_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_academic_video_source check (source in ('UPLOADED', 'PRODUCED')),
    constraint chk_academic_video_status check (
        status in ('AWAITING_VALIDATION', 'DRAFT', 'REVIEWED', 'REJECTED', 'RETIRED')
    ),
    constraint chk_academic_video_language check (
        explanation_language in ('id', 'en', 'zh-CN')
    ),
    constraint chk_academic_video_media_type check (media_type = 'video/mp4'),
    constraint chk_academic_video_byte_size check (
        byte_size is null or byte_size between 1 and 209715200
    ),
    constraint chk_academic_video_duration check (
        duration_seconds is null or duration_seconds between 1 and 600
    ),
    constraint chk_academic_video_dimensions check (
        (width is null and height is null)
        or (width between 1 and 3840 and height between 1 and 2160)
    ),
    constraint chk_academic_video_sha256 check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
    constraint chk_academic_video_origin check (
        origin in ('YUKCSCA_ORIGINAL', 'LICENSED', 'OPEN_LICENSE')
    ),
    constraint chk_academic_video_provenance check (
        origin = 'YUKCSCA_ORIGINAL'
        or (provider is not null and source_locator is not null and permission_reference is not null)
    ),
    constraint chk_academic_video_source_state check (
        source = 'UPLOADED'
        or (source = 'PRODUCED' and status in ('DRAFT', 'REVIEWED', 'RETIRED'))
    ),
    -- Bytes must be validated (or rejected) before any later metadata exists.
    constraint chk_academic_video_rejection check (
        (status in ('AWAITING_VALIDATION', 'DRAFT', 'REVIEWED', 'RETIRED') and rejection is null)
        or (status = 'REJECTED' and rejection is not null)
    ),
    -- Playable shape metadata is set together when probing succeeds.
    constraint chk_academic_video_shape check (
        (byte_size is null and duration_seconds is null and width is null and height is null and sha256 is null)
        or (byte_size is not null and duration_seconds is not null and width is not null and height is not null and sha256 is not null)
    ),
    constraint chk_academic_video_state_shape check (
        (status in ('AWAITING_VALIDATION', 'REJECTED') and byte_size is null)
        or (status in ('DRAFT', 'REVIEWED', 'RETIRED') and byte_size is not null)
    ),
    constraint chk_academic_video_captions check (
        (captions_available and captions_key is not null)
        or (not captions_available and captions_key is null)
    ),
    constraint chk_academic_video_produced_captions check (
        source != 'PRODUCED' or captions_available
    ),
    -- Review is only reachable with validated bytes and captions.
    constraint chk_academic_video_reviewed check (
        (status in ('REVIEWED', 'RETIRED')
            and reviewed_by_user_id is not null and reviewed_at is not null and captions_available)
        or (status not in ('REVIEWED', 'RETIRED')
            and reviewed_by_user_id is null and reviewed_at is null)
    )
);

create index idx_academic_video_asset_status on academic_video_asset (status);

-- Durable object-deletion outbox consumed by the existing render worker. This keeps the
-- retention mechanism inside VS-010B instead of adding a broker or a second scheduler service.
create table media_object_cleanup (
    id uuid primary key,
    storage_key varchar(500) not null unique,
    delete_after timestamptz not null,
    attempts integer not null default 0,
    claim_token uuid,
    reason varchar(32) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_media_object_cleanup_attempts check (attempts >= 0),
    constraint chk_media_object_cleanup_reason check (
        reason in ('STAGING', 'REJECTED_UPLOAD', 'ORPHAN_OUTPUT', 'RETIRED_ASSET')
    )
);

create index idx_media_object_cleanup_due on media_object_cleanup (delete_after, created_at);

create table academic_video_upload_slot (
    id uuid primary key,
    explanation_language varchar(16) not null,
    storage_key varchar(500) not null unique,
    max_byte_size bigint not null,
    asset_id uuid unique references academic_video_asset(id),
    created_at timestamptz not null,
    expires_at timestamptz not null,
    constraint chk_slot_language check (explanation_language in ('id', 'en', 'zh-CN')),
    constraint chk_slot_max_byte_size check (max_byte_size between 1 and 209715200)
    -- The slot-to-asset link is persisted at first confirm and survives expiry so
    -- confirmVideoUpload stays idempotent even after the slot lapses (CR-08).
);

create table scene_specification (
    id uuid primary key,
    explanation_language varchar(16) not null,
    registry_version varchar(40) not null,
    segments jsonb not null,
    created_by_user_id uuid not null references user_account(id),
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_scene_spec_language check (explanation_language in ('id', 'en', 'zh-CN'))
);

create table render_job (
    id uuid primary key,
    kind varchar(32) not null,
    state varchar(32) not null,
    scene_specification_id uuid references scene_specification(id),
    video_asset_id uuid references academic_video_asset(id),
    -- Snapshot of the scene specification at enqueue; an in-flight job is never
    -- affected by a later specification replacement.
    scene_snapshot jsonb,
    registry_version varchar(40),
    attempts integer not null default 0,
    error_code varchar(40),
    error_detail varchar(500),
    visible_after timestamptz not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint chk_render_job_kind check (kind in ('VALIDATE_UPLOAD', 'RENDER_SCENE')),
    constraint chk_render_job_state check (state in ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED')),
    constraint chk_render_job_attempts check (attempts between 0 and 5),
    constraint chk_render_job_error check (
        (state = 'FAILED' and error_code is not null)
        or (state != 'FAILED' and error_code is null)
    ),
    constraint chk_render_job_payload check (
        (kind = 'RENDER_SCENE' and scene_specification_id is not null and scene_snapshot is not null and registry_version is not null)
        or (kind = 'VALIDATE_UPLOAD' and scene_specification_id is null and scene_snapshot is null and registry_version is null and video_asset_id is not null)
    )
);

-- Workers claim with FOR UPDATE SKIP LOCKED ordered by age; partial index keeps
-- the poll cheap while matching only non-terminal rows (the claim SQL applies the
-- visibility-timeout comparison at scan time, since now() is not index-immutable).
create index idx_render_job_claimable
    on render_job (created_at)
    where state in ('QUEUED', 'RUNNING');

create index idx_render_job_spec on render_job (scene_specification_id, created_at desc);

-- Application-level specification locking serializes enqueue; this constraint also prevents a
-- race or out-of-band write from creating two active jobs for one specification.
create unique index uq_render_job_active_spec
    on render_job (scene_specification_id)
    where kind = 'RENDER_SCENE' and state in ('QUEUED', 'RUNNING');

-- Confirm replay and the asset-keyed CR-10 retry both enqueue validation jobs.
-- The asset lock serializes normal calls; this index is the database backstop.
create unique index uq_render_job_active_validation_asset
    on render_job (video_asset_id)
    where kind = 'VALIDATE_UPLOAD' and state in ('QUEUED', 'RUNNING');

create table scene_template_registry_version (
    version varchar(40) primary key,
    registered_at timestamptz not null
);

-- Append-only registry history. The pilot library ships with the worker and the
-- Java validation layer; rows record which reviewed versions ever existed.
insert into scene_template_registry_version (version, registered_at)
values ('2026-08.1', now());

alter table scene_specification
    add constraint fk_scene_specification_registry_version
    foreign key (registry_version) references scene_template_registry_version(version);

alter table render_job
    add constraint chk_render_job_error_code check (
        error_code is null
        or error_code in ('VALIDATION_FAILED', 'RENDER_TIMEOUT', 'DURATION_POLICY', 'SPEECH_SYNTHESIS_FAILED', 'INTERNAL')
    ),
    add constraint chk_render_job_result check (
        kind = 'VALIDATE_UPLOAD'
        or (state = 'SUCCEEDED' and video_asset_id is not null)
        or (state != 'SUCCEEDED' and video_asset_id is null)
    );

alter table student_content_progress
    add column video_asset_id uuid references academic_video_asset(id),
    add column video_position_seconds integer,
    add constraint chk_student_content_progress_video_position check (
        video_position_seconds is null or video_position_seconds between 0 and 600
    ),
    add constraint chk_student_content_progress_video check (
        (video_asset_id is null and video_position_seconds is null)
        or (video_asset_id is not null and video_position_seconds is not null)
    );
