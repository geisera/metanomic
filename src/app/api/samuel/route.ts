import { getKnowledgeAdmin, parseBody, sameOrigin } from '@/lib/knowledge-server';
import { SamuelError } from '@/lib/samuel/server';
import { ensureScope,coverage,listScopes,searchIndex,updateIndex,indexedBrief } from '@/lib/samuel/index-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
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
  if(body.action==='collections')return json({collections:await listScopes(auth.session)});
  if(body.action==='collection'){const scope=await ensureScope(auth.session,body.filters);return json({scope,coverage:await coverage(auth.session,scope.id)});}
  if(body.action==='search')return json(await searchIndex(auth.session,body));
  if(body.action==='update')return json(await updateIndex(auth.session,body));
  if(body.action==='brief'){
   if(!allow(auth.session.userId))return json({error:'Samuel’s hourly AI briefing limit has been reached. Try again later.'},429);
   return json(await indexedBrief(auth.session,body));
  }
  return json({error:'Unsupported action.'},400);
 }catch(e){return json({error:e instanceof SamuelError?e.message:'Samuel could not complete this request. Please try again.'},e instanceof SamuelError?e.status:500);}
}
