import { accountLabel } from '@/lib/studio/account-label';
import { parseBody, sameOrigin } from '@/lib/knowledge-server';
import { actions, accountActions, type AccountAction, type AdminAction, type StudioStats, type Workspace } from '@/lib/studio/admin-contract';
import { enrollStaffMfa, requireStaffMfa, studioStaff, verifyStaffMfa } from '@/lib/studio/admin';
import { changeAccount, listAccounts } from '@/lib/studio/admin-accounts';
import { StudioError, text, uuid } from '@/lib/studio/core';
import { addressFingerprint, domainName } from '@/lib/studio/operations';
import { failure, gate, rest } from '@/lib/studio/server';
import { cookies } from 'next/headers';
import { IMPERSONATION_COOKIE, issueImpersonation, impersonationTtlSeconds } from '@/lib/studio/impersonation';

export const runtime = 'nodejs';
const json = (value: unknown) => Response.json(value, { headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
    try {
        const staff = await studioStaff();
        return json({
            accountLabel: accountLabel(staff.session.user),
            roles: staff.roles,
            verified: staff.verified,
            factors: staff.factors.filter(factor => factor.status === 'verified').map(({id,friendly_name})=>({id, name:friendly_name})),
        });
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request) {
    try {
        if (!sameOrigin(request)) throw new StudioError('Cross-origin requests are not permitted.', 403);
        const body = await parseBody(request, 24000);
        if (!body) throw new StudioError('Invalid request.');
        const staff = await studioStaff();
        const actor = staff.session.user.id;
        if (body.action === 'enroll') return json(await enrollStaffMfa(staff));
        if (body.action === 'verify') {
            await verifyStaffMfa(staff, body.factorId, body.code);
            return json({ok:true});
        }
        requireStaffMfa(staff);
        await gate('studio-staff-action:' + actor, 120, 3600);

        if (body.action === 'impersonate_stop') {
            (await cookies()).set(IMPERSONATION_COOKIE, '', { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/', maxAge:0 });
            (await cookies()).set(IMPERSONATION_COOKIE, '', { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/assistant-studio', maxAge:0 });
            return json({ok:true});
        }
        if (body.action === 'impersonate_start') {
            if (!staff.roles.includes('support') && !staff.roles.includes('operations')) throw new StudioError('Your staff role does not allow View as user.',403);
            if (!uuid(body.ownerId)) throw new StudioError('Choose an account.');
            const reason = text(body.reason,300,3);
            await getWorkspace(actor,body.ownerId);
            await verifyStaffMfa(staff,body.factorId,body.code,true);
            const expiresAt = new Date(Date.now()+impersonationTtlSeconds*1000).toISOString();
            (await cookies()).set(IMPERSONATION_COOKIE, '', { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/assistant-studio', maxAge:0 });
            (await cookies()).set(IMPERSONATION_COOKIE, issueImpersonation(actor,body.ownerId), { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/', maxAge:impersonationTtlSeconds });
            await auditRead(actor,'impersonate_start',reason,body.ownerId);
            return json({ok:true,expiresAt,redirectUrl:'/assistant-studio/dashboard'});
        }

        if (body.action === 'stats') {
            const stats=await rest<StudioStats|null>('rpc/studio_admin_stats',{admin:true,body:{p_actor:actor}});
            if (!stats) throw new StudioError('Staff access is required.',403);
            await auditRead(actor,'view_stats','Studio totals');
            return json(stats);
        }
        if (body.action === 'accounts') return json(await listAccounts(staff,body));
        if (typeof body.action==='string'&&Object.hasOwn(accountActions,body.action))
            return json(await changeAccount(staff,body.action as AccountAction,body));

        if (body.action === 'lookup') {
            const input = text(body.query, 254, 3).toLowerCase();
            const kind = uuid(input) ? 'assistant' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? 'email' : 'domain';
            const query = kind === 'domain' ? domainName(input) : input;
            if (!query) throw new StudioError('Enter an email address, domain, or assistant ID.');
            const results = await rest('rpc/studio_admin_lookup', { admin: true, body: { p_actor:actor, p_kind:kind, p_query:query } });
            await auditRead(actor, 'lookup', 'Search by ' + kind);
            return json({results});
        }
        if (!uuid(body.ownerId)) throw new StudioError('Choose a workspace.');
        const owner = body.ownerId;
        if (body.action === 'workspace') {
            const workspace = await getWorkspace(actor,owner);
            await auditRead(actor,'view_workspace','Support lookup',owner);
            return json({workspace});
        }
        if (typeof body.action !== 'string' || !Object.hasOwn(actions,body.action)) throw new StudioError('Choose a valid action.');
        const action = body.action as AdminAction;
        const rule = actions[action];
        requireStaffMfa(staff,rule.role);
        const reason = text(body.reason,300,3);
        const parameters: Record<string,unknown> = { p_actor:actor,p_owner:owner,p_action:action,p_reason:reason };
        if (action.endsWith('_embed') || action.endsWith('_message_limit')) {
            if (!uuid(body.agentId)) throw new StudioError('Choose an assistant.');
            parameters.p_agent = body.agentId;
        }
        if (action === 'set_plan' || action === 'set_message_limit' || action.startsWith('block_')) {
            const days = Number(body.days);
            if (!Number.isInteger(days) || days < 1 || days > 365) throw new StudioError('Choose an expiry between 1 and 365 days.');
            parameters.p_days = days;
        }
        if (action === 'block_domain' || action === 'block_ip') {
            const value = text(body.value,253,1);
            const normalized = action === 'block_domain' ? domainName(value) : addressFingerprint(value);
            if (!normalized) throw new StudioError(action === 'block_domain' ? 'Enter an exact domain name.' : 'Enter one valid IP address.');
            parameters.p_value = normalized;
        }
        if (action === 'set_plan') parameters.p_value = text(body.value,40,1);
        if (action === 'set_message_limit') {
            const limit = Number(body.value);
            if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new StudioError('Use a daily limit between 1 and 1,000.');
            parameters.p_number = limit;
        }
        if (action === 'remove_block') {
            if (!uuid(body.blockId)) throw new StudioError('Choose a block.');
            parameters.p_block_id = body.blockId;
        }
        if (rule.stepUp) await verifyStaffMfa(staff,body.factorId,body.code,true);
        await rest('rpc/studio_admin_change',{admin:true,body:parameters});
        return json({workspace:await getWorkspace(actor,owner)});
    } catch (error) {
        return failure(error);
    }
}

async function getWorkspace(actor: string, owner: string) {
    const workspace = await rest<Workspace|null>('rpc/studio_admin_workspace',{ admin:true,body:{p_actor:actor,p_owner:owner} });
    if (!workspace) throw new StudioError('Workspace not found.',404);
    workspace.emails=await rest<Workspace['emails']>('studio_email_history?account_id=eq.'+owner+'&order=created_at.desc',{admin:true});
    return workspace;
}

async function auditRead(actor: string, action: string, reason: string, owner?: string) {
    await rest('studio_staff_audit',{admin:true,body:{actor_id:actor,owner_id:owner,action,reason},prefer:'return=minimal'});
}
