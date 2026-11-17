import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {themeInit} from '../src/lib/theme.ts';
test('theme initialization respects explicit choices, OS preference, and unavailable storage',()=>{
 for(const saved of ['dark','light','system',null,'invalid'])for(const dark of [true,false]){
  const document={documentElement:{dataset:{}}};
  vm.runInNewContext(themeInit,{document,localStorage:{getItem:()=>saved},matchMedia:()=>({matches:dark})});
  assert.equal(document.documentElement.dataset.theme,saved==='dark'||saved==='light'?saved:dark?'dark':'light');
 }
 const document={documentElement:{dataset:{}}};vm.runInNewContext(themeInit,{document,localStorage:{getItem(){throw Error();}},matchMedia:()=>({matches:false})});assert.equal(document.documentElement.dataset.theme,'light');
});
