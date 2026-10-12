<#
.SYNOPSIS
Run deterministic maintenance checks without Codex, model calls or real installation.
.DESCRIPTION
Quick is the default. Full adds isolated Windows installation/recovery and
no-model harness tests, using both PowerShell runtimes when locally available.
The explicit check registry is shared by both modes and CI. Stop on failure;
never change execution policy or user configuration to make a check pass.
#>
[CmdletBinding()]
param([ValidateSet('Quick','Full')][string]$Mode = 'Quick')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$windows = [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT
if ($Mode -eq 'Full' -and -not $windows) { throw 'Full is Windows-only; use Quick for portable contracts and deterministic fixtures.' }
$registry = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'maintenance-checks.json') -Raw | ConvertFrom-Json
$node = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$null = Get-Command git -CommandType Application -ErrorAction Stop
$nodeVersion = & $node --version
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(?<major>\d+)\.' -or [int]$Matches.major -lt $registry.nodeMinimumMajor) { throw 'Node.js 24 or newer is required.' }
$currentExecutable = if ($windows) { if ($PSVersionTable.PSVersion.Major -ge 7) {'pwsh.exe'} else {'powershell.exe'} } else {'pwsh'}
$engines = @((Join-Path $PSHOME $currentExecutable))
if ($Mode -eq 'Full') {
    $otherName = if ($PSVersionTable.PSVersion.Major -ge 7) {'powershell.exe'} else {'pwsh'}
    $other = Get-Command $otherName -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $other) { $engines += $other.Source } else { Write-Warning "Other PowerShell runtime unavailable: $otherName; not tested." }
}
$engines = @($engines | Select-Object -Unique)
if (-not $windows) {
    # Existing PowerShell fixtures serialize Windows paths. Do not claim that
    # a portable Node job exercises their filesystem/installer guarantees.
    $engines = @()
    Write-Host 'Portable Quick: Windows PowerShell validators/fixtures not run; covered by Windows Full.'
}
function Invoke-Check {
    param([string]$Executable, [string[]]$Arguments, [string]$Label)
    Write-Host "Checking $Label"
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Maintenance check failed: $Label (exit $LASTEXITCODE). Remaining checks not run." }
}
function Resolve-CheckPaths {
    param([string[]]$Names, [string]$Pattern)
    if ($Names.Count -eq 0 -or @($Names | Select-Object -Unique).Count -ne $Names.Count) { throw 'Empty or duplicate maintenance check set.' }
    foreach ($name in $Names) {
        if ($name -cnotmatch $Pattern) { throw "Unsafe maintenance check name: $name" }
        $file = Join-Path $PSScriptRoot $name
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Maintenance check missing: $name" }
        $file
    }
}
$nodeNames = @($registry.nodeQuick)
$psNames = @($registry.powershellQuick)
if ($Mode -eq 'Full') { $nodeNames += @($registry.nodeFull); $psNames += @($registry.powershellFull) }
$nodePaths = @(Resolve-CheckPaths $nodeNames '^test-[a-z0-9-]+\.cjs$')
$psPaths = @(Resolve-CheckPaths $psNames '^(?:test|validate)-[a-z0-9-]+\.ps1$')
Push-Location -LiteralPath $repository
try {
    Invoke-Check $node @((Join-Path $PSScriptRoot 'validate-repository.cjs')) 'repository metadata, maintained links and CI contract'
    Invoke-Check $node (@('--test') + $nodePaths) "$Mode Node deterministic tests"
    foreach ($engine in $engines) {
        foreach ($file in $psPaths) { Invoke-Check $engine @('-NoProfile','-NonInteractive','-File',$file) "$([IO.Path]::GetFileName($file)) [$engine]" }
    }
    Write-Host "Maintenance $Mode PASSED: Node $nodeVersion; $($nodePaths.Count) Node files; $($psPaths.Count) PowerShell checks per runtime; $($engines.Count) runtime(s). No model acceptance implied."
} finally { Pop-Location }
