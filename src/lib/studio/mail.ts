import { createHash } from 'node:crypto';
import { StudioError } from './core';
import { siteOrigin, authFetch } from './server';
export async function sendAuthLink(email: string, type: 'signup' | 'recovery' | 'email_change_new' | 'email_change_current', password?: string, newEmail?: string) {
    if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL)
        throw new StudioError('Account email delivery is unavailable.', 503);
    const r = await authFetch('admin/generate_link', { type, email, ...(password ? { password } : {}), ...(newEmail ? { new_email: newEmail } : {}) }, undefined, true);
    if (!r.ok) {
        if ([400, 404, 422].includes(r.status))
            return;
        throw new StudioError('Account verification is unavailable.', 503);
    }
    const d = await r.json();
    const hash = d.hashed_token;
    if (typeof hash !== 'string')
        throw new StudioError('Account verification is unavailable.', 503);
    const link = siteOrigin() + '/theia-studio/confirm?' + new URLSearchParams({ token_hash: hash, type: type.startsWith('email_change') ? 'email_change' : type });
    const destination = type === 'email_change_new' ? newEmail! : email;
    const subject = type === 'recovery' ? 'Reset your Theia Studio password' : type.startsWith('email_change') ? 'Confirm your Theia Studio email change' : 'Confirm your Theia Studio account';
    const send = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'studio-' + createHash('sha256').update(hash + destination).digest('hex') }, body: JSON.stringify({ from: process.env.CONTACT_FROM_EMAIL, to: [destination], subject, text: `${subject}\n\nOpen this link and select Confirm to continue:\n${link}\n\nThis link expires and can only be used once. If you did not request this, you can ignore this email.\n\nTheia Studio by Metanomic` }), cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!send.ok)
        throw new StudioError('Verification email could not be sent. Please try again later.', 503);
}
