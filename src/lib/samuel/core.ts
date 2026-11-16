export type Filters = { keyword: string; agency: string; naics: string; noticeType: string; setAside: string; postedFrom: string; postedTo: string; page: number };
export type Opportunity = { id: string; title: string; agency: string; solicitation: string; type: string; posted: string; deadline: string; naics: string; setAside: string; active: string; url: string };
export type SearchResult = { opportunities: Opportunity[]; total: number; page: number; fetchedAt: string };
export const PAGE_SIZE = 20;
export const NOTICE_TYPES = [['','All notice types'],['o','Solicitation'],['k','Combined synopsis / solicitation'],['r','Sources sought'],['p','Presolicitation'],['a','Award notice'],['s','Special notice']] as const;
export const SET_ASIDES = [['','Any set-aside'],['SBA','Total small business'],['SBP','Partial small business'],['8A','8(a)'],['HZC','HUBZone'],['SDVOSBC','Service-disabled veteran-owned'],['WOSB','Women-owned small business'],['EDWOSB','Economically disadvantaged WOSB']] as const;
export function parseFilters(value: unknown): Filters {
  if (!value || typeof value !== 'object') throw new Error('Enter search filters.');
  const v = value as Record<string, unknown>;
  const str = (key: string, max: number) => { const s=v[key] ?? ''; if(typeof s!=='string'||s.length>max) throw new Error('Invalid '+key+'.'); return s.trim(); };
  const f = { keyword:str('keyword',160), agency:str('agency',160), naics:str('naics',6), noticeType:str('noticeType',1), setAside:str('setAside',12), postedFrom:str('postedFrom',10), postedTo:str('postedTo',10), page:v.page??0 };
  const date = (s:string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
  if(!date(f.postedFrom)||!date(f.postedTo)||f.postedFrom>f.postedTo||Date.parse(f.postedTo)-Date.parse(f.postedFrom)>364*86400000) throw new Error('Choose a valid posted-date range of no more than 364 days between the start and end dates.');
  if(f.naics&&!/^\d{2,6}$/.test(f.naics)) throw new Error('NAICS must contain 2–6 digits.');
  if(!NOTICE_TYPES.some(([id])=>id===f.noticeType)||!SET_ASIDES.some(([id])=>id===f.setAside)) throw new Error('Choose a listed notice type and set-aside.');
  if(typeof f.page!=='number'||!Number.isInteger(f.page)||f.page<0||f.page>49) throw new Error('Page must be between 1 and 50.');
  return f as Filters;
}
export function searchParams(f:Filters): URLSearchParams {
  const us=(s:string)=>s.slice(5,7)+'/'+s.slice(8,10)+'/'+s.slice(0,4);
  const p=new URLSearchParams({postedFrom:us(f.postedFrom),postedTo:us(f.postedTo),limit:String(PAGE_SIZE),offset:String(f.page)});
  for(const [key,value] of [['title',f.keyword],['organizationName',f.agency],['ncode',f.naics],['ptype',f.noticeType],['typeOfSetAside',f.setAside]]) if(value)p.set(key,value);
  return p;
}
export const validNoticeId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{32}$/i.test(id);
export function normalizeNotice(raw: unknown): Opportunity | null {
  if(!raw||typeof raw!=='object')return null;
  const r=raw as Record<string,unknown>;
  if(!validNoticeId(r.noticeId))return null;
  const s=(key:string,max=500)=>typeof r[key]==='string'?(r[key] as string).slice(0,max):'';
  return {id:r.noticeId,title:s('title')||'Untitled notice',agency:s('fullParentPathName'),solicitation:s('solicitationNumber'),type:s('type'),posted:s('postedDate',80),deadline:s('responseDeadLine',80)||s('reponseDeadLine',80),naics:s('naicsCode'),setAside:s('typeOfSetAsideDescription')||s('setAside'),active:s('active',10),url:'https://sam.gov/opp/'+r.noticeId+'/view'};
}
export function plainText(s:string):string {
 return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}

export function defaultSearchFilters(now=new Date()):Filters {
 const end=now.toISOString().slice(0,10);
 const start=new Date(Date.parse(end)-364*86400000).toISOString().slice(0,10);
 return {keyword:'',agency:'',naics:'',noticeType:'',setAside:'',postedFrom:start,postedTo:end,page:0};
}
