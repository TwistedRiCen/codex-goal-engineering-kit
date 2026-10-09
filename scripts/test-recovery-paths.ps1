[CmdletBinding()]
param([switch]$AsJson)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# Fixture executor only: the Kit ships an instruction protocol, not this runtime.
# The field-line journal format below is a test serialization, not a new schema.
# Interruption means returning at a deterministic cut point, not killing Codex.
. (Join-Path $PSScriptRoot 'test-execution-continuity.ps1') | Out-Null
. (Join-Path $PSScriptRoot '../skills/goal-driven-engineering/scripts/plan-receipt.ps1')
$utf8 = New-Object Text.UTF8Encoding($false)
$journalFields = @('Schema Version', 'State', 'Atomic Unit', 'Intent', 'Prepared HEAD',
    'Protected Baseline Fingerprint', 'External Non-Idempotent Risk', 'Allowed Paths',
    'Verification Commands', 'Pass Condition', 'Verified Mutation Fingerprint',
    'Plan Baseline Fingerprint', 'Evidence', 'Blocker Reason')
$fixtureBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$fixtureRoot = Join-Path $fixtureBase ('kit-recovery-paths-' + [Guid]::NewGuid().ToString('N'))
$observations = New-Object 'System.Collections.Generic.List[object]'
$assertionCount = 0
$atomicReplaceCount = 0
$cleanupVerified = $false

