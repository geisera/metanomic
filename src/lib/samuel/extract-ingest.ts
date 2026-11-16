import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {open,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
import {csvRows,extractRow,httpDate,shrinkRejected,sourceUnchanged,storedNotice,type SourceStamp} from './extract-core';

// Scheduled loader for SAM.gov's public Contract Opportunities extract.
// 1. HEAD the source and stop if it is the file already loaded.
// 2. Download, validate and project the whole file to a temporary disk file.
// 3. Write only notices whose content changed, then remove notices that left the
//    extract and publish the new version in a single database transaction.
// A failed or interrupted run leaves the previously published version in place.
export const EXTRACT_URL='https://s3.amazonaws.com/falextracts/Contract%20Opportunities/datagov/ContractOpportunitiesFullCSV.csv';
const MAX_SOURCE_BYTES=400000000,MAX_PROJECTED_BYTES=240000000,BATCH_ROWS=400,BATCH_BYTES=3000000,PARALLEL=4;
export type IngestResult={status:'unchanged'|'busy'|'complete'|'partial';version?:number;notices?:number;descriptions?:number;upserted?:number;deleted?:number;sourceDate?:string|null;durationMs:number};
type Current={id:number;source_etag:string|null;source_last_modified:string|null;notice_count:number|null};

function config(){
 const url=process.env.SUPABASE_URL?.trim().replace(/\/$/,'')||'',key=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
 if(!url||!key)throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be configured for extract ingestion.');
 return {url,key};
}
async function store(path:string,body?:unknown,method='POST',prefer='return=representation',timeout=60000){
 const {url,key}=config();
 const r=await fetch(url+'/rest/v1/'+path,{method:body===undefined?'GET':method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:prefer},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(timeout)});
 // Status only: never surface database response bodies or credentials.
 if(!r.ok)throw new Error('Extract store request failed (HTTP '+r.status+')');
 const text=await r.text();return text?JSON.parse(text):null;
}
const stamp=(r:Response):SourceStamp=>({etag:r.headers.get('etag'),lastModified:httpDate(r.headers.get('last-modified'))});
const hash=(row:ReturnType<typeof storedNotice>)=>createHash('sha256').update(JSON.stringify([row.notice,row.description,row.description_truncated,row.set_aside_code])).digest('hex').slice(0,24);

// Streams the CSV into a validated NDJSON file of unique notices. Any defect rejects the whole file.
async function download(file:string){
 const response=await fetch(EXTRACT_URL,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(180000)});
 if(!response.ok||!response.body)throw new Error('Extract unavailable (HTTP '+response.status+')');
 const out=await open(file,'w');const ids=new Set<string>();
 let descriptions=0,bytes=0,outputBytes=0,header:string[]|null=null;
 try{
  async function* chunks(){const decoder=new TextDecoder('windows-1252');const reader=response.body!.getReader();try{while(true){const {value:chunk,done}=await reader.read();if(done)break;bytes+=chunk.length;if(bytes>MAX_SOURCE_BYTES)throw new Error('Extract exceeds size limit');yield decoder.decode(chunk,{stream:true});}yield decoder.decode();}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
  for await(const fields of csvRows(chunks())){
   if(!header){header=fields.map(x=>x.replace(/^﻿/,''));if(!['NoticeId','Title','Description','PostedDate'].every(k=>header!.includes(k)))throw new Error('Extract schema changed');continue;}
   if(fields.length===1&&!fields[0])continue;
   if(fields.length!==header.length)throw new Error('Incomplete extract row');
   const parsed=extractRow(Object.fromEntries(header.map((key,i)=>[key,fields[i]])));
   if(!parsed)throw new Error('Invalid extract notice');
   const row=storedNotice(parsed);
   if(ids.has(row.id))continue;
   ids.add(row.id);
   const line=JSON.stringify({...row,content_hash:hash(row)})+'\n';outputBytes+=Buffer.byteLength(line);if(outputBytes>MAX_PROJECTED_BYTES)throw new Error('Projected extract exceeds disk budget');
   await out.write(line);if(row.description)descriptions++;
  }
  if(!ids.size)throw new Error('Empty extract');
 }finally{await out.close().catch(()=>{});}
 return {ids,descriptions,source:stamp(response)};
}

