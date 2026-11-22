import {currentPolicy} from '@/lib/studio/terms';
import { emailSteps } from '@/lib/studio/email-template';
import { scopePromptInput, scopeConfigInput, type ScopeAdminConfig } from '@/lib/studio/scope-control';
import { accountLabel } from '@/lib/studio/account-label';
import { parseBody, sameOrigin } from '@/lib/knowledge-server';
import { actions, accountActions, promptGuardAuditActions, type AccountAction, type AdminAction, type PromptGuardAuditAction, type PromptGuardAuditCursor, type PromptGuardAuditPage, type StudioStats, type Workspace } from '@/lib/studio/admin-contract';
import { enrollStaffMfa, requireStaffMfa, studioStaff, verifyStaffMfa } from '@/lib/studio/admin';
import { changeAccount, listAccounts } from '@/lib/studio/admin-accounts';
import { StudioError, text, uuid } from '@/lib/studio/core';
import { addressFingerprint, domainName } from '@/lib/studio/operations';
import { authFetch, failure, gate, rest } from '@/lib/studio/server';
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
        const body = await parseBody(request, 200000);
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

        if(body.action==='site_policy'||body.action==='publish_site_policy'){
            requireStaffMfa(staff,'operations');
            if(body.kind!=='terms' && body.kind!=='privacy')throw new StudioError('Select a policy.');
            if(body.action==='publish_site_policy'){
                const version=await rest<string|null>('rpc/publish_site_policy',{admin:true,body:{p_actor:actor,p_kind:body.kind,
                    p_version:text(body.version,64,1),p_body:text(body.content,48000,1),p_reason:text(body.reason,300,3)}});
                if(!version)throw new StudioError('This policy changed. Copy your edits and reopen the editor.',409);
            }
            return json(await currentPolicy(body.kind));
        }
        if (body.action === 'email_templates' || body.action === 'save_email_template') {
            requireStaffMfa(staff, 'operations');
            if (body.action === 'email_templates') return json(await rest('studio_email_templates?select=step,subject,body,label,version', { admin:true }));
            if (typeof body.step !== 'string' || !Object.hasOwn(emailSteps,body.step) || !Number.isSafeInteger(body.version))
                throw new StudioError('Choose a current email template.');
            const subject = text(body.subject,150,1);
            const label = text(body.label,80,1);
            if (/[\r\n]/.test(subject+label)) throw new StudioError('Use one line for the subject and button label.');
            const version = await rest<number|null>('rpc/studio_save_email_template',{admin:true,body:{
                p_actor:actor,p_step:body.step,p_version:body.version,p_subject:subject,p_body:text(body.body,4000,1),
                p_label:label,p_reason:text(body.reason,300,3),
            }});
            if (version === null) throw new StudioError('Another editor saved this template. Copy your edits and reopen Email templates.',409);
            return json({version});
        }
        if (body.action === 'prompt_guard_history') {
            requireStaffMfa(staff, 'operations');
            return json(await promptGuardHistory(body.before, staff.session.user));
        }

        if (body.action === 'scope_config' || body.action === 'save_scope_config' || body.action === 'save_guard_prompt' || body.action === 'save_topic_prompt') {
            requireStaffMfa(staff, 'operations');
            if (body.action === 'save_guard_prompt' || body.action === 'save_topic_prompt') {
                if (typeof body.version !== 'number' || !Number.isSafeInteger(body.version) || body.version < 1 || body.version >= 2147483647)
                    throw new StudioError('Reload Prompt Guard to get the current prompt version.');
                const prompt = scopePromptInput(body.prompt);
                const rpc = body.action === 'save_guard_prompt' ? 'rpc/studio_save_guard_prompt' : 'rpc/studio_save_topic_prompt';
                const version = await rest<number | null>(rpc, { admin: true, body: {
                    p_actor: actor, p_prompt: prompt, p_version: body.version, p_reason: text(body.reason, 300, 3),
                } });
                if (version === null) throw new StudioError('These instructions were updated elsewhere. Copy your edits, then reopen Prompt Guard to load the latest version.', 409);
                return json({ prompt, version });
            }
            if (body.action === 'save_scope_config') {
                await rest('rpc/studio_save_scope_config', { admin: true, body: {
                    p_actor: actor, p_settings: scopeConfigInput(body), p_reason: text(body.reason, 300, 3),
                } });
                return json({ ok: true });
            }
            const [config] = await rest<ScopeAdminConfig[]>('studio_scope_config?select=model,enabled,pro_monthly,enterprise_monthly,global_monthly,timeout_ms,guard_prompt,guard_prompt_version,topic_prompt,topic_prompt_version&id=eq.true', { admin: true });
            if (!config) throw new StudioError('Prompt Guard configuration is unavailable.', 503);
            return json(config);
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

async function promptGuardHistory(cursor: unknown, user: {id: string; email: string}): Promise<PromptGuardAuditPage> {
    const pageSize = 20;
    const query = new URLSearchParams({
        select: 'id,created_at,actor_id,action,reason,before_state,after_state',
        owner_id: 'is.null',
        action: 'in.(' + Object.keys(promptGuardAuditActions).join(',') + ')',
        order: 'created_at.desc,id.desc',
        limit: String(pageSize + 1),
    });
    if (cursor !== undefined) {
        const before = cursor as Partial<PromptGuardAuditCursor> | null;
        if (!before || !uuid(before.id) || typeof before.created_at !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(before.created_at) ||
            !Number.isFinite(Date.parse(before.created_at))) {
            throw new StudioError('Invalid history cursor.');
        }
        query.set('or', `(created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id}))`);
    }
    type Row = PromptGuardAuditCursor & { actor_id: string; action: PromptGuardAuditAction; reason: string;
        before_state: Record<string, unknown> | null; after_state: Record<string, unknown> | null };
    const rows = await rest<Row[]>('studio_staff_audit?' + query, { admin: true });
    const page = rows.slice(0, pageSize);
    const actors = await Promise.all([...new Set(page.map(row => row.actor_id))].map(async id => {
        if (id === user.id && user.email) return [id, user.email] as const;
        try {
            const response = await authFetch('admin/users/' + id, undefined, undefined, true);
            if (response.ok) {
                const data = await response.json();
                if (typeof data.email === 'string' && data.email) return [id, data.email] as const;
            }
        } catch { /* The audit record remains readable if staff lookup fails. */ }
        return [id, id] as const;
    }));
    const actorById = new Map(actors);
    const entries = page.map(row => ({
        id: row.id,
        created_at: row.created_at,
        actor: actorById.get(row.actor_id) ?? row.actor_id,
        action: row.action,
        reason: row.reason,
        changes: Object.entries(promptGuardAuditActions[row.action].fields).flatMap(([key, label]) => {
            const before = row.before_state?.[key] ?? null;
            const after = row.after_state?.[key] ?? null;
            return before === after ? [] : [{ label, before, after }];
        }),
    }));
    const last = page.at(-1);
    return { entries, next: rows.length > pageSize && last ? { id: last.id, created_at: last.created_at } : null };
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
