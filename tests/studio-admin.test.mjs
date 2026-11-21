import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

function load(path,dependencies={},fetchMock=fetch,processMock=process) {
    const compiledModule={exports:{}};
    const compiled=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    new Function('require','module','exports','fetch','process',compiled)(name=>dependencies[name],compiledModule,compiledModule.exports,fetchMock,processMock);
    return compiledModule.exports;
}

const core=load('src/lib/studio/core.ts');
const contract=load('src/lib/studio/admin-contract.ts');
const scopeControl=load('src/lib/studio/scope-control.ts',{'./core':core});
const initialScopeConfig={model:'openai/gpt-6-luna',enabled:true,pro_monthly:5000,enterprise_monthly:20000,global_monthly:100000,timeout_ms:2500,guard_prompt:'Current classifier instructions',guard_prompt_version:1,topic_prompt:'Current reply instructions',topic_prompt_version:1};
const actor='b436acc1-9f6d-4cc0-994a-f4d883573552';
const owner='c35e6552-f086-4f0a-9e2d-0a04d3d06b8f';
const factor='e9ca2204-9208-47e3-a276-47ec9d97c3c7';
const token=level=>'header.'+Buffer.from(JSON.stringify({aal:level})).toString('base64url')+'.signature';

function route({roles=['support'],level='aal2',status='verified',allowOrigin=true,qrCode}={}) {
    const calls=[];
    const server={
        session:async()=>({token:token(level),user:{id:actor,factors:[{id:factor,factor_type:'totp',status}]}}),
        gate:async()=>{},
        authFetch:async (path)=>{
            calls.push(path);
            if(path==='factors')return Response.json({id:factor,totp:{secret:'FIXTURESECRET',qr_code:qrCode}});
            return path.endsWith('/challenge')?Response.json({id:factor}):Response.json({access_token:token('aal2'),refresh_token:'fixture',user:{id:actor}});
        },
        setSession:async()=>{calls.push('session_updated');},
        rest:async (path,options)=>{
            calls.push([path,options.body]);
            if(path.startsWith('studio_staff?'))return roles.length?[{roles}]:[];
            if(path==='rpc/studio_admin_workspace')return {owner_id:owner};
            if(path==='rpc/studio_admin_lookup')return [];
            if(path.startsWith('studio_scope_config?'))return [initialScopeConfig];
            if(path==='rpc/studio_save_guard_prompt'||path==='rpc/studio_save_topic_prompt')return options.body.p_version===1 ? 2 : null;
            if(path==='rpc/studio_admin_stats')return {members:3,tiers:[{id:'starter',members:3}]};
        },
        failure:e=>Response.json({error:e.message,code:e.code},{status:e.status||503}),
    };
    const operations={addressFingerprint:()=> 'hashed',domainName:v=>v};
    const admin=load('src/lib/studio/admin.ts',{'./core':core,'./server':server});
    const route=load('src/app/api/studio-admin/route.ts',{
        '@/lib/knowledge-server':{parseBody:req=>req.json(),sameOrigin:()=>allowOrigin},
        '@/lib/studio/scope-control':scopeControl,'@/lib/studio/admin-contract':contract,'@/lib/studio/admin':admin,'@/lib/studio/core':core,
        '@/lib/studio/server':server,'@/lib/studio/operations':operations,
    });
    const post=body=>route.POST(new Request('https://example.com/api/studio-admin',{method:'POST',body:JSON.stringify(body)}));
    return {calls,post};
}

test('staff workspace lookup rejects non-staff, missing MFA, and cross-origin requests before any customer read',async()=>{
    for(const options of [{roles:[]},{level:'aal1'},{status:'unverified'},{allowOrigin:false}]){
        const app=route(options);
        assert.equal((await app.post({action:'lookup',query:'owner@example.com'})).status,403);
        assert.ok(!app.calls.some(call=>Array.isArray(call)&&call[0]==='rpc/studio_admin_lookup'));
    }
});

test('a workspace read is audited and a support-only account cannot suspend a workspace',async()=>{
    const app=route();
    assert.equal((await app.post({action:'workspace',ownerId:owner})).status,200);
    const event=app.calls.find(call=>Array.isArray(call)&&call[0]==='studio_staff_audit');
    assert.equal(event[1].actor_id,actor);
    assert.equal(event[1].owner_id,owner);
    assert.equal((await app.post({action:'suspend_workspace',ownerId:owner,reason:'Example case'})).status,403);
    assert.ok(!app.calls.some(call=>Array.isArray(call)&&call[0]==='rpc/studio_admin_change'));
});

