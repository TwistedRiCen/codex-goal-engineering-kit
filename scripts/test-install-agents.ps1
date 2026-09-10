[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-True {
    param(
        [Parameter(Mandatory = $true)][bool]$Condition,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if (-not $Condition) {
        throw "Assertion failed: $Message"
    }
}

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$installer = Join-Path $PSScriptRoot 'install-agents.ps1'
$profileValidator = Join-Path $PSScriptRoot 'validate-agent-profiles.ps1'
$sourceRoot = Join-Path $repositoryRoot 'agents'

$tokens = $null
$parseErrors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile(
    $installer,
    [ref]$tokens,
    [ref]$parseErrors
)
Assert-True -Condition ($parseErrors.Count -eq 0) -Message 'installer PowerShell syntax must parse'

$validatorOutput = @(& $profileValidator)
Assert-True -Condition (($validatorOutput -join "`n") -match 'validation passed') -Message 'managed profile TOML and schema validation must pass'

$temporaryBase = [System.IO.Path]::GetFullPath(
    (Join-Path ([System.IO.Path]::GetTempPath()) 'codex-goal-engineering-kit-tests')
).TrimEnd([char[]]'\/')
$testRoot = Join-Path $temporaryBase ([Guid]::NewGuid().ToString('N'))
$testRootPath = [System.IO.Path]::GetFullPath($testRoot)
$requiredPrefix = $temporaryBase + [System.IO.Path]::DirectorySeparatorChar
if (-not $testRootPath.StartsWith($requiredPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to create test files outside the verified temporary root: $testRootPath"
}

[void](New-Item -ItemType Directory -Path $testRootPath -Force)

try {
    # Test the public -Root validator against isolated user customizations.
    $customRoot = Join-Path $testRootPath 'custom-profiles'
    [void](New-Item -ItemType Directory -Path $customRoot -Force)
    Copy-Item -Path (Join-Path $sourceRoot '*.toml') -Destination $customRoot
    $customPath = Join-Path $customRoot 'explorer.toml'
    $baseProfile = Get-Content -Raw -LiteralPath $customPath
    Assert-True -Condition ($baseProfile -notmatch '(?m)^model(?:_reasoning_effort)?\s*=') -Message 'default role must leave model selection to the host'

    foreach ($override in @(
        'model = "fixture-provider/custom-model"',
        'model_reasoning_effort = "fixture-host-effort"',
        ('model = "fixture-provider/custom-model"' + [Environment]::NewLine + 'model_reasoning_effort = "fixture-host-effort"')
    )) {
        Set-Content -LiteralPath $customPath -Value ($baseProfile + [Environment]::NewLine + $override)
        & $profileValidator -Root $customRoot | Out-Null
    }

    $invalidProfiles = @(
        ($baseProfile + [Environment]::NewLine + 'model = ""'),
        ($baseProfile + [Environment]::NewLine + 'model_reasoning_effort = "   "'),
        ($baseProfile + [Environment]::NewLine + 'model = "first"' + [Environment]::NewLine + 'model = "second"'),
        ($baseProfile + [Environment]::NewLine + 'model = 123'),
        ($baseProfile + [Environment]::NewLine + 'unexpected_key = "value"'),
        ($baseProfile.Replace('sandbox_mode = "read-only"', 'sandbox_mode = "workspace-write"')),
        ($baseProfile -replace '(?m)^description = .*\r?\n', ''),
        ($baseProfile.Replace('name = "explorer"', 'name = "reviewer"'))
    )
    foreach ($invalidProfile in $invalidProfiles) {
        Set-Content -LiteralPath $customPath -Value $invalidProfile
        $invalidRefused = $false
        try { & $profileValidator -Root $customRoot 2>$null | Out-Null } catch { $invalidRefused = $true }
        Assert-True -Condition $invalidRefused -Message 'malformed, incomplete, or unsafe custom role must fail validation'
    }

    $destinationRoot = Join-Path $testRootPath 'home\.codex\agents'
    $codexRoot = Split-Path -Parent $destinationRoot
    [void](New-Item -ItemType Directory -Path $destinationRoot -Force)

    $unrelatedPath = Join-Path $destinationRoot 'user-agent.toml'
    $unrelatedContent = 'name = "user_agent"'
    Set-Content -LiteralPath $unrelatedPath -Value $unrelatedContent -NoNewline

    $configPath = Join-Path $codexRoot 'config.toml'
    $configContent = '[user]`nsentinel = true'
    Set-Content -LiteralPath $configPath -Value $configContent -NoNewline

    $freshOutput = @(& $installer -DestinationRoot $destinationRoot)
    Assert-True -Condition (($freshOutput -join "`n") -match 'successfully') -Message 'fresh install must report success'

    $sourceFiles = @(Get-ChildItem -LiteralPath $sourceRoot -File -Filter '*.toml')
    Assert-True -Condition ($sourceFiles.Count -eq 5) -Message 'fixture must contain five managed profiles'
    foreach ($sourceFile in $sourceFiles) {
        $installed = Join-Path $destinationRoot $sourceFile.Name
        Assert-True -Condition (Test-Path -LiteralPath $installed -PathType Leaf) -Message "fresh install missing $($sourceFile.Name)"
        Assert-True -Condition ((Get-FileHash -LiteralPath $sourceFile.FullName).Hash -ceq (Get-FileHash -LiteralPath $installed).Hash) -Message "fresh install content mismatch for $($sourceFile.Name)"
    }
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $unrelatedPath) -ceq $unrelatedContent) -Message 'fresh install must preserve unrelated agents'
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $configPath) -ceq $configContent) -Message 'fresh install must not modify config.toml'

    $mixedRoot = Join-Path $testRootPath 'mixed-conflict\.codex\agents'
    [void](New-Item -ItemType Directory -Path $mixedRoot -Force)
    $mixedConflictPath = Join-Path $mixedRoot 'explorer.toml'
    Set-Content -LiteralPath $mixedConflictPath -Value '# pre-existing managed-name conflict' -NoNewline
    $mixedUnrelatedPath = Join-Path $mixedRoot 'user-agent.toml'
    Set-Content -LiteralPath $mixedUnrelatedPath -Value $unrelatedContent -NoNewline
    $mixedRefused = $false
    try {
        & $installer -DestinationRoot $mixedRoot 2>$null | Out-Null
    } catch {
        $mixedRefused = $true
    }
    Assert-True -Condition $mixedRefused -Message 'a conflict must refuse the entire mixed install plan'
    Assert-True -Condition ((Get-ChildItem -LiteralPath $mixedRoot -File).Count -eq 2) -Message 'conflict refusal must not install other missing managed profiles'
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $mixedConflictPath) -ceq '# pre-existing managed-name conflict') -Message 'mixed conflict content must remain unchanged'
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $mixedUnrelatedPath) -ceq $unrelatedContent) -Message 'mixed conflict refusal must preserve unrelated agents'

    $hardLinkRoot = Join-Path $testRootPath 'hard-link\home\.codex\agents'
    [void](New-Item -ItemType Directory -Path $hardLinkRoot -Force)
    $hardLinkTarget = Join-Path $testRootPath 'hard-link\external-explorer.toml'
    $linkedContent = '# external hard-link target must not be overwritten'
    Set-Content -LiteralPath $hardLinkTarget -Value $linkedContent -NoNewline
    $hardLinkDestination = Join-Path $hardLinkRoot 'explorer.toml'
    [void](New-Item -ItemType HardLink -Path $hardLinkDestination -Target $hardLinkTarget)
    & $installer -DestinationRoot $hardLinkRoot -ConflictAction Backup | Out-Null
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $hardLinkTarget) -ceq $linkedContent) -Message 'backup install must not overwrite an external hard-link target'
    Assert-True -Condition ((Get-FileHash -LiteralPath $hardLinkDestination).Hash -ceq (Get-FileHash -LiteralPath (Join-Path $sourceRoot 'explorer.toml')).Hash) -Message 'hard-link destination must be replaced by the managed profile'

    $junctionRoot = Join-Path $testRootPath 'junction\home\.codex\agents'
    [void](New-Item -ItemType Directory -Path $junctionRoot -Force)
    $junctionTarget = Join-Path $testRootPath 'junction\external-target'
    [void](New-Item -ItemType Directory -Path $junctionTarget -Force)
    $junctionSentinel = Join-Path $junctionTarget 'sentinel.txt'
    Set-Content -LiteralPath $junctionSentinel -Value 'keep junction target' -NoNewline
    [void](New-Item -ItemType Junction -Path (Join-Path $junctionRoot 'explorer.toml') -Target $junctionTarget)
    $junctionRefused = $false
    try {
        & $installer -DestinationRoot $junctionRoot -ConflictAction Backup 2>$null | Out-Null
    } catch {
        $junctionRefused = $true
    }
    Assert-True -Condition $junctionRefused -Message 'installer must refuse a reparse-point managed destination'
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $junctionSentinel) -ceq 'keep junction target') -Message 'reparse-point refusal must preserve the external target'
    Assert-True -Condition (@(Get-ChildItem -LiteralPath $junctionRoot -Force).Count -eq 1) -Message 'reparse-point refusal must not install other managed profiles'

    $beforeHashes = @{}
    foreach ($sourceFile in $sourceFiles) {
        $installed = Join-Path $destinationRoot $sourceFile.Name
        $beforeHashes[$sourceFile.Name] = (Get-FileHash -LiteralPath $installed).Hash
    }
    $idempotentOutput = @(& $installer -DestinationRoot $destinationRoot)
    Assert-True -Condition (($idempotentOutput -join "`n") -match 'Already synchronized') -Message 'identical reinstall must be a no-op'
    foreach ($sourceFile in $sourceFiles) {
        $installed = Join-Path $destinationRoot $sourceFile.Name
        Assert-True -Condition ((Get-FileHash -LiteralPath $installed).Hash -ceq $beforeHashes[$sourceFile.Name]) -Message "idempotent reinstall changed $($sourceFile.Name)"
    }

    $conflictPath = Join-Path $destinationRoot 'explorer.toml'
    $conflictContent = '# user-owned conflicting explorer profile'
    Set-Content -LiteralPath $conflictPath -Value $conflictContent -NoNewline
    $refused = $false
    try {
        & $installer -DestinationRoot $destinationRoot 2>$null | Out-Null
    } catch {
        $refused = $true
    }
    Assert-True -Condition $refused -Message 'different managed content must be refused by default'
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $conflictPath) -ceq $conflictContent) -Message 'conflict refusal must preserve user content'
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $unrelatedPath) -ceq $unrelatedContent) -Message 'conflict refusal must preserve unrelated agents'

    $backupOutput = @(& $installer -DestinationRoot $destinationRoot -ConflictAction Backup)
    Assert-True -Condition (($backupOutput -join "`n") -match 'backed up to') -Message 'backup install must report the backup location'
    $backupBase = Join-Path $codexRoot 'agent-backups'
    $backupCopies = @(Get-ChildItem -LiteralPath $backupBase -Recurse -File -Filter 'explorer.toml')
    Assert-True -Condition ($backupCopies.Count -eq 1) -Message 'backup install must retain exactly one conflicting profile copy'
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $backupCopies[0].FullName) -ceq $conflictContent) -Message 'backup must preserve the conflicting bytes'
    Assert-True -Condition ((Get-FileHash -LiteralPath $conflictPath).Hash -ceq (Get-FileHash -LiteralPath (Join-Path $sourceRoot 'explorer.toml')).Hash) -Message 'backup install must synchronize the managed profile'
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $unrelatedPath) -ceq $unrelatedContent) -Message 'backup install must preserve unrelated agents'
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $configPath) -ceq $configContent) -Message 'backup install must not modify config.toml'

    $backupCountBeforeWhatIf = @(Get-ChildItem -LiteralPath $backupBase -Directory).Count
    $whatIfConflictContent = '# WhatIf must not replace this conflict'
    Set-Content -LiteralPath $conflictPath -Value $whatIfConflictContent -NoNewline
    & $installer -DestinationRoot $destinationRoot -ConflictAction Backup -WhatIf | Out-Null
    Assert-True -Condition ((Get-Content -Raw -LiteralPath $conflictPath) -ceq $whatIfConflictContent) -Message '-WhatIf must not replace conflicting content'
    Assert-True -Condition (@(Get-ChildItem -LiteralPath $backupBase -Directory).Count -eq $backupCountBeforeWhatIf) -Message '-WhatIf must not create a conflict backup'

    $whatIfRoot = Join-Path $testRootPath 'what-if\.codex\agents'
    & $installer -DestinationRoot $whatIfRoot -WhatIf | Out-Null
    Assert-True -Condition (-not (Test-Path -LiteralPath $whatIfRoot)) -Message '-WhatIf must not create the destination'

    foreach ($linkCase in @('destination-root','destination-ancestor','backup-root')) {
        $caseBase = Join-Path $testRootPath $linkCase
        $outside = Join-Path $caseBase 'outside'
        [void](New-Item -ItemType Directory -Path $outside -Force)
        $link = Join-Path $caseBase 'alias'
        [void](New-Item -ItemType Junction -Path $link -Target $outside)
        try {
            $dest = if ($linkCase -eq 'destination-root') { $link } elseif ($linkCase -eq 'destination-ancestor') { Join-Path $link 'agents' } else { Join-Path $caseBase 'agents' }
            $argsForInstall = @{ DestinationRoot=$dest; ConflictAction='Backup' }
            if ($linkCase -eq 'backup-root') { $argsForInstall.BackupRoot=$link }
            $rejected = $false
            try { & $installer @argsForInstall | Out-Null } catch {
                if ($_.Exception.Message -notmatch 'reparse-point') { throw }
                $rejected = $true
            }
            Assert-True $rejected "linked $linkCase must be refused"
            Assert-True (@(Get-ChildItem -LiteralPath $outside -Force).Count -eq 0) 'linked backing directory must remain untouched'
        } finally {
            Assert-True ([IO.Path]::GetFullPath($link).StartsWith($requiredPrefix, [StringComparison]::OrdinalIgnoreCase)) 'verified junction cleanup'
            [IO.Directory]::Delete($link)
        }
    }
    $overlapDest = Join-Path $testRootPath 'overlap/agents'
    $overlapRefused = $false
    try { & $installer -DestinationRoot $overlapDest -BackupRoot (Join-Path $overlapDest 'backup') | Out-Null } catch {
        if ($_.Exception.Message -notmatch 'overlap') { throw }
        $overlapRefused = $true
    }
    Assert-True $overlapRefused 'nested backups must be refused before mutation'
    Assert-True (-not (Test-Path -LiteralPath $overlapDest)) 'overlap refusal must not create destination'

    $rollbackRoot = Join-Path $testRootPath 'rollback/agents'
    & $installer -DestinationRoot $rollbackRoot | Out-Null
    $oldPaths = @{}
    foreach ($file in Get-ChildItem -LiteralPath $rollbackRoot -File) {
        [IO.File]::AppendAllText($file.FullName, '# previous version')
        $oldPaths[$file.Name] = (Get-FileHash -LiteralPath $file.FullName).Hash
    }
    function Move-Item {
        param([string]$LiteralPath, [string]$Destination)
        if ($LiteralPath -like '*install-*' -and $LiteralPath -like '*reviewer.toml') { throw 'Injected agent activation failure' }
        Microsoft.PowerShell.Management\Move-Item -LiteralPath $LiteralPath -Destination $Destination
    }
    $failed = $false
    try { & $installer -DestinationRoot $rollbackRoot -ConflictAction Backup | Out-Null } catch {
        if ($_.Exception.Message -notmatch 'Injected agent activation failure') { throw }
        $failed = $true
    } finally { Remove-Item Function:\Move-Item }
    Assert-True $failed 'activation failure must be observed'
    foreach ($name in $oldPaths.Keys) {
        Assert-True ((Get-FileHash -LiteralPath (Join-Path $rollbackRoot $name)).Hash -ceq $oldPaths[$name]) 'rollback must preserve every prior profile'
    }

    Write-Output 'Agent installer tests passed: optional model overrides, invalid-role rejection, profile validation, syntax, fresh install, idempotency, conflict refusal, backup, links, WhatIf, and preservation.'
} finally {
    $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRootPath)
    if (-not $resolvedTestRoot.StartsWith($requiredPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove unverified test root: $resolvedTestRoot"
    }

    if (Test-Path -LiteralPath $resolvedTestRoot) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}
