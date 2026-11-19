create table public.studio_assistant_keys (
    agent_id uuid primary key references public.studio_agents(id) on delete cascade,
    ciphertext text not null check (length(ciphertext) < 8192),
    last_four text not null check (length(last_four) = 4),
    validated_at timestamptz not null,
    invalidated_at timestamptz
);

alter table public.studio_assistant_keys enable row level security;
revoke all on public.studio_assistant_keys from public, anon, authenticated;
grant select, insert, update, delete on public.studio_assistant_keys to service_role;

create function public.studio_resolve_assistant_key(p_agent uuid, p_owner uuid)
returns table (source text, ciphertext text, override_version timestamptz)
language sql stable set search_path = ''
as $$
    select case
               when k.agent_id is null then 'shared'
               when a.tier_id is null or a.tier_id not in ('pro', 'enterprise') then 'upgrade_required'
               when k.invalidated_at is not null then 'override_invalid'
               else 'override'
           end,
           case
               when k.agent_id is null then shared.ciphertext
               when a.tier_id in ('pro', 'enterprise') and k.invalidated_at is null then k.ciphertext
           end,
           k.validated_at
    from public.studio_agents agent
    left join public.studio_assistant_keys k on k.agent_id = agent.id
    left join public.studio_accounts a on a.owner_id = agent.owner_id
    left join public.studio_keys shared on shared.owner_id = agent.owner_id
    where agent.id = p_agent and agent.owner_id = p_owner;
$$;

-- Both operations update publishing and the selected key in one transaction.
create function public.studio_remove_openai_key(p_owner uuid, p_agent uuid default null)
returns void
language plpgsql set search_path = ''
as $$
begin
    if p_agent is null then
        update public.studio_agents agent
        set published = false
        where agent.owner_id = p_owner
          and agent.published
          and not exists (select 1 from public.studio_assistant_keys k where k.agent_id = agent.id);
        delete from public.studio_keys where owner_id = p_owner;
    else
        delete from public.studio_assistant_keys k
        using public.studio_agents agent, public.studio_accounts a
        where k.agent_id = p_agent and agent.id = k.agent_id
          and agent.owner_id = p_owner and a.owner_id = p_owner
          and a.tier_id in ('pro', 'enterprise');
        if found and not exists (select 1 from public.studio_keys where owner_id = p_owner) then
            update public.studio_agents set published = false where id = p_agent and owner_id = p_owner;
        end if;
    end if;
end;
$$;

revoke all on function public.studio_resolve_assistant_key(uuid, uuid) from public, anon, authenticated;
revoke all on function public.studio_remove_openai_key(uuid, uuid) from public, anon, authenticated;
grant execute on function public.studio_resolve_assistant_key(uuid, uuid) to service_role;
grant execute on function public.studio_remove_openai_key(uuid, uuid) to service_role;
