'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createCollector, classifyFailure } = require('./runtime-observation-v2.cjs');
const options = { workspace: 'D:\\fixture', skillRoot: 'C:\\Users\\private-owner\\.agents\\skills\\goal-driven-engineering',
  metadata: { scenarioId: 'E1', runtimeVersion: '0.162.0', candidateIdentifier: '74ca37f', model: 'gpt-6.1-sol', reasoningEffort: 'high' } };
const collector = () => createCollector(options);
const finish = value => value.finish({ transportComplete: true, controlledToolsOnly: true });
const digest = 'a'.repeat(64);

test('malformed JSON and non-object events survive and preserve evidence gaps', () => {
  const c = collector();
  for (const value of [null, [], 42, true, {}, '{bad', 'null', '[]', { type: 1 }, { type: 'item.completed', item: null }]) c.accept(value);
  const result = finish(c);
  assert.equal(result.unknownEvents.length, 10);
  assert.ok(result.unknownEvents.every(entry => entry.unsupported.value === true));
  assert.ok(result.unknownEvents.every(entry => entry.affectedDomains.includes('reads')));
});

test('unknown event preserves safe type and no payload; passive events remain known', () => {
  const c = collector();
  c.accept({ method: 'future/newTool', params: { secret: 'DO_NOT_RETAIN' } });
  c.accept({ method: 'thread/tokenUsage/updated', params: { totals: {} } });
  const result = finish(c);
  assert.equal(result.unknownEvents.length, 1);
  assert.equal(result.unknownEvents[0].eventType.value, 'future/newTool');
  assert.ok(!JSON.stringify(result).includes('DO_NOT_RETAIN'));
});

