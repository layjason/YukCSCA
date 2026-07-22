create table student_profile (
    id uuid primary key,
    account_id uuid not null references user_account(id) on delete cascade,
    preferred_name varchar(160) not null,
    birth_year integer not null,
    current_grade varchar(32) not null,
    city varchar(120) not null,
    default_explanation_language varchar(32) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_student_profile_account unique (account_id),
    constraint chk_student_profile_preferred_name check (btrim(preferred_name) <> ''),
    constraint chk_student_profile_city check (btrim(city) <> ''),
    constraint chk_student_profile_grade check (
        current_grade in ('GRADE_10', 'GRADE_11', 'GRADE_12', 'OTHER')
    ),
    constraint chk_student_profile_explanation_language check (
        default_explanation_language in ('INDONESIAN', 'ENGLISH', 'SIMPLIFIED_CHINESE')
    )
);
