-- Prevent duplicate CHECKPOINT_PASSED rows when concurrent submit races on the same session.
-- Drop extras first so this index can apply on databases that already raced under V9.

with ranked as (
    select id,
           row_number() over (
               partition by source_session_id, objective_id
               order by occurred_at asc, id asc
           ) as rn
    from assessment_objective_evidence
)
delete from assessment_objective_evidence e
    using ranked
where e.id = ranked.id
  and ranked.rn > 1;

create unique index uq_assessment_objective_evidence_session_objective
    on assessment_objective_evidence (source_session_id, objective_id);
