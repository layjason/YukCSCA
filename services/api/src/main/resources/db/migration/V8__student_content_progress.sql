-- VS-008: per-student content progress on LESSON resources (not mastery).
-- Identity is stable across republish when resource UUIDs remain the same.

create table student_content_progress (
    id uuid primary key,
    account_id uuid not null references user_account(id),
    package_id uuid not null references academic_package(id),
    subject varchar(32) not null,
    resource_id uuid not null,
    status varchar(32) not null,
    resume_block_index integer,
    last_revision_id uuid references academic_revision(id),
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_student_content_progress_identity
        unique (account_id, package_id, resource_id),
    constraint chk_student_content_progress_status
        check (status in ('IN_PROGRESS', 'CONTENT_COMPLETE')),
    constraint chk_student_content_progress_resume
        check (resume_block_index is null or resume_block_index >= 0)
);

create index idx_student_content_progress_account_package
    on student_content_progress (account_id, package_id);

create index idx_student_content_progress_account_subject
    on student_content_progress (account_id, subject);
