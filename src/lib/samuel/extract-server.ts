import {createReadStream} from 'node:fs';
import {open,rename,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
import {csvRows,extractRow,matchesExtract,type ExtractRow} from './extract-core';
import {PAGE_SIZE,type Filters,type Opportunity} from './core';
import {SamuelError} from './server';
const URL='https://s3.amazonaws.com/falextracts/Contract%20Opportunities/datagov/ContractOpportunitiesFullCSV.csv';
const file=join(tmpdir(),'samuel-extract-v1.ndjson');
type Snapshot={sourceDate:string;count:number;descriptions:number;checkedAt:number};
let snapshot:Snapshot|null=null;
let loading:Promise<Snapshot>|null=null;
async function refresh():Promise<Snapshot>{
 const response=await fetch(URL,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(240000)});
 if(!response.ok||!response.body)throw new Error('Extract unavailable');
 const temporary=file+'.pending';const out=await open(temporary,'w');
 let count=0,descriptions=0,bytes=0,outputBytes=0,header:string[]|null=null;
 try{
  async function* chunks(){const decoder=new TextDecoder('windows-1252');const reader=response.body!.getReader();try{while(true){const {value:chunk,done}=await reader.read();if(done)break;bytes+=chunk.length;if(bytes>400000000)throw new Error('Extract exceeds size limit');yield decoder.decode(chunk,{stream:true});}yield decoder.decode();}finally{await reader.cancel();reader.releaseLock();}}
  for await(const fields of csvRows(chunks())){
   if(!header){header=fields.map(x=>x.replace(/^\uFEFF/,''));if(!['NoticeId','Title','Description','PostedDate'].every(k=>header!.includes(k)))throw new Error('Extract schema changed');continue;}
   if(fields.length===1&&!fields[0])continue;
   if(fields.length!==header.length)throw new Error('Incomplete extract row');
   const row=extractRow(Object.fromEntries(header.map((key,i)=>[key,fields[i]])));
   if(!row)throw new Error('Invalid extract notice');
   const line=JSON.stringify(row)+'\n';outputBytes+=Buffer.byteLength(line);if(outputBytes>240000000)throw new Error('Index exceeds disk budget');await out.write(line);count++;if(row.description)descriptions++;
  }
  if(!count)throw new Error('Empty extract');
  await out.close();await rename(temporary,file);
  return {sourceDate:response.headers.get('last-modified')||new Date().toISOString(),count,descriptions,checkedAt:Date.now()};
 }catch(e){await out.close().catch(()=>{});await unlink(temporary).catch(()=>{});throw e;}
}
async function ensureSnapshot(){
 if(snapshot&&Date.now()-snapshot.checkedAt<6*3600000)return snapshot;
 if(!loading)loading=refresh().then(s=>snapshot=s).finally(()=>{loading=null;});
 try{return await loading;}catch{if(snapshot)return snapshot;throw new SamuelError('SAM.gov’s active-notice extract could not be loaded. Please try again. No title-only fallback was used.',503);}
}
export async function searchExtract(filters:Filters){
 const data=await ensureSnapshot();let total=0;const top:Opportunity[]=[];const keep=(filters.page+1)*PAGE_SIZE;
 const lines=createInterface({input:createReadStream(file),crlfDelay:Infinity});
 for await(const line of lines){const row:ExtractRow=JSON.parse(line);if(!matchesExtract(row,filters))continue;total++;top.push(row.notice);top.sort((a,b)=>b.posted.localeCompare(a.posted)||a.id.localeCompare(b.id));if(top.length>keep)top.pop();}
 return {opportunities:top.slice(filters.page*PAGE_SIZE),total,page:filters.page,fetchedAt:new Date().toISOString(),coverage:{sourceDate:data.sourceDate,indexed:data.count,descriptions:data.descriptions,stale:Date.now()-data.checkedAt>=6*3600000}};
}
