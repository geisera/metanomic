create table public.studio_starter_billing (
    owner_id uuid primary key references auth.users(id) on delete cascade,
    trial_started_at timestamptz,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    subscription_active boolean not null default false,
    subscription_status text,
    subscription_synced_at timestamptz,
    checkout_nonce uuid,
    checkout_expires_at timestamptz,
    deletion_requested_at timestamptz
);

alter table public.studio_starter_billing enable row level security;
revoke all on public.studio_starter_billing from public, anon, authenticated, service_role;
grant select, insert, update on public.studio_starter_billing to service_role;

-- Update only once per account, independent of assistant lifetime or concurrent previews.
create function public.studio_start_starter_trial(p_owner uuid)
returns void language sql security invoker set search_path = '' as $$
    update public.studio_starter_billing set trial_started_at = now()
    where owner_id = p_owner and trial_started_at is null and not subscription_active
        and public.studio_effective_tier(p_owner) = 'starter';
$$;

create function public.studio_reserve_starter_checkout(p_owner uuid)
returns table (nonce uuid, expires_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare billing public.studio_starter_billing;
begin
    select * into billing from public.studio_starter_billing where owner_id = p_owner for update;
    if not found or billing.subscription_active or public.studio_effective_tier(p_owner) <> 'starter' or
       billing.deletion_requested_at > now() - interval '2 minutes' or
       billing.trial_started_at is null or billing.trial_started_at + interval '336 hours' > now() or
       (billing.stripe_subscription_id is not null and coalesce(billing.subscription_status,'') not in ('canceled','incomplete_expired')) then return; end if;
    if billing.checkout_expires_at is null or billing.checkout_expires_at <= now() then
        update public.studio_starter_billing
        set checkout_nonce = gen_random_uuid(), checkout_expires_at = date_trunc('second', now()) + interval '2 hours'
        where owner_id = p_owner returning * into billing;
    end if;
    return query select billing.checkout_nonce, billing.checkout_expires_at;
end;
$$;

-- Briefly prevent a new checkout while account deletion revokes sessions and deletes the user.
create function public.studio_prepare_starter_deletion(p_owner uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare billing public.studio_starter_billing;
begin
    select * into billing from public.studio_starter_billing where owner_id = p_owner for update;
    if not found then return true; end if;
    if billing.checkout_expires_at > now() or (billing.stripe_subscription_id is not null and
       coalesce(billing.subscription_status,'') not in ('canceled','incomplete_expired')) then return false; end if;
    update public.studio_starter_billing set deletion_requested_at = now() where owner_id = p_owner;
    return true;
end;
$$;

revoke all on function public.studio_start_starter_trial(uuid), public.studio_reserve_starter_checkout(uuid), public.studio_prepare_starter_deletion(uuid) from public, anon, authenticated;
grant execute on function public.studio_start_starter_trial(uuid), public.studio_reserve_starter_checkout(uuid), public.studio_prepare_starter_deletion(uuid) to service_role;
notify pgrst, 'reload schema';

do $migration$
declare
    previous_body text;
    prior_offer constant text := 'The free Starter plan is available subject to the limits shown in Studio or on the pricing page.';
    paid_offer constant text := $terms$New Starter accounts receive a 14-day free trial beginning after their first successful Preview reply. No payment method is required to start. When the trial ends, the live widget pauses. Studio retains the assistant's settings and knowledge so the customer can subscribe and resume the widget.

Starter costs US$5 per month and renews monthly until canceled. Payment begins only when the customer expressly subscribes through checkout. Customers can manage or cancel their subscription through Manage billing in Studio. OpenAI usage fees are billed separately by OpenAI. Starter accounts grandfathered under the earlier free offer retain that offer.$terms$;
begin
    select body into strict previous_body from public.studio_terms_versions where version = '2026-11-21-c';
    if position(prior_offer in previous_body) = 0 then
        raise exception 'Unexpected source text for the Starter terms';
    end if;
    insert into public.studio_terms_versions (version, body) values ('starter-subscription-v1',
        replace(replace(previous_body, 'Effective date: November 21, 2026',
            'Effective when the Starter subscription offer launches.'), prior_offer, paid_offer));
end;
$migration$;
