[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$skillPath = Join-Path $repositoryRoot 'skills\goal-driven-engineering\SKILL.md'
$templatePath = Join-Path $repositoryRoot 'templates\PLAN.md'
$agentYamlPath = Join-Path $repositoryRoot 'skills\goal-driven-engineering\agents\openai.yaml'
$readmePath = Join-Path $repositoryRoot 'README.md'
$readmeZhPath = Join-Path $repositoryRoot 'README.zh-CN.md'
$startProjectPath = Join-Path $repositoryRoot 'prompts\start-project.md'
$startExecutionPromptPath = Join-Path $repositoryRoot 'prompts\start-execution-goal.md'
$resumePromptPath = Join-Path $repositoryRoot 'prompts\resume-project.md'
$continuityTestPath = Join-Path $repositoryRoot 'scripts\test-execution-continuity.ps1'

$skill = Get-Content -Raw -LiteralPath $skillPath
$template = Get-Content -Raw -LiteralPath $templatePath
$agentYaml = Get-Content -Raw -LiteralPath $agentYamlPath
$readme = Get-Content -Raw -LiteralPath $readmePath
$readmeZh = Get-Content -Raw -LiteralPath $readmeZhPath
$startProject = Get-Content -Raw -LiteralPath $startProjectPath
$startExecutionPrompt = Get-Content -Raw -LiteralPath $startExecutionPromptPath
$resumePrompt = Get-Content -Raw -LiteralPath $resumePromptPath
$continuityTest = Get-Content -Raw -LiteralPath $continuityTestPath

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

if ($startProject.Contains('.goal/execution-state.md')) {
    throw 'start-project must not initialize a persistent execution journal.'
}
if (Test-Path -LiteralPath (Join-Path $repositoryRoot 'skills\goal-driven-engineering\assets\execution-state.md')) {
    throw 'A persistent IDLE execution-state asset must not exist.'
}

foreach ($term in @('clean Allowed Paths', 'Prepared HEAD', 'PREPARED', 'VERIFYING', 'VERIFIED', 'FINALIZE', 'journal absence is IDLE')) {
    if ($startExecutionPrompt.IndexOf($term, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw "Execution prompt is missing continuity instruction: $term"
    }
}
foreach ($term in @('PLAN.md', '.goal/execution-state.md', 'Git branch/HEAD/status/history/current diff', 'verification evidence', 'exactly one action', 'at most one read-only reader')) {
    if ($resumePrompt.IndexOf($term, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw "Resume prompt is missing continuity instruction: $term"
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

if ($skill -cnotmatch '(?m)^name: goal-driven-engineering$') {
    throw 'Skill frontmatter name is inconsistent.'
}
if (-not $agentYaml.Contains('Goal-Driven Engineering') -or
    -not $agentYaml.Contains('$goal-driven-engineering')) {
    throw 'Skill agent metadata is inconsistent with the Skill name or purpose.'
}

foreach ($prompt in Get-ChildItem -LiteralPath (Join-Path $repositoryRoot 'prompts') -File -Filter '*.md') {
    $content = Get-Content -Raw -LiteralPath $prompt.FullName
    if (-not $content.Contains('$goal-driven-engineering') -or -not $content.Contains('PLAN.md')) {
        throw "Prompt does not point to the Skill and PLAN.md: $($prompt.Name)"
    }
}

foreach ($modelRoutingTerm in @('gpt-5.6', 'docs_researcher', 'test_analyst', 'routine_worker')) {
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
    'gpt-5.6-luna',
    'gpt-5.6-terra',
    ' / medium',
    ' / high',
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