test('native and CLI command events retain observed exits and hashed output only', () => {
  const c = collector();
  c.accept({ method: 'item/completed', params: { threadId: 'actor', turnId: 'turn-1',
    item: { type: 'commandExecution', id: 'cmd-1', command: 'echo private-body', status: 'completed', exitCode: 2, aggregatedOutput: 'private-output' } } });
  c.accept(JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', id: 'cmd-2', command: 'echo anything', status: 'failed', exit_code: -1 } }));
  const result = finish(c);
  assert.equal(result.commands[0].exitCode.value, 2);
  assert.equal(result.commands[0].failureCategory.value, 'PROCESS_EXIT_NONZERO');
  assert.equal(result.commands[0].threadId.value, 'actor');
  assert.equal(result.commands[1].failureCategory.value, 'UNKNOWN');
  assert.ok(!JSON.stringify(result).includes('private-output'));
  assert.ok(!JSON.stringify(result).includes('private-body'));
});

test('stable structured codes classify, exit -1 and prose explanations remain UNKNOWN', () => {
  for (const [code, category] of Object.entries({ ENOENT: 'PROCESS_START_FAILED', SANDBOX_DENIED: 'SANDBOX_DENIED',
    TOOL_TIMEOUT: 'TOOL_TIMEOUT', EPIPE: 'TRANSPORT_ERROR', HOST_WRAPPER_ERROR: 'HOST_WRAPPER_ERROR' })) {
    assert.equal(classifyFailure(-1, code), category);
  }
  assert.equal(classifyFailure(-1, undefined), 'UNKNOWN');
  assert.equal(classifyFailure(0, undefined), 'UNKNOWN');
  const c = collector();
  c.accept({ type: 'item.completed', item: { type: 'command_execution', status: 'failed', exit_code: -1,
    aggregated_output: 'sandbox permission denied, timeout, process launch failure' } });
  c.accept({ type: 'item.completed', item: { type: 'agent_message', text: 'It was definitely SANDBOX_DENIED.' } });
  c.accept({ type: 'error', error: { code: 'EPIPE', message: 'private stderr' } });
  const result = finish(c);
  assert.equal(result.commands[0].failureCategory.value, 'UNKNOWN');
  assert.equal(result.events.find(entry => entry.category.value === 'error').failureCategory.value, 'TRANSPORT_ERROR');
});

test('PLAN review PASSED and collab waits never become reviewer execution verdict', () => {
  const c = collector();
  c.accept({ type: 'item.completed', item: { type: 'agent_message', text: 'STANDARD PLAN says review PASSED with zero findings.' } });
  for (let i = 0; i < 2; i++) c.accept({ method: 'item/completed', params: { threadId: 'actor',
    item: { type: 'collabAgentToolCall', id: 'wait-' + i, tool: 'wait', senderThreadId: 'actor', receiverThreadIds: ['reviewer-1'], status: 'completed' } } });
  c.accept({ method: 'item/completed', params: { threadId: 'reviewer-1', item: { type: 'exitedReviewMode', id: 'review-1', review: 'PASS. No issues found.' } } });
  const result = finish(c);
  assert.equal(result.agents.length, 2);
  assert.deepEqual(result.agents[0].receiverThreadIds.value, ['reviewer-1']);
  assert.equal(result.reviewers.length, 1);
  assert.equal(result.reviewers[0].completed.value, true);
  assert.equal(result.reviewers[0].verdict.value, 'UNKNOWN');
  assert.equal(result.reviewers[0].findings.value, 'UNKNOWN');
  assert.equal(result.reviewers[0].role.value, 'UNKNOWN');
  assert.equal(result.declarations[0].modeMentions.source, 'DECLARED');
});

test('trusted reviewer thread captures observations separately from reviewer judgment', () => {
  const c = collector();
  c.record({ kind: 'review', requestId: 'request-1', actorThreadId: 'actor', reviewThreadId: 'reviewer-1', role: 'reviewer',
    roleOrigin: 'HARNESS_CONFIG', readOnly: true, baseline: '74ca37f', diffDigest: digest, completed: true,
    resultCaptured: true, resultDigest: digest, resultPayloadDigest: digest, verdict: 'PASS', findings: [] });
  const entry = finish(c).reviewers[0];
  assert.equal(entry.differentThread.value, true);
  assert.equal(entry.readOnly.source, 'OBSERVED');
  assert.equal(entry.verdict.source, 'DECLARED');
  assert.equal(entry.role.source, 'DECLARED');
  assert.equal(entry.nativeRole.value, 'UNKNOWN');
  assert.deepEqual(entry.findings.value, { BLOCKER: 0, MAJOR: 0, MINOR: 0, INFO: 0 });
});

test('failed trusted read is an attempted read and successful receipt is actual load', () => {
  const c = collector();
  c.record({ kind: 'read', path: options.skillRoot + '\\SKILL.md', success: false, operation: 'READ', threadId: 'actor' });
  c.record({ kind: 'read', path: options.skillRoot + '\\references\\standard-state.md', success: true, contentDigest: digest, bytes: 1024, threadId: 'actor' });
  const result = finish(c);
  assert.equal(result.reads[0].success.value, false);
  assert.equal(result.reads[1].path.value, 'skill/references/standard-state.md');
  assert.equal(result.reads[1].success.source, 'OBSERVED');
});

test('structured commandActions are read attempts, not successful loads', () => {
  const c = collector();
  c.accept({ method: 'item/completed', params: { item: { id: 'cmd-1', type: 'commandExecution', status: 'completed', exitCode: 0,
    commandActions: [{ type: 'read', path: 'D:\\fixture\\PLAN.md' }] } } });
  const result = finish(c);
  assert.equal(result.commands[0].actions[0].operation.value, 'READ');
  assert.equal(result.commands[0].actions[0].success.value, 'UNKNOWN');
  assert.equal(result.reads.length, 0);
});

test('double backslashes and Windows root casing normalize only inferred candidates', () => {
  const c = collector();
  c.accept({ type: 'item.completed', item: { type: 'command_execution', id: 'cmd-1', status: 'completed', exit_code: 0,
    command: 'echo "c:\\\\USERS\\\\private-owner\\\\.agents\\\\skills\\\\goal-driven-engineering\\\\references\\\\standard-state.md"' } });
  const result = finish(c);
  const candidate = result.commands[0].inferredCandidatePaths[0];
  assert.equal(candidate.path.value, 'skill/references/standard-state.md');
  assert.equal(candidate.path.source, 'INFERRED');
  assert.equal(candidate.success.value, 'UNKNOWN');
  assert.equal(result.reads.length, 0);
});

test('private paths, secrets, raw reasoning and unrelated metadata do not persist', () => {
  const c = createCollector({ ...options, metadata: { ...options.metadata, privateConfig: 'DO_NOT_RETAIN' } });
  c.accept({ method: 'item/completed', params: { item: { type: 'reasoning', text: 'DO_NOT_RETAIN private reasoning' } } });
  c.accept({ method: 'item/reasoning/textDelta', params: { delta: 'DO_NOT_RETAIN' } });
  c.accept({ method: 'item/completed', params: { item: { type: 'agentMessage', text: 'sk-privateCredential' } } });
  c.record({ kind: 'read', path: 'C:\\private\\credential.txt', success: false });
  c.record({ kind: 'check', commandId: 'cmd-1', argv: ['node', '-e', 'console.log("sk-privateCredential")'], exitCode: 1, outputDigest: digest });
  const result = finish(c), serialized = JSON.stringify(result);
  assert.equal(result.reads[0].path.value, 'UNKNOWN');
  assert.equal(result.commands[0].argv.value, 'UNKNOWN');
  assert.ok(!serialized.includes('DO_NOT_RETAIN'));
  assert.ok(!serialized.includes('private-owner'));
  assert.ok(!serialized.includes('credential.txt'));
  assert.ok(!serialized.includes('sk-privateCredential'));
});

test('path containment, writes, file snapshots and registered checks stay bounded', () => {
  const c = collector();
  c.record({ kind: 'read', path: '../outside.txt', success: false });
  c.record({ kind: 'write', path: 'src/clamp.cjs', success: true, contentDigest: digest, bytes: 100 });
  c.record({ kind: 'files', created: ['PLAN.md'], modified: ['src/clamp.cjs'], deleted: [], protected: ['unrelated.txt'], intact: true });
  c.record({ kind: 'check', commandId: 'check-1', argv: ['node', '--test', 'test/clamp.test.cjs'], exitCode: 0, outputDigest: digest });
  const result = finish(c);
  assert.equal(result.reads[0].path.value, 'UNKNOWN');
  assert.equal(result.writes[0].path.value, 'src/clamp.cjs');
  assert.deepEqual(result.files[0].created.value, ['PLAN.md']);
  assert.deepEqual(result.commands[0].argv.value, ['node', '--test', 'test/clamp.test.cjs']);
});

test('completeness is explicit, never inferred from exit zero; snapshots are detached', () => {
  const c = collector();
  c.accept({ type: 'turn.completed' });
  c.accept({ type: 'item.completed', item: { type: 'command_execution', status: 'completed', exit_code: 0 } });
  const result = c.finish();
  assert.equal(result.completeness.transportComplete.value, 'UNKNOWN');
  assert.equal(result.completeness.controlledToolsOnly.value, false);
  result.commands.length = 0;
  assert.equal(c.finish().commands.length, 1);
});

test('malformed receipts and malformed typed reviewer fields remain explicit UNKNOWN', () => {
  const c = collector();
  c.record(null);
  c.record({ kind: 'futureReceipt', payload: 'DO_NOT_RETAIN' });
  c.record({ kind: 'review', completed: 'yes', readOnly: 'true', verdict: 'PASSED', findings: [{ severity: 'invented', message: 'DO_NOT_RETAIN' }] });
  c.record({ kind: 'interaction', category: 'question', count: 2 });
  const result = finish(c);
  assert.equal(result.unknownEvents.length, 2);
  assert.equal(result.reviewers[0].completed.value, 'UNKNOWN');
  assert.equal(result.reviewers[0].verdict.value, 'UNKNOWN');
  assert.equal(result.reviewers[0].findings.value, 'UNKNOWN');
  assert.equal(result.interactions[0].count.value, 2);
  assert.ok(!JSON.stringify(result).includes('DO_NOT_RETAIN'));
});

test('started/completed notifications share one command attempt and final observed result', () => {
  const c = collector();
  c.accept({ method: 'item/started', params: { threadId: 'actor', item: { type: 'commandExecution', id: 'cmd-1', status: 'inProgress' } } });
  c.accept({ method: 'item/completed', params: { threadId: 'actor', item: { type: 'commandExecution', id: 'cmd-1', status: 'completed', exitCode: 0 } } });
  const result = finish(c);
  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].attempt, 1);
  assert.equal(result.commands[0].status.value, 'completed');
  assert.equal(result.events.length, 2);
});

