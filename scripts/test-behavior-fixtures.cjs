'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { cases, probe } = require('../examples/behavior-fixtures/probe.cjs');
const { grade } = require('../examples/behavior-fixtures/score.cjs');

// Hand-authored oracle examples test the scorer, never stand in for model observations.
const rows = [
  ['D1','independent',[],[], 'not_applicable',false,'review',[]],
  ['D2','none',[],[], 'not_applicable',true,'report',[]],
  ['D3','delta',[],['full','review'], 'not_applicable',false,'review',[]],
  ['D4','pending',[],[], 'not_applicable',false,'stop',[]],
  ['V1','none',[],[], 'blocked',false,'report',['generator','parser-zero']],
  ['V2','none',['docs'],['full'], 'not_applicable',false,'verify',[]],
  ['V3','none',['full'],[], 'not_applicable',false,'verify',[]],
  ['X1','none',[],[], 'unknown',false,'investigate',['status']],
  ['X2','none',[],[], 'blocked',false,'wait',['status']],
  ['X3','none',[],[], 'blocked',false,'stop',['refresh']],
  ['X4','none',[],[], 'pending',false,'wait',['status']],
  ['X5','none',['affected'],[], 'failed',false,'investigate',['status']]
];
function observations() {
  return rows.map(([id,review,verification,reuse,delivery,complete,next,probes]) =>
    ({id,mode:'DIRECT',artifacts:[],review,verification:[...verification],reuse:[...reuse],delivery,complete,next,probes:[...probes],reason:'Test oracle example'}));
}
test('offline fixtures are stable and reject unknown operations', () => {
  assert.equal(new Set(cases.map(c => c.id)).size, 12);
  assert.deepEqual(probe('X3','refresh'), probe('X3','refresh'));
  assert.equal(probe('X2','status').testsExecuted, false);
  assert.equal(probe('X4','status').status, 'queued');
  assert.equal(probe('X5','status').conclusion, 'failure');
  assert.throws(() => probe('X1','create'));
  assert.throws(() => probe('missing'));
});
test('generation and downstream validation exercise different contracts', () => {
  assert.equal(probe('V1','generator'), 'pr: 0\nbody: example');
  assert.deepEqual(probe('V1','parser-zero'), {ok:false,reason:'invalid_pr'});
  assert.equal(probe('V1','parser-valid').ok, true);
});
test('complete hand-authored positive observations pass', () => {
  assert.equal(grade(observations()).passed, true);
});
const mutations = [
  ['D1', {review:'none',complete:true}, 'missed review'],
  ['D2', {review:'independent'}, 'unnecessary reviewer'],
  ['D2', {artifacts:['PLAN.md']}, 'DIRECT plan inflation'],
  ['D2', {verification:['full']}, 'unnecessary full suite'],
  ['D3', {review:'none'}, 'unreviewed repair'],
  ['D3', {verification:['full']}, 'unnecessary repair full suite'],
  ['D4', {review:'independent',complete:true}, 'self-review mislabeled'],
  ['V1', {delivery:'ready',complete:true}, 'generator mistaken for acceptance'],
  ['V1', {probes:['generator']}, 'missing consumer evidence'],
  ['V2', {reuse:[]}, 'unaffected evidence discarded'],
  ['V3', {verification:[],reuse:['full']}, 'stale evidence reused'],
  ['X1', {delivery:'failed',next:'continue'}, 'unknown write treated as failed'],
  ['X2', {delivery:'failed',verification:['full']}, 'approval treated as test failure'],
  ['X3', {delivery:'ready',complete:true,probes:[]}, 'stale collision evidence'],
  ['X4', {delivery:'blocked'}, 'queued confused with blocked'],
  ['X5', {delivery:'pending'}, 'failure confused with waiting']
];
for (const [id, changes, label] of mutations) {
  test('reject ' + label, () => {
    const input = observations();
    Object.assign(input.find(row => row.id === id), changes);
    const result = grade(input);
    assert.equal(result.passed, false);
    assert.ok(result.failures.some(f => f.id === id));
  });
}
test('partial, duplicate and malformed observations cannot pass', () => {
  assert.equal(grade(observations().slice(1)).passed, false);
  assert.equal(grade([...observations(), observations()[0]]).passed, false);
  assert.equal(grade([null]).passed, false);
  assert.throws(() => grade({}));
  const input = observations();
  input[0].reason = '';
  assert.equal(grade(input).passed, false);
});

test('equivalent outcome labels do not replace the required safe action', () => {
  const input = observations();
  input.find(r => r.id === 'V1').delivery = 'not_applicable';
  input.find(r => r.id === 'X3').delivery = 'not_applicable';
  assert.equal(grade(input).passed, true);
  input.find(r => r.id === 'X3').next = 'continue';
  assert.equal(grade(input).passed, false);
});
test('unknown and repeated verification values are rejected', () => {
  for (const verification of [['invented'], ['affected', 'affected']]) {
    const input = observations();
    input[0].verification = verification;
    assert.equal(grade(input).passed, false);
  }
});
test('parser rejection cannot be reported ready with completion still false', () => {
  const input = observations();
  input.find(row => row.id === 'V1').delivery = 'ready';
  assert.equal(grade(input).passed, false);
});
test('unknown IDs including inherited object names cannot be accepted', () => {
  for (const id of ['unknown', 'toString', 'constructor', '__proto__']) {
    const input = observations();
    input.push({ ...input[0], id });
    assert.equal(grade(input).passed, false);
  }
});
test('malformed repair verification yields a failed score instead of throwing', () => {
  const input = observations();
  input.find(row => row.id === 'D3').verification = {};
  assert.equal(grade(input).passed, false);
});