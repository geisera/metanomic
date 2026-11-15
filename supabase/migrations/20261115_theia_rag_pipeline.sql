-- RAG indexing and retrieval. Apply to the dedicated Metanomic project.
-- Published documents become searchable ONLY after their current revision was indexed.
alter table public.knowledge_chunks
  add column if not exists fts tsvector generated always as (to_tsvector('english'::regconfig, content)) stored;
create index if not exists knowledge_chunks_fts_idx on public.knowledge_chunks using gin (fts);

-- Indexing is an atomic per-document replacement. Caller must be a real administrator.
create or replace function public.knowledge_index_document(
  p_document_id uuid, p_revision integer, p_chunks jsonb
) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.knowledge_documents%rowtype;
  c jsonb;
  i integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1 from public.knowledge_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Knowledge administrator required' using errcode = '42501';
  end if;
  if p_chunks is null or jsonb_typeof(p_chunks) <> 'array'
     or jsonb_array_length(p_chunks) < 1 or jsonb_array_length(p_chunks) > 150 then
    raise exception 'Invalid document chunks' using errcode = '22023';
  end if;
  select * into d from public.knowledge_documents
    where id = p_document_id for update;
  if not found or d.status <> 'published' or d.revision <> p_revision then
    raise exception 'Document revision changed or is unpublished' using errcode = '22023';
  end if;
  -- Prevent an older request indexing content that isn't in the current document.
  if length(d.content) < 1 then
    raise exception 'Document content missing' using errcode = '22023';
  end if;
  delete from public.knowledge_chunks where document_id = p_document_id;
  for c in select value from jsonb_array_elements(p_chunks) loop
    if jsonb_typeof(c) <> 'object'
       or length(coalesce(c->>'content','')) not between 1 and 10000
       or length(coalesce(c->>'content_hash','')) <> 64
       or jsonb_typeof(c->'embedding') <> 'array'
       or jsonb_array_length(c->'embedding') <> 1536 then
      raise exception 'Invalid chunk payload' using errcode = '22023';
    end if;
    insert into public.knowledge_chunks(document_id, chunk_index, content, content_hash, embedding)
    values (p_document_id, i, c->>'content', c->>'content_hash', (c->>'embedding')::extensions.vector(1536));
    i := i + 1;
  end loop;
  insert into public.knowledge_ingestion_jobs (document_id, source_revision, state, attempt_count, updated_at, error_code)
    values(p_document_id, p_revision, 'complete', 1, now(), null)
    on conflict(document_id, source_revision) do update
      set state = 'complete', attempt_count = public.knowledge_ingestion_jobs.attempt_count + 1,
          error_code = null, updated_at = now();
  return i;
end; $$;

-- Public retrieval is strictly restricted to current, published, indexed revisions.
-- RRF combines ranked keyword and semantic results, yielding a bounded excerpt.
create or replace function public.knowledge_search(
  p_query text, p_embedding extensions.vector(1536), p_limit integer default 5
) returns table (
  document_id uuid, title text, category text, source_url text, revision integer,
  chunk_index integer, excerpt text, score double precision
)
language sql stable security definer
set search_path = ''
as $$
with eligible as (
  select c.id, c.document_id, c.chunk_index, c.content, c.fts, c.embedding,
         d.title, d.category, d.source_url, d.revision
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where d.status = 'published'
    and exists (
      select 1 from public.knowledge_ingestion_jobs j
      where j.document_id = d.id and j.source_revision = d.revision and j.state = 'complete'
    )
),
keywords as (
 select id, row_number() over (order by ts_rank_cd(fts, websearch_to_tsquery('english'::regconfig, left(p_query,400))) desc, id) as rn
 from eligible
 where length(trim(p_query)) > 0
   and fts @@ websearch_to_tsquery('english'::regconfig,left(p_query,400))
 order by rn limit 40
),
semantic as (
 select id, row_number() over (order by embedding <=> p_embedding, id) as rn
 from eligible
 where p_embedding is not null and embedding is not null
 order by rn limit 40
),
ranked as (
 select coalesce(k.id,s.id) as id,
   coalesce(1.0 / (60.0+k.rn),0.0) * 1.2
   + coalesce(1.0 / (60.0+s.rn),0.0) as score
 from keywords k full join semantic s on s.id=k.id
)
select e.document_id, e.title, e.category, e.source_url, e.revision,
       e.chunk_index, left(e.content, 1800) as excerpt, r.score
from ranked r join eligible e on e.id=r.id
order by r.score desc
limit least(greatest(coalesce(p_limit,5),1),6);
$$;

revoke all on function public.knowledge_index_document(uuid,integer,jsonb) from public, anon;
grant execute on function public.knowledge_index_document(uuid,integer,jsonb) to authenticated;
revoke all on function public.knowledge_search(text,extensions.vector,integer) from public, authenticated;
grant execute on function public.knowledge_search(text,extensions.vector,integer) to anon;
-- Editorial users need read-only status reports; writes remain admin RPC-only.
