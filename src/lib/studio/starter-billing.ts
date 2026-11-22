import 'server-only';
import {createHmac, timingSafeEqual} from 'node:crypto';
import {StudioError, uuid} from './core';
import {rest} from './server';
import {STARTER_MONTHLY_CENTS, STARTER_TRIAL_DAYS, type StarterAccess} from './starter-plan';

type BillingRow = {
    trial_started_at: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_active: boolean;
    subscription_status: string | null;
};

export function starterBillingEnabled() {
    return process.env.STUDIO_STARTER_BILLING_ENABLED === 'true';
}

export function starterBillingConfig() {
    const key = process.env.STUDIO_STRIPE_SECRET_KEY;
    const price = process.env.STUDIO_STRIPE_STARTER_PRICE_ID;
    const webhook = process.env.STUDIO_STRIPE_WEBHOOK_SECRET;
    return starterBillingEnabled() && key && price && webhook
        ? {key, price, webhook} : null;
}

export async function enrollStarter(owner: string) {
    await rest('studio_starter_billing?on_conflict=owner_id', {
        admin: true, body: {owner_id: owner}, prefer: 'resolution=ignore-duplicates,return=minimal',
    });
}

export async function starterBillingRow(owner: string) {
    const [row] = await rest<BillingRow[]>('studio_starter_billing?select=trial_started_at,stripe_customer_id,stripe_subscription_id,subscription_active,subscription_status&owner_id=eq.' + owner, {admin:true});
    return row;
}

export async function starterAccess(owner: string, tier: string): Promise<StarterAccess | null> {
    if (tier !== 'starter') return null;
    const row = await starterBillingRow(owner);
    if (!row) return null;
    const endsAt = row.trial_started_at
        ? new Date(Date.parse(row.trial_started_at) + STARTER_TRIAL_DAYS * 86400000).toISOString()
        : null;
    const state = row.subscription_active ? 'subscribed' : !endsAt ? 'ready' : Date.parse(endsAt) > Date.now() ? 'trial' : 'expired';
    return {state, endsAt, canManage: Boolean(row.stripe_customer_id && row.stripe_subscription_id),
        canSubscribe: state === 'expired' && !hasOpenStarterSubscription(row)};
}

export function hasOpenStarterSubscription(row: BillingRow | undefined) {
    return Boolean(row?.stripe_subscription_id && !['canceled','incomplete_expired'].includes(row.subscription_status ?? ''));
}

export async function cancelStarterAtRenewal(owner:string) {
    const row=await starterBillingRow(owner);
    if(!row?.stripe_subscription_id || !hasOpenStarterSubscription(row)) throw new StudioError('This account has no open Studio subscription.',409);
    const key=process.env.STUDIO_STRIPE_SECRET_KEY;
    if(!key)throw new StudioError('Stripe billing credentials are unavailable.',503);
    const sub=await stripe<{customer:string;metadata?:{studio_owner?:string};cancel_at_period_end:boolean}>('subscriptions/'+encodeURIComponent(row.stripe_subscription_id),key);
    if(sub.customer!==row.stripe_customer_id || sub.metadata?.studio_owner!==owner)throw new StudioError('Subscription ownership could not be verified.',409);
    if(!sub.cancel_at_period_end)await stripe('subscriptions/'+encodeURIComponent(row.stripe_subscription_id),key,{cancel_at_period_end:'true'});
}

export function startStarterTrial(owner: string) {
    return rest('rpc/studio_start_starter_trial', {admin:true, body:{p_owner:owner}});
}

export function prepareStarterDeletion(owner: string) {
    return rest<boolean>('rpc/studio_prepare_starter_deletion', {admin:true, body:{p_owner:owner}});
}

async function stripe<T>(path: string, key: string, fields?: Record<string,string>, idempotencyKey?: string): Promise<T> {
    const response = await fetch('https://api.stripe.com/v1/' + path, {
        method: fields ? 'POST' : 'GET',
        headers: {Authorization:'Bearer ' + key, 'Content-Type':'application/x-www-form-urlencoded',
            'Stripe-Version':'2025-06-30.basil', ...(idempotencyKey ? {'Idempotency-Key':idempotencyKey} : {})},
        body: fields ? new URLSearchParams(fields) : undefined,
        cache:'no-store', redirect:'error', signal:AbortSignal.timeout(12000),
    }).catch(() => { throw new StudioError('Billing is temporarily unavailable. Please try again.', 503); });
    if (!response.ok) throw new StudioError('Billing is temporarily unavailable. Please try again.', 503);
    return response.json() as Promise<T>;
}

