create function public.studio_report_message(p_agent uuid, p_topic text, p_tone text, p_question text)
returns void language sql set search_path='' as $$
    insert into public.studio_report_counts as counts (agent_id, day, metric, bucket, total)
    select a.id, (now() at time zone 'UTC')::date, v.metric, v.bucket, 1
    from public.studio_agents a
    cross join (values ('topic', p_topic), ('tone', p_tone), ('question', p_question)) v(metric, bucket)
    where a.id = p_agent and a.published and v.bucket is not null
      and public.studio_effective_tier(a.owner_id) in ('pro', 'enterprise')
    on conflict (agent_id, day, metric, bucket) do update set total = counts.total + 1;
$$;

revoke all on function public.studio_report_message(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.studio_report_message(uuid,text,text,text) to service_role;
