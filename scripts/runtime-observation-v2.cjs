'use strict';
// Facts only. record() is reserved for trusted harness I/O, never model payloads.
// No command bodies, output text, private paths, or reasoning are retained.
const crypto = require('node:crypto');
const path = require('node:path');

const UNKNOWN = 'UNKNOWN';
const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const fact = (value = UNKNOWN, source = 'OBSERVED') => ({ value: value ?? UNKNOWN, source });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) ? value : UNKNOWN;
const boolean = value => typeof value === 'boolean' ? value : UNKNOWN;
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : UNKNOWN;
const token = value => typeof value === 'string' && /^[a-z0-9_.:/-]{1,120}$/i.test(value)
  && !/[\\/]|(?:^|[-_])(?:sk|secret|password|credential|token)[-_]/i.test(value) ? value : UNKNOWN;
const eventType = value => typeof value === 'string' && /^[a-z][a-z0-9_.:/-]{0,100}$/i.test(value)
  && !/sk[-_]|secret|password|credential/i.test(value) ? value : UNKNOWN;
const status = value => ['completed', 'failed', 'inProgress', 'in_progress', 'started', 'running', 'interrupted', 'pending', 'errored'].includes(value) ? value : UNKNOWN;
const role = value => ['reviewer', 'explorer', 'worker', 'default', 'docs_researcher', 'test_analyst', 'routine_worker'].includes(value) ? value : UNKNOWN;
const verdict = value => ['PASS', 'FAIL', 'UNKNOWN', 'NOT PROVEN'].includes(value) ? value : UNKNOWN;
const failureCodes = Object.freeze({
  PROCESS_START_FAILED: 'PROCESS_START_FAILED', ENOENT: 'PROCESS_START_FAILED',
  SANDBOX_DENIED: 'SANDBOX_DENIED', SANDBOX_REFUSED: 'SANDBOX_DENIED',
  TOOL_TIMEOUT: 'TOOL_TIMEOUT', ETIMEDOUT: 'TOOL_TIMEOUT',
  HOST_WRAPPER_ERROR: 'HOST_WRAPPER_ERROR', WRAPPER_ERROR: 'HOST_WRAPPER_ERROR',
  TRANSPORT_ERROR: 'TRANSPORT_ERROR', ECONNRESET: 'TRANSPORT_ERROR', EPIPE: 'TRANSPORT_ERROR'
});
function classifyFailure(exitCode, code) {
  if (Object.hasOwn(failureCodes, code)) return failureCodes[code];
  if (Number.isSafeInteger(exitCode) && exitCode !== 0 && exitCode !== -1) return 'PROCESS_EXIT_NONZERO';
  return UNKNOWN;
}
function safeCode(value) {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,60}$/.test(value)
    && !/SECRET|PASSWORD|CREDENTIAL|TOKEN/.test(value) ? value : UNKNOWN;
}
function findings(value) {
  if (!Array.isArray(value)) return UNKNOWN;
  const counts = { BLOCKER: 0, MAJOR: 0, MINOR: 0, INFO: 0 };
  for (const item of value) {
    if (!object(item) || !Object.hasOwn(counts, item.severity)) return UNKNOWN;
    counts[item.severity]++;
  }
  return counts;
}

