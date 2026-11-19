import {Webhook} from 'svix';
import {rest} from '@/lib/studio/server';

export async function POST(req:Request){
 const secret=process.env.STUDIO_LIFECYCLE_WEBHOOK_SECRET;
 if(!secret)return new Response(null,{status:503});
 let event;
 try {
  const payload=await req.text();
  new Webhook(secret).verify(payload,Object.fromEntries(req.headers));
  event=JSON.parse(payload) as {type:string;created_at:string;data:{email_id:string;from:string;bounce?:{message?:string};failed?:{reason?:string}}};
 } catch {return new Response(null,{status:400});}
 const status=event.type.replace(/^email\./,'');
 if(['delivered','bounced','complained','failed','suppressed'].includes(status) && /@mail\.metanomic\.ai>?$/i.test(event.data.from)){
  await rest('studio_lifecycle_events?on_conflict=event_id',{admin:true,body:{event_id:req.headers.get('svix-id'),provider_id:event.data.email_id,status,reason:event.data.bounce?.message||event.data.failed?.reason,occurred_at:event.created_at},prefer:'resolution=ignore-duplicates,return=minimal'});
 }
 return new Response(null,{status:204});
}
