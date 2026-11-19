import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';

function widgetClient(){
  const source=ts.transpileModule(readFileSync('src/lib/studio/widget.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports',source)(()=>({launcherAnimationFrames:{},launcherAnimationOptions:{},launcherAnimationRepeatDelay:15000}),module,module.exports);
  return module.exports.widgetClient;
}

function element(tag='div'){
  return {tag,textContent:'',value:'',children:[],disabled:false,attrs:{},style:{},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(key,value){this.attrs[key]=value;},remove(){},focus(){},click(){this.onclick?.();}};
}

test('assistant markdown is rendered safely without exposing formatting markers',async()=>{
  const elements=new Map();
  for(const id of ['config','log','form','message','send','status','name','clear','close'])elements.set(id,element(id));
  elements.get('config').textContent=JSON.stringify({id:'00000000-0000-4000-8000-000000000001',name:'Test',greeting:'Hello',sendLabel:'Send',parentOrigin:'https://example.com',token:'grant'});
  const context={URL,location:{origin:'https://metanomic.ai'},document:{getElementById:id=>elements.get(id),createElement:element,createTextNode:text=>({tag:'#text',textContent:text}),addEventListener(){}},parent:{postMessage(){}},AbortController,TextDecoder,fetch:async()=>new Response('{"delta":"A **bold** answer with [details](https://example.com). <script>alert(1)</script> ![photo](https://example.com/a.png)"}\n{"done":true}\n')};
  vm.runInNewContext(widgetClient(),context);
  elements.get('message').value='Question';
  await elements.get('form').onsubmit({preventDefault(){}});
  const answer=elements.get('log').children.at(-1),paragraph=answer.children[0];
  assert.ok(paragraph.children.some(child=>child.tag==='strong'&&child.textContent==='bold'));
  assert.ok(paragraph.children.some(child=>child.tag==='a'&&child.href==='https://example.com/'));
  assert.equal(paragraph.children.some(child=>child.tag==='script'||child.tag==='img'),false);
  assert.equal(paragraph.children.some(child=>child.textContent?.includes('**')),false);
});
