'use client';

import { useEffect, useState } from 'react';
import { STARTER_TRIAL_OFFER, type StarterAccess } from '@/lib/studio/starter-plan';
import {call, ErrorNotice, useGuard} from './ui';
import s from './studio.module.css';

export default function StarterBilling({access, refresh, impersonating}: {access:StarterAccess;refresh:()=>Promise<void>;impersonating?:boolean}) {
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState<unknown>(null);
    const {leave}=useGuard();
    useEffect(()=>{
        if(access.state!=='trial'||!access.endsAt)return;
        const delay=Math.max(0,Date.parse(access.endsAt)-Date.now());
        const timer=setTimeout(()=>void refresh().catch(()=>{}),delay+1000);
        return ()=>clearTimeout(timer);
    },[access.state,access.endsAt,refresh]);
    useEffect(()=>{
        if (access.state==='subscribed' || new URLSearchParams(window.location.search).get('billing')!=='success') return;
        let attempts=0;
        const timer=setInterval(()=>{
            void refresh().catch(()=>{});
            if (++attempts>=10) clearInterval(timer);
        },3000);
        return ()=>clearInterval(timer);
    },[access.state,refresh]);

    async function go(action:'checkout'|'portal') {
        if (busy||!leave()) return;
        setBusy(true);
        setError(null);
        try {
            const {url}=await call('billing',{action});
            window.location.assign(url);
        } catch (problem) {
            setError(problem);
            setBusy(false);
        }
    }

    return <section className={s.starterBilling} aria-labelledby="starter-billing-title">
        <h2 id="starter-billing-title">Starter plan</h2>
        {access.state==='ready' && <p>Your 14-day trial starts after your first successful reply in Preview. {STARTER_TRIAL_OFFER}. OpenAI usage is billed separately.</p>}
        {access.state==='trial' && access.endsAt && <p>Your free trial ends <time dateTime={access.endsAt}>
            {new Date(access.endsAt).toLocaleString(undefined,{dateStyle:'long',timeStyle:'short'})}
        </time>. You can subscribe once it ends.</p>}
        {access.state==='expired' && <p>Your live widget is paused. Start or update your subscription to resume it with your existing settings and knowledge.</p>}
        {access.state==='subscribed' && <p>Your $5/month Starter subscription is active. OpenAI usage is billed separately.</p>}
        {!impersonating && <div className={s.actions}>
            {access.canSubscribe&&<button type="button" className="button button-primary" disabled={busy} onClick={()=>void go('checkout')}>Subscribe for $5/month</button>}
            {access.canManage&&<button type="button" className="button button-outline" disabled={busy} onClick={()=>void go('portal')}>Manage billing</button>}
        </div>}
        <ErrorNotice error={error}/>
    </section>;
}
