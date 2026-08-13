-- One live attempt per student identity. Older duplicates are cancelled first so the
-- unique indexes can apply on databases that already have spam IN_PROGRESS rows.

with ranked_set as (
    select id,
           row_number() over (
               partition by account_id, purpose, set_id, exam_language
               order by updated_at desc, id desc
           ) as rn
    from assessment_session
    where status = 'IN_PROGRESS'
      and set_id is not null
      and purpose in ('CHECKPOINT', 'TOPIC_PRACTICE')
)
update assessment_session s
set status = 'CANCELLED',
    updated_at = now()
from ranked_set
where s.id = ranked_set.id
  and ranked_set.rn > 1;

with ranked_revalidation as (
    select id,
           row_number() over (
               partition by account_id, purpose, mistake_id
               order by updated_at desc, id desc
           ) as rn
    from assessment_session
    where status = 'IN_PROGRESS'
      and purpose = 'REVALIDATION'
      and mistake_id is not null
)
update assessment_session s
set status = 'CANCELLED',
    updated_at = now()
from ranked_revalidation
where s.id = ranked_revalidation.id
  and ranked_revalidation.rn > 1;

-- REVALIDATION also stores source set_id; identity for those rows is mistake_id.
create unique index uq_assessment_session_in_progress_set
    on assessment_session (account_id, purpose, set_id, exam_language)
    where status = 'IN_PROGRESS'
      and set_id is not null
      and purpose in ('CHECKPOINT', 'TOPIC_PRACTICE');

create unique index uq_assessment_session_in_progress_revalidation
    on assessment_session (account_id, purpose, mistake_id)
    where status = 'IN_PROGRESS' and purpose = 'REVALIDATION' and mistake_id is not null;
