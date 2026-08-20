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

$skill = Get-Content -Raw -LiteralPath $skillPath
$template = Get-Content -Raw -LiteralPath $templatePath
$agentYaml = Get-Content -Raw -LiteralPath $agentYamlPath
$readme = Get-Content -Raw -LiteralPath $readmePath
$readmeZh = Get-Content -Raw -LiteralPath $readmeZhPath

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
    'xhigh',
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

Write-Output 'Goal-Driven Skill lifecycle validation passed.'
