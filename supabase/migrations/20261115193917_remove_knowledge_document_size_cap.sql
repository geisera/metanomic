-- Remove application document-size and passage-count caps; retain validation and authorization.
alter table public.knowledge_documents drop constraint if exists knowledge_documents_content_check;

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
     or jsonb_array_length(p_chunks) < 1 then
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

