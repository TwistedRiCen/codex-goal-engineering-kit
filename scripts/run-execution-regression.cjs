'use strict';
// Optional, paid real-model experiment. Unit tests do not invoke Codex.
// Raw JSONL and final prose stay in memory/the isolated scratch directory only.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const RUBRIC = 'execution-regression-v3';
const SKILL_DIR = 'skills/goal-driven-engineering';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function command(executable, args, cwd) {
  const result = cp.spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('Fixture/source command failed: ' + executable);
  return result.stdout;
}
function digestFiles(files) {
  return sha(JSON.stringify(Object.keys(files).sort().map(name => [name, sha(files[name])])));
}
function sourceFiles(repo, ref) {
  const files = {};
  if (ref === 'working-tree') {
    function visit(dir) {
      for (const name of fs.readdirSync(dir).sort()) {
        const file = path.join(dir, name), stat = fs.lstatSync(file);
        if (stat.isSymbolicLink()) throw new Error('Skill source links are not supported');
        if (stat.isDirectory()) visit(file);
        else if (stat.isFile()) files[path.relative(path.join(repo, SKILL_DIR), file).replaceAll('\\', '/')] = fs.readFileSync(file);
        else throw new Error('Unsupported Skill source entry');
      }
    }
    visit(path.join(repo, SKILL_DIR));
  } else {
    const commit = command('git', ['rev-parse', '--verify', ref + '^{commit}'], repo).trim();
    const entries = command('git', ['ls-tree', '-rz', commit, '--', SKILL_DIR], repo).split('\0').filter(Boolean);
    for (const entry of entries) {
      const match = /^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(entry);
      if (!match || match[1] !== '100644' && match[1] !== '100755') throw new Error('Skill source contains nonregular entries');
      const name = match[3].slice(SKILL_DIR.length + 1);
      const result = cp.spawnSync('git', ['show', commit + ':' + match[3]], { cwd: repo, windowsHide: true });
      if (result.status !== 0) throw new Error('Cannot read Skill source');
      files[name] = result.stdout;
    }
  }
  if (!Object.hasOwn(files, 'SKILL.md')) throw new Error('Source Skill is missing');
  for (const name of Object.keys(files)) if (name.startsWith('/') || name.split('/').some(p => p === '..' || !p)) throw new Error('Unsafe source path');
  return files;
}

