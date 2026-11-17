import { sameOrigin, parseBody } from '@/lib/knowledge-server';
import { session, rest, ownedAgent, apiKey, gate, failure } from '@/lib/studio/server';
import { agentInput, StudioError, text, uuid, type Agent, type Document } from '@/lib/studio/core';
import { encrypt } from '@/lib/studio/crypto';
export const runtime = 'nodejs';
const json = (v: unknown) => Response.json(v, { headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) { try {
    const s = await session(), id = new URL(req.url).searchParams.get('agent');
    if (id) {
        await ownedAgent(s, id);
        return json({ documents: await rest<Document[]>('studio_documents?agent_id=eq.' + id + '&order=updated_at.desc', { session: s }) });
    }
    const [agents, keys, usage] = await Promise.all([rest<Agent[]>('studio_agents?order=created_at.desc', { session: s }), rest('studio_keys?select=last_four,validated_at', { session: s }), rest('studio_usage?day=eq.' + new Date().toISOString().slice(0, 10), { session: s })]);
    return json({ agents, keys, usage });
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) {
    try {
        if (!sameOrigin(req))
            throw new StudioError('Cross-origin requests are not permitted.', 403);
        const s = await session();
        await gate('manage:' + s.user.id, 100, 3600);
        const b = await parseBody(req, 240000);
        if (!b)
            throw new StudioError('Invalid or oversized request.');
        if (b.action === 'key') {
            const value = text(b.key, 2000, 20);
            if (/\s/.test(value))
                throw new StudioError('Paste a valid OpenAI API key.');
            await gate('key:' + s.user.id, 5, 3600);
            const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + value }, signal: AbortSignal.timeout(12000), cache: 'no-store', redirect: 'error' });
            if (!r.ok)
                throw new StudioError('OpenAI could not validate this key. Check its validity and model-list permissions.', 400);
            await rest('studio_keys?on_conflict=owner_id', { session: s, body: { owner_id: s.user.id, ciphertext: encrypt(value, s.user.id), last_four: value.slice(-4), validated_at: new Date().toISOString() }, prefer: 'resolution=merge-duplicates,return=minimal' });
            return json({ ok: true });
        }
        if (b.action === 'remove-key') {
            await rest('studio_agents?owner_id=eq.' + s.user.id, { session: s, method: 'PATCH', body: { published: false } });
            await rest('studio_keys?owner_id=eq.' + s.user.id, { session: s, method: 'DELETE' });
            return json({ ok: true });
        }
        if (b.action === 'create-agent') {
            const rows = await rest<Agent[]>('studio_agents', { session: s, body: { owner_id: s.user.id, name: text(b.name, 80, 1) } });
            return json({ agent: rows[0] });
        }
        const agent = await ownedAgent(s, b.agent_id);
        if (b.action === 'save-agent') {
            const input = agentInput(b);
            if (input.published)
                await apiKey(s.user.id, s);
            const rows = await rest<Agent[]>('studio_agents?id=eq.' + agent.id, { session: s, method: 'PATCH', body: input });
            return json({ agent: rows[0] });
        }
        if (b.action === 'unpublish') {
            await rest('studio_agents?id=eq.' + agent.id, { session: s, method: 'PATCH', body: { published: false, updated_at: new Date().toISOString() } });
            return json({ ok: true });
        }
        if (b.action === 'delete-agent') {
            await rest('studio_agents?id=eq.' + agent.id, { session: s, method: 'DELETE' });
            return json({ ok: true });
        }
        if (b.action === 'save-document') {
            const input = { agent_id: agent.id, title: text(b.title, 160, 1), content: text(b.content, 50000, 1), published: b.published === true, updated_at: new Date().toISOString() };
            if (b.id !== undefined && !uuid(b.id))
                throw new StudioError('Invalid document.');
            const rows = await rest<Document[]>('studio_documents' + (b.id ? '?id=eq.' + b.id + '&agent_id=eq.' + agent.id : ''), { session: s, method: b.id ? 'PATCH' : 'POST', body: input });
            if (!rows[0])
                throw new StudioError('Document not found.', 404);
            return json({ document: rows[0] });
        }
        if (b.action === 'delete-document') {
            if (!uuid(b.id))
                throw new StudioError('Invalid document.');
            await rest('studio_documents?id=eq.' + b.id + '&agent_id=eq.' + agent.id, { session: s, method: 'DELETE' });
            return json({ ok: true });
        }
        throw new StudioError('Unsupported action.');
    }
    catch (e) {
        return failure(e);
    }
}
