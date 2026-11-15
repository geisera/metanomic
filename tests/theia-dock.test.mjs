import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restoreConversation,contextPrompts,dockChips,entrySource} from '../src/lib/theia-dock.ts';
test('session restore retains conversation and limits, rejecting corrupt or oversized payloads',()=>{
 const items=[{id:'intro',role:'assistant',content:'Welcome'},{id:'u1',role:'user',content:'Help with intake'},{id:'a1',role:'assistant',content:'Pilot plan'}];
 assert.deepEqual(restoreConversation(JSON.stringify(items)),items);
 for(const raw of [null,'invalid','{}','[]',JSON.stringify([{id:'x',role:'system',content:'bad'}]),JSON.stringify(Array.from({length:8},(_,i)=>({id:String(i),role:'user',content:'hi'})))])assert.equal(restoreConversation(raw),null);
});
test('six service contexts map to use cases and context-aware chips',()=>{
 assert.equal(Object.keys(contextPrompts).length,6);
 for(const [name,prompt] of Object.entries(contextPrompts)){
  const chips=dockChips(name);assert.equal(chips.length,4);assert.equal(new Set(chips.map(c=>c.label)).size,4);assert.equal(chips[0].prompt,prompt.replace(/…$/,'.'));
 }
 assert.match(contextPrompts['Salesforce agents'],/Salesforce/);
});
test('CTA source taxonomy excludes message content',()=>{
 assert.equal(entrySource('card'),'card_link');assert.equal(entrySource('nav-popover'),'nav');assert.equal(entrySource('final-cta'),'footer');assert.equal(entrySource('section-chip'),'chip');
});
