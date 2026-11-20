import { accountLabel } from '@/lib/studio/account-label';
import { cookies } from 'next/headers';
import { getKnowledgeConfig } from '@/lib/knowledge-server';
import { StudioError, uuid, origins, type Agent, type Document } from './core';
import { decrypt, fingerprint } from './crypto';
import { IMPERSONATION_COOKIE, readImpersonation } from './impersonation';
export const ACCESS = 'theia_studio_access', REFRESH = 'theia_studio_refresh';
export type Session = {
    token: string;
    impersonatedBy?: string;
    staffLabel?: string;
    impersonationExpiresAt?: string;
    user: {
        id: string;
        email: string;
        created_at?: string;
        factors?: { id: string; factor_type: string; status: string; friendly_name?: string }[];
        user_metadata?: {
            display_name?: string;
        };
    };
};
export const siteOrigin = () => process.env.THEIA_STUDIO_ORIGIN || 'https://metanomic.ai';
function config() { const c = getKnowledgeConfig(); if (!c)
    throw new StudioError('Studio is temporarily unavailable.', 503); return c; }
export function adminKey() { const k = process.env.SUPABASE_SECRET_KEY; if (!k)
    throw new StudioError('Studio is temporarily unavailable.', 503); return k; }
export async function authFetch(path: string, body?: unknown, token?: string, admin = false, method?: string) { const c = config(); return fetch(c.url + '/auth/v1/' + path, { method: method || (body ? 'POST' : 'GET'), headers: { apikey: admin ? adminKey() : c.key, ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(12000) }); }
export async function rest<T = unknown>(path: string, options: {
    session?: Session;
    body?: unknown;
    method?: string;
    admin?: boolean;
    prefer?: string;
    signal?: AbortSignal;
} = {}): Promise<T> { const c = config(); if (!options.admin && !options.session)
    throw new StudioError('Sign in to continue.', 401); const impersonating = Boolean(options.session?.impersonatedBy); let scopedPath = path; if (impersonating && /^studio_agents(?:[?]|$)/.test(scopedPath) && !scopedPath.includes('owner_id=')) scopedPath += (scopedPath.includes('?') ? '&' : '?') + 'owner_id=eq.' + options.session!.user.id; if (impersonating && /^studio_keys(?:[?]|$)/.test(scopedPath) && !scopedPath.includes('owner_id=')) scopedPath += (scopedPath.includes('?') ? '&' : '?') + 'owner_id=eq.' + options.session!.user.id; const r = await fetch(c.url + '/rest/v1/' + scopedPath, { method: options.method || (options.body ? 'POST' : 'GET'), headers: { apikey: options.admin || impersonating ? adminKey() : c.key, ...(options.session && !impersonating ? { Authorization: 'Bearer ' + options.session.token } : {}), 'Content-Type': 'application/json', Prefer: options.prefer || 'return=representation' }, body: options.body ? JSON.stringify(options.body) : undefined, cache: 'no-store', signal: options.signal ?? AbortSignal.timeout(12000) }); if (!r.ok)
    throw new StudioError(r.status === 409 ? 'This change conflicts with existing data.' : r.status === 401 ? 'Please sign in again.' : 'Studio could not save or load this data. Check field limits and try again.', r.status === 401 ? 401 : 502); const t = await r.text(); return (t ? JSON.parse(t) : null) as T; }
export async function setSession(data: Record<string, unknown>) { if (typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string')
    throw new StudioError('Sign-in could not be completed.', 401); const jar = await cookies(); jar.delete('theia_studio_recovery'); const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }; jar.set(ACCESS, data.access_token, { ...opts, maxAge: 3600 }); jar.set(REFRESH, data.refresh_token, { ...opts, maxAge: 30 * 86400 }); }
export async function clearSession() { const jar = await cookies(); jar.delete(ACCESS); jar.delete(REFRESH); jar.delete('theia_studio_recovery'); }
async function validate(token: string): Promise<Session | null> { const r = await authFetch('user', undefined, token); if (!r.ok)
    return null; const u = await r.json(); if (!uuid(u.id) || !u.email_confirmed_at || u.is_anonymous)
    return null; let sid; try {
    sid = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).session_id;
}
catch {
    return null;
} if (!uuid(sid) || !await rest<boolean>('rpc/studio_session_active', { admin: true, body: { p_user: u.id, p_session: sid } }))
    return null; return { token, user: u }; }
