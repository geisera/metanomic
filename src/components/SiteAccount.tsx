'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import s from './PrimaryNav.module.css';
type Identity = { label: string; email: string };
const IdentityContext = createContext<Identity | null>(null);
export const useIdentity = () => useContext(IdentityContext);

export default function SiteAccount({children}:{children:ReactNode}) {
    const path = usePathname();
    const show = !['/admin', '/particles'].includes(path);
    const [account, setAccount] = useState<Identity|null>(null);

    useEffect(() => {
        if (!show) return;
        let active = true;
        let request: AbortController;
        async function refresh() {
            request?.abort();
            const controller = new AbortController();
            request = controller;
            try {
                const response = await fetch('/api/studio-identity', { cache: 'no-store', signal: controller.signal });
                const identity = response.ok ? await response.json() : null;
                if (active && !controller.signal.aborted) setAccount(identity?.label ? identity : null);
            } catch {
                if (active && !controller.signal.aborted) setAccount(null);
            }
        }
        void refresh();
        window.addEventListener('focus', refresh);
        window.addEventListener('pageshow', refresh);
        return () => {
            active = false;
            request?.abort();
            window.removeEventListener('focus', refresh);
            window.removeEventListener('pageshow', refresh);
        };
    }, [path, show]);

    return <IdentityContext.Provider value={show ? account : null}>{children}</IdentityContext.Provider>;
}

type DashboardActions = {navigate:(view:'agents'|'account')=>void;leave:()=>boolean;logout:()=>void};
export function AccountMenu({dashboard}:{dashboard?:DashboardActions}={}) {
    const path = usePathname();
    const studioLanding = path === '/assistant-studio' || path === '/assistant-studio/';
    const studioRoute = path === '/assistant-studio' || path.startsWith('/assistant-studio/');
    const account = useIdentity();
    const [open,setOpen] = useState(false);
    const [error,setError] = useState('');
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!open) return;
        const outside = (event:PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown',outside);
        return () => document.removeEventListener('pointerdown',outside);
    },[open]);
    if (!account) return null;
    async function logout() {
        try {
            const response = await fetch('/api/theia-studio/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});
            if (!response.ok) throw new Error();
            const result = await response.json();
            window.location.assign(result.impersonationEnded ? '/admin' : '/');
        } catch { setError('Sign out failed. Please try again.'); }
    }
    return <div ref={root} className={s.account} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}}}>
        <button ref={trigger} type="button" className={s.accountButton} aria-label={'Account menu, '+account.label} aria-expanded={open} aria-controls="site-account-panel" onClick={()=>setOpen(!open)}>
            <span className={s.avatar} aria-hidden>{Array.from(account.label)[0]?.toUpperCase()}</span>
            <span className={s.accountName}>{account.label}</span><span className={s.accountArrow} aria-hidden>▾</span>
        </button>
        <div id="site-account-panel" className={s.accountPanel} hidden={!open}>
            <strong>{account.label}</strong><small>Signed in as {account.email}</small><hr/>
            {dashboard?<button onClick={()=>{setOpen(false);dashboard.navigate('agents');}}>Studio</button>:<a href="/assistant-studio/dashboard">Studio</a>}
            {studioLanding && <a href="/assistant-studio/dashboard#account">Account settings</a>}
            <a onClick={e=>{if(dashboard&&!dashboard.leave())e.preventDefault();}} href="https://platform.openai.com/settings">OpenAI settings</a>
            {studioRoute && <a href="/" onClick={event=>{if(dashboard && !dashboard.leave())event.preventDefault();}}>Metanomic home</a>}
            <button type="button" onClick={dashboard?dashboard.logout:logout}>Sign out</button>
            {error&&<p role="alert">{error}</p>}
        </div>
    </div>;
}

export function HeroActions(){
    const account=useIdentity();
    return <>
        <a href={account?'/assistant-studio/dashboard':'/assistant-studio/signup'} className="button button-primary w-full sm:w-auto">{account?'Open Studio':'Create your assistant'} <span aria-hidden>→</span></a>
        {!account&&<a href="/assistant-studio/dashboard" className="button button-outline w-full sm:w-auto">Open Studio</a>}
    </>;
}
