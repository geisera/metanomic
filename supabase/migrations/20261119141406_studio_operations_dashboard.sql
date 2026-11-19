create table public.studio_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  roles text[] not null check (cardinality(roles) > 0 and roles <@ array['support','operations','billing']::text[])
);

create table public.studio_workspace_controls (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  suspended boolean not null default false,
  tier_id text references public.studio_tiers(id),
  tier_expires_at timestamptz,
  check ((tier_id is null) = (tier_expires_at is null))
);

create table public.studio_assistant_controls (
  agent_id uuid primary key references public.studio_agents(id) on delete cascade,
  embed_disabled boolean not null default false,
  message_limit integer check (message_limit between 1 and 1000),
  limit_expires_at timestamptz,
  check ((message_limit is null) = (limit_expires_at is null))
);

create table public.studio_access_blocks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('domain','ip')),
  value text not null check (length(value) between 1 and 253),
  expires_at timestamptz not null,
  unique (owner_id,kind,value)
);

create table public.studio_staff_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid not null,
  owner_id uuid,
  action text not null,
  reason text not null,
  before_state jsonb,
  after_state jsonb
);

create table public.studio_support_events (
  request_id uuid primary key,
  created_at timestamptz not null default now(),
  agent_id uuid not null references public.studio_agents(id) on delete cascade,
  code text not null,
  mode text not null check (mode in ('preview','embed'))
);

alter table public.studio_agents add column last_answer_at timestamptz;
create index studio_access_blocks_owner_expires_idx on public.studio_access_blocks(owner_id,expires_at);
create index studio_staff_audit_owner_date_idx on public.studio_staff_audit(owner_id,created_at desc);
create index studio_support_events_agent_date_idx on public.studio_support_events(agent_id,created_at desc);

alter table public.studio_staff enable row level security;
alter table public.studio_workspace_controls enable row level security;
alter table public.studio_assistant_controls enable row level security;
alter table public.studio_access_blocks enable row level security;
alter table public.studio_staff_audit enable row level security;
alter table public.studio_support_events enable row level security;

revoke all on public.studio_staff, public.studio_workspace_controls, public.studio_assistant_controls,
  public.studio_access_blocks, public.studio_staff_audit, public.studio_support_events
from public, anon, authenticated, service_role;
grant select on public.studio_staff to service_role;
grant select,insert,update on public.studio_workspace_controls, public.studio_assistant_controls to service_role;
grant select,insert,update,delete on public.studio_access_blocks to service_role;
grant select,insert on public.studio_staff_audit to service_role;
grant select,insert,delete on public.studio_support_events to service_role;
grant select on public.studio_workspace_controls, public.studio_assistant_controls to authenticated;

create policy studio_workspace_controls_owner_read on public.studio_workspace_controls
  for select to authenticated using (owner_id = (select auth.uid()));
create policy studio_assistant_controls_owner_read on public.studio_assistant_controls
  for select to authenticated using (exists (
    select 1 from public.studio_agents a where a.id=agent_id and a.owner_id=(select auth.uid())
  ));

-- Bootstrap only a sole existing Metanomic knowledge administrator. Staff access still requires MFA.
insert into public.studio_staff(user_id,roles)
select user_id,array['support','operations','billing']
from public.knowledge_admins where (select count(*) from public.knowledge_admins)=1;

create function public.studio_effective_tier(p_owner uuid)
returns text language sql stable set search_path = ''
as $$
  select coalesce(
    (select tier_id from public.studio_workspace_controls where owner_id=p_owner and tier_expires_at>now()),
    (select tier_id from public.studio_accounts where owner_id=p_owner),
    'starter'
  );
$$;
revoke all on function public.studio_effective_tier(uuid) from public, anon;
grant execute on function public.studio_effective_tier(uuid) to authenticated, service_role;

create or replace function public.studio_account_tier()
returns setof public.studio_tiers language sql stable set search_path = ''
as $$
  select t.* from public.studio_tiers t where t.id=public.studio_effective_tier(auth.uid());
$$;

