'use strict';

// Collector evidence and independent rationale review are never subject output.
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { cases, operations, probe } = require('./probe.cjs');
const RUBRIC_VERSION = '2.0';
const common = { mode: ['DIRECT'], artifacts: [], reuse: [] };
const expected = {
  D1: { ...common, review: ['independent'], verification: [], complete: false, next: ['review'], delivery: ['pending','not_applicable'] },
  D2: { ...common, review: ['none'], verification: [], complete: true, next: ['report'], delivery: ['ready','not_applicable'] },
  D3: { ...common, review: ['delta'], verification: [], reuse: ['full','review'], complete: false, next: ['review'], delivery: ['pending','not_applicable'] },
  D4: { ...common, review: ['pending'], verification: [], complete: false, next: ['stop','report','wait'], delivery: ['blocked','not_applicable'] },
  V1: { ...common, review: ['none'], verification: [], complete: false, next: ['report','stop'], delivery: ['blocked','failed','not_applicable'], requiredProbes: ['generator','parser-zero'] },
  V2: { ...common, review: ['none'], verification: ['docs'], reuse: ['full'], complete: false, next: ['verify'], delivery: ['pending','not_applicable'] },
  V3: { ...common, review: ['none'], verification: ['full'], complete: false, next: ['verify'], delivery: ['pending','not_applicable'] },
  X1: { ...common, review: ['none'], verification: [], complete: false, next: ['investigate','stop'], delivery: ['unknown'], requiredProbes: ['status'] },
  X2: { ...common, review: ['none'], verification: [], complete: false, next: ['wait','stop','report'], delivery: ['blocked'], requiredProbes: ['status'] },
  X3: { ...common, review: ['none'], verification: [], complete: false, next: ['stop','report'], delivery: ['blocked','not_applicable'], requiredProbes: ['refresh'] },
  X4: { ...common, review: ['none'], verification: [], complete: false, next: ['wait','report'], delivery: ['pending'], requiredProbes: ['status'] },
  X5: { ...common, review: ['none'], verificationAllowed: ['affected','lint','full'], complete: false, next: ['investigate','verify','continue'], delivery: ['failed'], requiredProbes: ['status'] }
};
const claimKeys = ['id','mode','artifacts','review','verification','reuse','delivery','complete','next','probes','reason'];
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => record(value) && keys.every(key => Object.hasOwn(value,key)) &&
  Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
const strings = value => Array.isArray(value) && value.every(x => typeof x === 'string') && new Set(value).size === value.length;
const sameSet = (a,b) => strings(a) && strings(b) && isDeepStrictEqual([...a].sort(),[...b].sort());
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

