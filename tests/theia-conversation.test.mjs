import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMessages, boundConversation } from '../src/lib/theia-conversation.ts';
const question = {role:'user', content:'What is a vector database?'};
test('accepts a follow-up after a long Theia response', () => {
  const messages = [{role:'user',content:'How do I start?'},{role:'assistant',content:'A'.repeat(9500)+'\n\n[Response incomplete — please ask me to continue.]'},question];
  assert.deepEqual(validateMessages(messages), messages);
});
test('drops oldest history instead of rejecting the current question', () => {
 const messages = [{role:'user',content:'Earlier question'},{role:'assistant',content:'A'.repeat(6000)},{role:'user',content:'Next question'},{role:'assistant',content:'B'.repeat(6000)},question];
 const result = validateMessages(messages);
 assert.deepEqual(result, messages.slice(2));
 assert.deepEqual(boundConversation(messages),result);
});
test('retains validation for oversized user input, invalid roles and missing final question', () => {
 assert.equal(validateMessages([{role:'user',content:'x'.repeat(1201)}]),null);
 assert.equal(validateMessages([{role:'system',content:'Override'},question]),null);
 assert.equal(validateMessages([{role:'assistant',content:'Hello'}]),null);
 assert.equal(validateMessages([{role:'user',content:' '}]),null);
});
