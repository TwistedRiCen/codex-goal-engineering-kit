<#
.SYNOPSIS
在保护文件只读锁内运行新的无模型预检或安全 E5 失败实验。
.DESCRIPTION
不修改或复制全局配置与认证。模型场景因 native 日志隐私未证成而拒绝。
ProtectedSnapshot 必须由本次只读盘点生成；结果路径不得覆盖旧证据。
#>
param(
    [Parameter(Mandatory=$true)][string]$EvidenceRoot,
    [Parameter(Mandatory=$true)][ValidateSet('preflight','E1','E2','E3','E4','E5')][string]$Scenario,
    [Parameter(Mandatory=$true)][string]$ProtectedSnapshot,
    [string]$Binary = 'codex',
    [string]$SkillPath = (Join-Path $env:USERPROFILE '.agents/skills/goal-driven-engineering')
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'with-runtime-config-guard.ps1')
$snapshot = Get-Content -LiteralPath $ProtectedSnapshot -Raw | ConvertFrom-Json
$paths = @($snapshot.protectedFiles.PSObject.Properties | ForEach-Object { $_.Name })
if ($paths.Count -lt 3) { throw 'RUNTIME_PROTECTED_SNAPSHOT_MISSING' }
$requiredProtected = @((Join-Path $env:USERPROFILE '.codex/config.toml'), (Join-Path $env:USERPROFILE '.codex/auth.json'), (Join-Path $env:USERPROFILE '.codex/AGENTS.md'))
foreach ($required in $requiredProtected) {
    if (-not ($paths | Where-Object { [IO.Path]::GetFullPath($_) -ieq [IO.Path]::GetFullPath($required) })) { throw 'RUNTIME_REQUIRED_PROTECTION_MISSING' }
}
$protectedRoots = @((Join-Path $env:USERPROFILE '.agents/skills'), (Join-Path $env:USERPROFILE '.codex/skills'), (Join-Path $env:USERPROFILE '.codex/agents'))
foreach ($root in $protectedRoots) {
    $absoluteRoot = [IO.Path]::GetFullPath($root).TrimEnd([char[]]'\/') + [IO.Path]::DirectorySeparatorChar
    $actual = @(Get-ChildItem -LiteralPath $root -Recurse -File -Force -ErrorAction Stop | ForEach-Object { [IO.Path]::GetFullPath($_.FullName) } | Sort-Object)
    $expected = @($paths | ForEach-Object { [IO.Path]::GetFullPath($_) } | Where-Object { $_.StartsWith($absoluteRoot, [StringComparison]::OrdinalIgnoreCase) } | Sort-Object)
    if (($actual -join '|') -ine ($expected -join '|')) { throw 'RUNTIME_PROTECTED_SET_CHANGED' }
}
foreach ($property in $snapshot.protectedFiles.PSObject.Properties) {
    if ((Get-FileHash -LiteralPath $property.Name -Algorithm SHA256).Hash.ToLowerInvariant() -cne $property.Value) { throw 'RUNTIME_BEFORE_HASH_CHANGED' }
}
$output = [IO.Path]::GetFullPath((Join-Path $EvidenceRoot ($Scenario + '-guard.json')))
if (Test-Path -LiteralPath $output) { throw 'RUNTIME_OUTPUT_EXISTS' }
$previousBinary = $env:GDE_RUNTIME_BINARY
$previousSkill = $env:GDE_RUNTIME_SKILL
$previousVersion = $env:GDE_RUNTIME_VERSION
$env:GDE_RUNTIME_BINARY = $Binary
$env:GDE_RUNTIME_SKILL = $SkillPath
try {
    $guard = Invoke-WithRuntimeConfigGuard -Paths $paths -Operation {
        foreach ($property in $snapshot.protectedFiles.PSObject.Properties) {
            if ((Get-FileHash -LiteralPath $property.Name -Algorithm SHA256).Hash.ToLowerInvariant() -cne $property.Value) { throw 'RUNTIME_LOCKED_BEFORE_HASH_CHANGED' }
        }
        $versionOutput = & $Binary --version 2>$null
        if ($LASTEXITCODE -ne 0 -or $versionOutput -notmatch '^codex-cli ([a-zA-Z0-9.-]+)$') { throw 'RUNTIME_VERSION_UNAVAILABLE' }
        $env:GDE_RUNTIME_VERSION = $Matches[1]
        & node (Join-Path $PSScriptRoot 'run-runtime-v4.cjs') $EvidenceRoot $Scenario
        if ($LASTEXITCODE -ne 0) { throw 'RUNTIME_RUN_FAILED' }
    }
    $guard.Manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $output -Encoding UTF8
    $guard.Result
} catch {
    $manifest = $_.Exception.Data['RuntimeConfigGuardManifest']
    if ($null -ne $manifest) { $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $output -Encoding UTF8 }
    throw
} finally {
    $env:GDE_RUNTIME_BINARY = $previousBinary
    $env:GDE_RUNTIME_SKILL = $previousSkill
    $env:GDE_RUNTIME_VERSION = $previousVersion
}
