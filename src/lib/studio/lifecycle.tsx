import { Html, Head, Preview, Body, Container, Text, Heading, Button, Link } from '@react-email/components';
import { render } from '@react-email/render';
import { fingerprint } from './crypto';
import { rest, siteOrigin } from './server';

import type { EmailTemplate, Step } from './email-template';
export type { Step } from './email-template';

export async function sendLifecycle(account: string, email: string, step: Step, agent?: string) {
 const kind = step === 'welcome' ? 'welcome' : 'reminder';
 const from = process.env.STUDIO_LIFECYCLE_FROM_EMAIL;
 const key = process.env.STUDIO_LIFECYCLE_RESEND_API_KEY;
 const history = 'studio_lifecycle_history';
 const [template] = await rest<EmailTemplate[]>('studio_email_templates?step=eq.'+step+'&select=subject,body,label',{admin:true});
 if (!template) throw new Error('Missing Studio email template: '+step);
 const {subject,body,label} = template;
 const rows = await rest<unknown[]>(history+'?on_conflict=account_id,kind',{admin:true,body:{account_id:account,kind,recipient:email,sender:from,status:'pending'},prefer:'resolution=ignore-duplicates,return=representation'});
 if (!rows.length) return;
 const update = (status:string, reason?:string, provider_id?:string) => rest(history+'?account_id=eq.'+account+'&kind=eq.'+kind,{admin:true,method:'PATCH',body:{status,reason,provider_id},prefer:'return=minimal'});
 const prefs = await rest<{setup_tips:boolean}[]>('studio_email_preferences?account_id=eq.'+account,{admin:true});
 if (prefs[0]?.setup_tips === false) { await update('skipped','Setup tips disabled'); return; }

 const url = new URL('/assistant-studio/dashboard',siteOrigin());
 if (agent) url.searchParams.set('assistant',agent);
 if (step!=='welcome') url.searchParams.set('setup',step);
 const preferences = new URL('/assistant-studio/email-preferences',siteOrigin());
 preferences.searchParams.set('account',account);
 preferences.searchParams.set('signature',fingerprint('email-preferences:'+account));
 const footer = 'You’re receiving setup tips for your Assistant Studio account.';
 const html = await render(<Html lang="en"><Head/><Preview>{subject}</Preview><Body style={{backgroundColor:'#edf4ef',color:'#10212b',fontFamily:'Arial,sans-serif'}}><Container style={{padding:'28px'}}><Text>Assistant Studio by Metanomic</Text><Heading>{subject}</Heading><Text style={{whiteSpace:'pre-line'}}>{body}</Text><Button href={url.href} style={{backgroundColor:'#c9ec8a',color:'#162315',padding:'12px 20px',borderRadius:8}}>{label}</Button><Text>{footer}</Text><Link href={preferences.href}>Unsubscribe or manage email preferences</Link></Container></Body></Html>);
 if (!key || !from) { await update('failed','Lifecycle sender is missing'); return; }
 try {
  const response = await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'studio-'+kind+'-'+account},body:JSON.stringify({from,to:[email],reply_to:'support@metanomic.ai',subject,html,text:[subject,body,label+' — '+url.href,footer,'Unsubscribe or manage preferences: '+preferences.href].join('\n\n')}),signal:AbortSignal.timeout(10000)});
  if (!response.ok) { await update('failed','Resend HTTP '+response.status); return; }
  const {id}=await response.json();
  await update('accepted',undefined,id);
 } catch { await update('unknown','Delivery outcome unconfirmed'); }
}
