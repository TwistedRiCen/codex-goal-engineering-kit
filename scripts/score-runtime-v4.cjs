'use strict';
// runtime-3.0 consumes new complete replay packets only. It never rewrites or
// interprets the historical v3/rubric-2.0 records with these PASS semantics.
const crypto = require('node:crypto');
const RUBRIC = 'runtime-3.0';
const UNKNOWN = 'UNKNOWN';
const own = (value, key) => value !== null && typeof value === 'object' && Object.hasOwn(value, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const isDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isIdentity = value => typeof value === 'string' && value !== UNKNOWN && /^[a-z0-9_.:-]{1,120}$/i.test(value);
function canonical(value) {
  const active = new Set();
  function encode(item, depth) {
    if (depth > 60) throw new TypeError('Replay nesting limit exceeded');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number' && Number.isFinite(item)) return JSON.stringify(item);
    if (!Array.isArray(item) && !plain(item)) throw new TypeError('Replay must contain JSON values');
    if (active.has(item)) throw new TypeError('Replay contains a cycle');
    active.add(item);
    const descriptors = Object.getOwnPropertyDescriptors(item);
    if (Object.getOwnPropertySymbols(item).length) throw new TypeError('Replay symbol property');
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || !own(descriptor, 'value')) throw new TypeError('Unsafe replay property');
      if (!descriptor.enumerable && !(Array.isArray(item) && key === 'length')) throw new TypeError('Non-JSON replay property');
      if (Array.isArray(item) && key !== 'length' && !/^(?:0|[1-9][0-9]*)$/.test(key)) throw new TypeError('Non-JSON array property');
    }
    let result;
    if (Array.isArray(item)) {
      const members = [];
      for (let index = 0; index < item.length; index++) {
        if (!own(item, index)) throw new TypeError('Sparse replay array');
        members.push(encode(item[index], depth + 1));
      }
      result = '[' + members.join(',') + ']';
    } else result = '{' + Object.keys(item).sort().map(key => JSON.stringify(key) + ':' + encode(item[key], depth + 1)).join(',') + '}';
    active.delete(item);
    return result;
  }
  return encode(value, 0);
}
function sealReplay(body) {
  if (!plain(body)) throw new TypeError('Replay body must be an object');
  // Validate descriptors before accessing members, including caller-supplied digest.
  canonical(body);
  const clean = Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'inputDigest'));
  const text = canonical(clean);
  return { ...JSON.parse(text), inputDigest: sha(text) };
}
function safeFiles(value) {
  return plain(value) && Object.entries(value).every(([name, text]) => typeof text === 'string'
    && name.length > 0 && !/^[\\/]|^[a-z]:|\\|\0/i.test(name)
    && name.split('/').every(part => part && part !== '.' && part !== '..'));
}
function required(value, keys) { return plain(value) && keys.every(key => own(value, key)); }
function packetError(packet) {
  try {
    canonical(packet);
    if (!required(packet, ['schema', 'harness', 'scenario', 'primaryThread', 'initial', 'final', 'observation', 'checks', 'inputDigest'])) return 'Missing packet fields';
    if (!isIdentity(packet.primaryThread)) return 'Invalid primary thread identity';
    if (packet.schema !== 2 || packet.harness !== 'execution-regression-v4' || !['E1', 'E2', 'E3', 'E4', 'E5', 'E6'].includes(packet.scenario)) return 'Unsupported packet version or scenario';
    const body = Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'inputDigest'));
    if (!isDigest(packet.inputDigest) || sha(canonical(body)) !== packet.inputDigest) return 'Replay digest mismatch';
    if (!required(packet.initial, ['baseline', 'files', 'fullCheckRuns']) || !safeFiles(packet.initial.files)
      || typeof packet.initial.baseline !== 'string' || !packet.initial.baseline
      || !Number.isSafeInteger(packet.initial.fullCheckRuns) || packet.initial.fullCheckRuns < 0) return 'Invalid initial snapshot';
    if (!required(packet.final, ['files', 'fullCheckRuns', 'head', 'protectedIntact']) || !safeFiles(packet.final.files)
      || typeof packet.final.head !== 'string' || typeof packet.final.protectedIntact !== 'boolean'
      || !Number.isSafeInteger(packet.final.fullCheckRuns) || packet.final.fullCheckRuns < 0) return 'Invalid final snapshot';
    const observation = packet.observation;
    if (!required(observation, ['schema', 'commands', 'reads', 'agents', 'reviewers', 'unknownEvents', 'completeness']) || observation.schema !== 2
      || !plain(observation.completeness)
      || ['commands', 'reads', 'agents', 'reviewers', 'unknownEvents'].some(key => !Array.isArray(observation[key]) || observation[key].some(entry => !plain(entry)))) return 'Invalid observation schema';
    if (!Array.isArray(packet.checks) || packet.checks.some(check => !required(check, ['id', 'exitCode']) || typeof check.id !== 'string' || !Number.isSafeInteger(check.exitCode))) return 'Invalid check receipts';
    return null;
  } catch { return 'Malformed replay packet'; }
}
const observed = item => plain(item) && item.source === 'OBSERVED' && own(item, 'value') ? item.value : UNKNOWN;
const declared = item => plain(item) && item.source === 'DECLARED' && own(item, 'value') ? item.value : UNKNOWN;
const headings = ['Plan Metadata', 'Project Goal / Scope', 'Acceptance Criteria', 'Current Work', 'Decisions and Blockers', 'Repository and Verification State'];
function compactPlan(text) {
  if (typeof text !== 'string') return false;
  const actual = [...text.matchAll(/^##[ \t]+([^\r\n]+)[ \t]*$/gm)].map(match => match[1].trim());
  return JSON.stringify(actual) === JSON.stringify(headings) && /\bSTANDARD\b/.test(text) && !/\bTask Mode:\s*FULL\b/.test(text);
}
function gradeReplay(packet) {
  const error = packetError(packet);
  if (error) return { rubric: RUBRIC, scenario: UNKNOWN,
    status: 'FAIL', passed: false, criteria: [{ id: 'packet-integrity', status: 'FAIL', reason: error }] };
  const criteria = [{ id: 'packet-integrity', status: 'PASS', reason: 'Versioned packet and full input digest verified' }];
  const { observation: o, initial, final, scenario } = packet;
  const primary = packet.primaryThread;
  const actorReads = o.reads.filter(read => observed(read.threadId) === primary);
  const add = (id, status, reason) => criteria.push({ id, status, reason });
  const check = (id, value, success, failure) => add(id, value ? 'PASS' : 'FAIL', value ? success : failure);
  function affected(domain) {
    return o.unknownEvents.some(event => !Array.isArray(event.affectedDomains) || !event.affectedDomains.length
      || event.affectedDomains.some(value => !['commands', 'reads', 'agents', 'interactions', 'files'].includes(value))
      || event.affectedDomains.includes(domain));
  }
  const complete = domain => observed(o.completeness.transportComplete) === true
    && observed(o.completeness.controlledToolsOnly) === true && !affected(domain);
  function readRequired(id, name) {
    const success = actorReads.some(read => observed(read.path) === name && observed(read.success) === true && observed(read.operation) === 'READ'
      && isDigest(observed(read.contentDigest)));
    add(id, success ? 'PASS' : 'NOT PROVEN', success ? 'Trusted successful I/O receipt captured' : 'No successful observed read receipt');
  }
  function noReads(id, forbidden) {
    const loaded = actorReads.some(read => forbidden(typeof observed(read.path) === 'string' ? observed(read.path).toLowerCase() : observed(read.path))
      && observed(read.success) === true && observed(read.operation) === 'READ');
    if (loaded) add(id, 'FAIL', 'Forbidden reference has a successful observed read');
    else add(id, complete('reads') ? 'PASS' : 'NOT PROVEN', complete('reads') ? 'Complete controlled read scope contains no forbidden load' : 'Read scope is not complete');
  }
  function boundCheck(receipt, expectedArgv) {
    if (!receipt || !required(receipt, ['id', 'commandId', 'threadId', 'exitCode', 'outputDigest'])
      || !isIdentity(receipt.commandId) || !isIdentity(receipt.threadId) || !isDigest(receipt.outputDigest)) return { status: 'NOT PROVEN', reason: 'Missing bound command receipt fields' };
    const commands = o.commands.filter(command => observed(command.commandId) === receipt.commandId);
    if (!commands.length) return { status: 'NOT PROVEN', reason: 'No corresponding observed command' };
    if (commands.length !== 1) return { status: 'FAIL', reason: 'Ambiguous command identity' };
    const command = commands[0];
    if (command.source !== 'OBSERVED' || ['category', 'exitCode', 'outputDigest', 'threadId', 'argv'].some(key => observed(command[key]) === UNKNOWN)) {
      return { status: 'NOT PROVEN', reason: 'Corresponding command lacks observed evidence' };
    }
    if (observed(command.category) !== 'check' || observed(command.exitCode) !== receipt.exitCode
      || observed(command.outputDigest) !== receipt.outputDigest || observed(command.threadId) !== receipt.threadId
      || expectedArgv && canonical(observed(command.argv)) !== canonical(expectedArgv)) return { status: 'FAIL', reason: 'Receipt contradicts the observed command tuple or registered argv' };
    return { status: 'PASS', reason: 'Receipt exactly matches the observed command tuple and registered argv' };
  }
  const observedChecks = o.commands.filter(command => command.source === 'OBSERVED' && observed(command.category) === 'check');
  function checkSequence() {
    const claimed = packet.checks.map(receipt => receipt.commandId);
    if (new Set(claimed).size !== claimed.length) return { status: 'FAIL', reason: 'Duplicate claimed command identity' };
    const bindings = packet.checks.map(receipt => boundCheck(receipt));
    if (bindings.some(binding => binding.status === 'FAIL')) return { status: 'FAIL', reason: 'A claimed tuple contradicts observed command evidence' };
    if (bindings.some(binding => binding.status === 'NOT PROVEN')) return { status: 'NOT PROVEN', reason: 'A claimed check lacks complete observed evidence' };
    let previous = 0;
    for (const command of observedChecks) {
      if (!Number.isSafeInteger(command.attempt) || command.attempt <= 0) return { status: 'NOT PROVEN', reason: 'Observed check attempt ordering is missing' };
      if (command.attempt <= previous) return { status: 'FAIL', reason: 'Observed check attempt order is duplicated or descending' };
      previous = command.attempt;
    }
    if (observedChecks.length !== packet.checks.length) return { status: 'NOT PROVEN', reason: 'Claimed checks omit observed check attempts' };
    if (observedChecks.some((command, index) => observed(command.commandId) !== packet.checks[index].commandId)) {
      return { status: 'FAIL', reason: 'Claimed check order contradicts observed attempt order' };
    }
    return { status: 'PASS', reason: 'All observed check attempts have exactly one matching receipt in actual attempt order' };
  }
  function latestCheck(expectedArgv, receiptIds) {
    // Summary order or omissions cannot decide which actual command was last.
    const command = observedChecks.filter(item => canonical(observed(item.argv)) === canonical(expectedArgv)).at(-1);
    if (!command) return { receipt: undefined, bound: { status: 'NOT PROVEN', reason: 'No observed registered check attempt' } };
    const receipts = packet.checks.filter(receipt => receipt.commandId === observed(command.commandId));
    if (receipts.length !== 1) return { receipt: undefined, bound: { status: receipts.length ? 'FAIL' : 'NOT PROVEN', reason: 'Latest observed check has no unique claimed receipt' } };
    const receipt = receipts[0];
    const bound = boundCheck(receipt, expectedArgv);
    if (bound.status === 'PASS' && !receiptIds.includes(receipt.id)) return { receipt, bound: { status: 'FAIL', reason: 'Latest observed registered check is mislabeled in the summary' } };
    return { receipt, bound };
  }
  function verification() {
    const argv = scenario === 'E1' ? ['node', 'scripts/check-copy.cjs'] : ['node', '--test', scenario === 'E2' ? 'test/divide.test.cjs' : 'test/clamp.test.cjs'];
    const { receipt: latest, bound } = latestCheck(argv, ['focused', 'independent-focused']);
    add('focused-verification', bound.status !== 'PASS' ? bound.status : latest.exitCode === 0 ? 'PASS' : 'FAIL',
      bound.status !== 'PASS' ? bound.reason : latest.exitCode === 0 ? 'Latest bound focused verification succeeded' : 'Latest bound focused verification failed');
  }
  function acceptance() {
    const { receipt: latest, bound } = latestCheck(['node', 'scripts/acceptance.cjs'], ['independent-acceptance']);
    const protectedScript = own(initial.files, 'scripts/acceptance.cjs') && final.files['scripts/acceptance.cjs'] === initial.files['scripts/acceptance.cjs'];
    add('bounded-feature-acceptance', !protectedScript ? 'NOT PROVEN' : bound.status !== 'PASS' ? bound.status : latest.exitCode === 0 ? 'PASS' : 'FAIL',
      !protectedScript ? 'Protected acceptance script missing or changed' : bound.status !== 'PASS' ? bound.reason : latest.exitCode === 0 ? 'Bound independent acceptance assertions succeeded' : 'Bound independent acceptance assertions failed');
  }
  const fileName = name => Object.keys(final.files).find(key => key.toLowerCase() === name.toLowerCase());
  const planName = fileName('PLAN.md');
  const plan = planName === undefined ? undefined : final.files[planName];
  function noJournal() { check('no-strict-journal', fileName('.goal/execution-state.md') === undefined, 'Final snapshot contains no strict journal', 'Strict journal exists'); }
  function ordinary() {
    noJournal();
    check('full-check-reuse', final.fullCheckRuns === initial.fullCheckRuns, 'Recorded full-suite counter preserved', 'Full-suite counter changed');
  }
  function statePlan() { check('compact-standard-plan', compactPlan(plan), 'Full retained STANDARD PLAN has the six canonical headings', 'Missing or invalid compact STANDARD PLAN'); }
  const allowed = { E1: ['copy.txt'], E2: ['src/divide.cjs', 'test/divide.test.cjs', 'API.md', 'PLAN.md'],
    E3: ['src/clamp.cjs', 'test/clamp.test.cjs', 'PLAN.md'], E4: [], E5: [], E6: [] }[scenario];
  const changedPaths = [...new Set([...Object.keys(initial.files), ...Object.keys(final.files)])]
    .filter(name => initial.files[name] !== final.files[name]);
  check('protected-files', final.protectedIntact && final.head === initial.baseline && changedPaths.every(name => allowed.includes(name)),
    'Complete snapshots independently preserve all paths outside the scenario write allowlist and baseline HEAD', 'Protected artifact, unexpected path, or baseline HEAD changed');
  const sequence = checkSequence();
  add('check-receipts-consistent', sequence.status, sequence.reason);
  if (scenario === 'E1') {
    check('no-plan', planName === undefined, 'Final snapshot contains no PLAN', 'DIRECT created a PLAN');
    ordinary();
    if (o.agents.length) add('no-unnecessary-agent', 'FAIL', 'Agent invocation observed');
    else add('no-unnecessary-agent', complete('agents') ? 'PASS' : 'NOT PROVEN', complete('agents') ? 'Complete controlled agent scope has no invocation' : 'Agent scope is incomplete');
    verification();
    readRequired('main-loaded', 'skill/SKILL.md');
    noReads('main-only', value => typeof value === 'string' && value.startsWith('skill/references/'));
  } else if (scenario === 'E2') {
    statePlan();
    check('risk-escalation', typeof plan === 'string' && /\bzero\b|±0|\+0|-0/.test(plan), 'STANDARD PLAN records the zero-contract risk', 'Risk escalation marker absent');
    noJournal();
    verification();
    acceptance();
    readRequired('main-loaded', 'skill/SKILL.md');
    readRequired('standard-state-loaded', 'skill/references/standard-state.md');
    const expected = packet.reviewerExpected;
    if (!required(expected, ['baseline', 'diffDigest']) || typeof expected.baseline !== 'string' || !isDigest(expected.diffDigest)) add('reviewer-gate', 'NOT PROVEN', 'Expected review baseline or diff digest missing');
    else {
      let status = 'NOT PROVEN', reason = 'No complete matching independent reviewer receipt';
      for (const review of o.reviewers) {
        if (primary !== UNKNOWN && observed(review.actorThreadId) !== primary) continue;
        const wrong = observed(review.readOnly) === false || observed(review.differentThread) === false
          || observed(review.actorThreadId) !== UNKNOWN && observed(review.actorThreadId) === observed(review.reviewThreadId)
          || observed(review.baseline) !== UNKNOWN && observed(review.baseline) !== expected.baseline
          || observed(review.diffDigest) !== UNKNOWN && observed(review.diffDigest) !== expected.diffDigest
          || declared(review.role) !== UNKNOWN && declared(review.role) !== 'reviewer'
          || declared(review.verdict) === 'FAIL';
        if (wrong) { status = 'FAIL'; reason = 'Captured reviewer evidence contradicts the required gate'; break; }
        const counts = declared(review.findings);
        if (plain(counts) && (counts.BLOCKER > 0 || counts.MAJOR > 0)) { status = 'FAIL'; reason = 'Reviewer declared material findings'; break; }
        const captured = observed(review.completed) === true && observed(review.resultCaptured) === true
          && observed(review.differentThread) === true && observed(review.readOnly) === true
          && typeof observed(review.actorThreadId) === 'string' && observed(review.actorThreadId) !== UNKNOWN
          && typeof observed(review.reviewThreadId) === 'string' && observed(review.reviewThreadId) !== UNKNOWN
          && observed(review.actorThreadId) !== observed(review.reviewThreadId)
          && declared(review.role) === 'reviewer' && observed(review.roleOrigin) === 'HARNESS_CONFIG'
          && observed(review.baseline) === expected.baseline && observed(review.diffDigest) === expected.diffDigest
          && isDigest(observed(review.resultDigest)) && isDigest(observed(review.resultPayloadDigest))
          && declared(review.verdict) === 'PASS' && plain(counts)
          && ['BLOCKER', 'MAJOR', 'MINOR', 'INFO'].every(key => own(counts, key) && Number.isSafeInteger(counts[key]) && counts[key] >= 0)
          && counts.BLOCKER === 0 && counts.MAJOR === 0;
        const readCoverage = ['src/divide.cjs', 'test/divide.test.cjs', 'API.md', 'PLAN.md'].every(name => o.reads.some(read =>
          observed(read.threadId) === observed(review.reviewThreadId) && observed(read.path) === name
          && observed(read.operation) === 'READ' && observed(read.success) === true
          && own(final.files, name) && observed(read.contentDigest) === sha(final.files[name])
          && observed(read.bytes) === Buffer.byteLength(final.files[name])));
        if (captured && readCoverage) { status = 'PASS'; reason = 'Observed separate read-only reviewer read the four review files and completed the matching baseline/diff; judgment is DECLARED, role is harness configured'; }
      }
      add('reviewer-gate', status, reason);
    }
  } else if (scenario === 'E3') {
    statePlan(); ordinary(); verification(); acceptance();
    check('acceptance-state-declared', typeof plan === 'string' && /AC-NEW[^\r\n]*\bVERIFIED\b/.test(plan),
      'Retained PLAN declares AC-NEW VERIFIED; actual acceptance is evaluated separately', 'PLAN does not declare AC-NEW VERIFIED');
    readRequired('main-loaded', 'skill/SKILL.md');
    readRequired('standard-state-loaded', 'skill/references/standard-state.md');
    readRequired('evidence-loaded', 'skill/references/evidence-and-delivery.md');
    noReads('ordinary-reference-boundary', value => ['skill/references/full-lifecycle.md', 'skill/references/execution-continuity.md'].includes(value));
    const original = initial.files['PLAN.md'];
    const oldLines = typeof original === 'string' ? original.split(/\r?\n/).filter(line => /\bAC-OLD\b|\bD-1\b/.test(line)).map(line => line.trim()) : [];
    check('preserved-state', oldLines.length >= 2 && oldLines.some(line => /\bAC-OLD\b/.test(line)) && oldLines.some(line => /\bD-1\b/.test(line))
      && typeof plan === 'string' && oldLines.every(line => plan.split(/\r?\n/).some(current => current.trim() === line)), 'Existing acceptance and decision evidence preserved', 'Original AC-OLD or D-1 missing or changed');
    check('baseline-receipt-preserved', own(initial.files, 'evidence/baseline.json') && final.files['evidence/baseline.json'] === initial.files['evidence/baseline.json'], 'Immutable baseline evidence bytes preserved', 'Baseline evidence missing or changed');
  } else if (scenario === 'E4') {
    check('read-only-files', canonical(initial.files) === canonical(final.files), 'Complete fixture snapshots are byte-identical', 'Read-only fixture changed');
    readRequired('main-loaded', 'skill/SKILL.md');
    readRequired('evidence-loaded', 'skill/references/evidence-and-delivery.md');
    noReads('single-reference-boundary', value => typeof value === 'string' && value.startsWith('skill/references/') && value !== 'skill/references/evidence-and-delivery.md');
  } else if (scenario === 'E5') {
    const { receipt, bound } = latestCheck(['node', '-e', 'process.exit(17)'], ['known-failure']);
    const command = receipt && o.commands.find(item => observed(item.commandId) === receipt.commandId);
    const found = bound.status === 'PASS' && receipt.exitCode === 17 && observed(command.failureCategory) === 'PROCESS_EXIT_NONZERO';
    add('known-safe-failure', bound.status !== 'PASS' ? bound.status : found ? 'PASS' : 'NOT PROVEN',
      bound.status !== 'PASS' ? bound.reason : found ? 'Exact registered safe failure captured exit 17 with structured category' : 'Registered failure category or exit 17 missing');
  } else {
    const preserved = o.unknownEvents.some(event => Array.isArray(event.affectedDomains) && event.affectedDomains.includes('commands'));
    check('unknown-event-preserved', preserved, 'Future unknown event and affected commands domain preserved', 'Expected injected unknown event missing');
    add('unknown-command-criterion', affected('commands') ? 'NOT PROVEN' : 'FAIL', affected('commands') ? 'Unknown command evidence prevents this criterion' : 'Expected unknown command gap absent');
    check('unrelated-files', canonical(initial.files) === canonical(final.files), 'Unknown command event does not invalidate complete file snapshots', 'Fixture files changed');
  }
  const result = criteria.some(criterion => criterion.status === 'FAIL') ? 'FAIL'
    : criteria.some(criterion => criterion.status === 'NOT PROVEN') ? 'NOT PROVEN' : 'PASS';
  return { rubric: RUBRIC, scenario, status: result, passed: result === 'PASS', criteria };
}

module.exports = { gradeReplay, sealReplay, sha, canonical };
