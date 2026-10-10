<#
.SYNOPSIS
用临时合成文件验证只读锁；兼容 Windows PowerShell 5.1 与 PowerShell 7。
.DESCRIPTION
不访问真实配置或认证。清理只限本次创建并验证过的临时目录。
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'with-runtime-config-guard.ps1')
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
$testRoot = Join-Path $tempBase ('runtime-config-guard-' + [Guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $testRoot
$first = Join-Path $testRoot 'first.txt'
$second = Join-Path $testRoot 'second.txt'
[IO.File]::WriteAllText($first, 'synthetic one')
[IO.File]::WriteAllText($second, 'synthetic two')
$checks = 0
function Assert-GuardTest([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message }; $script:checks++ }
try {
    $guard = Invoke-WithRuntimeConfigGuard -Paths @($first, $second) -Operation {
        Assert-GuardTest ([IO.File]::ReadAllText($first) -ceq 'synthetic one') 'read failed'
        $writeDenied = $false
        try { [IO.File]::WriteAllText($first, 'forbidden') } catch { $writeDenied = $true }
        Assert-GuardTest $writeDenied 'write unexpectedly allowed'
        $renameDenied = $false
        try { [IO.File]::Move($first, (Join-Path $testRoot 'moved.txt')) } catch { $renameDenied = $true }
        Assert-GuardTest $renameDenied 'rename unexpectedly allowed'
        'synthetic result'
    }
    Assert-GuardTest $guard.Manifest.Unchanged 'hash mismatch'
    Assert-GuardTest ($guard.Manifest.Before.Count -eq 2 -and $guard.Manifest.After.Count -eq 2) 'manifest count'
    Assert-GuardTest (($guard.Manifest | ConvertTo-Json -Depth 5) -notmatch 'synthetic one|synthetic two') 'content disclosure'
    $failed = $false
    try { Invoke-WithRuntimeConfigGuard -Paths @($first) -Operation { throw 'SYNTHETIC_OPERATION_FAILED' } }
    catch {
        $failed = $_.Exception.Message -match 'SYNTHETIC_OPERATION_FAILED'
        Assert-GuardTest ([bool]$_.Exception.Data['RuntimeConfigGuardManifest'].Unchanged) 'failure hash check absent'
    }
    Assert-GuardTest $failed 'operation failure swallowed'
    [IO.File]::WriteAllText($first, 'unlocked after failure')
    Assert-GuardTest ([IO.File]::ReadAllText($first) -ceq 'unlocked after failure') 'handle leaked'
    $locker = [IO.File]::Open($second, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    $lockDenied = $false
    try {
        try { Invoke-WithRuntimeConfigGuard -Paths @($first, $second) -Operation { throw 'OPERATION_MUST_NOT_RUN' } }
        catch { $lockDenied = $_.Exception.Message -match 'RUNTIME_GUARD_LOCK_FAILED' }
    } finally { $locker.Dispose() }
    Assert-GuardTest $lockDenied 'lock failure did not stop operation'
    [IO.File]::WriteAllText($first, 'unlocked after partial lock')
    Assert-GuardTest ([IO.File]::ReadAllText($first) -ceq 'unlocked after partial lock') 'partial lock leaked'
    $duplicateDenied = $false
    try { Invoke-WithRuntimeConfigGuard -Paths @($first, $first) -Operation { throw 'OPERATION_MUST_NOT_RUN' } }
    catch { $duplicateDenied = $_.Exception.Message -match 'RUNTIME_GUARD_DUPLICATE_PATH' }
    Assert-GuardTest $duplicateDenied 'duplicate path allowed'
    [pscustomobject]@{ Passed = $true; Checks = $checks; PowerShell = $PSVersionTable.PSVersion.ToString(); Fixture = 'synthetic only' }
} finally {
    $resolved = [IO.Path]::GetFullPath($testRoot)
    if ([IO.Path]::GetDirectoryName($resolved) -cne $tempBase -or [IO.Path]::GetFileName($resolved) -notmatch '^runtime-config-guard-[a-f0-9]{32}$') { throw 'UNSAFE_TEST_CLEANUP_PATH' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