function reviewDigest(row) {
  if (!record(row?.claim) || !record(row?.observed)) return null;
  return digest({ claim: Object.fromEntries(claimKeys.map(key => [key,row.claim[key]])), observed: row.observed });
}
function grade(bundle) {
  const failures = [];
  const fail = (id, layer, rule) => failures.push({ id, layer, rule });
  if (!exactKeys(bundle,['rubricVersion','run','observations']) || bundle.rubricVersion !== RUBRIC_VERSION ||
      !exactKeys(bundle.run,['id','kind','sourceRef','model','effort','attempt','retries','humanInterventions']) ||
      !['decision-evaluation','historical-decision-evaluation','scorer-test'].includes(bundle.run.kind) ||
      !['id','sourceRef','model','effort'].every(key => nonempty(bundle.run[key])) ||
      !Number.isInteger(bundle.run.attempt) || bundle.run.attempt < 1 ||
      !Number.isInteger(bundle.run.retries) || bundle.run.retries < 0 ||
      !Number.isInteger(bundle.run.humanInterventions) || bundle.run.humanInterventions < 0 ||
      !Array.isArray(bundle.observations)) {
    return { rubricVersion: RUBRIC_VERSION, runKind: null, evidenceLevel: 'invalid-envelope', passed: false, decisionPassed: false, evidencePassed: false,
      rationaleReviewed: false, caseCount: cases.length, failures: [{id:null,layer:'schema',rule:'invalid versioned observation envelope'}] };
  }
  const seen = new Set();
  for (const row of bundle.observations) {
    if (!exactKeys(row,['claim','observed','rationaleReview']) || !exactKeys(row.claim,claimKeys) ||
        typeof row.claim.id !== 'string' || !Object.hasOwn(expected,row.claim.id) || seen.has(row.claim.id)) {
      fail(null,'schema','invalid, unknown or duplicate claim'); continue;
    }
    const c = row.claim, id = c.id, oracle = expected[id]; seen.add(id);
    for (const field of ['artifacts','verification','reuse','probes']) if (!strings(c[field])) fail(id,'schema','invalid '+field);
    if (typeof c.complete !== 'boolean' || !nonempty(c.reason)) fail(id,'schema','missing conclusion or rationale');
    for (const field of ['mode','review','delivery','next']) if (!oracle[field].includes(c[field])) fail(id,'decision',field);
    for (const field of ['artifacts','reuse']) if (!sameSet(c[field],oracle[field])) fail(id,'decision',field);
    if (oracle.verification && !sameSet(c.verification,oracle.verification)) fail(id,'decision','verification');
    if (oracle.verificationAllowed && (!strings(c.verification) || c.verification.some(x => !oracle.verificationAllowed.includes(x)))) fail(id,'decision','verification');
    if (c.complete !== oracle.complete) fail(id,'decision','completion');
    if (!strings(c.probes) || c.probes.some(op => op === 'input' || !operations[id].includes(op)) ||
        !(oracle.requiredProbes || []).every(op => c.probes.includes(op))) fail(id,'decision','undeclared or missing probe');
    const o = row.observed;
    if (!exactKeys(o,['source','locator','traceSha256','inputRead','probes','actions']) ||
        !['captured-tool-output','unit-test'].includes(o.source) || !nonempty(o.locator) ||
        typeof o.traceSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(o.traceSha256) ||
        o.inputRead !== true || !Array.isArray(o.probes) || !Array.isArray(o.actions) ||
        (bundle.run.kind !== 'scorer-test' && o.source !== 'captured-tool-output')) {
      fail(id,'evidence','invalid collector evidence');
    } else {
      const actualOps = [];
      for (const event of o.probes) {
        if (!exactKeys(event,['operation','result']) || typeof event.operation !== 'string' ||
            event.operation === 'input' || !operations[id].includes(event.operation)) {
          fail(id,'evidence','undeclared observed probe'); continue;
        }
        actualOps.push(event.operation);
        if (!isDeepStrictEqual(event.result,probe(id,event.operation))) fail(id,'evidence','probe result mismatch');
      }
      if (!sameSet(c.probes,actualOps)) fail(id,'evidence','claim does not match successful observed probes');
      if (o.actions.length !== 0) fail(id,'evidence','follow-up action executed outside decision-only scope');
    }
    const r = row.rationaleReview;
    if (!exactKeys(r,['status','reviewer','digest','note']) || r.status !== 'consistent' ||
        !nonempty(r.reviewer) || !nonempty(r.note) || r.digest !== reviewDigest(row)) {
      fail(id,'rationale','independent rationale review missing, conflicting or stale');
    }
  }
  for (const item of cases) if (!seen.has(item.id)) fail(item.id,'schema','missing case');
  return { rubricVersion:RUBRIC_VERSION, runKind:bundle.run.kind,
    evidenceLevel:bundle.run.kind === 'scorer-test' ? 'synthetic-scorer-test' : 'captured-decision-only', passed:failures.length===0,
    decisionPassed:!failures.some(f => ['schema','decision'].includes(f.layer)),
    evidencePassed:!failures.some(f => ['schema','evidence'].includes(f.layer)),
    rationaleReviewed:!failures.some(f => ['schema','rationale'].includes(f.layer)), caseCount:cases.length, failures };
}
function cli(file) {
  try {
    const result = grade(JSON.parse(require('node:fs').readFileSync(file,'utf8').replace(/^\uFEFF/,'')));
    console.log(JSON.stringify(result,null,2)); if (!result.passed) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode=1; }
}
if (require.main === module) cli(process.argv[2]);
module.exports = { RUBRIC_VERSION, grade, reviewDigest, cli };
