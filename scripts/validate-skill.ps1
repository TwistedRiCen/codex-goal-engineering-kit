[CmdletBinding()]
param([string]$Root)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-ContractText {
    param([string]$Path)
    return ([IO.File]::ReadAllText($Path) -replace '\r\n?', [string][char]10)
}

if ([string]::IsNullOrWhiteSpace($Root)) { $Root = Join-Path $PSScriptRoot '..' }
$repositoryRoot = (Resolve-Path -LiteralPath $Root).Path
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
$skill = (@(Get-ChildItem -LiteralPath $skillRoot -Recurse -File -Filter '*.md' | Sort-Object FullName | ForEach-Object { Read-ContractText $_.FullName }) -join "`n")
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

function Assert-OrderedVocabulary {
    param([string]$Text, [string[]]$Expected, [string]$Label)
    $candidates = @()
    foreach ($block in [regex]::Matches($Text, '(?m)^```text\s*\n(?<body>.*?)^```\s*$', [Text.RegularExpressions.RegexOptions]::Singleline)) {
        $values = @($block.Groups['body'].Value -split '\n' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        $overlap = @($values | Where-Object { $_ -cin $Expected }).Count
        if ($overlap -ge [Math]::Ceiling($Expected.Count / 2)) { $candidates += ,$values }
    }
    if ($candidates.Count -ne 1 -or ($candidates[0] -join '|') -cne ($Expected -join '|')) {
        throw "Skill $Label vocabulary or ordering drifted."
    }
}
Assert-OrderedVocabulary -Text $lifecycle -Expected $expectedPhases -Label 'phase'

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
Assert-OrderedVocabulary -Text $recovery -Expected $expectedExecutionStates -Label 'execution-state'

$expectedRecoveryActions = @('CONTINUE', 'RETRY_SAFE_UNIT', 'VERIFY', 'FINALIZE', 'BLOCKED')
Assert-OrderedVocabulary -Text $recovery -Expected $expectedRecoveryActions -Label 'recovery-action'

$expectedJournalFields = @(
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
)
$fieldBlock = [regex]::Match($recovery, ':\s*(?<body>Schema Version,\s*State,[^\r\n.]+)\.')
$actualJournalFields = @($fieldBlock.Groups['body'].Value -split ',\s*(?:and\s+)?' | ForEach-Object { $_.Trim() })
if (-not $fieldBlock.Success -or ($actualJournalFields -join '|') -cne ($expectedJournalFields -join '|')) {
    throw 'Skill execution journal field vocabulary or ordering drifted.'
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

$parseTokens = $null
$parseErrors = $null
$testAst = [Management.Automation.Language.Parser]::ParseFile($continuityTestPath, [ref]$parseTokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw 'Execution continuity test source has PowerShell syntax errors.' }
$testFunctions = @($testAst.FindAll({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] }, $true) | ForEach-Object { $_.Name })
foreach ($testFunction in @(
    'Resolve-ExecutionContinuityAction',
    'Get-DeterministicFingerprint',
    'ConvertTo-LengthPrefixedRecord'
)) {
    if ($testFunction -cnotin $testFunctions) {
        throw "Execution continuity test source is missing a required function: $testFunction"
    }
}
# Static structure does not establish recovery behavior or semantic equivalence.
# Run the continuity, persisted recovery-path, and receipt suites independently.

$frontmatter = [regex]::Match($entrypoint, '\A\uFEFF?---[ \t]*\n(?<body>.*?)^---[ \t]*(?:\n|$)', [Text.RegularExpressions.RegexOptions]'Singleline,Multiline')
if (-not $frontmatter.Success) { throw 'Skill opening frontmatter block is missing.' }
$frontmatterNames = [regex]::Matches($frontmatter.Groups['body'].Value, '(?m)^name:[ \t]*(?<value>[^\n]*)$')
if ($frontmatterNames.Count -ne 1 -or
    $frontmatterNames[0].Groups['value'].Value.Trim() -cnotmatch '^(?:goal-driven-engineering|"goal-driven-engineering"|''goal-driven-engineering'')$') {
    throw 'Skill frontmatter name is inconsistent.'
}
$frontmatterDescriptions = [regex]::Matches($frontmatter.Groups['body'].Value, '(?m)^description:[ \t]*(?<value>[^\n]*)$')
if ($frontmatterDescriptions.Count -ne 1) { throw 'Skill frontmatter must contain one nonempty description.' }
$description = $frontmatterDescriptions[0].Groups['value'].Value.Trim()
if ($description.StartsWith('"') -or $description.StartsWith("'")) {
    if ($description.Length -lt 2 -or $description[$description.Length - 1] -cne $description[0]) {
        throw 'Skill frontmatter description has unmatched quotes.'
    }
    $description = $description.Substring(1, $description.Length - 2).Trim()
}
if ([string]::IsNullOrWhiteSpace($description)) { throw 'Skill frontmatter description is empty.' }
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
    if ($entrypoint.Contains($modelRoutingTerm)) {
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
