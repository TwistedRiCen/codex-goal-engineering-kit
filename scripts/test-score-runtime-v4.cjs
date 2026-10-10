'use strict';
// Synthetic scorer controls are instrumentation evidence, never model results.
const test = require('node:test');
const assert = require('node:assert/strict');
const { gradeReplay, sealReplay, canonical, sha } = require('./score-runtime-v4.cjs');
const { createCollector } = require('./runtime-observation-v2.cjs');
const { fixture } = require('./run-execution-regression.cjs');
const digest = 'a'.repeat(64), baseline = 'b'.repeat(40);
const standard = fixture('standard-batch').files['PLAN.md'];
const riskPlan = standard.replace('Add an internal batch helper using the existing clamp contract.', 'Public divide API: both +0 and -0 denominator throw RangeError.');
const fact = (value, source = 'OBSERVED') => ({ value, source });
function build(id = 'E1') {
  const c = createCollector({ workspace: 'D:/fixture', skillRoot: 'D:/installed', metadata: { scenarioId: id } });
  const checks = [];
  const check = (name, argv, exitCode = 0) => {
    const commandId = 'command-' + (checks.length + 1), threadId = 'harness', outputDigest = sha('synthetic-' + name);
    c.record({ kind: 'check', commandId, threadId, argv, exitCode, outputDigest });
    checks.push({ id: name, commandId, threadId, exitCode, outputDigest });
  };
  const read = (name, threadId = 'actor', text) => c.record({ kind: 'read', path: name.startsWith('skill/') ? 'D:/installed/' + name.slice(6) : name,
    success: true, operation: 'READ', contentDigest: text === undefined ? digest : sha(text), bytes: text === undefined ? 10 : Buffer.byteLength(text), threadId });
  read('skill/SKILL.md');
  const initial = { baseline, files: { 'copy.txt': 'old', 'unrelated.txt': 'USER EDIT', 'evidence/baseline.json': '{"old":true}' }, fullCheckRuns: 1 };
  const final = { files: { ...initial.files, 'copy.txt': id === 'E1' ? 'new' : 'old' }, fullCheckRuns: 1, head: baseline, protectedIntact: true };
  if (['E2', 'E3'].includes(id)) {
    initial.files['scripts/acceptance.cjs'] = 'protected synthetic independent assertions';
    final.files['scripts/acceptance.cjs'] = initial.files['scripts/acceptance.cjs'];
  }
  if (id === 'E2') {
    final.files['PLAN.md'] = riskPlan;
    read('skill/references/standard-state.md');
    for (const name of ['src/divide.cjs', 'test/divide.test.cjs', 'API.md', 'PLAN.md']) {
      final.files[name] ??= 'public fixture'; read(name, 'reviewer', final.files[name]);
    }
    c.record({ kind: 'review', requestId: 'review-E2', actorThreadId: 'actor', reviewThreadId: 'reviewer', role: 'reviewer', roleOrigin: 'HARNESS_CONFIG',
      completed: true, readOnly: true, baseline, diffDigest: digest, resultCaptured: true, resultDigest: digest, resultPayloadDigest: digest,
      verdict: 'PASS', findings: [] });
  }
  if (id === 'E3') {
    initial.files['PLAN.md'] = standard; final.files['PLAN.md'] = standard.replace('Batch helper: NOT STARTED.', 'Batch helper: COMPLETE.')
      .replace('| OPEN | pending |', '| VERIFIED | independent acceptance |');
    read('skill/references/standard-state.md'); read('skill/references/evidence-and-delivery.md');
  }
  if (id === 'E4') { final.files = { ...initial.files }; read('skill/references/evidence-and-delivery.md'); }
  if (['E1', 'E2', 'E3'].includes(id)) check('focused', id === 'E1' ? ['node', 'scripts/check-copy.cjs'] : ['node', '--test', id === 'E2' ? 'test/divide.test.cjs' : 'test/clamp.test.cjs']);
  if (['E2', 'E3'].includes(id)) check('independent-acceptance', ['node', 'scripts/acceptance.cjs']);
  if (id === 'E5') check('known-failure', ['node', '-e', 'process.exit(17)'], 17);
  if (id === 'E6') { final.files = { ...initial.files }; c.accept({ method: 'future/unknownCommand', params: {} }); }
  return { schema: 2, harness: 'execution-regression-v4', scenario: id, primaryThread: 'actor', initial, final,
    observation: c.finish({ transportComplete: true, controlledToolsOnly: true }), checks,
    reviewerExpected: id === 'E2' ? { baseline, diffDigest: digest } : null };
}
const grade = body => gradeReplay(sealReplay(body));
const criterion = (result, id) => result.criteria.find(entry => entry.id === id)?.status;

