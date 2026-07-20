create table security_event (
    id uuid primary key,
    event_type varchar(64) not null,
    user_id uuid,
    occurred_at timestamptz not null
);

create index idx_security_event_type_time on security_event(event_type, occurred_at desc);
create index idx_security_event_user_time on security_event(user_id, occurred_at desc);
