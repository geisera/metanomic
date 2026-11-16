-- Samuel: shared, indexed store for SAM.gov's public Contract Opportunities extract.
-- A scheduled job (GET /api/samuel/ingest) loads the extract here; searches read it
-- through samuel_extract_search and never download the source file.

create table public.samuel_extract_versions (
 id bigint generated always as identity primary key,
 status text not null default 'running' check (status in ('running','complete','partial','failed')),
 is_current boolean not null default false,
 source_etag text,
 source_last_modified timestamptz,
 notice_count integer,
 description_count integer,
 upserted integer not null default 0,
 deleted integer not null default 0,
 error text,
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 checked_at timestamptz
);
-- At most one version is ever current.
create unique index samuel_extract_versions_current on public.samuel_extract_versions(is_current) where is_current;

create table public.samuel_extract_notices (
 id text primary key check (id ~ '^[a-fA-F0-9]{32}$'),
 notice jsonb not null,
 description text not null default '' check (length(description)<=100000),
 description_truncated boolean not null default false,
 set_aside_code text not null default '',
 content_hash text not null,
 updated_at timestamptz not null default now(),
 posted text generated always as (coalesce(notice->>'posted','')) stored,
 posted_day text generated always as (left(coalesce(notice->>'posted',''),10)) stored,
 naics text generated always as (coalesce(notice->>'naics','')) stored,
 notice_type text generated always as (lower(regexp_replace(coalesce(notice->>'type',''),'\s+','','g'))) stored,
 agency text generated always as (lower(coalesce(notice->>'agency',''))) stored,
 -- Punctuation is split into separate words so "Salesforce.com" and "follow-on" match their parts.
 search_document tsvector generated always as (to_tsvector('simple'::regconfig,regexp_replace(coalesce(notice->>'title','') || ' ' || description,'[^[:alnum:]]+',' ','g'))) stored
);
create index samuel_extract_notices_search on public.samuel_extract_notices using gin(search_document);
create index samuel_extract_notices_posted on public.samuel_extract_notices(posted collate "C" desc,id collate "C");
create index samuel_extract_notices_day on public.samuel_extract_notices(posted_day);
create index samuel_extract_notices_naics on public.samuel_extract_notices(naics text_pattern_ops);
create index samuel_extract_notices_set_aside on public.samuel_extract_notices(set_aside_code) where set_aside_code<>'';

alter table public.samuel_extract_versions enable row level security;
alter table public.samuel_extract_notices enable row level security;
-- Administrators read; only the service role (which bypasses RLS) writes.
create policy samuel_extract_versions_admin_read on public.samuel_extract_versions for select to authenticated using (exists(select 1 from public.knowledge_admins where user_id=(select auth.uid())));
create policy samuel_extract_notices_admin_read on public.samuel_extract_notices for select to authenticated using (exists(select 1 from public.knowledge_admins where user_id=(select auth.uid())));
revoke all on public.samuel_extract_versions,public.samuel_extract_notices from anon,authenticated;
grant select on public.samuel_extract_versions,public.samuel_extract_notices to authenticated;
grant select,insert,update,delete on public.samuel_extract_versions,public.samuel_extract_notices to service_role;

-- Starts an ingest run. Returns null while another run is active (single-flight across instances).
create function public.samuel_extract_begin(p_etag text,p_last_modified timestamptz) returns bigint language plpgsql security invoker set search_path='' as $$
declare v bigint;
begin
 perform pg_advisory_xact_lock(hashtext('samuel_extract_ingest'));
 if exists(select 1 from public.samuel_extract_versions where status='running' and started_at>now()-interval '10 minutes') then return null; end if;
 update public.samuel_extract_versions set status='failed',error='Run did not finish',finished_at=now() where status='running';
 insert into public.samuel_extract_versions(source_etag,source_last_modified) values(p_etag,p_last_modified) returning id into v;
 return v;
end $$;

-- Content hashes of every stored notice, so a run only writes rows that changed.
create function public.samuel_extract_hashes() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(id,content_hash),'{}'::jsonb) from public.samuel_extract_notices
$$;