test('UNC roots remain contained and case insensitive without retaining server path', () => {
  const c = createCollector({ workspace: '\\\\SERVER\\share\\fixture', skillRoot: options.skillRoot });
  c.record({ kind: 'read', path: '\\\\server\\SHARE\\fixture\\PLAN.md', success: true, contentDigest: digest });
  c.record({ kind: 'read', path: '\\\\server\\share\\fixture-other\\PLAN.md', success: false });
  const result = finish(c);
  assert.equal(result.reads[0].path.value, 'PLAN.md');
  assert.equal(result.reads[1].path.value, 'UNKNOWN');
  assert.ok(!JSON.stringify(result).includes('SERVER'));
});

test('registered safe host failure permits only the exact E5 nonzero fixture expression', () => {
  const c = collector();
  c.record({ kind: 'check', commandId: 'E5', argv: ['node', '-e', 'process.exit(17)'], exitCode: 17, outputDigest: digest });
  c.record({ kind: 'check', commandId: 'unknown-eval', argv: ['node', '-e', 'process.exit(18)'], exitCode: 18, outputDigest: digest });
  const result = finish(c);
  assert.deepEqual(result.commands[0].argv.value, ['node', '-e', 'process.exit(17)']);
  assert.equal(result.commands[0].failureCategory.value, 'PROCESS_EXIT_NONZERO');
  assert.equal(result.commands[1].argv.value, 'UNKNOWN');
});

