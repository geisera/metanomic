import {normalizeNotice,plainText,NOTICE_TYPES,type Filters,type Opportunity} from './core';
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
export function matchesExtract(row:ExtractRow,f:Filters){
 const n=row.notice,date=n.posted.slice(0,10),text=(n.title+' '+row.description).toLowerCase();
 return f.keyword.toLowerCase().split(/\s+/).filter(Boolean).every(term=>text.includes(term))&&date>=f.postedFrom&&date<=f.postedTo&&(!f.agency||n.agency.toLowerCase().includes(f.agency.toLowerCase()))&&(!f.naics||n.naics.startsWith(f.naics))&&(!f.setAside||row.setAsideCode===f.setAside)&&(!f.noticeType||n.type.toLowerCase()===(NOTICE_TYPES.find(([id])=>id===f.noticeType)?.[1]||'').toLowerCase());
}