const common = {
  'AGENTS.md': 'Use repository evidence and the supplied Goal-Driven Engineering Skill. Local changes only. No network writes, installation, global configuration changes, commits, or Goal creation. Preserve unrelated files.\n',
  'package.json': '{"private":true,"scripts":{"test":"node scripts/full-check.cjs"}}\n',
  'src/clamp.cjs': "'use strict';\nfunction clamp(value, lower, upper) {\n  if (![value, lower, upper].every(Number.isFinite) || lower > upper) throw new RangeError('invalid range');\n  return Math.max(lower, Math.min(upper, value));\n}\nmodule.exports = { clamp };\n",
  'test/clamp.test.cjs': "const test = require('node:test'), assert = require('node:assert/strict');\nconst {clamp} = require('../src/clamp.cjs');\ntest('existing clamp bounds', () => { assert.equal(clamp(-1, 0, 2), 0); assert.equal(clamp(3, 0, 2), 2); assert.throws(() => clamp(0, 2, 1)); });\n",
  'scripts/check-copy.cjs': "const fs = require('node:fs');\nif (fs.readFileSync('copy.txt', 'utf8') !== 'Welcome to the learning center.\\n') process.exit(1);\nconsole.log('COPY_CHECK_PASS');\n",
  'scripts/full-check.cjs': "const cp = require('node:child_process'), fs = require('node:fs');\nfs.appendFileSync('.full-check-runs', 'run\\n');\nconst r = cp.spawnSync(process.execPath, ['--test', 'test/clamp.test.cjs'], {stdio:'inherit'});\nif (r.status !== 0) process.exit(1);\nconsole.log('FULL_CHECK_PASS');\n",
  'unrelated.txt': 'Protected fixture content.\n',
  '.gitignore': '.full-check-runs\n.fixture-skill/\n.last-message\n'
};
const standardPlan = `# PLAN

## Plan Metadata
Task Mode: STANDARD
Reason: bounded internal iteration within verified architecture.
Current Phase: EXECUTION
Execution Context: ordinary
Last Verified Commit: see evidence/baseline.json

## Project Goal / Scope
Add an internal batch helper using the existing clamp contract. Preserve scalar behavior and architecture.

## Acceptance Criteria
| ID | Criterion | Method | Status | Evidence |
| --- | --- | --- | --- | --- |
| AC-OLD | Scalar clamp bounds and invalid-range behavior | node --test test/clamp.test.cjs | VERIFIED | evidence/baseline.json |
| AC-NEW | Batch clamp returns a new ordered array without mutating its input | focused tests | OPEN | pending |

## Current Work
Batch helper: NOT STARTED. Next unmet criterion: AC-NEW.

## Decisions and Blockers
F-1: Internal CommonJS module and scalar clamp semantics are fixed by existing code and tests.
D-1: Reuse scalar clamp for each input. Authority: approved task scope. Reopen only for changed scalar requirements.

## Repository and Verification State
Full baseline check passed; immutable receipt: evidence/baseline.json. Unrelated content and dependency/configuration remain unchanged. Revalidate affected behavior; reuse applicable prior evidence.
`;
function fixture(id) {
  if (id === 'direct-copy') return {
    files: { ...common, 'copy.txt': 'Welcome to the learning cetner.\n' },
    task: 'Fix the spelling error in copy.txt. Keep its wording otherwise unchanged.',
    checks: [['scripts/check-copy.cjs']], allowed: ['copy.txt']
  };
  if (id === 'standard-batch') return {
    files: { ...common, 'copy.txt': 'Welcome to the learning center.\n', 'PLAN.md': standardPlan },
    task: 'Implement the approved internal clampMany(values, lower, upper) helper in src/clamp.cjs. It must return a new array in input order by applying the existing clamp behavior, leave the input unchanged, reject non-arrays with TypeError, and retain all scalar semantics. Add focused tests and finish the bounded scope recorded in PLAN.md. The recorded baseline evidence remains valid for unchanged dependencies, configuration, and unrelated behavior.',
    checks: [['--test', 'test/clamp.test.cjs']], allowed: ['src/clamp.cjs', 'test/clamp.test.cjs', 'PLAN.md']
  };
  throw new Error('Unknown execution fixture');
}
function writeFiles(root, files) {
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}
function seed(root, id, source) {
  const data = fixture(id);
  writeFiles(root, data.files);
  writeFiles(path.join(root, '.fixture-skill'), source);
  command('git', ['-c', 'init.defaultBranch=main', 'init', '--quiet'], root);
  command(process.execPath, ['scripts/full-check.cjs'], root);
  command('git', ['add', '.'], root);
  // Fixed local identity/time yields repeatable fixture HEADs; no user config mutation.
  const commit = cp.spawnSync('git', ['-c', 'user.name=Regression Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Immutable regression seed'], {
    cwd: root, windowsHide: true, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' }
  });
  if (commit.status !== 0) throw new Error('Cannot commit regression seed');
  const baseline = command('git', ['rev-parse', 'HEAD'], root).trim();
  writeFiles(root, { 'evidence/baseline.json': JSON.stringify({ schema: 1, baseline, fixtureDigest: digestFiles(data.files), check: 'node scripts/full-check.cjs', exitCode: 0, validity: 'unchanged scalar behavior, dependencies, configuration and unrelated files' }, null, 2) + '\n' });
  // Receipt is the seed's explicit evidence; leave it unchanged and protect it.
  return { data, baseline, receiptDigest: sha(fs.readFileSync(path.join(root, 'evidence/baseline.json'))) };
}

