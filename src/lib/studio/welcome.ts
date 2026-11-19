import { rest, siteOrigin } from './server';

function welcomeMessage() {
    const dashboard = new URL('/assistant-studio/dashboard', siteOrigin()).href;
    const subject = 'Welcome to Assistant Studio';
    const question = 'What’s one question your customers ask every week?';
    const instructions = 'Add the answer to your knowledge document, then ask your assistant the same question in Preview.';
    const footer = 'You received this welcome because you verified your Assistant Studio account.';
    return {
        subject,
        text: [subject, question, instructions, 'Open Assistant Studio: ' + dashboard, footer].join('\n\n'),
        html: `<div lang="en" style="max-width:560px;margin:auto;padding:28px;background:#edf4ef;color:#10212b;font:16px/1.6 Arial,sans-serif"><p>Assistant Studio by Metanomic</p><h1 style="font-size:28px">${subject}</h1><p>${question}</p><p>${instructions}</p><p><a href="${dashboard}" style="display:inline-block;padding:12px 20px;background:#c9ec8a;color:#162315;border-radius:8px;font-weight:bold">Open Assistant Studio</a></p><p style="font-size:14px">${footer}</p></div>`,
    };
}

export async function sendStudioWelcome(accountId: string, email: string) {
    const mode = process.env.STUDIO_WELCOME_MODE;
    if (mode !== 'enabled' && !(mode === 'test' && email === process.env.STUDIO_WELCOME_TEST_EMAIL)) return;
    const table = 'studio_welcome_emails';
    const claim = await rest<{account_id: string}[]>(table + '?on_conflict=account_id&select=account_id', {
        admin: true, body: { account_id: accountId }, prefer: 'resolution=ignore-duplicates,return=representation',
    });
    if (!claim.length) return;
    let status = 'failed';
    let providerId: string | null = null;
    let providerStatus: number | null = null;
    const key = process.env.STUDIO_LIFECYCLE_RESEND_API_KEY;
    const from = process.env.STUDIO_LIFECYCLE_FROM_EMAIL;
    if (key && from) {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': 'studio-welcome-' + accountId },
                body: JSON.stringify({ from, to: [email], reply_to: 'support@metanomic.ai', ...welcomeMessage() }),
                cache: 'no-store', signal: AbortSignal.timeout(10000),
            });
            providerStatus = response.status;
            if (response.ok) {
                providerId = (await response.json()).id;
                status = 'accepted';
            }
        } catch {
            status = 'unknown';
        }
    }
    await rest(table + '?account_id=eq.' + accountId, {
        admin: true, method: 'PATCH', prefer: 'return=minimal',
        body: { status, provider_id: providerId, provider_status: providerStatus, updated_at: new Date().toISOString() },
    });
    if (status !== 'accepted') console.error('Studio welcome email', { status, providerStatus });
}
