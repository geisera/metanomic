import {fetchEntity} from '@/lib/samuel/entity-server';
import {validUei} from '@/lib/samuel/entity';
import { getKnowledgeAdmin, parseBody, sameOrigin } from '@/lib/knowledge-server';
import { parseFilters,validNoticeId } from '@/lib/samuel/core';
import { searchExtract } from '@/lib/samuel/extract-server';
import { dailyLimit } from '@/lib/samuel/index-core';
import { SamuelError,createBrief,searchSelectedSource } from '@/lib/samuel/server';
import { ensureScope,coverage,listScopes,searchIndex,updateIndex,indexedBrief,db } from '@/lib/samuel/index-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
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
 try {
  if(body.action==='entity'){
   if(!validUei(body.uei))return json({error:'Enter a 12-character UEI using letters and numbers.'},400);
   if(!process.env.SAM_GOV_API_KEY?.trim())return json({error:'SAM.gov is not configured.'},503);
   if(!await db(auth.session,'rpc/samuel_reserve_budget',{p_count:1,p_limit:dailyLimit(process.env.SAMUEL_DAILY_REQUEST_LIMIT)}))return json({error:'The daily SAM.gov request budget has been reached. Try after the next UTC day.'},429);
   return json({entity:await fetchEntity(body.uei)});
  }
  if(body.action==='collections')return json({collections:await listScopes(auth.session)});
  if(body.action==='collection'){const scope=await ensureScope(auth.session,body.filters);return json({scope,coverage:await coverage(auth.session,scope.id)});}
  if(body.action==='index-search')return json(await searchIndex(auth.session,body));
  if(body.action==='search'){
   let filters;try{filters=parseFilters(body.filters);}catch(e){return json({error:e instanceof Error?e.message:'Invalid filters.'},400);}
   return json(await searchSelectedSource(filters,body.source,{extract:searchExtract,reserve:()=>db(auth.session,'rpc/samuel_reserve_budget',{p_count:1,p_limit:dailyLimit(process.env.SAMUEL_DAILY_REQUEST_LIMIT)})}));
  }
  if(body.action==='update')return json(await updateIndex(auth.session,body));
  if(body.action==='brief'){
   if(!allow(auth.session.userId))return json({error:'Samuel’s hourly AI briefing limit has been reached. Try again later.'},429);
   if(body.entityUei!==undefined&&!validUei(body.entityUei))return json({error:'Select a valid entity UEI.'},400);
   if(body.scopeId&&body.entityUei)return json({error:'Entity context is supported in the main opportunity search.'},400);
   if(body.scopeId)return json(await indexedBrief(auth.session,body));
   if(!validNoticeId(body.id)||typeof body.posted!=='string'||typeof body.profile!=='string'||body.profile.trim().length<20||body.profile.length>6000)return json({error:'Choose a notice and enter a company profile of 20–6,000 characters.'},400);
   try{parseFilters({postedFrom:body.posted.slice(0,10),postedTo:body.posted.slice(0,10)});}catch{return json({error:'The notice has an invalid posting date.'},400);}
   if(!process.env.SAM_GOV_API_KEY?.trim())return json({error:'SAM.gov is not configured.'},503);
   if(!await db(auth.session,'rpc/samuel_reserve_budget',{p_count:body.entityUei?3:2,p_limit:dailyLimit(process.env.SAMUEL_DAILY_REQUEST_LIMIT)}))return json({error:'The daily SAM.gov request budget has been reached. Try again after the next UTC day.'},429);
   const entity=body.entityUei?await fetchEntity(body.entityUei):undefined;
   return json(await createBrief(body.id,body.posted,body.profile.trim(),undefined,entity));
  }
  return json({error:'Unsupported action.'},400);
 }catch(e){return json({error:e instanceof SamuelError?e.message:'Samuel could not complete this request. Please try again.'},e instanceof SamuelError?e.status:500);}
}
