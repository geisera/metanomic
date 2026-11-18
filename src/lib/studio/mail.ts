import { createHash } from 'node:crypto';
import { StudioError, uuid } from './core';
import { siteOrigin, authFetch } from './server';
export async function sendAuthLink(email: string, type: 'signup' | 'recovery' | 'magiclink' | 'email_change_new' | 'email_change_current', password?: string, newEmail?: string, beforeSend?: (accountId: string) => Promise<void>) {
    if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL)
        throw new StudioError('Account email delivery is unavailable.', 503);
    // Supabase’s magiclink generator can create users. Recovery only issues links for existing accounts.
    const r = await authFetch('admin/generate_link', { type: type === 'magiclink' ? 'recovery' : type, email, ...(password ? { password } : {}), ...(newEmail ? { new_email: newEmail } : {}) }, undefined, true);
    if (!r.ok) {
        if ([400, 404, 422].includes(r.status))
            return;
        throw new StudioError('Account verification is unavailable.', 503);
    }
    const d = await r.json();
    const hash = d.hashed_token;
    if (typeof hash !== 'string')
        throw new StudioError('Account verification is unavailable.', 503);
    if (beforeSend) {
        if (!uuid(d.id)) throw new StudioError('Account verification is unavailable.', 503);
        await beforeSend(d.id);
    }
    const link = siteOrigin() + '/assistant-studio/confirm?' + new URLSearchParams({ token_hash: hash, type: type.startsWith('email_change') ? 'email_change' : type });
    const destination = type === 'email_change_new' ? newEmail! : email;
    const subject = type === 'magiclink' ? 'Your Assistant Studio sign-in link' : type === 'recovery' ? 'Reset your Assistant Studio password' : type.startsWith('email_change') ? 'Confirm your Assistant Studio email change' : 'Confirm your Assistant Studio account';
    const send = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'studio-' + createHash('sha256').update(hash + destination).digest('hex') }, body: JSON.stringify({ from: process.env.CONTACT_FROM_EMAIL, to: [destination], subject, text: `${subject}\n\nOpen this link and select ${type === 'magiclink' ? 'Sign in' : 'Confirm'} to continue:\n${link}\n\nThis link expires and can only be used once. If you did not request this, you can ignore this email.\n\nAssistant Studio by Metanomic` }), cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!send.ok)
        throw new StudioError('Verification email could not be sent. Please try again later.', 503);
}
