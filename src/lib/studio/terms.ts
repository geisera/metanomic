import { StudioError } from './core';
import { rest } from './server';

export type StudioTerms = { version: string; body: string };

export async function studioTerms(version: string): Promise<StudioTerms | null> {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(version)) return null;
    const [terms] = await rest<StudioTerms[]>('studio_terms_versions?select=version,body&version=eq.' + version, { admin: true });
    return terms ?? null;
}

export async function recordStudioTermsAcceptance(accountId: string, version: string) {
    await rest('studio_terms_acceptances?on_conflict=account_id,terms_version', {
        admin: true,
        body: { account_id: accountId, terms_version: version },
        prefer: 'resolution=ignore-duplicates,return=minimal',
    });
}

export async function signupTerms() {
    const version = process.env.ASSISTANT_STUDIO_TERMS_VERSION;
    if (!version) return null;
    const terms = await studioTerms(version);
    if (!terms) throw new StudioError('Signup is temporarily unavailable because the terms could not be loaded.', 503);
    return terms;
}
