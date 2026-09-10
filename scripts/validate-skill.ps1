[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-ContractText {
    param([string]$Path)
    return ([IO.File]::ReadAllText($Path) -replace '\r\n?', [string][char]10)
}

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$skillPath = Join-Path $repositoryRoot 'skills\goal-driven-engineering\SKILL.md'
$templatePath = Join-Path $repositoryRoot 'templates\PLAN.full.md'
$compactTemplatePath = Join-Path $repositoryRoot 'templates\PLAN.md'
$skillRoot = Split-Path -Parent $skillPath
$lifecyclePath = Join-Path $skillRoot 'references\full-lifecycle.md'
$recoveryPath = Join-Path $skillRoot 'references\execution-continuity.md'
$agentYamlPath = Join-Path $repositoryRoot 'skills\goal-driven-engineering\agents\openai.yaml'
$readmePath = Join-Path $repositoryRoot 'README.md'
$readmeZhPath = Join-Path $repositoryRoot 'README.zh-CN.md'
$startPromptPath = Join-Path $repositoryRoot 'prompts\start-here.md'
$startExecutionPromptPath = Join-Path $repositoryRoot 'prompts\start-execution-goal.md'
$resumePromptPath = Join-Path $repositoryRoot 'prompts\resume-project.md'
$intakePath = Join-Path $skillRoot 'references\guided-intake.md'
$continuityTestPath = Join-Path $repositoryRoot 'scripts\test-execution-continuity.ps1'

$entrypoint = Read-ContractText $skillPath
$lifecycle = Read-ContractText $lifecyclePath
$recovery = Read-ContractText $recoveryPath
$skill = $entrypoint + [Environment]::NewLine + $lifecycle + [Environment]::NewLine + $recovery
$intake = Read-ContractText $intakePath
$compactTemplate = Read-ContractText $compactTemplatePath
$template = Read-ContractText $templatePath
$agentYaml = Read-ContractText $agentYamlPath
$readme = Read-ContractText $readmePath
$readmeZh = Read-ContractText $readmeZhPath
$startPrompt = Read-ContractText $startPromptPath
$startExecutionPrompt = Read-ContractText $startExecutionPromptPath
$resumePrompt = Read-ContractText $resumePromptPath
$continuityTest = Read-ContractText $continuityTestPath

$expectedPhases = @(
    'GOAL DEFINITION',
    'DISCOVERY',
    'DISCOVERY GATE',
    'ARCHITECTURE',
    'ARCHITECTURE GATE',
    'MILESTONE PLANNING',
    'EXECUTION',
    'MILESTONE ACCEPTANCE',
    'SYSTEM VERIFICATION',
    'FINAL ADVERSARIAL REVIEW',
    'PROJECT COMPLETE'
)

$phaseBlock = [regex]::Match(
    $skill,
    'Use these phase names exactly:\s*```text\s*(?<body>.*?)```',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)
if (-not $phaseBlock.Success) {
    throw 'Skill phase block was not found.'
}

$skillPhases = @($phaseBlock.Groups['body'].Value -split '\r?\n' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if (($skillPhases -join '|') -cne ($expectedPhases -join '|')) {
    throw 'Skill phase vocabulary or ordering drifted.'
}

$allowedLine = [regex]::Match($template, 'Allowed phases: (?<body>.+)')
if (-not $allowedLine.Success) {
    throw 'PLAN template allowed-phase line was not found.'
}

$templatePhases = @([regex]::Matches($allowedLine.Groups['body'].Value, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value })
if (($templatePhases -join '|') -cne ($expectedPhases -join '|')) {
    throw 'PLAN template phases do not match the Skill.'
}

$requiredHeadings = @(
    'Project Goal',
    'Scope',
    'Constraints',
    'Non-Goals',
    'System Acceptance Criteria',
    'Confirmed Facts',
    'Design Assumptions',
    'Pending Decisions',
    'Frozen Decisions',
    'Gate and Review Record',
    'Architecture Summary',
    'Milestones',
    'Current Milestone',
    'Milestone Acceptance Criteria',
    'Known Risks',
    'Blockers',
    'Verified Progress',
    'Repository and Verification State',
    'Active Change Control'
)
foreach ($heading in $requiredHeadings) {
    if ($template -cnotmatch "(?m)^## $([regex]::Escape($heading))$") {
        throw "PLAN template is missing required heading: $heading"
    }
}

foreach ($term in @('OPEN', 'VERIFIED', 'NOT STARTED', 'IN PROGRESS', 'BLOCKED', 'ACCEPTED', 'NOT READY', 'PASSED', 'FAILED', 'PROPOSED', 'APPROVED', 'REJECTED', 'APPLIED')) {
    if (-not $skill.Contains($term) -or -not $template.Contains($term)) {
        throw "Lifecycle status is not represented in both Skill and PLAN template: $term"
    }
}

$expectedExecutionStates = @('IDLE', 'PREPARED', 'MUTATED', 'VERIFYING', 'VERIFIED', 'BLOCKED')
$stateBlock = [regex]::Match(
    $skill,
    'Use only these execution states:\s*```text\s*(?<body>.*?)```',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)
if (-not $stateBlock.Success) {
    throw 'Skill execution-state block was not found.'
}
$actualExecutionStates = @($stateBlock.Groups['body'].Value -split '\r?\n' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if (($actualExecutionStates -join '|') -cne ($expectedExecutionStates -join '|')) {
    throw 'Skill execution-state vocabulary or ordering drifted.'
}

$expectedRecoveryActions = @('CONTINUE', 'RETRY_SAFE_UNIT', 'VERIFY', 'FINALIZE', 'BLOCKED')
$actionBlock = [regex]::Match(
    $skill,
    'Use only these recovery actions:\s*```text\s*(?<body>.*?)```',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)
if (-not $actionBlock.Success) {
    throw 'Skill recovery-action block was not found.'
}
$actualRecoveryActions = @($actionBlock.Groups['body'].Value -split '\r?\n' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if (($actualRecoveryActions -join '|') -cne ($expectedRecoveryActions -join '|')) {
    throw 'Skill recovery-action vocabulary or ordering drifted.'
}

foreach ($field in @(
    'Schema Version',
    'State',
    'Atomic Unit',
    'Intent',
    'Prepared HEAD',
    'Protected Baseline Fingerprint',
    'External Non-Idempotent Risk',
    'Allowed Paths',
    'Verification Commands',
    'Pass Condition',
    'Verified Mutation Fingerprint',
    'Plan Baseline Fingerprint',
    'Evidence',
    'Blocker Reason'
)) {
    if (-not $skill.Contains($field)) {
        throw "Skill execution journal contract is missing field: $field"
    }
}

foreach ($continuityPhrase in @(
    'Journal absence is the conceptual `IDLE` state',
    'write before risk',
    'before Writer mutation',
    'Write `VERIFYING` before each verification invocation',
    'read back the persisted PLAN record, then delete the journal',
    'at most one read-only reader'
)) {
    if ($skill.IndexOf($continuityPhrase, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw "Skill execution continuity contract is missing: $continuityPhrase"
    }
}

if (-not $template.Contains('Volatile or unverified execution state does not belong in PLAN') -or
    -not $template.Contains('journal absence representing `IDLE`')) {
    throw 'PLAN template does not preserve the durable-state boundary or journal-absence semantics.'
}

if ($startPrompt.Contains('.goal/execution-state.md')) {
    throw 'The shared starter must not initialize a persistent execution journal.'
}
if (Test-Path -LiteralPath (Join-Path $repositoryRoot 'skills\goal-driven-engineering\assets\execution-state.md')) {
    throw 'A persistent IDLE execution-state asset must not exist.'
}

# Entry prompts select the canonical protocol; they must not duplicate its state machine.
foreach ($promptPath in @($startExecutionPromptPath, $resumePromptPath)) {
    $content = Read-ContractText $promptPath
    if (-not $content.Contains('references/execution-continuity.md')) {
        throw "Strict execution/resume entry does not route to its installed contract: $promptPath"
    }
    if ($content.Length -gt 1400) {
        throw "Execution/resume entry is too large; keep lifecycle detail in the Skill: $promptPath"
    }
}
if (-not $entrypoint.Contains('references/full-lifecycle.md')) {
    throw 'Skill mode routing does not expose the full lifecycle.'
}

foreach ($entryName in @('start-here.md', 'resume-project.md', 'start-execution-goal.md', 'change-control.md')) {
    if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot "prompts/$entryName") -PathType Leaf)) {
        throw "Missing workflow entry: $entryName"
    }
}
if (-not $entrypoint.Contains('references/guided-intake.md')) {
    throw 'Guided intake is not discoverable from the Skill.'
}

# Supporting references must resolve inside the installed Skill, without Kit access.
foreach ($doc in Get-ChildItem -LiteralPath $skillRoot -Recurse -File -Filter '*.md') {
    $content = Read-ContractText $doc.FullName
    foreach ($link in [regex]::Matches($content, '\[[^\]]+\]\(([^)]+)\)')) {
        $target = $link.Groups[1].Value
        if ($target -match '^(https?://|#)') { continue }
        $targetPath = [System.IO.Path]::GetFullPath((Join-Path $doc.DirectoryName ($target -split '#')[0]))
        $rootPrefix = [System.IO.Path]::GetFullPath($skillRoot).TrimEnd([char[]]'\/') + [System.IO.Path]::DirectorySeparatorChar
        if (-not $targetPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
            -not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
            throw "Installed Skill reference is missing or escapes its package: $target"
        }
    }
}

foreach ($mode in @('DIRECT', 'STANDARD', 'FULL')) {
    if (-not $entrypoint.Contains($mode) -or -not $readme.Contains($mode) -or -not $readmeZh.Contains($mode)) {
        throw "Workflow mode is missing from an entrypoint or user guide: $mode"
    }
}
if (-not $compactTemplate.Contains('Task Mode: STANDARD') -or -not $template.Contains('Task Mode: FULL')) {
    throw 'Compact and full templates must declare their workflow modes.'
}
foreach ($heading in @('Plan Metadata', 'Project Goal / Scope', 'Acceptance Criteria', 'Current Work', 'Decisions and Blockers', 'Repository and Verification State')) {
    if ($compactTemplate -cnotmatch "(?m)^## $([regex]::Escape($heading))$") {
        throw "Compact PLAN is missing its persistent-state section: $heading"
    }
}

foreach ($forbiddenTerm in @('RECONCILE_EXTERNAL', 'Commit Token', 'Finalize Mode', 'Idempotency Key', 'Readback Query')) {
    foreach ($artifact in @($skill, $template, $startExecutionPrompt, $resumePrompt)) {
        if ($artifact.Contains($forbiddenTerm)) {
            throw "Forbidden M2 expansion detected: $forbiddenTerm"
        }
    }
}

foreach ($testContractTerm in @(
    'Resolve-ExecutionContinuityAction',
    'Get-DeterministicFingerprint',
    'ConvertTo-LengthPrefixedRecord',
    'T1 PREPARED before mutation',
    'T2 mutation exists while journal remains PREPARED',
    'T3 VERIFYING interrupted',
    'T4 VERIFIED before PLAN finalize',
    'PLAN finalized with unexpected HEAD drift',
    'delimiter-bearing entries must not collide',
    'exactly one action',
    'must not finalize without matching verified mutation evidence'
)) {
    if (-not $continuityTest.Contains($testContractTerm)) {
        throw "Execution continuity tests are missing contract evidence: $testContractTerm"
    }
}

foreach ($fingerprintContractTerm in @('length-prefixed UTF-8 records', 'Never hash raw newline-joined entries')) {
    if (-not $skill.Contains($fingerprintContractTerm)) {
        throw "Skill fingerprint contract is missing unambiguous encoding rule: $fingerprintContractTerm"
    }
}

if ($skill -cnotmatch '(?m)^name: goal-driven-engineering\r?$') {
    throw 'Skill frontmatter name is inconsistent.'
}
if (-not $agentYaml.Contains('Goal-Driven Engineering') -or
    -not $agentYaml.Contains('$goal-driven-engineering')) {
    throw 'Skill agent metadata is inconsistent with the Skill name or purpose.'
}

foreach ($prompt in Get-ChildItem -LiteralPath (Join-Path $repositoryRoot 'prompts') -File -Filter '*.md') {
    $content = Read-ContractText $prompt.FullName
    if (-not $content.Contains('$goal-driven-engineering') -or -not $content.Contains('PLAN.md')) {
        throw "Prompt does not point to the Skill and PLAN.md: $($prompt.Name)"
    }
}

foreach ($modelRoutingTerm in @('model_reasoning_effort', 'docs_researcher', 'test_analyst', 'routine_worker')) {
    if ($skill.Contains($modelRoutingTerm)) {
        throw "Model-routing infrastructure leaked into the lifecycle Skill: $modelRoutingTerm"
    }
}

foreach ($alignedAgentDocTerm in @(
    'explorer',
    'docs_researcher',
    'test_analyst',
    'reviewer',
    'routine_worker',
    '.\scripts\install-agents.ps1',
    '-ConflictAction Backup',
    '-WhatIf',
    'agents.default_subagent_model',
    '$HOME/.codex/config.toml'
)) {
    if (-not $readme.Contains($alignedAgentDocTerm) -or
        -not $readmeZh.Contains($alignedAgentDocTerm)) {
        throw "English and Chinese agent documentation are not aligned on: $alignedAgentDocTerm"
    }
}

foreach ($continuityDocTerm in @(
    'Interrupt-Resilient Execution',
    '.goal/execution-state.md',
    'Write Before Risk',
    'fail closed',
    'quota prediction',
    'external transaction recovery'
)) {
    if (-not $readme.Contains($continuityDocTerm) -or
        -not $readmeZh.Contains($continuityDocTerm)) {
        throw "English and Chinese continuity documentation are not aligned on: $continuityDocTerm"
    }
}

Write-Output 'Goal-Driven Skill lifecycle validation passed.'