function Check {
    param([bool]$Condition, [string]$Message)
    $script:assertionCount++
    if (-not $Condition) { throw "Recovery-path assertion failed: $Message" }
}
function Fixture-Git {
    param([string]$Root, [string[]]$Arguments)
    $result = & git -C $Root @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Fixture Git failed: $($Arguments -join ' ')" }
    return $result
}
function Write-AtomicFixtureBytes {
    param([string]$Path, [byte[]]$Bytes)
    # Same-directory replacement, actually executed; no production writer is added.
    $temporary = $Path + '.fixture-' + [Guid]::NewGuid().ToString('N')
    $backup = $temporary + '.backup'
    try {
        [IO.File]::WriteAllBytes($temporary, $Bytes)
        if ([IO.File]::Exists($Path)) {
            [IO.File]::Replace($temporary, $Path, $backup)
            $script:atomicReplaceCount++
        } else { [IO.File]::Move($temporary, $Path) }
    } finally {
        if ([IO.File]::Exists($temporary)) { [IO.File]::Delete($temporary) }
        if ([IO.File]::Exists($backup)) { [IO.File]::Delete($backup) }
    }
}
function Write-FixtureJournal {
    param($Fixture, $Journal)
    $lines = foreach ($field in $journalFields) { $field + ': ' + [string]$Journal[$field] }
    Write-AtomicFixtureBytes $Fixture.JournalPath $utf8.GetBytes(($lines -join "`n") + "`n")
}
function Read-FixtureJournal {
    param($Fixture)
    $journal = [ordered]@{}
    foreach ($line in [IO.File]::ReadAllLines($Fixture.JournalPath, $utf8)) {
        if ($line -notmatch '^([^:]+): (.*)$') { throw 'Malformed fixture journal line' }
        $field = $Matches[1]
        if ($field -notin $journalFields -or $journal.Contains($field)) { throw 'Unknown or duplicate fixture field' }
        $journal[$field] = $Matches[2]
    }
    if ($journal.Count -ne $journalFields.Count -or $journal['Schema Version'] -cne '2' -or
        $journal['State'] -notin @('PREPARED','MUTATED','VERIFYING','VERIFIED','BLOCKED') -or
        $journal['Atomic Unit'] -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\z' -or
        $journal['Allowed Paths'] -cne 'app.txt' -or
        $journal['External Non-Idempotent Risk'] -notin @('NONE','POSSIBLE')) {
        throw 'Incomplete or unsupported fixture journal'
    }
    foreach ($field in @('Protected Baseline Fingerprint','Plan Baseline Fingerprint')) {
        if ($journal[$field] -notmatch '^[a-f0-9]{64}\z') { throw 'Missing fixture baseline' }
    }
    if ($journal['State'] -eq 'VERIFIED' -and
        ($journal['Verified Mutation Fingerprint'] -notmatch '^[a-f0-9]{64}\z' -or
         [string]::IsNullOrEmpty($journal['Evidence']))) { throw 'Missing verified fixture evidence' }
    return $journal
}
function Get-FixtureIndexRecord {
    param($Fixture, [string]$Path)
    $entry = @(Fixture-Git $Fixture.Root @('ls-files','--stage','--',$Path)) -join '|'
    return (ConvertTo-LengthPrefixedRecord $Path) + (ConvertTo-LengthPrefixedRecord $entry)
}
function Get-FixtureProtectedFingerprint {
    param($Fixture)
    # Bounded ASCII fixture filenames; not a general Git porcelain/path parser.
    $entries = @('plan-index:' + (Get-FixtureIndexRecord $Fixture 'PLAN.md'))
    foreach ($row in @(Fixture-Git $Fixture.Root @('status','--porcelain','--untracked-files=all'))) {
        $path = $row.Substring(3)
        if ($path -in @('app.txt','PLAN.md') -or $path.StartsWith('.goal/')) { continue }
        $file = Join-Path $Fixture.Root $path
        $content = if ([IO.File]::Exists($file)) { Get-PlanBytesHash ([IO.File]::ReadAllBytes($file)) } else { 'ABSENT' }
        $entries += (ConvertTo-LengthPrefixedRecord $path) +
            (ConvertTo-LengthPrefixedRecord $row.Substring(0,2)) +
            (ConvertTo-LengthPrefixedRecord (Get-FixtureIndexRecord $Fixture $path)) +
            (ConvertTo-LengthPrefixedRecord $content)
    }
    return Get-DeterministicFingerprint -Kind ProtectedBaseline -Entries $entries
}
function Get-FixtureMutationFingerprint {
    param($Fixture, [string]$PreparedHead)
    $status = @(Fixture-Git $Fixture.Root @('status','--porcelain','--','app.txt')) -join '|'
    $content = if ([IO.File]::Exists($Fixture.CodePath)) { Get-PlanBytesHash ([IO.File]::ReadAllBytes($Fixture.CodePath)) } else { 'ABSENT' }
    $entry = (ConvertTo-LengthPrefixedRecord 'app.txt') +
        (ConvertTo-LengthPrefixedRecord $status) + (ConvertTo-LengthPrefixedRecord $content) +
        (ConvertTo-LengthPrefixedRecord (Get-FixtureIndexRecord $Fixture 'app.txt'))
    return Get-DeterministicFingerprint -Kind VerifiedMutation -PreparedHead $PreparedHead -Entries @($entry)
}
function New-RecoveryFixture {
    param([string]$Name)
    $root = Join-Path $fixtureRoot $Name
    [void](New-Item -ItemType Directory -Path (Join-Path $root '.goal') -Force)
    $fixture = [pscustomobject]@{
        Root = $root; PlanPath = (Join-Path $root 'PLAN.md'); CodePath = (Join-Path $root 'app.txt')
        NotesPath = (Join-Path $root 'notes.txt'); JournalPath = (Join-Path $root '.goal/execution-state.md')
        VerificationRuns = 0; MutationRuns = 0; ReceiptWrites = 0
    }
    Fixture-Git $root @('init','-q') | Out-Null
    Fixture-Git $root @('config','core.autocrlf','false') | Out-Null
    [IO.File]::WriteAllBytes($fixture.PlanPath, $utf8.GetBytes("# PLAN`r`nFrozen decision: preserve user work`r`n"))
    [IO.File]::WriteAllText($fixture.CodePath, 'before', $utf8)
    [IO.File]::WriteAllText($fixture.NotesPath, 'tracked notes', $utf8)
    Fixture-Git $root @('add','--','PLAN.md','app.txt','notes.txt') | Out-Null
    Fixture-Git $root @('-c','user.name=Recovery fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture baseline') | Out-Null
    # Existing user modification outside Allowed Paths is protected, not reset.
    [IO.File]::AppendAllText($fixture.NotesPath, ' + existing user work', $utf8)
    $journal = [ordered]@{
        'Schema Version'='2'; 'State'='PREPARED'; 'Atomic Unit'=('fixture-' + $Name)
        'Intent'='bounded app mutation'; 'Prepared HEAD'=(Fixture-Git $root @('rev-parse','HEAD'))
        'Protected Baseline Fingerprint'=(Get-FixtureProtectedFingerprint $fixture)
        'External Non-Idempotent Risk'='NONE'; 'Allowed Paths'='app.txt'
        'Verification Commands'='git diff --check'; 'Pass Condition'='diff check passes; app equals verified code'
        'Verified Mutation Fingerprint'=''; 'Plan Baseline Fingerprint'=(Get-PlanBytesHash ([IO.File]::ReadAllBytes($fixture.PlanPath)))
        'Evidence'=''; 'Blocker Reason'=''
    }
    Write-FixtureJournal $fixture $journal
    return $fixture
}
function Get-DiskRecoveryAction {
    param($Fixture)
    try { $journal = Read-FixtureJournal $Fixture } catch { return 'BLOCKED' }
    if (-not [IO.File]::Exists($Fixture.PlanPath)) { return 'BLOCKED' }
    $verified = $journal['State'] -eq 'VERIFIED'
    $receipt = [byte[]]@()
    if ($verified) {
        $receipt = Get-PlanReceiptBytes $journal['Atomic Unit'] $journal['Verified Mutation Fingerprint'] $journal['Evidence']
    }
    $planState = Get-PlanReceiptState ([IO.File]::ReadAllBytes($Fixture.PlanPath)) $journal['Plan Baseline Fingerprint'] $receipt $verified
    $mutation = @(Fixture-Git $Fixture.Root @('status','--porcelain','--','app.txt')).Count -gt 0
    $matchingMutation = $verified -and ((Get-FixtureMutationFingerprint $Fixture $journal['Prepared HEAD']) -ceq $journal['Verified Mutation Fingerprint'])
    $inputArgs = @{
        State=$journal['State']; PlanConsistent=($planState -ne 'CONFLICT'); MutationPresent=$mutation
        HeadMatches=((Fixture-Git $Fixture.Root @('rev-parse','HEAD')) -ceq $journal['Prepared HEAD'])
        ProtectedBaselineMatches=((Get-FixtureProtectedFingerprint $Fixture) -ceq $journal['Protected Baseline Fingerprint'])
        PlanFinalized=($planState -eq 'APPLIED'); PlanFinalizedFingerprintMatches=($planState -eq 'APPLIED')
        VerifiedMutationFingerprintPresent=$verified; VerifiedMutationFingerprintMatches=$matchingMutation
        # Only NONE and POSSIBLE without durable external-result evidence are exercised.
        ExternalNonIdempotentRiskPossible=($journal['External Non-Idempotent Risk'] -eq 'POSSIBLE')
    }
    return Resolve-ExecutionContinuityAction (New-RecoveryInput @inputArgs)
}
function Set-FixtureVerified {
    param($Fixture)
    $journal = Read-FixtureJournal $Fixture
    [IO.File]::WriteAllText($Fixture.CodePath, 'verified code', $utf8)
    $Fixture.MutationRuns++
    $journal['State']='MUTATED'; Write-FixtureJournal $Fixture $journal
    $journal['State']='VERIFYING'; Write-FixtureJournal $Fixture $journal
    Fixture-Git $Fixture.Root @('diff','--check') | Out-Null
    $Fixture.VerificationRuns++
    Check ([IO.File]::ReadAllText($Fixture.CodePath, $utf8) -ceq 'verified code') 'actual fixture pass condition'
    Check ((Get-PlanBytesHash ([IO.File]::ReadAllBytes($Fixture.PlanPath))) -ceq $journal['Plan Baseline Fingerprint']) 'PLAN unchanged at verification'
    $journal['Verified Mutation Fingerprint']=Get-FixtureMutationFingerprint $Fixture $journal['Prepared HEAD']
    $journal['Evidence']='git diff --check passed; app.txt exact content checked'
    $journal['State']='VERIFIED'; Write-FixtureJournal $Fixture $journal
}
function Complete-FixtureFinalize {
    param($Fixture, [switch]$InterruptAfterReceipt)
    $action = Get-DiskRecoveryAction $Fixture
    if ($action -ne 'FINALIZE') { return $action }
    $journal = Read-FixtureJournal $Fixture
    $receipt = Get-PlanReceiptBytes $journal['Atomic Unit'] $journal['Verified Mutation Fingerprint'] $journal['Evidence']
    $bytes = [IO.File]::ReadAllBytes($Fixture.PlanPath)
    $state = Get-PlanReceiptState $bytes $journal['Plan Baseline Fingerprint'] $receipt $true
    if ($state -eq 'UNCHANGED') {
        Write-AtomicFixtureBytes $Fixture.PlanPath ([byte[]]($bytes + $receipt))
        $Fixture.ReceiptWrites++
    }
    Check ((Get-PlanReceiptState ([IO.File]::ReadAllBytes($Fixture.PlanPath)) $journal['Plan Baseline Fingerprint'] $receipt $true) -ceq 'APPLIED') 'receipt persisted before cleanup'
    if ($InterruptAfterReceipt) { return 'INTERRUPTED_AFTER_RECEIPT' }
    # Re-observe disk/Git before cleanup, never trust the earlier action.
    if ((Get-DiskRecoveryAction $Fixture) -ne 'FINALIZE') { return 'BLOCKED' }
    [IO.File]::Delete($Fixture.JournalPath)
    return 'FINALIZED'
}
function Record-Observation {
    param([string]$Name, [string]$Action, $Fixture, [string]$Evidence)
    $observations.Add([pscustomobject]@{
        case=$Name; outcome=$Action; evidence=$Evidence
        journalPresent=[IO.File]::Exists($Fixture.JournalPath)
        verificationRuns=$Fixture.VerificationRuns; mutationRuns=$Fixture.MutationRuns; receiptWrites=$Fixture.ReceiptWrites
    })
}