test('new complete synthetic E1-E5 fixtures satisfy their independent criteria', () => {
  for (const id of ['E1', 'E2', 'E3', 'E4', 'E5']) {
    const result = grade(build(id));
    assert.equal(result.status, 'PASS', JSON.stringify(result));
    assert.equal(result.rubric, 'runtime-3.0');
  }
});

test('malformed, inherited and missing packet shapes fail without crashing', () => {
  for (const packet of [null, [], 1, {}, 'text', Object.create({ schema: 2 }), { schema: 2 }, { get schema() { throw Error('accessor'); } },
    { get scenario() { throw Error('accessor'); } }]) {
    const result = gradeReplay(packet);
    assert.equal(result.status, 'FAIL'); assert.equal(result.passed, false);
  }
});

test('packet version, input digest and retained PLAN tampering fail integrity', () => {
  const valid = sealReplay(build('E3'));
  for (const mutation of [p => p.schema = 1, p => p.harness = 'execution-regression-v3', p => p.final.files['PLAN.md'] += '\nTamper',
    p => p.inputDigest = '0'.repeat(64), p => p.scenario = 'invented']) {
    const packet = JSON.parse(JSON.stringify(valid)); mutation(packet);
    assert.equal(gradeReplay(packet).status, 'FAIL');
  }
});