test('registered dynamic tools and requests are known invocations, never successful reads', () => {
  const names = ['gde_read', 'gde_write', 'gde_check'];
  const c = createCollector({ ...options, registeredToolNames: names });
  names.push('later_unregistered');
  c.accept({ method: 'item/tool/call', params: { threadId: 'actor', callId: 'call-1', tool: 'gde_read',
    arguments: { path: 'skill/SKILL.md', secret: 'DO_NOT_RETAIN' } } });
  c.accept({ method: 'item/completed', params: { threadId: 'actor', item: { type: 'dynamicToolCall', tool: 'gde_read',
    status: 'completed', success: true, arguments: { path: 'skill/SKILL.md' } } } });
  let result = finish(c);
  assert.equal(result.unknownEvents.length, 0);
  assert.equal(result.reads.length, 0);
  assert.ok(result.events.some(entry => entry.tool?.value === 'gde_read'));
  assert.ok(!JSON.stringify(result).includes('DO_NOT_RETAIN'));
  c.record({ kind: 'read', path: options.skillRoot + '\\SKILL.md', success: true, contentDigest: digest, bytes: 100, threadId: 'actor' });
  result = finish(c);
  assert.equal(result.reads.length, 1);
  assert.equal(result.reads[0].success.value, true);
  c.accept({ method: 'item/tool/call', params: { tool: 'later_unregistered' } });
  assert.equal(finish(c).unknownEvents.length, 1);
});

