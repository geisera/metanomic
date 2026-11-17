create table public.studio_tiers (
 id text primary key, name text not null,
 assistants integer not null check(assistants between 1 and 10),
 websites integer not null check(websites between 1 and 10),
 documents integer not null check(documents between 1 and 20)
);
insert into public.studio_tiers values ('starter','Starter',1,2,1);
create table public.studio_accounts (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 tier_id text not null default 'starter' references public.studio_tiers(id)
);
alter table public.studio_tiers enable row level security;
alter table public.studio_accounts enable row level security;
revoke all on public.studio_tiers,public.studio_accounts from anon,authenticated;
grant select on public.studio_tiers,public.studio_accounts to authenticated;
grant all on public.studio_tiers,public.studio_accounts to service_role;
create policy studio_tier_read on public.studio_tiers for select to authenticated using(true);
create policy studio_account_read on public.studio_accounts for select to authenticated using(owner_id=(select auth.uid()));
-- No account assignment means Starter; only the service role can change tiers.
create function public.studio_account_tier() returns setof public.studio_tiers language sql stable security invoker set search_path='' as $$
 select t.* from public.studio_tiers t where t.id=coalesce((select tier_id from public.studio_accounts where owner_id=auth.uid()),'starter');
$$;
revoke all on function public.studio_account_tier() from public,anon;
grant execute on function public.studio_account_tier() to authenticated;
create or replace function public.studio_limit_rows() returns trigger language plpgsql security invoker set search_path='' as $$
declare owner uuid; ceiling integer;
begin
 if TG_TABLE_NAME='studio_agents' then
  owner:=new.owner_id;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
  select assistants into ceiling from public.studio_tiers where id=coalesce((select tier_id from public.studio_accounts where owner_id=owner),'starter');
  if (select count(*) from public.studio_agents where owner_id=owner)>=ceiling then raise exception 'Assistant limit reached for your tier';end if;
 else
  if TG_OP='UPDATE' and new.agent_id=old.agent_id then return new;end if;
  select owner_id into owner from public.studio_agents where id=new.agent_id;
  perform pg_advisory_xact_lock(hashtextextended(new.agent_id::text,1));
  select documents into ceiling from public.studio_tiers where id=coalesce((select tier_id from public.studio_accounts where owner_id=owner),'starter');
  if (select count(*) from public.studio_documents where agent_id=new.agent_id)>=ceiling then raise exception 'Knowledge document limit reached for your tier';end if;
 end if;return new;
end;$$;
create function public.studio_limit_origins() returns trigger language plpgsql security invoker set search_path='' as $$
declare ceiling integer;
begin
 select websites into ceiling from public.studio_tiers where id=coalesce((select tier_id from public.studio_accounts where owner_id=new.owner_id),'starter');
 if cardinality(new.origins)>ceiling then
  if TG_OP='UPDATE' and new.origins <@ old.origins then return new;end if;
  raise exception 'Approved website limit reached for your tier';
 end if;return new;
end;$$;
revoke all on function public.studio_limit_origins() from public,anon,authenticated;
create trigger studio_origin_limit before insert or update of origins on public.studio_agents for each row execute function public.studio_limit_origins();
