'use client';
import {useEffect,useState,type FormEvent} from 'react';
import type {Agent} from '@/lib/studio/core';
import {call,useDirty,SaveBar,Notice,ErrorNotice,OriginLines,validOrigins,embedCode} from './ui';
import s from './studio.module.css';
export default function Publish({agent,hasKey,onSaved,onKey,websiteLimit=2}:{websiteLimit?:number;agent:Agent;hasKey:boolean;onSaved:()=>Promise<void>;onKey:()=>void}){
 const [checking,setChecking]=useState(false);
 const [draft,setDraft]=useState(agent),[baseline,setBaseline]=useState(agent),[sites,setSites]=useState(agent.origins.join('\n')),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState<unknown>(null),[copied,setCopied]=useState(false),[firstLive,setFirstLive]=useState(false);const dirty=JSON.stringify(draft)!==JSON.stringify(baseline)||sites!==baseline.origins.join('\n');useDirty('embed',dirty||busy);const code=embedCode(draft);
 useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),2000);return()=>clearTimeout(timer);},[copied]);
 async function refreshStatus(){
   setChecking(true);
   setError(null);
   try{await onSaved();}catch(e){setError(e);}finally{setChecking(false);}
 }
 async function copy(){try{await navigator.clipboard.writeText(code);setCopied(true);}catch{setError(new Error('Clipboard unavailable. Select and copy the code below.'));}}
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError(null);setNotice('');try{const d=await call('manage',{action:'save-origins',agent_id:agent.id,origins:sites.split('\n').map(v=>v.trim()).filter(Boolean)});setDraft(d.agent);setBaseline(d.agent);setSites(d.agent.origins.join('\n'));setNotice('Saved');await onSaved();}catch(e){setError(e);}finally{setBusy(false);}}
 async function publish(){setBusy(true);setError(null);setNotice('');try{const d=await call('manage',{action:'publish',agent_id:agent.id,published:!agent.published});setDraft(d.agent);setBaseline(d.agent);setFirstLive(!!d.first_publish);setNotice(d.agent.published?'Assistant published':'Assistant unpublished');await onSaved();}catch(e){setError(e);}finally{setBusy(false);}}
 return <><ErrorNotice error={error} onKey={onKey} onOrigins={()=>document.getElementById('approved-origins')?.focus()}/><Notice>{notice}</Notice><form className={s.form} onSubmit={save}><label>Approved website origins<textarea id='approved-origins' rows={3} aria-invalid={!validOrigins(sites,websiteLimit)} value={sites} onChange={e=>setSites(e.target.value)} aria-describedby='origin-help'/></label><p id='origin-help' className={s.help}>Websites allowed to show this assistant. One per line, e.g. https://example.com. Add the www version separately. Up to {websiteLimit}.</p><OriginLines limit={websiteLimit} value={sites} onChange={setSites}/><SaveBar dirty={dirty} busy={busy||!validOrigins(sites,websiteLimit)} lastSaved={baseline.updated_at}/></form>
 <div className={s.publishControl}><button role='switch' aria-checked={agent.published&&hasKey} className={s.publishSwitch} disabled={busy||dirty||!hasKey||(!agent.published&&!agent.origins.length)} onClick={publish}>Live on my website <span>{agent.published&&hasKey?'On':'Off'}</span></button><p className={s.help}>{dirty?'Save your website changes before publishing.':'This toggle activates or deactivates the chatbot without removing the embed code. To fully remove the chatbot from your website, remove the embed code.'}</p></div>
 <section className={s.livePanel} aria-labelledby='installation-status'>
   <h3 id='installation-status'>Installation status</h3>
   <ul className={s.privacyList} aria-live='polite'>
     <li><strong>Widget detected</strong> · {agent.first_embed_at?'Confirmed':'Pending'}</li>
     <li><strong>First answer delivered</strong> · {agent.first_answer_at?'Confirmed':'Pending'}</li>
   </ul>
   <p className={s.help}>These milestones show the first approved website load and the first completed reply from the live widget. Studio previews don’t count.</p>
   {!agent.first_answer_at&&<p className={s.help}>Open the approved website, send a test message in the widget, then check the status here.</p>}
   <button type='button' className={s.textButton} disabled={checking||busy} onClick={refreshStatus}>{checking?'Checking…':'Refresh status'}</button>
 </section>
 {firstLive&&agent.published&&<section className={s.livePanel} role='status'><h3>Your assistant is live</h3><pre className={s.code}>{code}</pre><div className={s.actions}><button className='button button-primary' onClick={copy}>{copied?'Copied ✓':'Copy embed code'}</button><a className='button button-outline' href={agent.origins[0]} target='_blank' rel='noreferrer'>Test on my site ↗</a></div></section>}<h3>Embed code</h3><p className={s.help}>Paste this snippet before your website’s closing body tag, or in your site builder’s custom-code area. Copy it again after changing the launch button.</p><pre className={s.code}>{code}</pre><button className={s.textButton} disabled={dirty} onClick={copy}>{copied?'Copied ✓':'Copy embed code'}</button>{!agent.published&&<p className={s.alert}>This assistant is a draft. Turn on publishing to make it available on your website.</p>}<ul className={s.privacyList}><li>Messages go through Metanomic to OpenAI using your encrypted key.</li><li>Conversations are not stored.</li><li>Sessions end after one hour.</li></ul></>;
}
