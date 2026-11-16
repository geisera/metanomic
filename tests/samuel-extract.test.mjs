import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const temp=await mkdtemp(join(tmpdir(),'samuel-extract-test-'));
const source=(await readFile(new URL('../src/lib/samuel/extract-core.ts',import.meta.url),'utf8')).replace("'./core'",JSON.stringify(new URL('../src/lib/samuel/core.ts',import.meta.url).href));
await writeFile(join(temp,'core.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {csvRows,extractRow,storedNotice,sourceUnchanged,shrinkRejected,httpDate}=await import(join(temp,'core.mjs'));
async function load(name){
 let src=await readFile(new URL(`../src/lib/samuel/${name}.ts`,import.meta.url),'utf8');
 src=src.replaceAll("'./core'",JSON.stringify(new URL('../src/lib/samuel/core.ts',import.meta.url).href)).replaceAll("'./extract-core'","'./core.mjs'").replaceAll("'./server'","'./server.mjs'");
 await writeFile(join(temp,name+'.mjs'),ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
 return import(join(temp,name+'.mjs'));
}
await load('server');
const {searchExtract}=await load('extract-server');
const {ingestExtract}=await load('extract-ingest');
after(()=>rm(temp,{recursive:true,force:true}));
async function collect(parts){async function* chunks(){yield* parts;}const rows=[];for await(const r of csvRows(chunks()))rows.push(r);return rows;}
test('CSV handles escaped quotes, commas, CRLF and embedded newlines across every chunk boundary',async()=>{const csv='"a","b"\r\n"hello, world","line1\n""quoted"""\r\n';const expected=[['a','b'],['hello, world','line1\n"quoted"']];for(let i=1;i<csv.length;i++)assert.deepEqual(await collect([csv.slice(0,i),csv.slice(i)]),expected);});
test('CSV rejects truncated quoted records',async()=>assert.rejects(collect(['"unfinished']),/Incomplete/));
const f={keyword:'Salesforce',agency:'',naics:'',noticeType:'k',setAside:'SBA',postedFrom:'2026-01-01',postedTo:'2026-11-16',page:1};
test('Stored notices cap long descriptions and flag the truncation',()=>{
 const base={NoticeId:'a'.repeat(32),Title:'T',PostedDate:'2026-11-15',SetASideCode:'SBA'};
 const short=storedNotice(extractRow({...base,Description:'<p>Salesforce</p>'}));assert.equal(short.description,'Salesforce');assert.equal(short.description_truncated,false);assert.equal(short.set_aside_code,'SBA');assert.equal(short.id,'a'.repeat(32));
 const long=storedNotice(extractRow({...base,Description:'x'.repeat(100001)}));assert.equal(long.description.length,100000);assert.equal(long.description_truncated,true);
});
test('A source is unchanged only when its ETag or publication time provably matches',()=>{
 assert.equal(sourceUnchanged(null,{etag:'"a"',lastModified:null}),false);
 assert.equal(sourceUnchanged({etag:'"a"',lastModified:null},{etag:'"a"',lastModified:null}),true);
 assert.equal(sourceUnchanged({etag:'"a"',lastModified:'2026-11-16T04:30:18.000Z'},{etag:'"b"',lastModified:'2026-11-16T04:30:18.000Z'}),false);
 assert.equal(sourceUnchanged({etag:null,lastModified:'2026-11-16T04:30:18+00:00'},{etag:'"b"',lastModified:'2026-11-16T04:30:18.000Z'}),true);
 assert.equal(sourceUnchanged({etag:null,lastModified:null},{etag:null,lastModified:null}),false);
 assert.equal(httpDate('Mon, 16 Nov 2026 04:30:18 GMT'),'2026-11-16T04:30:18.000Z');assert.equal(httpDate(null),null);assert.equal(httpDate('nonsense'),null);
});
test('Shrink guard rejects only sharp drops against a known previous count',()=>{assert.equal(shrinkRejected(null,10),false);assert.equal(shrinkRejected(100,80),false);assert.equal(shrinkRejected(100,79),true);});

test('Search reads the shared store, never the source file, and reports its coverage',async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=()=>assert.fail('search must not download');
 const coverage={sourceDate:null,loadedAt:'2026-11-16T05:30:00Z',checkedAt:'2026-11-16T09:23:00Z',indexed:2,descriptions:1,stale:false,staleReason:null};
 try{
  let call;const r=await searchExtract(async(path,body)=>{call={path,body};return {ready:true,total:21,opportunities:[{id:'a'.repeat(32)}],coverage};},f);
  assert.equal(call.path,'rpc/samuel_extract_search');assert.deepEqual(call.body,{p_keyword:'Salesforce',p_agency:'',p_naics:'',p_notice_type:'Combined synopsis / solicitation',p_set_aside:'SBA',p_from:'2026-01-01',p_to:'2026-11-16',p_page:1});
  await searchExtract(async(path,body)=>{assert.equal(body.p_notice_type,'','no notice-type filter is sent as empty, not as the "All notice types" label');return {ready:true,total:0,opportunities:[],coverage};},{...f,noticeType:''});
  assert.equal(r.total,21);assert.equal(r.page,1);assert.equal(r.coverage.sourceDate,null);assert.equal(r.opportunities.length,1);
  await assert.rejects(searchExtract(async()=>({ready:false}),f),e=>e.status===503&&/not been loaded/.test(e.message));
  await assert.rejects(searchExtract(async()=>({ready:true,total:1}),f),/unexpected response/);
 }finally{globalThis.fetch=originalFetch;}
});

// In-memory stand-in for the Supabase REST endpoints the ingest job calls, mirroring the SQL functions' rules.
function fakeStore(){
 const s={versions:[],notices:new Map(),source:{body:'',etag:'"v1"',modified:'Mon, 16 Nov 2026 04:30:18 GMT',fail:false},gets:0,heads:0,upserts:0,failUpsert:false};
 const reply=(v,status=200)=>new Response(v===undefined?'':JSON.stringify(v),{status});
 s.fetch=async(url,o={})=>{
  if(url.startsWith('https://s3.amazonaws.com/falextracts/')){
   assert.ok(!JSON.stringify(o.headers||{}).includes('fixture-secret'));
   if(s.source.fail)throw new Error('offline');
   const headers={etag:s.source.etag,...(s.source.modified?{'last-modified':s.source.modified}:{})};
   if(o.method==='HEAD'){s.heads++;return new Response(null,{headers});}
   s.gets++;return new Response(s.source.body,{headers});
  }
  assert.ok(url.startsWith('https://db.test/rest/v1/'));assert.equal(o.headers.apikey,'fixture-secret');
  const path=url.slice('https://db.test/rest/v1/'.length),body=o.body?JSON.parse(o.body):undefined;
  if(path.startsWith('samuel_extract_versions?is_current=eq.true'))return reply(s.versions.filter(v=>v.is_current));
  if(path.startsWith('samuel_extract_versions?id=eq.')){Object.assign(s.versions.find(v=>v.id===Number(path.split('eq.')[1])),body);return reply();}
  if(path==='samuel_extract_versions'){s.versions.push({id:s.versions.length+1,is_current:false,...body});return reply();}
  if(path==='rpc/samuel_extract_begin'){if(s.versions.some(v=>v.status==='running'))return reply(null);s.versions.push({id:s.versions.length+1,status:'running',is_current:false,source_etag:body.p_etag,source_last_modified:body.p_last_modified});return reply(s.versions.length);}
  if(path==='rpc/samuel_extract_hashes')return reply(Object.fromEntries([...s.notices].map(([id,n])=>[id,n.content_hash])));
  if(path==='samuel_extract_notices?on_conflict=id'){if(s.failUpsert)return reply({message:'fixture-secret'},500);assert.match(o.headers.Prefer,/merge-duplicates/);s.upserts+=body.length;for(const n of body)s.notices.set(n.id,n);return reply();}
  if(path==='rpc/samuel_extract_finish'){
   const kept=new Map([...s.notices].filter(([id])=>!body.p_delete.includes(id)));
   if(kept.size!==body.p_count)return reply({message:'count mismatch'},400);
   s.notices=kept;for(const v of s.versions)v.is_current=false;
   Object.assign(s.versions.find(v=>v.id===body.p_version),{status:'complete',is_current:true,notice_count:body.p_count,description_count:body.p_descriptions});return reply();
  }
  assert.fail('unexpected request '+path);
 };
 return s;
}
const csv=rows=>'NoticeId,Title,Description,PostedDate\n'+rows.map(([i,title,description])=>`${i.toString(16).padStart(32,'0')},${title},${description},2026-11-15`).join('\n');
const nid=i=>i.toString(16).padStart(32,'0');
async function withStore(run){
 const s=fakeStore(),originalFetch=globalThis.fetch,env={...process.env};
 globalThis.fetch=s.fetch;process.env.SUPABASE_URL='https://db.test/';process.env.SUPABASE_SECRET_KEY='fixture-secret';
 try{await run(s,ingestExtract);}finally{globalThis.fetch=originalFetch;process.env=env;}
}
const current=s=>s.versions.find(v=>v.is_current);
test('Ingest loads once, skips an unchanged source, then writes only changed notices and removes departed ones',()=>withStore(async(s,ingest)=>{
 s.source.body=csv(Array.from({length:10},(_,i)=>[i,'CRM '+i,'Salesforce services']));
 const first=await ingest();assert.equal(first.status,'complete');assert.equal(first.notices,10);assert.equal(first.descriptions,10);assert.equal(first.upserted,10);assert.equal(first.sourceDate,'2026-11-16T04:30:18.000Z');
 assert.equal(s.notices.size,10);assert.equal(current(s).source_etag,'"v1"');
 const again=await ingest();assert.equal(again.status,'unchanged');assert.equal(s.gets,1,'unchanged source is not downloaded');assert.equal(s.heads,2);assert.ok(current(s).checked_at);
 s.source.etag='"v2"';s.source.body=csv([...Array.from({length:8},(_,i)=>[i,'CRM '+i,'Salesforce services']),[8,'CRM 8','Revised description'],[10,'New notice','']]);s.upserts=0;
 const next=await ingest();assert.equal(next.status,'complete');assert.equal(next.upserted,2);assert.equal(s.upserts,2);assert.equal(next.deleted,1);assert.equal(next.descriptions,9);
 assert.equal(s.notices.size,10);assert.ok(!s.notices.has(nid(9)));assert.equal(s.notices.get(nid(8)).description,'Revised description');assert.equal(current(s).id,next.version);
 const forced=await ingest({force:true});assert.equal(forced.status,'complete');assert.equal(forced.upserted,0);assert.equal(s.gets,3);
}));
test('Duplicate notice rows in the source are loaded once',()=>withStore(async(s,ingest)=>{
 s.source.body=csv([[1,'A','x'],[1,'A duplicate','y'],[2,'B','']]);const r=await ingest();assert.equal(r.notices,2);assert.equal(s.notices.get(nid(1)).notice.title,'A');
}));
test('Bad, empty, shrunken or unreachable sources fail without replacing the published version',()=>withStore(async(s,ingest)=>{
 s.source.body=csv(Array.from({length:10},(_,i)=>[i,'CRM '+i,'x']));await ingest();const published=current(s).id;
 const failed=()=>s.versions.filter(v=>v.status==='failed').length;
 s.source.etag='"v2"';s.source.body='NoticeId,Title,Description,PostedDate\n';await assert.rejects(ingest(),/Empty extract/);
 s.source.body='Id,Name\n1,2';await assert.rejects(ingest(),/schema changed/);
 s.source.body=csv([[1,'A','x']])+'\nnot-a-notice-id,B,y,2026-11-15';await assert.rejects(ingest(),/Invalid extract notice/);
 s.source.body=csv(Array.from({length:7},(_,i)=>[i,'CRM '+i,'x']));await assert.rejects(ingest(),/shrank from 10 to 7/);
 assert.equal(failed(),4);assert.equal(current(s).id,published);assert.equal(s.notices.size,10);
 s.source.fail=true;await assert.rejects(ingest(),/offline/);assert.equal(failed(),5);s.source.fail=false;
 const accepted=await ingest({force:true});assert.equal(accepted.status,'complete');assert.equal(accepted.deleted,3);assert.equal(s.notices.size,7);
 s.source.etag='"v3"';s.source.body=csv(Array.from({length:8},(_,i)=>[i,'Changed '+i,'x']));s.failUpsert=true;
 await assert.rejects(ingest(),e=>/HTTP 500/.test(e.message)&&!e.message.includes('fixture-secret'));assert.equal(current(s).id,accepted.version);
}));
test('A run that exhausts its time budget is recorded as partial and the next run completes it',()=>withStore(async(s,ingest)=>{
 s.source.body=csv(Array.from({length:10},(_,i)=>[i,'CRM '+i,'x']));
 const partial=await ingest({deadline:Date.now()-1});assert.equal(partial.status,'partial');assert.equal(current(s),undefined);assert.equal(s.versions.at(-1).status,'partial');
 const done=await ingest();assert.equal(done.status,'complete');assert.equal(s.notices.size,10);
}));
test('Concurrent runs are single-flight and missing configuration makes no request',()=>withStore(async(s,ingest)=>{
 s.source.body=csv([[1,'A','x']]);s.versions.push({id:1,status:'running',is_current:false});
 assert.equal((await ingest()).status,'busy');assert.equal(s.gets,0);
 delete process.env.SUPABASE_SECRET_KEY;globalThis.fetch=()=>assert.fail('unexpected request');await assert.rejects(ingest(),/SUPABASE_SECRET_KEY/);
}));
