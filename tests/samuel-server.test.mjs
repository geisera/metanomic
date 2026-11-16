import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const temp=await mkdtemp(join(tmpdir(),'samuel-test-'));
const source=(await readFile(new URL('../src/lib/samuel/server.ts',import.meta.url),'utf8')).replace("'./core'",JSON.stringify(new URL('../src/lib/samuel/core.ts',import.meta.url).href));
await writeFile(join(temp,'server.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {searchOpportunities,createBrief}=await import(join(temp,'server.mjs'));
after(()=>rm(temp,{recursive:true,force:true}));
const filters={keyword:'Salesforce',agency:'',naics:'',noticeType:'',setAside:'',postedFrom:'2026-10-01',postedTo:'2026-11-16',page:0};
const id='b'.repeat(32),notice={noticeId:id,title:'Salesforce services',postedDate:'2026-11-01'};
async function mocked(handler,run){const orig=globalThis.fetch;const key=process.env.SAM_GOV_API_KEY;const ai=process.env.AI_GATEWAY_API_KEY;globalThis.fetch=handler;process.env.SAM_GOV_API_KEY='fixture-private-key';process.env.AI_GATEWAY_API_KEY='fixture-ai-key';try{await run();}finally{globalThis.fetch=orig;if(key===undefined)delete process.env.SAM_GOV_API_KEY;else process.env.SAM_GOV_API_KEY=key;if(ai===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=ai;}}
test('Search uses official SAM endpoint, returns no key or upstream links',async()=>mocked(async(url,options)=>{assert.equal(new URL(url).origin,'https://api.sam.gov');assert.equal(new URL(url).searchParams.get('api_key'),'fixture-private-key');assert.equal(options.redirect,'error');return Response.json({totalRecords:1,opportunitiesData:[notice]});},async()=>{const r=await searchOpportunities(filters);assert.equal(r.opportunities.length,1);assert.equal(JSON.stringify(r).includes('fixture-private-key'),false);}));
test('Upstream authorization and quota errors never leak response bodies',async()=>{for(const status of [401,403,429,500])await mocked(async()=>new Response('fixture-private-key',{status}),async()=>{await assert.rejects(searchOpportunities(filters),e=>!e.message.includes('fixture-private-key'));});});
test('Missing configuration never calls upstream services',async()=>mocked(async()=>{assert.fail('unexpected request');},async()=>{delete process.env.SAM_GOV_API_KEY;await assert.rejects(searchOpportunities(filters),/SAM_GOV_API_KEY/);}));
test('Brief retrieves the source server-side and discloses unavailable description',async()=>{let calls=0;await mocked(async(url,options)=>{calls++;if(url.startsWith('https://api.sam.gov/opportunities/'))return Response.json({opportunitiesData:[notice]});if(url.startsWith('https://api.sam.gov/prod/'))return new Response('',{status:404});assert.equal(url,'https://ai-gateway.vercel.sh/v1/chat/completions');const payload=JSON.parse(options.body);assert.equal(payload.messages[1].content.includes('fixture-private-key'),false);assert.equal(JSON.parse(payload.messages[1].content).description,'Unavailable');return Response.json({choices:[{finish_reason:'stop',message:{content:'Preliminary fit. Verify requirements.'}}]});},async()=>{const r=await createBrief(id,'2026-11-01','We develop Salesforce integrations.');assert.equal(r.descriptionAvailable,false);assert.equal(r.notice.id,id);assert.equal(calls,3);});});
test('Truncated AI briefs are rejected rather than presented as complete',async()=>mocked(async(url)=>url.startsWith('https://api.sam.gov/opportunities/')?Response.json({opportunitiesData:[notice]}):url.startsWith('https://api.sam.gov/prod/')?Response.json({description:'<p>Salesforce integration required.</p>'}):Response.json({choices:[{finish_reason:'length',message:{content:'unfinished'}}]}),async()=>{await assert.rejects(createBrief(id,'2026-11-01','We develop Salesforce integrations.'),/complete brief/);}));

test('Documented no-data response produces empty results instead of an outage',async()=>mocked(async()=>Response.json({message:'No Data found'},{status:404}),async()=>{const r=await searchOpportunities(filters);assert.equal(r.total,0);assert.deepEqual(r.opportunities,[]);}));
test('Rejected date ranges and unknown 404s remain actionable errors',async()=>{
 await mocked(async()=>Response.json({message:'Date range must be 1 year(s) apart'},{status:400}),async()=>{await assert.rejects(searchOpportunities(filters),/HTTP 400; date_range/);});
 await mocked(async()=>new Response('<html>Not Found</html>',{status:404}),async()=>{await assert.rejects(searchOpportunities(filters),/HTTP 404; not_found/);});
});

const {searchSelectedSource}=await import(join(temp,'server.mjs'));
test('Extract source makes no API request or quota reservation',async()=>mocked(()=>assert.fail('unexpected live request'),async()=>{delete process.env.SAM_GOV_API_KEY;let calls=0;const r=await searchSelectedSource(filters,'extract',{reserve:()=>assert.fail('unexpected reservation'),extract:async f=>{assert.equal(f.keyword,'Salesforce');calls++;return {opportunities:[],total:0,page:0,fetchedAt:'now'};}});assert.equal(calls,1);assert.equal(r.source,'extract');}));
test('Live source reserves a request and preserves page and title filters',async()=>mocked(async url=>{const u=new URL(url);assert.equal(u.searchParams.get('title'),'Salesforce');assert.equal(u.searchParams.get('offset'),'2');return Response.json({opportunitiesData:[notice],totalRecords:50});},async()=>{let reserved=0;const r=await searchSelectedSource({...filters,page:2},'live',{reserve:async()=>{reserved++;return true;},extract:()=>assert.fail('no fallback')});assert.equal(reserved,1);assert.equal(r.source,'live');assert.equal(r.page,2);}));
test('Invalid source, missing key, exhausted budget and upstream error never fall back',async()=>{
 const deps={reserve:async()=>false,extract:()=>assert.fail('no fallback')};
 await mocked(()=>assert.fail('no upstream call'),async()=>{await assert.rejects(searchSelectedSource(filters,'invalid',deps),/Choose live/);await assert.rejects(searchSelectedSource(filters,'live',deps),/budget/);delete process.env.SAM_GOV_API_KEY;await assert.rejects(searchSelectedSource(filters,'live',deps),/configured/);});
 await mocked(async()=>new Response('unavailable',{status:503}),()=>assert.rejects(searchSelectedSource(filters,'live',{...deps,reserve:async()=>true}),/server error/));
});
