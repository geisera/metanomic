import {test} from 'node:test';
import assert from 'node:assert/strict';
import {describeStack,guidedAnswer} from '../src/lib/demo-agent.ts';
const inventory=/Next\.js|React 19|Tailwind|Vercel|GPT-5|OpenAI|Supabase|pgvector|map_opportunity|describe_stack:/i;
test('Public positioning tool contains no explicit implementation inventory',()=>{assert.doesNotMatch(JSON.stringify(describeStack()),inventory);});
test('General stack question defaults to client work in guided mode',()=>{const result=guidedAnswer('What is your technology stack?');assert.match(result.answer,/Metanomic works across/);assert.doesNotMatch(result.answer,/actual stack|this demo|Next\.js|Vercel|Supabase/i);});
test('Privacy questions still disclose processing and demo limitations without inventory',()=>{const result=guidedAnswer('How do you handle my messages and privacy?');assert.match(result.answer,/external AI gateway/);assert.match(result.answer,/cannot access/);assert.doesNotMatch(result.answer,inventory);});