test('unregistered MCP/dynamic tools and unsafe injected tool names stay unsupported', () => {
  const c = createCollector({ ...options, registeredToolNames: ['gde_read', 'private_secret', 'gde_read; process.exit(0)'] });
  for (const item of [
    { type: 'dynamicToolCall', tool: 'future_reader', success: true },
    { type: 'mcpToolCall', tool: 'gde_read', success: true },
    { type: 'dynamicToolCall', tool: 'private_secret', success: true },
    { type: 'dynamicToolCall', tool: 'gde_read; process.exit(0)', success: true }
  ]) c.accept({ method: 'item/completed', params: { item } });
  const result = finish(c);
  assert.equal(result.unknownEvents.length, 4);
  assert.equal(result.reads.length, 0);
  assert.ok(result.unknownEvents.every(entry => entry.affectedDomains.includes('reads')));
  assert.ok(!JSON.stringify(result).includes('private_secret'));
  assert.ok(!JSON.stringify(result).includes('process.exit(0)'));
});

test('known passive lifecycle events do not imply tool or transport completeness', () => {
  const c = collector();
  for (const method of ['serverRequest/resolved', 'thread/modelSettings/updated', 'account/updated', 'mcpServer/startupStatus/updated']) {
    c.accept({ method, params: { privateConfig: 'DO_NOT_RETAIN' } });
  }
  const result = c.finish();
  assert.equal(result.unknownEvents.length, 0);
  assert.equal(result.completeness.transportComplete.value, 'UNKNOWN');
  assert.equal(result.completeness.controlledToolsOnly.value, false);
  assert.ok(!JSON.stringify(result).includes('DO_NOT_RETAIN'));
});

test('finish records explicit safe end disposition without inferring completion', () => {
  const c = collector();
  const result = c.finish({ endDisposition: 'failed', transportComplete: false });
  assert.equal(result.metadata.endDisposition.value, 'failed');
  assert.equal(result.metadata.endDisposition.source, 'OBSERVED');
  assert.equal(result.completeness.transportComplete.value, false);
  assert.equal(c.finish({ endDisposition: 'private secret path' }).metadata.endDisposition.value, 'UNKNOWN');
});

test('opaque host I/O is retained and blocks controlled read-negative evidence', () => {
  const c = collector();
  for (const type of ['fileChange', 'file_change', 'webSearch', 'imageView']) c.accept({ method: 'item/completed', params: {
    item: { type, status: 'completed', rawOutput: 'DO_NOT_RETAIN', path: 'C:/private/config.toml' }
  } });
  const result = finish(c);
  assert.equal(result.unknownEvents.length, 4);
  assert.equal(result.events.filter(entry => entry.category.value === 'opaque').length, 4);
  assert.ok(result.unknownEvents.every(entry => entry.affectedDomains.includes('reads')));
  assert.ok(result.events.some(entry => entry.eventType.value === 'item:fileChange'));
  assert.equal(result.reads.length, 0);
  assert.ok(!JSON.stringify(result).includes('DO_NOT_RETAIN'));
  assert.ok(!JSON.stringify(result).includes('config.toml'));
});

test('independent acceptance only registers its exact protected script argv', () => {
  const c = collector();
  c.record({ kind: 'check', commandId: 'acceptance', threadId: 'harness', argv: ['node', 'scripts/acceptance.cjs'], exitCode: 0, outputDigest: digest });
  c.record({ kind: 'check', commandId: 'unregistered', threadId: 'harness', argv: ['node', 'scripts/other-acceptance.cjs'], exitCode: 0, outputDigest: digest });
  const result = finish(c);
  assert.deepEqual(result.commands[0].argv.value, ['node', 'scripts/acceptance.cjs']);
  assert.equal(result.commands[1].argv.value, 'UNKNOWN');
});
