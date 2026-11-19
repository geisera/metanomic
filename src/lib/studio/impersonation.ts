import { createHmac, timingSafeEqual } from 'node:crypto';

export const IMPERSONATION_COOKIE = 'theia_studio_impersonation';
const TTL_SECONDS = 15 * 60;

function secret() {
    const value = process.env.SUPABASE_SECRET_KEY;
    if (!value) throw new Error('Studio impersonation is unavailable.');
    return value;
}

function sign(payload: string) {
    return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function encode(value: unknown) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode<T>(value: string): T | null {
    try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T; }
    catch { return null; }
}

export function issueImpersonation(actorId: string, ownerId: string) {
    const payload = encode({ actorId, ownerId, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS });
    return payload + '.' + sign(payload);
}

export function readImpersonation(value: string | undefined, actorId: string) {
    if (!value) return null;
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return null;
    const expected = sign(payload);
    try {
        if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    } catch { return null; }
    const data = decode<{actorId?: string;ownerId?: string;exp?: number}>(payload);
    if (!data?.actorId || !data.ownerId || data.actorId !== actorId || !data.exp || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return { ownerId: data.ownerId, expiresAt: new Date(data.exp * 1000).toISOString() };
}

export const impersonationTtlSeconds = TTL_SECONDS;
