[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "Assertion failed: $Message" }
}

function Get-Manifest {
    param([string]$Root)
    $prefix = [System.IO.Path]::GetFullPath($Root).TrimEnd([char[]]'\/') + [System.IO.Path]::DirectorySeparatorChar
    $rows = @(Get-ChildItem -LiteralPath $Root -Recurse -File | Sort-Object FullName | ForEach-Object {
        $_.FullName.Substring($prefix.Length).Replace('\', '/') + ':' + (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    })
    return ($rows -join '|')
}

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repositoryRoot 'skills/goal-driven-engineering'
$installer = Join-Path $PSScriptRoot 'install-skill.ps1'
$temporaryBase = [System.IO.Path]::GetFullPath((Join-Path ([System.IO.Path]::GetTempPath()) 'kit-skill-install-tests')).TrimEnd([char[]]'\/')
$testRoot = [System.IO.Path]::GetFullPath((Join-Path $temporaryBase ([Guid]::NewGuid().ToString('N'))))
$requiredPrefix = $temporaryBase + [System.IO.Path]::DirectorySeparatorChar
Assert-True ($testRoot.StartsWith($requiredPrefix, [System.StringComparison]::OrdinalIgnoreCase)) 'fixture must be inside the designated temporary directory'
[void](New-Item -ItemType Directory -Path $testRoot -Force)

try {
    $destinationRoot = Join-Path $testRoot 'skills'
    $target = Join-Path $destinationRoot 'goal-driven-engineering'
    $unrelated = Join-Path $destinationRoot 'user-skill'
    [void](New-Item -ItemType Directory -Path $unrelated -Force)
    $sentinel = Join-Path $unrelated 'SKILL.md'
    Set-Content -LiteralPath $sentinel -Value 'user-owned skill' -Encoding utf8
    $sentinelHash = (Get-FileHash -LiteralPath $sentinel).Hash

    & $installer -DestinationRoot $destinationRoot -WhatIf | Out-Null
    Assert-True (-not (Test-Path -LiteralPath $target)) 'fresh WhatIf must not install'
    & $installer -DestinationRoot $destinationRoot | Out-Null
    Assert-True ((Get-Manifest $source) -ceq (Get-Manifest $target)) 'fresh installation must include the entire package'
    foreach ($reference in @('references/full-lifecycle.md', 'references/execution-continuity.md')) {
        Assert-True (Test-Path -LiteralPath (Join-Path $target $reference) -PathType Leaf) "installed reference must be available: $reference"
    }

    $before = Get-Manifest $destinationRoot
    $result = @(& $installer -DestinationRoot $destinationRoot)
    Assert-True (($result -join ' ') -match 'Already synchronized; no changes made') 'repeat installation must report no-op'
    Assert-True ($before -ceq (Get-Manifest $destinationRoot)) 'repeat install must preserve all files'

    $customReference = Join-Path $target 'references/execution-continuity.md'
    Add-Content -LiteralPath $customReference -Value 'User customization sentinel'
    $customManifest = Get-Manifest $target
    $refused = $false
    try { & $installer -DestinationRoot $destinationRoot | Out-Null } catch {
        if ($_.Exception.Message -notmatch 'different content') { throw }
        $refused = $true
    }
    Assert-True $refused 'conflicting customization must be refused by default'
    Assert-True ($customManifest -ceq (Get-Manifest $target)) 'default refusal must preserve customization'

    $before = Get-Manifest $destinationRoot
    & $installer -DestinationRoot $destinationRoot -ConflictAction Backup -WhatIf | Out-Null
    Assert-True ($before -ceq (Get-Manifest $destinationRoot)) 'backup WhatIf must not change any file'

    & $installer -DestinationRoot $destinationRoot -ConflictAction Backup | Out-Null
    $backups = @(Get-ChildItem -LiteralPath $destinationRoot -Directory -Filter 'goal-driven-engineering.backup-*')
    Assert-True ($backups.Count -eq 1) 'backup synchronization must retain one previous package'
    Assert-True ($customManifest -ceq (Get-Manifest $backups[0].FullName)) 'backup must preserve exact customized package'
    Assert-True ((Get-Manifest $source) -ceq (Get-Manifest $target)) 'updated package must match source including references'
    Assert-True ($sentinelHash -ceq (Get-FileHash -LiteralPath $sentinel).Hash) 'unrelated Skill must be preserved'

    Write-Output 'Skill installer safety tests passed: preview, full package, references, idempotence, refusal, backup, and unrelated-file preservation.'
} finally {
    $resolvedTarget = [System.IO.Path]::GetFullPath($testRoot)
    Assert-True ($resolvedTarget.StartsWith($requiredPrefix, [System.StringComparison]::OrdinalIgnoreCase)) 'cleanup target must remain in designated temporary directory'
    if (Test-Path -LiteralPath $resolvedTarget) {
        Assert-True (-not ((Get-Item -LiteralPath $resolvedTarget).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) 'cleanup root must not be a reparse point'
        Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
    }
}
