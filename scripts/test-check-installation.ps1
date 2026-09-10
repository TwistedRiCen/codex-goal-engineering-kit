[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$base = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$root = Join-Path $base ('kit-diagnostic-' + [Guid]::NewGuid().ToString('N'))
$roots = @{ SkillRoot=(Join-Path $root 'skills'); LegacySkillRoot=(Join-Path $root 'legacy'); AgentsRoot=(Join-Path $root 'agents'); AsJson=$true }
$check = Join-Path $PSScriptRoot 'check-installation.ps1'
function Read-Report { return ((& $check @roots) | ConvertFrom-Json) }
function Assert-Check { param([bool]$Ok,[string]$Message) if (-not $Ok) { throw $Message } }
try {
    $report = Read-Report
    Assert-Check ($report.Skill.State -eq 'MISSING') 'missing skill'
    Assert-Check (-not (Test-Path -LiteralPath $root)) 'diagnosis must not create missing roots'
    [void](New-Item -ItemType Directory -Path $roots.SkillRoot -Force)
    Copy-Item -LiteralPath (Join-Path $repo 'skills/goal-driven-engineering') -Destination $roots.SkillRoot -Recurse
    Copy-Item -LiteralPath (Join-Path $repo 'agents') -Destination $roots.AgentsRoot -Recurse
    $report = Read-Report
    Assert-Check ($report.Skill.State -eq 'SYNCHRONIZED' -and $report.DiscoveredSkills.Count -eq 1) 'synced skill'
    Assert-Check (@($report.Agents | Where-Object State -ne 'SYNCHRONIZED').Count -eq 0) 'synced roles'
    [IO.File]::AppendAllText((Join-Path $roots.AgentsRoot 'explorer.toml'), '# local edit')
    Copy-Item -LiteralPath (Join-Path $roots.SkillRoot 'goal-driven-engineering') -Destination (Join-Path $roots.SkillRoot 'old-copy') -Recurse
    $before = @(Get-ChildItem -LiteralPath $root -Recurse -File | Sort-Object FullName | Get-FileHash | Select-Object -ExpandProperty Hash) -join '|'
    $report = Read-Report
    Assert-Check ($report.DuplicateCount -eq 1) 'duplicate skill'
    Assert-Check (@($report.Agents | Where-Object State -eq 'DIFFERENT').Count -eq 1) 'modified role'
    $after = @(Get-ChildItem -LiteralPath $root -Recurse -File | Sort-Object FullName | Get-FileHash | Select-Object -ExpandProperty Hash) -join '|'
    Assert-Check ($before -ceq $after) 'diagnosis must preserve all file bytes'
    $duplicateFile = Join-Path $roots.SkillRoot 'old-copy/SKILL.md'
    $originalSkill = [IO.File]::ReadAllText($duplicateFile)
    foreach ($nameLine in @('name: "goal-driven-engineering"', "name: 'goal-driven-engineering'")) {
        $quoted = $originalSkill.Replace('name: goal-driven-engineering', $nameLine)
        [IO.File]::WriteAllText($duplicateFile, $quoted, (New-Object Text.UTF8Encoding($true)))
        Assert-Check ((Read-Report).DuplicateCount -eq 1) 'quoted frontmatter with BOM must be discovered'
    }
    $lf = [string][char]10
    [IO.File]::WriteAllText($duplicateFile, ('---' + $lf + 'name: another-skill' + $lf + '---' + $lf + 'name: goal-driven-engineering' + $lf))
    Assert-Check ((Read-Report).DuplicateCount -eq 0) 'body name must not be treated as frontmatter'
    [IO.File]::WriteAllText($duplicateFile, $originalSkill)
    $savedLegacy = $roots.LegacySkillRoot
    try {
        $roots.LegacySkillRoot = Join-Path $roots.SkillRoot 'old-copy'
        Assert-Check ((Read-Report).DiscoveredSkills.Count -eq 2) 'overlapping scan roots must not count directories twice'
    } finally { $roots.LegacySkillRoot = $savedLegacy }
    $fileRoot = Join-Path $root 'not-a-directory'
    [IO.File]::WriteAllText($fileRoot, 'unchanged')
    try {
        $roots.LegacySkillRoot = $fileRoot
        $invalidRootReport = Read-Report
        Assert-Check (-not $invalidRootReport.ScanComplete -and $invalidRootReport.ScanIssues.Count -gt 0) 'file discovery root must report incomplete scan'
        Assert-Check ([IO.File]::ReadAllText($fileRoot) -ceq 'unchanged') 'invalid discovery root must stay unchanged'
    } finally { $roots.LegacySkillRoot = $savedLegacy }
    $link = Join-Path $roots.SkillRoot 'linked'
    [void](New-Item -ItemType Junction -Path $link -Target $roots.AgentsRoot)
    try {
        $report = Read-Report
        Assert-Check (-not $report.ScanComplete) 'linked discovery must report incomplete scan'
    } finally { [IO.Directory]::Delete($link) }
    Write-Output 'Installation diagnosis tests passed: missing, synced, modified, duplicate, quoted frontmatter, overlapping roots, link reporting, and no writes.'
} finally {
    $full = [IO.Path]::GetFullPath($root)
    if (-not $full.StartsWith($base, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cleanup' }
    if (Test-Path -LiteralPath $full) { Remove-Item -LiteralPath $full -Recurse -Force }
}
