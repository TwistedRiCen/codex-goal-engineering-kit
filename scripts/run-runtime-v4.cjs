'use strict';
// Explicitly invoked paid experiment; no models are called by unit tests.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const { RuntimeHost } = require('./runtime-host-v4.cjs');
const { createCollector } = require('./runtime-observation-v2.cjs');
const { fixture } = require('./run-execution-regression.cjs'); // Frozen input only; never regrade old results.
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const skill = process.env.GDE_RUNTIME_SKILL || path.join(process.env.USERPROFILE || process.env.HOME || '', '.agents/skills/goal-driven-engineering');
const binary = process.env.GDE_RUNTIME_BINARY || 'codex';
function assertRuntimePrivacy(id) {
  // Current official alpha.17.2 has mandatory native TRACE SQLite logging.
  // Harness redaction, RUST_LOG=off and ephemeral do not prove host privacy.
  // No override flag: a future supported mechanism needs fresh implementation,
  // public source evidence, negative controls and independent isolation review.
  if(['E1','E2','E3','E4'].includes(id))throw Error('HOST_MODEL_PRIVACY_UNPROVEN');
}
function git(root,args) { const r=cp.spawnSync('git',['-c','safe.directory='+fs.realpathSync(root),...args],{cwd:root,encoding:'utf8',windowsHide:true}); if(r.status!==0)throw Error('FIXTURE_GIT_FAILED');return r.stdout.trim(); }
function writeOnce(file,value) { fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'}); }
function publicFiles(root,prefix='') { const out={};for(const name of fs.readdirSync(path.join(root,prefix)).sort()){if(name==='.git')continue;const rel=prefix?prefix+'/'+name:name,full=path.join(root,rel),s=fs.lstatSync(full);if(s.isSymbolicLink())throw Error('FIXTURE_LINK_DENIED');if(s.isDirectory())Object.assign(out,publicFiles(root,rel));else if(s.isFile()){if(s.size>128*1024)throw Error('FIXTURE_FILE_TOO_LARGE');out[rel]=fs.readFileSync(full,'utf8');}}return out; }
function safeTarget(root,relative,write=false) {
  if(typeof relative!=='string'||!relative||relative.length>180||relative.includes('\\')||path.isAbsolute(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..'||p==='.git'))throw Error('FIXTURE_PATH_DENIED');
  const full=path.resolve(root,relative);if(!full.startsWith(fs.realpathSync(root)+path.sep))throw Error('FIXTURE_PATH_DENIED');
  let current=root;for(const part of relative.split('/')){current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('FIXTURE_LINK_DENIED');}
  if(!write&&fs.realpathSync(full)!==full)throw Error('FIXTURE_ALIAS_DENIED');return full;
}
function scenario(id) {
  if(id==='E1') {const f=fixture('direct-copy');f.files['scripts/check-copy.cjs']="const fs=require('fs');if(fs.readFileSync('copy.txt','utf8')!=='Welcome to the learning center.\\n')process.exit(1);console.log('COPY_CHECK_PASS');\n"; return {...f,focused:['scripts/check-copy.cjs']};}
  if(id==='E3'){const f=fixture('standard-batch');f.files['scripts/acceptance.cjs']="const assert=require('node:assert/strict'),{clamp,clampMany}=require('../src/clamp.cjs');const input=[-1,1,3],out=clampMany(input,0,2);assert.deepEqual(out,[0,1,2]);assert.notStrictEqual(out,input);assert.deepEqual(input,[-1,1,3]);assert.deepEqual(clampMany([],0,2),[]);assert.throws(()=>clampMany(null,0,2),TypeError);assert.throws(()=>clampMany([NaN],0,2),RangeError);assert.throws(()=>clampMany([1],2,0),RangeError);assert.equal(clamp(3,0,2),2);console.log('INDEPENDENT_ACCEPTANCE_PASS');\n";return {...f,focused:['--test','test/clamp.test.cjs']};}
  if(id==='E2') {
    const f=fixture('direct-copy'); delete f.files['copy.txt']; delete f.files['scripts/check-copy.cjs'];
    f.files['src/divide.cjs']="'use strict';function divide(a,b){return a/b;}module.exports={divide};\n";
    f.files['API.md']='Public divide(a,b) currently returns a/b, including Infinity for zero denominator.\n';
    f.files['test/divide.test.cjs']="const test=require('node:test'),assert=require('node:assert/strict');const{divide}=require('../src/divide.cjs');test('ordinary division',()=>assert.equal(divide(6,2),3));\n";
    f.files['scripts/acceptance.cjs']="const assert=require('node:assert/strict'),{divide}=require('../src/divide.cjs');assert.throws(()=>divide(1,+0),RangeError);assert.throws(()=>divide(1,-0),RangeError);assert.equal(divide(6,2),3);assert.equal(divide(-4,2),-2);assert.equal(divide(2,Infinity),0);assert.equal(Number.isNaN(divide(2,NaN)),true);console.log('INDEPENDENT_ACCEPTANCE_PASS');\n";
    return {...f,allowed:['src/divide.cjs','test/divide.test.cjs','API.md','PLAN.md'],focused:['--test','test/divide.test.cjs'],task:'Initial request: a small divide fix. Inspection reveals a PUBLIC API contract change. Owner has approved changing both +0 and -0 denominator to throw RangeError, retaining ordinary division. Assess risk and select the appropriate workflow before substantial implementation. Implement this bounded contract change, document API and add positive/negative focused tests. Persistent acceptance state is useful for the multi-file contract. A separate harness-controlled read-only reviewer will inspect the final baseline and diff; do not self-claim that review PASSED before receiving it.'};
  }
  if(id==='E4') {const f=fixture('standard-batch'); f.files['evidence/old-receipt.json']='{"schema":1,"dependencies":"v1","exitCode":0}\n';f.files['dependencies.json']='{"version":"v2"}\n';return {...f,allowed:[],focused:[],task:'Read-only evidence review: dependencies now v2, while evidence/old-receipt.json only covered v1. Apply the Skill and its single relevant evidence-and-delivery reference. Determine whether that old receipt proves current dependencies. Do not implement, write PLAN, run checks, or load unrelated references. Return a short conclusion with the evidence boundary.'};}
  if(id==='E5'){const f=fixture('direct-copy');return {...f,allowed:[],focused:['-e','process.exit(17)']};}
  throw Error('FIXTURE_SCENARIO_INVALID');
}
function seed(base,id) {
  const root=path.join(base,'fixture-'+id);fs.mkdirSync(root);const data=scenario(id);
  data.files['.gitignore']='.full-check-runs\n';
  data.files['scripts/full-check.cjs']="const fs=require('fs'),cp=require('child_process');fs.appendFileSync('.full-check-runs','run\\n');const r=cp.spawnSync(process.execPath,['--test','test/clamp.test.cjs'],{stdio:'inherit'});process.exit(r.status===0?0:1);\n";
  for(const [name,text]of Object.entries(data.files)){const file=safeTarget(root,name,true);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
  git(root,['-c','init.defaultBranch=fixture','init','--quiet']);
  const r=cp.spawnSync(process.execPath,['scripts/full-check.cjs'],{cwd:root,windowsHide:true});if(r.status!==0)throw Error('FIXTURE_BASELINE_CHECK_FAILED');
  git(root,['add','.']);const commit=cp.spawnSync('git',['-c','safe.directory='+fs.realpathSync(root),'-c','user.name=Runtime Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','--quiet','-m','Immutable v4 seed'],{cwd:root,windowsHide:true,env:{...process.env,GIT_AUTHOR_DATE:'2026-01-01T00:00:00Z',GIT_COMMITTER_DATE:'2026-01-01T00:00:00Z'}});if(commit.status!==0)throw Error('FIXTURE_SEED_COMMIT_FAILED');
  const baseline=git(root,['rev-parse','HEAD']);fs.mkdirSync(path.join(root,'evidence'),{recursive:true});
  writeOnce(path.join(root,'evidence/baseline.json'),{schema:1,baseline,exitCode:0,check:'node scripts/full-check.cjs',scope:'scalar clamp tests only; no dependency/SCA or configuration validation claim',applicabilityHashes:Object.fromEntries(['package.json','scripts/full-check.cjs'].map(n=>[n,sha(fs.readFileSync(path.join(root,n)))]))});
  fs.writeFileSync(path.join(root,'unrelated.txt'),'Protected fixture content.\nUSER LOCAL EDIT: preserve.\n');
  return {root,data,initial:{baseline,files:publicFiles(root),fullCheckRuns:1}};
}
const tool=(name,description,properties,required)=>({type:'function',name,description,inputSchema:{type:'object',properties,required,additionalProperties:false}});
function tools(readOnly=false) {return [tool('gde_read','Read an actual public fixture file (relative path) or installed Skill as skill/SKILL.md or skill/references/name.md. Structured read receipt records actual I/O.',{path:{type:'string'}},['path']),...(!readOnly?[tool('gde_write','Replace an authorized fixture file with complete UTF-8 text. No shell. Exact task write allowlist enforced.',{path:{type:'string'},text:{type:'string'}},['path','text'])]:[]),tool('gde_check','Run a registered sandboxed verification. IDs: focused (task tests), full (all baseline checks), diff (git whitespace). No arbitrary argv.',{id:{type:'string',enum:['focused','full','diff']}},['id'])];}
const policy=(root,readOnly)=>readOnly?{type:'readOnly',networkAccess:false}:{type:'workspaceWrite',writableRoots:[root],networkAccess:false,excludeSlashTmp:true,excludeTmpdirEnvVar:true};
async function runCase(base,id,preflight=false) {
  assertRuntimePrivacy(id);
  const seeded=seed(base,id),{root,data,initial}=seeded,stateDir=path.join(base,'host-state-'+id);fs.mkdirSync(stateDir);
  const collector=createCollector({workspace:root,skillRoot:skill,registeredToolNames:['gde_read','gde_write','gde_check'],metadata:{scenarioId:id,runtimeVersion:process.env.GDE_RUNTIME_VERSION||'UNKNOWN',candidateIdentifier:'74ca37f',model:'gpt-6.1-sol',reasoningEffort:'high',startDisposition:'started',endDisposition:'UNKNOWN'}});
  let host,actor,finished=false,readonly=false,checkSequence=0,prompt='',effective;const checks=[],denials=[];
  const execute=async(argv,threadId,id,readOnly=false)=>{
    const env={NODE_OPTIONS:null,NODE_PATH:null};for(const key of Object.keys(process.env))if(/API.*KEY|TOKEN|PASSWORD|SECRET|CREDENTIAL|AUTH/i.test(key))env[key]=null;
    const r=await host.call('command/exec',{command:[argv[0]==='node'?process.execPath:'git',...argv.slice(1)],cwd:root,sandboxPolicy:policy(root,readOnly),timeoutMs:30000,env});
    const commandId='check-'+(++checkSequence),outputDigest=sha(String(r.stdout||'')+'\n'+String(r.stderr||''));
    collector.record({kind:'check',threadId,commandId,argv,exitCode:r.exitCode,outputDigest});
    const receipt={id,commandId,threadId,exitCode:r.exitCode,outputDigest};checks.push(receipt);return receipt;
  };
  host=new RuntimeHost({workspace:root,stateDir,binary,model:'gpt-6.1-sol',effort:'high',timeoutMs:600000,onEvent:event=>collector.accept(event),onRequest:async (request,{signal})=>{
    signal.throwIfAborted();
    collector.accept(request);const p=request.params,a=p.arguments;let result;
    try {
      if(!a||typeof a!=='object'||Array.isArray(a))throw Error('TOOL_ARGUMENTS_DENIED');
      if(p.tool==='gde_read'&&Object.keys(a).length===1){let file;if(a.path?.startsWith('skill/'))file=safeTarget(skill,a.path.slice(6));else file=safeTarget(root,a.path);const bytes=fs.readFileSync(file);if(bytes.length>128*1024)throw Error('FIXTURE_FILE_TOO_LARGE');collector.record({kind:'read',threadId:p.threadId,path:file,success:true,bytes:bytes.length,contentDigest:sha(bytes)});result={path:a.path,text:bytes.toString('utf8')};}
      else if(p.tool==='gde_write'&&!readonly&&Object.keys(a).length===2&&data.allowed.includes(a.path)&&typeof a.text==='string'&&Buffer.byteLength(a.text)<128*1024){const file=safeTarget(root,a.path,true);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,a.text);collector.record({kind:'write',threadId:p.threadId,path:file,success:true,bytes:Buffer.byteLength(a.text),contentDigest:sha(a.text)});result={written:a.path};}
      else if(p.tool==='gde_check'&&Object.keys(a).length===1&&['focused','full','diff'].includes(a.id)){if(readonly&&a.id==='full')throw Error('REVIEW_WRITE_CHECK_DENIED');const argv=a.id==='diff'?['git','diff','--check']:a.id==='full'?['node','scripts/full-check.cjs']:['node',...data.focused];if(!data.focused.length&&a.id==='focused')throw Error('CHECK_NOT_APPLICABLE');result=await execute(argv,p.threadId,a.id,readonly);}
      else throw Error('TOOL_OPERATION_DENIED');
      return {success:true,contentItems:[{type:'inputText',text:JSON.stringify(result)}]};
    } catch(error) {denials.push({tool:['gde_read','gde_write','gde_check'].includes(p.tool)?p.tool:'UNKNOWN',code:['ENOENT','FIXTURE_PATH_DENIED','FIXTURE_LINK_DENIED','TOOL_OPERATION_DENIED','REVIEW_WRITE_CHECK_DENIED','CHECK_NOT_APPLICABLE'].includes(error.code||error.message)?error.code||error.message:'UNKNOWN'});if(p.tool==='gde_read')collector.record({kind:'read',threadId:p.threadId,path:a?.path,success:false});return {success:false,contentItems:[{type:'inputText',text:'Operation failed: '+denials.at(-1).code}]};}
  }});
  let packet,shutdownResult;
  try {
    const initialized=await host.start();const started=await host.call('thread/start',{cwd:root,model:'gpt-6.1-sol',ephemeral:true,sandbox:id==='E4'?'read-only':'workspace-write',approvalPolicy:'on-request',approvalsReviewer:'auto_review',environments:[],dynamicTools:tools(id==='E4'),experimentalRawEvents:false});actor=started.thread.id;effective={model:started.model,sandbox:started.sandbox,acceptedEnvironmentInput:[],environmentEcho:started.thread.environments??'UNKNOWN',approvalPolicy:started.approvalPolicy,approvalsReviewer:started.approvalsReviewer,reasoningEffort:started.reasoningEffort,configIsolation:host.configIsolation,hostUserAgent:initialized.userAgent};
    if(preflight){writeOnce(path.join(base,'native-preflight.json'),{hostInitialized:true,threadStarted:true,ephemeral:true,model:started.model,threadId:actor,configWriteAttempt:'UNKNOWN',effective});return;}
    if(id==='E5'){await execute(['node','-e','process.exit(17)'],actor,'known-failure',true);finished=true;}
    else {
      prompt='Apply $goal-driven-engineering. Read skill/SKILL.md through gde_read first so actual successful loading is instrumented. Registered gde_* tools mediate public fixture I/O; use relative paths. The host also receives the actual installed Skill via official skill input. Read only references necessary for this task. No commits, installation, global configuration writes, native Goal, remote operations or changes outside the exact task. Existing unrelated local edit and evidence/baseline.json are protected. Do proportionate actual verification. Tool check results provide bounded status/digest; inspect and improve tests via structured reads/writes.\n\n'+data.task;
      const turn=await host.call('turn/start',{threadId:actor,effort:'high',environments:[],input:[{type:'skill',name:'goal-driven-engineering',path:path.join(skill,'SKILL.md')},{type:'text',text:prompt}]});const result=await host.waitTurn(actor,turn.turn.id);finished=result.status==='completed';
      writeOnce(path.join(base,id+'-turn-status.json'),{threadId:actor,turnId:result.turnId,status:result.status,finalMessageDigest:sha(result.finalText),finalPhaseUnknown:result.finalPhaseUnknown});
    }
    // Verification is inside the same native sandbox, after exact file scope inspection.
    let after=publicFiles(root);const changed=[...new Set([...Object.keys(initial.files),...Object.keys(after)])].filter(n=>initial.files[n]!==after[n]);const intact=changed.every(n=>data.allowed.includes(n))&&git(root,['rev-parse','HEAD'])===initial.baseline;
    if(id!=='E4'&&id!=='E5'&&intact){await execute(['node',...data.focused],'harness','independent-focused',true);if(['E2','E3'].includes(id))await execute(['node','scripts/acceptance.cjs'],'harness','independent-acceptance',true);}
    let reviewerExpected;
    if(id==='E2'&&finished&&intact){
      readonly=true;const beforeReview=publicFiles(root),diff=git(root,['diff','HEAD','--']),diffDigest=sha(diff);reviewerExpected={baseline:initial.baseline,diffDigest};
      const reviewer=await host.call('thread/start',{cwd:root,model:'gpt-6.1-sol',ephemeral:true,sandbox:'read-only',approvalPolicy:'on-request',approvalsReviewer:'auto_review',environments:[],dynamicTools:tools(true),experimentalRawEvents:false});
      const outputSchema={type:'object',properties:{verdict:{type:'string',enum:['PASS','FAIL','UNKNOWN']},baseline:{type:'string'},diffDigest:{type:'string'},findings:{type:'array',items:{type:'object',properties:{severity:{type:'string',enum:['BLOCKER','MAJOR','MINOR','INFO']},path:{type:'string'},line:{type:'integer'},message:{type:'string'}},required:['severity','path','line','message'],additionalProperties:false}}},required:['verdict','baseline','diffDigest','findings'],additionalProperties:false};
      const requestId='review-'+id,turn=await host.call('turn/start',{threadId:reviewer.thread.id,effort:'high',environments:[],outputSchema,input:[{type:'text',text:'You are the separately invoked read-only reviewer of the completed public divide contract change. Read current src/divide.cjs, test/divide.test.cjs, API.md and PLAN.md with gde_read; use focused verification. Compare +0/-0 RangeError, ordinary behavior, test quality and scope. Report typed findings and verdict; no writes. Harness registered baseline '+initial.baseline+' and actual Git diff SHA256 '+diffDigest+'. The exact diff:\n'+diff}]});
      const result=await host.waitTurn(reviewer.thread.id,turn.turn.id);let payload;try{payload=JSON.parse(result.finalText);}catch{}
      const valid=payload&&payload.baseline===initial.baseline&&payload.diffDigest===diffDigest&&Object.keys(payload).sort().join(',')==='baseline,diffDigest,findings,verdict'&&['PASS','FAIL','UNKNOWN'].includes(payload.verdict)&&Array.isArray(payload.findings)&&payload.findings.every(f=>Object.keys(f).sort().join(',')==='line,message,path,severity'&&['BLOCKER','MAJOR','MINOR','INFO'].includes(f.severity)&&typeof f.path==='string'&&!path.isAbsolute(f.path)&&!f.path.includes('..')&&typeof f.message==='string'&&f.message.length<2000&&Number.isInteger(f.line));
      const unchanged=JSON.stringify(beforeReview)===JSON.stringify(publicFiles(root));
      collector.record({kind:'review',requestId,actorThreadId:actor,reviewThreadId:reviewer.thread.id,role:'reviewer',roleOrigin:'HARNESS_CONFIG',readOnly:unchanged&&reviewer.sandbox?.type==='readOnly',baseline:reviewerExpected.baseline,diffDigest,completed:result.status==='completed',resultCaptured:!!valid&&!result.finalPhaseUnknown,resultDigest:sha(result.finalText),resultPayloadDigest:valid?sha(JSON.stringify(payload)):undefined,verdict:valid?payload.verdict:'UNKNOWN',findings:valid?payload.findings:undefined});
      writeOnce(path.join(base,'E2-review-result.json'),{requestId,threadId:reviewer.thread.id,status:result.status,readonlyFilesystemUnchanged:unchanged,nativeSandbox:reviewer.sandbox,finalPhaseUnknown:result.finalPhaseUnknown,payload:valid?payload:null,payloadDigest:valid?sha(JSON.stringify(payload)):null});
    }
    after=publicFiles(root);const changedAll=[...new Set([...Object.keys(initial.files),...Object.keys(after)])].filter(n=>initial.files[n]!==after[n]);
    const finalHead=git(root,['rev-parse','HEAD']),finalIntact=changedAll.every(n=>data.allowed.includes(n))&&finalHead===initial.baseline;
    const preview=collector.finish({transportComplete:finished});
    // Completeness is limited to the registered executor. Official no-environment
    // specs omit shell/apply_patch; actual opaque operations or agent calls revoke it.
    const controlled=finished&&preview.agents.length===0&&denials.length===0
      &&!preview.commands.some(c=>c.category?.value==='command')&&!preview.events.some(e=>['item:fileChange','item:file_change','item:mcpToolCall'].includes(e.eventType?.value));
    packet={schema:2,harness:'execution-regression-v4',scenario:id,primaryThread:actor,initial,final:{files:after,fullCheckRuns:(after['.full-check-runs']||'').split('run\n').length-1,head:finalHead,protectedIntact:finalIntact},observation:collector.finish({transportComplete:finished,controlledToolsOnly:controlled,endDisposition:finished?'completed':'failed'}),checks,reviewerExpected:reviewerExpected||null,denials,prompt,promptDigest:sha(prompt),task:data.task||'Safe native host command exit 17',effective,skillManifest:Object.fromEntries(Object.entries(publicFiles(skill)).map(([n,text])=>[n,sha(text)])),harnessManifest:Object.fromEntries(['run-runtime-v4.cjs','runtime-host-v4.cjs','runtime-observation-v2.cjs','score-runtime-v4.cjs'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))])),model:'gpt-6.1-sol',effort:'high',limitations:['Instrumented dynamic-tool surface, environments empty; not a paired model benchmark.','Negative loading claims cover complete registered tool I/O, not hidden host Skill preload or OS reads.','Native reviewer role unavailable; separate typed-output reviewer role is harness declared.','Native command sandbox is workspace-write/read-only with network disabled; arbitrary fixture code is not a security boundary against reading private files. Only public fixture output digests retained.']};
  } finally {shutdownResult=await host.shutdown();writeOnce(path.join(base,(preflight?'preflight':id)+'-shutdown.json'),shutdownResult);}
  // Seal only after verified process exit and request drain. No late collector
  // event/receipt can be omitted from the accepted observation snapshot.
  const finalFiles=publicFiles(root),finalHead=git(root,['rev-parse','HEAD']);
  const changed=[...new Set([...Object.keys(initial.files),...Object.keys(finalFiles)])].filter(n=>initial.files[n]!==finalFiles[n]);
  collector.record({kind:'files',created:changed.filter(n=>!(n in initial.files)),modified:changed.filter(n=>n in initial.files&&n in finalFiles),deleted:changed.filter(n=>!(n in finalFiles)),protected:Object.keys(initial.files).filter(n=>!data.allowed.includes(n)),intact:changed.every(n=>data.allowed.includes(n))&&finalHead===initial.baseline});
  const finalObservation=collector.finish({transportComplete:finished,endDisposition:finished?'completed':'failed'});
  const controlled=finished&&shutdownResult.processClosed&&shutdownResult.requestsDrained&&host.pending.size===0&&Array.isArray(effective.environmentEcho)&&effective.environmentEcho.length===0
    &&finalObservation.agents.length===0&&denials.length===0&&!finalObservation.commands.some(c=>c.category?.value==='command')&&!finalObservation.events.some(e=>e.category?.value==='opaque');
  packet.final={files:finalFiles,fullCheckRuns:(finalFiles['.full-check-runs']||'').split('run\n').length-1,head:finalHead,protectedIntact:changed.every(n=>data.allowed.includes(n))&&finalHead===initial.baseline};
  packet.observation=collector.finish({transportComplete:finished,controlledToolsOnly:controlled,endDisposition:finished?'completed':'failed'});
  packet.completenessScope='registered-tool-executor; excludes hidden host loading';packet.shutdown=shutdownResult;
  packet.effective=JSON.parse(JSON.stringify(effective));
  const {sealReplay,gradeReplay}=require('./score-runtime-v4.cjs');const sealed=sealReplay(packet);writeOnce(path.join(base,id+'-replay.json'),sealed);const grading=gradeReplay(sealed);writeOnce(path.join(base,id+'-grade.json'),grading);console.log(JSON.stringify({scenario:id,status:grading.status,criteria:grading.criteria}));return sealed;
}
async function main(argv){const [base,id]=argv;if(!base||!['preflight','E1','E2','E3','E4','E5'].includes(id)||!fs.existsSync(base))throw Error('RUNNER_ARGUMENT_INVALID');await runCase(path.resolve(base),id==='preflight'?'E5':id,id==='preflight');}
module.exports={safeTarget,scenario,publicFiles,seed,runCase,assertRuntimePrivacy};
if(require.main===module)main(process.argv.slice(2)).catch(error=>{console.error(JSON.stringify({failed:true,code:/^[A-Z0-9_]+$/.test(error.code||error.message)?error.code||error.message:'UNKNOWN'}));process.exitCode=1;});
