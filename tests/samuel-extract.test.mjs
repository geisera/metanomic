import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const temp=await mkdtemp(join(tmpdir(),'samuel-extract-test-'));
const source=(await readFile(new URL('../src/lib/samuel/extract-core.ts',import.meta.url),'utf8')).replace("'./core'",JSON.stringify(new URL('../src/lib/samuel/core.ts',import.meta.url).href));
await writeFile(join(temp,'core.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {csvRows,extractRow,matchesExtract}=await import(join(temp,'core.mjs'));
after(()=>rm(temp,{recursive:true,force:true}));
async function collect(parts){async function* chunks(){yield* parts;}const rows=[];for await(const r of csvRows(chunks()))rows.push(r);return rows;}
test('CSV handles escaped quotes, commas, CRLF and embedded newlines across every chunk boundary',async()=>{const csv='"a","b"\r\n"hello, world","line1\n""quoted"""\r\n';const expected=[['a','b'],['hello, world','line1\n"quoted"']];for(let i=1;i<csv.length;i++)assert.deepEqual(await collect([csv.slice(0,i),csv.slice(i)]),expected);});
test('CSV rejects truncated quoted records',async()=>assert.rejects(collect(['"unfinished']),/Incomplete/));
const f={keyword:'Salesforce',agency:'',naics:'',noticeType:'',setAside:'',postedFrom:'2026-01-01',postedTo:'2026-11-16',page:0};
function row(title,description){return extractRow({NoticeId:'a'.repeat(32),Title:title,Description:description,PostedDate:'2026-11-15 12:00:00',Type:'Solicitation',Active:'Yes',NaicsCode:'541512',SetASideCode:'SBA'});}
test('Keyword matches title OR description, case-insensitively',()=>{assert.ok(matchesExtract(row('Salesforce services',''),f));assert.ok(matchesExtract(row('CRM support','Uses SALESFORCE for case management'),f));assert.ok(!matchesExtract(row('Other software','No matching term'),f));});
test('Every keyword must match; optional filters still constrain results',()=>{assert.ok(matchesExtract(row('CRM support','Salesforce'),{...f,keyword:'Salesforce support'}));assert.ok(!matchesExtract(row('CRM support','Salesforce'),{...f,keyword:'Salesforce migration'}));assert.ok(!matchesExtract(row('Salesforce',''),{...f,naics:'999'}));assert.ok(matchesExtract(row('Salesforce',''),{...f,noticeType:'o',setAside:'SBA'}));assert.ok(!matchesExtract(row('Salesforce',''),{...f,postedFrom:'2026-11-16'}));});
test('Search rejects empty extracts, caches full data, paginates and preserves last valid data on refresh failure',async()=>{
 for(const name of ['server','extract-server']){
  let src=await readFile(new URL(`../src/lib/samuel/${name}.ts`,import.meta.url),'utf8');
  src=src.replaceAll("'./core'",JSON.stringify(new URL('../src/lib/samuel/core.ts',import.meta.url).href)).replaceAll("'./extract-core'","'./core.mjs'").replaceAll("'./server'","'./server.mjs'").replace("join(tmpdir(),'samuel-extract-v1.ndjson')",JSON.stringify(join(temp,'cache.ndjson')));
  await writeFile(join(temp,name+'.mjs'),ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
 }
 const {searchExtract}=await import(join(temp,'extract-server.mjs'));const originalFetch=globalThis.fetch,originalNow=Date.now;let calls=0,fail=false;
 const header='NoticeId,Title,Description,PostedDate\n';
 const body=header+Array.from({length:25},(_,i)=>`${i.toString(16).padStart(32,'0')},CRM ${i},Salesforce services,2026-11-15`).join('\n');
 globalThis.fetch=async(url)=>{assert.ok(url.startsWith('https://s3.amazonaws.com/falextracts/'));assert.ok(!url.includes('api_key'));calls++;if(fail)throw new Error('offline');return new Response(calls===1?header:body,{headers:{'last-modified':'Mon, 16 Nov 2026 04:30:18 GMT'}});};
 try{
  await assert.rejects(searchExtract(f),/could not be loaded/);
  const a=await searchExtract(f),b=await searchExtract({...f,page:1});
  assert.equal(a.total,25);assert.equal(a.opportunities.length,20);assert.equal(b.opportunities.length,5);assert.ok(!b.opportunities.some(x=>a.opportunities.some(y=>x.id===y.id)));assert.equal(calls,2);
  fail=true;Date.now=()=>originalNow()+7*3600000;const stale=await searchExtract(f);assert.equal(stale.total,25);assert.equal(stale.coverage.stale,true);
 }finally{globalThis.fetch=originalFetch;Date.now=originalNow;}
});
