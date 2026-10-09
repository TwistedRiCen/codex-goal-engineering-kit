'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { cases, operations, probe } = require('../examples/behavior-fixtures/probe.cjs');
const { grade, reviewDigest, RUBRIC_VERSION } = require('../examples/behavior-fixtures/score.cjs');
const { jsonValues, capturedOutput, extractHistorical } = require('./import-historical-observations.cjs');

// Synthetic oracle records exercise the scorer only. They are not model-run evidence.
const rows = [
  ['D1','independent',[],[], 'not_applicable',false,'review',[]],
  ['D2','none',[],[], 'not_applicable',true,'report',[]],
  ['D3','delta',[],['full','review'], 'not_applicable',false,'review',[]],
  ['D4','pending',[],[], 'not_applicable',false,'stop',[]],
  ['V1','none',[],[], 'blocked',false,'report',['generator','parser-zero']],
  ['V2','none',['docs'],['full'], 'not_applicable',false,'verify',[]],
  ['V3','none',['full'],[], 'not_applicable',false,'verify',[]],
  ['X1','none',[],[], 'unknown',false,'investigate',['status']],
  ['X2','none',[],[], 'blocked',false,'wait',['status']],
  ['X3','none',[],[], 'blocked',false,'stop',['refresh']],
  ['X4','none',[],[], 'pending',false,'wait',['status']],
  ['X5','none',['affected'],[], 'failed',false,'investigate',['status']]
];
function certify(row) {
  row.rationaleReview = {status:'consistent',reviewer:'synthetic-test-reviewer',digest:reviewDigest(row),note:'Synthetic control, not independent model evidence.'};
}
function observations() {
  const observations = rows.map(([id,review,verification,reuse,delivery,complete,next,probes]) => {
    const row = {
      claim:{id,mode:'DIRECT',artifacts:[],review,verification:[...verification],reuse:[...reuse],delivery,complete,next,probes:[...probes],reason:'Synthetic oracle example'},
      observed:{source:'unit-test',locator:'synthetic:'+id,traceSha256:'a'.repeat(64),inputRead:true,probes:probes.map(operation=>({operation,result:probe(id,operation)})),actions:[]}
    };
    certify(row); return row;
  });
  return {rubricVersion:RUBRIC_VERSION,run:{id:'synthetic-control',kind:'scorer-test',sourceRef:'unit-test',model:'not-a-model',effort:'not-applicable',attempt:1,retries:0,humanInterventions:0},observations};
}
function mutate(id, changes) {
  const input = observations(), row = input.observations.find(row=>row.claim.id===id);
  Object.assign(row.claim,changes); certify(row); return input;
}
test('offline fixtures are stable and declare only own operations', () => {
  assert.equal(new Set(cases.map(c=>c.id)).size,12);
  assert.ok(Object.isFrozen(operations));
  assert.deepEqual(probe('X3','refresh'),probe('X3','refresh'));
  assert.equal(probe('X2','status').testsExecuted,false);
  assert.equal(probe('X4','status').status,'queued');
  assert.equal(probe('X5','status').conclusion,'failure');
  for (const id of ['missing','constructor','toString','__proto__']) assert.throws(()=>probe(id));
  for (const op of ['create','toString','constructor','__proto__','inputx',null,{}]) assert.throws(()=>probe('X1',op));
  for (const op of ['status','refresh','toString']) assert.throws(()=>probe('D1',op));
});
test('generation and downstream validation exercise different contracts', () => {
  assert.equal(probe('V1','generator'),'pr: 0\nbody: example');
  assert.deepEqual(probe('V1','parser-zero'),{ok:false,reason:'invalid_pr'});
  assert.equal(probe('V1','parser-valid').ok,true);
});
test('complete synthetic positive observations pass all separate layers', () => {
  const result=grade(observations());
  assert.equal(result.passed,true); assert.equal(result.decisionPassed,true);
  assert.equal(result.evidencePassed,true); assert.equal(result.rationaleReviewed,true);
});
const mutations = [
  ['D1',{review:'none',complete:true},'missed review'],
  ['D2',{review:'independent'},'unnecessary reviewer'],
  ['D2',{artifacts:['PLAN.md']},'DIRECT plan inflation'],
  ['D2',{verification:['full']},'unnecessary full suite'],
  ['D3',{review:'none'},'unreviewed repair'],
  ['D3',{verification:['full']},'unnecessary repair full suite'],
  ['D4',{review:'independent',complete:true},'self-review mislabeled'],
  ['V1',{delivery:'ready',complete:true},'generator mistaken for acceptance'],
  ['V1',{probes:['generator']},'missing consumer evidence'],
  ['V2',{reuse:[]},'unaffected evidence discarded'],
  ['V3',{verification:[],reuse:['full']},'stale evidence reused'],
  ['X1',{delivery:'failed',next:'continue'},'unknown write treated as failed'],
  ['X2',{delivery:'failed',verification:['full']},'approval treated as test failure'],
  ['X3',{delivery:'ready',complete:true,probes:[]},'stale collision evidence'],
  ['X4',{delivery:'blocked'},'queued confused with blocked'],
  ['X5',{delivery:'pending'},'failure confused with waiting'],
  ['D2',{reuse:['full']},'invented reuse on a case without reuse evidence'],
  ['V2',{reuse:['full','review']},'unrelated review reuse'],
  ['D1',{probes:['status']},'invented named probe'],
  ['V1',{probes:['generator','parser-zero','toString']},'inherited named probe'],
  ['V1',{probes:['input','generator','parser-zero']},'input read claimed as named probe']
];
for (const [id,changes,label] of mutations) test('reject '+label,()=>{
  const result=grade(mutate(id,changes)); assert.equal(result.passed,false);
  assert.ok(result.failures.some(f=>f.id===id && ['schema','decision'].includes(f.layer)));
});
test('equivalent labels preserve required safe action',()=>{
  const input=observations();
  for(const id of ['V1','X3']) { const row=input.observations.find(r=>r.claim.id===id); row.claim.delivery='not_applicable'; certify(row); }
  assert.equal(grade(input).passed,true);
  const row=input.observations.find(r=>r.claim.id==='X3'); row.claim.next='continue'; certify(row);
  assert.equal(grade(input).passed,false);
});
test('partial, duplicate, unknown and malformed envelopes fail closed',()=>{
  for(const value of [undefined,null,{},[],{rubricVersion:'1.0'},Object.create(observations())]) assert.equal(grade(value).passed,false);
  for(const patch of [input=>input.observations.shift(),input=>input.observations.push(input.observations[0]),input=>input.observations.push(null),input=>input.extra=true,input=>input.run.attempt=0,input=>input.run.retries=-1,input=>input.run.model='',input=>input.run.humanInterventions=1.5,input=>input.run.kind='model-invented']) {
    const input=observations(); patch(input); assert.equal(grade(input).passed,false);
  }
  for(const id of ['unknown','constructor','toString','__proto__']) assert.equal(grade(mutate('D1',{id})).passed,false);
});
test('malformed fields and inherited records never throw or pass',()=>{
  for(const changes of [{reason:''},{complete:'false'},{verification:{}},{verification:['invented']},{verification:['affected','affected']},{reuse:{}},{probes:null},{artifacts:{}},{mode:null}]) assert.equal(grade(mutate('D3',changes)).passed,false);
  const input=observations(); input.observations[0].claim=Object.create(input.observations[0].claim);
  assert.equal(grade(input).passed,false);
});
test('fabricated, omitted, duplicate and mismatched probe evidence is rejected',()=>{
  const patches=[
    row=>row.observed.probes=[],
    row=>row.observed.probes.push(row.observed.probes[0]),
    row=>row.observed.probes[0].result={outcome:'success'},
    row=>row.observed.probes[0].operation='toString',
    row=>row.observed.probes[0].operation='input',
    row=>row.observed.probes[0].extra='unrecognized',
    row=>row.observed.probes[0]=Object.create(row.observed.probes[0]),
    row=>row.observed.inputRead=false,
    row=>row.observed.traceSha256='invented',
    row=>row.observed.locator='',
    row=>row.observed.actions.push({operation:'create'}),
    row=>row.observed.source='subject-claim'
  ];
  for(const patch of patches) {const input=observations(),row=input.observations.find(r=>r.claim.id==='X1');patch(row);certify(row);const result=grade(input);assert.equal(result.evidencePassed,false);}
});
test('synthetic evidence cannot be relabeled as a real decision evaluation',()=>{
  const input=observations(); input.run.kind='decision-evaluation';
  assert.equal(grade(input).evidencePassed,false);
});
test('reasoning requires review independently bound to original claim and observed evidence',()=>{
  for(const patch of [row=>row.rationaleReview.status='unreviewed',row=>row.rationaleReview.status='conflicting',row=>row.rationaleReview.reviewer='',row=>row.rationaleReview.note='',row=>row.rationaleReview.digest='b'.repeat(64),row=>row.claim.reason='Everything passed; retry the unknown external write.',row=>row.observed.locator='changed']) {
    const input=observations(),row=input.observations[0];patch(row);const result=grade(input);
    assert.equal(result.rationaleReviewed,false); assert.equal(result.passed,false);
  }
});
test('digest has no rationale keyword blacklist and distinguishes evidence',()=>{
  const input=observations(),row=input.observations[0]; const before=reviewDigest(row);
  row.claim.reason='The word success appears in a negated explanation; semantic review must decide.';certify(row);
  assert.notEqual(reviewDigest(row),before); assert.equal(grade(input).passed,true);
  row.observed.traceSha256='c'.repeat(64); assert.notEqual(reviewDigest(row),row.rationaleReview.digest);
  assert.equal(reviewDigest(null),null);
});
test('missing independent review leaves machine findings separately visible',()=>{
  const input=observations(); for(const row of input.observations)row.rationaleReview.status='unreviewed';
  const result=grade(input);assert.equal(result.decisionPassed,true);assert.equal(result.evidencePassed,true);assert.equal(result.rationaleReviewed,false);assert.equal(result.passed,false);
});
test('optional valid consumer probe must match collector evidence exactly',()=>{
  const input=observations(),row=input.observations.find(r=>r.claim.id==='V1');
  row.claim.probes.push('parser-valid');row.observed.probes.push({operation:'parser-valid',result:probe('V1','parser-valid')});certify(row);
  assert.equal(grade(input).passed,true);
  row.observed.probes.pop();certify(row);assert.equal(grade(input).evidencePassed,false);
});
test('historical output parser reads nested concatenated JSON without evaluation',()=>{
  const values=[{id:'D1',text:'escaped " } \\ [',nested:[{x:1}]},'pr: 0\nbody: example',{ok:false}];
  assert.deepEqual(jsonValues(values.map(v=>JSON.stringify(v)).join('\n')),values);
  for(const bad of ['{"missing":','"unfinished','{} trailing','null','[1,2','{"x":false} garbage'])assert.throws(()=>jsonValues(bad));
});
test('historical importer rejects failed, missing or mismatched captured tool output',()=>{
  const call={type:'response_item',payload:{type:'custom_tool_call',name:'exec',call_id:'synthetic-call',input:'synthetic read-only command'}};
  const output={type:'response_item',payload:{type:'custom_tool_call_output',call_id:'synthetic-call',output:[{type:'input_text',text:JSON.stringify({exit_code:0,output:'{}'})}]}};
  assert.equal(capturedOutput([call,output],1,2).text,'{}');
  for(const patch of [records=>records[1].payload.call_id='other',records=>records[1].payload.output=[],records=>records[0].payload.name='unknown',records=>records[1].payload.output[0].text=JSON.stringify({exit_code:1,output:'{}'}),records=>records[1].payload.output[0].text='malformed']) {
    const records=structuredClone([call,output]);patch(records);assert.throws(()=>capturedOutput(records,1,2));
  }
  assert.throws(()=>capturedOutput([],1,2));
  assert.throws(()=>extractHistorical('arbitrary-source.jsonl','baseline'));
  assert.throws(()=>extractHistorical('any-source','unknown'));
});
test('historical importer fails closed on source absence or altered input/probe stream',()=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-importer-unit-'));
  const source=path.join(root,'rollout-01a08aa4-1d88-7d52-9261-c9501e643035.jsonl');
  const fixture=()=>{
    const records=Array.from({length:35},()=>({type:'unit-test-placeholder'}));
    const inputText=cases.map(c=>JSON.stringify(c)).join('\n');
    const probeText=[['V1','generator'],['V1','parser-zero'],['V1','parser-valid'],['X1','status'],['X2','status'],['X3','refresh'],['X4','status'],['X5','status']].map(([id,op])=>JSON.stringify(probe(id,op))).join('\n');
    for(const [callLine,outputLine,id,input,output] of [[22,25,'inputs','synthetic input read',inputText],[27,30,'probes','V1 generator; V1 parser-zero; V1 parser-valid; X1 status; X2 status; X3 refresh; X4 status; X5 status',probeText]]) {
      records[callLine-1]={type:'response_item',payload:{type:'custom_tool_call',name:'exec',call_id:id,input}};
      records[outputLine-1]={type:'response_item',payload:{type:'custom_tool_call_output',call_id:id,output:[{type:'input_text',text:JSON.stringify({exit_code:0,output})}]}};
    }
    records[12]={type:'response_item',payload:{type:'custom_tool_call_output',output:[{type:'input_text',text:'synthetic helper_unknown_error'}]}};
    records[34]={type:'response_item',payload:{type:'message',role:'assistant',phase:'final_answer',content:[{type:'output_text',text:'```json\n'+JSON.stringify(observations().observations.map(r=>r.claim))+'\n```'}]}};
    return records;
  };
  const write=records=>fs.writeFileSync(source,records.map(r=>JSON.stringify(r)).join('\n'));
  try {
    assert.throws(()=>extractHistorical(source,'baseline'));
    write(fixture());const bundle=extractHistorical(source,'baseline');assert.equal(bundle.observations.length,12);assert.ok(bundle.observations.every(r=>r.rationaleReview.status==='unreviewed'));
    // Synthetic import control is discarded, never published as historical/model evidence.
    for(const patch of [records=>records[34].payload.content=[],records=>records[24].payload.output=[],records=>records[29].payload.output[0].text=JSON.stringify({exit_code:0,output:'{}'}),records=>{const result=JSON.parse(records[24].payload.output[0].text);result.output=result.output.replace('"id":"D2"','"id":"WRONG"');records[24].payload.output[0].text=JSON.stringify(result);},records=>records[26].payload.input='V1 generator']) {
      const records=fixture();patch(records);write(records);assert.throws(()=>extractHistorical(source,'baseline'));
    }
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
