'use strict';

// Maintainer-only rubric. Do not include this file in evaluated inputs.
const { cases } = require('./probe.cjs');
const common = { mode: 'DIRECT', artifacts: [] };
const expected = {
  D1: { ...common, review: 'independent', complete: false, next: ['review'] },
  D2: { ...common, review: 'none', verification: [], complete: true, next: ['report'] },
  D3: { ...common, review: 'delta', reuse: ['full', 'review'], complete: false, next: ['review'] },
  D4: { ...common, review: 'pending', complete: false, next: ['stop', 'report', 'wait'] },
  V1: { ...common, delivery: ['blocked', 'failed', 'not_applicable'], complete: false, probes: ['generator', 'parser-zero'] },
  V2: { ...common, review: 'none', verification: ['docs'], reuse: ['full'], complete: false },
  V3: { ...common, verification: ['full'], reuse: [], complete: false },
  X1: { ...common, delivery: 'unknown', complete: false, next: ['investigate', 'stop'], probes: ['status'] },
  X2: { ...common, delivery: 'blocked', complete: false, next: ['wait', 'stop', 'report'], probes: ['status'] },
  X3: { ...common, delivery: ['blocked', 'not_applicable'], complete: false, next: ['stop', 'report'], probes: ['refresh'] },
  X4: { ...common, delivery: 'pending', complete: false, next: ['wait', 'report'], probes: ['status'] },
  X5: { ...common, delivery: 'failed', complete: false, next: ['investigate', 'verify', 'continue'], probes: ['status'] }
};
const enums = {
  mode: ['DIRECT', 'STANDARD', 'FULL'],
  review: ['none', 'independent', 'delta', 'pending'],
  delivery: ['not_applicable', 'ready', 'pending', 'blocked', 'failed', 'unknown'],
  next: ['continue', 'review', 'verify', 'wait', 'investigate', 'stop', 'report']
};
function grade(observations) {
  if (!Array.isArray(observations)) throw new Error('Observations must be an array');
  const failures = [];
  const seen = new Set();
  for (const row of observations) {
    if (!row || !Object.hasOwn(expected, row.id) || seen.has(row.id)) {
      failures.push({ id: row?.id ?? null, rule: 'unknown or duplicate case' });
      continue;
    }
    seen.add(row.id);
    const fail = rule => failures.push({ id: row.id, rule });
    for (const [field, values] of Object.entries(enums)) {
      if (!values.includes(row[field])) fail('invalid ' + field);
    }
    for (const field of ['artifacts', 'verification', 'reuse', 'probes']) {
      if (!Array.isArray(row[field]) || row[field].some(v => typeof v !== 'string') ||
          new Set(row[field]).size !== row[field].length) fail('invalid ' + field);
    }
    for (const [field, allowed] of Object.entries({
      verification: ['affected', 'docs', 'full', 'lint'],
      reuse: ['full', 'review']
    })) {
      if (Array.isArray(row[field]) && row[field].some(v => !allowed.includes(v))) fail('unsupported ' + field);
    }
    if (typeof row.complete !== 'boolean' || typeof row.reason !== 'string' || !row.reason.trim()) fail('missing conclusion or rationale');
    for (const [field, value] of Object.entries(expected[row.id])) {
      if (field === 'next' || (field === 'delivery' && Array.isArray(value))) {
        if (!value.includes(row[field])) fail(field === 'next' ? 'next step' : 'delivery');
      } else if (field === 'probes' || (field === 'reuse' && value.length)) {
        if (!Array.isArray(row[field]) || !value.every(v => row[field].includes(v))) fail('missing ' + field);
      } else if (Array.isArray(value)) {
        if (!Array.isArray(row[field]) || [...row[field]].sort().join('|') !== [...value].sort().join('|')) fail(field);
      } else if (row[field] !== value) fail(field);
    }
    if (row.id === 'D3' && Array.isArray(row.verification) && row.verification.includes('full')) fail('unnecessary full rerun');
    if (['X1', 'X2', 'X3', 'X4'].includes(row.id) && row.verification?.length) fail('unsupported verification while external prerequisite unresolved');
  }
  for (const item of cases) if (!seen.has(item.id)) failures.push({ id: item.id, rule: 'missing case' });
  return { passed: failures.length === 0, caseCount: cases.length, failures };
}
if (require.main === module) {
  try {
    const fs = require('node:fs');
    const result = grade(JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, '')));
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { grade };