-- Removes notices absent from the new extract and publishes the version in one transaction.
-- Fails, leaving the previous version current, unless the stored set matches the extract exactly.
create function public.samuel_extract_finish(p_version bigint,p_delete text[],p_count integer,p_descriptions integer,p_upserted integer) returns void language plpgsql security invoker set search_path='' as $$
declare removed integer; stored integer;
begin
 if not exists(select 1 from public.samuel_extract_versions where id=p_version and status='running') then raise exception 'Ingest run % is not active',p_version; end if;
 delete from public.samuel_extract_notices where id=any(p_delete);
 get diagnostics removed=row_count;
 select count(*) into stored from public.samuel_extract_notices;
 if stored<>p_count then raise exception 'Stored notice count % does not match extract count %',stored,p_count; end if;
 update public.samuel_extract_versions set is_current=false where is_current;
 update public.samuel_extract_versions set status='complete',is_current=true,notice_count=p_count,description_count=p_descriptions,upserted=p_upserted,deleted=removed,finished_at=now(),checked_at=now() where id=p_version;
end $$;

-- Keyword search over titles and descriptions with the existing optional filters.
-- Keywords use web-search syntax: every word must match as a whole word; "quoted phrases" and -exclusions are supported.
create function public.samuel_extract_search(p_keyword text,p_agency text,p_naics text,p_notice_type text,p_set_aside text,p_from text,p_to text,p_page integer) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; q tsquery; v public.samuel_extract_versions%rowtype; reason text; kind text;
begin
 if length(p_keyword)>160 or length(p_agency)>160 or p_naics !~ '^\d{0,6}$' or length(p_notice_type)>60 or length(p_set_aside)>12
  or p_from !~ '^\d{4}-\d{2}-\d{2}$' or p_to !~ '^\d{4}-\d{2}-\d{2}$' or p_page<0 or p_page>49 then raise exception 'Invalid search'; end if;
 select * into v from public.samuel_extract_versions where is_current;
 if not found then return jsonb_build_object('ready',false); end if;
 if btrim(p_keyword)<>'' then
  -- Mirror the document normalization, keeping quotes and leading minus signs for phrase and exclusion syntax.
  q:=websearch_to_tsquery('simple'::regconfig,regexp_replace(regexp_replace(p_keyword,'([[:alnum:]])-+(?=[[:alnum:]])','\1 ','g'),'[^[:alnum:][:space:]"-]+',' ','g'));
 end if;
 kind:=lower(regexp_replace(p_notice_type,'\s+','','g'));
 with matches as (
  select n.id,n.posted,n.notice from public.samuel_extract_notices n
  where n.posted_day>=p_from and n.posted_day<=p_to
   and (q is null or n.search_document @@ q)
   and (p_agency='' or position(lower(p_agency) in n.agency)>0)
   and (p_naics='' or n.naics like p_naics || '%')
   and (p_set_aside='' or n.set_aside_code=p_set_aside)
   and (kind='' or n.notice_type=kind)
 ), page_rows as (select * from matches order by posted collate "C" desc,id collate "C" limit 20 offset p_page*20)
 select jsonb_build_object('total',(select count(*) from matches),'opportunities',coalesce((select jsonb_agg(notice order by posted collate "C" desc,id collate "C") from page_rows),'[]'::jsonb)) into result;
 reason:=case
  -- A failure counts until a later check or load succeeds.
  when exists(select 1 from public.samuel_extract_versions f where f.status='failed' and f.id>v.id and f.finished_at>coalesce(v.checked_at,v.finished_at)) then 'refresh_failed'
  when coalesce(v.checked_at,v.finished_at)<now()-interval '26 hours' then 'not_checked'
  when coalesce(v.source_last_modified,v.finished_at)<now()-interval '36 hours' then 'source_old'
 end;
 return result || jsonb_build_object('ready',true,'coverage',jsonb_build_object('sourceDate',v.source_last_modified,'loadedAt',v.finished_at,'checkedAt',v.checked_at,'indexed',v.notice_count,'descriptions',v.description_count,'stale',reason is not null,'staleReason',reason));
end $$;

revoke all on function public.samuel_extract_begin(text,timestamptz),public.samuel_extract_hashes(),public.samuel_extract_finish(bigint,text[],integer,integer,integer),public.samuel_extract_search(text,text,text,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.samuel_extract_begin(text,timestamptz),public.samuel_extract_hashes(),public.samuel_extract_finish(bigint,text[],integer,integer,integer) to service_role;
grant execute on function public.samuel_extract_search(text,text,text,text,text,text,text,integer) to authenticated;
