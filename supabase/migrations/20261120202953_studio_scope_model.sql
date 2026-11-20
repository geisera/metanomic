set local lock_timeout = '5s';

alter table public.studio_scope_config
    add column model text not null default 'openai/gpt-6-luna'
    check (model in ('openai/gpt-6-luna', 'openai/gpt-oss-20b'));

create or replace function public.studio_reserve_scope_check(p_owner uuid, p_attempt boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
    tier text := public.studio_effective_tier(p_owner);
    current_month date := date_trunc('month', now() at time zone 'UTC')::date;
    settings public.studio_scope_config;
    cap integer;
    total integer;
    workspace integer;
begin
    if tier not in ('pro', 'enterprise') then
        return jsonb_build_object('status', 'inactive');
    end if;
    select * into strict settings from public.studio_scope_config where id;
    if not settings.enabled then return jsonb_build_object('status', 'inactive'); end if;
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
    return jsonb_build_object('status', 'reserved', 'timeout_ms', settings.timeout_ms, 'model', settings.model);
end;
$$;

create or replace function public.studio_save_scope_config(p_actor uuid, p_settings jsonb, p_reason text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
    before_settings jsonb;
    after_settings jsonb;
begin
    if not exists (select 1 from public.studio_staff where user_id = p_actor and 'operations' = any(roles)) then
        raise insufficient_privilege;
    end if;
    select to_jsonb(config) into strict before_settings from public.studio_scope_config config where id for update;
    update public.studio_scope_config config set
        model = coalesce(p_settings->>'model', config.model),
        enabled = (p_settings->>'enabled')::boolean,
        pro_monthly = (p_settings->>'pro_monthly')::integer,
        enterprise_monthly = (p_settings->>'enterprise_monthly')::integer,
        global_monthly = (p_settings->>'global_monthly')::integer,
        timeout_ms = (p_settings->>'timeout_ms')::integer
    where id returning to_jsonb(config) into strict after_settings;
    insert into public.studio_staff_audit(actor_id, action, reason, before_state, after_state)
        values (p_actor, 'save_scope_config', p_reason, before_settings, after_settings);
end;
$$;

notify pgrst, 'reload schema';
