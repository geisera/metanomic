import {rest} from '@/lib/studio/server';
import {sendLifecycle,type Step} from '@/lib/studio/lifecycle';
export const maxDuration=300;
type Due={account_id:string;email:string;agent_id:string;step:Step|'complete'|'inactive'|'unsubscribed'};
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!=='Bearer '+secret)return new Response(null,{status:401});
 const cutoff=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
 await rest('studio_report_counts?day=lt.'+cutoff,{admin:true,method:'DELETE',prefer:'return=minimal'})
   .catch(()=>console.error('Studio report cleanup failed'));
 const due=await rest<Due[]>('rpc/studio_due_reminders',{admin:true,body:{}});
 const deadline=Date.now()+240000;
 let processed=0;
 for(const row of due){
  if(Date.now()>deadline)break;
  if(['complete','inactive','unsubscribed'].includes(row.step)){
   await rest('studio_lifecycle_history?on_conflict=account_id,kind',{admin:true,body:{account_id:row.account_id,kind:'reminder',recipient:row.email,status:'skipped',reason:row.step},prefer:'resolution=ignore-duplicates,return=minimal'});
  }else{
   await sendLifecycle(row.account_id,row.email,row.step as Step,row.agent_id);
  }
  processed++;
 }
 return Response.json({processed});
}
