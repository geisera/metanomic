import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consumeTheiaPrefill, openTheia, PREFILL_KEY } from '../src/lib/theia-entry.ts';
function storage() { const map = new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}; }
test('all sources navigate without putting prompt text in the URL; consuming and refreshing cannot resend',()=>{
 const store=storage();let url='';globalThis.window={sessionStorage:store,location:{assign:value=>url=value}};
 for(const source of ['nav','nav-popover','bar','bar-example','hero','card','section-input','section-chip','launcher','final-cta','footer']) {
  openTheia({source,prompt:'Our intake forms take days to process.'});
  assert.equal(url,'/demo');assert.equal(consumeTheiaPrefill(store),'Our intake forms take days to process.');
  assert.equal(store.getItem(PREFILL_KEY),null);assert.equal(consumeTheiaPrefill(store),null);
 }
 delete globalThis.window;
});
test('plain entry clears old prefill and storage restrictions preserve navigation',()=>{
 const store=storage();store.setItem(PREFILL_KEY,'stale');let url='';globalThis.window={sessionStorage:store,location:{assign:v=>url=v}};
 openTheia({source:'hero'});assert.equal(consumeTheiaPrefill(store),null);
 globalThis.window.sessionStorage={setItem(){throw Error('disabled')},removeItem(){throw Error('disabled')}};
 openTheia({source:'card',prompt:'Question'});assert.equal(url,'/demo');
 assert.equal(consumeTheiaPrefill({getItem(){throw Error('disabled')},removeItem(){}}),null);
 delete globalThis.window;
});
