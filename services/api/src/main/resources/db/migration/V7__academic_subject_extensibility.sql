-- Drop the Mathematics-only subject check so package identity can grow by subject code.
-- Application code remains the allow-list for creatable subjects (AcademicSubjectProfile).
-- UNIQUE(subject) is retained: one preparation package per subject.

alter table academic_package
    drop constraint if exists chk_academic_package_subject;

alter table academic_package
    add constraint chk_academic_package_subject_length
    check (char_length(subject) between 1 and 32);
