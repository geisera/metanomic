import {normalizeNotice,plainText,type Opportunity} from './core';
export type ExtractRow={notice:Opportunity;description:string;setAsideCode:string};
// Incremental RFC 4180 reader: quoted newlines and escaped quotes can span chunks.
export async function* csvRows(chunks:AsyncIterable<string>):AsyncGenerator<string[]>{
 let field='',row:string[]=[],quoted=false,afterQuote=false;
 for await(const chunk of chunks)for(const c of chunk){
  if(quoted){if(c==='"'){quoted=false;afterQuote=true;}else field+=c;}
  else if(afterQuote&&c==='"'){field+='"';quoted=true;afterQuote=false;}
  else {afterQuote=false;if(c==='"'&&!field)quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field.replace(/\r$/,''));yield row;row=[];field='';}else field+=c;}
  if(field.length>2000000||row.length>100)throw new Error('Invalid extract record size.');
 }
 if(quoted)throw new Error('Incomplete CSV extract.');
 if(field||row.length){row.push(field.replace(/\r$/,''));yield row;}
}
export function extractRow(r:Record<string,string>):ExtractRow|null{
 const notice=normalizeNotice({noticeId:r.NoticeId,title:r.Title,fullParentPathName:[r['Department/Ind.Agency'],r['Sub-Tier'],r.Office].filter(Boolean).join(' / '),solicitationNumber:r['Sol#'],type:r.Type,postedDate:r.PostedDate,responseDeadLine:r.ResponseDeadLine,naicsCode:r.NaicsCode,typeOfSetAsideDescription:r.SetASide,active:r.Active});
 return notice?{notice,description:plainText(r.Description||''),setAsideCode:r.SetASideCode||''}:null;
}
// Shape of one stored notice. Descriptions are capped so the search index stays within Postgres limits.
export const MAX_DESCRIPTION=100000;
export type StoredNotice={id:string;notice:Opportunity;description:string;description_truncated:boolean;set_aside_code:string};
export function storedNotice(row:ExtractRow):StoredNotice{
 return {id:row.notice.id,notice:row.notice,description:row.description.slice(0,MAX_DESCRIPTION),description_truncated:row.description.length>MAX_DESCRIPTION,set_aside_code:row.setAsideCode.slice(0,12)};
}
export type SourceStamp={etag:string|null;lastModified:string|null};
// True only when the published file is provably the one already loaded.
export function sourceUnchanged(current:SourceStamp|null,source:SourceStamp):boolean{
 if(!current)return false;
 if(current.etag&&source.etag)return current.etag===source.etag;
 if(current.lastModified&&source.lastModified)return Date.parse(current.lastModified)===Date.parse(source.lastModified);
 return false;
}
// A sharp drop in notices usually means a broken or partial file, not a real change.
export const shrinkRejected=(previous:number|null|undefined,next:number)=>!!previous&&next<previous*0.8;
export function httpDate(value:string|null):string|null{const t=value?Date.parse(value):NaN;return Number.isFinite(t)?new Date(t).toISOString():null;}