function createCollector({ metadata = {}, workspace, skillRoot, registeredToolNames = [] } = {}) {
  // Only trusted harness registrations can make a dynamic tool known. Neither
  // event arguments nor a model declaration can extend this detached registry.
  const registeredTools = new Set(Array.isArray(registeredToolNames) ? registeredToolNames.filter(name =>
    typeof name === 'string' && /^[a-z][a-z0-9_]{0,60}$/.test(name) && eventType(name) === name) : []);
  const windows = value => typeof value === 'string' && /^(?:[a-z]:[\\/]|[\\/]{2})/i.test(value);
  // Normalizing string spelling does not resolve filesystem aliases or symlinks.
  const normalize = value => {
    if (typeof value !== 'string' || !value || value.includes('\0')) return null;
    if (windows(value)) {
      const collapsed = value.replace(/[\\/]+/g, '\\');
      const canonical = /^[\\/]{2}/.test(value) ? '\\\\' + collapsed.replace(/^\\+/, '') : collapsed;
      return path.win32.normalize(canonical).replaceAll('\\', '/');
    }
    return path.posix.normalize(value.replaceAll('\\', '/'));
  };
  const roots = [{ root: normalize(workspace), prefix: '' }, { root: normalize(skillRoot), prefix: 'skill/' }];
  function safePath(value, source = 'OBSERVED') {
    let normalized = normalize(value);
    if (!normalized) return { path: fact(UNKNOWN, source), pathDigest: fact(UNKNOWN, source) };
    const relative = !windows(value) && !path.posix.isAbsolute(normalized);
    if (relative && roots[0].root) normalized = normalize(roots[0].root + '/' + normalized);
    for (const { root, prefix } of roots) {
      if (!root) continue;
      const caseInsensitive = windows(root);
      const compared = caseInsensitive ? normalized.toLowerCase() : normalized;
      const base = caseInsensitive ? root.toLowerCase() : root;
      if (compared === base || compared.startsWith(base.replace(/\/$/, '') + '/')) {
        const suffix = normalized.slice(root.replace(/\/$/, '').length).replace(/^\//, '');
        if (suffix.split('/').some(part => part === '..' || part === '.')) break;
        return { path: fact(prefix + (suffix || '.'), source), pathDigest: fact(sha(normalized), source) };
      }
    }
    return { path: fact(UNKNOWN, source), pathDigest: fact(sha(value), source) };
  }
  function inferredPaths(command) {
    if (typeof command !== 'string') return [];
    // A candidate mention is never a successful read, including echo/rg/diff.
    const candidates = command.match(/(?:[a-z]:[\\/]|\/)[^\s'"`;|<>]*?(?:SKILL\.md|PLAN\.md|references[\\/]+[a-z0-9-]+\.md)/gi) || [];
    return candidates.map(value => ({ ...safePath(value, 'INFERRED'), success: fact(UNKNOWN, 'INFERRED') }));
  }
  function safeArgv(argv) {
    if (!Array.isArray(argv) || !argv.every(arg => typeof arg === 'string')) return UNKNOWN;
    const allowed = [
      ['node', 'scripts/check-copy.cjs'], ['node', 'scripts/full-check.cjs'],
      ['node', 'scripts/acceptance.cjs'],
      ['node', '--test', 'test/clamp.test.cjs'], ['node', '--test', 'test/divide.test.cjs'],
      ['node', '-e', 'process.exit(17)'],
      ['git', 'diff', '--check'], ['git', 'status', '--short'], ['git', 'rev-parse', 'HEAD']
    ];
    return allowed.some(args => JSON.stringify(args) === JSON.stringify(argv)) ? [...argv] : UNKNOWN;
  }
  const data = {
    schema: 2, metadata: {}, events: [], commands: [], reads: [], writes: [], files: [], agents: [], reviewers: [],
    interactions: [], declarations: [], unknownEvents: [], completeness: {}
  };
  for (const key of ['scenarioId', 'runtimeVersion', 'candidateIdentifier', 'model', 'reasoningEffort', 'startDisposition', 'endDisposition']) {
    data.metadata[key] = fact(token(object(metadata) ? metadata[key] : undefined));
  }
  data.metadata.workspace = fact('.');
  let sequence = 0;
  const commandItems = new Map();
  function unknown(type, domains = ['commands', 'reads', 'agents', 'interactions']) {
    data.unknownEvents.push({ source: 'OBSERVED', eventType: fact(eventType(type)), unsupported: fact(true), affectedDomains: domains });
  }
  function addCommand(item, context) {
    const exitCode = integer(item.exitCode ?? item.exit_code);
    const code = safeCode(item.error?.code ?? item.errorCode);
    const actions = Array.isArray(item.commandActions) ? item.commandActions : [];
    const commandId = token(item.id);
    const key = commandId === UNKNOWN ? null : context.threadId.value + ':' + commandId;
    const previousIndex = key === null ? undefined : commandItems.get(key);
    const entry = { source: 'OBSERVED', ...context,
      commandId: fact(commandId), attempt: previousIndex === undefined ? data.commands.length + 1 : data.commands[previousIndex].attempt, category: fact('command'),
      status: fact(status(item.status)), exitCode: fact(exitCode), errorCode: fact(code),
      failureCategory: fact(classifyFailure(exitCode, code)),
      commandDigest: fact(typeof item.command === 'string' ? sha(item.command) : UNKNOWN),
      outputDigest: fact(typeof (item.aggregatedOutput ?? item.aggregated_output) === 'string' ? sha(item.aggregatedOutput ?? item.aggregated_output) : UNKNOWN),
      inferredCandidatePaths: inferredPaths(item.command),
      actions: actions.map(action => ({ source: 'OBSERVED', operation: fact(action?.type === 'read' ? 'READ' : UNKNOWN),
        ...safePath(action?.path), success: fact(UNKNOWN) }))
    };
    if (previousIndex === undefined) {
      if (key !== null) commandItems.set(key, data.commands.length);
      data.commands.push(entry);
    } else data.commands[previousIndex] = entry;
  }
  function addReview(item, context, completed) {
    data.reviewers.push({ source: 'OBSERVED', ...context, requestId: fact(token(item.id)),
      actorThreadId: fact(UNKNOWN), reviewThreadId: context.threadId,
      role: fact(UNKNOWN), nativeRole: fact(UNKNOWN), roleOrigin: fact(UNKNOWN),
      readOnly: fact(UNKNOWN), baseline: fact(UNKNOWN), differentThread: fact(UNKNOWN),
      completed: fact(completed), resultCaptured: fact(typeof item.review === 'string'),
      resultDigest: fact(typeof item.review === 'string' ? sha(item.review) : UNKNOWN),
      verdict: fact(UNKNOWN), findings: fact(UNKNOWN)
    });
  }
  function itemEvent(item, context, complete) {
    if (!object(item) || typeof item.type !== 'string') { unknown('malformed.item'); return; }
    const type = item.type;
    if (['commandExecution', 'command_execution'].includes(type)) addCommand(item, context);
    else if (['agentMessage', 'agent_message', 'plan', 'plan_update'].includes(type)) {
      const text = item.text ?? item.plan;
      data.declarations.push({ source: 'DECLARED', ...context, category: fact(type, 'OBSERVED'),
        contentDigest: fact(typeof text === 'string' ? sha(text) : UNKNOWN, 'OBSERVED'),
        modeMentions: fact(typeof text === 'string' ? ['DIRECT', 'STANDARD', 'FULL'].filter(mode => new RegExp('\\b' + mode + '\\b').test(text)) : [], 'DECLARED') });
    } else if (['collabAgentToolCall', 'collab_tool_call', 'agent_tool_call'].includes(type)) {
      const receivers = item.receiverThreadIds ?? item.receiver_thread_ids;
      data.agents.push({ source: 'OBSERVED', ...context, invocationId: fact(token(item.id)),
        tool: fact(eventType(item.tool)), senderThreadId: fact(token(item.senderThreadId ?? item.sender_thread_id)),
        receiverThreadIds: fact(Array.isArray(receivers) ? receivers.map(token) : UNKNOWN),
        status: fact(status(item.status)), role: fact(UNKNOWN), readOnly: fact(UNKNOWN), baseline: fact(UNKNOWN) });
    } else if (['enteredReviewMode', 'exitedReviewMode'].includes(type)) addReview(item, context, type === 'exitedReviewMode' && complete);
    else if (['mcpToolCall', 'mcp_tool_call', 'dynamicToolCall'].includes(type)) {
      const tool = item.tool ?? item.name;
      if (['request_user_input', 'requestUserInput'].includes(tool)) {
        data.interactions.push({ source: 'OBSERVED', ...context, category: fact('question'), count: fact(1) });
      } else if (['spawn_agent', 'wait_agent', 'wait', 'send_message', 'send_input', 'resume_agent', 'close_agent', 'followup_task', 'list_agents'].includes(tool)) {
        data.agents.push({ source: 'OBSERVED', ...context, invocationId: fact(token(item.id)), tool: fact(tool),
          senderThreadId: fact(UNKNOWN), receiverThreadIds: fact(UNKNOWN), status: fact(status(item.status)),
          role: fact(UNKNOWN), readOnly: fact(UNKNOWN), baseline: fact(UNKNOWN) });
      } else {
        data.events.push({ source: 'OBSERVED', ...context, eventType: fact(eventType(type)), category: fact('tool'),
          tool: fact(eventType(tool)), status: fact(status(item.status)), errorCode: fact(safeCode(item.error?.code)),
          failureCategory: fact(classifyFailure(UNKNOWN, safeCode(item.error?.code))) });
        if (!(type === 'dynamicToolCall' && registeredTools.has(tool))) unknown('item:' + type);
      }
    } else if (type === 'error') {
      const code = safeCode(item.error?.code ?? item.code);
      data.events.push({ source: 'OBSERVED', ...context, eventType: fact('item:error'), category: fact('error'),
        errorCode: fact(code), failureCategory: fact(classifyFailure(UNKNOWN, code)) });
    } else if (['fileChange', 'file_change', 'webSearch', 'imageView'].includes(type)) {
      // These host operations bypass registered harness I/O. Safe lifecycle
      // metadata is observable, but their content/access scope is opaque.
      data.events.push({ source: 'OBSERVED', ...context, eventType: fact('item:' + type), category: fact('opaque'), status: fact(status(item.status)) });
      unknown('item:' + type, ['reads', 'commands']);
    } else if (!['reasoning', 'compaction'].includes(type)) unknown('item:' + type);
  }
  function accept(input) {
    let event = input;
    if (typeof input === 'string') { try { event = JSON.parse(input); } catch { unknown('malformed.json'); return; } }
    if (!object(event) || typeof (event.method ?? event.type) !== 'string') { unknown('malformed.event'); return; }
    const type = event.method ?? event.type;
    const params = object(event.params) ? event.params : event;
    const context = { sequence: ++sequence, threadId: fact(token(params.threadId ?? params.thread_id)), turnId: fact(token(params.turnId ?? params.turn_id)) };
    data.events.push({ source: 'OBSERVED', ...context, eventType: fact(eventType(type)), category: fact('host') });
    if (['item/started', 'item/completed', 'item.started', 'item.completed', 'item.updated'].includes(type)) {
      itemEvent(params.item, context, ['item/completed', 'item.completed'].includes(type));
    } else if (type === 'error' || type === 'turn.failed') {
      const code = safeCode(params.error?.code ?? params.code);
      data.events.push({ source: 'OBSERVED', ...context, eventType: fact(eventType(type)), category: fact('error'),
        errorCode: fact(code), failureCategory: fact(classifyFailure(UNKNOWN, code)) });
    } else if (['item/commandExecution/requestApproval', 'item/fileChange/requestApproval'].includes(type)) {
      data.interactions.push({ source: 'OBSERVED', ...context, category: fact('approval'), count: fact(1) });
    } else if (type === 'item/tool/requestUserInput') {
      data.interactions.push({ source: 'OBSERVED', ...context, category: fact('question'), count: fact(1) });
    } else if (type === 'item/tool/call') {
      // A request/notification proves an invocation, not the executor's I/O.
      data.events.push({ source: 'OBSERVED', ...context, eventType: fact(type), category: fact('tool'),
        tool: fact(eventType(params.tool)), invocationId: fact(token(params.callId)), status: fact(UNKNOWN) });
      if (!registeredTools.has(params.tool)) unknown(type);
    } else if (!['thread/started', 'thread.started', 'turn/started', 'turn.started', 'turn/completed', 'turn.completed',
      'thread/status/changed', 'thread/tokenUsage/updated', 'turn/plan/updated', 'turn/diff/updated',
      'item/agentMessage/delta', 'item/commandExecution/outputDelta', 'item/reasoning/summaryTextDelta',
      'item/reasoning/textDelta', 'item/reasoning/summaryPartAdded', 'item/fileChange/outputDelta',
      'serverRequest/resolved', 'thread/modelSettings/updated', 'account/updated',
      'mcpServer/startupStatus/updated'].includes(type)) unknown(type);
  }
  function record(receipt) {
    if (!object(receipt)) { unknown('malformed.receipt'); return; }
    const context = { threadId: fact(token(receipt.threadId)) };
    if (receipt.kind === 'read' || receipt.kind === 'write') {
      const target = receipt.kind === 'read' ? data.reads : data.writes;
      target.push({ source: 'OBSERVED', ...context, ...safePath(receipt.path),
        operation: fact(receipt.kind === 'read' ? 'READ' : 'WRITE'), success: fact(boolean(receipt.success)),
        contentDigest: fact(digest(receipt.contentDigest)), bytes: fact(integer(receipt.bytes)) });
    } else if (receipt.kind === 'check') {
      const exitCode = integer(receipt.exitCode), code = safeCode(receipt.errorCode);
      data.commands.push({ source: 'OBSERVED', ...context, commandId: fact(token(receipt.commandId)),
        attempt: data.commands.length + 1, category: fact('check'), status: fact('completed'), exitCode: fact(exitCode),
        errorCode: fact(code), failureCategory: fact(classifyFailure(exitCode, code)), argv: fact(safeArgv(receipt.argv)),
        outputDigest: fact(digest(receipt.outputDigest)), inferredCandidatePaths: [], actions: [] });
    } else if (receipt.kind === 'review') {
      const actor = token(receipt.actorThreadId), reviewer = token(receipt.reviewThreadId);
      data.reviewers.push({ source: 'OBSERVED', requestId: fact(token(receipt.requestId)), actorThreadId: fact(actor), reviewThreadId: fact(reviewer),
        role: fact(role(receipt.role), 'DECLARED'), roleOrigin: fact(receipt.roleOrigin === 'HARNESS_CONFIG' ? 'HARNESS_CONFIG' : UNKNOWN), nativeRole: fact(UNKNOWN),
        readOnly: fact(boolean(receipt.readOnly)), baseline: fact(token(receipt.baseline)), diffDigest: fact(digest(receipt.diffDigest)),
        differentThread: fact(actor === UNKNOWN || reviewer === UNKNOWN ? UNKNOWN : actor !== reviewer),
        completed: fact(boolean(receipt.completed)), resultCaptured: fact(boolean(receipt.resultCaptured)),
        resultDigest: fact(digest(receipt.resultDigest)), resultPayloadDigest: fact(digest(receipt.resultPayloadDigest)),
        verdict: fact(verdict(receipt.verdict), 'DECLARED'), findings: fact(findings(receipt.findings), 'DECLARED') });
    } else if (receipt.kind === 'interaction') {
      data.interactions.push({ source: 'OBSERVED', ...context, category: fact(['question', 'approval', 'material-decision'].includes(receipt.category) ? receipt.category : UNKNOWN), count: fact(integer(receipt.count)) });
    } else if (receipt.kind === 'files') {
      const entry = { source: 'OBSERVED', intact: fact(boolean(receipt.intact)) };
      for (const key of ['created', 'modified', 'deleted', 'protected']) entry[key] = fact(Array.isArray(receipt[key]) ? receipt[key].map(value => safePath(value).path.value) : UNKNOWN);
      data.files.push(entry);
    } else unknown('receipt:' + eventType(receipt.kind));
  }
  function finish({ transportComplete, controlledToolsOnly = false, endDisposition } = {}) {
    if (endDisposition !== undefined) data.metadata.endDisposition = fact(token(endDisposition));
    data.completeness = { transportComplete: fact(boolean(transportComplete)), controlledToolsOnly: fact(boolean(controlledToolsOnly)), registeredTools: fact(boolean(controlledToolsOnly)) };
    // A detached immutable snapshot prevents callers from altering retained evidence.
    return JSON.parse(JSON.stringify(data));
  }
  return { accept, record, finish };
}

module.exports = { createCollector, classifyFailure };