try {
    [void](New-Item -ItemType Directory -Path $fixtureRoot)
    $fixture = New-RecoveryFixture 'roundtrip'
    $diskJournal = Read-FixtureJournal $fixture
    Check ($diskJournal.Count -eq 14) 'all fourteen schema-2 fields roundtrip'
    Check ((Get-DiskRecoveryAction $fixture) -ceq 'RETRY_SAFE_UNIT') 'PREPARED disk state without mutation'
    Record-Observation 'prepared-disk-roundtrip' 'RETRY_SAFE_UNIT' $fixture '14 fields parsed from persisted journal and real Git state'
    [IO.File]::WriteAllText($fixture.CodePath, 'verified code', $utf8)
    $fixture.MutationRuns++
    Check ((Read-FixtureJournal $fixture)['State'] -ceq 'PREPARED') 'cut point precedes journal update'
    Check ((Get-DiskRecoveryAction $fixture) -ceq 'VERIFY') 'mutation observed from Git with stale PREPARED journal'
    Record-Observation 'mutation-before-journal-update' 'VERIFY' $fixture 'app mutation exists while journal remains PREPARED'
    $diskJournal['State']='VERIFYING'; Write-FixtureJournal $fixture $diskJournal
    Check ((Get-DiskRecoveryAction $fixture) -ceq 'VERIFY') 'interrupted VERIFYING re-observed from disk'
    Record-Observation 'verification-cut-point' 'VERIFY' $fixture 'persisted VERIFYING journal; verification not yet invoked'
    Set-FixtureVerified $fixture
    Check ((Get-DiskRecoveryAction $fixture) -ceq 'FINALIZE') 'actual verification binds current mutation'
    Record-Observation 'atomic-verified-journal' 'FINALIZE' $fixture 'journal replaced via File.Replace after actual diff check and content check'
    $beforeReceipt = [IO.File]::ReadAllBytes($fixture.PlanPath)
    Check ((Complete-FixtureFinalize $fixture -InterruptAfterReceipt) -ceq 'INTERRUPTED_AFTER_RECEIPT') 'finalize cut point'
    Check ([IO.File]::Exists($fixture.JournalPath)) 'journal survives finalize interruption'
    $afterReceipt = [IO.File]::ReadAllBytes($fixture.PlanPath)
    Check ($afterReceipt.Length -gt $beforeReceipt.Length) 'PLAN receipt actually persisted'
    Check ((Get-DiskRecoveryAction $fixture) -ceq 'FINALIZE') 'fresh disk read recognizes exact matching receipt'
    Check ((Complete-FixtureFinalize $fixture) -ceq 'FINALIZED') 'resume cleanup completes'
    Check (-not [IO.File]::Exists($fixture.JournalPath)) 'journal removed only after recheck'
    Check ($fixture.ReceiptWrites -eq 1) 'resume never appends receipt twice'
    Check ((Get-PlanBytesHash ([IO.File]::ReadAllBytes($fixture.PlanPath))) -ceq (Get-PlanBytesHash $afterReceipt)) 'cleanup preserves persisted receipt bytes'
    Check ([IO.File]::ReadAllText($fixture.NotesPath, $utf8) -ceq 'tracked notes + existing user work') 'existing protected work preserved'
    Record-Observation 'interrupted-finalize-resume' 'FINALIZED' $fixture 'exact receipt read back; journal cleanup; one receipt write across two fixture invocations'

    foreach ($conflict in @('protected','plan-index','head','mutation-after-receipt','plan-decision','partial-receipt','duplicate-receipt')) {
        $fixture = New-RecoveryFixture $conflict
        Set-FixtureVerified $fixture
        if ($conflict -in @('protected','plan-index','head','mutation-after-receipt','duplicate-receipt')) {
            Check ((Complete-FixtureFinalize $fixture -InterruptAfterReceipt) -ceq 'INTERRUPTED_AFTER_RECEIPT') "$conflict receipt persisted"
        }
        switch ($conflict) {
            'protected' { [IO.File]::AppendAllText($fixture.NotesPath, ' conflicting edit', $utf8) }
            'plan-index' {
                $unchangedWorktree=[IO.File]::ReadAllBytes($fixture.PlanPath)
                [IO.File]::AppendAllText($fixture.PlanPath, 'staged conflict', $utf8)
                Fixture-Git $fixture.Root @('add','--','PLAN.md') | Out-Null
                [IO.File]::WriteAllBytes($fixture.PlanPath, $unchangedWorktree)
                $journal=Read-FixtureJournal $fixture
                $receipt=Get-PlanReceiptBytes $journal['Atomic Unit'] $journal['Verified Mutation Fingerprint'] $journal['Evidence']
                Check ((Get-PlanReceiptState $unchangedWorktree $journal['Plan Baseline Fingerprint'] $receipt $true) -ceq 'APPLIED') 'index conflict isolated from valid PLAN worktree receipt'
            }
            'head' { Fixture-Git $fixture.Root @('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','head drift') | Out-Null }
            'mutation-after-receipt' { [IO.File]::WriteAllText($fixture.CodePath, 'changed after verification', $utf8) }
            'plan-decision' { [IO.File]::AppendAllText($fixture.PlanPath, 'conflicting decision', $utf8) }
            'partial-receipt' {
                $journal=Read-FixtureJournal $fixture
                $receipt=Get-PlanReceiptBytes $journal['Atomic Unit'] $journal['Verified Mutation Fingerprint'] $journal['Evidence']
                [IO.File]::WriteAllBytes($fixture.PlanPath, [byte[]]([IO.File]::ReadAllBytes($fixture.PlanPath) + $receipt[0..12]))
            }
            'duplicate-receipt' {
                $journal=Read-FixtureJournal $fixture
                $receipt=Get-PlanReceiptBytes $journal['Atomic Unit'] $journal['Verified Mutation Fingerprint'] $journal['Evidence']
                [IO.File]::WriteAllBytes($fixture.PlanPath, [byte[]]([IO.File]::ReadAllBytes($fixture.PlanPath) + $receipt))
            }
        }
        $planHash=Get-PlanBytesHash ([IO.File]::ReadAllBytes($fixture.PlanPath))
        Check ((Get-DiskRecoveryAction $fixture) -ceq 'BLOCKED') "$conflict derived from real disk or Git conflict"
        Check ((Complete-FixtureFinalize $fixture) -ceq 'BLOCKED') "$conflict refuses finalize"
        Check ([IO.File]::Exists($fixture.JournalPath)) "$conflict retains journal"
        Check ((Get-PlanBytesHash ([IO.File]::ReadAllBytes($fixture.PlanPath))) -ceq $planHash) "$conflict leaves conflicting PLAN unchanged"
        Record-Observation $conflict 'BLOCKED' $fixture 'actual disk/Git conflict; fixture executor refuses finalize and preserves journal/PLAN'
    }

    $fixture = New-RecoveryFixture 'unknown-external'
    $journal=Read-FixtureJournal $fixture
    $journal['External Non-Idempotent Risk']='POSSIBLE'; Write-FixtureJournal $fixture $journal
    $codeBefore=Get-PlanBytesHash ([IO.File]::ReadAllBytes($fixture.CodePath))
    $action=Get-DiskRecoveryAction $fixture
    # Fixture retry dispatch only executes on RETRY_SAFE_UNIT; no network operation.
    if ($action -eq 'RETRY_SAFE_UNIT') { Set-FixtureVerified $fixture }
    Check ($action -ceq 'BLOCKED') 'unknown external outcome is blocked before retry dispatch'
    Check ($fixture.MutationRuns -eq 0 -and $fixture.VerificationRuns -eq 0) 'no retry or verification dispatched'
    Check ((Get-PlanBytesHash ([IO.File]::ReadAllBytes($fixture.CodePath))) -ceq $codeBefore) 'unknown outcome leaves app bytes unchanged'
    Check ([IO.File]::Exists($fixture.JournalPath)) 'unknown outcome retains journal'
    Record-Observation 'unknown-external-no-retry' $action $fixture 'persisted POSSIBLE; dispatch observed zero mutations/verification; no external action performed'

    foreach ($invalid in @('missing-baseline','unsupported-schema','duplicate-field')) {
        $fixture=New-RecoveryFixture $invalid
        $text=[IO.File]::ReadAllText($fixture.JournalPath, $utf8)
        switch ($invalid) {
            'missing-baseline' { $text=$text -replace '(?m)^Plan Baseline Fingerprint: [^\n]*\n','' }
            'unsupported-schema' { $text=$text.Replace('Schema Version: 2','Schema Version: 99') }
            'duplicate-field' { $text += "State: VERIFIED`n" }
        }
        [IO.File]::WriteAllText($fixture.JournalPath, $text, $utf8)
        Check ((Get-DiskRecoveryAction $fixture) -ceq 'BLOCKED') "$invalid persisted journal fails closed"
        Check ((Complete-FixtureFinalize $fixture) -ceq 'BLOCKED') "$invalid cannot clean up"
        Check ([IO.File]::Exists($fixture.JournalPath)) "$invalid preserved for reconciliation"
        Record-Observation $invalid 'BLOCKED' $fixture 'fixture parser refuses invalid persisted journal; no cleanup'
    }
} finally {
    # Single-shell, exact GUID directory cleanup, with resolved containment check.
    $resolvedRoot=[IO.Path]::GetFullPath($fixtureRoot)
    $resolvedBase=$fixtureBase.TrimEnd([char[]]@('\','/')) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolvedRoot.StartsWith($resolvedBase, [StringComparison]::OrdinalIgnoreCase) -or
        [IO.Path]::GetFileName($resolvedRoot) -notmatch '^kit-recovery-paths-[a-f0-9]{32}\z') { throw 'Unsafe recovery fixture cleanup' }
    if (Test-Path -LiteralPath $resolvedRoot) { Remove-Item -LiteralPath $resolvedRoot -Recurse -Force }
    $cleanupVerified = -not (Test-Path -LiteralPath $resolvedRoot)
    if (-not $cleanupVerified) { throw 'Recovery fixture cleanup failed' }
}
$summary=[pscustomobject]@{
    schemaVersion=1; suite='isolated-recovery-paths'; passed=$true
    evidenceBoundary='Fixture executor plus shipped receipt helper and test resolver; deterministic interruption cut points; not Codex execution or crash-durability evidence.'
    limitations=@('Bounded ASCII fixture paths and schema-2 field-line test serialization only.',
        'No real process kill, power-loss/fsync guarantee, external request, schema-1 migration, or matching external-result evidence branch exercised.')
    cases=$observations.Count; assertions=$assertionCount; atomicReplacements=$atomicReplaceCount
    cleanupVerified=$cleanupVerified; observations=@($observations.ToArray())
}
if ($AsJson) { $summary | ConvertTo-Json -Depth 6 }
else {
    Write-Output "Isolated recovery paths passed: $($summary.cases) cases, $assertionCount assertions, $atomicReplaceCount atomic file replacements; temporary cleanup verified."
    Write-Output $summary.evidenceBoundary
}
