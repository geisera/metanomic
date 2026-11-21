create table public.studio_report_counts (
 agent_id uuid not null references public.studio_agents(id) on delete cascade,
 day date not null, metric text not null, bucket text not null, total bigint not null,
 primary key(agent_id,day,metric,bucket)
);
create index studio_report_expiry on public.studio_report_counts(day);
alter table public.studio_report_counts enable row level security;
revoke all on public.studio_report_counts from public,anon,authenticated;
grant select,insert,update,delete on public.studio_report_counts to service_role;

create function public.studio_report_event(p_agent uuid,p_topic text,p_tone text)
returns void language plpgsql set search_path='' as $$
begin
 if not exists(select from public.studio_agents a where a.id=p_agent and a.published
    and public.studio_effective_tier(a.owner_id) in ('pro','enterprise')) then return; end if;
 insert into public.studio_report_counts as c(agent_id,day,metric,bucket,total)
 select p_agent,(now() at time zone 'UTC')::date,v.metric,v.bucket,1 from
 (values ('topic',p_topic),('tone',p_tone),('click',case when p_topic is null and p_tone is null then 'cta' end)) v(metric,bucket)
 where v.bucket is not null
 on conflict(agent_id,day,metric,bucket) do update set total=c.total+1;
end $$;
create function public.studio_read_report(p_agent uuid,p_owner uuid,p_days int)
returns table(metric text,bucket text,total bigint) language sql stable set search_path='' as $$
 select c.metric,c.bucket,sum(c.total)::bigint from public.studio_report_counts c
 join public.studio_agents a on a.id=c.agent_id
 where a.id=p_agent and a.owner_id=p_owner and public.studio_effective_tier(a.owner_id) in ('pro','enterprise')
 and p_days in (7,30) and c.day >= (now() at time zone 'UTC')::date-(p_days-1)
 group by c.metric,c.bucket order by c.metric,sum(c.total) desc,c.bucket
$$;
revoke all on function public.studio_report_event(uuid,text,text),public.studio_read_report(uuid,uuid,int) from public,anon,authenticated;
grant execute on function public.studio_report_event(uuid,text,text),public.studio_read_report(uuid,uuid,int) to service_role;