test('canonical seals and scores are deterministic across key insertion order', () => {
  const body = build('E3'), reversed = Object.fromEntries(Object.entries(body).reverse());
  assert.equal(canonical(body), canonical(reversed));
  assert.equal(sealReplay(body).inputDigest, sealReplay(reversed).inputDigest);
  assert.deepEqual(gradeReplay(sealReplay(body)), gradeReplay(JSON.parse(JSON.stringify(sealReplay(body)))));
  assert.equal(sha('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('canonical rejects unsafe prototype keys, cycles, accessors and non-JSON values', () => {
  const cyclic = {}; cyclic.self = cyclic;
  for (const value of [cyclic, { x: undefined }, { x: NaN }, { x: BigInt(1) }, new Date(), JSON.parse('{"__proto__":{}}'), [, 1]]) {
    assert.throws(() => canonical(value));
  }
  assert.throws(() => sealReplay({ get x() { return 1; } }));
});

test('related unknown affects negative criterion, unrelated unknown does not veto all criteria', () => {
  const body = build();
  body.observation.unknownEvents.push({ affectedDomains: ['reads'] });
  let result = grade(body);
  assert.equal(criterion(result, 'main-only'), 'NOT PROVEN');
  assert.equal(criterion(result, 'no-unnecessary-agent'), 'PASS');
  assert.equal(criterion(result, 'protected-files'), 'PASS');
  body.observation.unknownEvents[0].affectedDomains = ['commands'];
  result = grade(body);
  assert.equal(result.status, 'PASS'); // Trusted I/O/checks do not require unknown command reconstruction.
});

test('E6 preserves unknown command domain while independently passing unchanged files', () => {
  const result = grade(build('E6'));
  assert.equal(result.status, 'NOT PROVEN');
  assert.equal(criterion(result, 'unknown-event-preserved'), 'PASS');
  assert.equal(criterion(result, 'unknown-command-criterion'), 'NOT PROVEN');
  assert.equal(criterion(result, 'unrelated-files'), 'PASS');
});

test('missing reviewer fields or only PLAN/waits cannot prove a review gate', () => {
  const body = build('E2');
  body.observation.reviewers = [];
  body.observation.agents.push({ tool: fact('wait'), status: fact('completed') });
  body.final.files['PLAN.md'] += '\nreview PASSED';
  assert.equal(criterion(grade(body), 'reviewer-gate'), 'NOT PROVEN');
  const incomplete = build('E2');
  for (const key of ['resultCaptured', 'completed', 'baseline', 'resultDigest', 'resultPayloadDigest', 'readOnly', 'roleOrigin']) {
    const packet = JSON.parse(JSON.stringify(incomplete)); delete packet.observation.reviewers[0][key];
    assert.equal(criterion(grade(packet), 'reviewer-gate'), 'NOT PROVEN', key);
  }
});

test('same-thread, writer, wrong baseline or explicit reviewer FAIL reject the gate', () => {
  for (const [key, value, source] of [['differentThread', false], ['readOnly', false], ['baseline', 'wrong'], ['diffDigest', 'c'.repeat(64)],
    ['role', 'worker', 'DECLARED'], ['verdict', 'FAIL', 'DECLARED']]) {
    const body = build('E2'); body.observation.reviewers[0][key] = fact(value, source);
    assert.equal(criterion(grade(body), 'reviewer-gate'), 'FAIL', key);
  }
  const body = build('E2'); body.observation.reviewers[0].reviewThreadId = fact('actor');
  assert.equal(criterion(grade(body), 'reviewer-gate'), 'FAIL');
});

test('reviewer captured result still requires objective coverage and finding counts', () => {
  const body = build('E2'); body.observation.reads = body.observation.reads.filter(read => read.threadId.value !== 'reviewer');
  assert.equal(criterion(grade(body), 'reviewer-gate'), 'NOT PROVEN');
  const findings = build('E2'); findings.observation.reviewers[0].findings = fact({ BLOCKER: 0, MAJOR: 1, MINOR: 0, INFO: 0 }, 'DECLARED');
  assert.equal(criterion(grade(findings), 'reviewer-gate'), 'FAIL');
});

test('declarations, candidate paths, read attempts and other thread loads are not primary reads', () => {
  const body = build(); body.observation.reads[0].success = fact(false);
  body.observation.commands.push({ inferredCandidatePaths: [{ path: fact('skill/SKILL.md', 'INFERRED') }] });
  body.observation.declarations = [{ text: 'I read the Skill' }];
  assert.equal(criterion(grade(body), 'main-loaded'), 'NOT PROVEN');
  body.observation.reads[0].success = fact(true, 'DECLARED');
  assert.equal(criterion(grade(body), 'main-loaded'), 'NOT PROVEN');
  body.observation.reads[0].success = fact(true); body.observation.reads[0].threadId = fact('other');
  assert.equal(criterion(grade(body), 'main-loaded'), 'NOT PROVEN');
});

test('successful unrelated reference is FAIL, but incomplete read scope is NOT PROVEN', () => {
  const body = build();
  body.observation.reads.push({ path: fact('skill/references/full-lifecycle.md'), success: fact(true), operation: fact('READ'), threadId: fact('actor'), contentDigest: fact(digest) });
  assert.equal(criterion(grade(body), 'main-only'), 'FAIL');
  body.observation.reads.pop(); body.observation.completeness.transportComplete = fact(false);
  assert.equal(criterion(grade(body), 'main-only'), 'NOT PROVEN');
});

test('STANDARD missing actual PLAN, mutated receipt or reopened state fails', () => {
  for (const mutation of [body => delete body.final.files['PLAN.md'], body => body.final.files['PLAN.md'] += '\n## Extra FULL state',
    body => body.final.files['PLAN.md'] = body.final.files['PLAN.md'].replace('D-1:', 'D-NEW:'),
    body => body.final.files['evidence/baseline.json'] = 'changed']) {
    const body = build('E3'); mutation(body);
    assert.equal(grade(body).status, 'FAIL');
  }
});

test('focused verification cannot pass vacuously or from diff-only checks', () => {
  const body = build(); body.checks = [];
  assert.equal(criterion(grade(body), 'focused-verification'), 'NOT PROVEN');
  body.checks = [{ id: 'diff', exitCode: 0 }];
  assert.equal(criterion(grade(body), 'focused-verification'), 'NOT PROVEN');
  const success = build().checks[0], command = build().observation.commands[0];
  body.checks = [{ ...success, id: 'focused', commandId: 'failed-command', exitCode: 1 }, { ...success, id: 'independent-focused' }];
  body.observation.commands = [{ ...command, commandId: fact('failed-command'), exitCode: fact(1), attempt: 1 }, { ...command, attempt: 2 }];
  assert.equal(criterion(grade(body), 'focused-verification'), 'PASS');
  body.checks.reverse();
  assert.equal(criterion(grade(body), 'focused-verification'), 'PASS');
  assert.equal(criterion(grade(body), 'check-receipts-consistent'), 'FAIL');
});

test('snapshot journal, agent, HEAD, protected file and full check drift fail respective criteria', () => {
  for (const [id, mutation] of [
    ['no-plan', body => body.final.files['PLAN.md'] = 'declared DIRECT'],
    ['no-strict-journal', body => body.final.files['.goal/execution-state.md'] = 'state'],
    ['no-unnecessary-agent', body => body.observation.agents.push({ tool: fact('spawn_agent') })],
    ['protected-files', body => body.final.head = 'new-head'],
    ['protected-files', body => body.final.protectedIntact = false],
    ['full-check-reuse', body => body.final.fullCheckRuns++]
  ]) { const body = build(); mutation(body); assert.equal(criterion(grade(body), id), 'FAIL', id); }
});

test('E5 missing registered code or declared classification remains NOT PROVEN', () => {
  const body = build('E5'); body.observation.commands[0].failureCategory = fact('PROCESS_EXIT_NONZERO', 'DECLARED');
  assert.equal(criterion(grade(body), 'known-safe-failure'), 'NOT PROVEN');
  body.observation.commands[0].failureCategory = fact('UNKNOWN');
  assert.equal(criterion(grade(body), 'known-safe-failure'), 'NOT PROVEN');
});

test('empty or malformed unknown affected domains cannot create a negative-assertion PASS', () => {
  for (const domains of [[], ['invented'], null]) {
    const body = build(); body.observation.unknownEvents.push({ affectedDomains: domains });
    assert.equal(criterion(grade(body), 'main-only'), 'NOT PROVEN');
    assert.equal(criterion(grade(body), 'protected-files'), 'PASS');
  }
});

test('case spelling cannot hide a forbidden observed Windows reference load', () => {
  const body = build('E3');
  body.observation.reads.push({ path: fact('skill/References/FULL-LIFECYCLE.MD'), operation: fact('READ'), success: fact(true), threadId: fact('actor') });
  assert.equal(criterion(grade(body), 'ordinary-reference-boundary'), 'FAIL');
});

test('hidden properties and extra array properties cannot evade replay digest coverage', () => {
  const hidden = {}; Object.defineProperty(hidden, 'secret', { value: 1 });
  const symbols = { x: 1 }; symbols[Symbol('hidden')] = 2;
  const extra = []; extra.hidden = 1;
  for (const value of [hidden, symbols, extra]) assert.throws(() => canonical(value));
});

test('protected snapshot is recomputed even when harness intact flag claims true', () => {
  for (const id of ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']) {
    const body = build(id); body.final.files['unrelated.txt'] = 'tampered';
    assert.equal(criterion(grade(body), 'protected-files'), 'FAIL', id);
    const extra = build(id); extra.final.files['unexpected.json'] = '{}';
    assert.equal(criterion(grade(extra), 'protected-files'), 'FAIL', id);
  }
});

test('a reviewer reading stale bytes or lacking bytes cannot prove current-file review', () => {
  const body = build('E2');
  body.observation.reads.find(read => read.threadId.value === 'reviewer').contentDigest = fact(digest);
  assert.equal(criterion(grade(body), 'reviewer-gate'), 'NOT PROVEN');
  const missingBytes = build('E2');
  delete missingBytes.observation.reads.find(read => read.threadId.value === 'reviewer').bytes;
  assert.equal(criterion(grade(missingBytes), 'reviewer-gate'), 'NOT PROVEN');
});

test('opaque native file I/O blocks read-negative but preserves objective snapshot judgments', () => {
  const body = build();
  const c = createCollector({ workspace: 'D:/fixture', skillRoot: 'D:/installed' });
  c.accept({ method: 'item/completed', params: { item: { type: 'fileChange', status: 'completed' } } });
  body.observation.unknownEvents.push(...c.finish().unknownEvents);
  const result = grade(body);
  assert.equal(criterion(result, 'main-only'), 'NOT PROVEN');
  assert.equal(criterion(result, 'protected-files'), 'PASS');
});

test('resealed packet cannot overwrite observed check failure or change the bound tuple', () => {
  for (const key of ['exitCode', 'outputDigest', 'threadId']) {
    const body = build();
    body.observation.commands[0][key] = fact(key === 'exitCode' ? 1 : key === 'outputDigest' ? 'c'.repeat(64) : 'another-thread');
    assert.equal(criterion(grade(body), 'focused-verification'), 'FAIL', key);
    assert.equal(criterion(grade(body), 'check-receipts-consistent'), 'FAIL', key);
  }
  const missing = build(); missing.observation.commands = [];
  assert.equal(criterion(grade(missing), 'focused-verification'), 'NOT PROVEN');
  assert.equal(grade(missing).passed, false);
});

test('missing primary thread never borrows successful reviewer-only reads', () => {
  for (const id of ['E1', 'E3']) {
    const body = build(id);
    for (const read of body.observation.reads) read.threadId = fact('reviewer');
    delete body.primaryThread;
    assert.equal(criterion(grade(body), 'packet-integrity'), 'FAIL');
    body.primaryThread = 'UNKNOWN';
    assert.equal(criterion(grade(body), 'packet-integrity'), 'FAIL');
  }
});

test('scalar-focused checks and declared AC-NEW VERIFIED do not prove the bounded feature', () => {
  for (const id of ['E2', 'E3']) {
    const body = build(id); body.checks = body.checks.filter(receipt => receipt.id !== 'independent-acceptance');
    assert.equal(criterion(grade(body), 'focused-verification'), 'PASS');
    assert.equal(criterion(grade(body), 'bounded-feature-acceptance'), 'NOT PROVEN');
    assert.equal(grade(body).passed, false);
  }
  const failed = build('E3');
  failed.checks[1].exitCode = 1; failed.observation.commands[1].exitCode = fact(1);
  assert.equal(criterion(grade(failed), 'bounded-feature-acceptance'), 'FAIL');
  const stale = build('E3'); stale.final.files['PLAN.md'] = standard;
  assert.equal(criterion(grade(stale), 'bounded-feature-acceptance'), 'PASS');
  assert.equal(criterion(grade(stale), 'acceptance-state-declared'), 'FAIL');
});

test('registered argv cannot be relabeled from whitespace inspection into focused verification', () => {
  const body = build(); body.observation.commands[0].argv = fact(['git', 'diff', '--check']);
  assert.equal(criterion(grade(body), 'focused-verification'), 'NOT PROVEN');
  const declared = build(); declared.observation.commands[0].exitCode = fact(0, 'DECLARED');
  assert.equal(criterion(grade(declared), 'focused-verification'), 'NOT PROVEN');
});

function lateFailure() {
  const body = build(), earlier = body.observation.commands[0], receipt = body.checks[0];
  body.observation.commands.push({ ...earlier, commandId: fact('late-failure'), exitCode: fact(1), attempt: earlier.attempt + 1 });
  body.checks.push({ ...receipt, id: 'independent-focused', commandId: 'late-failure', exitCode: 1 });
  return body;
}

test('reordering or omitting the late actual failure cannot turn a resealed run into PASS', () => {
  const original = lateFailure();
  assert.equal(criterion(grade(original), 'focused-verification'), 'FAIL');
  const reversed = lateFailure(); reversed.checks.reverse();
  assert.equal(criterion(grade(reversed), 'focused-verification'), 'FAIL');
  assert.equal(criterion(grade(reversed), 'check-receipts-consistent'), 'FAIL');
  const omitted = lateFailure(); omitted.checks.pop();
  assert.equal(criterion(grade(omitted), 'focused-verification'), 'NOT PROVEN');
  assert.equal(criterion(grade(omitted), 'check-receipts-consistent'), 'NOT PROVEN');
  assert.equal(grade(omitted).passed, false);
});

test('duplicate, missing, descending attempt and ambiguous thread identities are rejected', () => {
  const duplicate = lateFailure(); duplicate.checks.push({ ...duplicate.checks[0] });
  assert.equal(criterion(grade(duplicate), 'check-receipts-consistent'), 'FAIL');
  for (const attempt of [1, 0, undefined]) {
    const body = lateFailure();
    if (attempt === undefined) delete body.observation.commands[1].attempt;
    else body.observation.commands[1].attempt = attempt;
    assert.notEqual(criterion(grade(body), 'check-receipts-consistent'), 'PASS');
  }
  const unclaimed = build(); unclaimed.checks = [];
  assert.equal(criterion(grade(unclaimed), 'check-receipts-consistent'), 'NOT PROVEN');
  const ambiguous = build(); ambiguous.observation.commands.push({ ...ambiguous.observation.commands[0], threadId: fact('other'), attempt: 2 });
  assert.equal(criterion(grade(ambiguous), 'check-receipts-consistent'), 'FAIL');
});
