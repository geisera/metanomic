import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const id='11111111-1111-4111-8111-111111111111';
function route({authenticated=true,owned=true,reserved=true,fail=false,override=false,invalid=false,suspended=false,embedDisabled=false,blocked=false}={}){const calls=[],jobs=[];class StudioError extends Error{constructor(message,status=400,code){super(message);this.status=status;this.code=code;}}const agent={id,owner_id:'owner',origins:['https://example.com']};const deps={
 '@/lib/knowledge-server':{sameOrigin:()=>true,parseBody:r=>r.json()},
 '@/lib/studio/core':{StudioError,messages:v=>v,uuid:v=>v===id},
 '@/lib/studio/server':{session:async()=>{calls.push('session');if(!authenticated)throw new StudioError('Sign in',401);return {user:{id:'owner'}};},ownedAgent:async()=>{calls.push('owned');if(!owned)throw new StudioError('Not found',404);return agent;},runtimeAgent:async()=>agent,publishedDocs:async()=>[],apiKey:async()=>({value:override?'override-key':'shared-key',overrideVersion:override?'mock-version':null}),invalidateAssistantKey:async(agentId,version)=>calls.push(['invalidated',agentId,version]),rest:async path=>{calls.push(path);return reserved;},gate:async key=>calls.push(key),ipOf:()=> 'ip',failure:e=>Response.json({code:e.code,error:e.message},{status:e.status||503})},
 '@/lib/studio/crypto':{checkWidgetToken:()=>({origin:'https://example.com'})},
 'node:crypto':{randomUUID:()=> 'request-fixture'},
 '@/lib/studio/operations':{
   requireStudioRuntime:async(agentId,{dashboard,origin})=>{
     calls.push(['policy',agentId,dashboard,origin]);
     if(suspended||!dashboard&&(embedDisabled||blocked))throw new StudioError('Unavailable',403,'studio_access_blocked');
     return {message_limit:10};
   },
   recordStudioSupportError:async (agentId,requestId,code,preview)=> calls.push(['support',agentId,requestId,code,preview]),
 },
 'next/server':{after:job=>jobs.push(job)},
 '@/lib/studio/usage':{recordOutcome:async(a,day,success)=>calls.push('outcome:'+success)},
 '@/lib/studio/chat':{answer:async(a,key,m,d,s,finish)=>{calls.push('answer',key);if(invalid)throw new StudioError('Invalid key',503,'invalid_key');if(fail)throw new Error('provider failed');finish(true);return new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"done":true}\n'));c.close();}});}}
 };const compiled={exports:{}};const source=ts.transpileModule(readFileSync('src/app/api/theia-studio/chat/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',source)(name=>deps[name],compiled,compiled.exports);return {calls,async post(preview){const response=await compiled.exports.POST(new Request('https://metanomic.ai/api/theia-studio/chat',{method:'POST',body:JSON.stringify({agent_id:id,preview,messages:[{role:'user',content:'Hello'}]})}));await Promise.all(jobs.map(job=>job()));return response;}};}
test('owner Preview works even at daily limit and performs no usage writes or alerts',async()=>{const r=route({reserved:false});assert.equal((await r.post(true)).status,200);assert.ok(r.calls.includes('owned'));assert.ok(r.calls.some(c=>typeof c==="string"&&c.startsWith('preview:')));assert.ok(r.calls.includes('answer'));assert.ok(!r.calls.includes('rpc/studio_reserve'));assert.ok(!r.calls.some(c=>typeof c==="string"&&c.startsWith('outcome:')));});
test('preview flag cannot bypass authentication or assistant ownership',async()=>{for(const options of [{authenticated:false},{owned:false}]){const r=route(options);assert.ok((await r.post(true)).status>=400);assert.ok(!r.calls.includes('answer'));}});
test('public messages still reserve quota and report outcomes',async()=>{const r=route();assert.equal((await r.post(false)).status,200);assert.ok(r.calls.includes('rpc/studio_reserve'));assert.ok(r.calls.includes('outcome:true'));assert.ok(r.calls.some(c=>typeof c==="string"&&c.startsWith('chat:')));});
test('public messages remain blocked at daily limit',async()=>{const r=route({reserved:false});assert.equal((await r.post(false)).status,429);assert.ok(!r.calls.includes('answer'));});
test('failed preview cannot change visitor failure counters; failed public attempts do',async()=>{const preview=route({fail:true});assert.equal((await preview.post(true)).status,503);assert.ok(!preview.calls.some(c=>typeof c==="string"&&c.startsWith('outcome:')));const publicChat=route({fail:true});assert.equal((await publicChat.post(false)).status,503);assert.ok(publicChat.calls.includes('outcome:false'));});

test('preview and live chat both use the selected assistant key',async()=>{
 for(const preview of [true,false]){
   const r=route({override:true});
   assert.equal((await r.post(preview)).status,200);
   assert.ok(r.calls.includes('override-key'));
   assert.ok(!r.calls.includes('shared-key'));
 }
});
test('an invalid override is paused without retrying against the shared key',async()=>{
 const r=route({override:true,invalid:true});
 const response=await r.post(true);
 assert.equal(response.status,503);
 assert.equal((await response.json()).code,'assistant_key_invalid');
 assert.deepEqual(r.calls.find(c=>Array.isArray(c)&&c[0]==='invalidated'),['invalidated',id,'mock-version']);
 assert.ok(!r.calls.includes('shared-key'));
});

test('suspension blocks an already-open embed and owner Preview before quota or provider calls',async()=>{
 for(const preview of [false,true]){
    const r=route({suspended:true});
    assert.equal((await r.post(preview)).status,403);
    assert.ok(!r.calls.includes('answer'));
    assert.ok(!r.calls.includes('rpc/studio_reserve'));
    assert.ok(r.calls.some(c=>Array.isArray(c)&&c[0]==='support'&&c[3]==='studio_access_blocked'));
 }
});
test('embed-only controls stop public chat and preserve private Preview',async()=>{
 for(const options of [{embedDisabled:true},{blocked:true}]){
    assert.equal((await route(options).post(false)).status,403);
    assert.equal((await route(options).post(true)).status,200);
 }
});
