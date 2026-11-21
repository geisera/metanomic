import {sameOrigin,parseBody} from '@/lib/knowledge-server';
import {StudioError,uuid} from '@/lib/studio/core';
import {checkWidgetToken} from '@/lib/studio/crypto';
import {assistantCallToAction} from '@/lib/studio/call-to-action';
import {requireStudioRuntime} from '@/lib/studio/operations';
import {rest,runtimeAgent,gate,ipOf,failure} from '@/lib/studio/server';

export async function POST(req:Request) {
    try {
        if(!sameOrigin(req))throw new StudioError('Invalid origin.',403);
        const body=await parseBody(req,4096);
        if(!body||!uuid(body.agent_id))throw new StudioError('Invalid assistant.');
        const ip=ipOf(req);
        const {origin}=checkWidgetToken(body.token,body.agent_id,ip);
        const agent=await runtimeAgent(body.agent_id,false);
        if(!agent.origins.includes(origin)||!assistantCallToAction(agent))throw new StudioError('Unavailable.',403);
        await gate('report-click:'+agent.id+':'+ip,60,3600);
        await requireStudioRuntime(agent.id,{origin,request:req});
        await rest('rpc/studio_report_event',{admin:true,body:{p_agent:agent.id,p_topic:null,p_tone:null}});
        return new Response(null,{status:204});
    } catch(error){return failure(error);}
}
