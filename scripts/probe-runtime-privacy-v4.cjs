'use strict';
// No model turn, credential read/export, login or configuration mutation RPC.
const fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const {spawnSync}=require('node:child_process');
const {RuntimeHost}=require('./runtime-host-v4.cjs');
const {isolatedEnvironment,snapshotReal,snapshotTree,compareSnapshots,privacyPreflight,fileMetadata,sha}=require('./runtime-privacy-v4.cjs');
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const repository=path.resolve(__dirname,'..');
const realHome=path.join(os.homedir(),'.codex');
const extras=[path.join(os.homedir(),'.agents/skills'),path.join(realHome,'skills'),path.join(realHome,'agents')];
async function awaitFailedLifetime(host,onWaiting) {
  let diagnosticFailed=false;
  try {onWaiting();} catch {diagnosticFailed=true;}
  if(host.child&&!host.processCloseObserved){if(!host.processClosed)throw Error('PRIVACY_LIFETIME_UNOBSERVABLE');await host.processClosed;}
  await Promise.all([...host.requests]);
  if(host.child&&!host.processCloseObserved||host.requests.size)throw Error('PRIVACY_LIFETIME_UNOBSERVABLE');
  if(diagnosticFailed)throw Error('PRIVACY_RECOVERY_DIAGNOSTIC_FAILED');
  return {processClosed:!host.child||host.processCloseObserved===true,requestsDrained:host.requests.size===0};
}
function databaseMetadata(file) {
  if(!file.endsWith('.sqlite')) return null;
  let db;
  try {
    const {DatabaseSync}=require('node:sqlite'); db=new DatabaseSync(file,{readOnly:true});
    return {openedPath:db.prepare('PRAGMA database_list').all().map(r=>r.file),tables:db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name),userVersion:db.prepare('PRAGMA user_version').get().user_version};
  } catch {return {status:'NOT PROVEN'};} finally {db?.close();}
}
function selectedConfiguration(reply) {
  const config=reply.config||{}, origins=reply.origins||{};
  const keys=['sqlite_home','log_dir','history','cli_auth_credentials_store'];
  return Object.fromEntries(keys.map(key=>[key,{value:config[key]??'NOT EXPOSED',origin:origins[key]??'NOT EXPOSED'}]));
}
async function probe(evidence,binary) {
  if(fs.existsSync(path.join(evidence,'native-draft.json'))) throw Error('PRIVACY_EVIDENCE_EXISTS');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gde-p4a1-native-'));
  for(const dir of ['home','sqlite-env','sqlite-config','sqlite-cli','logs','scratch','workspace'])fs.mkdirSync(path.join(root,dir));
  const workspace=path.join(root,'workspace');fs.mkdirSync(path.join(workspace,'.git'));
  // Public temporary config, containing no authentication material.
  fs.writeFileSync(path.join(root,'home/config.toml'),'cli_auth_credentials_store="file"\n[history]\npersistence="none"\n');
  const isolation={tempRoot:root,realHome,repository,home:path.join(root,'home'),sqliteEnv:path.join(root,'sqlite-env'),logDir:path.join(root,'logs')};
  const before=snapshotReal(realHome,extras);write(path.join(evidence,'real-before.json'),before);
  write(path.join(evidence,'temp-before.json'),snapshotTree(root));
  const environment=isolatedEnvironment(isolation);
  const version=spawnSync(binary,['--version'],{env:environment,cwd:workspace,windowsHide:true,encoding:'utf8',timeout:10000});
  const match=version.status===0&&/^codex-cli ([a-zA-Z0-9.-]+)\s*$/.exec(version.stdout);
  const rows=[];
  for(const mode of ['environment','config','cli']) {
    const state=mode==='environment'?isolation.sqliteEnv:path.join(root,'sqlite-'+mode);
    if(mode!=='environment')fs.writeFileSync(path.join(isolation.home,'config.toml'),'sqlite_home='+JSON.stringify(path.join(root,'sqlite-config'))+'\ncli_auth_credentials_store="file"\n[history]\npersistence="none"\n');
    const active={...isolation,...(mode==='cli'?{sqliteOverride:state}:{})};
    const row={mode,expectedSqlite:state,declaredHome:active.home,declaredLogs:active.logDir,modelStarted:false};
    const host=new RuntimeHost({workspace,stateDir:state,binary,isolation:active,timeoutMs:30000,shutdownTimeoutMs:15000});
    try {
      if(!match)throw Error('PRIVACY_VERSION_UNAVAILABLE');
      await host.start();
      const config=await host.call('config/read',{cwd:workspace,includeLayers:true});
      row.config=selectedConfiguration(config);
      row.layers=(config.layers||[]).map(layer=>({name:layer.name,disabledReason:layer.disabledReason??null,sqliteHome:layer.config?.sqlite_home??'NOT EXPOSED',logDir:layer.config?.log_dir??'NOT EXPOSED'}));
      // Do not retain account names, email, IDs or authentication response bodies.
      const account=await host.call('account/read',{refreshToken:false});
      row.auth={accountPresent:!!account.account,requiresOpenaiAuth:account.requiresOpenaiAuth??'UNKNOWN',refreshToken:false,mode:account.account?.type??'NONE'};
      const started=await host.call('thread/start',{cwd:workspace,ephemeral:false,sandbox:'read-only',approvalPolicy:'never',environments:[],experimentalRawEvents:false});
      row.threadCreated=typeof started.thread?.id==='string';
      row.threadPath=started.thread?.path??'NOT EXPOSED';
      const command=await host.call('command/exec',{command:[process.execPath,'-e','process.exit(17)'],cwd:workspace,sandboxPolicy:{type:'readOnly'},timeoutMs:10000});
      row.command={exitCode:command.exitCode,stdoutDigest:sha(command.stdout??''),stderrDigest:sha(command.stderr??'')};
      try {await host.call('thread/archive',{threadId:started.thread.id});row.archived=true;}
      catch {row.archived='NOT PROVEN';row.archiveError='NATIVE_ARCHIVE_RPC_FAILED';}
      row.shutdown=await host.shutdownGracefully();
    } catch(error) {
      row.error=/^[A-Z0-9_-]+$/.test(error.code||error.message)?(error.code||error.message):'PRIVACY_PROBE_FAILED';
      try{if(!host.closed)row.shutdown=await host.shutdownGracefully();else await host.shutdown();}
      catch {
        row.shutdownBarrier='NOT PROVEN';
        // Keep the wrapper's real-file locks held while an owned process or
        // handler remains alive. Never return an exit0 draft on failed drain.
        row.recoveredLifetime=await awaitFailedLifetime(host,()=>write(path.join(evidence,'shutdown-recovery-'+mode+'.json'),{status:'WAITING_FOR_OWNED_PROCESS_AND_HANDLERS',pid:host.child?.pid??null,tempRoot:root}));
      }
    }
    rows.push(row);
    const after=snapshotReal(realHome,extras);
    row.realComparison=compareSnapshots(before,after);
    if(!row.realComparison.unchanged){row.stopReason='REAL_STATE_DRIFT_OR_SNAPSHOT_GAP';break;}
  }
  const after=snapshotReal(realHome,extras), temporary=snapshotTree(root);
  const databases=Object.keys(temporary.files).filter(name=>name.endsWith('.sqlite')).map(name=>({path:path.join(root,name),...databaseMetadata(path.join(root,name))}));
  write(path.join(evidence,'real-after.json'),after);write(path.join(evidence,'temp-after.json'),{root,...temporary,databases});
  write(path.join(evidence,'native-draft.json'),{schema:1,status:'UNSEALED',version:match?match[1]:'NOT PROVEN',binary:fileMetadata(binary),tempRoot:root,rows,comparison:compareSnapshots(before,after),rawBodiesRetained:false,authCopied:false,modelStarted:false});
}
function seal(evidence,destination='privacy-preflight.json') {
  const draft=JSON.parse(fs.readFileSync(path.join(evidence,'native-draft.json')));
  const guard=JSON.parse(fs.readFileSync(path.join(evidence,'static-guard.json'),'utf8').replace(/^\uFEFF/,''));
  const temporary=JSON.parse(fs.readFileSync(path.join(evidence,'temp-after.json')));
  const successful=draft.rows.filter(r=>!r.error);
  const staticUnchanged=guard.Unchanged===true&&guard.Before?.length>2&&guard.Before.length===guard.After?.length&&guard.Before.every((r,i)=>r.Path===guard.After[i].Path&&r.SHA256===guard.After[i].SHA256);
  const sqliteObserved=successful.length>0&&successful.every(r=>temporary.databases.some(db=>db.openedPath?.some(file=>path.dirname(file).toLowerCase()===r.expectedSqlite.toLowerCase())));
  const proof={P1:draft.comparison.complete?true:undefined,P2:successful.length>0&&successful.every(r=>r.threadPath!=='NOT EXPOSED'&&r.threadPath.startsWith(path.join(draft.tempRoot,'home')))?true:undefined,P3:sqliteObserved?true:undefined,
    P4:successful.length===3&&successful.every(r=>r.config.sqlite_home.origin!=='NOT EXPOSED'&&r.config.log_dir.origin!=='NOT EXPOSED')?true:undefined,P5:staticUnchanged,
    P6:undefined,P7:temporary.complete?true:undefined,P8:draft.rows.some(r=>r.auth?.accountPresent===false&&r.auth.requiresOpenaiAuth===true)?false:undefined,
    P9:undefined,P10:draft.comparison.complete?draft.comparison.unchanged:undefined};
  // No-model startup does not prove every model-time persistence path or flush.
  // In particular, metadata-only DB inspection is not a writer-queue flush receipt.
  write(path.join(evidence,destination),{...privacyPreflight(proof),reason:proof.P8===false?'AUTH ISOLATION BLOCKED':'SUPPORTED HOST ISOLATION NOT SUFFICIENT',proofBasis:'OBSERVED no-model only; P6/P9 remain NOT PROVEN',guardComplete:true,modelStarted:false,...(destination!=='privacy-preflight.json'?{correctionOf:fileMetadata(path.join(evidence,'privacy-preflight.json')),errata:'P10 snapshot gaps imply NOT PROVEN; changed=[] only proves no observed difference in hashable scope. Original evidence retained.'}:{})});
}
if(require.main===module){const [action,evidence,binary]=process.argv.slice(2);Promise.resolve().then(()=>action==='probe'?probe(evidence,binary):action==='seal'?seal(evidence):action==='correct'?seal(evidence,'privacy-preflight-correction-v2.json'):Promise.reject(Error('PRIVACY_ACTION_INVALID'))).catch(error=>{process.stderr.write(/^[A-Z0-9_-]+$/.test(error.code||error.message)?(error.code||error.message)+'\n':'PRIVACY_PROBE_FAILED\n');process.exitCode=1;});}
module.exports={selectedConfiguration,databaseMetadata,awaitFailedLifetime};
