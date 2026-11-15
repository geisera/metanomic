-- Keep weak semantic neighbors from contaminating unrelated answers.
-- Queries outside application bounds cannot be used to enumerate the index.
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
 where length(trim(p_query)) between 2 and 400
   and fts @@ websearch_to_tsquery('english'::regconfig,left(p_query,400))
 order by rn limit 40
),
semantic as (
 select id, row_number() over (order by embedding operator(extensions.<=>) p_embedding, id) as rn
 from eligible
 where p_embedding is not null and embedding is not null
   and length(trim(p_query)) between 2 and 400
   and (embedding operator(extensions.<=>) p_embedding) < 0.56
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

