import { StudioError } from './core';
import { gate } from './server';

export async function sendSupportEmail(to:string,subject:string,message:string,sendId:string,actor:string) {
    if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL)
        throw new StudioError('Email delivery is unavailable. Contact the project owner.',503);
    await gate('studio-staff-email:'+actor,30,3600);
    const response=await fetch('https://api.resend.com/emails',{
        method:'POST',headers:{
            Authorization:'Bearer '+process.env.RESEND_API_KEY,
            'Content-Type':'application/json','Idempotency-Key':'studio-support-'+sendId,
        },
        body:JSON.stringify({
            from:process.env.CONTACT_FROM_EMAIL,to:[to],subject,
            text:message+'\n\nAssistant Studio by Metanomic',
        }),
        cache:'no-store',signal:AbortSignal.timeout(12000),
    }).catch(()=>{throw new StudioError('Delivery could not be confirmed. Retry this message to check the same send request.',503);});
    const result=await response.json().catch(()=>null);
    if (!response.ok || typeof result?.id!=='string')
        throw new StudioError(response.status===409?'This message changed after a send attempt. Close the composer and start a new email.':'The email service did not confirm delivery. Retry this message or contact the project owner.',503);
    return result.id as string;
}
