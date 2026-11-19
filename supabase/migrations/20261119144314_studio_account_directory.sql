create function studio_private.studio_admin_accounts(
  p_actor uuid,p_query text,p_tier text,p_status text,p_verified text,p_page integer,p_owner uuid
)
returns jsonb language sql stable security definer set search_path=''
as $$
  with matches as materialized (
    select u.id as owner_id,u.email,left(coalesce(u.raw_user_meta_data->>'display_name',''),80) as display_name,
      u.email_confirmed_at,u.created_at,u.last_sign_in_at,u.banned_until,
      coalesce(u.banned_until>now(),false) as inactive,
      coalesce(w.suspended,false) as suspended,coalesce(a.tier_id,'starter') as tier_id,
      public.studio_effective_tier(u.id) as effective_tier,
      exists(select 1 from public.studio_staff where user_id=u.id) or
        exists(select 1 from public.knowledge_admins where user_id=u.id) as is_staff
    from auth.users u
    left join public.studio_accounts a on a.owner_id=u.id
    left join public.studio_workspace_controls w on w.owner_id=u.id
    where coalesce(u.is_anonymous,false)=false and u.deleted_at is null and nullif(u.email,'') is not null
      and (p_owner is null or u.id=p_owner)
      and (p_tier is null or coalesce(a.tier_id,'starter')=p_tier)
      and (p_status is null or p_status='inactive' and u.banned_until>now()
            or p_status='active' and (u.banned_until is null or u.banned_until<=now())
            or p_status='suspended' and w.suspended)
      and (p_verified is null or p_verified='verified' and u.email_confirmed_at is not null
            or p_verified='unverified' and u.email_confirmed_at is null)
      and (p_query is null or strpos(lower(u.email),p_query)>0
            or strpos(lower(coalesce(u.raw_user_meta_data->>'display_name','')),p_query)>0
            or u.id::text=p_query
            or exists(select 1 from public.studio_agents agent where agent.owner_id=u.id
              and (agent.id::text=p_query or exists(select 1 from unnest(agent.origins) as o(origin)
                where split_part(substring(o.origin from 9),':',1)=p_query))))
  ), page as (
    select * from matches order by created_at desc,owner_id desc limit 25 offset ((p_page-1)*25)
  )
  select case when exists(select 1 from public.studio_staff where user_id=p_actor) then jsonb_build_object(
    'accounts',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,owner_id desc) from page),'[]'::jsonb),
    'count',(select count(*) from matches),
    'tiers',(select jsonb_agg(to_jsonb(t) order by case t.id when 'starter' then 0 when 'pro' then 1 else 2 end,t.name)
             from public.studio_tiers t)
  ) end;
$$;

create function public.studio_admin_accounts(
  p_actor uuid,p_query text default null,p_tier text default null,p_status text default null,
  p_verified text default null,p_page integer default 1,p_owner uuid default null
)
returns jsonb language sql stable set search_path=''
as $$
  select studio_private.studio_admin_accounts(p_actor,p_query,p_tier,p_status,p_verified,p_page,p_owner);
$$;

create function studio_private.studio_admin_membership(
  p_actor uuid,p_reason text,p_tier text,p_owner uuid,p_assistants integer,p_websites integer,p_documents integer
)
returns void language plpgsql security definer set search_path=''
as $$
declare before_state jsonb; after_state jsonb; operation text;
begin
  if not exists(select 1 from public.studio_staff where user_id=p_actor and 'billing'=any(roles)) then
    raise insufficient_privilege;
  end if;
  if length(coalesce(p_reason,'')) not between 3 and 300 then raise invalid_parameter_value; end if;
  if p_owner is null then
    if p_tier not in ('starter','pro','enterprise') or p_assistants is null or p_websites is null or p_documents is null then
      raise invalid_parameter_value;
    end if;
    operation:='save_membership_plan';
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tier,4));
    select to_jsonb(t) into before_state from public.studio_tiers t where id=p_tier;
    insert into public.studio_tiers as t(id,name,assistants,websites,documents)
      values(p_tier,case p_tier when 'starter' then 'Starter' when 'pro' then 'Pro' else 'Enterprise' end,
        p_assistants,p_websites,p_documents)
      on conflict(id) do update set assistants=excluded.assistants,websites=excluded.websites,documents=excluded.documents
      returning to_jsonb(t) into after_state;
  else
    if not exists(select 1 from public.studio_tiers where id=p_tier)
       or not exists(select 1 from auth.users where id=p_owner and deleted_at is null and coalesce(is_anonymous,false)=false) then
      raise invalid_parameter_value;
    end if;
    operation:='set_membership';
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,2));
    select jsonb_build_object('tier_id',coalesce((select tier_id from public.studio_accounts where owner_id=p_owner),'starter'))
      into before_state;
    insert into public.studio_accounts(owner_id,tier_id) values(p_owner,p_tier)
      on conflict(owner_id) do update set tier_id=excluded.tier_id;
    after_state:=jsonb_build_object('tier_id',p_tier);
  end if;
  insert into public.studio_staff_audit(actor_id,owner_id,action,reason,before_state,after_state)
    values(p_actor,p_owner,operation,p_reason,before_state,after_state);
end;
$$;

create function public.studio_admin_membership(
  p_actor uuid,p_reason text,p_tier text,p_owner uuid default null,
  p_assistants integer default null,p_websites integer default null,p_documents integer default null
)
returns void language sql set search_path=''
as $$
  select studio_private.studio_admin_membership(p_actor,p_reason,p_tier,p_owner,p_assistants,p_websites,p_documents);
$$;

create function studio_private.studio_admin_revoke_sessions(p_actor uuid,p_owner uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare revoked integer;
begin
  if not exists(select 1 from public.studio_staff where user_id=p_actor and 'operations'=any(roles))
     or exists(select 1 from public.studio_staff where user_id=p_owner)
     or exists(select 1 from public.knowledge_admins where user_id=p_owner) then raise insufficient_privilege; end if;
  delete from auth.sessions where user_id=p_owner;
  get diagnostics revoked=row_count;
  return revoked;
end;
$$;

create function public.studio_admin_revoke_sessions(p_actor uuid,p_owner uuid)
returns integer language sql set search_path=''
as $$ select studio_private.studio_admin_revoke_sessions(p_actor,p_owner); $$;

revoke all on function studio_private.studio_admin_accounts(uuid,text,text,text,text,integer,uuid),
  studio_private.studio_admin_membership(uuid,text,text,uuid,integer,integer,integer),
  studio_private.studio_admin_revoke_sessions(uuid,uuid),
  public.studio_admin_accounts(uuid,text,text,text,text,integer,uuid),
  public.studio_admin_membership(uuid,text,text,uuid,integer,integer,integer),
  public.studio_admin_revoke_sessions(uuid,uuid) from public,anon,authenticated;
grant execute on function studio_private.studio_admin_accounts(uuid,text,text,text,text,integer,uuid),
  studio_private.studio_admin_membership(uuid,text,text,uuid,integer,integer,integer),
  studio_private.studio_admin_revoke_sessions(uuid,uuid),
  public.studio_admin_accounts(uuid,text,text,text,text,integer,uuid),
  public.studio_admin_membership(uuid,text,text,uuid,integer,integer,integer),
  public.studio_admin_revoke_sessions(uuid,uuid) to service_role;