test('workspace restoration requires fresh verification before invoking the audited mutation',async()=>{
    const app=route({roles:['operations']});
    const action={action:'restore_workspace',ownerId:owner,reason:'Case resolved'};
    assert.equal((await app.post(action)).status,400);
    assert.ok(!app.calls.some(call=>Array.isArray(call)&&call[0]==='rpc/studio_admin_change'));
    assert.equal((await app.post({...action,code:'123456',factorId:factor})).status,200);
    const write=app.calls.findIndex(call=>Array.isArray(call)&&call[0]==='rpc/studio_admin_change');
    assert.ok(write>app.calls.indexOf('session_updated'));
    assert.equal(app.calls[write][1].p_reason,'Case resolved');
});

test('staff enrollment returns the QR as an inline SVG image with a manual fallback',async()=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>';
    for(const qrCode of [svg,'<?xml version="1.0"?>\n'+svg,'<?xml version="1.0"?>\n<!-- Generated by SVGo -->\n'+svg,undefined]){
        const app=route({level:'aal1',status:'unverified',qrCode});
        const response=await app.post({action:'enroll'});
        assert.equal(response.status,200);
        assert.equal(response.headers.get('Cache-Control'),'no-store');
        assert.deepEqual(await response.json(),{
            factorId:factor,secret:'FIXTURESECRET',qrImage:qrCode?'data:image/svg+xml;base64,'+Buffer.from(qrCode).toString('base64'):null,
        });
    }
});

function accountHandlers({roles=['operations','billing'],isStaff=false}={}){
    const calls=[];
    const account={owner_id:owner,email:'old@example.invalid',display_name:'Owner',email_confirmed_at:'today',inactive:false,is_staff:isStaff};
    const staff={roles,verified:true,session:{user:{id:actor}}};
    const admin={
        requireStaffMfa:(_staff,role)=>{if(!staff.roles.includes(role))throw new core.StudioError('No access',403);},
        verifyStaffMfa:async(_staff,_factor,code)=>{if(code!=='123456')throw new core.StudioError('MFA required',403);calls.push('verified');},
    };
    const server={
        authFetch:async(path,body)=>{
            calls.push([path,body]);
            if(body.email)account.email=body.email;
            if(body.user_metadata)account.display_name=body.user_metadata.display_name;
            if(body.ban_duration)account.inactive=body.ban_duration!=='none';
            return new Response(null,{status:200});
        },
        rest:async(path,options)=>{
            calls.push([path,options.body]);
            if(path==='rpc/studio_admin_accounts')return {accounts:[{...account}],count:1,tiers:[]};
            if(path==='rpc/studio_admin_revoke_sessions')return 3;
        },
    };
    const handlers=load('src/lib/studio/admin-accounts.ts',{
        './admin-contract':contract,'./admin':admin,'./core':core,'./operations':{domainName:v=>new URL(v).hostname},
        'node:crypto':{createHash:()=>({update:()=>({digest:()=> 'stable-send-id'})})},
        './support-email':{sendSupportEmail:async(...data)=>{calls.push(['email',data]);return 'provider-id';}},
        './mail':{sendAuthLink:async(...data)=>{calls.push(['mail',data]);}},'./server':server,
    });
    return {calls,staff,...handlers};
}

test('account directory sends constrained filters and pagination to the server',async()=>{
    const service=accountHandlers();
    const result=await service.listAccounts(service.staff,{query:' HTTPS://EXAMPLE.INVALID ',tier:'pro',status:'inactive',verified:'verified',page:2});
    assert.equal(result.count,1);
    assert.deepEqual(service.calls[0][1],{
        p_actor:actor,p_page:2,p_query:'example.invalid',p_tier:'pro',p_status:'inactive',p_verified:'verified',
    });
});

test('changing a login email requires ownership confirmation, MFA, an audit record and session revocation',async()=>{
    const service=accountHandlers();
    const body={ownerId:owner,reason:'Support case',expectedEmail:'old@example.invalid',expectedName:'Owner',email:'new@example.invalid',displayName:'New name'};
    await assert.rejects(()=>service.changeAccount(service.staff,'update_account',body),/Confirm you verified/);
    await assert.rejects(()=>service.changeAccount(service.staff,'update_account',{...body,confirmOwnership:true}),/MFA required/);
    assert.ok(!service.calls.some(call=>Array.isArray(call)&&call[0].startsWith('admin/users')));
    const result=await service.changeAccount(service.staff,'update_account',{...body,confirmOwnership:true,code:'123456'});
    assert.equal(result.account.email,'new@example.invalid');
    assert.deepEqual(service.calls.find(call=>Array.isArray(call)&&call[0].startsWith('admin/users'))[1],{
        user_metadata:{display_name:'New name'},email:'new@example.invalid',email_confirm:true,
    });
    const events=service.calls.filter(call=>Array.isArray(call)&&call[0]==='studio_staff_audit');
    assert.deepEqual(events.map(call=>call[1].action),['update_account_requested','update_account']);
    assert.equal(events[1][1].after_state.sessions_revoked,3);
});

