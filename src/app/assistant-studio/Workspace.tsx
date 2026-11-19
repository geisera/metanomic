'use client';
import {useEffect,useState,type FormEvent} from 'react';
import Settings from './Settings';
import AssistantOpenAIConnection from './AssistantOpenAIConnection';
import {canOverrideAssistantKey} from '@/lib/studio/assistant-keys';
import SettingsNav,{SettingsIcon} from './SettingsNav';
import {HeaderUsage,useUsageDay} from './Usage';
import {ASSISTANT_TEMPLATES} from '@/lib/studio/templates';
import Knowledge from './Knowledge';
import Preview from './Preview';
import Publish from './Publish';
import DangerZone from './DangerZone';
import {call,Status,ErrorNotice,useGuard,type Snapshot} from './ui';
import {copy} from './content';
import {readMilestone,recordMilestone} from './onboarding';
import s from './studio.module.css';
export type Tab='key'|'status'|'settings'|'knowledge'|'preview'|'embed'|'danger';
export default function Workspace({data,refresh,onDefaultKey,accountId='',startedAt}:{accountId?:string;startedAt?:string;data:Snapshot;refresh:()=>Promise<void>;onDefaultKey:()=>void}){
 const [active,setActive]=useState(()=>data.agents.find(a=>a.id===new URLSearchParams(window.location.search).get('assistant'))?.id||data.agents[0]?.id||''),[tab,setTab]=useState<Tab>(()=>{const step=new URLSearchParams(window.location.search).get('setup');return step==='knowledge'||step==='preview'||step==='embed'?step:'key';}),[error,setError]=useState<unknown>(null),[busy,setBusy]=useState(false),[creating,setCreating]=useState(()=>new URLSearchParams(window.location.search).get('setup')==='create');const {leave}=useGuard();const agent=data.agents.find(a=>a.id===active)||data.agents[0],sharedConnected=data.keys.length>0;
 const tier=data.tier||{id:'starter',name:'Starter',assistants:1,websites:2,documents:1};
 const allowsOverride=canOverrideAssistantKey(tier.id);
 const keyInfo=data.assistantKeys?.find(key=>key.agent_id===agent?.id);
 const hasKey=keyInfo?allowsOverride&&!keyInfo.invalidated_at:sharedConnected;
 const [keyFocus,setKeyFocus]=useState(0);
 useEffect(()=>{if(keyFocus&&tab==='key')document.getElementById('assistant-openai-heading')?.focus();},[keyFocus,tab]);
 function fixKey(){if(leave()){setTab('key');setKeyFocus(value=>value+1);}}
 function limitFor(id:string,base:number){return data.limits?.find(limit=>limit.agent_id===id&&Date.parse(limit.limit_expires_at)>Date.now())?.message_limit??base;}
 const todayKey=useUsageDay();const [focusLimit,setFocusLimit]=useState(0);useEffect(()=>{if(focusLimit&&tab==='settings')document.getElementById('assistant-daily-control')?.focus();},[focusLimit,tab]);
 function raiseLimit(id:string){if(leave()){setActive(id);setTab('settings');setFocusLimit(v=>v+1);}}
 function navigate(next:Tab){if(leave())setTab(next);}
 async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!leave())return;const form=e.currentTarget;setBusy(true);setError(null);try{const result=await call('manage',{action:'create-agent',name:new FormData(form).get('name'),template:new FormData(form).get('template')});recordMilestone('first-assistant:'+accountId,'time_to_first_assistant',startedAt);await refresh();setActive(result.agent.id);setTab('key');form.reset();setCreating(false);}catch(e){setError(e);}finally{setBusy(false);}}
 const [testedAgent,setTestedAgent]=useState<string|null>(null);
 useEffect(()=>{const id=agent?.id;queueMicrotask(()=>setTestedAgent(id&&readMilestone('tested:'+id)?id:null));},[agent?.id]);
 const done=[hasKey,data.documents.some(d=>d.agent_id===agent?.id&&d.published),!!agent&&(!!agent.first_preview_at||testedAgent===agent.id),!!agent?.first_embed_at&&!!agent.published&&hasKey];
 const createControls=<section aria-label='New assistant' className={'card '+s.assistantTools+' mb-4'}><p className={s.help}>{tier.name} · {data.agents.length} of {tier.assistants} assistants used</p>{creating?<><form className={s.form} onSubmit={create}><label>New assistant name<input name='name' maxLength={80} required placeholder='e.g. Customer advisor'/></label><label>Starter template<select name='template' defaultValue='support'>{ASSISTANT_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label><p className={s.help}>Sets the welcome message and Behavior. Review both before publishing.</p><button className='button button-primary' disabled={busy||data.agents.length>=tier.assistants}>Create</button></form><button className={s.textButton} disabled={busy} onClick={()=>setCreating(false)}>Cancel</button></>:<button className='button button-outline' disabled={data.agents.length>=tier.assistants} onClick={()=>{if(leave())setCreating(true);}}>+ New assistant</button>}</section>;
 const management=<div className={s.assistantChoices} role='region' aria-label='Assistant status'>{data.agents.map(a=>{const override=data.assistantKeys?.find(key=>key.agent_id===a.id);return <div key={a.id} className={s.assistantCard} data-selected={a.id===agent?.id}>
 <button type='button' className={s.agentButton} aria-pressed={a.id===agent?.id} onClick={()=>{if(a.id!==agent?.id&&leave()){setActive(a.id);setTab('key');}}}><strong>{a.name}</strong><Status agent={a} hasKey={override?allowsOverride&&!override.invalidated_at:sharedConnected} keyIssue={!!override}/></button>
 <HeaderUsage row={data.usage.find(u=>u.agent_id===a.id&&u.day===todayKey)} limit={limitFor(a.id,a.daily_limit)} onRaise={()=>raiseLimit(a.id)}/>
 </div>;})}</div>;
 return <><h2>{copy.onboarding.title}</h2><ol className={s.steps} aria-label='Assistant setup'>{copy.onboarding.steps.map((label,i)=><li key={label}><button onClick={()=>i===0?fixKey():navigate(i===1?'knowledge':i===2?'preview':'embed')} disabled={!agent&&i>0}><span aria-hidden='true'>{done[i]?'✓':i+1}</span>{label}<span className={s.srOnly}>{done[i]?' '+copy.onboarding.done:' '+copy.onboarding.pending}</span></button></li>)}</ol><ErrorNotice error={error} onKey={fixKey}/>{createControls}<div className={'card '+s.workspacePanel}><div>{agent?<section><div className={s.assistantHeader}><div className={s.assistantHeading}><h2>{agent.name}</h2><Status agent={agent} hasKey={hasKey} keyIssue={!!keyInfo}/></div>{data.agents.length>1&&<label className={s.assistantSelect}><span>Switch assistant</span><select value={agent.id} onChange={e=>{if(leave())setActive(e.target.value);}}>{data.agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}</div>{!hasKey&&<div className={s.alert} role='alert'><p>{keyInfo?'This assistant’s override key needs attention before it can answer.':<>No API key connected, so this assistant can&apos;t answer.</>}</p><button className='button button-primary' onClick={fixKey}>{keyInfo?'Review override key':'Review model configuration'}</button></div>}<div className={s.settingsLayout}><SettingsNav label='Assistant sections'><button type='button' className={s.keyNavButton} data-connected={hasKey||undefined} aria-current={tab==='key'?'page':undefined} aria-pressed={tab==='key'} onClick={fixKey}><SettingsIcon name='security'/><span>Key options<small>{hasKey?(keyInfo?'Override connected':'Default connected'):'Connection required'}</small></span></button><span className={s.navDivider} aria-hidden/>{(['status','settings','knowledge','preview','embed'] as const).map(t=><button key={t} aria-current={tab===t?'page':undefined} aria-pressed={tab===t} onClick={()=>navigate(t)}><SettingsIcon name={t}/>{t==='embed'?'Publish & Embed':t[0].toUpperCase()+t.slice(1)}</button>)}<span className={s.navDivider} aria-hidden/><button type='button' aria-current={tab==='danger'?'page':undefined} aria-pressed={tab==='danger'} onClick={()=>navigate('danger')}><SettingsIcon name='security'/>Danger zone</button></SettingsNav><div className={s.settingsContent}>
 {tab==='key'&&<AssistantOpenAIConnection key={'connection:'+agent.id} agentId={agent.id} allowed={allowsOverride} sharedConnected={sharedConnected} keyInfo={keyInfo} onSharedKey={onDefaultKey} onSaved={refresh}/>}
 {tab==='status'&&management}
 {tab==='settings'&&<Settings key={'settings:'+agent.id} rows={data.usage.filter(u=>u.agent_id===agent.id)} agent={agent} effectiveLimit={limitFor(agent.id,agent.daily_limit)} onSaved={refresh} onKey={fixKey}/>}
 {tab==='knowledge'&&<Knowledge documentLimit={tier.documents} key={agent.id} agent={agent} onSaved={refresh}/>}
 {tab==='preview'&&<Preview key={agent.id} agent={agent} hasKey={hasKey} keyIssue={!!keyInfo} onKey={fixKey} onNavigate={navigate} onUsage={refresh} onTested={()=>{recordMilestone('tested:'+agent.id);setTestedAgent(agent.id);}}/>}
 {tab==='embed'&&<Publish websiteLimit={tier.websites} key={agent.id} agent={agent} hasKey={hasKey} onSaved={refresh} onKey={fixKey}/>}
 {tab==='danger'&&<DangerZone key={agent.id} agent={agent} onSaved={refresh}/>}
 </div></div></section>:<><div className={s.empty}>Create your first assistant. Add its behavior and knowledge, test it privately, then publish it on your website.</div></>}</div></div></>;
}
