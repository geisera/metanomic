import {starterBillingConfig, stripeSigned, syncStarterSubscription} from '@/lib/studio/starter-billing';

export const runtime = 'nodejs';
const subscriptionEvents = new Set(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted']);

export async function POST(request: Request) {
    const config = starterBillingConfig();
    if (!config) return new Response(null,{status:503});
    const body = await request.text();
    if (body.length > 256000 || !stripeSigned(body,request.headers.get('stripe-signature') ?? '',config.webhook)) {
        return new Response(null,{status:400});
    }
    try {
        const event = JSON.parse(body);
        if (subscriptionEvents.has(event.type)) await syncStarterSubscription(event.data.object.id,config);
        if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
            await syncStarterSubscription(event.data.object.subscription,config);
        }
        return new Response(null,{status:204});
    } catch {
        console.warn('Studio Stripe event could not be synchronized.');
        return new Response(null,{status:503});
    }
}
