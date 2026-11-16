export type EntityRecord={uei:string;name:string;dba:string;cage:string;status:string;registered:string;registrationDate:string;expirationDate:string;updatedDate:string;primaryNaics:string;naics:string[];businessTypes:string[];fetchedAt:string;source:string};
export type EntitySettings={show:boolean;useInBriefs:boolean;uei:string};
export const validUei=(v:unknown):v is string=>typeof v==='string'&&/^[A-Z0-9]{12}$/.test(v);
export function entitySettings(v:unknown):EntitySettings{const r=v&&typeof v==='object'?v as Record<string,unknown>:{};const uei=validUei(r.uei)?r.uei:'';return {show:r.show===true,useInBriefs:!!uei&&r.useInBriefs===true,uei};}
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const str=(v:unknown)=>typeof v==='string'&&v!=='null'?v.slice(0,300):'';
export function normalizeEntity(raw:unknown,uei:string):EntityRecord|null{
 const r=obj(raw),reg=obj(r.entityRegistration),core=obj(r.coreData),assertions=obj(r.assertions),naics=obj(assertions.goodsAndServices),types=obj(core.businessTypes);
 if(str(reg.ueiSAM)!==uei||!str(reg.legalBusinessName)||reg.publicDisplayFlag==='N')return null;
 const list=(v:unknown,key:string)=>Array.isArray(v)?v.slice(0,100).map(x=>str(obj(x)[key])).filter(Boolean):[];
 return {uei,name:str(reg.legalBusinessName),dba:str(reg.dbaName),cage:str(reg.cageCode),status:str(reg.registrationStatus),registered:str(reg.samRegistered),registrationDate:str(reg.registrationDate),expirationDate:str(reg.registrationExpirationDate),updatedDate:str(reg.lastUpdateDate),primaryNaics:str(naics.primaryNaics),naics:Array.isArray(naics.naicsList)?naics.naicsList.slice(0,100).map(x=>{const n=obj(x);return [str(n.naicsCode),str(n.naicsDescription)].filter(Boolean).join(' — ');} ).filter(Boolean):[],businessTypes:list(types.businessTypeList,'businessTypeDesc'),fetchedAt:new Date().toISOString(),source:'https://sam.gov/entity-information'};
}
