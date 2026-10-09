[CmdletBinding()]
param([string]$OutputPath, [switch]$AsJson)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# INVESTIGATION ONLY. No native Goal, installed Skill, or runtime protocol change.
# Loading M1 runs its setup suite; these operations are excluded from M3 counters.
$matrixAsJson=$AsJson.IsPresent
. (Join-Path $PSScriptRoot 'test-recovery-paths.ps1') | Out-Null
$AsJson=[switch]$matrixAsJson
$setup = [ordered]@{ suite='M1 recovery-paths'; cases=$observations.Count; assertions=$assertionCount; atomicReplacements=$atomicReplaceCount; includedInMatrixCosts=$false }
$fixtureBase=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$fixtureRoot=Join-Path $fixtureBase ('kit-recovery-matrix-' + [Guid]::NewGuid().ToString('N'))
$rows=New-Object 'System.Collections.Generic.List[object]'
$matrixAssertions=0
$cleanupVerified=$false
$currentCosts=$null
function Matrix-Check {
    param([bool]$Condition,[string]$Message)
    $script:matrixAssertions++
    if (-not $Condition) { throw "Recovery investigation assertion failed: $Message" }
}
function Matrix-Write {
    param([string]$Path,[byte[]]$Bytes,[string]$Kind,[switch]$Atomic)
    $script:currentCosts.fileWrites++
    if ($Kind -eq 'journal') { $script:currentCosts.journalWrites++ }
    if ($Kind -eq 'checkpoint') { $script:currentCosts.checkpointWrites++ }
    if ($Kind -eq 'receipt') { $script:currentCosts.receiptWrites++ }
    if ($Kind -eq 'mutation') { $script:currentCosts.mutationWrites++ }
    if ($Atomic) {
        $tmp=$Path + '.matrix-' + [Guid]::NewGuid().ToString('N')
        $backup=$tmp + '.backup'
        try {
            [IO.File]::WriteAllBytes($tmp,$Bytes)
            if ([IO.File]::Exists($Path)) {
                [IO.File]::Replace($tmp,$Path,$backup)
                $script:currentCosts.atomicReplacements++
            } else { [IO.File]::Move($tmp,$Path) }
        } finally {
            if ([IO.File]::Exists($tmp)) { [IO.File]::Delete($tmp) }
            if ([IO.File]::Exists($backup)) { [IO.File]::Delete($backup) }
        }
    } else { [IO.File]::WriteAllBytes($Path,$Bytes) }
}
function Matrix-Journal {
    param($Fixture,$Journal)
    $lines=foreach($field in $journalFields) { $field + ': ' + [string]$Journal[$field] }
    Matrix-Write $Fixture.JournalPath $utf8.GetBytes(($lines -join "`n") + "`n") 'journal' -Atomic
}
function New-MatrixFixture {
    param([string]$Strategy,[string]$Case)
    $root=Join-Path $fixtureRoot ($Strategy + '-' + $Case)
    [void](New-Item -ItemType Directory -Path $root)
    $f=[pscustomobject]@{
        Root=$root; PlanPath=(Join-Path $root 'PLAN.md'); CodePath=(Join-Path $root 'app.txt')
        NotesPath=(Join-Path $root 'notes.txt'); JournalPath=(Join-Path $root '.goal/execution-state.md')
        CheckpointPath=(Join-Path $root 'experimental-checkpoint.json'); InitialHead=''; InitialIndex=''
        AuthorityPath=($root + '.authority.json')
        InitialProtected=''; InitialPlan=''; InitialNotes=''; Strategy=$Strategy; Case=$Case
        AllowedClean=$true; ExternalUnknown=$false; OwnershipKnown=$true
    }
    Fixture-Git $root @('init','-q') | Out-Null
    Fixture-Git $root @('config','core.autocrlf','false') | Out-Null
    [IO.File]::WriteAllText($f.PlanPath,"# Compact STANDARD PLAN`nTask: bounded app.txt edit; preserve notes.txt user work.`nPass: app.txt is verified code; git diff --check passes.`n",$utf8)
    [IO.File]::WriteAllText($f.CodePath,'before',$utf8)
    [IO.File]::WriteAllText($f.NotesPath,'tracked notes',$utf8)
    Fixture-Git $root @('add','--','PLAN.md','app.txt','notes.txt') | Out-Null
    Fixture-Git $root @('-c','user.name=Matrix fixture','-c','user.email=fixture@example.invalid','commit','-qm','seed') | Out-Null
    [IO.File]::AppendAllText($f.NotesPath,' + existing user work',$utf8)
    $f.InitialHead=Fixture-Git $root @('rev-parse','HEAD')
    $f.InitialIndex=Get-FixtureIndexRecord $f 'PLAN.md'
    $f.InitialPlan=Get-PlanBytesHash ([IO.File]::ReadAllBytes($f.PlanPath))
    $f.InitialProtected=Get-FixtureProtectedFingerprint $f
    $f.InitialNotes=Get-PlanBytesHash ([IO.File]::ReadAllBytes($f.NotesPath))
    # Controlled experiment input, outside the repository, identical for A/B/C.
    # This is supplied durable authority evidence, not an ordinary STANDARD
    # runtime artifact or a claim that STANDARD automatically records baselines.
    $authority=[ordered]@{head=$f.InitialHead;notesText=[IO.File]::ReadAllText($f.NotesPath,$utf8);planText=[IO.File]::ReadAllText($f.PlanPath,$utf8);ownershipKnown=$true;externalUnknown=$false}
    [IO.File]::WriteAllText($f.AuthorityPath,($authority | ConvertTo-Json -Compress),$utf8)
    return $f
}
function Prepare-Matrix {
    param($F)
    if ($F.Strategy -eq 'A') { return }
    if ($F.Strategy -eq 'B') {
        [void](New-Item -ItemType Directory -Path (Split-Path -Parent $F.JournalPath))
        $j=[ordered]@{
            'Schema Version'='2';'State'='PREPARED';'Atomic Unit'=('matrix-' + $F.Case)
            'Intent'='bounded app mutation';'Prepared HEAD'=$F.InitialHead
            'Protected Baseline Fingerprint'=$F.InitialProtected;'External Non-Idempotent Risk'='NONE'
            'Allowed Paths'='app.txt';'Verification Commands'='git diff --check'
            'Pass Condition'='app equals verified code';'Verified Mutation Fingerprint'=''
            'Plan Baseline Fingerprint'=$F.InitialPlan;'Evidence'='';'Blocker Reason'=''
        }
        Matrix-Journal $F $j
    } else {
        # One hypothetical variant. This is not schema 2 or an approved proposal.
        $c=[ordered]@{ experimental=$true;state='PREPARED';head=$F.InitialHead;allowedContent=(Get-PlanBytesHash ([IO.File]::ReadAllBytes($F.CodePath)));plan=$F.InitialPlan;externalUnknown=$false }
        Matrix-Write $F.CheckpointPath $utf8.GetBytes(($c | ConvertTo-Json -Compress)) 'checkpoint' -Atomic
    }
}
function Read-Checkpoint {
    param($F)
    return ([IO.File]::ReadAllText($F.CheckpointPath,$utf8) | ConvertFrom-Json)
}
function Save-Checkpoint {
    param($F,$C)
    Matrix-Write $F.CheckpointPath $utf8.GetBytes(($C | ConvertTo-Json -Compress)) 'checkpoint' -Atomic
}
function Matrix-Mutate {
    param($F,[string]$Text='verified code',[switch]$PersistState)
    Matrix-Write $F.CodePath $utf8.GetBytes($Text) 'mutation'
    if ($PersistState -and $F.Strategy -eq 'B') {
        $j=Read-FixtureJournal $F;$j['State']='MUTATED';Matrix-Journal $F $j
    }
    if ($PersistState -and $F.Strategy -eq 'C') {
        $c=Read-Checkpoint $F;$c.state='MUTATED';Save-Checkpoint $F $c
    }
}
function Matrix-Verify {
    param($F,[switch]$CutBeforeCommand)
    if ($F.Strategy -eq 'B') { $j=Read-FixtureJournal $F;$j['State']='VERIFYING';Matrix-Journal $F $j }
    if ($F.Strategy -eq 'C') { $c=Read-Checkpoint $F;$c.state='VERIFYING';Save-Checkpoint $F $c }
    if ($CutBeforeCommand) { return }
    Fixture-Git $F.Root @('diff','--check') | Out-Null
    $script:currentCosts.verificationCommands++
    Matrix-Check ([IO.File]::ReadAllText($F.CodePath,$utf8) -ceq 'verified code') 'actual pass condition'
    if ($F.Strategy -eq 'B') {
        $j=Read-FixtureJournal $F
        $j['State']='VERIFIED';$j['Verified Mutation Fingerprint']=Get-FixtureMutationFingerprint $F $j['Prepared HEAD']
        $j['Evidence']='git diff --check passed; app.txt exact content checked';Matrix-Journal $F $j
    }
    if ($F.Strategy -eq 'C') {
        $c=Read-Checkpoint $F;$c.state='VERIFIED';$c.allowedContent=Get-PlanBytesHash ([IO.File]::ReadAllBytes($F.CodePath));Save-Checkpoint $F $c
    }
}
function Matrix-Action {
    param($F)
    # Fresh persisted reads; no cached derived action is stored.
    $script:currentCosts.restartDispatches++
    if ($F.Strategy -eq 'B') {
        if (-not $F.AllowedClean) { return 'BLOCKED' }
        if (-not [IO.File]::Exists($F.JournalPath)) {
            # The M1 helper is active-journal only. Absence is handled separately
            # under the current conceptual IDLE contract, not as parser failure.
            $receipt=Get-PlanReceiptBytes ('matrix-' + $F.Case) (Get-FixtureMutationFingerprint $F $F.InitialHead) 'git diff --check passed; app.txt exact content checked'
            $plan=Get-PlanReceiptState ([IO.File]::ReadAllBytes($F.PlanPath)) $F.InitialPlan $receipt $true
            if ($plan -ne 'CONFLICT' -and (Fixture-Git $F.Root @('rev-parse','HEAD')) -ceq $F.InitialHead -and
                (Get-FixtureProtectedFingerprint $F) -ceq $F.InitialProtected -and -not $F.ExternalUnknown) { return 'CONTINUE' }
            return 'BLOCKED'
        }
        return Get-DiskRecoveryAction $F
    }
    if ($F.Strategy -eq 'A') {
        # Ordinary STANDARD has no automatic finalize evidence. Unknown ownership
        # needs a human decision; repeatable read-only verification remains safe.
        $authority=[IO.File]::ReadAllText($F.AuthorityPath,$utf8) | ConvertFrom-Json
        if ($authority.externalUnknown -or -not $authority.ownershipKnown -or
            (Fixture-Git $F.Root @('rev-parse','HEAD')) -cne $authority.head -or
            @(Fixture-Git $F.Root @('diff','--cached','--name-only')).Count -gt 0 -or
            [IO.File]::ReadAllText($F.NotesPath,$utf8) -cne $authority.notesText -or
            [IO.File]::ReadAllText($F.PlanPath,$utf8) -cne $authority.planText) { return 'BLOCKED' }
        $dirty=@(Fixture-Git $F.Root @('status','--porcelain','--','app.txt')).Count -gt 0
        if ($dirty) { return 'VERIFY_THEN_CONFIRM' }
        return 'CONTINUE'
    }
    $c=Read-Checkpoint $F
    if ($c.externalUnknown -or (Fixture-Git $F.Root @('rev-parse','HEAD')) -cne $c.head -or
        (Get-PlanBytesHash ([IO.File]::ReadAllBytes($F.PlanPath))) -cne $c.plan) { return 'BLOCKED' }
    if ($c.state -eq 'FINALIZED') { return 'CONTINUE' }
    if ($c.state -eq 'VERIFIED' -and (Get-PlanBytesHash ([IO.File]::ReadAllBytes($F.CodePath))) -ceq $c.allowedContent) { return 'FINALIZE' }
    if (@(Fixture-Git $F.Root @('status','--porcelain','--','app.txt')).Count -gt 0) { return 'VERIFY' }
    return 'CONTINUE'
}
function Matrix-Finalize {
    param($F,[switch]$CutAfterRecord)
    if ((Matrix-Action $F) -ne 'FINALIZE') { throw 'Fixture finalize requires derived FINALIZE' }
    if ($F.Strategy -eq 'B') {
        $j=Read-FixtureJournal $F
        $receipt=Get-PlanReceiptBytes $j['Atomic Unit'] $j['Verified Mutation Fingerprint'] $j['Evidence']
        $bytes=[IO.File]::ReadAllBytes($F.PlanPath)
        $state=Get-PlanReceiptState $bytes $j['Plan Baseline Fingerprint'] $receipt $true
        if ($state -eq 'UNCHANGED') { Matrix-Write $F.PlanPath ([byte[]]($bytes+$receipt)) 'receipt' -Atomic }
        Matrix-Check ((Get-PlanReceiptState ([IO.File]::ReadAllBytes($F.PlanPath)) $j['Plan Baseline Fingerprint'] $receipt $true) -ceq 'APPLIED') 'real receipt read back'
        if ($CutAfterRecord) { return }
        if ((Matrix-Action $F) -ne 'FINALIZE') { throw 'Final cleanup guard changed' }
        [IO.File]::Delete($F.JournalPath);$script:currentCosts.cleanupDeletes++
    } elseif ($F.Strategy -eq 'C') {
        $c=Read-Checkpoint $F;$c.state='FINALIZED';Save-Checkpoint $F $c
        if ($CutAfterRecord) { return }
        [IO.File]::Delete($F.CheckpointPath);$script:currentCosts.cleanupDeletes++
    }
}

