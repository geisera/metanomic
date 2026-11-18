import {after} from 'next/server';
import {track} from '@/lib/navigation-analytics';
import {rest} from './server';
import type {Agent} from './core';

export function scheduleEmbedDetection(agent:Agent) {
    if(agent.first_embed_at)return;
    after(async()=>{
        try{
            const detectedAt=new Date();
            const rows=await rest<{id:string}[]>('studio_agents?id=eq.'+agent.id+'&first_embed_at=is.null&published=eq.true&select=id',{
                admin:true,method:'PATCH',body:{first_embed_at:detectedAt.toISOString()},
            });
            if(rows.length)track('time_to_first_embed',{elapsed_ms:String(detectedAt.getTime()-Date.parse(agent.created_at))});
        }catch{
            console.error('Assistant Studio could not record the first embed milestone.');
        }
    });
}