create or replace function public.studio_limit_rows()
returns trigger language plpgsql set search_path = ''
as $$
declare owner uuid; ceiling integer;
begin
  if tg_table_name='studio_agents' then
    owner:=new.owner_id;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner::text,0));
    select assistants into ceiling from public.studio_tiers where id=public.studio_effective_tier(owner);
    if (select count(*) from public.studio_agents where owner_id=owner)>=ceiling then
      raise exception 'Assistant limit reached for your tier';
    end if;
  else
    if tg_op='UPDATE' and new.agent_id=old.agent_id then return new; end if;
    select owner_id into owner from public.studio_agents where id=new.agent_id;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.agent_id::text,1));
    select documents into ceiling from public.studio_tiers where id=public.studio_effective_tier(owner);
    if (select count(*) from public.studio_documents where agent_id=new.agent_id)>=ceiling then
      raise exception 'Knowledge document limit reached for your tier';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.studio_resolve_assistant_key(p_agent uuid,p_owner uuid)
returns table(source text,ciphertext text,override_version timestamptz)
language sql stable set search_path = ''
as $$
  select case when k.agent_id is null then 'shared'
      when tier.id not in ('pro','enterprise') then 'upgrade_required'
      when k.invalidated_at is not null then 'override_invalid' else 'override' end,
    case when k.agent_id is null then shared.ciphertext
      when tier.id in ('pro','enterprise') and k.invalidated_at is null then k.ciphertext end,
    k.validated_at
  from public.studio_agents agent
  cross join lateral (select public.studio_effective_tier(agent.owner_id) as id) tier
  left join public.studio_assistant_keys k on k.agent_id=agent.id
  left join public.studio_keys shared on shared.owner_id=agent.owner_id
  where agent.id=p_agent and agent.owner_id=p_owner;
$$;

create or replace function public.studio_remove_openai_key(p_owner uuid,p_agent uuid default null)
returns void language plpgsql set search_path = ''
as $$
begin
  if p_agent is null then
    update public.studio_agents a set published=false
    where a.owner_id=p_owner and a.published
      and not exists (select 1 from public.studio_assistant_keys k where k.agent_id=a.id);
    delete from public.studio_keys where owner_id=p_owner;
  else
    delete from public.studio_assistant_keys k using public.studio_agents a
    where k.agent_id=p_agent and a.id=k.agent_id and a.owner_id=p_owner
      and public.studio_effective_tier(p_owner) in ('pro','enterprise');
    if found and not exists (select 1 from public.studio_keys where owner_id=p_owner) then
      update public.studio_agents set published=false where id=p_agent and owner_id=p_owner;
    end if;
  end if;
end;
$$;

create function public.studio_runtime_policy(p_agent uuid,p_domain text default null,p_ip_hash text default null)
returns table(suspended boolean,embed_disabled boolean,blocked boolean,message_limit integer)
language sql stable set search_path = ''
as $$
  select coalesce(w.suspended,false),coalesce(c.embed_disabled,false),
    exists (select 1 from public.studio_access_blocks b
      where b.owner_id=a.owner_id and b.expires_at>now() and
        ((b.kind='domain' and b.value=p_domain) or (b.kind='ip' and b.value=p_ip_hash))),
    coalesce(case when c.limit_expires_at>now() then c.message_limit end,a.daily_limit)
  from public.studio_agents a
  left join public.studio_workspace_controls w on w.owner_id=a.owner_id
  left join public.studio_assistant_controls c on c.agent_id=a.id
  where a.id=p_agent;
$$;
revoke all on function public.studio_runtime_policy(uuid,text,text) from public, anon, authenticated;
grant execute on function public.studio_runtime_policy(uuid,text,text) to service_role;

create or replace function public.studio_reserve(p_agent uuid)
returns boolean language plpgsql set search_path = ''
as $$
declare ceiling integer; n integer;
begin
  select p.message_limit into ceiling
  from public.studio_runtime_policy(p_agent) p
  join public.studio_agents a on a.id=p_agent and a.published
  where not p.suspended and not p.embed_disabled;
  if ceiling is null then return false; end if;
  insert into public.studio_usage(agent_id,day,requests)
    values(p_agent,(now() at time zone 'UTC')::date,0) on conflict do nothing;
  update public.studio_usage set requests=requests+1
    where agent_id=p_agent and day=(now() at time zone 'UTC')::date and requests<ceiling
    returning requests into n;
  return n is not null;
