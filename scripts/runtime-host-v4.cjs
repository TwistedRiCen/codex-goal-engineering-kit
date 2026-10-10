'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { StringDecoder } = require('node:string_decoder');

function failure(code) { const error = new Error(code); error.code = code; return error; }
function tomlString(value) {
  if (typeof value !== 'string' || /[\x00-\x1f\x7f]/.test(value)) throw failure('HOST_INVALID_OPTION');
  return JSON.stringify(value);
}
function sessionOverrides(workspace, stateDir, options = {}) {
  let root, state;
  try {
    root = fs.realpathSync(workspace); state = fs.realpathSync(stateDir);
    if (!fs.statSync(root).isDirectory() || !fs.statSync(state).isDirectory()) throw failure('HOST_INVALID_DIRECTORY');
    if (!fs.existsSync(path.join(root, '.git'))) throw failure('HOST_WORKSPACE_NOT_GIT_ROOT');
  } catch (error) { throw failure(error.code?.startsWith('HOST_') ? error.code : 'HOST_INVALID_DIRECTORY'); }
  return [
    `projects.${tomlString(root)}.trust_level="trusted"`,
    `model=${tomlString(options.model || 'gpt-6.1-sol')}`,
    `model_reasoning_effort=${tomlString(options.effort || 'high')}`,
    `sqlite_home=${tomlString(state)}`, 'history.persistence="none"',
    'features.shell_snapshot=false', 'features.shell_tool=false',
    'agents.enabled=true', 'features.js_repl=false'
  ];
}

