import { sameOrigin, parseBody } from '@/lib/knowledge-server';
import { StudioError, messages, uuid } from '@/lib/studio/core';
import { session, ownedAgent, runtimeAgent, publishedDocs, apiKey, rest, gate, ipOf, failure } from '@/lib/studio/server';
import { checkWidgetToken } from '@/lib/studio/crypto';
import { answer } from '@/lib/studio/chat';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(req: Request) {
    try {
        if (!sameOrigin(req))
            throw new StudioError('Open this assistant on an approved website.', 403);
        const b = await parseBody(req, 80000);
        if (!b || !uuid(b.agent_id))
            throw new StudioError('Invalid assistant.');
        const conversation = messages(b.messages);
        const ip = ipOf(req);
        let ownerSession;
        let agent;
        if (b.preview === true) {
            ownerSession = await session();
            agent = await ownedAgent(ownerSession, b.agent_id);
        }
        else {
            const token = checkWidgetToken(b.token, b.agent_id, ip);
            agent = await runtimeAgent(b.agent_id);
            if (!agent.origins.includes(token.origin))
                throw new StudioError('This website is no longer approved.', 403);
        }
        await gate('chat:' + agent.id + ':' + ip, 20, 3600);
        const key = await apiKey(agent.owner_id, ownerSession);
        const docs = await publishedDocs(agent, ownerSession);
        if (!await rest<boolean>('rpc/studio_reserve', { admin: true, body: { p_agent: agent.id } }))
            throw new StudioError('This assistant has reached its daily message limit. Please try again tomorrow (UTC).', 429);
        return new Response(await answer(agent, key, conversation, docs, req.signal), { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    catch (e) {
        return failure(e);
    }
}
