import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const id='11111111-1111-4111-8111-111111111111';
function route({authenticated=true,owned=true,reserved=true,fail=false}={}){const calls=[],jobs=[];class StudioError extends Error{constructor(message,status=400,code){super(message);this.status=status;this.code=code;}}const agent={id,owner_id:'owner',origins:['https://example.com']};const deps={
 '@/lib/knowledge-server':{sameOrigin:()=>true,parseBody:r=>r.json()},
 '@/lib/studio/core':{StudioError,messages:v=>v,uuid:v=>v===id},
 '@/lib/studio/server':{session:async()=>{calls.push('session');if(!authenticated)throw new StudioError('Sign in',401);return {user:{id:'owner'}};},ownedAgent:async()=>{calls.push('owned');if(!owned)throw new StudioError('Not found',404);return agent;},runtimeAgent:async()=>agent,publishedDocs:async()=>[],apiKey:async()=> 'mock-key',rest:async path=>{calls.push(path);return reserved;},gate:async key=>calls.push(key),ipOf:()=> 'ip',failure:e=>Response.json({code:e.code,error:e.message},{status:e.status||503})},
 '@/lib/studio/crypto':{checkWidgetToken:()=>({origin:'https://example.com'})},
 'next/server':{after:job=>jobs.push(job)},
 '@/lib/studio/usage':{recordOutcome:async(a,day,success)=>calls.push('outcome:'+success)},
 '@/lib/studio/chat':{answer:async(a,key,m,d,s,finish)=>{calls.push('answer');if(fail)throw new Error('provider failed');finish(true);return new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"done":true}\n'));c.close();}});}}
 };const compiled={exports:{}};const source=ts.transpileModule(readFileSync('src/app/api/theia-studio/chat/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',source)(name=>deps[name],compiled,compiled.exports);return {calls,async post(preview){const response=await compiled.exports.POST(new Request('https://metanomic.ai/api/theia-studio/chat',{method:'POST',body:JSON.stringify({agent_id:id,preview,messages:[{role:'user',content:'Hello'}]})}));await Promise.all(jobs.map(job=>job()));return response;}};}
test('owner Preview works even at daily limit and performs no usage writes or alerts',async()=>{const r=route({reserved:false});assert.equal((await r.post(true)).status,200);assert.ok(r.calls.includes('owned'));assert.ok(r.calls.some(c=>c.startsWith('preview:')));assert.ok(r.calls.includes('answer'));assert.ok(!r.calls.includes('rpc/studio_reserve'));assert.ok(!r.calls.some(c=>c.startsWith('outcome:')));});
test('preview flag cannot bypass authentication or assistant ownership',async()=>{for(const options of [{authenticated:false},{owned:false}]){const r=route(options);assert.ok((await r.post(true)).status>=400);assert.ok(!r.calls.includes('answer'));}});
test('public messages still reserve quota and report outcomes',async()=>{const r=route();assert.equal((await r.post(false)).status,200);assert.ok(r.calls.includes('rpc/studio_reserve'));assert.ok(r.calls.includes('outcome:true'));assert.ok(r.calls.some(c=>c.startsWith('chat:')));});
test('public messages remain blocked at daily limit',async()=>{const r=route({reserved:false});assert.equal((await r.post(false)).status,429);assert.ok(!r.calls.includes('answer'));});
test('failed preview cannot change visitor failure counters; failed public attempts do',async()=>{const preview=route({fail:true});assert.equal((await preview.post(true)).status,503);assert.ok(!preview.calls.some(c=>c.startsWith('outcome:')));const publicChat=route({fail:true});assert.equal((await publicChat.post(false)).status,503);assert.ok(publicChat.calls.includes('outcome:false'));});
