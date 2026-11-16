import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseIntentReview} from '../src/lib/theia-intent.ts';
test('semantic intent labels preserve business, technical and insufficient-context distinctions',()=>{
 for(const [input,expected] of [['BUSINESS_PROBLEM','business_problem'],['IN_SCOPE','in_scope'],['CLARIFY','clarify'],['OUT_OF_SCOPE','out_of_scope']])assert.equal(parseIntentReview(' '+input+'\n'),expected);
});
test('empty or malformed classifier output is a technical failure, not clarification or rejection',()=>{
 for(const input of [null,undefined,'','IN_SCOPE because this is business','{"label":"CLARIFY"}',{},'ERROR'])assert.equal(parseIntentReview(input),'unavailable');
});