$caseNames=@('initial-prepare','coherent-repeated-edits','separate-next-batch','mutation-interrupted','verification-interrupted','finalize-interrupted','head-drift','index-drift','protected-drift','dirty-unrelated-preserved','unknown-external','unknown-ownership')
try {
    [void](New-Item -ItemType Directory -Path $fixtureRoot)
    foreach($case in $caseNames) {
        foreach($strategy in @('A','B','C')) {
            $f=New-MatrixFixture $strategy $case
            $currentCosts=[ordered]@{fileWrites=0;atomicReplacements=0;journalWrites=0;checkpointWrites=0;mutationWrites=0;receiptWrites=0;verificationCommands=0;restartDispatches=0;cleanupDeletes=0;externalDispatches=0}
            Matrix-Check (-not [IO.File]::Exists($f.JournalPath) -and -not [IO.File]::Exists($f.CheckpointPath)) 'identical seed has no strategy persistence'
            Prepare-Matrix $f
            if ($strategy -eq 'B') { Matrix-Check ($currentCosts.journalWrites -eq 1 -and $currentCosts.atomicReplacements -eq 0) 'B initial journal is an actual new output write' }
            switch($case) {
                'coherent-repeated-edits' { Matrix-Mutate $f 'intermediate';Matrix-Mutate $f 'verified code' -PersistState;Matrix-Verify $f }
                'separate-next-batch' {
                    Matrix-Mutate $f -PersistState;Matrix-Verify $f
                    if ($strategy -ne 'A') { Matrix-Finalize $f }
                    # Prior batch left app.txt dirty. B must refuse a new PREPARED.
                    $f.AllowedClean=(@(Fixture-Git $f.Root @('status','--porcelain','--','app.txt')).Count -eq 0)
                    if ($strategy -eq 'C') { Prepare-Matrix $f }
                }
                'mutation-interrupted' { Matrix-Mutate $f }
                'verification-interrupted' { Matrix-Mutate $f -PersistState;Matrix-Verify $f -CutBeforeCommand }
                'finalize-interrupted' {
                    Matrix-Mutate $f -PersistState;Matrix-Verify $f
                    if ($strategy -ne 'A') { Matrix-Finalize $f -CutAfterRecord }
                }
                'head-drift' {
                    Matrix-Mutate $f -PersistState;Matrix-Verify $f
                    Fixture-Git $f.Root @('-c','user.name=Matrix fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','head drift') | Out-Null
                }
                'index-drift' {
                    Matrix-Mutate $f -PersistState;Matrix-Verify $f
                    $original=[IO.File]::ReadAllBytes($f.PlanPath)
                    [IO.File]::AppendAllText($f.PlanPath,'staged conflict',$utf8)
                    Fixture-Git $f.Root @('add','--','PLAN.md') | Out-Null
                    [IO.File]::WriteAllBytes($f.PlanPath,$original)
                }
                'protected-drift' {
                    Matrix-Mutate $f -PersistState;Matrix-Verify $f
                    [IO.File]::AppendAllText($f.NotesPath,' conflicting edit',$utf8)
                }
                'dirty-unrelated-preserved' { Matrix-Mutate $f -PersistState;Matrix-Verify $f }
                'unknown-external' {
                    $f.ExternalUnknown=$true
                    $authority=[IO.File]::ReadAllText($f.AuthorityPath,$utf8) | ConvertFrom-Json
                    $authority.externalUnknown=$true
                    [IO.File]::WriteAllText($f.AuthorityPath,($authority | ConvertTo-Json -Compress),$utf8)
                    if ($strategy -eq 'B') { $j=Read-FixtureJournal $f;$j['External Non-Idempotent Risk']='POSSIBLE';Matrix-Journal $f $j }
                    if ($strategy -eq 'C') { $c=Read-Checkpoint $f;$c.externalUnknown=$true;Save-Checkpoint $f $c }
                }
                'unknown-ownership' {
                    Matrix-Mutate $f
                    $f.OwnershipKnown=$false
                    $authority=[IO.File]::ReadAllText($f.AuthorityPath,$utf8) | ConvertFrom-Json
                    $authority.ownershipKnown=$false
                    [IO.File]::WriteAllText($f.AuthorityPath,($authority | ConvertTo-Json -Compress),$utf8)
                    # Neither strict fixture claims its own unowned mutation:
                    # an actual protected drift is supplied, not a Boolean shortcut.
                    [IO.File]::AppendAllText($f.NotesPath,' conflicting edit',$utf8)
                }
            }
            $action=Matrix-Action $f
            $resumeCompletion='NOT_DISPATCHED'
            if ($case -eq 'finalize-interrupted' -and $strategy -eq 'B') {
                Matrix-Check ($action -eq 'FINALIZE') 'interrupted receipt recognized on fresh read'
                Matrix-Finalize $f
                $resumeCompletion=Matrix-Action $f
                Matrix-Check ($resumeCompletion -eq 'CONTINUE' -and $currentCosts.receiptWrites -eq 1 -and $currentCosts.cleanupDeletes -eq 1) 'resume cleans journal without duplicate receipt'
            }
            # Independent oracle uses task/safety rules named here, not resolver output.
            $conflict=$case -in @('head-drift','index-drift','protected-drift','unknown-external','unknown-ownership')
            # VERIFY_THEN_CONFIRM is read-only and never authorizes mutation or
            # finalize. C VERIFY means automatic unit progression in this model.
            $unsafe=$conflict -and $action -in @('CONTINUE','RETRY_SAFE_UNIT','VERIFY','FINALIZE')
            $falseBlocked=(-not $conflict -and $action -eq 'BLOCKED')
            $human=($action -in @('BLOCKED','VERIFY_THEN_CONFIRM'))
            $notesPreserved=if ($case -in @('protected-drift','unknown-ownership')) {
                [IO.File]::ReadAllText($f.NotesPath,$utf8) -ceq 'tracked notes + existing user work conflicting edit'
            } else { (Get-PlanBytesHash ([IO.File]::ReadAllBytes($f.NotesPath))) -ceq $f.InitialNotes }
            Matrix-Check $notesPreserved 'existing and conflicting user notes remain untouched'
            if ($case -eq 'unknown-external') {
                # No actual retry dispatch occurs unless retry was derived.
                if ($action -eq 'RETRY_SAFE_UNIT') { $currentCosts.externalDispatches++ }
                Matrix-Check ($action -eq 'BLOCKED' -and $currentCosts.externalDispatches -eq 0 -and $currentCosts.mutationWrites -eq 0) 'unknown external: zero dispatch and mutation'
            }
            if ($strategy -eq 'B') {
                Matrix-Check (-not $unsafe) 'strict fixture obeys independent conflict oracle'
                if ($case -eq 'separate-next-batch') { Matrix-Check ($action -eq 'BLOCKED') 'dirty Allowed Path blocks separate prepare' }
            }
            $rows.Add([pscustomobject]@{
                strategy=$strategy;case=$case;restartAction=$action;resumeCompletion=$resumeCompletion;humanInterventionRequired=$human
                oracle=[pscustomobject]@{conflictRequiresBlock=$conflict;unsafeContinuation=$unsafe;falseBlockedUnderTaskOracle=$falseBlocked;classification=if($unsafe){'UNSAFE_OMITTED_GUARD'}elseif($falseBlocked){'SAFE_TASK_BLOCKED_BY_PREPARE_CONSTRAINT'}else{'CONSISTENT_WITH_BOUNDED_ORACLE'}}
                notesPreserved=$notesPreserved;journalPresent=[IO.File]::Exists($f.JournalPath);checkpointPresent=[IO.File]::Exists($f.CheckpointPath)
                observedCosts=[pscustomobject]$currentCosts
                evidence=[pscustomobject]@{planHash=(Get-PlanBytesHash ([IO.File]::ReadAllBytes($f.PlanPath)));allowedHash=(Get-PlanBytesHash ([IO.File]::ReadAllBytes($f.CodePath)));headChanged=((Fixture-Git $f.Root @('rev-parse','HEAD')) -cne $f.InitialHead);planIndexChanged=((Get-FixtureIndexRecord $f 'PLAN.md') -cne $f.InitialIndex);protectedNotesChanged=((Get-PlanBytesHash ([IO.File]::ReadAllBytes($f.NotesPath))) -cne $f.InitialNotes)}
            })
        }
    }
} finally {
    $resolved=[IO.Path]::GetFullPath($fixtureRoot)
    $basePrefix=$fixtureBase.TrimEnd([char[]]@('\','/')) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolved.StartsWith($basePrefix,[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($resolved) -notmatch '^kit-recovery-matrix-[a-f0-9]{32}\z') { throw 'Unsafe matrix cleanup' }
    if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
    $cleanupVerified=-not(Test-Path -LiteralPath $resolved)
    if (-not $cleanupVerified) { throw 'Matrix cleanup failed' }
}
$result=[ordered]@{
    schemaVersion=1;suite='M3 isolated recovery investigation';passed=$true;powerShellVersion=$PSVersionTable.PSVersion.ToString();cases=$rows.Count;assertions=$matrixAssertions;cleanupVerified=$cleanupVerified;setupExcluded=$setup
    strategies=[ordered]@{A='Ordinary STANDARD fixture: no repository journal or execution fingerprint routing; reread task authority, actual HEAD/staged diff/notes and PLAN text; bounded reads/verification and ownership confirmation before further writes on restart.';B='Fixture-only current strict schema-2 protocol with unchanged fingerprints and actual PLAN receipt.';C='One hypothetical checkpoint variant binding HEAD, allowed content, PLAN, state and external-risk flag; deliberately omits protected/index fingerprints.'}
    oracleRules=@('HEAD, PLAN-index, protected-state drift, unknown external result, or unknown ownership require BLOCKED before automatic mutation/finalize.', 'An authorized coherent batch without those conflicts is safe under the bounded task oracle.', 'Dirty Allowed Paths still require BLOCKED at a separate strict prepare; task-oracle falseBlocked labels cost, not a protocol violation.')
    costDefinition='Counter scope: fixture persistence after identical seed creation; one fileWrites per logical output write (atomic temporary write included once), actual File.Replace count, verification command invocations, explicit action derivation invocations, receipt writes, cleanup deletion and external retry dispatch. Seeding including experiment authority input, drift/authority injection, imported M1 setup, Git read commands and hashing excluded. No model/token/latency measurements.'
    limitations=@('Deterministic cut points, not real process kills, power loss, fsync guarantees or Codex compliance.','A/C are explicit fixture strategies, not shipped runtimes. A reads experiment-supplied task HEAD, original notes/PLAN text and risk/ownership input outside the repository; ordinary STANDARD does not necessarily provide those facts. A performs no execution fingerprint routing; hashes are separately collected by the oracle/reporter. Authority provenance/capture cost is excluded; this is not a generic restart classifier.','ASCII paths and one app file only; same Git content seeds, commit identities may differ across fresh repositories.','C only tests this one incomplete variant; findings do not disprove all lightweight designs.','The unknown-ownership case also injects protected notes drift. B BLOCKED does not prove author identity binding or detection of concurrent ownership inside Allowed Paths; C unsafe progression in this case is not an independent ownership-only result.','HumanInterventionRequired is a derived requirement, not observed human corrections. VERIFY_THEN_CONFIRM is read-only; unsafeContinuation labels automatic progression permission, not an actual conflicting write.','No external request dispatched; unknown external risk tests zero retry only.','Scope counters do not measure real workflow cost or comparative performance.')
    observations=@($rows.ToArray())
}
$json=$result | ConvertTo-Json -Depth 10
if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
    $resolvedOutput=[IO.Path]::GetFullPath($OutputPath)
    [IO.File]::WriteAllText($resolvedOutput,$json + "`n",$utf8)
}
if ($AsJson) { Write-Output $json } else { Write-Output "M3 isolated investigation passed: $($rows.Count) cases, $matrixAssertions assertions; cleanup verified; imported setup excluded." }
