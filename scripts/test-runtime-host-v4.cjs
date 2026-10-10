'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { EventEmitter } = require('node:events');
const { PassThrough, Writable } = require('node:stream');
const { RuntimeHost, sessionOverrides } = require('./runtime-host-v4.cjs');

// Synthetic transport only: no real Codex process, auth, config or inference.
function setup(t, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-host-unit-'));
  fs.mkdirSync(path.join(root, '.git')); fs.mkdirSync(path.join(root, 'state'));
  t.after(() => { const absolute = fs.realpathSync(root); assert.equal(path.dirname(absolute), fs.realpathSync(os.tmpdir())); assert.ok(path.basename(absolute).startsWith('runtime-host-unit-')); fs.rmSync(absolute, { recursive: true }); });
  const child = new EventEmitter(); child.pid = 424242; child.exitCode = null;
  child.stdout = new PassThrough(); child.stderr = new PassThrough();
  const sent = [], events = [], killed = [], spawnCalls = [], expectedShutdownErrors = new Set();
  child.stdin = new Writable({ write(chunk, encoding, callback) {
    const value = JSON.parse(chunk.toString()); sent.push(value);
    if (value.method === 'initialize') queueMicrotask(() => child.stdout.write(JSON.stringify({ id: value.id, result: { userAgent: 'synthetic' } }) + '\n'));
    callback();
  } });
  const options = { workspace: root, stateDir: path.join(root, 'state'), timeoutMs: 5000,
    spawn(binary, args, spawnOptions) { spawnCalls.push({ binary, args }); assert.equal(spawnOptions.shell, false); assert.equal(spawnOptions.windowsHide, true); assert.equal(spawnOptions.env.RUST_LOG, 'off'); assert.equal(args.includes('--ignore-user-config'), extra.ignoreUserConfig ?? false); assert.ok(!args.some(value => value.includes('log_dir'))); return child; },
    kill(pid) { killed.push(pid); queueMicrotask(() => { child.exitCode = 0; child.emit('close', 0); }); return { status: 0 }; }, onEvent(value) { events.push(value); }, ...extra };
  const host = new RuntimeHost(options); t.after(async () => { try { await host.shutdown(); } catch (error) { if (error.code !== host.error?.code && !expectedShutdownErrors.has(error.code)) throw error; } });
  function emit(value) { child.stdout.write(JSON.stringify(value) + '\n'); }
  return { host, options, root, child, sent, events, killed, spawnCalls, emit, expectedShutdownErrors };
}
test('unit: process overrides quote trust path and preserve agent availability', t => {
  const s = setup(t); const values = sessionOverrides(s.root, s.options.stateDir, { model: 'm"x', effort: 'high' });
  assert.equal(values[0], `projects.${JSON.stringify(fs.realpathSync(s.root))}.trust_level="trusted"`);
  assert.ok(values.includes('model="m\\"x"')); assert.ok(values.includes('agents.enabled=true'));
  assert.ok(values.includes('features.shell_tool=false')); assert.ok(values.includes('features.js_repl=false'));
  assert.throws(() => sessionOverrides(s.root, s.options.stateDir, { model: 'x\n-c danger' }), /HOST_INVALID_OPTION/);
});
test('unit: current host defaults to guarded config loading; legacy ignore flag requires explicit boolean', async t => {
  const current = setup(t); await current.host.start();
  assert.ok(!current.spawnCalls[0].args.includes('--ignore-user-config'));
  assert.deepEqual(current.host.configIsolation, { ignoreUserConfig: false, userConfigLoading: 'ENABLED', protectedFileGuardRequired: true, overrides: 'PROCESS_ONLY' });
  const explicit = setup(t, { ignoreUserConfig: false }); await explicit.host.start(); assert.ok(!explicit.spawnCalls[0].args.includes('--ignore-user-config'));
  const legacy = setup(t, { ignoreUserConfig: true }); await legacy.host.start();
  assert.equal(legacy.spawnCalls[0].args[0], '--ignore-user-config'); assert.equal(legacy.host.configIsolation.userConfigLoading, 'IGNORED');
  assert.throws(() => new RuntimeHost({ ignoreUserConfig: 'true' }), /HOST_INVALID_OPTION/);
});
test('unit: handshake, RPC pairing and structured final message remain only in memory', async t => {
  const s = setup(t); await s.host.start(); assert.equal(s.sent[1].method, 'initialized');
  const call = s.host.call('thread/start', { ephemeral: true }); const request = s.sent.at(-1);
  s.emit({ id: request.id, result: { thread: { id: 't1' } } }); assert.equal((await call).thread.id, 't1');
  const turn = s.host.waitTurn('t1', 'v1');
  s.emit({ method: 'item/completed', params: { threadId: 't1', turnId: 'v1', item: { type: 'agentMessage', id: 'm1', phase: 'commentary', text: 'interim' } } });
  s.emit({ method: 'item/completed', params: { threadId: 't1', turnId: 'v1', item: { type: 'agentMessage', id: 'm2', phase: 'final_answer', text: '{"verdict":"NOT PROVEN"}' } } });
  s.emit({ method: 'turn/completed', params: { threadId: 't1', turn: { id: 'v1', status: 'completed' } } });
  assert.equal((await turn).finalText, '{"verdict":"NOT PROVEN"}');
  assert.equal((await s.host.waitTurn('t1', 'v1')).status, 'completed');
});
test('unit: reasoning and private stderr are withheld and malformed input is fail closed', async t => {
  const s = setup(t); await s.host.start();
  s.emit({ method: 'item/completed', params: { item: { type: 'reasoning', text: 'SECRET_REASONING' } } });
  s.emit({ method: 'item/reasoning/textDelta', params: { delta: 'SECRET_REASONING' } });
  s.child.stderr.write('SECRET_AUTH_PATH');
  assert.ok(!JSON.stringify(s.events).includes('SECRET'));
  const pending = s.host.call('thread/read', {}); s.child.stdout.write('not-json PRIVATE\n');
  await assert.rejects(pending, /HOST_MALFORMED_TRANSPORT/); assert.deepEqual(s.killed, [424242]);
});
test('unit: unknown requests and approval prompts are explicitly denied', async t => {
  let handled = 0; const s = setup(t, { onRequest() { handled++; return { success: true, contentItems: [] }; } }); await s.host.start();
  s.emit({ id: 'x', method: 'item/commandExecution/requestApproval', params: { command: 'private' } });
  assert.equal(handled, 0); assert.equal(s.sent.at(-1).error.code, -32601); assert.equal(s.events.at(-1).method, 'host/requestDenied');
  s.emit({ id: 'y', method: 'item/tool/call', params: { tool: 'read_public', arguments: {} } });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(handled, 1); assert.equal(s.sent.at(-1).result.success, true);
});
test('unit: duplicate server request ids and unmatched responses fail closed', async t => {
  const s = setup(t); await s.host.start(); const pending = s.host.waitTurn('t');
  s.emit({ id: 'same', method: 'unknown', params: {} }); s.emit({ id: 'same', method: 'unknown', params: {} });
  await assert.rejects(pending, /HOST_DUPLICATE_REQUEST/);
  const b = setup(t); await b.host.start(); const call = b.host.call('thread/read', {}); b.emit({ id: 99, result: {} });
  await assert.rejects(call, /HOST_UNMATCHED_RESPONSE/);
});
test('unit: RPC error retains stable code without source payload', async t => {
  const s = setup(t); await s.host.start(); const call = s.host.call('thread/read', {});
  s.emit({ id: s.sent.at(-1).id, error: { code: -32001, message: 'secret private path', data: 'secret' } });
  await assert.rejects(call, error => error.code === 'HOST_RPC_-32001' && !JSON.stringify(error).includes('secret'));
});
test('unit: transport overflow, timeout, premature exit and close terminate only owned PID', async t => {
  const s = setup(t, { maxBytes: 1000 }); await s.host.start(); const pending = s.host.waitTurn('t'); s.child.stderr.write('x'.repeat(1001));
  await assert.rejects(pending, /HOST_TRANSPORT_OVERFLOW/); s.host.close(); assert.deepEqual(s.killed, [424242]);
  const b = setup(t, { timeoutMs: 20 }); await b.host.start(); await assert.rejects(b.host.waitTurn('t'), /HOST_TIMEOUT/);
  const c = setup(t); await c.host.start(); const p = c.host.waitTurn('t'); c.child.exitCode = 1; c.child.emit('close', 1); await assert.rejects(p, /HOST_PROCESS_EXITED/); assert.deepEqual(c.killed, []);
});
test('unit: null, array and missing params transports are rejected', async t => {
  for (const value of [null, [], { method: 'bad' }]) {
    const s = setup(t); await s.host.start(); const pending = s.host.waitTurn('t'); s.emit(value); await assert.rejects(pending, /HOST_MALFORMED_TRANSPORT/);
  }
});
test('unit: callback failure is stable and does not expose handler exception', async t => {
  const s = setup(t, { onEvent() { throw new Error('SECRET'); } }); await s.host.start();
  const pending = s.host.waitTurn('t'); s.emit({ method: 'thread/started', params: {} }); await assert.rejects(pending, /HOST_EVENT_HANDLER_FAILED/);
});
test('unit: synchronous launch and filesystem errors are stable without private paths', async t => {
  const s = setup(t, { spawn() { throw new Error('SECRET_PATH'); } });
  await assert.rejects(s.host.start(), error => error.code === 'HOST_LAUNCH_FAILED' && !error.message.includes('SECRET'));
  assert.throws(() => sessionOverrides(path.join(s.root, 'private-missing'), s.options.stateDir), /HOST_INVALID_DIRECTORY/);
});
test('unit: invalid dynamic tool result and rejected handler produce explicit error', async t => {
  for (const onRequest of [() => undefined, () => { throw new Error('SECRET'); }]) {
    const s = setup(t, { onRequest }); await s.host.start();
    s.emit({ id: 'x', method: 'item/tool/call', params: { tool: 'read', arguments: {} } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(s.sent.at(-1).error.message, 'HOST_TOOL_FAILED'); assert.ok(!JSON.stringify(s.sent).includes('SECRET'));
  }
});
test('unit: fragmented UTF8 transport is reconstructed without losing public text', async t => {
  const s = setup(t); await s.host.start(); const pending = s.host.waitTurn('t');
  const bytes = Buffer.from(JSON.stringify({ method: 'item/completed', params: { threadId: 't', turnId: 'v', item: { id: 'm', type: 'agentMessage', phase: 'final_answer', text: '证据' } } }) + '\n');
  for (const byte of bytes) s.child.stdout.write(Buffer.from([byte]));
  s.emit({ method: 'turn/completed', params: { threadId: 't', turn: { id: 'v', status: 'completed' } } });
  assert.equal((await pending).finalText, '证据');
});
test('unit: shutdown waits for actual owned process close rather than kill return', async t => {
  let s; s = setup(t, { kill(pid) { s.killed.push(pid); return { status: 0 }; } }); await s.host.start();
  let completed = false; const barrier = s.host.shutdown().then(value => { completed = true; return value; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(completed, false);
  s.child.exitCode = 0; s.child.emit('close', 0);
  assert.deepEqual(await barrier, { processClosed: true, requestsDrained: true }); assert.deepEqual(s.killed, [424242]);
});
test('unit: shutdown cancels queued handlers before any operation starts', async t => {
  let calls = 0; const s = setup(t, { onRequest() { calls++; return { success: true, contentItems: [] }; } }); await s.host.start();
  s.emit({ id: 'q', method: 'item/tool/call', params: { tool: 'write' } });
  const result = await s.host.shutdown(); assert.equal(calls, 0); assert.equal(result.requestsDrained, true);
});
test('unit: shutdown signals active handlers and waits for their cancellation drain', async t => {
  let release, sawAbort = false, started = false;
  const s = setup(t, { onRequest(event, { signal }) {
    started = true;
    return new Promise(resolve => { release = () => resolve({ success: false, contentItems: [] }); signal.addEventListener('abort', () => { sawAbort = true; }); });
  } }); await s.host.start(); s.emit({ id: 'q', method: 'item/tool/call', params: { tool: 'write' } });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(started, true);
  let done = false; const barrier = s.host.shutdown().then(value => { done = true; return value; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(sawAbort, true); assert.equal(done, false);
  release(); assert.equal((await barrier).requestsDrained, true);
});
test('unit: completion callback failure rejects turn before resolving success', async t => {
  const s = setup(t, { onEvent(event) { if (event.method === 'turn/completed') throw new Error('SECRET'); } }); await s.host.start();
  const turn = s.host.waitTurn('t', 'v');
  s.emit({ method: 'turn/completed', params: { threadId: 't', turn: { id: 'v', status: 'completed' } } });
  await assert.rejects(turn, /HOST_EVENT_HANDLER_FAILED/); assert.equal(s.host.turns.size, 0);
  await assert.rejects(s.host.shutdown(), /HOST_EVENT_HANDLER_FAILED/); assert.equal(s.host.processCloseObserved, true);
});
test('unit: missing process close and nonzero termination result never report safe shutdown', async t => {
  let s; s = setup(t, { shutdownTimeoutMs: 20, kill(pid) { s.killed.push(pid); return { status: 9 }; } }); await s.host.start();
  s.expectedShutdownErrors.add('HOST_SHUTDOWN_TIMEOUT');
  await assert.rejects(s.host.shutdown(), /HOST_SHUTDOWN_TIMEOUT/);
  // Finish synthetic process so no real or mock operation leaks beyond test.
  s.child.exitCode = 0; s.child.emit('close', 0);
  const b = setup(t, { kill() { queueMicrotask(() => { b.child.exitCode = 0; b.child.emit('close', 0); }); return { status: 9 }; } }); await b.host.start();
  b.expectedShutdownErrors.add('HOST_PROCESS_TERMINATION_FAILED');
  await assert.rejects(b.host.shutdown(), /HOST_PROCESS_TERMINATION_FAILED/);
});
