import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const owner = '11111111-1111-4111-8111-111111111111';
const env = {STUDIO_STARTER_BILLING_ENABLED:'true',STUDIO_STRIPE_SECRET_KEY:'sk_test_fixture',
    STUDIO_STRIPE_STARTER_PRICE_ID:'price_fixture',STUDIO_STRIPE_WEBHOOK_SECRET:'whsec_fixture'};

function load(name, deps={}, fetchMock=fetch) {
    const path = new URL('../src/lib/studio/' + name + '.ts', import.meta.url);
    const js = ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
    }).outputText;
    const module={exports:{}};
    new Function('require','module','exports','fetch','process',js)(key=>deps[key],module,module.exports,fetchMock,{env});
    return module.exports;
}

function billing(rest, fetchMock) {
    return load('starter-billing',{'node:crypto':crypto,'./core':load('core'),'./server':{rest},'./starter-plan':load('starter-plan')},fetchMock);
}

test('Starter access is grandfathered without enrollment and preserves the same trial expiration',async()=>{
    let rows=[];
    const studio=billing(async()=>rows);
    assert.equal(await studio.starterAccess(owner,'starter'),null);
    rows=[{trial_started_at:null}];
    assert.deepEqual(await studio.starterAccess(owner,'starter'),{state:'ready',endsAt:null,canManage:false,canSubscribe:false});
    const started=new Date(Date.now()-86400000).toISOString();
    rows[0].trial_started_at=started;
    assert.deepEqual(await studio.starterAccess(owner,'starter'),{state:'trial',
        endsAt:new Date(Date.parse(started)+14*86400000).toISOString(),canManage:false,canSubscribe:false});
    rows[0].trial_started_at=new Date(Date.now()-15*86400000).toISOString();
    assert.equal((await studio.starterAccess(owner,'starter')).canSubscribe,true);
    rows[0].stripe_customer_id='cus_abc';
    rows[0].stripe_subscription_id='sub_abc';
    rows[0].subscription_status='active';
    rows[0].subscription_active=true;
    assert.equal((await studio.starterAccess(owner,'starter')).state,'subscribed');
    assert.equal((await studio.starterAccess(owner,'starter')).canSubscribe,false);
    rows[0].subscription_status='canceled';
    rows[0].subscription_active=false;
    assert.equal((await studio.starterAccess(owner,'starter')).state,'expired');
    assert.equal((await studio.starterAccess(owner,'starter')).canSubscribe,true);
});

test('Checkout is tied to the account, exact monthly price and idempotent reservation',async()=>{
    const calls=[];
    let amount=500;
    const studio=billing(async(path,options)=>{
        calls.push({path,options});
        return [{nonce:'same-reservation',expires_at:'2026-11-21T18:00:00Z'}];
    },async(url,options)=>{
        calls.push({url,options});
        if(url.includes('/prices/'))return Response.json({active:true,currency:'usd',unit_amount:amount,recurring:{interval:'month',interval_count:1}});
        return Response.json({url:'https://checkout.stripe.com/c/pay/fixture'});
    });
    const config=studio.starterBillingConfig();
    const row={stripe_customer_id:'cus_abc'};
    assert.equal(await studio.starterCheckout(owner,row,'https://example.com/dashboard',config),'https://checkout.stripe.com/c/pay/fixture');
    const checkout=calls.at(-1);
    assert.equal(checkout.options.body.get('subscription_data[metadata][studio_owner]'),owner);
    assert.equal(checkout.options.body.get('line_items[0][price]'),'price_fixture');
    assert.equal(checkout.options.headers['Idempotency-Key'],'studio-starter-checkout-same-reservation');
    amount=600;
    await assert.rejects(studio.starterCheckout(owner,row,'https://example.com/dashboard',config),/temporarily unavailable/);
    assert.equal(calls.filter(call=>call.path==='rpc/studio_reserve_starter_checkout').length,1);
});

test('Stripe webhooks reject tampering and expired signatures, then sync matched subscriptions',async()=>{
    const row={trial_started_at:null,stripe_customer_id:'cus_abc',stripe_subscription_id:'sub_abc',subscription_status:'active'};
    const updates=[];
    const studio=billing(async(path,options)=>{
        if(options.method==='PATCH'){updates.push({path,body:options.body});return;}
        return [row];
    },async()=>Response.json({customer:'cus_abc',status:'canceled',metadata:{studio_owner:owner},
        items:{data:[{price:{id:'price_fixture'}}]}}));
    const payload='{"test":true}',timestamp=1795284000;
    const sig=crypto.createHmac('sha256',env.STUDIO_STRIPE_WEBHOOK_SECRET).update(timestamp+'.'+payload).digest('hex');
    const header='t='+timestamp+',v1='+sig;
    assert.equal(studio.stripeSigned(payload,header,env.STUDIO_STRIPE_WEBHOOK_SECRET,timestamp*1000),true);
    assert.equal(studio.stripeSigned(payload+' ',header,env.STUDIO_STRIPE_WEBHOOK_SECRET,timestamp*1000),false);
    assert.equal(studio.stripeSigned(payload,header,env.STUDIO_STRIPE_WEBHOOK_SECRET,(timestamp+301)*1000),false);
    await studio.syncStarterSubscription('sub_abc',studio.starterBillingConfig());
    assert.equal(updates[0].body.subscription_active,false);
    assert.equal(updates[0].body.subscription_status,'canceled');
    assert.match(updates[0].path,/stripe_customer_id=eq.cus_abc/);
});
