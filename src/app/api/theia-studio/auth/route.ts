import { cookies } from 'next/headers';
import { sameOrigin, parseBody } from '@/lib/knowledge-server';
import { StudioError, text } from '@/lib/studio/core';
import { session, setSession, clearSession, authFetch, reserveAuthAttempt, ipOf, rest, failure } from '@/lib/studio/server';
import { fingerprint } from '@/lib/studio/crypto';
import { recordStudioTermsAcceptance, signupTerms } from '@/lib/studio/terms';
import { sendAuthLink } from '@/lib/studio/mail';
export const runtime = 'nodejs';
const json = (v: unknown) => Response.json(v, { headers: { 'Cache-Control': 'no-store' } });
const email = (v: unknown) => { const e = text(v, 254, 3).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    throw new StudioError('Enter a valid email.'); return e; };
const password = (v: unknown) => { if (typeof v !== 'string' || v.length < 12 || v.length > 128)
    throw new StudioError('Use a password of 12–128 characters.'); return v; };
export async function GET() { try {
    const s = await session();
    const admins=await rest<unknown[]>('knowledge_admins?user_id=eq.'+s.user.id+'&select=user_id',{session:s});
    return json({user:{id:s.user.id,email:s.user.email,created_at:s.user.created_at,name:s.user.user_metadata?.display_name||'',is_admin:admins.length>0}});
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) {
    try {
        if (!sameOrigin(req))
            throw new StudioError('Cross-origin requests are not permitted.', 403);
        const b = await parseBody(req, 12000);
        if (!b)
            throw new StudioError('Invalid request.');
        await reserveAuthAttempt('auth:' + ipOf(req), 20, 900);
        if (b.action === 'login') {
            const r = await authFetch('token?grant_type=password', { email: email(b.email), password: typeof b.password === 'string' ? b.password : '' });
            if (!r.ok)
                throw new StudioError('Check your email and password, and confirm your email before signing in.', 401);
            await setSession(await r.json());
            return json({ ok: true });
        }
        if (b.action === 'magiclink') {
            const address = email(b.email);
            await sendAuthLink(address, 'magiclink');
            return json({ message: 'If an account can sign in with this email, we’ve sent a sign-in link. Check your inbox and spam folder.' });
        }
        if (b.action === 'signup' || b.action === 'recover') {
            const address = email(b.email);
            const terms = b.action === 'signup' ? await signupTerms() : null;
            if (terms && b.termsVersion !== terms.version)
                throw new StudioError('The terms have changed. Reload this page and review the current version before signing up.', 409);
            if (terms && b.acceptedTerms !== true)
                throw new StudioError('Agree to the Assistant Studio Terms of Service to sign up.');
            await sendAuthLink(address, b.action === 'signup' ? 'signup' : 'recovery', b.action === 'signup' ? password(b.password) : undefined, undefined, terms ? accountId => recordStudioTermsAcceptance(accountId, terms.version) : undefined);
            return json({ message: 'If the address is eligible, a verification email has been sent. Check your inbox and spam folder. Existing accounts can use password recovery.' });
        }
        if (b.action === 'verify') {
            if (!['signup', 'recovery', 'email_change', 'magiclink'].includes(String(b.type)))
                throw new StudioError('Invalid verification type.');
            const r = await authFetch('verify', { token_hash: text(b.token_hash, 500, 10), type: b.type === 'magiclink' ? 'recovery' : b.type });
            if (!r.ok)
                throw new StudioError('This verification link is invalid or expired. Request a new one.');
            const d = await r.json();
            if (b.type === 'magiclink' && !d.access_token)
                throw new StudioError('Sign-in could not be completed. Request a new link.', 401);
            if (d.access_token) {
                await setSession(d);
                if (b.type === 'recovery')
                    (await cookies()).set('theia_studio_recovery', fingerprint('recovery:' + d.user.id + ':' + d.access_token), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 600 });
            }
            return json({ ok: true, recovery: b.type === 'recovery', message: 'Email confirmed. If you changed your email, confirm the link sent to the other address too.' });
        }
        const s = await session();
        if (b.action === 'logout' || b.action === 'logout-all') {
            const r = await authFetch('logout?scope=' + (b.action === 'logout-all' ? 'global' : 'local'), {}, s.token);
            if (!r.ok)
                throw new StudioError('Sign-out failed. Please try again.', 503);
            await clearSession();
            return json({ ok: true });
        }
        if (b.action === 'profile') {
            const r = await authFetch('user', { data: { display_name: text(b.name, 80) } }, s.token, false, 'PUT');
            if (!r.ok)
                throw new StudioError('Profile update failed.');
            return json({ ok: true });
        }
        const recovery = (await cookies()).get('theia_studio_recovery')?.value === fingerprint('recovery:' + s.user.id + ':' + s.token);
        if (!(b.action === 'password' && recovery)) {
            const r = await authFetch('token?grant_type=password', { email: s.user.email, password: typeof b.current_password === 'string' ? b.current_password : '' });
            if (!r.ok)
                throw new StudioError('Your current password is required.', 401);
            const fresh = await r.json();
            if (fresh.user?.id !== s.user.id)
                throw new StudioError('Account verification failed.', 403);
            await authFetch('logout?scope=local', {}, fresh.access_token);
        }
        if (b.action === 'password') {
            const r = await authFetch('user', { password: password(b.password) }, s.token, false, 'PUT');
            if (!r.ok)
                throw new StudioError('Password update failed. Choose a different password.');
            (await cookies()).delete('theia_studio_recovery');
            const out = await authFetch('logout?scope=global', {}, s.token);
            if (!out.ok)
                throw new StudioError('Password changed, but session revocation failed. Sign out from all sessions in Account.', 503);
            await clearSession();
            return json({ signedOut: true, message: 'Password updated. Sign in with your new password.' });
        }
        if (b.action === 'email') {
            const next = email(b.email);
            if (next === s.user.email)
                throw new StudioError('Enter a different email address.');
            await reserveAuthAttempt('email-change:' + s.user.id, 3, 3600);
            await sendAuthLink(s.user.email, 'email_change_current', undefined, next);
            await sendAuthLink(s.user.email, 'email_change_new', undefined, next);
            return json({ message: 'Check both email addresses and confirm the change.' });
        }
        if (b.action === 'delete') {
            if (b.confirm !== 'DELETE')
                throw new StudioError('Type DELETE to confirm.');
            const admins = await rest<unknown[]>('knowledge_admins?user_id=eq.' + s.user.id + '&select=user_id', { session: s });
            if (admins.length)
                throw new StudioError('This shared Metanomic administrator login cannot be deleted here. Remove your Studio assistants and API key instead.', 409);
            const revoke = await authFetch('logout?scope=global', {}, s.token);
            if (!revoke.ok)
                throw new StudioError('Could not revoke sessions. Account deletion stopped.', 503);
            const r = await authFetch('admin/users/' + s.user.id, {}, undefined, true, 'DELETE');
            if (!r.ok)
                throw new StudioError('Account deletion failed. Please sign in and try again.', 503);
            await clearSession();
            return json({ signedOut: true, message: 'Account and Studio data deleted.' });
        }
        throw new StudioError('Unsupported account action.');
    }
    catch (e) {
        return failure(e);
    }
}
