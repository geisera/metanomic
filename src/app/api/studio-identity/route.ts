import { session, failure } from '@/lib/studio/server';
import { accountLabel } from '@/lib/studio/account-label';
import { StudioError } from '@/lib/studio/core';

export async function GET() {
    let label: string | null = null;
    let email: string | null = null;
    try {
        const signedIn = await session(true);
        email = signedIn.user.email;
        label = accountLabel(signedIn.user);
    } catch (error) {
        if (!(error instanceof StudioError && error.status === 401)) return failure(error);
    }
    return Response.json({ label, email }, { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' } });
}
