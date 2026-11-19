import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';

function load(name){
  const source=ts.transpileModule(readFileSync(new URL('../src/lib/studio/'+name+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const compiled={exports:{}};
  new Function('require','module','exports',source)(path=>load(path.slice(2)),compiled,compiled.exports);
  return compiled.exports;
}

function element(tag='div'){
  return {
    tag, value:'', children:[], disabled:false, attrs:{}, style:{},
    get textContent(){return this.children.map(child=>typeof child==='string'?child:child.textContent).join('');},
    set textContent(value){this.children=[value];},
    append(...items){this.children.push(...items);},
    replaceChildren(...items){this.children=items;},
    setAttribute(key,value){this.attrs[key]=value;},
    remove(){}, focus(){}, click(){this.onclick?.();},
  };
}

const quote = '- **Queen Maribel the Uncrowned**: She rules the kingdom from the Orchard Crown, a hollow pear tree. She avoids wearing a metal crown because iron silences the kingdom’s bells.';

test('widget renders bold within a list and keeps user text and unsafe HTML inert',async()=>{
  const elements=new Map();
  for(const id of ['config','log','form','message','send','status','name','clear','close'])elements.set(id,element(id));
  elements.get('config').textContent=JSON.stringify({id:'00000000-0000-4000-8000-000000000001',name:'Test',greeting:'Hello',sendLabel:'Send',parentOrigin:'https://example.com',token:'grant'});
  const reply = 'Here is the answer.\n'+quote+'\n\n[details](https://example.com) <script>alert(1)</script> ![photo](https://example.com/a.png)';
  const context={URL,location:{origin:'https://metanomic.ai'},document:{getElementById:id=>elements.get(id),createElement:element,addEventListener(){}},parent:{postMessage(){}},AbortController,TextDecoder,fetch:async()=>new Response([{delta:reply.slice(0,40)},{delta:reply.slice(40)},{done:true,text:reply}].map(data=>JSON.stringify(data)+'\n').join(''))};
  vm.runInNewContext(load('widget').widgetClient,context);
  elements.get('message').value='**Question**';
  await elements.get('form').onsubmit({preventDefault(){}});
  const [,user,answer]=elements.get('log').children;
  const [intro,list,paragraph]=answer.children;
  assert.equal(user.textContent,'**Question**');
  assert.equal(intro.tag,'p');
  assert.equal(list.tag,'ul');
  assert.equal(list.children[0].tag,'li');
  assert.ok(list.children[0].children.some(child=>child.tag==='strong'&&child.textContent==='Queen Maribel the Uncrowned'));
  assert.equal(list.children[0].children.some(child=>typeof child==='string'&&child.includes('**')),false);
  assert.ok(paragraph.children.some(child=>child.tag==='a'&&child.href==='https://example.com/'));
  assert.equal(paragraph.children.some(child=>child.tag==='script'||child.tag==='img'),false);
});

test('reply formatter creates clickable links for the reported reply and common model variants',()=>{
  const context={URL,location:{origin:'https://metanomic.ai'},document:{createElement:element}};
  const render=vm.runInNewContext('('+load('reply-markdown').renderReplyMarkdown.toString()+')',context);
  const root=element();
  const variants=[
    'The secret link is to Google: [https://google.com](https://google.com)',
    'The secret link is to Google: **[https://google.com](https://google.com)**',
    'The secret link is to Google: <https://google.com>',
    'The secret link is to Google: (https://google.com).',
  ];
  const descendants=node=>[node,...(node.children??[]).flatMap(child=>typeof child==='string'?[]:descendants(child))];
  for (const reply of variants) {
    render(root,reply);
    const links=descendants(root).filter(node=>node.tag==='a');
    assert.equal(links.length,1,reply);
    assert.equal(links[0].textContent,'https://google.com');
    assert.equal(links[0].href,'https://google.com/');
    assert.equal(links[0].target,'_blank');
    assert.equal(links[0].rel,'noopener noreferrer');
  }
  assert.equal(root.textContent,variants.at(-1));
  render(root,'[Unsafe](javascript:alert(1)) https://name:pass@example.com `https://google.com`');
  assert.equal(descendants(root).some(node=>node.tag==='a'),false);
});
