create table public.samuel_scopes (
 id text primary key check (length(id)=64),
 owner_id uuid not null references auth.users(id),
 filters jsonb not null,
 next_page integer not null default 0,
 metadata_complete boolean not null default false,
 upstream_total integer not null default 0,
 last_update timestamptz,
 locked_until timestamptz,
 lock_token uuid,
 created_at timestamptz not null default now()
);
create index samuel_scopes_owner on public.samuel_scopes(owner_id);
create table public.samuel_notices (
 scope_id text not null references public.samuel_scopes(id) on delete cascade,
 id text not null check (id ~ '^[a-fA-F0-9]{32}$'),
 notice jsonb not null,
 description text not null default '',
 description_status text not null default 'pending' check(description_status in ('pending','ready','unavailable')),
 description_truncated boolean not null default false,
 fetched_at timestamptz not null default now(),
 description_at timestamptz,
 search_document tsvector generated always as (to_tsvector('simple'::regconfig,coalesce(notice->>'title','') || ' ' || description)) stored,
 primary key(scope_id,id)
);
create index samuel_notices_search on public.samuel_notices using gin(search_document);
create table public.samuel_request_budget (day date primary key, reserved integer not null default 0 check(reserved>=0));
alter table public.samuel_scopes enable row level security;
alter table public.samuel_notices enable row level security;
alter table public.samuel_request_budget enable row level security;
create policy samuel_scopes_owner_admin on public.samuel_scopes for all to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.knowledge_admins where user_id=(select auth.uid()))) with check (owner_id=(select auth.uid()) and exists(select 1 from public.knowledge_admins where user_id=(select auth.uid())));
create policy samuel_notices_owner_admin on public.samuel_notices for all to authenticated using (exists(select 1 from public.samuel_scopes s where s.id=scope_id)) with check (exists(select 1 from public.samuel_scopes s where s.id=scope_id));
create policy samuel_budget_admin on public.samuel_request_budget for all to authenticated using (exists(select 1 from public.knowledge_admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.knowledge_admins where user_id=(select auth.uid())));
revoke all on public.samuel_scopes,public.samuel_notices,public.samuel_request_budget from anon;
grant select,insert,update,delete on public.samuel_scopes,public.samuel_notices to authenticated;
grant select,insert,update on public.samuel_request_budget to authenticated;

create function public.samuel_reserve_budget(p_count integer,p_limit integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare used integer; today date := (now() at time zone 'UTC')::date;
begin
 if p_count<1 or p_count>5 or p_limit<1 or p_limit>1000 then raise exception 'Invalid budget'; end if;
 insert into public.samuel_request_budget(day,reserved) values(today,0) on conflict do nothing;
 update public.samuel_request_budget set reserved=reserved+p_count where day=today and reserved+p_count<=p_limit returning reserved into used;
 return used is not null;
end $$;
create function public.samuel_lock_scope(p_id text,p_token uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.samuel_scopes set locked_until=now()+interval '90 seconds',lock_token=p_token where id=p_id and (locked_until is null or locked_until<now());
 return found;
end $$;
create function public.samuel_search(p_scope text,p_query text,p_status text,p_page integer,p_related text[] default '{}') returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if length(p_query)>160 or p_page<0 or p_page>499 or p_status not in ('all','active','archived') or cardinality(p_related)>8 then raise exception 'Invalid search';end if;
 with matches as (
 select n.*, (p_query='' or n.search_document @@ plainto_tsquery('simple'::regconfig,p_query)) as exact_match
 from public.samuel_notices n where n.scope_id=p_scope
 and (p_status='all' or (p_status='active' and n.notice->>'active'='Yes') or (p_status='archived' and n.notice->>'active'='No'))
 and (p_query='' or n.search_document @@ plainto_tsquery('simple'::regconfig,p_query) or exists(select 1 from unnest(p_related) t where n.search_document @@ plainto_tsquery('simple'::regconfig,t)))
 ), page_rows as (select * from matches order by exact_match desc,notice->>'posted' desc,id limit 20 offset p_page*20)
 select jsonb_build_object('total',(select count(*) from matches),'opportunities',coalesce((select jsonb_agg(notice || jsonb_build_object('matchKind',case when exact_match then 'exact' else 'related' end,'descriptionStatus',description_status,'descriptionTruncated',description_truncated,'indexedAt',fetched_at,'descriptionAt',description_at)) from page_rows),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.samuel_coverage(p_scope text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('scope', (select to_jsonb(s)-'lock_token'-'owner_id' from public.samuel_scopes s where s.id=p_scope),'indexed',count(*),'ready',count(*) filter(where description_status='ready'),'pending',count(*) filter(where description_status='pending'),'unavailable',count(*) filter(where description_status='unavailable'),'truncated',count(*) filter(where description_truncated),'reservedToday',coalesce((select reserved from public.samuel_request_budget where day=(now() at time zone 'UTC')::date),0)) from public.samuel_notices where scope_id=p_scope
$$;
revoke all on function public.samuel_reserve_budget(integer,integer), public.samuel_lock_scope(text,uuid),public.samuel_search(text,text,text,integer,text[]),public.samuel_coverage(text) from public,anon;
grant execute on function public.samuel_reserve_budget(integer,integer), public.samuel_lock_scope(text,uuid),public.samuel_search(text,text,text,integer,text[]),public.samuel_coverage(text) to authenticated;
