set local lock_timeout = '5s';

create function public.studio_require_call_to_action_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if new.cta_label is null and new.cta_url is null then
        return new;
    end if;

    if tg_op = 'UPDATE' then
        if (new.owner_id, new.cta_label, new.cta_url)
            is not distinct from (old.owner_id, old.cta_label, old.cta_url) then
            return new;
        end if;
    end if;

    if public.studio_effective_tier(new.owner_id) not in ('pro', 'enterprise') then
        raise insufficient_privilege using message = 'Call to Action requires Pro or Enterprise.';
    end if;
    return new;
end;
$$;

create trigger studio_call_to_action_pro
before insert or update of owner_id, cta_label, cta_url on public.studio_agents
for each row execute function public.studio_require_call_to_action_plan();

revoke execute on function public.studio_require_call_to_action_plan() from public, anon, authenticated;
