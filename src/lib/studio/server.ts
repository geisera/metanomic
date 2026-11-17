import { cookies } from 'next/headers';
import { getKnowledgeConfig } from '@/lib/knowledge-server';
import { StudioError, uuid, origins, type Agent, type Document } from './core';
import { decrypt, fingerprint } from './crypto';
export const ACCESS = 'theia_studio_access', REFRESH = 'theia_studio_refresh';
export type Session = {
    token: string;
    user: {
        id: string;
        email: string;
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
} = {}): Promise<T> { const c = config(); if (!options.admin && !options.session)
    throw new StudioError('Sign in to continue.', 401); const r = await fetch(c.url + '/rest/v1/' + path, { method: options.method || (options.body ? 'POST' : 'GET'), headers: { apikey: options.admin ? adminKey() : c.key, ...(options.session ? { Authorization: 'Bearer ' + options.session.token } : {}), 'Content-Type': 'application/json', Prefer: options.prefer || 'return=representation' }, body: options.body ? JSON.stringify(options.body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(12000) }); if (!r.ok)
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
export async function session(): Promise<Session> { const jar = await cookies(); let token = jar.get(ACCESS)?.value; const current = token ? await validate(token) : null; if (current)
    return current; const refresh = jar.get(REFRESH)?.value; if (refresh) {
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
export async function gate(bucket: string, limit: number, seconds: number) { if (!await rest<boolean>('rpc/studio_gate', { admin: true, body: { p_bucket: fingerprint(bucket), p_limit: limit, p_seconds: seconds } }))
    throw new StudioError('Too many requests. Please try again later.', 429); }
export async function ownedAgent(s: Session, id: unknown) { if (!uuid(id))
    throw new StudioError('Choose an assistant.'); const rows = await rest<Agent[]>('studio_agents?id=eq.' + id + '&limit=1', { session: s }); if (!rows[0])
    throw new StudioError('Assistant not found.', 404); return rows[0]; }
export async function runtimeAgent(id: string) { if (!uuid(id))
    throw new StudioError('Assistant not found.', 404); const rows = await rest<Agent[]>('studio_agents?id=eq.' + id + '&published=eq.true&limit=1', { admin: true }); if (!rows[0])
    throw new StudioError('This assistant is not published.', 404); rows[0].origins = origins(rows[0].origins); return rows[0]; }
export async function apiKey(owner: string, s?: Session) { const rows = await rest<{
    ciphertext: string;
}[]>('studio_keys?owner_id=eq.' + owner + '&select=ciphertext&limit=1', s ? { session: s } : { admin: true }); if (!rows[0])
    throw new StudioError('The assistant owner needs to connect an OpenAI API key.', 503); return decrypt(rows[0].ciphertext, owner); }
export async function publishedDocs(agent: Agent, s?: Session) { return rest<Document[]>('studio_documents?agent_id=eq.' + agent.id + '&published=eq.true&limit=20', s ? { session: s } : { admin: true }); }
export function failure(e: unknown) { return Response.json({ error: e instanceof StudioError ? e.message : 'Studio is temporarily unavailable. Please try again.' }, { status: e instanceof StudioError ? e.status : 503, headers: { 'Cache-Control': 'no-store' } }); }
