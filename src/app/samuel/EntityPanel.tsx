'use client';
import {useState} from 'react';
import {type EntityRecord,type EntitySettings} from '@/lib/samuel/entity';
import {samuelApi} from './DiscoveryPanel';
import s from './samuel.module.css';
export default function EntityPanel({settings,onChange}:{settings:EntitySettings;onChange:(v:EntitySettings)=>void}){
 const [uei,setUei]=useState(settings.uei),[record,setRecord]=useState<EntityRecord|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <section className={'card '+s.entity}><h2>SAM.gov entity record</h2>
 <label className={s.entityToggle}><input type='checkbox' checked={settings.show} aria-controls='samuel-entity-details' onChange={e=>onChange({...settings,show:e.target.checked})}/>Show my SAM.gov entity record</label>
 <label className={s.entityToggle}><input type='checkbox' checked={settings.useInBriefs} disabled={!settings.uei} onChange={e=>onChange({...settings,useInBriefs:e.target.checked})}/>Use this record in fit briefs</label>
 <p className={s.help}>{settings.uei?'Selected UEI: '+settings.uei+'. ':'No entity selected. '}Hiding this panel does not change whether briefs use the record. Preferences are saved in this browser under your account.</p>
 {settings.show&&<div id='samuel-entity-details'><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setRecord(null);try{setRecord((await samuelApi({action:'entity',uei})).entity);}catch(e){setError(e instanceof Error?e.message:'Entity lookup failed.');}finally{setBusy(false);}}}>
 <label htmlFor='samuel-uei'>Unique Entity ID (UEI)</label><input id='samuel-uei' value={uei} onChange={e=>{setUei(e.target.value.toUpperCase().trim());setRecord(null);}} pattern='[A-Z0-9]{12}' minLength={12} maxLength={12} required autoCapitalize='characters' autoComplete='off' disabled={busy}/>
 <button className='button button-outline' disabled={busy}>{busy?'Loading record…':'Look up / refresh record'}</button></form>
 <p className={s.help}>Each lookup uses one API request. When enabled, briefs retrieve the record again and send the displayed registration fields to the AI service. Registration data does not establish eligibility for a particular contract.</p>
 {error&&<p role='alert' className={s.alert}>{error}</p>}
 {record&&<div aria-live='polite'><h3>{record.name}</h3><dl>{[['UEI',record.uei],['Trading name',record.dba],['CAGE code',record.cage],['Registration status',record.status],['Registered with SAM',record.registered],['Registration date',record.registrationDate],['Expiration date',record.expirationDate],['Last updated by SAM.gov',record.updatedDate],['Primary NAICS',record.primaryNaics],['NAICS codes',record.naics.join('; ')],['Business classifications',record.businessTypes.join('; ')]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not provided'}</dd></div>)}</dl>
 <p className={s.help}>Source: SAM.gov Entity Management API · Retrieved {new Date(record.fetchedAt).toLocaleString()}. Classifications are registry-reported, not an independent certification check.</p>
 <a href={record.source} target='_blank' rel='noopener noreferrer' className={s.textButton}>Verify on SAM.gov ↗</a>
 {settings.uei!==record.uei?<button type='button' className='button button-primary' onClick={()=>onChange({...settings,uei:record.uei,useInBriefs:false})}>Confirm this is my business</button>:<p className={s.help}>This is your selected business.</p>}
 </div>}
 {settings.uei&&<button className={s.textButton} type='button' onClick={()=>{onChange({...settings,uei:'',useInBriefs:false});setRecord(null);setUei('');}}>Remove selected entity</button>}
 </div>}
 </section>;
}
