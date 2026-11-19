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
     setNotice(action==='use-shared-key'?'This assistant now uses the shared key.':'Separate OpenAI key saved.');
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

 return <section className={s.settingsSection} aria-labelledby='assistant-openai-heading'>
   <h2 id='assistant-openai-heading' tabIndex={-1}>OpenAI connection</h2>
   <p className={s.help}>{keyInfo
     ? !allowed?'Separate key paused. Upgrade to use it again.'
       : keyInfo.invalidated_at?`Separate key ending ${keyInfo.last_four} needs replacement.`
       : `Using a separate key ending ${keyInfo.last_four}.`
     : sharedConnected?'Using the shared OpenAI key.':'No shared key connected.'}</p>
   <button type='button' className={s.textButton} onClick={onSharedKey}>{sharedConnected?'Manage OpenAI key':'Connect shared key'} →</button>
   <h3>Separate key for this assistant</h3>
   <p className={s.help}>Use a client’s key or a separate OpenAI project to keep this assistant’s billing and usage separate. Preview and live chat both use the selected key.</p>
   {!allowed&&<p id='assistant-key-upgrade' className={s.help}>Upgrade to Pro or Enterprise to use a separate key. <Link className={s.textButton} href='/assistant-studio#pricing'>View plans →</Link></p>}
   <ErrorNotice error={error}/>
   <Notice>{notice}</Notice>
   <form onSubmit={save}>
     <fieldset className={s.form} disabled={!allowed||busy} aria-describedby={!allowed?'assistant-key-upgrade':undefined}>
       <label>Separate OpenAI API key<input name='key' type='password' autoComplete='off' maxLength={2000} required/></label>
       <div className={s.actions}>
         <button className='button button-outline' type='submit'>{keyInfo?'Replace separate key':'Save separate key'}</button>
         {allowed&&keyInfo&&<button type='button' className={s.textButton} onClick={()=>void update('use-shared-key')}>Use shared key</button>}
       </div>
     </fieldset>
   </form>
   {allowed&&keyInfo&&<p className={s.help}>If the separate key stops working, this assistant pauses until you replace it or choose the shared key.{!sharedConnected&&' Switching to the shared key now will unpublish this assistant until you connect a shared key and publish it again.'}</p>}
 </section>;
}