end;
$$;

create or replace function public.studio_claim_alert(p_agent uuid,p_day date)
returns boolean language plpgsql set search_path = ''
as $$
declare claimed uuid;
begin
  update public.studio_usage u set alert_claimed_at=now()
    from public.studio_agents a,public.studio_runtime_policy(p_agent) p
    where u.agent_id=p_agent and u.day=p_day and a.id=u.agent_id and a.usage_alert
      and u.requests>=ceil(p.message_limit*0.8) and u.alert_sent_at is null
      and (u.alert_claimed_at is null or u.alert_claimed_at<now()-interval '10 minutes')
    returning u.agent_id into claimed;
  return claimed is not null;
end;
$$;

-- Auth user data stays in the private schema. Exposed wrappers run as invoker.
create function studio_private.studio_admin_lookup(p_actor uuid,p_kind text,p_query text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(match)), '[]'::jsonb)
  from (
    select u.id as owner_id,u.email,u.email_confirmed_at,u.created_at,
      public.studio_effective_tier(u.id) as effective_tier,
      coalesce(w.suspended,false) as suspended
    from auth.users u
    left join public.studio_workspace_controls w on w.owner_id=u.id
    where exists (select 1 from public.studio_staff where user_id=p_actor)
      and coalesce(u.is_anonymous,false)=false
      and u.deleted_at is null
      and (
        (p_kind='email' and lower(u.email)=p_query)
        or (p_kind='assistant' and exists (select 1 from public.studio_agents a where a.owner_id=u.id and a.id=case when p_kind='assistant' then p_query::uuid end))
        or (p_kind='domain' and exists (
          select 1 from public.studio_agents a cross join lateral unnest(a.origins) o(origin)
          where a.owner_id=u.id and split_part(substring(o.origin from 9),':',1)=p_query
        ))
      )
    order by u.created_at desc limit 20
  ) match;
$$;

create function studio_private.studio_admin_workspace(p_actor uuid,p_owner uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'owner_id',u.id,'email',u.email,'email_confirmed_at',u.email_confirmed_at,'created_at',u.created_at,
    'base_tier',coalesce(account.tier_id,'starter'),'effective_tier',to_jsonb(tier),
    'suspended',coalesce(w.suspended,false),
    'plan_override',case when w.tier_expires_at>now() then jsonb_build_object('tier_id',w.tier_id,'expires_at',w.tier_expires_at) end,
    'tiers',(select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.studio_tiers),
    'assistants',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'name',a.name,'model',a.model,'published',a.published,'origins',a.origins,
        'configured_limit',a.daily_limit,'message_limit',policy.message_limit,
        'limit_expires_at',case when c.limit_expires_at>now() then c.limit_expires_at end,
        'embed_disabled',policy.embed_disabled,'first_embed_at',a.first_embed_at,
        'last_answer_at',coalesce(a.last_answer_at,a.first_answer_at),
        'key_status',case when k.source='shared' and k.ciphertext is null then 'missing' else k.source end,
        'usage',coalesce((select jsonb_agg(jsonb_build_object('day',day,'requests',requests,'failed',failed_requests) order by day desc)
          from public.studio_usage where agent_id=a.id and day >= (now() at time zone 'UTC')::date-6),'[]'::jsonb)
      ) order by a.created_at desc)
      from public.studio_agents a
      cross join lateral public.studio_runtime_policy(a.id) policy
      left join lateral public.studio_resolve_assistant_key(a.id,u.id) k on true
      left join public.studio_assistant_controls c on c.agent_id=a.id
      where a.owner_id=u.id
    ),'[]'::jsonb),
    'blocks',coalesce((
      select jsonb_agg(jsonb_build_object('id',b.id,'kind',b.kind,
        'label',case when b.kind='domain' then b.value else 'IP ending in hash '||right(b.value,8) end,
        'expires_at',b.expires_at) order by b.expires_at)
      from public.studio_access_blocks b where b.owner_id=u.id and b.expires_at>now()
    ),'[]'::jsonb),
    'errors',coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from (select event.request_id,event.created_at,event.agent_id,a.name as assistant,event.code,event.mode
        from public.studio_support_events event join public.studio_agents a on a.id=event.agent_id
        where a.owner_id=u.id and event.created_at>now()-interval '30 days'
        order by event.created_at desc limit 25) e
    ),'[]'::jsonb),
    'audit',coalesce((
      select jsonb_agg(to_jsonb(log) order by log.created_at desc)
      from (select event.created_at,actor.email as actor,event.action,event.reason,event.before_state,event.after_state
        from public.studio_staff_audit event left join auth.users actor on actor.id=event.actor_id
        where event.owner_id=u.id order by event.created_at desc limit 20) log
    ),'[]'::jsonb)
  )
  from auth.users u
  left join public.studio_accounts account on account.owner_id=u.id
  left join public.studio_workspace_controls w on w.owner_id=u.id
  left join public.studio_tiers tier on tier.id=public.studio_effective_tier(u.id)
  where u.id=p_owner and u.deleted_at is null and coalesce(u.is_anonymous,false)=false
    and exists (select 1 from public.studio_staff where user_id=p_actor);
