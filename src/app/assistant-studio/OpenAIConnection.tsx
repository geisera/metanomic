'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import FieldHelp from './FieldHelp';
import {call,ErrorNotice,LastSaved,Notice,type Snapshot} from './ui';
import s from './studio.module.css';

export default function OpenAIConnection({keyInfo,onUpdate}:{keyInfo?:Snapshot['keys'][number];onUpdate:()=>Promise<void>}){
 const heading=useRef<HTMLHeadingElement>(null);
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
     setNotice(action==='remove-key'?'OpenAI key removed.':keyInfo?'OpenAI key replaced.':'OpenAI key connected.');
     if(action==='remove-key')heading.current?.focus();
   }catch(error){
     setError(error);
   }finally{
     setBusy(false);
   }
 }

 return <div className={s.account}><section id='api-key' className='card' aria-labelledby='openai-connection-heading'>
   <h2 id='openai-connection-heading' ref={heading} tabIndex={-1}>OpenAI connection</h2>
   <ErrorNotice error={error}/>
   <Notice>{notice}</Notice>
   <p className={s.help}>{keyInfo?`Connected · ending ${keyInfo.last_four} · validated ${new Date(keyInfo.validated_at).toLocaleString()}`:'No key connected.'}</p>
   <p className={s.help}>All assistants on this account use this key. Replacing it applies to every assistant. Removing it unpublishes every assistant.</p>
   <p className={s.help}>OpenAI bills you directly for usage. Metanomic encrypts your key and keeps it on the server. We check that your key works, but not your OpenAI balance or model access.</p>
   <a className={s.textButton} href='https://platform.openai.com/api-keys' target='_blank' rel='noreferrer'>Where do I get a key? ↗</a>
   <form className={s.form} onSubmit={event=>update(event,'key')}>
     <FieldHelp id='studio-field-help-18' label='OpenAI API key' caption={<>OpenAI API key</>} control={<input name='key' type='password' autoComplete='off' maxLength={2000} required placeholder='Paste your OpenAI API key' aria-describedby='studio-field-help-18'/>}>Use a dedicated OpenAI project key with model-list and Responses API access. Set a budget in OpenAI to manage usage charges.</FieldHelp>
     <button className='button button-primary' disabled={busy}>{keyInfo?'Replace key':'Connect key'}</button>
     <LastSaved value={keyInfo?.validated_at}/>
   </form>
   {keyInfo&&<form onSubmit={event=>update(event,'remove-key')}><button className={s.textButton} disabled={busy}>Remove API key</button></form>}
 </section></div>;
}