test('staff identities are protected and changing membership requires billing permission',async()=>{
    const protectedAccount=accountHandlers({isStaff:true});
    await assert.rejects(()=>protectedAccount.changeAccount(protectedAccount.staff,'deactivate_account',{ownerId:owner,reason:'Test',code:'123456'}),/staff identity/);
    const operations=accountHandlers({roles:['operations']});
    await assert.rejects(()=>operations.changeAccount(operations.staff,'set_membership',{ownerId:owner,reason:'Test',tier:'pro',code:'123456'}),/No access/);
    assert.equal(operations.calls.length,0);
});

test('Stats returns aggregate counts to MFA-verified staff and logs the access',async()=>{
    const blocked=route({level:'aal1'});
    assert.equal((await blocked.post({action:'stats'})).status,403);
    assert.ok(!blocked.calls.some(call=>Array.isArray(call)&&call[0]==='rpc/studio_admin_stats'));
    const allowed=route();
    const response=await allowed.post({action:'stats'});
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.deepEqual(await response.json(),{members:3,tiers:[{id:'starter',members:3}]});
    assert.deepEqual(allowed.calls.find(call=>Array.isArray(call)&&call[0]==='rpc/studio_admin_stats')[1],{p_actor:actor});
    assert.equal(allowed.calls.find(call=>Array.isArray(call)&&call[0]==='studio_staff_audit')[1].action,'view_stats');
});

test('support email resolves the account recipient and requires review and fresh MFA',async()=>{
 const service=accountHandlers({roles:['support']});
 const body={ownerId:owner,expectedEmail:'old@example.invalid',reason:'Support reply',subject:'Setup help',message:'Your assistant is ready.',messageId:factor};
 await assert.rejects(()=>service.changeAccount(service.staff,'send_account_email',body),/Confirm the recipient/);
 await assert.rejects(()=>service.changeAccount(service.staff,'send_account_email',{...body,confirmSend:true}),/MFA required/);
 await service.changeAccount(service.staff,'send_account_email',{...body,confirmSend:true,code:'123456',email:'attacker@example.invalid'});
 assert.deepEqual(service.calls.find(call=>Array.isArray(call)&&call[0]==='email')[1],['old@example.invalid','Setup help','Your assistant is ready.','stable-send-id',actor]);
 assert.equal(service.calls.filter(call=>Array.isArray(call)&&call[0]==='studio_staff_audit').at(-1)[1].after_state.status,'accepted');
});


test('Scope Control allows operations staff to select only supported models',async()=>{
    const support=route();
    assert.equal((await support.post({action:'scope_config'})).status,403);
    const operations=route({roles:['operations']});
    const configuration=await operations.post({action:'scope_config'});
    assert.equal((await configuration.json()).model,'openai/gpt-6-luna');
    const update={...initialScopeConfig,action:'save_scope_config',reason:'Evaluate classifier costs'};
    assert.equal((await operations.post({...update,model:'unknown/model'})).status,400);
    assert.ok(!operations.calls.some(call=>call[0]==='rpc/studio_save_scope_config'));
    assert.equal((await operations.post({...update,model:'openai/gpt-oss-20b'})).status,200);
    const [path,body]=operations.calls.find(call=>call[0]==='rpc/studio_save_scope_config');
    assert.equal(path,'rpc/studio_save_scope_config');
    assert.equal(body.p_settings.model,'openai/gpt-oss-20b');
});

