import { sameOrigin, parseBody } from '@/lib/knowledge-server';
import { StudioError, messages, uuid } from '@/lib/studio/core';
import { session, ownedAgent, runtimeAgent, publishedDocs, apiKey, invalidateAssistantKey, rest, gate, ipOf, failure } from '@/lib/studio/server';
import { checkWidgetToken } from '@/lib/studio/crypto';
import { after } from 'next/server';
import { recordOutcome } from '@/lib/studio/usage';
import { answer } from '@/lib/studio/chat';
export const runtime = 'nodejs';
export const maxDuration = 120;
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
            agent = await runtimeAgent(b.agent_id, false);
            if (!agent.origins.includes(token.origin))
                throw new StudioError('This website is no longer approved. Update approved websites in Studio.', 403, 'origin_not_approved');
        }
        await gate((ownerSession?'preview:':'chat:') + agent.id + ':' + ip, 20, 3600);
        const key = await apiKey(agent);
        const docs = await publishedDocs(agent, ownerSession);
        let finish:(success:boolean)=>void=()=>{};
        // Only authenticated, ownership-checked Preview requests bypass visitor usage.
        if(!ownerSession){
            if (!await rest<boolean>('rpc/studio_reserve', { admin: true, body: { p_agent: agent.id } }))
                throw new StudioError('This assistant has reached its daily message limit. Try again after the next reset.', 429, 'daily_limit');
            const day=new Date().toISOString().slice(0,10);
            const outcome=new Promise<boolean>(resolve=>{finish=resolve;});
            after(async()=>{try{await recordOutcome(agent,day,await outcome);}catch{console.error('Studio usage reporting failed');}});
        }
        let stream;
        try {
            stream = await answer(agent,key.value,conversation,docs,req.signal,finish);
        } catch (error) {
            finish(false);
            if (key.overrideVersion && error instanceof StudioError && error.code === 'invalid_key') {
                await invalidateAssistantKey(agent.id,key.overrideVersion).catch(()=>console.error('Studio could not mark an assistant key invalid'));
                throw new StudioError('This assistant’s OpenAI key is invalid. Replace it in the assistant’s Settings.',503,'assistant_key_invalid');
            }
            throw error;
        }
        return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    catch (e) {
        return failure(e);
    }
}
