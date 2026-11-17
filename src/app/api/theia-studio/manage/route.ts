import { sameOrigin, parseBody } from '@/lib/knowledge-server';
import { session, rest, ownedAgent, apiKey, gate, failure } from '@/lib/studio/server';
import { agentInput, origins, StudioError, text, uuid, type Agent, type Document } from '@/lib/studio/core';
import { ASSISTANT_TEMPLATES } from '@/lib/studio/templates';
import { encrypt } from '@/lib/studio/crypto';
export const runtime = 'nodejs';
const json = (v: unknown) => Response.json(v, { headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) { try {
    const s = await session(), id = new URL(req.url).searchParams.get('agent');
    if (id) {
        await ownedAgent(s, id);
        return json({ documents: await rest<Document[]>('studio_documents?agent_id=eq.' + id + '&order=updated_at.desc', { session: s }) });
    }
    const [agents, keys, usage, documents] = await Promise.all([rest<Agent[]>('studio_agents?order=created_at.desc', { session: s }), rest('studio_keys?select=last_four,validated_at', { session: s }), rest('studio_usage?day=gte.' + new Date(Date.now()-6*86400000).toISOString().slice(0,10)+'&order=day.asc', {session:s}), rest('studio_documents?select=id,agent_id,published', {session:s})]);
    return json({ agents, keys, usage, documents });
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
                throw new StudioError('OpenAI could not validate this key. Replace it with a valid key that allows model listing.', 400, 'invalid_key');
            await rest('studio_keys?on_conflict=owner_id', { session: s, body: { owner_id: s.user.id, ciphertext: encrypt(value, s.user.id), last_four: value.slice(-4), validated_at: new Date().toISOString() }, prefer: 'resolution=merge-duplicates,return=minimal' });
            return json({ ok: true });
        }
        if (b.action === 'remove-key') {
            await rest('studio_agents?owner_id=eq.' + s.user.id, { session: s, method: 'PATCH', body: { published: false } });
            await rest('studio_keys?owner_id=eq.' + s.user.id, { session: s, method: 'DELETE' });
            return json({ ok: true });
        }
        if (b.action === 'create-agent') {
            const template=ASSISTANT_TEMPLATES.find(t=>t.id===(b.template||'blank'));
            if(!template)throw new StudioError('Choose a starter template.');
            const rows = await rest<Agent[]>('studio_agents', { session: s, body: { owner_id: s.user.id, name: text(b.name, 80, 1),greeting:template.greeting,instructions:template.instructions } });
            return json({ agent: rows[0] });
        }
        const agent = await ownedAgent(s, b.agent_id);
        if (b.action === 'save-agent') {
            const valid=agentInput({...b,published:false,origins:agent.origins});
            const input={name:valid.name,greeting:valid.greeting,instructions:valid.instructions,model:valid.model,daily_limit:valid.daily_limit,max_output:valid.max_output,updated_at:valid.updated_at,configured_at:agent.configured_at||new Date().toISOString()};
            const rows = await rest<Agent[]>('studio_agents?id=eq.' + agent.id, { session: s, method: 'PATCH', body: input });
            return json({ agent: rows[0] });
        }
        if (b.action === 'save-origins') {
            const sites=origins(b.origins);
            if(agent.published&&!sites.length)throw new StudioError('Add an approved website before publishing.',400,'origin_not_approved');
            const rows=await rest<Agent[]>('studio_agents?id=eq.'+agent.id,{session:s,method:'PATCH',body:{origins:sites,updated_at:new Date().toISOString()}});
            return json({agent:rows[0]});
        }
        if (b.action === 'save-appearance') {
            const label=text(b.button_label,60,1);
            const launcherStyle=b.launcher_style??agent.launcher_style??'pill',tabSide=b.tab_side??agent.tab_side??'right',tabAlignment=b.tab_alignment??agent.tab_alignment??'middle';
            if(!['pill','side-tab'].includes(String(launcherStyle))||!['left','right'].includes(String(tabSide))||!['top','middle','bottom'].includes(String(tabAlignment)))throw new StudioError('Choose a valid button style and placement.');
            const launcher=b.launcher_color??agent.launcher_color??b.button_color;
            const sendLabel=text(b.send_label??agent.send_label??'Send message',60,1),sendColor=b.send_color??agent.send_color??b.button_color,sendText=b.send_text_color??agent.send_text_color??b.button_text_color,userColor=b.user_message_color??agent.user_message_color??b.button_color;
            const colors=[b.button_color,b.button_text_color,b.button_outline_color,launcher,sendColor,sendText,userColor];
            if(!colors.every(value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value))||!['left','right','top-left','top-right'].includes(String(b.button_position)))throw new StudioError('Choose valid colors and a position.');
            const rows=await rest<Agent[]>('studio_agents?id=eq.'+agent.id,{session:s,method:'PATCH',body:{launcher_style:launcherStyle,tab_side:tabSide,tab_alignment:tabAlignment,send_label:sendLabel,send_color:sendColor,send_text_color:sendText,user_message_color:userColor,button_label:label,button_color:b.button_color,launcher_color:launcher,button_text_color:b.button_text_color,button_outline_color:b.button_outline_color,button_position:b.button_position,updated_at:new Date().toISOString()}});
            return json({agent:rows[0]});
        }
        if (b.action === 'save-embed') {
            const sites = origins(b.origins), label = text(b.button_label,60,1);
            if (typeof b.button_color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(b.button_color) || !['left','right'].includes(String(b.button_position))) throw new StudioError('Choose a valid color and position.');
            if (agent.published && !sites.length) throw new StudioError('Add an approved website before publishing.',400,'origin_not_approved');
            const rows = await rest<Agent[]>('studio_agents?id=eq.'+agent.id,{session:s,method:'PATCH',body:{origins:sites,button_label:label,button_color:b.button_color,button_position:b.button_position,updated_at:new Date().toISOString()}});
            return json({agent:rows[0]});
        }
        if (b.action === 'publish') {
            const live=b.published===true;
            if(live){await apiKey(s.user.id,s);if(!origins(agent.origins).length)throw new StudioError('Save at least one approved website before publishing.',400,'origin_not_approved');}
            const first=live&&!agent.published&&!agent.first_published_at;
            const rows=await rest<Agent[]>('studio_agents?id=eq.'+agent.id,{session:s,method:'PATCH',body:{published:live,first_published_at:live?(agent.first_published_at||new Date().toISOString()):agent.first_published_at,updated_at:new Date().toISOString()}});
            return json({agent:rows[0],first_publish:first});
        }
        if (b.action === 'usage-alert') {
            const rows=await rest<Agent[]>('studio_agents?id=eq.'+agent.id,{session:s,method:'PATCH',body:{usage_alert:b.enabled===true,updated_at:new Date().toISOString()}});
            return json({agent:rows[0]});
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
