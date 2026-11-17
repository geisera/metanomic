import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { StudioError } from './core';
function key() { const k = Buffer.from(process.env.THEIA_STUDIO_ENCRYPTION_KEY || '', 'base64'); if (k.length !== 32)
    throw new StudioError('Studio credential storage is not configured.', 503); return k; }
export function encrypt(secret: string, owner: string) { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key(), iv); c.setAAD(Buffer.from(owner)); const data = Buffer.concat([c.update(secret, 'utf8'), c.final()]); return [iv, c.getAuthTag(), data].map(x => x.toString('base64url')).join('.'); }
export function decrypt(value: string, owner: string) { try {
    const [iv, tag, data] = value.split('.').map(x => Buffer.from(x, 'base64url'));
    const d = createDecipheriv('aes-256-gcm', key(), iv);
    d.setAAD(Buffer.from(owner));
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString('utf8');
}
catch {
    throw new StudioError('The stored API key could not be read. Replace it in account settings.', 503);
} }
export const fingerprint = (value: string) => createHmac('sha256', key()).update(value).digest('hex');
export function widgetToken(agent: string, origin: string, ip: string) { const data = Buffer.from(JSON.stringify({ agent, origin, ip: fingerprint(ip), expires: Date.now() + 3600000 })).toString('base64url'); return data + '.' + fingerprint('widget:' + data); }
export function checkWidgetToken(token: unknown, agent: string, ip: string): {
    origin: string;
} { try {
    if (typeof token !== 'string' || token.length > 2000)
        throw 0;
    const [data, sig] = token.split('.');
    const expected = fingerprint('widget:' + data);
    if (!sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
        throw 0;
    const p = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (p.agent !== agent || p.ip !== fingerprint(ip) || p.expires < Date.now() || typeof p.origin !== 'string')
        throw 0;
    return { origin: p.origin };
}
catch {
    throw new StudioError('This widget session expired. Reload the widget.', 403);
} }
