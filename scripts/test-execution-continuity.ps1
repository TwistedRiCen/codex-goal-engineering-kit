[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$approvedActions = @(
    'CONTINUE',
    'RETRY_SAFE_UNIT',
    'VERIFY',
    'FINALIZE',
    'BLOCKED'
)

$approvedStates = @(
    'IDLE',
    'PREPARED',
    'MUTATED',
    'VERIFYING',
    'VERIFIED',
    'BLOCKED'
)

function Assert-True {
    param(
        [Parameter(Mandatory = $true)][bool]$Condition,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if (-not $Condition) {
        throw "Assertion failed: $Message"
    }
}

function Assert-Equal {
    param(
        [Parameter(Mandatory = $true)]$Expected,
        [Parameter(Mandatory = $true)]$Actual,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if ([string]$Expected -cne [string]$Actual) {
        throw "Assertion failed: $Message. Expected '$Expected', got '$Actual'."
    }
}

function Get-Sha256Text {
    param([Parameter(Mandatory = $true)][string]$Text)

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
        return ([System.BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
    } finally {
        $sha256.Dispose()
    }
}

function ConvertTo-LengthPrefixedRecord {
    param([Parameter(Mandatory = $true)][string]$Value)

    $byteLength = [System.Text.Encoding]::UTF8.GetByteCount($Value)
    return "${byteLength}:$Value"
}

function Get-DeterministicFingerprint {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('ProtectedBaseline', 'VerifiedMutation')]
        [string]$Kind,

        [string]$PreparedHead,

        [Parameter(Mandatory = $true)]
        [string[]]$Entries
    )

    if ($Kind -eq 'VerifiedMutation' -and [string]::IsNullOrWhiteSpace($PreparedHead)) {
        throw 'VerifiedMutation fingerprint requires PreparedHead.'
    }

    $sortedEntries = [System.Collections.Generic.List[string]]::new()
    foreach ($entry in $Entries) {
        if ([string]::IsNullOrWhiteSpace($entry)) {
            throw 'Fingerprint entries must be non-empty canonical strings.'
        }
        $sortedEntries.Add($entry.Replace('\', '/'))
    }
    $sortedEntries.Sort([System.StringComparer]::Ordinal)

    $records = [System.Collections.Generic.List[string]]::new()
    $records.Add((ConvertTo-LengthPrefixedRecord -Value "kind=$Kind"))
    if ($Kind -eq 'VerifiedMutation') {
        $records.Add((ConvertTo-LengthPrefixedRecord -Value "prepared-head=$($PreparedHead.ToLowerInvariant())"))
    }
    $records.Add((ConvertTo-LengthPrefixedRecord -Value "entry-count=$($sortedEntries.Count)"))
    foreach ($entry in $sortedEntries) {
        $records.Add((ConvertTo-LengthPrefixedRecord -Value $entry))
    }

    return Get-Sha256Text -Text ($records -join "`n")
}

function New-RecoveryInput {
    param(
        [bool]$JournalPresent = $true,
        [string]$State = 'PREPARED',
        [bool]$SchemaSupported = $true,
        [bool]$PlanConsistent = $true,
        [bool]$PlanFinalized = $false,
        [bool]$PlanFinalizedFingerprintMatches = $false,
        [bool]$HeadMatches = $true,
        [bool]$ProtectedBaselineMatches = $true,
        [bool]$OutOfScopeMutation = $false,
        [bool]$AllowedPathsWereClean = $true,
        [bool]$ExternalNonIdempotentRiskPossible = $false,
        [bool]$MutationPresent = $false,
        [bool]$VerifiedMutationFingerprintPresent = $false,
        [bool]$VerifiedMutationFingerprintMatches = $false
    )

    return [pscustomobject]@{
        JournalPresent = $JournalPresent
        State = $State
        SchemaSupported = $SchemaSupported
        PlanConsistent = $PlanConsistent
        PlanFinalized = $PlanFinalized
        PlanFinalizedFingerprintMatches = $PlanFinalizedFingerprintMatches
        HeadMatches = $HeadMatches
        ProtectedBaselineMatches = $ProtectedBaselineMatches
        OutOfScopeMutation = $OutOfScopeMutation
        AllowedPathsWereClean = $AllowedPathsWereClean
        ExternalNonIdempotentRiskPossible = $ExternalNonIdempotentRiskPossible
        MutationPresent = $MutationPresent
        VerifiedMutationFingerprintPresent = $VerifiedMutationFingerprintPresent
        VerifiedMutationFingerprintMatches = $VerifiedMutationFingerprintMatches
    }
}

function Resolve-ExecutionContinuityAction {
    param([Parameter(Mandatory = $true)]$InputState)

    if (-not $InputState.JournalPresent) {
        if ($InputState.PlanConsistent) {
            return 'CONTINUE'
        }
        return 'BLOCKED'
    }

    if (-not $InputState.SchemaSupported -or
        -not $approvedStates.Contains([string]$InputState.State) -or
        $InputState.State -eq 'IDLE' -or
        -not $InputState.AllowedPathsWereClean) {
        return 'BLOCKED'
    }

    if (-not $InputState.PlanConsistent -or
        -not $InputState.HeadMatches -or
        -not $InputState.ProtectedBaselineMatches -or
        $InputState.OutOfScopeMutation -or
        $InputState.ExternalNonIdempotentRiskPossible) {
        return 'BLOCKED'
    }

    if ($InputState.PlanFinalized) {
        if ($InputState.State -eq 'VERIFIED' -and
            $InputState.VerifiedMutationFingerprintPresent -and
            $InputState.VerifiedMutationFingerprintMatches -and
            $InputState.PlanFinalizedFingerprintMatches) {
            return 'FINALIZE'
        }
        return 'BLOCKED'
    }

    switch ($InputState.State) {
        'PREPARED' {
            if ($InputState.MutationPresent) {
                return 'VERIFY'
            }
            return 'RETRY_SAFE_UNIT'
        }
        'MUTATED' {
            if ($InputState.MutationPresent) {
                return 'VERIFY'
            }
            return 'BLOCKED'
        }
        'VERIFYING' {
            if ($InputState.MutationPresent) {
                return 'VERIFY'
            }
            return 'BLOCKED'
        }
        'VERIFIED' {
            if (-not $InputState.VerifiedMutationFingerprintPresent) {
                return 'BLOCKED'
            }
            if ($InputState.VerifiedMutationFingerprintMatches) {
                return 'FINALIZE'
            }
            if ($InputState.MutationPresent) {
                return 'VERIFY'
            }
            return 'BLOCKED'
        }
        'BLOCKED' {
            return 'BLOCKED'
        }
        default {
            return 'BLOCKED'
        }
    }
}

$cases = @(
    @{ Name = 'IDLE absence with consistent PLAN and Git'; Input = New-RecoveryInput -JournalPresent $false -PlanConsistent $true; Expected = 'CONTINUE'; MatchingEvidence = $false },
    @{ Name = 'IDLE absence with ambiguous repository state'; Input = New-RecoveryInput -JournalPresent $false -PlanConsistent $false; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'T1 PREPARED before mutation'; Input = New-RecoveryInput -State 'PREPARED' -MutationPresent $false; Expected = 'RETRY_SAFE_UNIT'; MatchingEvidence = $false },
    @{ Name = 'T2 mutation exists while journal remains PREPARED'; Input = New-RecoveryInput -State 'PREPARED' -MutationPresent $true; Expected = 'VERIFY'; MatchingEvidence = $false },
    @{ Name = 'T3 VERIFYING interrupted'; Input = New-RecoveryInput -State 'VERIFYING' -MutationPresent $true; Expected = 'VERIFY'; MatchingEvidence = $false },
    @{ Name = 'T4 VERIFIED before PLAN finalize'; Input = New-RecoveryInput -State 'VERIFIED' -MutationPresent $true -VerifiedMutationFingerprintPresent $true -VerifiedMutationFingerprintMatches $true; Expected = 'FINALIZE'; MatchingEvidence = $true },
    @{ Name = 'protected baseline changed'; Input = New-RecoveryInput -State 'PREPARED' -ProtectedBaselineMatches $false; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'mutation outside Allowed Paths'; Input = New-RecoveryInput -State 'MUTATED' -MutationPresent $true -OutOfScopeMutation $true; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'unexpected HEAD drift'; Input = New-RecoveryInput -State 'MUTATED' -MutationPresent $true -HeadMatches $false; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'corrupted or unsupported journal'; Input = New-RecoveryInput -State 'PREPARED' -SchemaSupported $false; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'Allowed Path was dirty before PREPARED'; Input = New-RecoveryInput -State 'PREPARED' -AllowedPathsWereClean $false; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'unknown external non-idempotent result'; Input = New-RecoveryInput -State 'MUTATED' -MutationPresent $true -ExternalNonIdempotentRiskPossible $true; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'verified fingerprint changed only inside Allowed Paths'; Input = New-RecoveryInput -State 'VERIFIED' -MutationPresent $true -VerifiedMutationFingerprintPresent $true -VerifiedMutationFingerprintMatches $false; Expected = 'VERIFY'; MatchingEvidence = $false },
    @{ Name = 'PLAN finalized but mutation fingerprint conflicts'; Input = New-RecoveryInput -State 'VERIFIED' -PlanFinalized $true -PlanFinalizedFingerprintMatches $true -MutationPresent $true -VerifiedMutationFingerprintPresent $true -VerifiedMutationFingerprintMatches $false; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'PLAN finalized with inconsistent durable state'; Input = New-RecoveryInput -State 'VERIFIED' -PlanConsistent $false -PlanFinalized $true -PlanFinalizedFingerprintMatches $true -MutationPresent $true -VerifiedMutationFingerprintPresent $true -VerifiedMutationFingerprintMatches $true; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'PLAN finalized with unexpected HEAD drift'; Input = New-RecoveryInput -State 'VERIFIED' -PlanFinalized $true -PlanFinalizedFingerprintMatches $true -HeadMatches $false -MutationPresent $true -VerifiedMutationFingerprintPresent $true -VerifiedMutationFingerprintMatches $true; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'PLAN finalized with protected baseline drift'; Input = New-RecoveryInput -State 'VERIFIED' -PlanFinalized $true -PlanFinalizedFingerprintMatches $true -ProtectedBaselineMatches $false -MutationPresent $true -VerifiedMutationFingerprintPresent $true -VerifiedMutationFingerprintMatches $true; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'PLAN finalized with out-of-scope mutation'; Input = New-RecoveryInput -State 'VERIFIED' -PlanFinalized $true -PlanFinalizedFingerprintMatches $true -OutOfScopeMutation $true -MutationPresent $true -VerifiedMutationFingerprintPresent $true -VerifiedMutationFingerprintMatches $true; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'PLAN finalized with unknown external result'; Input = New-RecoveryInput -State 'VERIFIED' -PlanFinalized $true -PlanFinalizedFingerprintMatches $true -ExternalNonIdempotentRiskPossible $true -MutationPresent $true -VerifiedMutationFingerprintPresent $true -VerifiedMutationFingerprintMatches $true; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'MUTATED state without mutation'; Input = New-RecoveryInput -State 'MUTATED' -MutationPresent $false; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'unknown lifecycle state'; Input = New-RecoveryInput -State 'RECONCILING'; Expected = 'BLOCKED'; MatchingEvidence = $false },
    @{ Name = 'PLAN finalize completed before journal deletion'; Input = New-RecoveryInput -State 'VERIFIED' -PlanFinalized $true -PlanFinalizedFingerprintMatches $true -MutationPresent $true -VerifiedMutationFingerprintPresent $true -VerifiedMutationFingerprintMatches $true; Expected = 'FINALIZE'; MatchingEvidence = $true }
)

foreach ($case in $cases) {
    $result = @(Resolve-ExecutionContinuityAction -InputState $case.Input)
    Assert-Equal -Expected 1 -Actual $result.Count -Message "$($case.Name) must derive exactly one action"
    Assert-True -Condition ($approvedActions.Contains([string]$result[0])) -Message "$($case.Name) returned an unapproved action"
    Assert-Equal -Expected $case.Expected -Actual $result[0] -Message $case.Name

    if (-not $case.MatchingEvidence) {
        Assert-True -Condition ($result[0] -cne 'FINALIZE') -Message "$($case.Name) must not finalize without matching verified mutation evidence"
    }
}

$baselineEntries = @(
    " M`tREADME.md`tsha256:one",
    "??`t.idea/project.xml`tsha256:two"
)
$baselineForward = Get-DeterministicFingerprint -Kind ProtectedBaseline -Entries $baselineEntries
$baselineReverse = Get-DeterministicFingerprint -Kind ProtectedBaseline -Entries @($baselineEntries[1], $baselineEntries[0])
$baselineChanged = Get-DeterministicFingerprint -Kind ProtectedBaseline -Entries @($baselineEntries[0], "??`t.idea/project.xml`tsha256:changed")
Assert-Equal -Expected $baselineForward -Actual $baselineReverse -Message 'protected baseline fingerprint must be order-independent'
Assert-True -Condition ($baselineForward -cne $baselineChanged) -Message 'protected baseline fingerprint must change when protected workspace state changes'
$delimiterSetOne = @("alpha`nbeta", 'gamma')
$delimiterSetTwo = @('alpha', "beta`ngamma")
$delimiterFingerprintOne = Get-DeterministicFingerprint -Kind ProtectedBaseline -Entries $delimiterSetOne
$delimiterFingerprintTwo = Get-DeterministicFingerprint -Kind ProtectedBaseline -Entries $delimiterSetTwo
Assert-True -Condition ($delimiterFingerprintOne -cne $delimiterFingerprintTwo) -Message 'delimiter-bearing entries must not collide after length-prefixed UTF-8 encoding'

$mutationEntries = @(
    "M`tskills/goal-driven-engineering/SKILL.md`tsha256:skill",
    "A`tscripts/test-execution-continuity.ps1`tsha256:test"
)
$mutationOne = Get-DeterministicFingerprint -Kind VerifiedMutation -PreparedHead ('a' * 40) -Entries $mutationEntries
$mutationReordered = Get-DeterministicFingerprint -Kind VerifiedMutation -PreparedHead ('a' * 40) -Entries @($mutationEntries[1], $mutationEntries[0])
$mutationDifferentHead = Get-DeterministicFingerprint -Kind VerifiedMutation -PreparedHead ('b' * 40) -Entries $mutationEntries
$mutationDifferentContent = Get-DeterministicFingerprint -Kind VerifiedMutation -PreparedHead ('a' * 40) -Entries @($mutationEntries[0], "A`tscripts/test-execution-continuity.ps1`tsha256:changed")
Assert-Equal -Expected $mutationOne -Actual $mutationReordered -Message 'verified mutation fingerprint must be order-independent'
Assert-True -Condition ($mutationOne -cne $mutationDifferentHead) -Message 'verified mutation fingerprint must bind Prepared HEAD'
Assert-True -Condition ($mutationOne -cne $mutationDifferentContent) -Message 'verified mutation fingerprint must bind verified Allowed Path content'

Write-Output "Execution continuity tests passed: 4 crash cases, $($cases.Count - 4) compatibility/fail-closed cases, exactly-one-action, no-unverified-finalize, and fingerprint invariants."
