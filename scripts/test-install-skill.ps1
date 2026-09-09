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
    $backupRoot = Join-Path $testRoot 'skill-backups'
    $unrelated = Join-Path $destinationRoot 'user-skill'
    [void](New-Item -ItemType Directory -Path $unrelated -Force)
    $sentinel = Join-Path $unrelated 'SKILL.md'
    Set-Content -LiteralPath $sentinel -Value 'user-owned skill' -Encoding utf8
    $sentinelHash = (Get-FileHash -LiteralPath $sentinel).Hash

    & $installer -DestinationRoot $destinationRoot -WhatIf | Out-Null
    Assert-True (-not (Test-Path -LiteralPath $target)) 'fresh WhatIf must not install'
    Assert-True (-not (Test-Path -LiteralPath $backupRoot)) 'fresh WhatIf must not create external storage'
    & $installer -DestinationRoot $destinationRoot | Out-Null
    Assert-True ((Get-Manifest $source) -ceq (Get-Manifest $target)) 'fresh installation must include the entire package'
    foreach ($reference in @('references/full-lifecycle.md', 'references/execution-continuity.md', 'references/guided-intake.md')) {
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

    $before = Get-Manifest $testRoot
    & $installer -DestinationRoot $destinationRoot -ConflictAction Backup -WhatIf | Out-Null
    Assert-True ($before -ceq (Get-Manifest $testRoot)) 'backup WhatIf must not change any file'

    & $installer -DestinationRoot $destinationRoot -ConflictAction Backup | Out-Null
    $backups = @(Get-ChildItem -LiteralPath $backupRoot -Directory -Filter 'goal-driven-engineering.backup-*')
    Assert-True ($backups.Count -eq 1) 'backup synchronization must retain one previous package'
    Assert-True ($customManifest -ceq (Get-Manifest $backups[0].FullName)) 'backup must preserve exact customized package'
    Assert-True ((Get-Manifest $source) -ceq (Get-Manifest $target)) 'updated package must match source including references'
    Assert-True ($sentinelHash -ceq (Get-FileHash -LiteralPath $sentinel).Hash) 'unrelated Skill must be preserved'

    $managedDiscovered = @(Get-ChildItem -LiteralPath $destinationRoot -Recurse -File -Filter SKILL.md | Where-Object { (Get-Content -Raw -LiteralPath $_.FullName) -match '(?m)^name: goal-driven-engineering\r?$' })
    Assert-True ($managedDiscovered.Count -eq 1) 'only one managed Skill may be discovered after backup installation'
    Assert-True (@(Get-ChildItem -LiteralPath $backupRoot -Force -Filter '.goal-driven-engineering.install-*').Count -eq 0) 'staging must be cleaned outside discovery'

    # Simulate failure during activation, after the prior package was moved away.
    Add-Content -LiteralPath $customReference -Value 'Rollback sentinel'
    $rollbackManifest = Get-Manifest $target
    function Move-Item {
        param([string]$LiteralPath, [string]$Destination)
        if ((Split-Path -Leaf $LiteralPath) -like '.goal-driven-engineering.install-*') {
            throw 'Injected activation failure'
        }
        Microsoft.PowerShell.Management\Move-Item -LiteralPath $LiteralPath -Destination $Destination
    }
    $activationFailed = $false
    try { & $installer -DestinationRoot $destinationRoot -ConflictAction Backup | Out-Null } catch {
        if ($_.Exception.Message -notmatch 'Injected activation failure') { throw }
        $activationFailed = $true
    } finally {
        Remove-Item Function:\Move-Item
    }
    Assert-True $activationFailed 'activation failure must be observed'
    Assert-True ($rollbackManifest -ceq (Get-Manifest $target)) 'failed activation must restore the previous package exactly'
    Assert-True (@(Get-ChildItem -LiteralPath $backupRoot -Force -Filter '.goal-driven-engineering.install-*').Count -eq 0) 'failed activation must remove partial staging'


    & $installer -DestinationRoot $destinationRoot -ConflictAction Overwrite | Out-Null
    Assert-True ((Get-Manifest $source) -ceq (Get-Manifest $target)) 'explicit overwrite must install exact source'
    Assert-True (@(Get-ChildItem -LiteralPath $backupRoot -Force -Filter '.goal-driven-engineering.previous-*').Count -eq 0) 'overwrite must clean its temporary previous package'
    Assert-True (@(Get-ChildItem -LiteralPath $destinationRoot -Recurse -File -Filter SKILL.md | Where-Object { (Get-Content -Raw -LiteralPath $_.FullName) -match '(?m)^name: goal-driven-engineering\r?$' }).Count -eq 1) 'overwrite must also leave one discoverable managed Skill'

    # Link redirection could put backups back under discovery or touch user data.
    $linkRoot = Join-Path $testRoot 'linked-case'
    $outside = Join-Path $testRoot 'outside-sentinel'
    [void](New-Item -ItemType Directory -Path $linkRoot -Force)
    [void](New-Item -ItemType Directory -Path $outside -Force)
    $outsideFile = Join-Path $outside 'keep.txt'
    Set-Content -LiteralPath $outsideFile -Value 'keep'
    $outsideHash = (Get-FileHash -LiteralPath $outsideFile).Hash
    $junction = Join-Path $linkRoot 'skill-backups'
    [void](New-Item -ItemType Junction -Path $junction -Target $outside)
    try {
        $linkRefused = $false
        try { & $installer -DestinationRoot (Join-Path $linkRoot 'skills') -ConflictAction Backup | Out-Null } catch {
            if ($_.Exception.Message -notmatch 'reparse-point') { throw }
            $linkRefused = $true
        }
        Assert-True $linkRefused 'redirected backup root must be rejected'
        Assert-True ($outsideHash -ceq (Get-FileHash -LiteralPath $outsideFile).Hash) 'link rejection must preserve outside data'
        Assert-True (-not (Test-Path -LiteralPath (Join-Path $linkRoot 'skills'))) 'link rejection must happen before mutation'
    } finally {
        # Remove only the verified junction itself, never its target.
        Assert-True ([System.IO.Path]::GetFullPath($junction).StartsWith($requiredPrefix, [System.StringComparison]::OrdinalIgnoreCase)) 'junction cleanup stays inside fixture'
        [System.IO.Directory]::Delete($junction)
    }

    Write-Output 'Skill installer safety tests passed: preview, full package, references, idempotence, refusal, external backup, single discovery, rollback, overwrite, link rejection, and unrelated-file preservation.'
} finally {
    $resolvedTarget = [System.IO.Path]::GetFullPath($testRoot)
    Assert-True ($resolvedTarget.StartsWith($requiredPrefix, [System.StringComparison]::OrdinalIgnoreCase)) 'cleanup target must remain in designated temporary directory'
    if (Test-Path -LiteralPath $resolvedTarget) {
        Assert-True (-not ((Get-Item -LiteralPath $resolvedTarget).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) 'cleanup root must not be a reparse point'
        Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
    }
}
