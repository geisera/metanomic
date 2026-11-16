import { test } from 'node:test';
import assert from 'node:assert/strict';
import {parseFilters,searchParams,normalizeNotice,plainText} from '../src/lib/samuel/core.ts';
const base={postedFrom:'2026-10-01',postedTo:'2026-11-16'};
test('SAM filters map to documented API parameters and page index',()=>{
 const f=parseFilters({...base,keyword:'Salesforce',agency:'Justice',naics:'541512',page:2,noticeType:'o',setAside:'SBA'});
 const p=searchParams(f);assert.equal(p.get('offset'),'2');assert.equal(p.get('title'),'Salesforce');assert.equal(p.get('organizationName'),'Justice');assert.equal(p.get('postedFrom'),'10/01/2026');assert.equal(p.get('limit'),'20');assert.equal(p.has('api_key'),false);
});
test('SAM filters reject invalid dates, excessive date ranges and unsupported filters',()=>{
 for(const extra of [{postedFrom:'2026-02-30'},{postedTo:'2026-01-01'},{postedFrom:'2024-01-01'},{page:50},{page:-1},{page:1.2},{page:'2'},{noticeType:'x'},{naics:'abc'},{setAside:'fake'},{keyword:'x'.repeat(161)}])assert.throws(()=>parseFilters({...base,...extra}));
});
test('SAM notices expose only safe fields and construct a canonical source link',()=>{
 const id='a'.repeat(32);const n=normalizeNotice({noticeId:id,title:'Test',uiLink:'javascript:alert(1)',description:'https://bad.example/?api_key=secret',api_key:'secret',reponseDeadLine:'2026-12-01'});
 assert.equal(n.url,'https://sam.gov/opp/'+id+'/view');assert.equal(n.deadline,'2026-12-01');assert.equal(JSON.stringify(n).includes('secret'),false);assert.equal(normalizeNotice({noticeId:'../../admin'}),null);
});
test('Description markup and embedded scripts are not rendered as HTML',()=>{assert.equal(plainText('<script>evil()</script><p>Required &amp; useful</p>'),'Required & useful');});

test('Default title search requires no collection, agency or NAICS and covers a year',async()=>{
 const {defaultSearchFilters}=await import('../src/lib/samuel/core.ts');
 const f=defaultSearchFilters(new Date('2026-11-16T12:00:00Z'));
 f.keyword='Salesforce';
 const p=searchParams(parseFilters(f));
 assert.equal(f.postedFrom,'2025-11-16');assert.equal(p.get('title'),'Salesforce');
 for(const name of ['organizationName','ncode','ptype','typeOfSetAside'])assert.equal(p.has(name),false);
 assert.equal(p.get('limit'),'20');
});
