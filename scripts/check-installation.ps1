[CmdletBinding()]
param(
    [string]$SkillRoot = (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.agents/skills'),
    [string]$LegacySkillRoot = (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/skills'),
    [string]$AgentsRoot = (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/agents'),
    [switch]$AsJson
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'path-safety.ps1')
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
function Get-ManifestRows {
    param([string]$Root)
    Assert-PlainTree $Root
    $prefix = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]'\/') + [IO.Path]::DirectorySeparatorChar
    return @(Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Sort-Object FullName | ForEach-Object {
        $_.FullName.Substring($prefix.Length).Replace('\','/') + ':' + (Get-FileHash -LiteralPath $_.FullName).Hash
    })
}
function Get-PackageStatus {
    param([string]$Source, [string]$Target)
    $state = 'MISSING'
    $detail = ''
    try {
        Assert-PlainPath $Target
        if (Test-Path -LiteralPath $Target) {
            if (-not (Test-Path -LiteralPath $Target -PathType Container)) { throw 'Target is not a directory' }
            $expected = @(Get-ManifestRows $Source)
            $actual = @(Get-ManifestRows $Target)
            $state = if (($expected -join '|') -ceq ($actual -join '|')) {'SYNCHRONIZED'} else {'DIFFERENT'}
        }
    } catch { $state = 'UNSAFE_OR_UNREADABLE'; $detail = $_.Exception.Message }
    return [pscustomobject]@{ Source=$Source; Target=$Target; State=$state; Detail=$detail }
}
$source = Join-Path $repo 'skills/goal-driven-engineering'
$skill = Get-PackageStatus $source (Join-Path $SkillRoot 'goal-driven-engineering')
function Test-GoalSkillName {
    param([string]$Path)
    $content = [IO.File]::ReadAllText($Path) -replace '\r\n?', [string][char]10
    if ($content -notmatch '(?s)\A---\n(?<frontmatter>.*?)\n---(?:\n|\z)') { return $false }
    $frontmatter = $Matches.frontmatter
    return $frontmatter -match '(?m)^name:[ \t]*(?:goal-driven-engineering|"goal-driven-engineering"|''goal-driven-engineering'')[ \t]*(?:#[^\n]*)?$'
}
$visited = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
$discovered = New-Object 'System.Collections.Generic.List[string]'
$scanIssues = New-Object 'System.Collections.Generic.List[string]'
foreach ($root in @($SkillRoot, $LegacySkillRoot) | Select-Object -Unique) {
    try {
        Assert-PlainPath $root
        if (-not (Test-Path -LiteralPath $root)) { continue }
        if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw "Discovery root is not a directory: $root" }
        $pending = New-Object 'System.Collections.Generic.Stack[string]'
        $pending.Push([IO.Path]::GetFullPath($root))
        while ($pending.Count -gt 0) {
            $directory = [IO.Path]::GetFullPath($pending.Pop()).TrimEnd([char[]]'\/')
            if (-not $visited.Add($directory)) { continue }
            foreach ($item in Get-ChildItem -LiteralPath $directory -Force) {
                if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                    $scanIssues.Add("Skipped linked entry: $($item.FullName)")
                    continue
                }
                if ($item.PSIsContainer) { $pending.Push($item.FullName); continue }
                if ($item.Name -eq 'SKILL.md' -and (Test-GoalSkillName $item.FullName)) {
                    $discovered.Add($item.DirectoryName)
                }
            }
        }
    } catch { $scanIssues.Add($_.Exception.Message) }
}
$roles = @(
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $repo 'agents') -File -Filter '*.toml') {
        $target = Join-Path $AgentsRoot $file.Name
        $state = 'MISSING_OPTIONAL'
        try {
            Assert-PlainPath $target
            if (Test-Path -LiteralPath $target) {
                $state = if ((Get-FileHash -LiteralPath $target).Hash -ceq (Get-FileHash -LiteralPath $file.FullName).Hash) {'SYNCHRONIZED'} else {'DIFFERENT'}
            }
        } catch { $state = 'UNSAFE_OR_UNREADABLE' }
        [pscustomobject]@{ Name=$file.Name; Source=$file.FullName; Target=$target; State=$state }
    }
)
$revision = 'unavailable'
$sourceDirty = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
    try {
    $revisionOutput = & git --no-optional-locks -C $repo rev-parse --short HEAD 2>$null
    if ($LASTEXITCODE -eq 0) {
        $revision = [string]$revisionOutput
        $sourceDirty = (@(& git --no-optional-locks -C $repo status --porcelain -- scripts skills agents).Count -gt 0)
    }
    } catch { $revision = 'unavailable'; $sourceDirty = $null }
}
$report = [pscustomobject]@{
    SourceRevision=$revision; SourceModified=$sourceDirty; Skill=$skill
    DiscoveredSkills=@($discovered.ToArray()); DuplicateCount=[Math]::Max(0,$discovered.Count-1)
    ScanComplete=($scanIssues.Count -eq 0); ScanIssues=@($scanIssues.ToArray()); Agents=$roles
}
if ($AsJson) { $report | ConvertTo-Json -Depth 6 } else {
    Write-Output "Source revision: $revision; modified: $sourceDirty"
    $skill | Format-List
    Write-Output "Discovered copies: $($discovered.Count); scan complete: $($report.ScanComplete)"
    $discovered | ForEach-Object { Write-Output $_ }
    $scanIssues | ForEach-Object { Write-Output $_ }
    $roles | Format-Table Name,State,Target -AutoSize
    Write-Output 'Read-only report. DIFFERENT means different bytes, not proof of a user edit. Hash equality does not prove the running app reloaded the package.'
}
