'use client';
import {useState} from 'react';
import {NOTICE_TYPES,SET_ASIDES,defaultSearchFilters,type Filters,type SearchResult,type SearchSource} from '@/lib/samuel/core';
import s from './samuel.module.css';
export type IndexRequest=Filters & {source:SearchSource};
export type IndexResult=SearchResult;
export async function samuelApi(body:unknown){const r=await fetch('/api/samuel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Samuel could not complete the request.');return data;}
export default function DiscoveryPanel({busy,setBusy,onResults,onError}:{busy:string;setBusy:(v:string)=>void;onResults:(r:SearchResult,q:IndexRequest)=>void;onError:(v:string)=>void}){
 const [source,setSource]=useState<SearchSource>('extract');
 const [filters,setFilters]=useState<Filters>(()=>defaultSearchFilters());
 function change(key:keyof Filters,v:string){setFilters(f=>({...f,[key]:v}));}
 return <section className='card'><p className='eyebrow'>02 / Opportunity search</p><h2>What are you looking for?</h2><form onSubmit={async e=>{e.preventDefault();setBusy('search');onError('');const request={...filters,page:0,source};try{onResults(await samuelApi({action:'search',filters:request,source:request.source}),request);}catch(e){onError(e instanceof Error?e.message:'Search failed.');}finally{setBusy('');}}}>
 <label>Search source<select value={source} disabled={!!busy} onChange={e=>setSource(e.target.value as SearchSource)}><option value='extract'>Public extract — titles and descriptions</option><option value='live'>Live SAM.gov API — titles only</option></select></label>
 <p className={s.help}>{source==='live'?'Makes one API request per search or page using Metanomic’s configured key and shared quota. No automatic fallback.':'Searches the downloaded public dataset without using API quota. The first search may take a minute to load it.'}</p>
 <label>{source==='live'?'Title keyword':'Keyword in title or description'}<input value={filters.keyword} onChange={e=>change('keyword',e.target.value)} maxLength={160} placeholder='e.g. Salesforce'/></label>
 <p className={s.help}>{source==='live'?'Queries SAM.gov’s API when you submit. Keywords match notice titles, not descriptions or attachments. No company profile is needed.':'Search titles and descriptions in SAM.gov’s published active-notice extract across all agencies and NAICS codes. All entered words must appear in the title or description. Archived notices and attachments are not searched. No company profile is needed.'}</p>
 <details className={s.collectionDetails}><summary>Optional filters</summary><div className={s.fields}>
 <label>Agency<input value={filters.agency} onChange={e=>change('agency',e.target.value)} maxLength={160} placeholder='All agencies'/></label>
 <label>NAICS code<input value={filters.naics} onChange={e=>change('naics',e.target.value)} inputMode='numeric' pattern='[0-9]{2,6}' maxLength={6} placeholder='All NAICS codes'/></label>
 <label>Notice type<select value={filters.noticeType} onChange={e=>change('noticeType',e.target.value)}>{NOTICE_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label>Set-aside<select value={filters.setAside} onChange={e=>change('setAside',e.target.value)}>{SET_ASIDES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label>Posted from<input type='date' value={filters.postedFrom} onChange={e=>change('postedFrom',e.target.value)} required/></label><label>Posted through<input type='date' value={filters.postedTo} onChange={e=>change('postedTo',e.target.value)} required/></label>
 </div><p className={s.help}>The default dates cover approximately the past year. Each search supports a 364-day range.</p><button type='button' className={s.textButton} onClick={()=>setFilters({...defaultSearchFilters(),keyword:filters.keyword})}>Reset optional filters</button></details>
 <div className={s.actions}><button className='button button-primary' disabled={!!busy}>{busy==='search'?(source==='live'?'Searching SAM.gov…':'Searching the extract…'):'Search opportunities →'}</button><span className={s.help}>20 results per page · {source==='live'?'Live API · Title matches':'Public extract · Title and description matches'}</span></div>
 </form></section>;
}
