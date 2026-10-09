'use strict';

// Offline inputs only: no network, filesystem mutation, installation or real delivery.
const cases = require('./cases.json');
const operations = Object.freeze(Object.fromEntries(cases.map(item => [item.id, Object.freeze([
  'input', ...(item.id === 'V1' ? ['generator', 'parser-zero', 'parser-valid'] :
    item.id === 'X3' ? ['refresh'] : /^X[1245]$/.test(item.id) ? ['status'] : [])
])])));

function parseFragment(text) {
  const match = /^pr: (\d+)\nbody: (.+)$/.exec(text);
  if (!match) return { ok: false, reason: 'malformed' };
  const pr = Number(match[1]);
  return Number.isSafeInteger(pr) && pr > 0
    ? { ok: true, pr, body: match[2] }
    : { ok: false, reason: 'invalid_pr' };
}

function probe(id, operation = 'input') {
  if (typeof id !== 'string' || !Object.hasOwn(operations, id)) throw new Error('Unknown case: ' + String(id));
  if (typeof operation !== 'string' || !operations[id].includes(operation)) {
    throw new Error('Unsupported read-only probe for ' + id + ': ' + String(operation));
  }
  const item = cases.find(item => item.id === id);
  if (!item) throw new Error('Unknown case: ' + id);
  if (operation === 'input') return item;
  if (id === 'V1') {
    if (operation === 'generator') return 'pr: 0\nbody: example';
    if (operation === 'parser-zero') return parseFragment('pr: 0\nbody: example');
    if (operation === 'parser-valid') return parseFragment('pr: 23\nbody: example');
  }
  const responses = {
    X1: { status: { outcome: 'unknown', objectId: null, priorCreateAttempts: 1 } },
    X2: { status: { status: 'completed', conclusion: 'action_required', reason: 'maintainer approval required', testsExecuted: false } },
    X3: { refresh: { snapshot: 't1', state: 'closed', competingDelivery: 'accepted', targetRevision: 'b2' } },
    X4: { status: { status: 'queued', conclusion: null, requestAccepted: true } },
    X5: { status: { status: 'completed', conclusion: 'failure', testsExecuted: true, failure: 'assertion: expected no duplicate restore' } }
  };
  if (Object.hasOwn(responses, id) && Object.hasOwn(responses[id], operation)) return responses[id][operation];
  throw new Error('Unsupported read-only probe for ' + id + ': ' + operation);
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(probe(process.argv[2], process.argv[3]), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { cases, operations, parseFragment, probe };
