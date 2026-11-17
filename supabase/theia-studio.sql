-- Theia Studio: isolated customer data. Apply with execute_sql; no existing tables changed.
create table public.studio_agents (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 80), greeting text not null default 'Hello. How can I help?' check(length(greeting)<=300),
 instructions text not null default '' check(length(instructions)<=8000), model text not null default 'gpt-4.1-mini' check(model in ('gpt-4.1-mini','gpt-4.1','gpt-5-mini')),
 published boolean not null default false, origins text[] not null default '{}' check(cardinality(origins)<=10),
 daily_limit integer not null default 100 check(daily_limit between 1 and 1000), max_output integer not null default 800 check(max_output between 200 and 2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index studio_agents_owner on public.studio_agents(owner_id);
create table public.studio_keys (
 owner_id uuid primary key references auth.users(id) on delete cascade, ciphertext text not null check(length(ciphertext)<8192),
 last_four text not null check(length(last_four)=4), validated_at timestamptz not null default now()
);
create table public.studio_documents (
 id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.studio_agents(id) on delete cascade,
 title text not null check(length(title) between 1 and 160), content text not null check(length(content) between 1 and 50000),
 published boolean not null default false, updated_at timestamptz not null default now()
);
create index studio_documents_agent on public.studio_documents(agent_id);
create table public.studio_usage (
 agent_id uuid not null references public.studio_agents(id) on delete cascade, day date not null default (now() at time zone 'UTC')::date,
 requests integer not null default 0, primary key(agent_id,day)
);
create table public.studio_rate_limits (bucket text primary key, count integer not null default 0, expires_at timestamptz not null);
create index studio_rate_limits_expiry on public.studio_rate_limits(expires_at);
alter table public.studio_agents enable row level security;
alter table public.studio_keys enable row level security;
alter table public.studio_documents enable row level security;
alter table public.studio_usage enable row level security;
alter table public.studio_rate_limits enable row level security;
revoke all on public.studio_agents,public.studio_keys,public.studio_documents,public.studio_usage,public.studio_rate_limits from anon,authenticated;
grant select,insert,update,delete on public.studio_agents,public.studio_keys,public.studio_documents to authenticated;
grant select on public.studio_usage to authenticated;
grant all on public.studio_agents,public.studio_keys,public.studio_documents,public.studio_usage,public.studio_rate_limits to service_role;
create policy studio_limits_service on public.studio_rate_limits to service_role using(true) with check(true);
create policy studio_agent_owner on public.studio_agents to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy studio_key_owner on public.studio_keys to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy studio_doc_owner on public.studio_documents to authenticated using(exists(select 1 from public.studio_agents a where a.id=agent_id and a.owner_id=(select auth.uid()))) with check(exists(select 1 from public.studio_agents a where a.id=agent_id and a.owner_id=(select auth.uid())));
create policy studio_usage_owner on public.studio_usage for select to authenticated using(exists(select 1 from public.studio_agents a where a.id=agent_id and a.owner_id=(select auth.uid())));
create or replace function public.studio_limit_rows() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_TABLE_NAME='studio_agents' then
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,0));
  if (select count(*) from public.studio_agents where owner_id=new.owner_id)>=10 then raise exception 'Maximum 10 assistants'; end if;
 else
  if TG_OP='UPDATE' and new.agent_id=old.agent_id then return new;end if;
  perform pg_advisory_xact_lock(hashtextextended(new.agent_id::text,1));
  if (select count(*) from public.studio_documents where agent_id=new.agent_id)>=20 then raise exception 'Maximum 20 documents per assistant'; end if;
 end if;return new;
end;$$;
create trigger studio_agent_limit before insert on public.studio_agents for each row execute function public.studio_limit_rows();
create trigger studio_document_limit before insert or update of agent_id on public.studio_documents for each row execute function public.studio_limit_rows();
revoke all on function public.studio_limit_rows() from public,anon,authenticated;
create or replace function public.studio_gate(p_bucket text,p_limit integer,p_seconds integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if length(p_bucket)>200 or p_limit not between 1 and 10000 or p_seconds not between 1 and 86400 then raise exception 'Invalid limit';end if;
 delete from public.studio_rate_limits where expires_at<now()-interval '1 day';
 insert into public.studio_rate_limits(bucket,count,expires_at) values(p_bucket,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set count=case when studio_rate_limits.expires_at<=now() then 1 else studio_rate_limits.count+1 end,
 expires_at=case when studio_rate_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else studio_rate_limits.expires_at end
 returning count into n;
 return n<=p_limit;
end;$$;
create or replace function public.studio_reserve(p_agent uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare ceiling integer;n integer;
begin
 select daily_limit into ceiling from public.studio_agents where id=p_agent;
 if ceiling is null then return false;end if;
 insert into public.studio_usage(agent_id,day,requests) values(p_agent,(now() at time zone 'UTC')::date,0) on conflict do nothing;
 update public.studio_usage set requests=requests+1 where agent_id=p_agent and day=(now() at time zone 'UTC')::date and requests<ceiling returning requests into n;
 return n is not null;
end;$$;
revoke all on function public.studio_gate(text,integer,integer),public.studio_reserve(uuid) from public,anon,authenticated;
grant execute on function public.studio_gate(text,integer,integer),public.studio_reserve(uuid) to service_role;
create schema if not exists studio_private;
revoke all on schema studio_private from public,anon,authenticated;
grant usage on schema studio_private to service_role;
create or replace function studio_private.session_active(p_user uuid,p_session uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from auth.sessions where user_id=p_user and id=p_session)$$;
revoke all on function studio_private.session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function studio_private.session_active(uuid,uuid) to service_role;
create or replace function public.studio_session_active(p_user uuid,p_session uuid) returns boolean language sql security invoker set search_path='' as $$select studio_private.session_active(p_user,p_session)$$;
revoke all on function public.studio_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.studio_session_active(uuid,uuid) to service_role;
