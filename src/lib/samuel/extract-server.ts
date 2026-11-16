import {NOTICE_TYPES,type ExtractCoverage,type Filters,type Opportunity,type SearchResult} from './core';
import {SamuelError} from './server';
// Searches the shared extract store. No source download happens on this path:
// the scheduled ingest (extract-ingest.ts) keeps the store current.
export type ExtractQuery=(path:string,body:unknown)=>Promise<unknown>;
type Stored={ready?:boolean;total?:number;opportunities?:Opportunity[];coverage?:ExtractCoverage};
export async function searchExtract(query:ExtractQuery,filters:Filters):Promise<SearchResult>{
 const data=await query('rpc/samuel_extract_search',{p_keyword:filters.keyword,p_agency:filters.agency,p_naics:filters.naics,p_notice_type:filters.noticeType?NOTICE_TYPES.find(([id])=>id===filters.noticeType)?.[1]||'':'',p_set_aside:filters.setAside,p_from:filters.postedFrom,p_to:filters.postedTo,p_page:filters.page}) as Stored|null;
 if(!data?.ready)throw new SamuelError('The opportunity extract has not been loaded yet. Try again after the next scheduled refresh. No title-only fallback was used.',503);
 if(!Array.isArray(data.opportunities)||typeof data.total!=='number'||!data.coverage)throw new SamuelError('Samuel’s extract index returned an unexpected response.');
 return {opportunities:data.opportunities,total:data.total,page:filters.page,fetchedAt:new Date().toISOString(),coverage:data.coverage};
}
