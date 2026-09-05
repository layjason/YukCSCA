-- VS-011: Voyage embedding models emit 256/512/1024/2048, never 1536.
-- Pin the column to Voyage's default 1024. Existing vectors cannot be
-- recast in place; they are cleared and re-embedded lazily on next search.

update agent_content_chunk set embedding = null where embedding is not null;

alter table agent_content_chunk
    alter column embedding type vector(1024);
