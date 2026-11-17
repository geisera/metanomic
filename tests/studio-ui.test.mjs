import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),cache=new Map();
function load(path){path=resolve(path);if(cache.has(path))return cache.get(path);const compiled={exports:{}};cache.set(path,compiled.exports);const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;function dep(p){if(p.endsWith('.css'))return new Proxy({},{get:(_,key)=>String(key)});if(p==='next/link')return function MockLink({children,...props}){return React.createElement('a',props,children);};if(p.startsWith('.')||p.startsWith('@/')){let file=p.startsWith('@/')?resolve('src',p.slice(2)):resolve(dirname(path),p);if(!existsSync(file))file+=existsSync(file+'.tsx')?'.tsx':'.ts';return load(file);}return require(p);}new Function('require','module','exports',source)(dep,compiled,compiled.exports);cache.set(path,compiled.exports);return compiled.exports;}
const ui=load('src/app/theia-studio/ui.tsx');
const agent={id:'11111111-1111-4111-8111-111111111111',owner_id:'owner',name:'Test assistant',greeting:'Hello',instructions:'Answer customer questions.',model:'gpt-4.1-mini',published:true,origins:['https://example.com'],daily_limit:100,max_output:800,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
function render(component,props){return renderToStaticMarkup(React.createElement(ui.GuardProvider,null,React.createElement(component,props)));}
test('a published assistant without a key renders paused on card and header',()=>{const Workspace=load('src/app/theia-studio/Workspace.tsx').default;const html=render(Workspace,{data:{agents:[agent],keys:[],usage:[],documents:[]},refresh:async()=>{},onKey:()=>{}});assert.equal((html.match(/Paused – no key/g)||[]).length,2);assert.match(html,/No API key connected/);assert.match(html,/Assistant setup/);});
test('affected editor views render without backend access',()=>{for(const name of ['Settings','Knowledge','Preview','Publish']){const component=load('src/app/theia-studio/'+name+'.tsx').default;const html=render(component,{agent,hasKey:true,onSaved:async()=>{},onKey:()=>{},onUsage:async()=>{},onNavigate:()=>{}});assert.ok(html.length>100,name);}});
test('origin validation rejects paths, HTTP and wildcard and allows exact origins',()=>{for(const origin of ['http://example.com','https://*.example.com','https://example.com/a'])assert.equal(ui.validOrigins(origin),false);assert.equal(ui.validOrigins('https://example.com\nhttps://www.example.com'),true);});
test('embed customization escapes markup and preserves required data-agent attribute',()=>{const code=ui.embedCode({...agent,button_label:'"<script>&',button_color:'#112233',button_position:'left'});assert.match(code,/data-agent="111/);assert.match(code,/data-color="#112233"/);assert.match(code,/data-position="left"/);assert.match(code,/&quot;&lt;script&gt;&amp;/);});
