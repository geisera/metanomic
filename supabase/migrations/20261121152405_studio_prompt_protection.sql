create function public.studio_reserve_prompt_check(p_owner uuid, p_attempt boolean, p_protect boolean default true)
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
        'scope_enabled', settings.enabled);
end;
$$;

revoke all on function public.studio_reserve_prompt_check(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.studio_reserve_prompt_check(uuid, boolean, boolean) to service_role;

-- Preserve the existing RPC contract during rollout and for older deployments.
create or replace function public.studio_reserve_scope_check(p_owner uuid, p_attempt boolean)
returns jsonb language sql security invoker set search_path = '' as $$
    select public.studio_reserve_prompt_check(p_owner, p_attempt, false) - 'scope_enabled';
$$;

notify pgrst, 'reload schema';
