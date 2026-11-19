import { StudioError, uuid } from './core';
import { authFetch, gate, rest, session, setSession, type Session } from './server';

import type { StaffRole } from './admin-contract';
type Factor = { id: string; factor_type: string; status: string; friendly_name?: string };

type Staff = { session: Session; roles: StaffRole[]; factors: Factor[]; verified: boolean };

function isMfaSession(token: string) {
    try {
        return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).aal === 'aal2';
    } catch {
        return false;
    }
}

export async function studioStaff(): Promise<Staff> {
    const signedIn = await session();
    const [staff] = await rest<{ roles: StaffRole[] }[]>('studio_staff?select=roles&user_id=eq.' + signedIn.user.id, { admin: true });
    if (!staff?.roles.length) throw new StudioError('Staff access is required.', 403);
    const factors = (signedIn.user.factors ?? []).filter(factor => factor.factor_type === 'totp' && uuid(factor.id));
    return { session: signedIn, roles: staff.roles, factors, verified: isMfaSession(signedIn.token) && factors.some(factor => factor.status === 'verified') };
}

export function requireStaffMfa(staff: Staff, role?: StaffRole) {
    if (!staff.verified) throw new StudioError('Verify your authenticator code to continue.', 403, 'mfa_required');
    if (role && !staff.roles.includes(role)) throw new StudioError('Your staff role does not allow this action.', 403);
}

export async function enrollStaffMfa(staff: Staff) {
    if (staff.factors.some(factor => factor.status === 'verified'))
        throw new StudioError('Use your existing authenticator.', 409);
    await gate('studio-staff-enroll:' + staff.session.user.id, 4, 3600);
    // Supabase rejects another factor with the same name. Remove an unfinished enrollment before restarting.
    for (const factor of staff.factors.filter(factor => factor.status === 'unverified' && factor.friendly_name === 'Metanomic staff')) {
        if (!(await authFetch('factors/' + factor.id, undefined, staff.session.token, false, 'DELETE')).ok)
            throw new StudioError('Could not restart authenticator setup.', 503);
    }
    const response = await authFetch('factors', { factor_type: 'totp', friendly_name: 'Metanomic staff', issuer: 'Metanomic' }, staff.session.token);
    const data = await response.json().catch(() => null);
    if (!response.ok || !uuid(data?.id) || typeof data?.totp?.secret !== 'string')
        throw new StudioError('Authenticator enrollment is unavailable. Try again or contact the project owner.', 503);
    const svg = typeof data.totp.qr_code === 'string' ? data.totp.qr_code.trim() : '';
    const qrImage = /^(?:<\?xml[^>]*\?>\s*)?<svg(?:\s|>)/.test(svg) ? 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64') : null;
    return { factorId: data.id as string, secret: data.totp.secret as string, qrImage };
}

export async function verifyStaffMfa(staff: Staff, factorId: unknown, code: unknown, stepUp = false) {
    const verifiedFactorExists = staff.factors.some(factor => factor.status === 'verified');
    const factor = staff.factors.find(candidate => candidate.id === factorId);
    if (!factor || ((stepUp || verifiedFactorExists) && factor.status !== 'verified') || typeof code !== 'string' || !/^\d{6}$/.test(code))
        throw new StudioError('Choose your authenticator and enter its six-digit code.', 400);
    await gate('studio-staff-mfa:' + staff.session.user.id, 8, 900);
    const endpoint = 'factors/' + factor.id;
    const challenge = await authFetch(endpoint + '/challenge', {}, staff.session.token);
    const data = await challenge.json().catch(() => null);
    if (!challenge.ok || !uuid(data?.id)) throw new StudioError('Could not start verification. Try again.', 503);
    const response = await authFetch(endpoint + '/verify', { challenge_id: data.id, code }, staff.session.token);
    const credentials = await response.json().catch(() => null);
    if (!response.ok || typeof credentials?.access_token !== 'string' || !isMfaSession(credentials.access_token) || credentials?.user?.id !== staff.session.user.id)
        throw new StudioError('Authenticator code is invalid or expired. Try a new code.', 403, 'invalid_mfa_code');
    await setSession(credentials);
}