export async function starterCheckout(owner: string, row: BillingRow, returnUrl: string, config: NonNullable<ReturnType<typeof starterBillingConfig>>) {
    const price = await stripe<{active:boolean;currency:string;unit_amount:number;recurring?:{interval:string;interval_count:number}}>('prices/' + encodeURIComponent(config.price), config.key);
    if (!price.active || price.currency !== 'usd' || price.unit_amount !== STARTER_MONTHLY_CENTS ||
        price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) {
        throw new StudioError('Starter checkout is temporarily unavailable.', 503);
    }
    const [reservation] = await rest<{nonce:string;expires_at:string}[]>('rpc/studio_reserve_starter_checkout', {admin:true,body:{p_owner:owner}});
    if (!reservation) throw new StudioError('Checkout is available after your Starter trial ends.', 409);
    let customer = row.stripe_customer_id;
    if (!customer) {
        const created = await stripe<{id:string}>('customers',config.key,{'metadata[studio_owner]':owner},'studio-starter-customer-' + owner);
        customer = created.id;
        await rest('studio_starter_billing?owner_id=eq.' + owner + '&stripe_customer_id=is.null', {
            admin:true, method:'PATCH', body:{stripe_customer_id:customer}, prefer:'return=minimal',
        });
    }
    // Reopen the same Checkout session across browser retries or concurrent clicks.
    const checkout = await stripe<{url:string|null}>('checkout/sessions',config.key,{
        mode:'subscription', customer, 'line_items[0][price]':config.price, 'line_items[0][quantity]':'1',
        'subscription_data[metadata][studio_owner]':owner, expires_at:String(Math.floor(Date.parse(reservation.expires_at)/1000)),
        success_url:returnUrl + '?billing=success', cancel_url:returnUrl + '?billing=canceled',
        'payment_method_types[0]':'card',
    },'studio-starter-checkout-' + reservation.nonce);
    if (!checkout.url) throw new StudioError('Checkout is still settling. Refresh Studio to check your subscription.', 409);
    return checkout.url;
}

export async function starterPortal(customer: string, returnUrl: string, key: string) {
    const portal = await stripe<{url:string}>('billing_portal/sessions',key,{customer,return_url:returnUrl});
    return portal.url;
}

export function stripeSigned(body: string, header: string, secret: string, now = Date.now()) {
    const parts = header.split(',');
    const timestamp = parts.find(part => part.startsWith('t='))?.slice(2);
    if (!timestamp || !/^\d{1,12}$/.test(timestamp) || Math.abs(now/1000 - Number(timestamp)) > 300) return false;
    const expected = createHmac('sha256', secret).update(timestamp + '.' + body).digest();
    return parts.some(part => /^v1=[a-f0-9]{64}$/i.test(part) &&
        timingSafeEqual(expected, Buffer.from(part.slice(3), 'hex')));
}

export async function syncStarterSubscription(id: string, config: NonNullable<ReturnType<typeof starterBillingConfig>>) {
    if (!/^sub_[a-zA-Z0-9]+$/.test(id)) return;
    const started = new Date().toISOString();
    const subscription = await stripe<{customer:string;status:string;metadata?:{studio_owner?:string};
        items?:{data?:{price?:{id?:string}}[]}}>('subscriptions/' + id,config.key);
    const owner = subscription.metadata?.studio_owner;
    if (!uuid(owner) || !/^cus_[a-zA-Z0-9]+$/.test(subscription.customer)) return;
    const row = await starterBillingRow(owner);
    if (!row || row.stripe_customer_id !== subscription.customer) return;
    const expectedPrice = Boolean(subscription.items?.data?.some(item => item.price?.id === config.price));
    const active = subscription.status === 'active' && expectedPrice;
    if (!expectedPrice && row.stripe_subscription_id !== id) return;
    if (row.stripe_subscription_id !== id && hasOpenStarterSubscription(row)) return;
    const fresh = '(subscription_synced_at.is.null,subscription_synced_at.lte.' + started + ')';
    await rest('studio_starter_billing?owner_id=eq.' + owner + '&stripe_customer_id=eq.' + subscription.customer +
        '&or=' + encodeURIComponent(fresh) + (row.stripe_subscription_id ? '&stripe_subscription_id=eq.' + row.stripe_subscription_id : '&stripe_subscription_id=is.null'), {
        admin:true, method:'PATCH', prefer:'return=minimal',
        body:{stripe_subscription_id:id,subscription_active:active,subscription_status:subscription.status,subscription_synced_at:started,
            ...(['canceled','incomplete_expired'].includes(subscription.status) ? {checkout_expires_at:null,checkout_nonce:null} : {})},
    });
}
