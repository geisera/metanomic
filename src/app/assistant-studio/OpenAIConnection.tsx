'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import FieldHelp from './FieldHelp';
import {call,ErrorNotice,LastSaved,Notice,type Snapshot} from './ui';
import s from './studio.module.css';

export default function OpenAIConnection({keyInfo,onUpdate}:{keyInfo?:Snapshot['keys'][number];onUpdate:()=>Promise<void>}){
 const heading=useRef<HTMLHeadingElement>(null);
 const [replacing,setReplacing]=useState(false);
 const replaceButton=useRef<HTMLButtonElement>(null);
 const keyInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(replacing)keyInput.current?.focus();},[replacing]);
 const keyLabel=keyInfo?'New OpenAI API key':'OpenAI API key';
 const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[notice,setNotice]=useState('');
 useEffect(()=>{heading.current?.focus();},[]);

 async function update(event:FormEvent<HTMLFormElement>,action:'key'|'remove-key'){
   event.preventDefault();
   if(busy)return;
   const form=event.currentTarget;
   const body=action==='key'?{action,key:new FormData(form).get('key')}:{action};
   setBusy(true);
   setError(null);
   setNotice('');
   try{
     await call('manage',body);
     form.reset();
     await onUpdate();
     setReplacing(false);
     if(action==='key')heading.current?.focus();
     setNotice(action==='remove-key'?'OpenAI key removed.':keyInfo?'OpenAI key replaced.':'OpenAI key connected.');
     if(action==='remove-key')heading.current?.focus();
   }catch(error){
     setError(error);
   }finally{
     setBusy(false);
   }
 }

 return <section id='account-default-key' className='card' aria-labelledby='default-key-heading'>
   <h2 id='default-key-heading' ref={heading} tabIndex={-1}>Default key</h2>
   <ErrorNotice error={error}/>
   <Notice>{notice}</Notice>
   <div role="status" className={keyInfo ? s.connectionVerified : s.help}>
     {keyInfo ? <>
       <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
         <circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/>
       </svg>
       <div><strong>API key connected</strong><p>Key ending in {keyInfo.last_four} · Last verified by OpenAI <time dateTime={keyInfo.validated_at}>{new Date(keyInfo.validated_at).toLocaleString()}</time></p></div>
     </> : 'No key connected.'}
   </div>
   <p className={s.help}>Assistants use this account-wide key by default. Replacing it applies to every assistant that does not have an optional override key. Removing it unpublishes assistants that depend on it.</p>
   <p className={s.help}>OpenAI bills you directly for usage. Metanomic encrypts your key and keeps it on the server. We check that your key works, but not your OpenAI balance or model access.</p>
   <a className={s.textButton} href='https://platform.openai.com/api-keys' target='_blank' rel='noreferrer'>Where do I get a key? ↗</a>
   {keyInfo&&!replacing?<div>
     <p>Your default key ending in <strong>{keyInfo.last_four}</strong> is already configured. No action is needed.</p>
     <button ref={replaceButton} type='button' className='button button-outline' onClick={()=>setReplacing(true)}>Replace existing key</button>
   </div>:<form className={s.form} onSubmit={event=>update(event,'key')}>
     {keyInfo&&<p id='replace-key-warning'>Saving a new key will replace the key ending in <strong>{keyInfo.last_four}</strong> for every assistant using the Default key.</p>}
     <FieldHelp id='studio-field-help-18' label={keyLabel} caption={keyLabel} control={<input ref={keyInput} name='key' type='password' autoComplete='off' maxLength={2000} required placeholder={keyInfo?'Paste the replacement key':'Paste your OpenAI API key'} aria-describedby={keyInfo?'replace-key-warning studio-field-help-18':'studio-field-help-18'}/>}>Use a dedicated OpenAI project key with model-list and Responses API access. Set a budget in OpenAI to manage usage charges.</FieldHelp>
     <button className='button button-primary' disabled={busy}>{keyInfo?'Replace key':'Connect key'}</button>
     {keyInfo&&<button type='button' className={s.textButton} disabled={busy} onClick={()=>{setReplacing(false);requestAnimationFrame(()=>replaceButton.current?.focus());}}>Cancel</button>}
     <LastSaved value={keyInfo?.validated_at}/>
   </form>}
   {keyInfo&&<form onSubmit={event=>update(event,'remove-key')}><button className={s.textButton} disabled={busy}>Remove API key</button></form>}
 </section>;
}
