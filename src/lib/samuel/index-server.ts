import { createHash,randomUUID } from 'node:crypto';
import type { KnowledgeSession } from '@/lib/knowledge-server';
import { parseFilters,normalizeNotice,plainText,searchParams,type Filters,type Opportunity } from './core';
import { relatedTerms,updateBudget,dailyLimit,type Coverage } from './index-core';
import { samFetch,SamuelError,createBrief } from './server';

type Scope={id:string;filters:Filters;next_page:number;metadata_complete:boolean;upstream_total:number;last_update:string|null};
type IndexedRow={id:string;notice:Opportunity;description:string;description_status:string;description_truncated:boolean;fetched_at:string;description_at:string|null};
export async function db(session:KnowledgeSession,path:string,body?:unknown,method='POST',prefer='return=representation'){
 const r=await fetch(session.config.url+'/rest/v1/'+path,{method:body===undefined?'GET':method,headers:{apikey:session.config.key,Authorization:'Bearer '+session.token,'Content-Type':'application/json',Prefer:prefer},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new SamuelError('Samuel’s index could not be accessed. Sign in again or try later.',r.status===401?401:503);
 const text=await r.text();return text?JSON.parse(text):null;
}
function scopeFilters(value:unknown):Filters{
 let f:Filters;try{f=parseFilters(value);}catch(e){throw new SamuelError(e instanceof Error?e.message:'Invalid collection profile.',400);}f.keyword='';f.page=0;
 if(!f.agency&&!f.naics)throw new SamuelError('Set an agency or NAICS code to keep collection focused and within your API budget.',400);
 return f;
}
export async function ensureScope(session:KnowledgeSession,value:unknown):Promise<Scope>{
 const filters=scopeFilters(value);const id=createHash('sha256').update(JSON.stringify({owner:session.userId,filters})).digest('hex');
 await db(session,'samuel_scopes?on_conflict=id',{id,owner_id:session.userId,filters},'POST','resolution=ignore-duplicates,return=minimal');
 const rows=await db(session,'samuel_scopes?id=eq.'+id+'&select=*');return rows[0];
}
async function getScope(session:KnowledgeSession,id:unknown):Promise<Scope>{
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw new SamuelError('Choose a collection profile.',400);
 const rows=await db(session,'samuel_scopes?id=eq.'+id+'&select=*');if(!rows[0])throw new SamuelError('Collection profile not found.',404);return rows[0];
}
export async function coverage(session:KnowledgeSession,id:string):Promise<Coverage>{const result=await db(session,'rpc/samuel_coverage',{p_scope:id});return {...result,dailyLimit:dailyLimit(process.env.SAMUEL_DAILY_REQUEST_LIMIT)};}
export async function listScopes(session:KnowledgeSession){return db(session,'samuel_scopes?select=id,filters,next_page,metadata_complete,upstream_total,last_update&order=created_at.desc&limit=30');}
export async function searchIndex(session:KnowledgeSession,input:Record<string,unknown>){
 const scope=await getScope(session,input.scopeId);
 if(typeof input.query!=='string'||input.query.length>160||!['all','active','archived'].includes(String(input.status))||typeof input.page!=='number'||!Number.isInteger(input.page)||input.page<0||input.page>499)throw new SamuelError('Invalid index search.',400);
 const terms=relatedTerms(input.query,input.related===true);
 const [result,cov]=await Promise.all([db(session,'rpc/samuel_search',{p_scope:scope.id,p_query:input.query.trim(),p_status:input.status,p_page:input.page,p_related:terms}),coverage(session,scope.id)]);
 return {...result,page:input.page,fetchedAt:new Date().toISOString(),coverage:cov,relatedTerms:terms};
}
export async function updateIndex(session:KnowledgeSession,input:Record<string,unknown>){
 let count:number;try{count=updateBudget(input.budget);}catch{throw new SamuelError('Choose 1–5 API requests per update.',400);}
 if(!process.env.SAM_GOV_API_KEY?.trim())throw new SamuelError('SAM_GOV_API_KEY must be configured before updating the index.',503);
 const scope=await getScope(session,input.scopeId);const token=randomUUID();
 if(!await db(session,'rpc/samuel_lock_scope',{p_id:scope.id,p_token:token}))throw new SamuelError('An update is already running for this collection. Try again shortly.',409);
 const scopePath='samuel_scopes?id=eq.'+scope.id+'&lock_token=eq.'+token;
 let used=0;let message='';
 try{
  // Reserve the whole batch atomically across instances and admins before any upstream call.
  if(!await db(session,'rpc/samuel_reserve_budget',{p_count:count,p_limit:dailyLimit(process.env.SAMUEL_DAILY_REQUEST_LIMIT)}))throw new SamuelError('The daily update request budget is exhausted. Lower the batch size or wait until the next UTC day.',429);
  let pending:IndexedRow[]=await db(session,'samuel_notices?scope_id=eq.'+scope.id+'&description_status=eq.pending&select=*&order=id&limit=5');
  const refresh=input.refresh===true;
  if(refresh){await db(session,scopePath,{next_page:0,metadata_complete:false},'PATCH');scope.next_page=0;scope.metadata_complete=false;}
  // Finish descriptions already queued before fetching another page, unless explicitly refreshing metadata.
  if((pending.length===0||refresh)&&!scope.metadata_complete){
   if(scope.next_page>=50)throw new SamuelError('This collection reached 1,000 notices. Narrow the agency, NAICS code or date range to collect further.',400);
   const params=searchParams({...scope.filters,keyword:'',page:scope.next_page});
   const data=await samFetch('/opportunities/v2/search',params);used++;
   if(!Array.isArray(data.opportunitiesData)&&data.totalRecords!==0)throw new SamuelError('SAM.gov returned an unexpected search response.');
   const raw=Array.isArray(data.opportunitiesData)?data.opportunitiesData:[];
   const notices=raw.map(normalizeNotice).filter((o):o is Opportunity=>!!o);
   if(notices.length!==raw.length)throw new SamuelError('SAM.gov returned notice identifiers Samuel could not index. Coverage has not advanced.');
   if(notices.length)await db(session,'samuel_notices?on_conflict=scope_id,id',notices.map(notice=>({scope_id:scope.id,id:notice.id,notice,description_status:'pending',fetched_at:new Date().toISOString()})),'POST','resolution=merge-duplicates,missing=default,return=minimal');
   const total=Number(data.totalRecords);if(!Number.isFinite(total))throw new SamuelError('SAM.gov did not provide a valid result count.');
   const complete=(scope.next_page+1)*20>=total;
   if(raw.length<20&&!complete)throw new SamuelError('SAM.gov returned fewer records than requested before the reported end. The collection cursor has not advanced.');
   if(!raw.length&&total>scope.next_page*20)throw new SamuelError('SAM.gov returned an empty page before the reported end. Coverage remains incomplete.');
   await db(session,scopePath,{next_page:scope.next_page+1,metadata_complete:complete,upstream_total:total},'PATCH');
   pending=await db(session,'samuel_notices?scope_id=eq.'+scope.id+'&description_status=eq.pending&select=*&order=id&limit=5');
  }
  const batch=pending.slice(0,count-used);
  // Each description is at most one request; failed attempts remain visibly unavailable.
  await Promise.all(batch.map(async row=>{
   used++;
   try{const data=await samFetch('/prod/opportunities/v1/noticedesc',new URLSearchParams({noticeid:row.id}));const text=typeof data.description==='string'?plainText(data.description):'';
    await db(session,'samuel_notices?scope_id=eq.'+scope.id+'&id=eq.'+row.id,{description:text.slice(0,100000),description_status:text?'ready':'unavailable',description_truncated:text.length>100000,description_at:new Date().toISOString()},'PATCH');
   }catch{await db(session,'samuel_notices?scope_id=eq.'+scope.id+'&id=eq.'+row.id,{description:'',description_status:'unavailable',description_truncated:false,description_at:new Date().toISOString()},'PATCH');message='Some descriptions were unavailable. Refresh this collection to retry them.';}
  }));
  await db(session,scopePath,{last_update:new Date().toISOString()},'PATCH');
 }finally{await db(session,scopePath,{locked_until:null,lock_token:null},'PATCH');}
 return {coverage:await coverage(session,scope.id),used,reserved:count,message:message||'Batch saved. Search the index or continue the update to collect remaining notices and descriptions.'};
}
export async function indexedBrief(session:KnowledgeSession,input:Record<string,unknown>){
 const scope=await getScope(session,input.scopeId);
 if(typeof input.id!=='string'||!/^[a-f0-9]{32}$/i.test(input.id)||typeof input.profile!=='string'||input.profile.trim().length<20||input.profile.length>6000)throw new SamuelError('Choose an indexed notice and enter a company profile of 20–6,000 characters.',400);
 const rows:IndexedRow[]=await db(session,'samuel_notices?scope_id=eq.'+scope.id+'&id=eq.'+input.id+'&select=*');const row=rows[0];if(!row)throw new SamuelError('This notice is not in the selected collection. Search that collection first.',404);
 return createBrief(row.id,row.notice.posted,input.profile,{notice:row.notice,description:row.description_status==='ready'?row.description:'',descriptionTruncated:row.description_truncated,fetchedAt:row.fetched_at});
}
