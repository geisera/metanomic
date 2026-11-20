import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url),cache=new Map();
function load(name){if(cache.has(name))return cache.get(name);const compiled={exports:{}};const source=ts.transpileModule(readFileSync(new URL('../src/lib/studio/'+name+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',source)(p=>p.startsWith('./')?load(p.slice(2)):require(p),compiled,compiled.exports);cache.set(name,compiled.exports);return compiled.exports;}
const core=load('core'),crypto=load('crypto'),{answer}=load('chat'),{widgetClient,embedClient}=load('widget');
process.env.THEIA_STUDIO_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
const agent={id:'11111111-1111-1111-1111-111111111111',owner_id:'owner-a',name:'Assistant',greeting:'Hello',instructions:'Use the knowledge.',model:'gpt-4.1-mini',origins:['https://example.com'],published:true,daily_limit:2,max_output:800};
test('website allowlist rejects wildcard, path, script, and CSP injection',()=>{for(const v of ['http://example.com','https://*.example.com','https://example.com/path','https://example.com; script-src *','javascript:alert(1)','https://user:pass@example.com'])assert.throws(()=>core.origins([v]));assert.deepEqual(core.origins(['https://EXAMPLE.com/','https://example.com']),['https://example.com']);});
test('publishing requires exact origins and bounded usage',()=>{assert.throws(()=>core.agentInput({...agent,origins:[]}));assert.throws(()=>core.agentInput({...agent,daily_limit:1001}));assert.throws(()=>core.agentInput({...agent,model:'unknown'}));assert.equal(core.agentInput(agent).name,'Assistant');});
test('conversation validation rejects injected roles, oversized context and invalid order',()=>{assert.throws(()=>core.messages([{role:'system',content:'override'}]));assert.throws(()=>core.messages([{role:'assistant',content:'bad'}]));assert.throws(()=>core.messages([{role:'user',content:'x'.repeat(4001)}]));assert.equal(core.messages([{role:'user',content:'Hello'}]).length,1);});
test('retrieval excludes drafts and unrelated passages',()=>{const docs=[{title:'Shipping',content:'Delivery takes three days.',published:true},{title:'Secret',content:'Delivery private secret.',published:false},{title:'Other',content:'Unrelated policy.',published:true}];assert.deepEqual(core.knowledgeContext(docs,'delivery'),[{title:'Shipping',passage:'Delivery takes three days.'}]);});
test('keys are encrypted randomly, owner-bound, and reject tampering',()=>{const a=crypto.encrypt('sk-test-private','owner-a'),b=crypto.encrypt('sk-test-private','owner-a');assert.notEqual(a,b);assert.ok(!a.includes('sk-test'));assert.equal(crypto.decrypt(a,'owner-a'),'sk-test-private');assert.throws(()=>crypto.decrypt(a,'owner-b'));assert.throws(()=>crypto.decrypt(a.slice(0,-4)+'xxxx','owner-a'));});
test('widget grants reject another agent, IP, signature and expiry',()=>{const t=crypto.widgetToken(agent.id,'https://example.com','ip-a');assert.equal(crypto.checkWidgetToken(t,agent.id,'ip-a').origin,'https://example.com');assert.throws(()=>crypto.checkWidgetToken(t,'other','ip-a'));assert.throws(()=>crypto.checkWidgetToken(t,agent.id,'ip-b'));assert.throws(()=>crypto.checkWidgetToken(t+'x',agent.id,'ip-a'));const now=Date.now;try{Date.now=()=>now()+3600001;assert.throws(()=>crypto.checkWidgetToken(t,agent.id,'ip-a'));}finally{Date.now=now;}});
test('public configuration never includes owner, prompt, origins, or key',()=>{assert.deepEqual(Object.keys(core.publicAgent(agent)),['id','name','greeting']);});
test('OpenAI streaming uses only supplied key and store:false, and handles split events',async()=>{const original=globalThis.fetch;let request;try{globalThis.fetch=async(url,opts)=>{request={url,...opts};return new Response(new ReadableStream({start(c){for(const part of ['data: {"type":"response.output_text.delta","delta":"Hi',' there"}\n\n','data: {"type":"response.completed"}\n\n'])c.enqueue(new TextEncoder().encode(part));c.close();}}));};const stream=await answer(agent,'sk-customer',[{role:'user',content:'Hello'}],[],new AbortController().signal);assert.equal(await new Response(stream).text(),'{"delta":"Hi there"}\n{"done":true,"text":"Hi there","retrievedSources":[],"sources":[],"citations":[],"tokens":null}\n');assert.equal(request.headers.Authorization,'Bearer sk-customer');const body=JSON.parse(request.body);assert.equal(body.store,false);assert.equal(body.max_output_tokens,800);assert.equal(body.model,agent.model);}finally{globalThis.fetch=original;}});
test('provider failure is safe and never falls back to a hosted key',async()=>{const original=globalThis.fetch;let count=0;try{globalThis.fetch=async()=>{count++;return new Response('private error with key',{status:401});};await assert.rejects(answer(agent,'sk-customer',[{role:'user',content:'Hello'}],[],new AbortController().signal),/key is invalid/);assert.equal(count,1);}finally{globalThis.fetch=original;}});
test('interrupted streams report an error rather than completed answer',async()=>{const original=globalThis.fetch;try{globalThis.fetch=async()=>new Response('data: {"type":"response.output_text.delta","delta":"Partial"}\n');const output=await new Response(await answer(agent,'sk-test',[{role:'user',content:'Hello'}],[],new AbortController().signal)).text();assert.match(output,/interrupted/);assert.doesNotMatch(output,/"done":true/);}finally{globalThis.fetch=original;}});
test('widget actually parses NDJSON chunks and preserves conversation',async()=>{const elements=new Map();function element(){return {textContent:'',value:'',children:[],disabled:false,append(e){this.children.push(e);},replaceChildren(){this.children=[];},remove(){},focus(){},click(){this.onclick?.();}};}for(const id of ['config','log','form','message','send','status','name','clear','close'])elements.set(id,element());elements.get('config').textContent=JSON.stringify({...core.publicAgent(agent),token:'grant',parentOrigin:'https://example.com'});const sent=[];const context={document:{getElementById:id=>elements.get(id),createElement:element,addEventListener(){}},parent:{postMessage(){}},AbortController,TextDecoder,fetch:async(url,opts)=>{sent.push(JSON.parse(opts.body));return new Response('{"delta":"Hello visitor"}\n{"done":true}\n');}};vm.runInNewContext(widgetClient,context);elements.get('message').value='Question one';await elements.get('form').onsubmit({preventDefault(){}});assert.equal(elements.get('status').textContent,'');assert.equal(elements.get('log').children.at(-1).children[0].children.join(''),'Hello visitor');elements.get('message').value='Question two';await elements.get('form').onsubmit({preventDefault(){}});assert.equal(sent[1].messages.length,3);assert.equal(sent[1].messages[1].content,'Hello visitor');elements.get('clear').onclick();assert.equal(elements.get('log').children.length,1);});
test('embed script parses independently without dependencies',()=>{assert.doesNotThrow(()=>new vm.Script(embedClient));});
function authRoute({recoveryCookie,currentPasswordValid=false,terms=null}={}){const jar=new Map(recoveryCookie?[['theia_studio_recovery',recoveryCookie]]:[]),calls=[];const s={token:'access-token',user:{id:'owner-a',email:'owner@example.invalid'}};const server={session:async()=>s,setSession:async()=>{},clearSession:async()=>calls.push('clear'),reserveAuthAttempt:async()=>{},ipOf:()=>'',failure:e=>Response.json({error:e.message},{status:e.status||503}),rest:async()=>[],authFetch:async(path)=>{calls.push(path);if(path.startsWith('token'))return Response.json(currentPasswordValid?{user:s.user,access_token:'reauth'}:{},{status:currentPasswordValid?200:401});return Response.json({});}};const compiled={exports:{}};const source=ts.transpileModule(readFileSync(new URL('../src/app/api/theia-studio/auth/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const deps={'next/headers':{cookies:async()=>({get:k=>jar.has(k)?{value:jar.get(k)}:undefined,set:(k,v)=>jar.set(k,v),delete:k=>jar.delete(k)})},'@/lib/knowledge-server':{sameOrigin:r=>r.headers.get('origin')===new URL(r.url).origin,parseBody:r=>r.json()},'@/lib/studio/core':core,'@/lib/studio/crypto':crypto,'@/lib/studio/server':server,'@/lib/studio/login-destination':load('login-destination'),'@/lib/studio/welcome':{sendStudioWelcome:async()=>{}},'@/lib/studio/account-label':load('account-label'),'@/lib/studio/impersonation':load('impersonation'),'@/lib/studio/terms':{signupTerms:async()=>terms,recordStudioTermsAcceptance:async(id,version)=>calls.push([id,version])},'@/lib/studio/mail':{sendAuthLink:async(_email,type,options)=>{await options?.beforeSend?.(agent.id);calls.push(type==='magiclink'?'magiclink-mail':'mail');if(options?.loginDestination)calls.push(['redirect',options.loginDestination]);}}};new Function('require','module','exports',source)(p=>deps[p]||require(p),compiled,compiled.exports);return {calls,post:body=>compiled.exports.POST(new Request('https://metanomic.ai/api/theia-studio/auth',{method:'POST',headers:{origin:'https://metanomic.ai','Content-Type':'application/json'},body:JSON.stringify(body)}))};}
test('forged recovery cookie cannot bypass current password',async()=>{const r=authRoute({recoveryCookie:'owner-a'});assert.equal((await r.post({action:'password',password:'a-long-new-password'})).status,401);assert.ok(!r.calls.includes('user'));});
test('verified session-bound recovery can set password and revokes all sessions',async()=>{const r=authRoute({recoveryCookie:crypto.fingerprint('recovery:owner-a:access-token')});assert.equal((await r.post({action:'password',password:'a-long-new-password'})).status,200);assert.ok(r.calls.includes('logout?scope=global'));assert.ok(r.calls.includes('clear'));});
test('account deletion requires reauthentication and revokes sessions first',async()=>{const denied=authRoute();assert.equal((await denied.post({action:'delete',confirm:'DELETE'})).status,401);const allowed=authRoute({currentPasswordValid:true});assert.equal((await allowed.post({action:'delete',confirm:'DELETE',current_password:'valid'})).status,200);assert.ok(allowed.calls.indexOf('logout?scope=global')<allowed.calls.indexOf('admin/users/owner-a'));});

test('reply metadata includes only supplied citations and provider token usage',async()=>{const original=globalThis.fetch;let success;try{const events=[{type:'response.output_text.delta',delta:'Returns [Know'},{type:'response.output_text.delta',delta:'ledge: 1] [Knowledge: 99]'},{type:'response.completed',response:{usage:{total_tokens:123}}}];globalThis.fetch=async()=>new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''));const docs=[{id:'doc',title:'Returns policy',source_url:'https://example.com/returns',content:'Returns are accepted within thirty days.',published:true}];const text=await new Response(await answer(agent,'sk-test',[{role:'user',content:'Returns policy?'}],docs,new AbortController().signal,v=>{success=v;})).text();assert.doesNotMatch(text,/\[Knowledge:/);const done=JSON.parse(text.trim().split('\n').at(-1));assert.deepEqual(done,{done:true,text:'Returns',retrievedSources:['Returns policy'],sources:['Returns policy'],citations:[{title:'Returns policy',url:'https://example.com/returns'}],tokens:123});assert.equal(success,true);}finally{globalThis.fetch=original;}});
test('known provider failures have actionable codes without leaking provider content',async()=>{const original=globalThis.fetch;try{for(const [status,code,expected] of [[401,'invalid_api_key','invalid_key'],[404,'model_not_found','model_access'],[429,'insufficient_quota','insufficient_credit']]){globalThis.fetch=async()=>Response.json({error:{code,message:'secret-provider-detail'}},{status});await assert.rejects(answer(agent,'sk-test',[{role:'user',content:'Hi'}],[],new AbortController().signal),e=>e.code===expected&&!e.message.includes('secret'));}}finally{globalThis.fetch=original;}});

test('all four embed corners use the correct edge and chat opening order',()=>{for(const position of ['left','right','top-left','top-right']){let host,shadow;const handlers={};function element(tag){return {tag,style:{},children:[],setAttribute(){},addEventListener(){},attachShadow(){shadow=element('shadow');return shadow;},append(...children){this.children.push(...children);},classList:{toggle(){}},focus(){}};}const context={URL,document:{currentScript:{src:'https://metanomic.ai/theia-embed.js',dataset:{agent:agent.id,position,color:'#091019',textColor:'#ecf0ed',outlineColor:'#c9ec8a'}},createElement:element,body:{append(el){host=el;}}},window:{addEventListener(){}}};vm.runInNewContext(embedClient,context);assert.ok(host.style.cssText.includes(position.startsWith('top')?'top:max':'bottom:max'));assert.ok(host.style.cssText.includes(position.endsWith('left')?'left:max':'right:max'));assert.deepEqual(shadow.children.map(e=>e.tag),position.startsWith('top')?['style','button','iframe']:['style','iframe','button']);const button=shadow.children.find(e=>e.tag==='button');assert.equal(button.style.color,'#ecf0ed');assert.equal(button.style.border,'1px solid #c9ec8a');}});

test('retrieved source metadata survives an answer without a citation tag',async()=>{const original=globalThis.fetch;try{globalThis.fetch=async()=>new Response('data: {"type":"response.output_text.delta","delta":"The Mesh Sack Rack is a breathable nylon carrier."}\n\ndata: {"type":"response.completed","response":{"usage":{"total_tokens":99}}}\n\n');const docs=[{id:'published',title:'Product catalog',content:'The Mesh Sack Rack is a breathable nylon carrier.',published:true},{id:'draft',title:'Private draft',content:'Mesh Sack Rack draft.',published:false},{id:'other',title:'Warranty',content:'Warranty information.',published:true}];const output=await new Response(await answer(agent,'sk-test',[{role:'user',content:'What is the Mesh Sack Rack?'}],docs,new AbortController().signal)).text();const metadata=JSON.parse(output.trim().split('\n').at(-1));assert.deepEqual(metadata.retrievedSources,['Product catalog']);assert.deepEqual(metadata.sources,[]);assert.equal(metadata.tokens,99);}finally{globalThis.fetch=original;}});

test('side tabs support both edges and every alignment while retaining open/close behavior',()=>{for(const orientation of ['vertical','horizontal'])for(const side of ['left','right'])for(const alignment of ['top','middle','bottom']){let host,shadow;const handlers={};function element(tag){return {tag,style:{},children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(){},attachShadow(){shadow=element('shadow');return shadow;},append(...children){this.children.push(...children);},classList:{toggle(){}},focus(){this.focused=true;}};}vm.runInNewContext(embedClient,{URL,document:{currentScript:{src:'https://metanomic.ai/theia-embed.js',dataset:{agent:agent.id,style:'side-tab',side,alignment,orientation,label:'Ask us'}},createElement:element,body:{append(el){host=el;}}},window:{addEventListener(name,handler){handlers[name]=handler;}}});assert.ok(host.style.cssText.includes(side+':max(0px'));assert.ok(host.style.cssText.includes(alignment==='middle'?'top:50%':alignment+':max'));const button=shadow.children.find(e=>e.tag==='button'),frame=shadow.children.find(e=>e.tag==='iframe');assert.equal(button.style.writingMode,orientation==='horizontal'?'horizontal-tb':'vertical-rl');assert.equal(frame.className,'side-panel');assert.equal(frame.src,undefined);button.onclick();assert.equal(button.attrs['aria-expanded'],'true');assert.equal(button.style.display,'none');assert.equal(frame.focused,true);assert.equal(frame.src,'https://metanomic.ai/theia-widget/'+agent.id);handlers.message({origin:'https://metanomic.ai',source:frame.contentWindow,data:{type:'theia:close',id:agent.id}});assert.equal(button.attrs['aria-expanded'],'false');assert.equal(button.style.display,'');assert.equal(button.textContent,'Ask us');assert.equal(button.focused,true);}});

test('custom side-tab offsets preserve positioning and chat interaction',()=>{for(const orientation of ['vertical','horizontal'])for(const side of ['left','right'])for(const alignment of ['custom'])for(const offset of [0,27,50,100]){let host,shadow;const handlers={};function element(tag){return {tag,style:{},children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(){},attachShadow(){shadow=element('shadow');return shadow;},append(...children){this.children.push(...children);},classList:{toggle(){}},focus(){this.focused=true;}};}vm.runInNewContext(embedClient,{URL,document:{currentScript:{src:'https://metanomic.ai/theia-embed.js',dataset:{agent:agent.id,style:'side-tab',side,alignment,orientation,offset:String(offset),label:'Ask us'}},createElement:element,body:{append(el){host=el;}}},window:{addEventListener(name,handler){handlers[name]=handler;}}});assert.ok(host.style.cssText.includes(side+':max(0px'));assert.ok(host.style.cssText.includes('bottom:max(20px'));const button=shadow.children.find(e=>e.tag==='button'),frame=shadow.children.find(e=>e.tag==='iframe');assert.equal(button.style.writingMode,orientation==='horizontal'?'horizontal-tb':'vertical-rl');assert.equal(button.style.top,offset+'%');assert.equal(button.style.transform,'translateY(-'+offset+'%)');assert.equal(frame.className,'side-panel');assert.equal(frame.src,undefined);button.onclick();assert.equal(button.attrs['aria-expanded'],'true');assert.equal(button.style.display,'none');assert.equal(frame.focused,true);assert.equal(frame.src,'https://metanomic.ai/theia-widget/'+agent.id);handlers.message({origin:'https://metanomic.ai',source:frame.contentWindow,data:{type:'theia:close',id:agent.id}});assert.equal(button.attrs['aria-expanded'],'false');assert.equal(button.style.display,'');assert.equal(button.textContent,'Ask us');assert.equal(button.focused,true);}});

test('custom pill offsets preserve positioning and chat interaction',()=>{for(const orientation of ['vertical','horizontal'])for(const side of ['left','right'])for(const alignment of ['custom'])for(const offset of [0,27,50,100]){let host,shadow;const handlers={};function element(tag){return {tag,style:{},children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(){},attachShadow(){shadow=element('shadow');return shadow;},append(...children){this.children.push(...children);},classList:{toggle(){}},focus(){this.focused=true;}};}vm.runInNewContext(embedClient,{URL,document:{currentScript:{src:'https://metanomic.ai/theia-embed.js',dataset:{agent:agent.id,style:'pill',pillSide:side,pillAlignment:alignment,pillOrientation:orientation,pillOffset:String(offset),label:'Ask us'}},createElement:element,body:{append(el){host=el;}}},window:{addEventListener(name,handler){handlers[name]=handler;}}});assert.ok(host.style.cssText.includes(side+':max(20px'));assert.ok(host.style.cssText.includes('bottom:max(20px'));const button=shadow.children.find(e=>e.tag==='button'),frame=shadow.children.find(e=>e.tag==='iframe');assert.equal(button.style.writingMode,orientation==='horizontal'?'horizontal-tb':'vertical-rl');assert.equal(button.style.top,offset+'%');assert.equal(button.style.transform,'translateY(-'+offset+'%)');assert.equal(frame.className,'side-panel');assert.equal(frame.src,undefined);button.onclick();assert.equal(button.attrs['aria-expanded'],'true');assert.equal(button.style.display,'none');assert.equal(frame.focused,true);assert.equal(frame.src,'https://metanomic.ai/theia-widget/'+agent.id);handlers.message({origin:'https://metanomic.ai',source:frame.contentWindow,data:{type:'theia:close',id:agent.id}});assert.equal(button.attrs['aria-expanded'],'false');assert.equal(button.style.display,'');assert.equal(button.textContent,'Ask us');assert.equal(button.focused,true);}});

test('remote appearance overrides old attributes and configuration failures hide the launcher',async()=>{
 const {embedLoader}=load('widget');
 for(const ok of [true,false]){
 let host,shadow,requested;
 function element(tag){return {tag,style:{},children:[],setAttribute(){},addEventListener(){},attachShadow(){shadow=element('shadow');return shadow;},append(...children){this.children.push(...children);},classList:{toggle(){}},focus(){}};}
 await vm.runInNewContext(embedLoader,{URL,document:{currentScript:{src:'https://metanomic.ai/theia-embed.js',dataset:{agent:agent.id,label:'Old label',color:'#ff0000'}},createElement:element,body:{append(el){host=el;}}},window:{addEventListener(){}},fetch:async (url,options)=>{requested=String(url);assert.equal(options.referrerPolicy,'strict-origin');assert.equal(options.credentials,'omit');return {ok,json:async()=>({label:'Saved label',color:'#112233'})};}});
 assert.equal(requested,'https://metanomic.ai/theia-config/'+agent.id);
 if(ok){const button=shadow.children.find(e=>e.tag==='button');assert.equal(button.textContent,'Saved label');assert.equal(button.style.background,'#112233');}else assert.equal(host,undefined);
 }
});
test('public launcher configuration excludes private assistant fields',()=>{
 const {launcherConfig}=load('launcher');const config=launcherConfig({...agent,instructions:'private instructions',owner_id:'private owner',api_key:'private key'});
 assert.doesNotMatch(JSON.stringify(config),/private|instructions|owner_id|api_key/);
});

test('launcher animation defaults off and exposes only supported choices',()=>{
 const {launcherConfig}=load('launcher');
 assert.equal(launcherConfig(agent).animation,'off');
 assert.equal(launcherConfig(agent).repeatAnimation,'false');
 assert.equal(launcherConfig({...agent,launcher_animation_repeat:true}).repeatAnimation,'true');
 for(const animation of ['glow','pulse'])assert.equal(launcherConfig({...agent,launcher_animation:animation}).animation,animation);
 assert.equal(launcherConfig({...agent,launcher_animation:'unknown'}).animation,'off');
});

test('launcher animates once, respects reduced motion, and cancels when opened',()=>{
 for(const style of ['pill','side-tab'])for(const repeat of [false,true])for(const reduced of [false,true])for(const openEarly of [false,true]){
  let shadow, pending, plays=0, cancels=0;
  function element(tag){return {tag,style:{setProperty(){}},setAttribute(){},addEventListener(){},attachShadow(){return shadow=element('shadow');},append(...children){this.children=children;},classList:{toggle(){}},focus(){},animate(frames){assert.equal(frames[1].translate,'0 -10px');plays++;return {cancel(){cancels++;}}}};}
  vm.runInNewContext(embedClient,{URL,document:{currentScript:{src:'https://metanomic.ai/theia-embed.js',dataset:{agent:agent.id,style,animation:'pulse',repeatAnimation:String(repeat)}},createElement:element,body:{append(){}}},window:{addEventListener(){},matchMedia(){return {matches:reduced};}},setTimeout(callback,delay){assert.equal(delay,pending?15000:3000);pending=callback;return 1;},clearTimeout(){pending=undefined;}});
  const button=shadow.children.find(el=>el.tag==='button');
  if(openEarly)button.onclick();
  pending?.();
  assert.equal(plays,!openEarly&&!reduced?1:0);
  if(repeat&&!openEarly){pending?.();assert.equal(plays,reduced?0:2);}
  if(!openEarly)button.onclick();
  assert.equal(pending,undefined);
  assert.equal(cancels,plays?1:0);
 }
});

test('citation URLs must be HTTPS and cannot contain embedded credentials',()=>{
 for(const url of ['javascript:alert(1)','http://example.com','https://user:pass@example.com','/returns'])assert.equal(core.knowledgeSourceUrl(url),null);
 assert.equal(core.knowledgeSourceUrl('https://example.com/returns'),'https://example.com/returns');
});

test('signup requires explicit acceptance of the current terms and records it before sending email',async()=>{
 const {post,calls}=authRoute({terms:{version:'2026-11-v1',body:'Approved terms'}});
 const input={action:'signup',email:'owner@example.invalid',password:'long-password',termsVersion:'2026-11-v1'};
 assert.equal((await post(input)).status,400);
 assert.equal((await post({...input,acceptedTerms:true,termsVersion:'old'})).status,409);
 assert.deepEqual(calls,[]);
 assert.equal((await post({...input,acceptedTerms:true})).status,200);
 assert.deepEqual(calls,[[agent.id,'2026-11-v1'],'mail']);
});

test('email-link sign-in requests mail without running signup or terms acceptance',async()=>{
 const {post,calls}=authRoute({terms:{version:'2026-11-v1',body:'Approved terms'}});
 const result=await post({action:'magiclink',email:'owner@example.invalid'});
 assert.equal(result.status,200);
 assert.match((await result.json()).message,/sign-in link/);
 assert.deepEqual(calls,['magiclink-mail']);
});

test('magic-link requests carry only normalized same-origin destinations', async () => {
 const {post,calls}=authRoute();
 const body={action:'magiclink',email:'tester@example.invalid'};
 for (const redirect of ['https://evil.example/', '//evil.example/', '/%2F%2Fevil.example/', '/a/..//evil.example/', 'javascript:alert(1)', '/assistant-studio/login']) {
   assert.equal((await post({...body,redirect})).status,200);
 }
 assert.deepEqual(calls,Array(6).fill('magiclink-mail'));
 const redirect='https://metanomic.ai/assistant-studio/dashboard?setup=embed#install';
 assert.equal((await post({...body,redirect})).status,200);
 assert.deepEqual(calls.at(-1),['redirect','/assistant-studio/dashboard?setup=embed#install']);
});

test('call to action saves a complete HTTPS link or clears both fields', () => {
 const {callToActionInput}=load('call-to-action');
 assert.deepEqual(callToActionInput(' Book a consultation ', 'https://EXAMPLE.com/book?ref=chat'), {
   cta_label:'Book a consultation',cta_url:'https://example.com/book?ref=chat'
 });
 assert.deepEqual(callToActionInput(' ', ''),{cta_label:null,cta_url:null});
 assert.throws(()=>callToActionInput('Learn more',''));
 assert.throws(()=>callToActionInput('','https://example.com'));
 assert.throws(()=>callToActionInput('a'.repeat(61),'https://example.com'));
 for(const url of ['http://example.com','/book','javascript:alert(1)','https://user:pass@example.com']) {
   assert.throws(()=>callToActionInput('Learn more',url));
 }
});

test('widget renders the saved call to action as an escaped external link', () => {
 const {widgetCallToAction}=load('widget');
 assert.equal(widgetCallToAction(agent,'pro'),'');
 assert.equal(widgetCallToAction({...agent,cta_label:'Book now',cta_url:'javascript:alert(1)'},'pro'),'');
 const configured={...agent,cta_label:'Book <a> & ask',cta_url:'https://example.com/book?a=1&b=2'};
 assert.equal(widgetCallToAction(configured,'starter'),'');
 assert.equal(widgetCallToAction(configured),'');
 const html=widgetCallToAction(configured,'pro');
 assert.equal(widgetCallToAction(configured,'enterprise'),html);
 assert.match(html,/href="https:\/\/example\.com\/book\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer"/);
 assert.match(html,/>Book &lt;a&gt; &amp; ask<\/a>/);
});
