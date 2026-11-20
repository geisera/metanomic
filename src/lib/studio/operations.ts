import { isIP } from 'node:net';
import { StudioError } from './core';
import { fingerprint } from './crypto';
import { rest } from './server';

export function domainName(value: string) {
    try {
        const url = new URL(value.startsWith('https://') ? value : 'https://' + value);
        const hostname = url.hostname.replace(/\.$/, '');
        if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || !hostname.includes('.') || !/^[a-z0-9.-]{1,253}$/.test(hostname)) return null;
        return hostname;
    } catch {
        return null;
    }
}

export function addressFingerprint(value: string) {
    const ip = value.trim();
    const version = isIP(ip);
    if (!version || ip.includes('%')) return null;
    const canonical = version === 6 ? new URL('http://[' + ip + ']').hostname : ip;
    return fingerprint('studio-access-block:' + canonical);
}

export function effectiveStudioTier(ownerId: string) {
    return rest<string>('rpc/studio_effective_tier', { admin: true, body: { p_owner: ownerId } });
}

type RuntimePolicy = { suspended: boolean; embed_disabled: boolean; blocked: boolean; message_limit: number };

export async function requireStudioRuntime(agentId: string, options: { origin?: string; request?: Request; dashboard?: boolean } = {}) {
    const { origin, request, dashboard } = options;
    const ip = (request?.headers.get('x-vercel-forwarded-for') ?? request?.headers.get('x-forwarded-for'))?.split(',')[0] ?? '';
    const [policy] = await rest<RuntimePolicy[]>('rpc/studio_runtime_policy', {
        admin: true,
        body: { p_agent: agentId, p_domain: origin ? domainName(origin) : null, p_ip_hash: dashboard ? null : addressFingerprint(ip) },
    });
    if (!policy || policy.suspended || (!dashboard && (policy.embed_disabled || policy.blocked)))
        throw new StudioError(dashboard ? 'This workspace is suspended. Contact Metanomic support.' : 'This assistant is unavailable.', 403, 'studio_access_blocked');
    return policy;
}

export async function recordStudioSupportError(agentId: string, requestId: string, code: string, preview: boolean) {
    await rest('rpc/studio_record_support_error', {
        admin: true, body: { p_agent: agentId, p_request: requestId, p_code: code, p_mode: preview ? 'preview' : 'embed' }
    });
}