export async function ingestExtract(options:{force?:boolean;deadline?:number}={}):Promise<IngestResult>{
 const started=Date.now(),deadline=options.deadline??started+235000,done=()=>({durationMs:Date.now()-started});
 config();
 const rows:Current[]=await store('samuel_extract_versions?is_current=eq.true&select=id,source_etag,source_last_modified,notice_count&limit=1');
 const current=rows[0]||null;
 let version:number|null=null,upserted=0;
 const file=join(tmpdir(),'samuel-extract-ingest-'+process.pid+'-'+started+'.ndjson');
 try{
  const head=await fetch(EXTRACT_URL,{method:'HEAD',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!head.ok)throw new Error('Extract unavailable (HTTP '+head.status+')');
  const published=stamp(head);
  if(!options.force&&sourceUnchanged(current&&{etag:current.source_etag,lastModified:httpDate(current.source_last_modified)},published)){
   await store('samuel_extract_versions?id=eq.'+current!.id,{checked_at:new Date().toISOString()},'PATCH','return=minimal');
   return {status:'unchanged',version:current!.id,sourceDate:published.lastModified,...done()};
  }
  version=await store('rpc/samuel_extract_begin',{p_etag:published.etag,p_last_modified:published.lastModified});
  if(version===null)return {status:'busy',...done()};
  const {ids,descriptions,source}=await download(file);
  // Record the headers of the bytes actually loaded; the file can be republished between HEAD and GET.
  await store('samuel_extract_versions?id=eq.'+version,{source_etag:source.etag,source_last_modified:source.lastModified},'PATCH','return=minimal');
  if(!options.force&&shrinkRejected(current?.notice_count,ids.size))throw new Error('Extract shrank from '+current!.notice_count+' to '+ids.size+' notices; rerun with force=1 to accept it');
  const known:Record<string,string>=await store('rpc/samuel_extract_hashes',{});
  // Upsert changed notices in bounded batches with limited parallelism.
  let batch:unknown[]=[],batchBytes=0,expired=false,failure:unknown=null;const active=new Set<Promise<void>>();
  const flush=async()=>{
   if(!batch.length)return;
   const sending=batch;batch=[];batchBytes=0;
   const task:Promise<void>=store('samuel_extract_notices?on_conflict=id',sending,'POST','resolution=merge-duplicates,return=minimal',90000).then(()=>{upserted+=sending.length;},e=>{failure??=e;}).finally(()=>{active.delete(task);});
   active.add(task);
   if(active.size>=PARALLEL)await Promise.race(active);
   if(failure)throw failure;
  };
  const stream=createReadStream(file);
  try{
   for await(const line of createInterface({input:stream,crlfDelay:Infinity})){
    if(failure)throw failure;
    if(Date.now()>deadline){expired=true;break;}
    const row=JSON.parse(line) as {id:string;content_hash:string};
    if(known[row.id]===row.content_hash)continue;
    batch.push({...row,updated_at:new Date().toISOString()});batchBytes+=line.length;
    if(batch.length>=BATCH_ROWS||batchBytes>=BATCH_BYTES)await flush();
   }
   if(!expired)await flush();
  }finally{stream.destroy();await Promise.all(active);}
  if(failure)throw failure;
  if(expired){
   // Out of time: keep what was written. The next run skips those rows by hash and continues.
   await store('samuel_extract_versions?id=eq.'+version,{status:'partial',upserted,finished_at:new Date().toISOString(),error:'Time budget reached; the next run continues'},'PATCH','return=minimal');
   return {status:'partial',version,notices:ids.size,upserted,...done()};
  }
  const removed=Object.keys(known).filter(id=>!ids.has(id));
  await store('rpc/samuel_extract_finish',{p_version:version,p_delete:removed,p_count:ids.size,p_descriptions:descriptions,p_upserted:upserted},'POST','return=minimal',120000);
  return {status:'complete',version,notices:ids.size,descriptions,upserted,deleted:removed.length,sourceDate:source.lastModified,...done()};
 }catch(e){
  // Record the failure so searches can report that the last refresh failed. The published version is untouched.
  const error=(e instanceof Error?e.message:'Unknown error').slice(0,300),finished_at=new Date().toISOString();
  await (version===null?store('samuel_extract_versions',{status:'failed',error,finished_at},'POST','return=minimal'):store('samuel_extract_versions?id=eq.'+version,{status:'failed',error,upserted,finished_at},'PATCH','return=minimal')).catch(()=>{});
  throw e;
 }finally{await unlink(file).catch(()=>{});}
}