export async function session(ignoreImpersonation = false): Promise<Session> { const jar = await cookies(); let token = jar.get(ACCESS)?.value; const current = token ? await validate(token) : null; if (current) {
    const claim = ignoreImpersonation ? null : readImpersonation(jar.get(IMPERSONATION_COOKIE)?.value, current.user.id);
    if (claim) {
        const target = await authFetch('admin/users/' + claim.ownerId, undefined, undefined, true);
        if (target.ok) {
            const user = await target.json();
            if (uuid(user?.id) && user.id === claim.ownerId && user.email_confirmed_at && !user.is_anonymous)
                return { ...current, user, staffLabel: accountLabel(current.user), impersonatedBy: current.user.id, impersonationExpiresAt: claim.expiresAt };
        }
    }
    return current;
} const refresh = jar.get(REFRESH)?.value; if (refresh) {
    const r = await authFetch('token?grant_type=refresh_token', { refresh_token: refresh });
    if (r.ok) {
        const d = await r.json();
        token = d.access_token;
        const valid = token ? await validate(token) : null;
        if (valid) {
            await setSession(d);
            return valid;
        }
    }
} throw new StudioError('Sign in to continue.', 401); }
export const ipOf = (r: Request) => r.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
export async function gate(bucket: string, limit: number, seconds: number, message = 'Too many requests. Please try again later.') {
    const allowed = await rest<boolean>('rpc/studio_gate', {
        admin: true,
        body: { p_bucket: fingerprint(bucket), p_limit: limit, p_seconds: seconds }
    });
    if (!allowed) throw new StudioError(message, 429);
}
export async function reserveAuthAttempt(bucket: string, limit: number, seconds: number) {
    const hashedBucket = fingerprint(bucket);
    const result = await rest<{ expires_at: string; retry_after: number }>('rpc/studio_reserve_auth_attempt', {
        admin: true, body: { p_bucket: hashedBucket, p_limit: limit, p_seconds: seconds }
    });
    if (result.retry_after > 0) {
        const minutes = Math.ceil(result.retry_after / 60);
        throw new StudioError(`Too many requests. Try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`, 429, 'rate_limited', result.retry_after);
    }
    return { bucket: hashedBucket, expiresAt: result.expires_at };
}
export async function releaseAuthAttempt({ bucket, expiresAt }: Awaited<ReturnType<typeof reserveAuthAttempt>>) {
    await rest('rpc/studio_release_auth_attempt', { admin: true, body: { p_bucket: bucket, p_expires_at: expiresAt } });
}
export async function ownedAgent(s: Session, id: unknown) { if (!uuid(id))
    throw new StudioError('Choose an assistant.'); const rows = await rest<Agent[]>('studio_agents?id=eq.' + id + '&limit=1', { session: s }); if (!rows[0])
    throw new StudioError('Assistant not found.', 404); return rows[0]; }
export async function runtimeAgent(id: string, checkKey = true) { if (!uuid(id))
    throw new StudioError('Assistant not found.', 404); const rows = await rest<Agent[]>('studio_agents?id=eq.' + id + '&published=eq.true&limit=1', { admin: true }); if (!rows[0])
    throw new StudioError('This assistant is not published.', 404); rows[0].origins = origins(rows[0].origins); if (checkKey) await resolveAssistantKey(rows[0]); return rows[0]; }
type ResolvedAssistantKey = {
    source: 'shared' | 'override' | 'upgrade_required' | 'override_invalid';
    ciphertext: string | null;
    override_version: string | null;
};

async function resolveAssistantKey(agent: Agent) {
    const [key] = await rest<ResolvedAssistantKey[]>('rpc/studio_resolve_assistant_key', {
        admin: true, body: { p_agent: agent.id, p_owner: agent.owner_id }
    });
    if (key?.source === 'upgrade_required')
        throw new StudioError('This assistant’s OpenAI key requires Pro or Enterprise.', 403, 'assistant_key_upgrade');
    if (key?.source === 'override_invalid')
        throw new StudioError('This assistant’s OpenAI key is invalid. Replace it in the assistant’s Settings.', 503, 'assistant_key_invalid');
    if (!key?.ciphertext)
        throw new StudioError('No API key connected. Connect a key in Model settings to continue.', 503, 'missing_key');
    return {...key, ciphertext: key.ciphertext};
}

export async function apiKey(agent: Agent) {
    const key = await resolveAssistantKey(agent);
    try {
        return {value: decrypt(key.ciphertext, agent.owner_id), overrideVersion: key.override_version};
    } catch (error) {
        if (key.source === 'override')
            throw new StudioError('This assistant’s OpenAI key could not be read. Replace it in the assistant’s Settings.', 503, 'assistant_key_invalid');
        throw error;
    }
}

export async function invalidateAssistantKey(agentId: string, version: string) {
    await rest('studio_assistant_keys?agent_id=eq.'+agentId+'&validated_at=eq.'+encodeURIComponent(version), {
        admin: true, method: 'PATCH', body: {invalidated_at:new Date().toISOString()}, prefer:'return=minimal'
    });
}

export async function publishedDocs(agent: Agent, s?: Session) { return rest<Document[]>('studio_documents?agent_id=eq.' + agent.id + '&published=eq.true&limit=20', s ? { session: s } : { admin: true }); }
export function failure(e: unknown) {
    const error = e instanceof StudioError ? e : new StudioError('Studio is temporarily unavailable. Please try again.', 503);
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    if (error.retryAfter !== undefined) headers.set('Retry-After', String(error.retryAfter));
    return Response.json({ error: error.message, code: error.code }, { status: error.status, headers });
}
