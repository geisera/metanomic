export const MAX_UPDATE_CALLS=5;
export const DEFAULT_DAILY_LIMIT=10;
export type IndexedOpportunity = import('./core').Opportunity & {matchKind?:'exact'|'related';descriptionStatus?:string;descriptionTruncated?:boolean;indexedAt?:string;descriptionAt?:string};
export type Coverage={scope:null|{id:string;filters:import('./core').Filters;next_page:number;metadata_complete:boolean;upstream_total:number;last_update:string|null};indexed:number;ready:number;pending:number;unavailable:number;truncated:number;reservedToday:number;dailyLimit:number};
export function relatedTerms(query:string,enabled:boolean):string[]{
 if(!enabled)return [];
 const q=query.trim().toLowerCase();
 const terms:Record<string,string[]>={salesforce:['CRM','customer relationship management','Service Cloud','Sales Cloud','Agentforce'],crm:['Salesforce','customer relationship management'],automation:['workflow','robotic process automation'], 'artificial intelligence':['machine learning','AI']};
 return terms[q]||[];
}
export function updateBudget(value:unknown):number{if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>MAX_UPDATE_CALLS)throw new Error('Choose 1–5 API requests per update.');return value;}
export function dailyLimit(value:string|undefined):number{const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=1000?n:DEFAULT_DAILY_LIMIT;}
