[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'test-execution-continuity.ps1')
. (Join-Path $PSScriptRoot '../skills/goal-driven-engineering/scripts/plan-receipt.ps1')
$fixtureBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$fixtureRoot = Join-Path $fixtureBase ('kit-receipt-' + [Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $fixtureRoot)
function Git-Fixture {
    param([string[]]$Arguments)
    $output = & git -C $caseRoot @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Fixture git failed: $Arguments" }
    return $output
}
function Get-ProtectedFixtureHash {
    $entries = @('plan-index:' + ((Git-Fixture @('ls-files','--stage','--','PLAN.md')) -join '|'))
    foreach ($row in @(Git-Fixture @('status','--porcelain','--untracked-files=all'))) {
        $path = $row.Substring(3)
        if ($path -in @('app.txt','PLAN.md')) { continue }
        $entries += $row + ':' + (Get-FileHash -LiteralPath (Join-Path $caseRoot $path)).Hash
    }
    return Get-DeterministicFingerprint -Kind ProtectedBaseline -Entries $entries
}
function Get-ReceiptAction {
    param([bool]$Verified = $true)
    $state = Get-PlanReceiptState ([IO.File]::ReadAllBytes($planPath)) $planBaseline $receipt $Verified
    $currentCode = (Get-FileHash -LiteralPath $codePath).Hash.ToLowerInvariant()
    $inputArgs = @{
        State = $(if ($Verified) {'VERIFIED'} else {'MUTATED'})
        PlanConsistent = ($state -ne 'CONFLICT')
        PlanFinalized = ($state -eq 'APPLIED')
        PlanFinalizedFingerprintMatches = ($state -eq 'APPLIED')
        MutationPresent = $true
        VerifiedMutationFingerprintPresent = $Verified
        VerifiedMutationFingerprintMatches = ($currentCode -eq $codeHash)
        ProtectedBaselineMatches = ((Get-ProtectedFixtureHash) -eq $protectedHash)
        HeadMatches = ((Git-Fixture @('rev-parse','HEAD')) -eq $preparedHead)
    }
    return Resolve-ExecutionContinuityAction (New-RecoveryInput @inputArgs)
}
try {
    foreach ($kind in @('clean','dirty','untracked')) {
        $caseRoot = Join-Path $fixtureRoot $kind
        [void](New-Item -ItemType Directory -Path $caseRoot)
        Git-Fixture @('init','-q')
        Git-Fixture @('config','core.autocrlf','false')
        $planPath = Join-Path $caseRoot 'PLAN.md'
        $codePath = Join-Path $caseRoot 'app.txt'
        $notesPath = Join-Path $caseRoot 'notes.txt'
        [IO.File]::WriteAllText($planPath, "Goal: preserve decisions" + [char]13 + [char]10)
        [IO.File]::WriteAllText($codePath, 'before')
        [IO.File]::WriteAllText($notesPath, 'baseline')
        Git-Fixture @('add','--','app.txt','notes.txt')
        if ($kind -ne 'untracked') { Git-Fixture @('add','--','PLAN.md') }
        Git-Fixture @('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','baseline')
        if ($kind -eq 'dirty') { [IO.File]::AppendAllText($planPath, 'existing user decision') }
        $preparedHead = Git-Fixture @('rev-parse','HEAD')
        $planBefore = [IO.File]::ReadAllBytes($planPath)
        $planBaseline = Get-PlanBytesHash $planBefore
        $protectedHash = Get-ProtectedFixtureHash
        [IO.File]::WriteAllText($codePath, 'verified code')
        $codeHash = (Get-FileHash -LiteralPath $codePath).Hash.ToLowerInvariant()
        $receipt = Get-PlanReceiptBytes -AtomicUnit 'fixture-unit' -MutationFingerprint $codeHash -Evidence 'tests passed'
        Assert-Equal 'FINALIZE' (Get-ReceiptAction) "$kind before PLAN write"
        $applied = [byte[]]($planBefore + $receipt)
        [IO.File]::WriteAllBytes($planPath, $applied)
        Assert-Equal 'FINALIZE' (Get-ReceiptAction) "$kind after PLAN write before journal deletion"
        Assert-Equal 'BLOCKED' (Get-ReceiptAction $false) "$kind unverified receipt"
        foreach ($badBytes in @(
            [byte[]]($applied + $receipt),
            [byte[]]($planBefore + $receipt[0..12]),
            [byte[]]([Text.Encoding]::UTF8.GetBytes('changed decision') + $receipt),
            [byte[]]($applied + [byte[]]@(65))
        )) {
            [IO.File]::WriteAllBytes($planPath, $badBytes)
            Assert-Equal 'BLOCKED' (Get-ReceiptAction) "$kind malformed or conflicting PLAN"
        }
        [IO.File]::WriteAllBytes($planPath, $applied)
        [IO.File]::WriteAllText($codePath, 'code drift')
        Assert-Equal 'BLOCKED' (Get-ReceiptAction) "$kind code drift after receipt"
        [IO.File]::WriteAllText($codePath, 'verified code')
        [IO.File]::WriteAllText($notesPath, 'outside drift')
        Assert-Equal 'BLOCKED' (Get-ReceiptAction) "$kind protected drift after receipt"
        [IO.File]::WriteAllText($notesPath, 'baseline')
        Git-Fixture @('add','--','PLAN.md')
        Assert-Equal 'BLOCKED' (Get-ReceiptAction) "$kind PLAN index drift"
    }
    foreach ($badKind in @('unit','mutation','baseline')) {
        $refused = $false
        try {
            if ($badKind -eq 'unit') { Get-PlanReceiptBytes ('unit' + [char]10) ('a' * 64) 'evidence' | Out-Null }
            elseif ($badKind -eq 'mutation') { Get-PlanReceiptBytes 'unit' (('a' * 64) + [char]10) 'evidence' | Out-Null }
            else { Get-PlanReceiptState ([byte[]]@(65)) (('a' * 64) + [char]10) | Out-Null }
        } catch { $refused = $true }
        Assert-True $refused 'receipt identifiers and hashes reject trailing LF'
    }
    Write-Output 'PLAN receipt Git tests passed: clean/dirty/untracked PLAN, crash windows, partial/duplicate receipts, decision/code/protected/index drift, and unverified receipt.'
} finally {
    $full = [IO.Path]::GetFullPath($fixtureRoot)
    if (-not $full.StartsWith($fixtureBase, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe fixture cleanup' }
    Remove-Item -LiteralPath $full -Recurse -Force
}
