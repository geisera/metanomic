import { randomUUID } from 'node:crypto';
import { sameOrigin, parseBody } from '@/lib/knowledge-server';
import { StudioError, messages, uuid, type Agent } from '@/lib/studio/core';
import { session, ownedAgent, runtimeAgent, publishedDocs, apiKey, invalidateAssistantKey, rest, gate, ipOf, failure } from '@/lib/studio/server';
import { checkWidgetToken } from '@/lib/studio/crypto';
import { after } from 'next/server';
import { recordOutcome } from '@/lib/studio/usage';
import { requireStudioRuntime,recordStudioSupportError } from '@/lib/studio/operations';
import { reviewStudioScope } from '@/lib/studio/scope-runtime';
import { answer } from '@/lib/studio/chat';
export const runtime = 'nodejs';
export const maxDuration = 120;

function scriptedReply(reply: string, headers: Record<string, string>, blocked = false) {
    const events = [{ delta: reply }, { done: true, text: reply, sources: [], citations: [],
        ...(blocked ? { blocked: true, tokens: 0 } : {}) }];
    return new Response(events.map(event => JSON.stringify(event) + '\n').join(''), { headers });
}

export async function POST(req: Request) {
    const requestId=randomUUID();
    let agent: Agent | undefined;
    let preview=false;
    try {
        if (!sameOrigin(req))
            throw new StudioError('Open this assistant on an approved website.', 403);
        const b = await parseBody(req, 80000);
        if (!b || !uuid(b.agent_id))
            throw new StudioError('Invalid assistant.');
        const conversation = messages(b.messages);
        const ip = ipOf(req);
        let ownerSession;
        let origin: string | undefined;
        if (b.preview === true) {
            preview=true;
            ownerSession = await session();
            agent = await ownedAgent(ownerSession, b.agent_id);
        }
        else {
            const token = checkWidgetToken(b.token, b.agent_id, ip);
            agent = await runtimeAgent(b.agent_id, false);
            origin=token.origin;
            if (!agent.origins.includes(token.origin))
                throw new StudioError('This website is no longer approved. Update approved websites in Studio.', 403, 'origin_not_approved');
        }
        const policy=await requireStudioRuntime(agent.id,{origin,request:req,dashboard:preview});
        const requestsPerHour = 20;
        await gate(
            `${preview ? 'preview' : 'chat'}:${agent.id}:${ip}`,
            requestsPerHour,
            3600,
            preview
                ? `You’ve reached the Preview limit of ${requestsPerHour} requests per hour for this assistant from your IP address. ` +
                  'Try again one hour after your first request in this window. ' +
                  'Preview has a separate limit from the public widget’s daily quota.'
                : undefined
        );
        const [key, docs] = await Promise.all([apiKey(agent), publishedDocs(agent, ownerSession)]);
        if (!preview && !await rest<boolean>('rpc/studio_reserve', { admin: true, body: { p_agent: agent.id } }))
            throw new StudioError('This assistant has reached its daily message limit. Try again after the next reset.', 429, 'daily_limit');
        const day=new Date().toISOString().slice(0,10);
        const trackedAgent={...agent,daily_limit:policy.message_limit};
        let finish:(success:boolean)=>void=()=>{};
        const outcome=new Promise<boolean>(resolve=>{finish=resolve;});
        let startupFailed=false;
        after(async()=>{
            const success=await outcome;
            try {
                if (!success && !startupFailed) await recordStudioSupportError(trackedAgent.id,requestId,'provider_unavailable',preview);
                if (preview && success && !trackedAgent.first_preview_at) {
                    await rest('studio_agents?id=eq.'+trackedAgent.id+'&first_preview_at=is.null',{admin:true,method:'PATCH',body:{first_preview_at:new Date().toISOString()},prefer:'return=minimal'});
                }
                if (!preview) {
                    await recordOutcome(trackedAgent,day,success);
                    if(success){
                        const now=new Date().toISOString();
                        await rest('studio_agents?id=eq.'+trackedAgent.id+'&or=(last_answer_at.is.null,last_answer_at.lt.'+encodeURIComponent(now)+')',{
                            admin:true,method:'PATCH',body:{last_answer_at:now},prefer:'return=minimal',
                        });
                    }
                }
            } catch { console.error('Studio telemetry could not be recorded'); }
        });
        const headers: Record<string, string> = { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Request-ID': requestId };
        try {
            const scope = await reviewStudioScope(agent, conversation, docs, req.signal);
            if (preview && scope.decision !== 'inactive') headers['X-Studio-Scope'] = scope.decision;
            if (scope.decision === 'suspected_injection' || scope.decision === 'suspected_knowledge_injection') {
                const code = scope.decision;
                after(() => recordStudioSupportError(trackedAgent.id, requestId, code, preview)
                    .catch(() => console.error('Studio support event could not be recorded')));
                finish(true);
                return scriptedReply('I can help with questions about this business. Please rephrase your question or ask about its products, services, or policies.', headers, true);
            }
            if (scope.decision === 'limited' || scope.decision === 'unavailable') {
                const previewMessage = scope.decision === 'limited'
                    ? 'The monthly allowance for prompt injection checks has been reached.'
                    : 'Prompt injection screening is temporarily unavailable. Try again shortly.';
                throw new StudioError(preview ? previewMessage : 'This assistant is temporarily unavailable. Please try again later.',
                    503, scope.decision === 'limited' ? 'prompt_check_limit' : 'prompt_check_unavailable');
            }
            if (scope.decision === 'unrelated' || scope.decision === 'clarify') {
                const reply = scope.decision === 'unrelated'
                    ? 'I can help with questions about this business. What would you like to know about its products, services, or policies?'
                    : 'Could you tell me how that relates to what you’re looking for from this business?';
                finish(true);
                return scriptedReply(reply, headers);
            }
            const stream = await answer(agent, key.value, conversation, docs, req.signal, finish, scope.replyPolicy);
            return new Response(stream, { headers });
        } catch (error) {
            startupFailed=true;
            finish(false);
            if (key.overrideVersion && error instanceof StudioError && error.code === 'invalid_key') {
                await invalidateAssistantKey(agent.id,key.overrideVersion).catch(()=>console.error('Studio could not mark an assistant key invalid'));
                throw new StudioError('This assistant’s OpenAI key is invalid. Replace it in the assistant’s Settings.',503,'assistant_key_invalid');
            }
            throw error;
        }
    }
    catch (e) {
        if (agent) {
            const agentId=agent.id;
            const code=e instanceof StudioError ? e.code || 'studio_unavailable' : 'studio_unavailable';
            after(()=>recordStudioSupportError(agentId,requestId,code,preview).catch(()=>console.error('Studio support event could not be recorded')));
        }
        const response=failure(e);
        response.headers.set('X-Request-ID',requestId);
        return response;
    }
}
