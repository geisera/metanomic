import { getKnowledgeAdmin, parseBody, sameOrigin } from '@/lib/knowledge-server';
import { parseFilters, validNoticeId } from '@/lib/samuel/core';
import { createBrief, SamuelError, searchOpportunities } from '@/lib/samuel/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
// Secondary per-instance throttle; administrator auth is the primary access boundary.
const requests=new Map<string,{count:number;until:number}>();
function allow(id:string){const now=Date.now();for(const [k,v] of requests)if(v.until<now)requests.delete(k);const row=requests.get(id)||{count:0,until:now+3600000};row.count++;requests.set(id,row);return row.count<=30;}
export async function GET(){
 const auth=await getKnowledgeAdmin();
 if(auth.kind!=='authenticated')return json({error:auth.kind==='unauthenticated'?'Sign in with your Metanomic administrator account.':'Administrator sign-in is temporarily unavailable.'},auth.kind==='unauthenticated'?401:503);
 return json({authenticated:true,userId:auth.session.userId,connected:!!process.env.SAM_GOV_API_KEY?.trim(),aiConfigured:!!(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN)});
}
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Cross-origin requests are not permitted.'},403);
 const auth=await getKnowledgeAdmin();
 if(auth.kind!=='authenticated')return json({error:'Please sign in again with your Metanomic administrator account.'},401);
 const body=await parseBody(request,12000);
 if(!body)return json({error:'Invalid request.'},400);
 if(!allow(auth.session.userId))return json({error:'Samuel’s hourly request limit has been reached. Try again later.'},429);
 try {
  if(body.action==='search'){
   let filters;try{filters=parseFilters(body.filters);}catch(e){return json({error:e instanceof Error?e.message:'Invalid search filters.'},400);}
   return json(await searchOpportunities(filters));
  }
  if(body.action==='brief'){
   if(!validNoticeId(body.id)||typeof body.posted!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(body.posted)||typeof body.profile!=='string'||body.profile.trim().length<20||body.profile.length>6000)return json({error:'Choose a notice and enter a company profile of 20–6,000 characters.'},400);
   try{parseFilters({postedFrom:body.posted.slice(0,10),postedTo:body.posted.slice(0,10)});}catch{return json({error:'The notice has an invalid posted date.'},400);}
   return json(await createBrief(body.id,body.posted,body.profile.trim()));
  }
  return json({error:'Unsupported action.'},400);
 }catch(e){return json({error:e instanceof SamuelError?e.message:'Samuel could not complete this request. Please try again.'},e instanceof SamuelError?e.status:500);}
}
