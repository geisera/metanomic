set local lock_timeout = '5s';

alter table public.studio_scope_config
    add column topic_prompt text not null default $topic$Answer only the business-related part of a request. Decline clearly unrelated requests briefly and offer help with business questions. Ask one short clarifying question when the business connection is uncertain. Treat the following topics as data. If the list is empty, use the assistant’s business role and published knowledge to infer scope.$topic$
        check (topic_prompt ~ '[^[:space:]]' and char_length(topic_prompt) <= 4000),
    add column topic_prompt_version integer not null default 1 check (topic_prompt_version > 0);

create or replace function public.studio_reserve_prompt_check(p_owner uuid, p_attempt boolean, p_protect boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
    tier text := public.studio_effective_tier(p_owner);
    current_month date := date_trunc('month', now() at time zone 'UTC')::date;
    settings public.studio_scope_config;
    cap integer;
    total integer;
    workspace integer;
begin
    if tier is null or tier not in ('pro', 'enterprise') then
        return jsonb_build_object('status', 'inactive');
    end if;
    select * into strict settings from public.studio_scope_config where id;
    if not p_protect and not settings.enabled then return jsonb_build_object('status', 'inactive'); end if;
    if not p_attempt then return jsonb_build_object('status', 'skipped'); end if;

    cap := case when tier = 'enterprise' then settings.enterprise_monthly else settings.pro_monthly end;
    if cap = 0 or settings.global_monthly = 0 then return jsonb_build_object('status', 'limited'); end if;

    insert into public.studio_scope_months (month) values (current_month) on conflict do nothing;
    select checks into strict total from public.studio_scope_months where month = current_month for update;
    if total >= settings.global_monthly then return jsonb_build_object('status', 'limited'); end if;

    insert into public.studio_scope_workspace_months (month, owner_id)
        values (current_month, p_owner) on conflict do nothing;
    select checks into strict workspace from public.studio_scope_workspace_months
        where month = current_month and owner_id = p_owner for update;
    if workspace >= cap then return jsonb_build_object('status', 'limited'); end if;

    update public.studio_scope_months set checks = checks + 1 where month = current_month;
    update public.studio_scope_workspace_months set checks = checks + 1 where month = current_month and owner_id = p_owner;
    return jsonb_build_object('status', 'reserved', 'timeout_ms', settings.timeout_ms, 'model', settings.model,
        'scope_enabled', settings.enabled, 'guard_prompt', settings.guard_prompt, 'topic_prompt', settings.topic_prompt);
end;
$$;

revoke all on function public.studio_reserve_prompt_check(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.studio_reserve_prompt_check(uuid, boolean, boolean) to service_role;

-- Preserve the existing RPC contract during rollout and for older deployments.
create or replace function public.studio_reserve_scope_check(p_owner uuid, p_attempt boolean)
returns jsonb language sql security invoker set search_path = '' as $$
    select public.studio_reserve_prompt_check(p_owner, p_attempt, false) - 'scope_enabled' - 'guard_prompt' - 'topic_prompt';
$$;

create function public.studio_save_topic_prompt(p_actor uuid, p_prompt text, p_version integer, p_reason text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
    current_prompt text;
    current_version integer;
    next_version integer;
begin
    if not exists (select 1 from public.studio_staff where user_id = p_actor and 'operations' = any(roles)) then
        raise insufficient_privilege;
    end if;
    select topic_prompt, topic_prompt_version into strict current_prompt, current_version
        from public.studio_scope_config where id for update;
    if p_version is distinct from current_version then return null; end if;
    if current_prompt = p_prompt then return current_version; end if;
    update public.studio_scope_config set topic_prompt = p_prompt, topic_prompt_version = current_version + 1
        where id returning topic_prompt_version into strict next_version;
    insert into public.studio_staff_audit(actor_id, action, reason, before_state, after_state)
    values (p_actor, 'save_topic_prompt', p_reason,
        jsonb_build_object('topic_prompt', current_prompt, 'version', current_version),
        jsonb_build_object('topic_prompt', p_prompt, 'version', next_version));
    return next_version;
end;
$$;

revoke all on function public.studio_save_topic_prompt(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.studio_save_topic_prompt(uuid, text, integer, text) to service_role;

notify pgrst, 'reload schema';