function literalTokens(value) {
  // Deliberately a small accepted language, not a general shell parser. Quoted
  // literal arguments and one leading PowerShell invocation operator are safe
  // to classify; variables, pipelines, compound scripts and redirections are not.
  const text = value.trim().replace(/^&\s+/, '');
  if (!text || /[$`;|<>\r\n]/.test(text)) return null;
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    while (/\s/.test(text[i] || '') && i < text.length) i++;
    if (i === text.length) break;
    let token = '';
    const quote = text[i] === '"' || text[i] === "'" ? text[i++] : null;
    if (quote) {
      let closed = false;
      while (i < text.length) {
        if (quote === '"' && text[i] === '\\' && text[i + 1] === '"') { token += '"'; i += 2; }
        else if (text[i] === quote) { closed = true; i++; break; }
        else token += text[i++];
      }
      if (!closed || i < text.length && !/\s/.test(text[i])) return null;
    } else {
      while (i < text.length && !/\s/.test(text[i])) {
        if (text[i] === '"' || text[i] === "'" || text[i] === '&') return null;
        token += text[i++];
      }
    }
    if (!token) return null;
    tokens.push(token);
  }
  return tokens;
}
function invocation(value, depth = 0) {
  const tokens = literalTokens(value);
  if (!tokens?.length) return null;
  const executable = tokens[0].replaceAll('\\', '/').split('/').at(-1).toLowerCase().replace(/\.exe$/, '');
  if (['powershell', 'pwsh'].includes(executable)) {
    if (depth !== 0) return null;
    let index = 1;
    while (index < tokens.length && ['-noprofile', '-noninteractive', '-nologo'].includes(tokens[index].toLowerCase())) index++;
    if (tokens[index]?.toLowerCase() !== '-command' || tokens.length !== index + 2) return null;
    const inner = invocation(tokens[index + 1], depth + 1);
    return inner ? { ...inner, wrapper: executable } : null;
  }
  const args = tokens.slice(1).map(arg => arg.replaceAll('\\', '/').replace(/^\.\//, ''));
  let kind;
  if (executable === 'node') {
    if (args.length === 1 && args[0] === 'scripts/full-check.cjs') kind = 'full-verification';
    else if (args.length === 1 && args[0] === 'scripts/check-copy.cjs' || args.length === 2 && args[0] === '--test' && args[1] === 'test/clamp.test.cjs') kind = 'focused-verification';
  } else if (['npm', 'pnpm', 'yarn'].includes(executable)) {
    if (JSON.stringify(args) === '["test"]' || JSON.stringify(args) === '["run","test"]') kind = 'full-verification';
  } else if (executable === 'git') {
    const paths = new Set(['copy.txt', 'src/clamp.cjs', 'test/clamp.test.cjs', 'PLAN.md']);
    if (args[0] === 'diff') {
      let index = 1;
      while (['--stat', '--check', '--name-only'].includes(args[index])) index++;
      if (index === args.length || args[index] === '--' && args.slice(index + 1).every(arg => paths.has(arg))) kind = 'git-inspection';
    } else if (args[0] === 'status' && args.slice(1).every(arg => ['--short', '--porcelain', '--porcelain=v1'].includes(arg))) kind = 'git-inspection';
    else if (JSON.stringify(args) === '["rev-parse","HEAD"]' || JSON.stringify(args) === '["log","-1","--oneline"]') kind = 'git-inspection';
  } else if (['get-content', 'cat'].includes(executable)) {
    const readArgs = args[0]?.toLowerCase() === '-literalpath' && executable === 'get-content' ? args.slice(1) : args;
    if (readArgs.length === 1 && ['copy.txt', 'src/clamp.cjs', 'scripts/full-check.cjs'].includes(readArgs[0])) kind = 'file-inspection';
  }
  return kind ? { kind, wrapper: null, executable, fixtureArgv: args } : null;
}
function classifyCommand(value) { return invocation(value)?.kind || 'other'; }
function collect(raw) {
  const result = { rawTraceDigest: sha(raw), rawTraceBytes: Buffer.byteLength(raw), jsonEvents: 0, malformedLines: 0, completedTurns: 0, commands: [], visibleMessageCount: 0, questionMarks: 0, explicitQuestionTools: 0, agentToolEvents: 0, otherToolEvents: 0, unrecognizedEventTypes: [], modeMentions: [], cliErrorEvents: 0 };
  const unknown = new Set(), modes = new Set();
  for (const line of raw.split(/\r?\n/).filter(Boolean)) {
    let event; try { event = JSON.parse(line); } catch { result.malformedLines++; continue; }
    result.jsonEvents++;
    if (event.type === 'turn.completed') result.completedTurns++;
    else if (event.type === 'error' || event.type === 'turn.failed') result.cliErrorEvents++;
    else if (event.type === 'item.completed') {
      const item = event.item || {};
      if (item.type === 'command_execution') {
        const recognized = invocation(String(item.command || ''));
        result.commands.push({ kind: recognized?.kind || 'other', invocation: recognized ? { wrapper: recognized.wrapper, executable: recognized.executable, fixtureArgv: recognized.fixtureArgv } : null, status: typeof item.status === 'string' ? item.status : 'unknown', exitCode: Number.isInteger(item.exit_code) ? item.exit_code : null,
          // Do not persist command bodies/output: they can contain private paths or secrets.
          stdoutDigest: sha(String(item.aggregated_output || '')),
          markers: ['COPY_CHECK_PASS', 'FULL_CHECK_PASS'].filter(marker => String(item.aggregated_output || '').includes(marker)) });
      } else if (item.type === 'agent_message') {
        result.visibleMessageCount++;
        result.questionMarks += (String(item.text || '').match(/[?？]/g) || []).length;
        for (const mode of ['DIRECT', 'STANDARD', 'FULL']) if (new RegExp('\\b' + mode + '\\b').test(String(item.text || ''))) modes.add(mode);
      } else if (/collab|agent_tool/.test(item.type || '')) result.agentToolEvents++;
      else if (/tool/.test(item.type || '')) {
        const tool = String(item.tool || item.name || '');
        if (/request_user_input/.test(tool)) result.explicitQuestionTools++;
        else if (/spawn_agent|followup_task|send_message|wait_agent/.test(tool)) result.agentToolEvents++;
        else result.otherToolEvents++;
      } else if (!['reasoning', 'file_change', 'plan_update'].includes(item.type)) unknown.add('item:' + String(item.type));
    } else if (!['thread.started', 'turn.started', 'item.started', 'item.updated'].includes(event.type)) unknown.add(String(event.type));
  }
  result.modeMentions = [...modes].sort();
  result.unrecognizedEventTypes = [...unknown].sort();
  result.failedCommandCount = result.commands.filter(cmd => cmd.exitCode !== null && cmd.exitCode !== 0).length;
  const firstFailedIndex = result.commands.findIndex(cmd => cmd.exitCode !== null && cmd.exitCode !== 0);
  result.firstFailedCommand = firstFailedIndex < 0 ? null : { index: firstFailedIndex, kind: result.commands[firstFailedIndex].kind, exitCode: result.commands[firstFailedIndex].exitCode };
  result.additionalFocusedInvocations = Math.max(0, result.commands.filter(cmd => cmd.kind === 'focused-verification').length - 1);
  return result;
}
function runCli(args, cwd, input, timeoutMs) {
  return new Promise(resolve => {
    const child = cp.spawn('codex', args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', timedOut = false, overflow = false, settled = false;
    const end = result => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
    const stop = () => {
      if (!child.pid) return;
      if (process.platform === 'win32') cp.spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
      else child.kill('SIGKILL');
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    child.stdout.on('data', data => { if (out.length + data.length > 16 * 1024 * 1024) { overflow = true; stop(); } else out += data.toString(); });
    // stderr may contain account/auth/private paths. Only count bytes; never persist it.
    let stderrBytes = 0;
    child.stderr.on('data', data => { stderrBytes += data.length; });
    child.on('error', () => end({ raw: out, exitCode: null, timedOut, overflow, stderrBytes, launchFailed: true }));
    child.on('close', exitCode => end({ raw: out, exitCode, timedOut, overflow, stderrBytes, launchFailed: false }));
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}
function treeFiles(root, prefix = '') {
  const result = {};
  for (const name of fs.readdirSync(path.join(root, prefix)).sort()) {
    if (!prefix && ['.git', '.full-check-runs', '.last-message'].includes(name)) continue;
    const relative = prefix ? prefix + '/' + name : name, full = path.join(root, relative), stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error('Actor introduced unsupported link');
    if (stat.isDirectory()) Object.assign(result, treeFiles(root, relative));
    else if (stat.isFile()) result[relative] = fs.readFileSync(full);
    else throw new Error('Actor introduced unsupported entry');
  }
  return result;
}
function fullCheckSnapshot(root) {
  const file = path.join(root, '.full-check-runs');
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) return { valid: false, count: null, digest: null };
  const content = fs.readFileSync(file);
  const text = content.toString('utf8');
  return { valid: /^(?:run\n)+$/.test(text), count: text.split('\n').filter(line => line === 'run').length, digest: sha(content) };
}
function grade(id, observation) {
  const errors = [];
  const { trace, process: run, changedFiles, independentChecks, plan } = observation;
  if (run.exitCode !== 0 || run.timedOut || run.overflow || run.launchFailed || trace.completedTurns < 1 || trace.jsonEvents < 2 || trace.malformedLines || trace.cliErrorEvents) errors.push('No successful, usable native execution trace');
  if (!Array.isArray(trace.unrecognizedEventTypes) || trace.unrecognizedEventTypes.length || trace.otherToolEvents !== 0) errors.push('Unsupported event/tool activity requires review; no implicit PASS');
  const counter = observation.fullCheckRuns;
  if (!counter?.before?.valid || !counter?.after?.valid || counter.before.count !== 1 || counter.after.count !== 1 || counter.before.digest !== counter.after.digest) errors.push('Full-check counter missing, changed or actor executed extra full verification');
  if (!observation.finalMessagePresent) errors.push('CLI produced no final message');
  if (!observation.sourceIntact || !observation.receiptIntact || !observation.headIntact) errors.push('Protected source, evidence or HEAD changed');
  const allowed = fixture(id).allowed;
  if (allowed.some(name => !changedFiles.includes(name))) errors.push('Required implementation/test/state change missing');
  if (changedFiles.some(name => !allowed.includes(name))) errors.push('Out-of-scope artifact change');
  const expectedChecks = id === 'standard-batch' ? 2 : 1;
  if (independentChecks.length !== expectedChecks || independentChecks.some(check => check.exitCode !== 0)) errors.push('Independent acceptance check missing or failed');
  const appropriateCheck = id === 'direct-copy' ? ['focused-verification', 'git-inspection', 'file-inspection'] : ['focused-verification'];
  if (!trace.commands.some(cmd => appropriateCheck.includes(cmd.kind) && cmd.exitCode === 0)) errors.push('No successful proportionate verification/inspection observed');
  if (trace.commands.some(cmd => cmd.kind === 'full-verification')) errors.push('Unnecessary full verification observed');
  if (trace.agentToolEvents || trace.explicitQuestionTools || trace.questionMarks) errors.push('Observed delegation or possible repeated question requires review');
  if (id === 'direct-copy' && observation.planExists) errors.push('DIRECT created PLAN');
  if (observation.journalExists) errors.push('Ordinary execution created journal');
  if (id === 'standard-batch') {
    if (!plan || !/Task Mode:\s*STANDARD\b/.test(plan) || /Task Mode:\s*FULL\b/.test(plan)) errors.push('STANDARD mode not preserved');
    if (!plan || (plan.match(/^## /gm) || []).length > 8 || !plan.includes('AC-OLD') || !plan.includes('AC-NEW') || !/AC-NEW[^\n]*VERIFIED/.test(plan)) errors.push('Compact acceptance ledger missing or incomplete');
    if (!plan || !plan.includes('D-1') || !plan.includes('evidence/baseline.json')) errors.push('Frozen decision or applicable baseline evidence lost');
  }
  return { rubric: RUBRIC, passed: errors.length === 0, errors };
}
function independentChecks(root, id) {
  const checks = fixture(id).checks.map(args => {
    const result = cp.spawnSync(process.execPath, args, { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 10000 });
    return { command: 'node ' + args.join(' '), exitCode: result.status, outputDigest: sha((result.stdout || '') + (result.stderr || '')) };
  });
  if (id === 'standard-batch') {
    const script = "const a=require('node:assert/strict'), m=require('./src/clamp.cjs');const v=[-1,1,5];a.deepEqual(m.clampMany(v,0,2),[0,1,2]);a.deepEqual(v,[-1,1,5]);a.notEqual(m.clampMany(v,0,2),v);a.deepEqual(m.clampMany([],0,2),[]);a.throws(()=>m.clampMany(null,0,2),TypeError);a.throws(()=>m.clampMany([NaN],0,2),RangeError);a.equal(m.clamp(3,0,2),2);";
    const result = cp.spawnSync(process.execPath, ['-e', script], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 10000 });
    checks.push({ command: 'independent batch acceptance assertions', exitCode: result.status, outputDigest: sha((result.stdout || '') + (result.stderr || '')) });
  }
  return checks;
}
function safeCleanup(root) {
  const resolved = path.resolve(root), parent = path.resolve(os.tmpdir());
  if (path.dirname(resolved) !== parent || !/^gde-regression-[a-f0-9-]+$/.test(path.basename(resolved))) throw new Error('Scratch cleanup boundary rejected');
  if (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink()) throw new Error('Scratch root replaced by link');
  fs.rmSync(resolved, { recursive: true, force: true });
}
function parseArgs(argv) {
  const options = { timeoutMs: 300000 };
  const names = { '--source-ref': 'sourceRef', '--model': 'model', '--effort': 'effort', '--output': 'output', '--timeout-ms': 'timeoutMs' };
  for (let i = 0; i < argv.length; i += 2) {
    if (!Object.hasOwn(names, argv[i]) || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Expected --source-ref --model --effort --output [--timeout-ms]');
    const key = names[argv[i]];
    if (key !== 'timeoutMs' && Object.hasOwn(options, key)) throw new Error('Repeated option');
    options[key] = argv[i + 1];
  }
  if (!options.sourceRef || !options.model || !options.effort || !options.output) throw new Error('Explicit source, model, effort and output are required');
  if (!['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(options.effort)) throw new Error('Unknown reasoning effort');
  if (!/^[a-zA-Z0-9._-]+$/.test(options.model) || options.sourceRef.startsWith('-')) throw new Error('Unsafe model/ref argument');
  options.timeoutMs = Number(options.timeoutMs);
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1000 || options.timeoutMs > 600000) throw new Error('timeout-ms must be 1000..600000');
  return options;
}
function cliArgs(options, root) {
  // CLI parsing forbids --sandbox together with --approve-for-me. The latter
  // selects workspace-write and automatic approval review itself (exec --help).
  return ['exec', '--ephemeral', '--ignore-user-config', '--json', '--approve-for-me', '-C', root, '-m', options.model, '-c', 'model_reasoning_effort=' + JSON.stringify(options.effort), '-o', path.join(root, '.last-message'), '-'];
}
function caseSummary(result) {
  return { case: result.id, exitCode: result.observed?.process.exitCode ?? null, events: result.observed?.trace.jsonEvents ?? 0, errorCount: result.grading.errors.length };
}
async function main(argv) {
  const options = parseArgs(argv), repo = path.resolve(__dirname, '..'), output = path.resolve(options.output);
  if (fs.existsSync(output)) throw new Error('Output already exists; select a fresh immutable result path');
  const source = sourceFiles(repo, options.sourceRef), sourceDigest = digestFiles(source);
  const report = { schema: 1, rubric: RUBRIC, experiment: 'real-codex-exec', source: { ref: options.sourceRef, digest: sourceDigest }, model: options.model, effort: options.effort,
    host: { platform: process.platform, node: process.version, cliVersion: command('codex', ['--version'], repo).trim() },
    permissions: { sandbox: 'workspace-write', approval: 'automatic-review', ignoreUserConfig: true, ephemeral: true, rulesLoaded: true }, attemptsPerCase: 1, retries: 0, humanInterventions: 0,
    limitations: ['Two independent fresh sessions per source, one observation per fixture; no stability, token or latency improvement claim.', 'Only visible native JSONL events are counted. Unsupported events/tools cannot PASS; hidden activity remains unknown and zero observed agents/questions is not proof of absence.', 'Question punctuation is a conservative review signal, not a semantic question classifier.', 'Command classification accepts exact literal fixture invocations, optionally one PowerShell/pwsh -Command wrapper; unsupported scripts remain unknown. The full-check counter detects extra runs/counter mutation, but is not a tamper-proof audit against deliberate restore.', 'Baseline evidence reuse is observed through preserved receipt/PLAN and unchanged seeded full-check counter, not inferred internal reasoning.', 'Host global instructions, Skill discovery, execpolicy rules and authentication remain in effect; identical host required for paired comparison.', 'Bootstrap failures remain failures; the runner never retries or changes credentials/configuration.'], cases: [] };
  for (const id of ['direct-copy', 'standard-batch']) {
    const root = path.join(os.tmpdir(), 'gde-regression-' + crypto.randomUUID());
    fs.mkdirSync(root);
    let caseResult;
    try {
      const seeded = seed(root, id, source), before = treeFiles(root), fullCheckBefore = fullCheckSnapshot(root);
      const prompt = 'Read and apply the supplied Skill at .fixture-skill/SKILL.md and applicable repository instructions. You are authorized to make the requested local changes and run checks. Do not commit, install, modify global configuration, make remote writes, or start a Goal.\n\n' + seeded.data.task + '\n';
      const args = cliArgs(options, root);
      const started = Date.now(), run = await runCli(args, root, prompt, options.timeoutMs), trace = collect(run.raw);
      // Validate the actor tree before executing any actor-modified verification file.
      const after = treeFiles(root), fullCheckAfter = fullCheckSnapshot(root), changedFiles = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(name => !before[name] || !after[name] || !before[name].equals(after[name])).sort();
      const unsafe = changedFiles.some(name => !seeded.data.allowed.includes(name));
      const checks = unsafe ? [{ command: 'checks withheld: out-of-scope files changed', exitCode: null }] : independentChecks(root, id);
      const observation = { trace, process: { exitCode: run.exitCode, timedOut: run.timedOut, overflow: run.overflow, launchFailed: run.launchFailed, stderrBytes: run.stderrBytes }, changedFiles, fullCheckRuns: { before: fullCheckBefore, after: fullCheckAfter },
        independentChecks: checks, plan: after['PLAN.md']?.toString(), planExists: Object.hasOwn(after, 'PLAN.md'), journalExists: Object.hasOwn(after, '.goal/execution-state.md'),
        sourceIntact: Object.keys(source).every(name => after['.fixture-skill/' + name]?.equals(source[name])) && !changedFiles.some(name => name.startsWith('.fixture-skill/')),
        receiptIntact: !!after['evidence/baseline.json'] && sha(after['evidence/baseline.json']) === seeded.receiptDigest,
        headIntact: command('git', ['rev-parse', 'HEAD'], root).trim() === seeded.baseline,
        finalMessagePresent: fs.existsSync(path.join(root, '.last-message')) && fs.statSync(path.join(root, '.last-message')).size > 0 };
      const grading = grade(id, observation);
      caseResult = { id, attempt: 1, inputDigest: digestFiles(seeded.data.files), promptDigest: sha(prompt), fixtureBaseline: seeded.baseline, priorReceiptDigest: seeded.receiptDigest,
        wallClockMs: Date.now() - started, observed: { ...observation, plan: undefined }, artifacts: Object.entries(after).filter(([name]) => changedFiles.includes(name)).map(([name, bytes]) => ({ path: '<fixture>/' + name, bytes: bytes.length, digest: sha(bytes) })), grading,
        firstFailure: trace.firstFailedCommand || (grading.passed ? null : grading.errors[0]), retries: 0, humanInterventions: 0 };
    } catch (error) {
      caseResult = { id, attempt: 1, grading: { rubric: RUBRIC, passed: false, errors: ['Fixture/bootstrap/collection failure'] }, firstFailure: 'Fixture/bootstrap/collection failure', failureClass: error.code || error.name, retries: 0, humanInterventions: 0 };
    } finally { safeCleanup(root); }
    report.cases.push(caseResult);
    process.stdout.write(JSON.stringify(caseSummary(caseResult)) + '\n');
  }
  report.summary = { passed: report.cases.filter(row => row.grading.passed).length, denominator: report.cases.length };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ rubric: RUBRIC, ...report.summary }) + '\n');
  return report.summary.passed === report.summary.denominator ? 0 : 1;
}
module.exports = { RUBRIC, digestFiles, fixture, collect, grade, parseArgs, sourceFiles, safeCleanup, classifyCommand, cliArgs, fullCheckSnapshot, caseSummary, invocation };
if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; }, () => { process.stderr.write('Execution regression setup failed; no model success claimed.\n'); process.exitCode = 1; });
