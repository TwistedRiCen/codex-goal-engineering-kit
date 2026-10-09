'use strict';

// Explicit-source importer for the two original decision evaluations only.
// Reads final claims and bounded captured fixture output; never exports thought traces.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { cases } = require('../examples/behavior-fixtures/probe.cjs');
const { RUBRIC_VERSION, reviewDigest } = require('../examples/behavior-fixtures/score.cjs');
const probeOrder = [['V1','generator'],['V1','parser-zero'],['V1','parser-valid'],['X1','status'],['X2','status'],['X3','refresh'],['X4','status'],['X5','status']];
const profiles = {
  baseline:{uuid:'01a08aa4-1d88-7d52-9261-c9501e643035',finalLine:35,inputCall:22,inputOutput:25,probeCall:27,probeOutput:30,
    sourceRef:'c38eaaebe582daeda5511c71ea8f692b445a1594'},
  candidate:{uuid:'01a08aa7-cee1-7422-bf72-443afa4b41e6',finalLine:30,inputCall:22,inputOutput:25,probeCall:22,probeOutput:25,
    sourceRef:'historical-candidate-SKILL-sha256:e934952fb78f1d253a3b069bfd74e8e9f874d528fa6cf8a7c2905300a3aaa797'}
};
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
function requireCondition(value,message) { if(!value) throw new Error(message); }

// Decode concatenated JSON without evaluating source or accepting incomplete values.
function jsonValues(text) {
  const values=[]; let pos=0;
  while(pos<text.length) {
    while(/\s/.test(text[pos]||'') && pos<text.length)pos++;
    if(pos===text.length)break;
    const start=pos; let quoted=false,escaped=false,depth=0;
    requireCondition(['{','[','"'].includes(text[pos]),'Unexpected text in captured fixture output');
    for(;pos<text.length;pos++) {
      const char=text[pos];
      if(quoted) {
        if(escaped)escaped=false;
        else if(char==='\\')escaped=true;
        else if(char==='"') {quoted=false;if(depth===0){pos++;break;}}
      } else if(char==='"')quoted=true;
      else if(char==='{'||char==='[')depth++;
      else if(char==='}'||char===']') {depth--;if(depth===0){pos++;break;}}
    }
    requireCondition(!quoted && depth===0,'Incomplete captured JSON');
    values.push(JSON.parse(text.slice(start,pos)));
  }
  return values;
}
function capturedOutput(records,callLine,outputLine) {
  const call=records[callLine-1], output=records[outputLine-1];
  requireCondition(call?.type==='response_item' && call.payload?.type==='custom_tool_call' && call.payload.name==='exec','Missing original fixture call');
  requireCondition(output?.type==='response_item' && output.payload?.type==='custom_tool_call_output' && output.payload.call_id===call.payload.call_id,'Unmatched original fixture output');
  const results=[];
  for(const item of output.payload.output||[]) {
    if(item.type!=='input_text' || typeof item.text!=='string')continue;
    try { const result=JSON.parse(item.text); if(Object.hasOwn(result,'exit_code') && Object.hasOwn(result,'output'))results.push(result); } catch { /* Non-JSON tool wrapper only. */ }
  }
  requireCondition(results.length===1 && results[0].exit_code===0 && typeof results[0].output==='string','Missing successful captured command result');
  return {text:results[0].output,callId:call.payload.call_id,input:call.payload.input};
}
function extractHistorical(file,group) {
  const profile=profiles[group]; requireCondition(profile,'Unsupported historical group');
  requireCondition(path.basename(file).includes(profile.uuid),'Source file is not the expected original evaluation');
  const records=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(line=>JSON.parse(line));
  const final=records[profile.finalLine-1];
  requireCondition(final?.type==='response_item' && final.payload?.type==='message' && final.payload.role==='assistant' && final.payload.phase==='final_answer','Missing original assistant final');
  const finals=(final.payload.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('\n');
  const blocks=[...finals.matchAll(/```json\s*([\s\S]*?)```/g)]; requireCondition(blocks.length===1,'Expected one original final JSON block');
  const claims=JSON.parse(blocks[0][1]);
  requireCondition(Array.isArray(claims) && claims.length===cases.length,'Missing original claims');
  assert.deepEqual(claims.map(claim=>claim.id),cases.map(item=>item.id),'Original claim order differs from fixture');
  const inputs=capturedOutput(records,profile.inputCall,profile.inputOutput);
  const named=profile.inputCall===profile.probeCall?inputs:capturedOutput(records,profile.probeCall,profile.probeOutput);
  // Candidate first reads a reference document. Discard it before parsing inputs.
  const start=inputs.text.search(/\{\s*"id"\s*:\s*"D1"/); requireCondition(start>=0,'Captured D1 input missing');
  const inputValues=jsonValues(inputs.text.slice(start));
  const expectedInputCount=cases.length+(inputs===named?probeOrder.length:0);
  requireCondition(inputValues.length===expectedInputCount,'Unexpected or missing captured input/probe values');
  assert.deepEqual(inputValues.slice(0,cases.length),cases,'Historical input bytes do not represent the current fixture values');
  const namedValues=inputs===named?inputValues.slice(cases.length):jsonValues(named.text);
  requireCondition(namedValues.length===probeOrder.length,'Missing original named probe output');
  // Verify operation order from the original successful invocation, without regenerating results.
  let previous=-1;
  for(const [id,operation] of probeOrder) {
    const index=named.input.indexOf(id+' '+operation);
    requireCondition(index>previous,'Original named probe invocation order is missing or altered');previous=index;
  }
  const failedCalls=records.filter(item=>item.type==='response_item' && item.payload?.type==='custom_tool_call_output' &&
    (item.payload.output||[]).some(block=>typeof block.text==='string' && block.text.includes('helper_unknown_error')));
  requireCondition(failedCalls.length===1,'Unexpected historical environment retry count');
  const traceSha256=hash(JSON.stringify({inputCall:inputs.callId,inputOutput:inputs.text,probeCall:named.callId,probeOutput:named.text}));
  const observations=claims.map(claim=>{
    const row={claim,observed:{source:'captured-tool-output',locator:profile.uuid+':input-line-'+profile.inputOutput+':probe-line-'+profile.probeOutput,
      traceSha256,inputRead:true,probes:probeOrder.flatMap(([id,operation],index)=>id===claim.id?[{operation,result:namedValues[index]}]:[]),actions:[]}};
    row.rationaleReview={status:'unreviewed',reviewer:'pending',digest:reviewDigest(row),note:'Independent semantic review pending; original rationale retained.'};
    return row;
  });
  return {rubricVersion:RUBRIC_VERSION,run:{id:'historical-'+group+'-'+profile.uuid,kind:'historical-decision-evaluation',sourceRef:profile.sourceRef,
    model:'not-captured',effort:'not-captured',attempt:1,retries:1,humanInterventions:0},observations};
}
function cli(args) {
  requireCondition(args.length===3,'Usage: node scripts/import-historical-observations.cjs <baseline|candidate> <explicit-original-session.jsonl> <output.json>');
  const [group,source,output]=args; const bundle=extractHistorical(source,group);
  fs.writeFileSync(output,JSON.stringify(bundle,null,2)+'\n','utf8');
  console.log(JSON.stringify({group,caseCount:bundle.observations.length,review:'pending',output:path.basename(output)}));
}
if(require.main===module) {try{cli(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={jsonValues,capturedOutput,extractHistorical};
