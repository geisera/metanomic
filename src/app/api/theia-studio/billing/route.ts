import {sameOrigin, parseBody} from '@/lib/knowledge-server';
import {StudioError} from '@/lib/studio/core';
import {effectiveStudioTier} from '@/lib/studio/operations';
import {failure, gate, session, siteOrigin} from '@/lib/studio/server';
import {hasOpenStarterSubscription, starterBillingConfig, starterBillingRow, starterCheckout, starterPortal} from '@/lib/studio/starter-billing';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        if (!sameOrigin(request)) throw new StudioError('Cross-origin requests are not permitted.',403);
        const config = starterBillingConfig();
        if (!config) throw new StudioError('Starter billing is temporarily unavailable.',503);
        const current = await session();
        if (current.impersonatedBy) throw new StudioError('Billing is available to the account owner.',403);
        const owner = current.user.id;
        const body = await parseBody(request, 2048);
        if (body?.action !== 'checkout' && body?.action !== 'portal') throw new StudioError('Choose a billing action.');
        await gate('starter-billing:' + owner,10,600);
        const row = await starterBillingRow(owner);
        if (!row) throw new StudioError('This account has no Starter subscription to manage.',403);
        const returnUrl = siteOrigin() + '/assistant-studio/dashboard';
        let url: string;
        if (body.action === 'portal') {
            if (!row.stripe_customer_id || !row.stripe_subscription_id) throw new StudioError('Your billing account is not available yet.',409);
            url = await starterPortal(row.stripe_customer_id,returnUrl,config.key);
        } else {
            if (await effectiveStudioTier(owner) !== 'starter') throw new StudioError('This account is already on another plan.',403);
            if (hasOpenStarterSubscription(row)) throw new StudioError('Use Manage billing to update your current subscription.',409);
            url = await starterCheckout(owner,row,returnUrl,config);
        }
        return Response.json({url},{headers:{'Cache-Control':'no-store'}});
    } catch (error) { return failure(error); }
}