// Supported v2 JSON-RPC only. This adapter does not persist raw transport or
// reasoning. The native host has separate logging; adapter redaction does not
// prove native privacy. The v4 runner blocks model turns until that is proven.
// Root wraps the whole process lifetime with Invoke-WithRuntimeConfigGuard.
class RuntimeHost {
  constructor(options) {
    this.options = options;
    this.ignoreUserConfig = options.ignoreUserConfig ?? false;
    if (typeof this.ignoreUserConfig !== 'boolean') throw failure('HOST_INVALID_OPTION');
    // Current app-server loads the existing configuration. Process overrides
    // do not prevent writes: the external PS read locks remain mandatory.
    this.configIsolation = Object.freeze({ ignoreUserConfig: this.ignoreUserConfig,
      userConfigLoading: this.ignoreUserConfig ? 'IGNORED' : 'ENABLED',
      protectedFileGuardRequired: true, overrides: 'PROCESS_ONLY' });
    this.timeoutMs = options.timeoutMs ?? 600000;
    this.maxBytes = options.maxBytes ?? 32 * 1024 * 1024;
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? 10000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 600000 || !Number.isInteger(this.maxBytes) || this.maxBytes < 1 || !Number.isInteger(this.shutdownTimeoutMs) || this.shutdownTimeoutMs < 1 || this.shutdownTimeoutMs > 60000) throw failure('HOST_INVALID_LIMIT');
    this.pending = new Map(); this.waiters = new Map(); this.turns = new Map(); this.messages = new Map();
    this.nextId = 1; this.bytes = 0; this.buffer = ''; this.decoder = new StringDecoder('utf8');
    this.closed = false; this.started = false; this.seenRequests = new Set();
    this.requests = new Set(); this.requestAbort = new AbortController();
  }
  async start() {
    if (this.started || this.closed) throw failure('HOST_ALREADY_STARTED');
    this.started = true;
    // Only callers that verified this legacy capability may request the flag.
    const args = this.ignoreUserConfig ? ['--ignore-user-config'] : [];
    for (const value of sessionOverrides(this.options.workspace, this.options.stateDir, this.options)) args.push('-c', value);
    args.push('app-server', '--listen', 'stdio://');
    try {
      this.child = (this.options.spawn || spawn)(this.options.binary || 'codex', args, { cwd: fs.realpathSync(this.options.workspace), env: { ...process.env, RUST_LOG: 'off' }, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch { this.fail('HOST_LAUNCH_FAILED'); throw this.error; }
    this.child.on('error', () => this.fail('HOST_LAUNCH_FAILED'));
    this.processClosed = new Promise(resolve => { this.resolveProcessClosed = resolve; });
    this.child.on('close', () => {
      this.processCloseObserved = true; this.resolveProcessClosed();
      if (!this.closed) this.fail('HOST_PROCESS_EXITED');
    });
    this.child.stdin.on('error', () => this.fail('HOST_WRITE_FAILED'));
    this.child.stdout.on('data', chunk => this.receive(chunk));
    this.child.stderr.on('data', chunk => { this.bytes += Buffer.byteLength(chunk); if (this.bytes > this.maxBytes) this.fail('HOST_TRANSPORT_OVERFLOW'); });
    this.timer = setTimeout(() => this.fail('HOST_TIMEOUT'), this.timeoutMs);
    const result = await this.call('initialize', { clientInfo: { name: 'runtime-evidence-v4', version: '4.0' }, capabilities: { experimentalApi: true } });
    this.send({ method: 'initialized', params: {} });
    return result;
  }
  send(value) {
    if (this.closed || !this.child) throw this.error || failure('HOST_CLOSED');
    try { this.child.stdin.write(JSON.stringify(value) + '\n'); } catch { this.fail('HOST_WRITE_FAILED'); throw this.error; }
  }
  call(method, params = {}) {
    if (this.closed || !this.child) return Promise.reject(this.error || failure('HOST_CLOSED'));
    if (typeof method !== 'string' || !params || typeof params !== 'object' || Array.isArray(params)) return Promise.reject(failure('HOST_INVALID_REQUEST'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); try { this.send({ id, method, params }); } catch (error) { this.pending.delete(id); reject(error); } });
  }
  receive(chunk) {
    if (this.closed) return;
    this.bytes += Buffer.byteLength(chunk);
    if (this.bytes > this.maxBytes) return this.fail('HOST_TRANSPORT_OVERFLOW');
    this.buffer += this.decoder.write(chunk);
    let index;
    while (!this.closed && (index = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, index); this.buffer = this.buffer.slice(index + 1);
      if (!line.trim()) continue;
      let value; try { value = JSON.parse(line); } catch { return this.fail('HOST_MALFORMED_TRANSPORT'); }
      if (!value || typeof value !== 'object' || Array.isArray(value)) return this.fail('HOST_MALFORMED_TRANSPORT');
      this.dispatch(value);
    }
  }
  dispatch(value) {
    if (this.closed) return;
    const hasId = Object.hasOwn(value, 'id');
    if (hasId && typeof value.method !== 'string') {
      const pending = this.pending.get(value.id);
      if (!pending || (Object.hasOwn(value, 'result') === Object.hasOwn(value, 'error'))) return this.fail('HOST_UNMATCHED_RESPONSE');
      this.pending.delete(value.id);
      if (Object.hasOwn(value, 'error')) pending.reject(failure(Number.isInteger(value.error?.code) ? `HOST_RPC_${value.error.code}` : 'HOST_RPC_ERROR'));
      else pending.resolve(value.result);
      return;
    }
    if (typeof value.method !== 'string' || !value.params || typeof value.params !== 'object' || Array.isArray(value.params)) return this.fail('HOST_MALFORMED_TRANSPORT');
    if (hasId) {
      if (!['string', 'number'].includes(typeof value.id) || (typeof value.id === 'number' && !Number.isSafeInteger(value.id)) || this.seenRequests.has(value.id)) return this.fail('HOST_DUPLICATE_REQUEST');
      this.seenRequests.add(value.id);
      // Approvals, credential prompts and unknown methods are never forwarded.
      if (value.method !== 'item/tool/call' || !this.options.onRequest) {
        this.send({ id: value.id, error: { code: -32601, message: 'HOST_REQUEST_DENIED' } });
        this.emit({ method: 'host/requestDenied', params: { method: value.method } });
        return;
      }
      // Track queued and active handlers; shutdown cancels before they can start
      // and drains active ones. Handlers must honor signal at side-effect boundaries.
      const task = Promise.resolve().then(() => {
        if (this.closed || this.requestAbort.signal.aborted) return null;
        return this.options.onRequest(value, { signal: this.requestAbort.signal });
      }).then(result => {
        if (this.closed) return;
        if (!result || typeof result !== 'object' || typeof result.success !== 'boolean' || !Array.isArray(result.contentItems)) throw failure('HOST_INVALID_TOOL_RESULT');
        this.send({ id: value.id, result });
      }).catch(() => {
        if (!this.closed) { try { this.send({ id: value.id, error: { code: -32000, message: 'HOST_TOOL_FAILED' } }); } catch { this.fail('HOST_WRITE_FAILED'); } }
      });
      this.requests.add(task);
      task.finally(() => this.requests.delete(task));
      return;
    }
    const p = value.params;
    if (value.method === 'item/completed' && p.item?.type === 'agentMessage' && typeof p.item.text === 'string') {
      const key = `${p.threadId}:${p.turnId}`;
      const rows = this.messages.get(key) || [];
      rows.push({ id: p.item.id, text: p.item.text, phase: p.item.phase }); this.messages.set(key, rows);
    }
    if (value.method === 'turn/completed') {
      if (typeof p.threadId !== 'string' || typeof p.turn?.id !== 'string') return this.fail('HOST_MALFORMED_TURN');
      // Validation/normalization must succeed before granting any completion.
      if (!this.emit(value)) return;
      const key = `${p.threadId}:${p.turn.id}`;
      const rows = this.messages.get(key) || [];
      const finals = rows.filter(row => row.phase === 'final_answer');
      const result = { threadId: p.threadId, turnId: p.turn.id, status: p.turn.status, finalPhaseUnknown: !finals.length, finalText: (finals.length ? finals : rows).map(row => row.text).join('\n') };
      this.turns.set(key, result); this.messages.delete(key);
      for (const waiter of this.waiters.get(p.threadId) || []) {
        if (!waiter.turnId || waiter.turnId === p.turn.id) waiter.resolve(result);
      }
      this.waiters.set(p.threadId, (this.waiters.get(p.threadId) || []).filter(waiter => waiter.turnId && waiter.turnId !== p.turn.id));
      return;
    }
    // Callback must normalize and redact before retention. Reasoning is withheld.
    if (!value.method.startsWith('item/reasoning/') && !value.method.toLowerCase().includes('rawresponse') && !['reasoning', 'rawResponseItem'].includes(p.item?.type)) this.emit(value);
  }
  emit(value) {
    try {
      const result = this.options.onEvent?.(value);
      if (result && typeof result.then === 'function') { Promise.resolve(result).catch(() => {}); throw failure('HOST_ASYNC_EVENT_HANDLER'); }
      return !this.closed;
    } catch { this.fail('HOST_EVENT_HANDLER_FAILED'); return false; }
  }
  waitTurn(threadId, turnId) {
    if (typeof threadId !== 'string' || (turnId !== undefined && typeof turnId !== 'string')) return Promise.reject(failure('HOST_INVALID_THREAD'));
    if (this.closed) return Promise.reject(this.error || failure('HOST_CLOSED'));
    const completed = [...this.turns.values()].reverse().find(row => row.threadId === threadId && (!turnId || row.turnId === turnId));
    if (completed) return Promise.resolve(completed);
    return new Promise((resolve, reject) => { const rows = this.waiters.get(threadId) || []; rows.push({ turnId, resolve, reject }); this.waiters.set(threadId, rows); });
  }
  fail(code) { if (!this.closed) { this.error = failure(code); this.close(); } }
  close() {
    if (this.closed) return;
    this.closed = true; clearTimeout(this.timer);
    this.requestAbort.abort();
    const error = this.error || failure('HOST_CLOSED');
    for (const row of this.pending.values()) row.reject(error);
    for (const rows of this.waiters.values()) for (const row of rows) row.reject(error);
    this.pending.clear(); this.waiters.clear(); this.messages.clear(); this.turns.clear(); this.buffer = '';
    const child = this.child;
    if (child && Number.isInteger(child.pid) && child.pid > 0 && child.exitCode === null) {
      try {
        if (this.options.kill) {
          const result = this.options.kill(child.pid);
          if (result === false || (result && typeof result === 'object' && result.status !== 0)) throw failure('HOST_PROCESS_TERMINATION_FAILED');
        } else if (process.platform === 'win32') {
          const result = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', shell: false, timeout: this.shutdownTimeoutMs });
          if (result.error || result.status !== 0) throw failure('HOST_PROCESS_TERMINATION_FAILED');
        } else if (!child.kill('SIGKILL')) throw failure('HOST_PROCESS_TERMINATION_FAILED');
      } catch { this.terminationError = failure('HOST_PROCESS_TERMINATION_FAILED'); }
    }
  }
  // close() only initiates cancellation. Await this barrier before releasing
  // protected-file locks, writing an accepted result, or ending the parent.
  shutdown() {
    if (this.shutdownPromise) return this.shutdownPromise;
    this.close();
    this.shutdownPromise = (async () => {
      let timeout;
      const drained = Promise.all([
        this.child ? (this.processClosed || Promise.reject(failure('HOST_SHUTDOWN_UNOBSERVABLE'))) : Promise.resolve(),
        Promise.all([...this.requests])
      ]);
      try {
        await Promise.race([drained, new Promise((_, reject) => { timeout = setTimeout(() => reject(failure('HOST_SHUTDOWN_TIMEOUT')), this.shutdownTimeoutMs); })]);
      } finally { clearTimeout(timeout); }
      if (this.terminationError) throw this.terminationError;
      if (this.error) throw this.error;
      return { processClosed: !this.child || this.processCloseObserved === true, requestsDrained: this.requests.size === 0 };
    })();
    return this.shutdownPromise;
  }
}
module.exports = { RuntimeHost, sessionOverrides };
