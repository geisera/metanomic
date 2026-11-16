import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import {normalizeEntity,entitySettings,validUei} from '../src/lib/samuel/entity.ts';
const uei='ABC123DEF456';
const raw={entityRegistration:{ueiSAM:uei,legalBusinessName:'Example LLC',registrationStatus:'Active',publicDisplayFlag:'Y',registrationExpirationDate:'2027-04-01',tin:'SECRET'},coreData:{businessTypes:{businessTypeList:[{businessTypeDesc:'For Profit Organization'}]},financialInformation:{bankAccount:'SECRET'}},assertions:{goodsAndServices:{primaryNaics:'541512',naicsList:[{naicsCode:'541512',naicsDescription:'Computer Systems Design'}]}}};
test('Entity projection contains only permitted fields and matches the requested UEI',()=>{const r=normalizeEntity(raw,uei);assert.equal(r.name,'Example LLC');assert.equal(r.primaryNaics,'541512');assert.deepEqual(r.businessTypes,['For Profit Organization']);assert.equal(JSON.stringify(r).includes('SECRET'),false);assert.equal(normalizeEntity(raw,'ZZZ123DEF456'),null);assert.equal(normalizeEntity({...raw,entityRegistration:{...raw.entityRegistration,publicDisplayFlag:'N'}},uei),null);});
test('Visibility and brief usage remain independent, with both off by default',()=>{assert.deepEqual(entitySettings(null),{show:false,useInBriefs:false,uei:''});assert.deepEqual(entitySettings({show:false,useInBriefs:true,uei}),{show:false,useInBriefs:true,uei});assert.equal(entitySettings({show:true,useInBriefs:true,uei:'bad'}).useInBriefs,false);assert.equal(validUei('ABC123DEF456&evil'),false);});
const temp=await mkdtemp(join(tmpdir(),'samuel-entity-'));
for(const name of ['server','entity-server']){let source=await readFile(new URL(`../src/lib/samuel/${name}.ts`,import.meta.url),'utf8');for(const dep of ['core','entity'])source=source.replaceAll(`'./${dep}'`,JSON.stringify(new URL(`../src/lib/samuel/${dep}.ts`,import.meta.url).href));source=source.replaceAll("'./server'","'./server.mjs'");await writeFile(join(temp,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);}
const {fetchEntity}=await import(join(temp,'entity-server.mjs'));const {createBrief}=await import(join(temp,'server.mjs'));
after(()=>rm(temp,{recursive:true,force:true}));
async function mock(handler,run){const fetch=globalThis.fetch,key=process.env.SAM_GOV_API_KEY,ai=process.env.AI_GATEWAY_API_KEY;globalThis.fetch=handler;process.env.SAM_GOV_API_KEY='private-test-key';process.env.AI_GATEWAY_API_KEY='test-ai';try{await run();}finally{globalThis.fetch=fetch;if(key===undefined)delete process.env.SAM_GOV_API_KEY;else process.env.SAM_GOV_API_KEY=key;if(ai===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=ai;}}
test('Lookup uses exact UEI and documented sections, excludes raw response fields',async()=>mock(async url=>{const u=new URL(url);assert.equal(u.pathname,'/entity-information/v3/entities');assert.equal(u.searchParams.get('ueiSAM'),uei);assert.equal(u.searchParams.get('includeSections'),'entityRegistration,coreData,assertions');return Response.json({entityData:[raw],selfLink:'private-test-key'});},async()=>{const r=await fetchEntity(uei);assert.equal(r.uei,uei);assert.ok(!JSON.stringify(r).includes('private-test-key'));}));
test('Invalid UEI, missing record, ambiguous response and permission denial do not produce a record',async()=>{
 await mock(()=>assert.fail('must not fetch'),()=>assert.rejects(fetchEntity('invalid'),/12-character/));
 for(const entityData of [[],[raw,raw]])await mock(async()=>Response.json({entityData}),()=>assert.rejects(fetchEntity(uei),/No publicly|multiple registrations/));
 await mock(async()=>new Response('private-test-key',{status:403}),()=>assert.rejects(fetchEntity(uei),e=>e.message.includes('permissions')&&!e.message.includes('private-test-key')));
});
test('Brief includes retrieved entity only when requested and labels its provenance',async()=>{
 const notice={id:'a'.repeat(32),title:'Test',posted:'2026-11-16'};const evidence={notice,description:'Test',descriptionTruncated:false,fetchedAt:'2026-11-16'};
 for(const enabled of [false,true])await mock(async(url,options)=>{const payload=JSON.parse(options.body),context=JSON.parse(payload.messages[1].content);assert.equal('samEntityRecord' in context,enabled);assert.match(payload.messages[0].content,/SAM.gov entity record/);return Response.json({choices:[{finish_reason:'stop',message:{content:'A preliminary brief.'}}]});},async()=>{const r=await createBrief(notice.id,notice.posted,'Self-reported capabilities',evidence,enabled?normalizeEntity(raw,uei):undefined);assert.equal(!!r.entityUsed,enabled);});
});
