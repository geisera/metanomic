'use client';
import {useState} from 'react';
import {NOTICE_TYPES,SET_ASIDES,defaultSearchFilters,type Filters,type SearchResult} from '@/lib/samuel/core';
import s from './samuel.module.css';
export type IndexRequest=Filters;
export type IndexResult=SearchResult;
export async function samuelApi(body:unknown){const r=await fetch('/api/samuel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Samuel could not complete the request.');return data;}
export default function DiscoveryPanel({connected,busy,setBusy,onResults,onError}:{connected:boolean;busy:string;setBusy:(v:string)=>void;onResults:(r:SearchResult,q:Filters)=>void;onError:(v:string)=>void}){
 const [filters,setFilters]=useState<Filters>(()=>defaultSearchFilters());
 function change(key:keyof Filters,v:string){setFilters(f=>({...f,[key]:v}));}
 return <section className='card'><p className='eyebrow'>02 / Opportunity search</p><h2>What are you looking for?</h2><form onSubmit={async e=>{e.preventDefault();setBusy('search');onError('');const request={...filters,page:0};try{onResults(await samuelApi({action:'search',filters:request}),request);}catch(e){onError(e instanceof Error?e.message:'Search failed.');}finally{setBusy('');}}}>
 <label>Title keyword<input value={filters.keyword} onChange={e=>change('keyword',e.target.value)} maxLength={160} placeholder='e.g. Salesforce'/></label>
 <p className={s.help}>Search SAM.gov notice titles across all agencies and NAICS codes by default. Covers the past 12 months; narrow or change the dates below. No company profile is needed to search.</p>
 <details className={s.collectionDetails}><summary>Optional filters</summary><div className={s.fields}>
 <label>Agency<input value={filters.agency} onChange={e=>change('agency',e.target.value)} maxLength={160} placeholder='All agencies'/></label>
 <label>NAICS code<input value={filters.naics} onChange={e=>change('naics',e.target.value)} inputMode='numeric' pattern='[0-9]{2,6}' maxLength={6} placeholder='All NAICS codes'/></label>
 <label>Notice type<select value={filters.noticeType} onChange={e=>change('noticeType',e.target.value)}>{NOTICE_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label>Set-aside<select value={filters.setAside} onChange={e=>change('setAside',e.target.value)}>{SET_ASIDES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label>Posted from<input type='date' value={filters.postedFrom} onChange={e=>change('postedFrom',e.target.value)} required/></label><label>Posted through<input type='date' value={filters.postedTo} onChange={e=>change('postedTo',e.target.value)} required/></label>
 </div><p className={s.help}>SAM.gov’s public API requires a posting-date window of no more than one year.</p><button type='button' className={s.textButton} onClick={()=>setFilters({...defaultSearchFilters(),keyword:filters.keyword})}>Reset optional filters</button></details>
 <div className={s.actions}><button className='button button-primary' disabled={!!busy||!connected}>{busy==='search'?'Searching SAM.gov…':'Search opportunities →'}</button><span className={s.help}>20 results per page · Title matches</span></div>
 </form></section>;
}
