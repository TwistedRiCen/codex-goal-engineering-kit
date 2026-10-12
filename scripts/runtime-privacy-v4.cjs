'use strict';
// Hash/metadata only. Never parse credentials or retain native/config bodies.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function plainDirectory(entry) {
  if (typeof entry !== 'string' || !path.isAbsolute(entry)) throw Error('PRIVACY_ROOT_INVALID');
  const resolved = fs.realpathSync(entry);
  if (path.normalize(resolved).toLowerCase() !== path.normalize(entry).toLowerCase()) throw Error('PRIVACY_ROOT_ALIAS');
  for (let node = resolved; ; node = path.dirname(node)) {
    if (fs.lstatSync(node).isSymbolicLink()) throw Error('PRIVACY_ROOT_LINK');
    if (node === path.dirname(node)) break;
  }
  if (!fs.statSync(resolved).isDirectory()) throw Error('PRIVACY_ROOT_INVALID');
  return resolved;
}
const inside = (root, child) => { const rel = path.relative(root, child); return rel === '' || !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep); };
function isolatedEnvironment(isolation, original = process.env) {
  const root = plainDirectory(isolation.tempRoot), real = plainDirectory(isolation.realHome);
  if (inside(real, root) || inside(root, real)) throw Error('PRIVACY_REAL_ROOT_OVERLAP');
  const repository = plainDirectory(isolation.repository);
  if (inside(repository, root) || inside(root, repository)) throw Error('PRIVACY_REPO_ROOT_OVERLAP');
  const home = plainDirectory(isolation.home), sqlite = plainDirectory(isolation.sqliteEnv), logs = plainDirectory(isolation.logDir);
  for (const entry of [home, sqlite, logs, isolation.sqliteOverride].filter(Boolean)) if (!inside(root, plainDirectory(entry))) throw Error('PRIVACY_TEMP_ROOT_ESCAPE');
  if (home === root || sqlite === root) throw Error('PRIVACY_ROOT_INVALID');
  const environment = {};
  // No API keys, access tokens, NODE_OPTIONS, telemetry/proxy destinations or
  // arbitrary inherited configuration. USERPROFILE permits documented Skill discovery.
  for (const [key, value] of Object.entries(original)) if (['PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','USERPROFILE','SYSTEMDRIVE','PROGRAMDATA','LOCALAPPDATA','APPDATA'].includes(key.toUpperCase())) environment[key] = value;
  const scratch = path.join(root, 'scratch');
  plainDirectory(scratch);
  return { ...environment, CODEX_HOME: home, CODEX_SQLITE_HOME: sqlite, TEMP: scratch, TMP: scratch, RUST_LOG: 'off' };
}
function fileMetadata(file) {
  let fd;
  try {
    const before = fs.statSync(file);
    fd = fs.openSync(file, 'r'); const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(1024 * 1024);
    let count; while ((count = fs.readSync(fd, buffer, 0, buffer.length, null))) hash.update(buffer.subarray(0, count));
    const after = fs.statSync(file);
    return { size: after.size, digest: hash.digest('hex'), modifiedUtc: after.mtime.toISOString(), stable: before.size === after.size && before.mtimeMs === after.mtimeMs };
  } catch { return { size: null, digest: 'UNKNOWN', modifiedUtc: 'UNKNOWN', stable: false }; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
function snapshotTree(root, relative = '') {
  const files = {}, gaps = [];
  function walk(rel) {
    const folder = path.join(root, rel);
    let entries; try { entries = fs.readdirSync(folder, { withFileTypes: true }); } catch { gaps.push(rel || '.'); return; }
    for (const entry of entries.sort((a,b) => a.name.localeCompare(b.name))) {
      const name = rel ? rel + '/' + entry.name : entry.name;
      if (entry.isSymbolicLink()) { gaps.push(name); continue; }
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile()) { files[name] = fileMetadata(path.join(root, name)); if (!files[name].stable) gaps.push(name); }
      else gaps.push(name);
    }
  }
  walk(relative); return { files, gaps, complete: gaps.length === 0 };
}
function snapshotReal(realHome, extraRoots = []) {
  realHome = plainDirectory(realHome);
  const files = {}, gaps = [], scope = ['sessions','archived_sessions','sqlite','state','log','logs','secrets','.sandbox','.sandbox-bin','.sandbox-secrets','tmp','cache','rollout-migrations'];
  for (const entry of fs.readdirSync(realHome, { withFileTypes: true })) {
    if (entry.isFile()) { files[entry.name] = fileMetadata(path.join(realHome,entry.name)); if (!files[entry.name].stable) gaps.push(entry.name); }
    else if (scope.includes(entry.name)) {
      if (entry.isSymbolicLink()) { gaps.push(entry.name); continue; }
      const rows = snapshotTree(realHome,entry.name); Object.assign(files, rows.files); gaps.push(...rows.gaps);
    }
  }
  for (let index = 0; index < extraRoots.length; index++) {
    const rows = snapshotTree(plainDirectory(extraRoots[index]));
    for (const [name, metadata] of Object.entries(rows.files)) files['protected-root-'+index+'/'+name] = metadata;
    gaps.push(...rows.gaps.map(name => 'protected-root-'+index+'/'+name));
  }
  return { root: realHome, scope, extraRoots, files, gaps, complete: gaps.length === 0, excluded: 'app-only directories, attachments, visualizations, memories, plugin content cache; not selected native persistence roots' };
}
function compareSnapshots(before, after) {
  const names = [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].sort();
  const changed = names.filter(name => before.files[name]?.digest !== after.files[name]?.digest || before.files[name]?.size !== after.files[name]?.size);
  return { complete: before.complete && after.complete, changed, unchanged: before.complete && after.complete && changed.length === 0, attribution: changed.length ? 'UNKNOWN; concurrent app may write, never assume harness or restore' : 'NO_OBSERVED_DIFFERENCE_IN_HASHABLE_SCOPE' };
}
function privacyPreflight(proof) {
  // This grader does not grant a model capability. The existing model gate stays
  // closed. Every item must be direct true, not strings or a caller's summary PASS.
  const meanings = ['real snapshot complete','temporary home observed','temporary SQLite observed','effective config source observed','static protection unchanged','real persistence destinations excluded','temporary files inventoried','safe usable authentication','normal shutdown/drain/flush/handles observed','real post-compare available and unchanged'];
  const checks = meanings.map((meaning,index) => ({ id:'P'+(index+1), meaning, status: proof['P'+(index+1)] === true ? 'PASS' : proof['P'+(index+1)] === false ? 'FAIL' : 'NOT PROVEN' }));
  return { schema:1, kind:'privacy-preflight', status:checks.every(row=>row.status==='PASS')?'PASS':'PRIVACY PREFLIGHT BLOCKED', modelAuthorized:false, checks };
}
module.exports = { plainDirectory, inside, isolatedEnvironment, fileMetadata, snapshotTree, snapshotReal, compareSnapshots, privacyPreflight, sha };
