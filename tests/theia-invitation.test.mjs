import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractInvitation } from '../src/lib/theia-invitation.ts';
test('separates a contextual appointment invitation from answer text', () => {
 const result = extractInvitation('Vectors represent meaning.\nAPPOINTMENT_TOPIC: applying vector databases to your knowledge base');
 assert.equal(result.answer, 'Vectors represent meaning.');
 assert.equal(result.invitation, 'Would you like to book an appointment with Metanomic to discuss applying vector databases to your knowledge base?');
});
test('missing or invalid metadata leaves an intact answer and safe fallback', () => {
 for (const suffix of ['', '\nAPPOINTMENT_TOPIC:', '\nAPPOINTMENT_TOPIC: <script>']) {
 const result = extractInvitation('Useful answer.' + suffix);
 assert.equal(result.answer, 'Useful answer.');
 assert.match(result.invitation, /your goals/);
 }
});