$$;

revoke all on function studio_private.studio_admin_lookup(uuid,text,text),
  studio_private.studio_admin_workspace(uuid,uuid) from public, anon, authenticated;
grant usage on schema studio_private to service_role;
grant execute on function studio_private.studio_admin_lookup(uuid,text,text),
  studio_private.studio_admin_workspace(uuid,uuid) to service_role;

create function public.studio_admin_lookup(p_actor uuid,p_kind text,p_query text)
returns jsonb language sql stable set search_path = ''
as $$ select studio_private.studio_admin_lookup(p_actor,p_kind,p_query); $$;

create function public.studio_admin_workspace(p_actor uuid,p_owner uuid)
returns jsonb language sql stable set search_path = ''
as $$ select studio_private.studio_admin_workspace(p_actor,p_owner); $$;

create function public.studio_admin_change(
  p_actor uuid,p_owner uuid,p_action text,p_reason text,p_agent uuid default null,
  p_block_id uuid default null,p_value text default null,p_number integer default null,p_days integer default null
)
returns void language plpgsql set search_path = ''
as $$
declare
  required_role text;
  before_value jsonb;
  after_value jsonb;
  expires timestamptz;
begin
  required_role := case
    when p_action in ('suspend_workspace','restore_workspace','disable_embed','enable_embed','block_domain','block_ip','remove_block') then 'operations'
    when p_action in ('set_plan','clear_plan','set_message_limit','clear_message_limit') then 'billing'
  end;
  if required_role is null or not exists (
    select 1 from public.studio_staff where user_id=p_actor and required_role=any(roles)
  ) then raise exception 'Staff permission required' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,''))) not between 3 and 300 then
    raise exception 'A reason is required' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,2));
  if studio_private.studio_admin_workspace(p_actor,p_owner) is null then
    raise exception 'Workspace not found' using errcode='22023';
  end if;
  if p_action in ('set_plan','set_message_limit','block_domain','block_ip') then
    if p_days is null or p_days not between 1 and 365 then
      raise exception 'Invalid expiry' using errcode='22023';
    end if;
    expires := now()+make_interval(days=>p_days);
  end if;

  if p_action in ('suspend_workspace','restore_workspace','set_plan','clear_plan') then
    insert into public.studio_workspace_controls(owner_id) values (p_owner) on conflict do nothing;
    select to_jsonb(w) into before_value from public.studio_workspace_controls w where owner_id=p_owner for update;
    if p_action in ('suspend_workspace','restore_workspace') then
      update public.studio_workspace_controls set suspended=(p_action='suspend_workspace') where owner_id=p_owner;
    else
      if p_action='set_plan' and not exists (select 1 from public.studio_tiers where id=p_value) then
        raise exception 'Plan is unavailable' using errcode='22023';
      end if;
      update public.studio_workspace_controls set tier_id=case when p_action='set_plan' then p_value end,
        tier_expires_at=expires where owner_id=p_owner;
    end if;
    select to_jsonb(w) into after_value from public.studio_workspace_controls w where owner_id=p_owner;
  elsif p_action in ('disable_embed','enable_embed','set_message_limit','clear_message_limit') then
    if not exists (select 1 from public.studio_agents where id=p_agent and owner_id=p_owner) then
      raise exception 'Assistant not found' using errcode='22023';
    end if;
    insert into public.studio_assistant_controls(agent_id) values (p_agent) on conflict do nothing;
    select to_jsonb(c) into before_value from public.studio_assistant_controls c where agent_id=p_agent for update;
    if p_action in ('disable_embed','enable_embed') then
      update public.studio_assistant_controls set embed_disabled=(p_action='disable_embed') where agent_id=p_agent;
    else
      if p_action='set_message_limit' and (p_number is null or p_number not between 1 and 1000) then
        raise exception 'Invalid message limit' using errcode='22023';
      end if;
      update public.studio_assistant_controls set message_limit=case when p_action='set_message_limit' then p_number end,
        limit_expires_at=expires where agent_id=p_agent;
    end if;
    select to_jsonb(c) into after_value from public.studio_assistant_controls c where agent_id=p_agent;
  elsif p_action='remove_block' then
    delete from public.studio_access_blocks b where id=p_block_id and owner_id=p_owner
      returning to_jsonb(b)-'value' || jsonb_build_object('label',case when b.kind='domain' then b.value else right(b.value,8) end) into before_value;
    if not found then raise exception 'Block not found' using errcode='22023'; end if;
  else
    select to_jsonb(b)-'value' || jsonb_build_object('label',case when b.kind='domain' then b.value else right(b.value,8) end)
      into before_value from public.studio_access_blocks b
      where b.owner_id=p_owner and b.kind=substring(p_action from 7) and b.value=p_value;
    insert into public.studio_access_blocks as b(owner_id,kind,value,expires_at)
      values(p_owner,substring(p_action from 7),p_value,expires)
      on conflict(owner_id,kind,value) do update set expires_at=excluded.expires_at
      returning to_jsonb(b)-'value' || jsonb_build_object('label',case when b.kind='domain' then b.value else right(b.value,8) end) into after_value;
  end if;

  insert into public.studio_staff_audit(actor_id,owner_id,action,reason,before_state,after_state)
    values(p_actor,p_owner,p_action,trim(p_reason),before_value,after_value);
