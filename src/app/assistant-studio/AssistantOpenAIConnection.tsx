'use client';

import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import type {AssistantKeyInfo} from '@/lib/studio/assistant-keys';
import {call,ErrorNotice,Notice} from './ui';
import s from './studio.module.css';

export default function AssistantOpenAIConnection({agentId,allowed,sharedConnected,keyInfo,onSharedKey,onSaved}:{
 agentId:string;
 allowed:boolean;
 sharedConnected:boolean;
 keyInfo?:AssistantKeyInfo;
 onSharedKey:()=>void;
 onSaved:()=>Promise<void>;
}){
 const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[notice,setNotice]=useState('');

 async function update(action:'set-assistant-key'|'use-shared-key', form?:HTMLFormElement){
   if(busy||!allowed)return;
   setBusy(true);
   setError(null);
   setNotice('');
   try{
     await call('manage',{action,agent_id:agentId,...(form?{key:new FormData(form).get('key')}:{})});
     form?.reset();
     await onSaved();
     setNotice(action==='use-shared-key'?'This assistant now uses the Default key.':'Override OpenAI key saved.');
   }catch(error){
     setError(error);
   }finally{
     setBusy(false);
   }
 }

 function save(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   void update('set-assistant-key',event.currentTarget);
 }

 return <section className={s.settingsSection+' '+s.modelConfiguration} aria-labelledby='assistant-openai-heading'>
   <h2 id='assistant-openai-heading' tabIndex={-1}>Model configuration</h2>
   <p className={s.help}>This assistant uses your account&apos;s Default key unless you choose an optional override key for it.</p>
   <h3>Current connection</h3>
   <p className={s.help}>{keyInfo
     ? !allowed?'Override key paused. Upgrade to use it again.'
       : keyInfo.invalidated_at?`Override key ending ${keyInfo.last_four} needs replacement.`
       : `Using an override key ending ${keyInfo.last_four}.`
     : sharedConnected?'Using the account Default key.':'No Default key connected.'}</p>
   <button type='button' className={s.textButton} onClick={onSharedKey}>{sharedConnected?'Manage Default key':'Connect Default key'}</button>
   <div className={s.overrideKeySection}>
   <h3>Optional override key</h3>
   <p className={s.help}>Optional. Use a client’s key or a separate OpenAI project when this assistant needs separate billing and usage. Preview and live chat both use the override while it is connected.</p>
   {!allowed&&<p id='assistant-key-upgrade' className={s.help}>Upgrade to Pro or Enterprise to use a separate key. <Link className={s.textButton} href='/assistant-studio#pricing'>View plans →</Link></p>}
   <ErrorNotice error={error}/>
   <Notice>{notice}</Notice>
   <form onSubmit={save}>
     <fieldset className={s.form} disabled={!allowed||busy} aria-describedby={!allowed?'assistant-key-upgrade':undefined}>
       <label>Override OpenAI API key<input name='key' type='password' autoComplete='off' maxLength={2000} required/></label>
       <div className={s.actions}>
         <button className='button button-outline' type='submit'>{keyInfo?'Replace override key':'Save override key'}</button>
         {allowed&&keyInfo&&<button type='button' className={s.textButton} onClick={()=>void update('use-shared-key')}>Use Default key</button>}
       </div>
     </fieldset>
   </form>
   {allowed&&keyInfo&&<p className={s.help}>If the override key stops working, this assistant pauses until you replace it or choose the Default key.{!sharedConnected&&' Switching to the Default key now will unpublish this assistant until you connect a Default key and publish it again.'}</p>}
   </div>
 </section>;
}
