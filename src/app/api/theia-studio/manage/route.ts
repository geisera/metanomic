import { sameOrigin, parseBody } from '@/lib/knowledge-server';
import { session, rest, ownedAgent, apiKey, gate, failure } from '@/lib/studio/server';
import { knowledgeSourceUrl, agentInput, origins, StudioError, text, uuid, type Agent, type Document } from '@/lib/studio/core';
import { ASSISTANT_TEMPLATES } from '@/lib/studio/templates';
import {canOverrideAssistantKey,type AssistantKeyInfo} from '@/lib/studio/assistant-keys';
import {requireStudioRuntime} from '@/lib/studio/operations';
import { encrypt } from '@/lib/studio/crypto';
export const runtime = 'nodejs';
type Tier={id:string;name:string;assistants:number;websites:number;documents:number};
const json = (v: unknown) => Response.json(v, { headers: { 'Cache-Control': 'no-store' } });
async function validatedKey(value: unknown, owner: string) {
    const key = text(value, 2000, 20);
    if (/\s/.test(key)) throw new StudioError('Paste a valid OpenAI API key.');
    await gate('key:' + owner, 5, 3600);
    const response = await fetch('https://api.openai.com/v1/models', {
        headers: {Authorization:'Bearer '+key}, signal:AbortSignal.timeout(12000), cache:'no-store', redirect:'error'
    });
    if (!response.ok)
        throw new StudioError('OpenAI could not validate this key. Replace it with a valid key that allows model listing.',400,'invalid_key');
    return {ciphertext:encrypt(key,owner),last_four:key.slice(-4),validated_at:new Date().toISOString()};
}
export async function GET(req: Request) { try {
    const s = await session(), id = new URL(req.url).searchParams.get('agent');
    if (id) {
        await ownedAgent(s, id);
        return json({ documents: await rest<Document[]>('studio_documents?agent_id=eq.' + id + '&order=updated_at.desc', { session: s }) });
    }
    const [agents, keys] = await Promise.all([rest<Agent[]>('studio_agents?order=created_at.desc', { session: s }), rest('studio_keys?select=last_four,validated_at', { session: s })]);
    const [tier] = s.impersonatedBy ? await (async()=>{ const [account] = await rest<{tier_id:string}[]>('studio_accounts?owner_id=eq.'+s.user.id+'&select=tier_id',{admin:true}); return rest<Tier[]>('studio_tiers?id=eq.'+(account?.tier_id||'starter'),{admin:true}); })() : await rest<Tier[]>('rpc/studio_account_tier',{session:s});
    const agentFilter = agents.length ? '&agent_id=in.(' + agents.map(agent=>agent.id).join(',') + ')' : '';
    const [usage, documents, limits] = agents.length ? await Promise.all([
        rest('studio_usage?agent_id=in.(' + agents.map(agent=>agent.id).join(',') + ')&day=gte.' + new Date(Date.now()-6*86400000).toISOString().slice(0,10)+'&order=day.asc', {session:s}),
        rest('studio_documents?select=id,agent_id,published' + agentFilter, { session: s }),
        rest<{agent_id:string;message_limit:number;limit_expires_at:string}[]>('studio_assistant_controls?select=agent_id,message_limit,limit_expires_at&limit_expires_at=gt.'+encodeURIComponent(new Date().toISOString()) + agentFilter,{session:s}),
    ]) : [[], [], []];
    const assistantKeys = agents.length
        ? (await rest<AssistantKeyInfo[]>('studio_assistant_keys?select=agent_id,last_four,validated_at,invalidated_at,studio_agents!inner()&studio_agents.owner_id=eq.'+s.user.id, {admin:true})).map(({agent_id,last_four,validated_at,invalidated_at})=>({agent_id,last_four,validated_at,invalidated_at}))
        : [];
    return json({ agents, keys, usage, documents, tier, assistantKeys, limits });
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
        if (s.impersonatedBy && typeof b.action === 'string')
            await rest('studio_staff_audit', { admin:true, body:{ actor_id:s.impersonatedBy, owner_id:s.user.id, action:'impersonated_'+b.action, reason:'Assistant Studio change while viewing as user' }, prefer:'return=minimal' });
        if (b.action === 'key') {
            const key = await validatedKey(b.key,s.user.id);
            await rest('studio_keys?on_conflict=owner_id', { session: s, body: { owner_id: s.user.id, ...key }, prefer: 'resolution=merge-duplicates,return=minimal' });
            return json({ ok: true });
        }
        if (b.action === 'remove-key') {
            await rest('rpc/studio_remove_openai_key', {admin:true,body:{p_owner:s.user.id}});
            return json({ ok: true });
        }
        const [tier] = s.impersonatedBy ? await (async()=>{ const [account] = await rest<{tier_id:string}[]>('studio_accounts?owner_id=eq.'+s.user.id+'&select=tier_id',{admin:true}); return rest<Tier[]>('studio_tiers?id=eq.'+(account?.tier_id||'starter'),{admin:true}); })() : await rest<Tier[]>('rpc/studio_account_tier',{session:s});
        if (b.action === 'create-agent') {
            const existing=await rest<Agent[]>('studio_agents?select=id',{session:s});
            if(existing.length>=tier.assistants)throw new StudioError(`${tier.name} allows ${tier.assistants} assistant(s).`,400,'tier_limit');
            const template=ASSISTANT_TEMPLATES.find(t=>t.id===(b.template||'blank'));
            if(!template)throw new StudioError('Choose a starter template.');
            const rows = await rest<Agent[]>('studio_agents', { session: s, body: { owner_id: s.user.id, name: text(b.name, 80, 1),greeting:template.greeting,instructions:template.instructions } });
            return json({ agent: rows[0] });
        }
        const agent = await ownedAgent(s, b.agent_id);
        if (b.action === 'set-assistant-key' || b.action === 'use-shared-key') {
            if (!canOverrideAssistantKey(tier?.id))
                throw new StudioError('A separate OpenAI key requires Pro or Enterprise.',403,'tier_limit');
            if (b.action === 'set-assistant-key') {
                const key = await validatedKey(b.key,s.user.id);
                await rest('studio_assistant_keys?on_conflict=agent_id', {
                    admin:true, body:{agent_id:agent.id,...key,invalidated_at:null},
                    prefer:'resolution=merge-duplicates,return=minimal'
                });
            } else {
                await rest('rpc/studio_remove_openai_key', {admin:true,body:{p_owner:s.user.id,p_agent:agent.id}});
            }
            return json({ok:true});
        }
        function checkSites(sites:string[]){if(sites.length>tier.websites&&!sites.every(site=>agent.origins.includes(site)))throw new StudioError(`${tier.name} allows ${tier.websites} approved websites per assistant.`,400,'tier_limit');}
        if (b.action === 'save-agent') {
            const valid=agentInput({...b,published:false,origins:agent.origins});
            const input={name:valid.name,greeting:valid.greeting,instructions:valid.instructions,model:valid.model,daily_limit:valid.daily_limit,max_output:valid.max_output,updated_at:valid.updated_at,configured_at:agent.configured_at||new Date().toISOString()};
            const rows = await rest<Agent[]>('studio_agents?id=eq.' + agent.id, { session: s, method: 'PATCH', body: input });
            return json({ agent: rows[0] });
        }
        if (b.action === 'save-origins') {
            const sites=origins(b.origins);checkSites(sites);
            if(agent.published&&!sites.length)throw new StudioError('Add an approved website before publishing.',400,'origin_not_approved');
            const rows=await rest<Agent[]>('studio_agents?id=eq.'+agent.id,{session:s,method:'PATCH',body:{origins:sites,updated_at:new Date().toISOString()}});
            return json({agent:rows[0]});
        }
        if (b.action === 'save-appearance') {
            const repeatAnimation=b.launcher_animation_repeat??agent.launcher_animation_repeat??false;
            if(typeof repeatAnimation!=='boolean')throw new StudioError('Choose a valid launcher repeat setting.');
            const animation=b.launcher_animation??agent.launcher_animation??'off';
            if(animation!=='off'&&animation!=='glow'&&animation!=='pulse')throw new StudioError('Choose a valid launcher animation.');
            const sendDisplay=b.send_display??agent.send_display??'icon';
            if(!['icon','text'].includes(String(sendDisplay)))throw new StudioError('Choose label text or the paper plane icon.');
            const label=text(b.button_label,60,1);
            const pillSide=b.pill_side??agent.pill_side??((agent.button_position||'right').endsWith('left')?'left':'right'),pillAlignment=b.pill_alignment??agent.pill_alignment??(agent.button_position?.startsWith('top-')?'top':'bottom'),pillOffset=b.pill_offset??agent.pill_offset??50,pillOrientation=b.pill_orientation??agent.pill_orientation??'horizontal';
            if(!['left','right'].includes(String(pillSide))||!['top','middle','bottom','custom'].includes(String(pillAlignment))||!['vertical','horizontal'].includes(String(pillOrientation))||typeof pillOffset!=='number'||!Number.isInteger(pillOffset)||pillOffset<0||pillOffset>100)throw new StudioError('Choose a valid pill position and orientation.');
            const tabOffset=b.tab_offset??agent.tab_offset??50;
            if(typeof tabOffset!=='number'||!Number.isInteger(tabOffset)||tabOffset<0||tabOffset>100)throw new StudioError('Choose a position between 0 and 100%.');
            const tabOrientation=b.tab_orientation??agent.tab_orientation??'vertical';
            if(!['vertical','horizontal'].includes(String(tabOrientation)))throw new StudioError('Choose a valid side tab orientation.');
            const launcherStyle=b.launcher_style??agent.launcher_style??'pill',tabSide=b.tab_side??agent.tab_side??'right',tabAlignment=b.tab_alignment??agent.tab_alignment??'middle';
            if(!['pill','side-tab'].includes(String(launcherStyle))||!['left','right'].includes(String(tabSide))||!['top','middle','bottom','custom'].includes(String(tabAlignment)))throw new StudioError('Choose a valid button style and placement.');
            const launcher=b.launcher_color??agent.launcher_color??b.button_color;
            const sendLabel=text(b.send_label??agent.send_label??'Send message',60,1),sendColor=b.send_color??agent.send_color??b.button_color,sendText=b.send_text_color??agent.send_text_color??b.button_text_color,userColor=b.user_message_color??agent.user_message_color??b.button_color;
            const colors=[b.button_color,b.button_text_color,b.button_outline_color,launcher,sendColor,sendText,userColor];
            if(!colors.every(value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value))||!['left','right','top-left','top-right'].includes(String(b.button_position)))throw new StudioError('Choose valid colors and a position.');
            const rows=await rest<Agent[]>('studio_agents?id=eq.'+agent.id,{session:s,method:'PATCH',body:{launcher_animation:animation,launcher_animation_repeat:repeatAnimation,send_display:sendDisplay,pill_side:pillSide,pill_alignment:pillAlignment,pill_offset:pillOffset,pill_orientation:pillOrientation,tab_offset:tabOffset,tab_orientation:tabOrientation,launcher_style:launcherStyle,tab_side:tabSide,tab_alignment:tabAlignment,send_label:sendLabel,send_color:sendColor,send_text_color:sendText,user_message_color:userColor,button_label:label,button_color:b.button_color,launcher_color:launcher,button_text_color:b.button_text_color,button_outline_color:b.button_outline_color,button_position:b.button_position,updated_at:new Date().toISOString()}});
            return json({agent:rows[0]});
        }
        if (b.action === 'save-embed') {
            const sites = origins(b.origins);checkSites(sites);const label = text(b.button_label,60,1);
            if (typeof b.button_color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(b.button_color) || !['left','right'].includes(String(b.button_position))) throw new StudioError('Choose a valid color and position.');
            if (agent.published && !sites.length) throw new StudioError('Add an approved website before publishing.',400,'origin_not_approved');
            const rows = await rest<Agent[]>('studio_agents?id=eq.'+agent.id,{session:s,method:'PATCH',body:{origins:sites,button_label:label,button_color:b.button_color,button_position:b.button_position,updated_at:new Date().toISOString()}});
            return json({agent:rows[0]});
        }
        if (b.action === 'publish') {
            const live=b.published===true;
            if(live){await requireStudioRuntime(agent.id);await apiKey(agent);if(!origins(agent.origins).length)throw new StudioError('Save at least one approved website before publishing.',400,'origin_not_approved');}
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
            if(!b.id){const docs=await rest<Document[]>('studio_documents?select=id&agent_id=eq.'+agent.id,{session:s});if(docs.length>=tier.documents)throw new StudioError(`${tier.name} allows ${tier.documents} knowledge document(s) per assistant.`,400,'tier_limit');}
            const sourceUrl = knowledgeSourceUrl(b.source_url);
            if (b.source_url !== undefined && b.source_url !== null && b.source_url !== '' && !sourceUrl)
                throw new StudioError('Enter a valid public HTTPS source URL.');
            const input = { agent_id: agent.id, ...(b.source_url===undefined?{}:{source_url:sourceUrl}), title: text(b.title, 160, 1), content: text(b.content, 50000, 1), published: b.published === true, updated_at: new Date().toISOString() };
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
