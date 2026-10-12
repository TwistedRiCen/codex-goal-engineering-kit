param(
    [Parameter(Mandatory=$true)][string]$EvidenceRoot,
    [Parameter(Mandatory=$true)][string]$Binary
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'with-runtime-config-guard.ps1')
if (-not (Test-Path -LiteralPath $EvidenceRoot -PathType Container)) { throw 'PRIVACY_EVIDENCE_ROOT_MISSING' }
if (@(Get-ChildItem -LiteralPath $EvidenceRoot -Force).Count -ne 0) { throw 'PRIVACY_EVIDENCE_ROOT_NOT_EMPTY' }
$realRoot = Join-Path $env:USERPROFILE '.codex'
$roots = @((Join-Path $env:USERPROFILE '.agents/skills'), (Join-Path $realRoot 'skills'), (Join-Path $realRoot 'agents'))
$paths = @((Join-Path $realRoot 'config.toml'), (Join-Path $realRoot 'auth.json'), (Join-Path $realRoot 'AGENTS.md'))
foreach ($root in $roots) {
    $paths += @(Get-ChildItem -LiteralPath $root -Recurse -File -Force | ForEach-Object { $_.FullName })
}
$guard = Invoke-WithRuntimeConfigGuard -Paths $paths -Operation {
    & node (Join-Path $PSScriptRoot 'probe-runtime-privacy-v4.cjs') probe $EvidenceRoot $Binary
    if ($LASTEXITCODE -ne 0) { throw 'PRIVACY_NATIVE_PROBE_FAILED' }
}
$afterPaths = @((Join-Path $realRoot 'config.toml'), (Join-Path $realRoot 'auth.json'), (Join-Path $realRoot 'AGENTS.md'))
foreach ($root in $roots) { $afterPaths += @(Get-ChildItem -LiteralPath $root -Recurse -File -Force | ForEach-Object { $_.FullName }) }
if ((@($paths | Sort-Object) -join '|') -ine (@($afterPaths | Sort-Object) -join '|')) { throw 'PRIVACY_PROTECTED_SET_CHANGED' }
$guard.Manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'static-guard.json') -Encoding UTF8
# Seal only after native shutdown, snapshots, lock checks and guard disposal.
& node (Join-Path $PSScriptRoot 'probe-runtime-privacy-v4.cjs') seal $EvidenceRoot
if ($LASTEXITCODE -ne 0) { throw 'PRIVACY_SEAL_FAILED' }
