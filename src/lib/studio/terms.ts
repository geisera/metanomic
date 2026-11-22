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

export type PolicyKind = 'terms'|'privacy';
export async function currentPolicy(kind:PolicyKind) {
    const [row]=await rest<(StudioTerms & {published_at:string})[]>('site_policies?select=version,body,published_at&kind=eq.'+kind,{admin:true});
    if(!row)throw new StudioError('The policy is temporarily unavailable.',503);
    return row;
}
export function signupTerms(){return currentPolicy('terms');}
