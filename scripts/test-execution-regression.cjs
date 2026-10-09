'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { collect, grade, fixture, digestFiles, parseArgs, safeCleanup, classifyCommand, cliArgs, fullCheckSnapshot, caseSummary, invocation } = require('./run-execution-regression.cjs');

// Hand-authored traces exercise collector/grader only. These are NOT model observations.
function fakeTrace(command = 'node scripts/check-copy.cjs') {
  return [{ type: 'thread.started' }, { type: 'item.completed', item: { type: 'command_execution', command, status: 'completed', exit_code: 0, aggregated_output: 'COPY_CHECK_PASS' } }, { type: 'turn.completed' }].map(row => JSON.stringify(row)).join('\n');
}
function observation(id = 'direct-copy') {
  return { trace: collect(fakeTrace(id === 'direct-copy' ? undefined : 'node --test test/clamp.test.cjs')), process: { exitCode: 0, timedOut: false, overflow: false, launchFailed: false },
    changedFiles: [...fixture(id).allowed], independentChecks: id === 'direct-copy' ? [{ exitCode: 0 }] : [{ exitCode: 0 }, { exitCode: 0 }], plan: fixture(id).files['PLAN.md']?.replace('AC-NEW | Batch clamp returns a new ordered array without mutating its input | focused tests | OPEN', 'AC-NEW | Batch clamp returns a new ordered array without mutating its input | focused tests | VERIFIED'),
    fullCheckRuns: { before: { valid: true, count: 1, digest: 'seed-digest' }, after: { valid: true, count: 1, digest: 'seed-digest' } },
    planExists: id !== 'direct-copy', journalExists: false, sourceIntact: true, receiptIntact: true, headIntact: true, finalMessagePresent: true };
}
test('unit: fake trace preserves outcomes without persisting raw text or private paths', () => {
  const raw = fakeTrace('node scripts/check-copy.cjs') + '\n' + JSON.stringify({ type: 'item.completed', item: { type: 'reasoning', text: 'PRIVATE_THOUGHT C:\\Users\\private\\credential' } });
  const result = collect(raw), text = JSON.stringify(result);
  assert.equal(result.commands[0].kind, 'focused-verification');
  assert.equal(result.commands[0].exitCode, 0);
  assert.equal(result.completedTurns, 1);
  assert.ok(!text.includes('private') && !text.includes('PRIVATE_THOUGHT') && !text.includes('credential'));
});
test('unit: command mentions do not count as verification execution', () => {
  assert.equal(classifyCommand('echo node scripts/check-copy.cjs'), 'other');
  assert.equal(classifyCommand('Get-Content scripts/full-check.cjs'), 'file-inspection');
  assert.equal(classifyCommand('node .\\scripts\\check-copy.cjs'), 'focused-verification');
  assert.equal(classifyCommand('node --test test/clamp.test.cjs'), 'focused-verification');
  assert.equal(classifyCommand('npm test'), 'full-verification');
});
test('unit: literal PowerShell wrappers disclose only fixed invocation structure', () => {
  for (const command of [
    'powershell.exe -NoProfile -Command "node --test test/clamp.test.cjs"',
    'pwsh -NoLogo -NonInteractive -Command \'node --test .\\test\\clamp.test.cjs\'',
    '"C:\\Users\\private\\powershell.exe" -Command \'node --test test/clamp.test.cjs\'',
    '& \'C:\\Program Files\\PowerShell\\7\\pwsh.exe\' -NoProfile -Command \'node --test test/clamp.test.cjs\'',
    'powershell -Command "& \'C:\\Program Files\\node.exe\' --test \'test/clamp.test.cjs\'"'
  ]) {
    const result = invocation(command);
    assert.equal(result.kind, 'focused-verification');
    assert.ok(['powershell', 'pwsh'].includes(result.wrapper));
    assert.equal(result.executable, 'node');
    assert.deepEqual(result.fixtureArgv, ['--test', 'test/clamp.test.cjs']);
    const stored = JSON.stringify(collect(fakeTrace(command)));
    assert.ok(!stored.includes('private') && !stored.includes('Program Files') && !stored.includes('-Command'));
  }
  assert.equal(classifyCommand('powershell -Command "git diff -- copy.txt"'), 'git-inspection');
  assert.equal(classifyCommand('pwsh -Command "node scripts/full-check.cjs"'), 'full-verification');
});
test('unit: literal parser rejects expansion, compounds, nested wrappers and mere mentions', () => {
  for (const command of [
    'powershell -EncodedCommand bm9kZQ==',
    'powershell -Command "node --test test/clamp.test.cjs; npm test"',
    'powershell -Command "$x=1; node --test test/clamp.test.cjs"',
    'powershell -Command "node --test test/clamp.test.cjs | cat"',
    'powershell -Command "node --test test/clamp.test.cjs > output.txt"',
    'powershell -Command "echo node --test test/clamp.test.cjs"',
    'powershell -Command "cat test/clamp.test.cjs"',
    'powershell -Command \'pwsh -Command "node scripts/check-copy.cjs"\'',
    'powershell -UnknownFlag -Command "node scripts/check-copy.cjs"',
    'powershell -Command "node scripts/check-copy.cjs" extra',
    'echo git diff -- copy.txt',
    'node --test test/clamp.test.cjs && npm test',
    'node --test "test/clamp.test.cjs',
    'node -e "console.log(\'COPY_CHECK_PASS\')"'
  ]) assert.equal(classifyCommand(command), 'other', command);
});
test('unit: echoed inspection names or PASS markers cannot satisfy DIRECT verification', () => {
  for (const command of ['echo git diff -- copy.txt', 'echo "Get-Content copy.txt"', 'powershell -Command "echo Get-Content copy.txt"', 'echo COPY_CHECK_PASS']) {
    const row = observation(); row.trace = collect(fakeTrace(command));
    assert.equal(row.trace.commands[0].kind, 'other');
    assert.deepEqual(row.trace.commands[0].markers, ['COPY_CHECK_PASS']);
    assert.equal(grade('direct-copy', row).passed, false);
  }
});
test('unit: unsupported events and malformed traces remain visible', () => {
  const trace = collect('not JSON\n' + JSON.stringify({ type: 'future.event' }));
  assert.equal(trace.malformedLines, 1);
  assert.deepEqual(trace.unrecognizedEventTypes, ['future.event']);
  const row = observation(); row.trace = trace;
  assert.equal(grade('direct-copy', row).passed, false);
});
test('unit: unsupported valid JSON event or other tool cannot yield implicit PASS', () => {
  for (const event of [{ type: 'future.event' }, { type: 'item.completed', item: { type: 'mcp_tool_call', tool: 'unknown_action' } }]) {
    const row = observation(); row.trace = collect(fakeTrace() + '\n' + JSON.stringify(event));
    assert.equal(row.trace.malformedLines, 0);
    assert.equal(grade('direct-copy', row).passed, false);
  }
});
test('unit: wrapped and compound full checks fail using actual counter snapshots', () => {
  const root = path.join(os.tmpdir(), 'gde-regression-' + crypto.randomUUID());
  fs.mkdirSync(root);
  try {
    const marker = path.join(root, '.full-check-runs');
    for (const command of ['node -e "require(\'./scripts/full-check.cjs\')"', 'node scripts/check-copy.cjs; node scripts/full-check.cjs']) {
      fs.writeFileSync(marker, 'run\n');
      const before = fullCheckSnapshot(root);
      fs.appendFileSync(marker, 'run\n');
      const after = fullCheckSnapshot(root);
      assert.equal(classifyCommand(command), 'other');
      const row = observation(); row.trace.commands.push(collect(fakeTrace(command)).commands[0]); row.fullCheckRuns = { before, after };
      assert.equal(grade('direct-copy', row).passed, false);
      assert.equal(after.count, 2);
    }
    for (const content of ['', 'invented\n', 'run\nextra\n']) {
      fs.writeFileSync(marker, content);
      assert.equal(fullCheckSnapshot(root).valid, false);
    }
    fs.unlinkSync(marker);
    assert.equal(fullCheckSnapshot(root).valid, false);
  } finally { safeCleanup(root); }
});
test('unit: a repaired run still retains its first observed failure', () => {
  const failed = JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'node scripts/check-copy.cjs', exit_code: 1 } });
  const trace = collect(failed + '\n' + fakeTrace());
  assert.equal(trace.failedCommandCount, 1);
  assert.deepEqual(trace.firstFailedCommand, { index: 0, kind: 'focused-verification', exitCode: 1 });
  assert.equal(trace.additionalFocusedInvocations, 1);
});
test('unit: hand-authored positive examples exercise both fixture rubrics', () => {
  assert.equal(grade('direct-copy', observation()).passed, true);
  assert.equal(grade('standard-batch', observation('standard-batch')).passed, true);
});
test('unit: DIRECT may inspect its final change while independent acceptance still runs', () => {
  for (const command of ['git diff -- copy.txt', 'Get-Content copy.txt']) {
    const row = observation(); row.trace = collect(fakeTrace(command));
    assert.equal(grade('direct-copy', row).passed, true);
    row.independentChecks[0].exitCode = 1;
    assert.equal(grade('direct-copy', row).passed, false);
  }
});
test('unit: raw trace digest survives while raw trace is discarded', () => {
  const trace = collect(fakeTrace());
  assert.match(trace.rawTraceDigest, /^[a-f0-9]{64}$/);
  assert.equal(trace.rawTraceBytes, Buffer.byteLength(fakeTrace()));
  assert.notEqual(trace.rawTraceDigest, collect(fakeTrace() + '\n').rawTraceDigest);
});
test('unit: exec arguments avoid conflicting sandbox flags and preserve review/isolation', () => {
  const args = cliArgs({ model: 'gpt-6.1-sol', effort: 'high' }, 'fixture');
  assert.ok(args.includes('--approve-for-me'));
  assert.ok(!args.includes('--sandbox'));
  for (const flag of ['--json', '--ephemeral', '--ignore-user-config']) assert.ok(args.includes(flag));
  assert.ok(!args.includes('--ignore-rules'));
  assert.ok(!args.some(arg => arg.includes('dangerously')));
  assert.equal(args[args.indexOf('-m') + 1], 'gpt-6.1-sol');
  assert.equal(args[args.indexOf('-c') + 1], 'model_reasoning_effort="high"');
});
test('unit: per-case progress discloses only bounded outcome counts', () => {
  const summary = caseSummary({ id: 'direct-copy', observed: { process: { exitCode: 1 }, trace: { jsonEvents: 3, privateText: 'SECRET' } }, grading: { errors: ['private command text'] } });
  assert.deepEqual(summary, { case: 'direct-copy', exitCode: 1, events: 3, errorCount: 1 });
  assert.ok(!JSON.stringify(summary).includes('SECRET'));
});
for (const [label, mutate] of [
  ['bootstrap error', row => row.process.exitCode = 1],
  ['timeout', row => row.process.timedOut = true],
  ['truncated trace', row => row.process.overflow = true],
  ['absent final message', row => row.finalMessagePresent = false],
  ['protected Skill mutation', row => row.sourceIntact = false],
  ['evidence mutation', row => row.receiptIntact = false],
  ['HEAD change', row => row.headIntact = false],
  ['absent full-check counter', row => row.fullCheckRuns = undefined],
  ['full-check counter replacement', row => row.fullCheckRuns.after.digest = 'replacement-digest'],
  ['new journal', row => row.journalExists = true],
  ['new DIRECT PLAN', row => { row.planExists = true; row.changedFiles.push('PLAN.md'); }],
  ['unrelated file mutation', row => row.changedFiles.push('unrelated.txt')],
  ['test failure', row => row.independentChecks[0].exitCode = 1],
  ['missing independent check', row => row.independentChecks = []],
  ['missing implementation change', row => row.changedFiles = []],
  ['missing focused execution', row => row.trace.commands = []],
  ['unrelated full suite', row => row.trace.commands.push({ kind: 'full-verification', exitCode: 0 })],
  ['visible delegation', row => row.trace.agentToolEvents = 1],
  ['possible question', row => row.trace.questionMarks = 1]
]) test('unit: reject ' + label, () => { const row = observation(); mutate(row); assert.equal(grade('direct-copy', row).passed, false); });
test('unit: STANDARD ledger and decision cannot disappear', () => {
  for (const removed of ['AC-NEW', 'AC-OLD', 'D-1', 'evidence/baseline.json', 'Task Mode: STANDARD']) {
    const row = observation('standard-batch'); row.plan = row.plan.replaceAll(removed, 'REMOVED');
    assert.equal(grade('standard-batch', row).passed, false);
  }
});
test('unit: input digests are order independent and content sensitive', () => {
  assert.equal(digestFiles({ a: '1', b: '2' }), digestFiles({ b: '2', a: '1' }));
  assert.notEqual(digestFiles({ a: '1' }), digestFiles({ a: '2' }));
});
test('unit: model/effort/output must be explicit and scope cannot be broadened by flags', () => {
  assert.throws(() => parseArgs([]));
  const args = ['--source-ref', 'working-tree', '--model', 'gpt-6.1-sol', '--effort', 'high', '--output', 'result.json'];
  assert.equal(parseArgs(args).timeoutMs, 300000);
  assert.throws(() => parseArgs([...args, '--dangerously-bypass-approvals-and-sandbox', 'yes']));
  assert.throws(() => parseArgs([...args, '--timeout-ms', '999999']));
  assert.throws(() => safeCleanup(process.cwd()));
});