test('hosted scope requests use the selected model and its supported reasoning effort',async()=>{
    const agent={owner_id:owner,name:'Sample shop',scope_topics:['Returns']};
    const messages=[{role:'user',content:'Do you accept returns?'}];
    for(const [model,effort,budget] of [['openai/gpt-6-luna','none',48],['openai/gpt-oss-20b','low',256]]){
        const hosted=[];
        const runtime=load('src/lib/studio/scope-runtime.ts',{
            './core':core,
            './scope-control':scopeControl,
            './server':{rest:async()=>({status:'reserved',timeout_ms:2500,model,scope_enabled:true,guard_prompt:'Updated guidance from Operations',topic_prompt:'Updated topic reply policy'})},
        },async(url,request)=>{
            hosted.push({url,...JSON.parse(request.body)});
            return Response.json({choices:[{message:{content:'{"decision":"allow"}'}}]});
        },{env:{STUDIO_SCOPE_GATEWAY_API_KEY:'fixture'}});
        const result=await runtime.reviewStudioScope(agent,messages,[],new AbortController().signal);
        assert.equal(result.decision,'allow');
        assert.equal(result.replyPolicy.instructions,'Updated topic reply policy');
        assert.equal(result.replyPolicy.topics[0],'Returns');
        assert.equal(hosted.length,1);
        assert.equal(hosted[0].model,model);
        assert.equal(hosted[0].reasoning_effort,effort);
        assert.equal(hosted[0].max_completion_tokens,budget);
        assert.match(hosted[0].messages[0].content,/Updated guidance from Operations/);
        assert.doesNotMatch(hosted[0].messages[0].content,/Updated topic reply policy/);
    }
});

test('prompt screening still runs with topic controls off and sees complete prepared inputs',async()=>{
    const agent={owner_id:owner,name:'Sample shop',scope_enabled:false};
    const messages=[{role:'user',content:'Returns '.repeat(300)}];
    const documents=[{id:'one',title:'Returns',content:'Returns are accepted for 30 days.',published:true}];
    let requests=0;
    const runtime=load('src/lib/studio/scope-runtime.ts',{
        './core':core, './scope-control':scopeControl,
        './server':{rest:async(path,{body})=>{
            assert.equal(path,'rpc/studio_reserve_prompt_check');
            assert.equal(body.p_attempt,true);
            return {status:'reserved',timeout_ms:2500,model:'openai/gpt-oss-20b',scope_enabled:false,guard_prompt:'Current instructions'};
        }},
    },async(url,request)=>{
        requests++;
        const payload=JSON.parse(request.body);
        const data=JSON.parse(payload.messages[1].content);
        assert.equal(data.conversation[0].content,messages[0].content);
        assert.equal(data.knowledge[0].passage,documents[0].content);
        assert.equal(data.topics,undefined);
        assert.ok(payload.response_format.json_schema.schema.properties.decision.enum.includes('suspected_injection'));
        return Response.json({choices:[{message:{content:'{"decision":"suspected_injection"}'}}]});
    },{env:{STUDIO_SCOPE_GATEWAY_API_KEY:'fixture'}});
    assert.equal((await runtime.reviewStudioScope(agent,messages,documents,new AbortController().signal)).decision,'suspected_injection');
    assert.equal(requests,1);
});

test('only MFA-verified operations staff can read or edit either scope prompt',async()=>{
    const update={action:'save_guard_prompt',prompt:'Updated guard guidance',version:1,reason:'Clarify screening policy'};
    for (const options of [{roles:[]},{roles:['support']},{roles:['billing']},{roles:['operations'],level:'aal1'},{roles:['operations'],allowOrigin:false}]) {
        const app=route(options);
        assert.equal((await app.post({action:'scope_config'})).status,403);
        assert.equal((await app.post(update)).status,403);
        assert.equal((await app.post({...update,action:'save_topic_prompt'})).status,403);
        assert.ok(!app.calls.some(call=>/studio_scope_config|studio_save_(guard|topic)_prompt/.test(String(call[0]))));
    }
    const app=route({roles:['operations']});
    const read=await app.post({action:'scope_config'});
    assert.equal(read.headers.get('Cache-Control'),'no-store');
    const config=await read.json();
    assert.equal(config.guard_prompt,initialScopeConfig.guard_prompt);
    assert.equal(config.topic_prompt,initialScopeConfig.topic_prompt);
    assert.equal((await app.post({...update,prompt:'   '})).status,400);
    assert.equal((await app.post({...update,prompt:'x'.repeat(4001)})).status,400);
    assert.equal((await app.post({...update,version:2})).status,409);
    const save=await app.post(update);
    assert.equal(save.status,200);
    assert.deepEqual(await save.json(),{prompt:update.prompt,version:2});
    const topicUpdate={...update,action:'save_topic_prompt',prompt:'Answer within the allowed topics'};
    assert.equal((await app.post({...topicUpdate,version:2})).status,409);
    const topicSave=await app.post(topicUpdate);
    assert.equal(topicSave.status,200);
    assert.deepEqual(await topicSave.json(),{prompt:topicUpdate.prompt,version:2});
    assert.ok(app.calls.some(call=>call[0]==='rpc/studio_save_topic_prompt' && call[1].p_prompt===topicUpdate.prompt));
});
