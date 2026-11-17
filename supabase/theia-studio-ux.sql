-- Additive Studio UX schema; request limits and retrieval are unchanged.
alter table public.studio_agents
 add column configured_at timestamptz,
 add column first_published_at timestamptz,
 add column usage_alert boolean not null default false,
 add column button_label text not null default 'Chat with us' check(length(button_label) between 1 and 60),
 add column button_color text not null default '#c9ec8a' check(button_color ~ '^#[0-9a-fA-F]{6}$'),
 add column button_position text not null default 'right' check(button_position in ('left','right'));
alter table public.studio_usage
 add column failed_requests integer not null default 0 check(failed_requests>=0),
 add column alert_claimed_at timestamptz,
 add column alert_sent_at timestamptz;
create function public.studio_record_failure(p_agent uuid,p_day date) returns void language sql security invoker set search_path='' as $$
 update public.studio_usage set failed_requests=failed_requests+1 where agent_id=p_agent and day=p_day;
$$;
create function public.studio_claim_alert(p_agent uuid,p_day date) returns boolean language plpgsql security invoker set search_path='' as $$
declare claimed uuid;
begin
 update public.studio_usage u set alert_claimed_at=now()
 from public.studio_agents a where u.agent_id=p_agent and u.day=p_day and a.id=u.agent_id and a.usage_alert
 and u.requests>=ceil(a.daily_limit*0.8) and u.alert_sent_at is null
 and (u.alert_claimed_at is null or u.alert_claimed_at<now()-interval '10 minutes')
 returning u.agent_id into claimed;
 return claimed is not null;
end;$$;
revoke all on function public.studio_record_failure(uuid,date),public.studio_claim_alert(uuid,date) from public,anon,authenticated;
grant execute on function public.studio_record_failure(uuid,date),public.studio_claim_alert(uuid,date) to service_role;
