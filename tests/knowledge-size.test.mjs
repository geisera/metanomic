import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
async function isolatedModule(path, pattern) {
 const source=(await readFile(new URL(path,import.meta.url),'utf8')).replace(pattern,'');
 return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
}
const {validateDocument,parseBody}=await isolatedModule('../src/lib/knowledge-server.ts',/import \{ cookies \} from "next\/headers";/);
const {chunkDocument}=await isolatedModule('../src/lib/theia-rag.ts',/import \{ getKnowledgeConfig, type KnowledgeSession \} from "\.\/knowledge-server";/);
const content='Knowledge paragraph. '.repeat(20000);
const fields={title:'Large knowledge reference',summary:'',category:'technical',content,source_url:'',status:'draft'};
test('large draft and published documents retain all content',()=>{
 for(const status of ['draft','published']) assert.equal(validateDocument({...fields,status}).content,content.trim());
 assert.equal(validateDocument({...fields,status:'published',content:''}),null);
 assert.equal(validateDocument({...fields,category:'invalid'}),null);
});
test('document request accepts large UTF-8 content while control requests stay bounded',async()=>{
 const request=()=>new Request('https://example.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...fields,content:'漢'.repeat(150000)})});
 assert.equal((await parseBody(request(),4400000)).content.length,150000);
 assert.equal(await parseBody(request()),null);
});
test('chunking allows more than 150 passages and preserves the final content',()=>{
 const chunks=chunkDocument(content+'THE END');
 assert.ok(chunks.length>150);
 assert.ok(chunks.every(c=>c.length<=2000));
 assert.ok(chunks.at(-1).endsWith('THE END'));
});
