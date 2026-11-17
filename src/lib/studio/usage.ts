import {authFetch, rest, siteOrigin} from './server';
import type {Agent} from './core';

// Only post-reservation model attempts count as failed attempts. No message text is stored.
export async function recordOutcome(agent:Agent, day:string, success:boolean) {
    if(!success) await rest('rpc/studio_record_failure',{admin:true,body:{p_agent:agent.id,p_day:day}});
    if(!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL) return;
    if(!await rest<boolean>('rpc/studio_claim_alert',{admin:true,body:{p_agent:agent.id,p_day:day}})) return;
    const path='studio_usage?agent_id=eq.'+agent.id+'&day=eq.'+day;
    try {
        const userResponse=await authFetch('admin/users/'+agent.owner_id,undefined,undefined,true);
        if(!userResponse.ok) throw new Error('Account unavailable');
        const user=await userResponse.json();
        if(!user.email || !user.email_confirmed_at) throw new Error('Confirmed address required');
        const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'studio-usage-'+agent.id+'-'+day},body:JSON.stringify({from:process.env.CONTACT_FROM_EMAIL,to:[user.email],subject:'Your assistant has reached 80% of its daily message limit',text:`${agent.name} has reached at least 80% of its daily limit of ${agent.daily_limit} messages.\n\nReview usage or turn off this alert in Theia Studio: ${siteOrigin()}/theia-studio\n\nThis is a message-count alert, not a spending alert. You opted in to these notifications in Studio.`}),signal:AbortSignal.timeout(12000)});
        if(!response.ok) throw new Error('Delivery failed');
        await rest(path,{admin:true,method:'PATCH',body:{alert_sent_at:new Date().toISOString()}});
    } catch {
        // Retry on a later model attempt, using the same email idempotency key.
        await rest(path,{admin:true,method:'PATCH',body:{alert_claimed_at:null}});
    }
}
