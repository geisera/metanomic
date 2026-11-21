'use client';

import {useEffect,useState,type FormEvent} from 'react';
import {readAccountEmailPreferences,saveAccountEmailPreferences} from './email-preferences/account-actions';
import {ErrorNotice,Notice} from './ui';
import s from './studio.module.css';

export default function AccountEmailPreferences() {
    const [preferences,setPreferences]=useState<Awaited<ReturnType<typeof readAccountEmailPreferences>>>();
    const [error,setError]=useState('');
    const [saved,setSaved]=useState(false);
    const [busy,setBusy]=useState(false);
    const [attempt,setAttempt]=useState(0);
    useEffect(()=>{
        let active=true;
        readAccountEmailPreferences().then(value=>{if(active)setPreferences(value);})
            .catch(()=>{if(active)setError('Could not load your email preferences.');});
        return ()=>{active=false;};
    },[attempt]);

    useEffect(()=>{
        if(preferences && window.location.hash==="#account-email-preferences")document.getElementById("account-email-preferences")?.scrollIntoView();
    },[preferences]);

    async function save(event:FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data=new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        setSaved(false);
        try { await saveAccountEmailPreferences(data); setSaved(true); }
        catch { setError('Could not save your email preferences. Please try again.'); }
        finally { setBusy(false); }
    }

    return <section id="account-email-preferences" className="card">
        <h2>Email preferences</h2>
        <ErrorNotice error={error}/>
        {preferences?<form className={s.form} onSubmit={save} onChange={()=>setSaved(false)}>
            <fieldset disabled={busy} className={s.form}>
                <legend className={s.srOnly}>Choose the emails you receive</legend>
                <label><input type="checkbox" name="tips" defaultChecked={preferences.setup_tips}/> Assistant setup tips</label>
                <label><input type="checkbox" name="products" defaultChecked={preferences.product_updates}/> Product news and upgrades</label>
                <button className="button button-primary">Save preferences</button>
            </fieldset>
            <Notice>{saved?'Preferences saved.':''}</Notice>
        </form>:error?<button className="button button-outline" onClick={()=>{setError('');setAttempt(n=>n+1);}}>Retry</button>:<p role="status">Loading preferences…</p>}
    </section>;
}
