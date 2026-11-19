create function studio_private.studio_admin_stats(p_actor uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
  with calendar as (
    select (now() at time zone 'UTC')::date as today
  ), members as materialized (
    select u.id,public.studio_effective_tier(u.id) as tier_id,
      (u.banned_until is null or u.banned_until<=now()) as active,
      u.email_confirmed_at is not null as verified,
      u.created_at>=now()-interval '30 days' as joined_recently,
      coalesce(w.suspended,false) as suspended
    from auth.users u
    left join public.studio_workspace_controls w on w.owner_id=u.id
    where coalesce(u.is_anonymous,false)=false and u.deleted_at is null and nullif(u.email,'') is not null
  ), assistants as materialized (
    select a.id,m.tier_id,a.published,
      (a.published and cardinality(a.origins)>0 and not m.suspended and not coalesce(c.embed_disabled,false)
        and case when k.agent_id is null then shared.owner_id is not null
            else m.tier_id in ('pro','enterprise') and k.invalidated_at is null end) as live
    from public.studio_agents a
    join members m on m.id=a.owner_id
    left join public.studio_assistant_controls c on c.agent_id=a.id
    left join public.studio_assistant_keys k on k.agent_id=a.id
    left join public.studio_keys shared on shared.owner_id=a.owner_id
  ), recent_usage as materialized (
    select a.tier_id,usage.day,usage.requests,usage.failed_requests
    from calendar
    join public.studio_usage usage on usage.day between calendar.today-6 and calendar.today
    join assistants a on a.id=usage.agent_id
  ), membership_by_tier as (
    select tier_id,count(*) as members,count(*) filter(where active) as active_members
    from members group by tier_id
  ), assistants_by_tier as (
    select tier_id,count(*) as assistants,count(*) filter(where live) as live_embeds
    from assistants group by tier_id
  ), usage_by_tier as (
    select tier_id,sum(requests) as messages from recent_usage group by tier_id
  ), usage_by_day as (
    select day,sum(requests) as messages,sum(failed_requests) as failed from recent_usage group by day
  ), plans as (
    select coalesce(t.id,expected.id) as id,coalesce(t.name,expected.name) as name,t.id is not null as configured,
      coalesce(expected.position,4) as position
    from public.studio_tiers t
    full join (values ('starter','Starter',1),('pro','Pro',2),('enterprise','Enterprise',3)) expected(id,name,position)
      on t.id=expected.id
  )
  select case when exists(select 1 from public.studio_staff where user_id=p_actor) then jsonb_build_object(
    'as_of',now(),
    'members',(select count(*) from members),
    'active_members',(select count(*) from members where active),
    'verified_members',(select count(*) from members where verified),
    'new_members',(select count(*) from members where joined_recently),
    'suspended_workspaces',(select count(*) from members where suspended),
    'assistants',(select count(*) from assistants),
    'published_assistants',(select count(*) from assistants where published),
    'live_embeds',(select count(*) from assistants where live),
    'knowledge_documents',(select count(*) from public.studio_documents d join assistants a on a.id=d.agent_id),
    'messages',coalesce((select sum(requests) from recent_usage),0),
    'failed',coalesce((select sum(failed_requests) from recent_usage),0),
    'tiers',(select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'configured',p.configured,
        'members',coalesce(m.members,0),'active_members',coalesce(m.active_members,0),
        'assistants',coalesce(a.assistants,0),'live_embeds',coalesce(a.live_embeds,0),'messages',coalesce(u.messages,0))
        order by p.position,p.name)
      from plans p
      left join membership_by_tier m on m.tier_id=p.id
      left join assistants_by_tier a on a.tier_id=p.id
      left join usage_by_tier u on u.tier_id=p.id),
    'days',(select jsonb_agg(jsonb_build_object('day',calendar.today-days.offset_days,'messages',coalesce(u.messages,0),'failed',coalesce(u.failed,0))
        order by days.offset_days desc)
      from calendar cross join generate_series(0,6) as days(offset_days)
      left join usage_by_day u on u.day=calendar.today-days.offset_days)
  ) end;
$$;

create function public.studio_admin_stats(p_actor uuid)
returns jsonb language sql stable set search_path=''
as $$ select studio_private.studio_admin_stats(p_actor); $$;

revoke all on function studio_private.studio_admin_stats(uuid),public.studio_admin_stats(uuid) from public,anon,authenticated;
grant execute on function studio_private.studio_admin_stats(uuid),public.studio_admin_stats(uuid) to service_role;