end;
$$;

revoke all on function public.studio_admin_lookup(uuid,text,text), public.studio_admin_workspace(uuid,uuid),
  public.studio_admin_change(uuid,uuid,text,text,uuid,uuid,text,integer,integer) from public, anon, authenticated;
grant execute on function public.studio_admin_lookup(uuid,text,text), public.studio_admin_workspace(uuid,uuid),
  public.studio_admin_change(uuid,uuid,text,text,uuid,uuid,text,integer,integer) to service_role;

create function public.studio_record_support_error(p_agent uuid,p_request uuid,p_code text,p_mode text)
returns void language plpgsql set search_path = ''
as $$
begin
  if p_code not in ('invalid_key','assistant_key_invalid','assistant_key_upgrade','missing_key',
    'model_access','insufficient_credit','provider_unavailable','origin_not_approved','daily_limit','studio_access_blocked','studio_unavailable') then
    return;
  end if;
  -- Bound records per assistant. The support view additionally restricts results to the last 30 days.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_agent::text,3));
  insert into public.studio_support_events(agent_id,request_id,code,mode)
    values(p_agent,p_request,p_code,p_mode) on conflict do nothing;
  delete from public.studio_support_events
    where request_id in (
      select request_id from public.studio_support_events where agent_id=p_agent
      order by created_at desc,request_id limit 1000 offset 100
    );
end;
$$;
revoke all on function public.studio_record_support_error(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.studio_record_support_error(uuid,uuid,text,text) to service_role;
