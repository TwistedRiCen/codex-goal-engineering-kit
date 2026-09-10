[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [ValidateSet('Fail', 'Backup')]
    [string]$ConflictAction = 'Fail',

    [ValidateNotNullOrEmpty()]
    [string]$DestinationRoot = (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex\agents'),

    [string]$BackupRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Path)

    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

. (Join-Path $PSScriptRoot 'path-safety.ps1')

$sourceCandidate = Join-Path $PSScriptRoot '..\agents'
$sourceRoot = (Resolve-Path -LiteralPath $sourceCandidate).Path
$profileValidator = Join-Path $PSScriptRoot 'validate-agent-profiles.ps1'
& $profileValidator -Root $sourceRoot | Out-Null

$managedFileNames = @(
    'docs-researcher.toml',
    'explorer.toml',
    'reviewer.toml',
    'routine-worker.toml',
    'test-analyst.toml'
)
$sourceFiles = @($managedFileNames | ForEach-Object { Get-Item -LiteralPath (Join-Path $sourceRoot $_) })

$destinationRootPath = [System.IO.Path]::GetFullPath($DestinationRoot)
if ($sourceRoot.Equals($destinationRootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Source and destination must be different directories.'
}

if ((Test-Path -LiteralPath $destinationRootPath) -and
    -not (Test-Path -LiteralPath $destinationRootPath -PathType Container)) {
    throw "Destination root exists but is not a directory: $destinationRootPath"
}

$backupRootPath = if ([string]::IsNullOrWhiteSpace($BackupRoot)) {
    Join-Path (Split-Path -Parent $destinationRootPath) 'agent-backups'
} else { [IO.Path]::GetFullPath($BackupRoot) }
Assert-PlainTree -Root $sourceRoot
Assert-PlainPath -Path $destinationRootPath
Assert-PlainPath -Path $backupRootPath
Assert-DisjointPaths $sourceRoot $destinationRootPath
Assert-DisjointPaths $sourceRoot $backupRootPath
Assert-DisjointPaths $destinationRootPath $backupRootPath

$plan = @()
foreach ($sourceFile in $sourceFiles) {
    $destination = Join-Path $destinationRootPath $sourceFile.Name
    Assert-DirectChildPath -Root $destinationRootPath -Child $destination

    $sourceHash = Get-Sha256 -Path $sourceFile.FullName
    if (-not (Test-Path -LiteralPath $destination)) {
        $status = 'Missing'
        $destinationHash = $null
    } else {
        $destinationItem = Get-Item -LiteralPath $destination -Force
        if (($destinationItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Refusing to operate on a reparse-point managed destination: $destination"
        }
        if ($destinationItem.PSIsContainer) {
            $status = 'Conflict'
            $destinationHash = $null
        } else {
            $destinationHash = Get-Sha256 -Path $destination
            $status = if ($sourceHash -ceq $destinationHash) { 'Synchronized' } else { 'Conflict' }
        }
    }

    $plan += [pscustomobject]@{
        Name = $sourceFile.Name
        Source = $sourceFile.FullName
        Destination = $destination
        SourceHash = $sourceHash
        DestinationHash = $destinationHash
        Status = $status
    }
}

$conflicts = @($plan | Where-Object Status -eq 'Conflict')
$changes = @($plan | Where-Object Status -ne 'Synchronized')

Write-Output "Source:      $sourceRoot"
Write-Output "Destination: $destinationRootPath"
Write-Output "Profiles:    $($sourceFiles.Count) managed; $($changes.Count) change(s); $($conflicts.Count) conflict(s)"

if ($conflicts.Count -gt 0 -and $ConflictAction -eq 'Fail') {
    $names = ($conflicts.Name -join ', ')
    throw "Different content already exists for managed profile(s): $names. Re-run with -ConflictAction Backup to retain the existing files and install the Kit versions. No changes were made."
}

if ($changes.Count -eq 0) {
    Write-Output 'Already synchronized; no changes made.'
    return
}

$operation = "Install $($changes.Count) Kit-managed agent profile(s)"
if ($conflicts.Count -gt 0) {
    $operation += " and back up $($conflicts.Count) conflicting profile(s)"
}

if (-not $PSCmdlet.ShouldProcess($destinationRootPath, $operation)) {
    return
}

$runId = [Guid]::NewGuid().ToString('N')
$stagingRoot = Join-Path $backupRootPath ".codex-goal-engineering-kit.install-$runId"
Assert-DirectChildPath -Root $backupRootPath -Child $stagingRoot
$backupRunRoot = $null
$applied = @()
try {
    [void](New-Item -ItemType Directory -Path $destinationRootPath -Force)
    Assert-PlainPath -Path $destinationRootPath
    Assert-PlainPath -Path $backupRootPath
    [void](New-Item -ItemType Directory -Path $backupRootPath -Force)
    [void](New-Item -ItemType Directory -Path $stagingRoot)

    foreach ($item in $changes) {
        $stagedPath = Join-Path $stagingRoot $item.Name
        Copy-Item -LiteralPath $item.Source -Destination $stagedPath
        if ((Get-Sha256 -Path $stagedPath) -cne $item.SourceHash) {
            throw "Staged profile hash mismatch: $($item.Name)"
        }
    }

    if ($conflicts.Count -gt 0) {
        $timestamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
        $backupRunRoot = Join-Path $backupRootPath "codex-goal-engineering-kit-$timestamp-$($runId.Substring(0, 8))"
        [void](New-Item -ItemType Directory -Path $backupRunRoot -Force)
    }

    foreach ($item in $changes) {
        Assert-PlainPath -Path $destinationRootPath
        Assert-PlainPath -Path $backupRootPath
        if ($item.Status -eq 'Missing') {
            if (Test-Path -LiteralPath $item.Destination) {
                throw "Destination changed during installation; refusing to overwrite: $($item.Destination)"
            }
        } else {
            $currentItem = Get-Item -LiteralPath $item.Destination -Force
            if (($currentItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw "Destination became a reparse point during installation; refusing to overwrite: $($item.Destination)"
            }
            if ($currentItem.PSIsContainer) {
                throw "Conflicting destination is not a file: $($item.Destination)"
            }

            $currentHash = Get-Sha256 -Path $item.Destination
            if ($null -eq $item.DestinationHash -or $currentHash -cne $item.DestinationHash) {
                throw "Destination changed during installation; refusing to overwrite: $($item.Destination)"
            }
        }

        $backupPath = $null
        if ($item.Status -eq 'Conflict') {
            $backupPath = Join-Path $backupRunRoot $item.Name
            Copy-Item -LiteralPath $item.Destination -Destination $backupPath
            if ((Get-Sha256 -Path $backupPath) -cne $item.DestinationHash) { throw 'Backup content changed; refusing replacement.' }
        }

        $record = [pscustomobject]@{
            Destination = $item.Destination
            BackupPath = $backupPath
            WasMissing = ($item.Status -eq 'Missing')
            SourceHash = $item.SourceHash
            Installed = $false
        }
        $applied += $record

        if ($item.Status -eq 'Conflict') {
            Remove-Item -LiteralPath $item.Destination -Force
        }

        $stagedPath = Join-Path $stagingRoot $item.Name
        Move-Item -LiteralPath $stagedPath -Destination $item.Destination
        $record.Installed = $true
        Write-Output "Installed: $($item.Name)"
    }
} catch {
    for ($index = $applied.Count - 1; $index -ge 0; $index--) {
        $record = $applied[$index]
        try {
            Assert-PlainPath -Path $destinationRootPath
            Assert-PlainPath -Path $backupRootPath
            if ($record.Installed -and (Test-Path -LiteralPath $record.Destination)) {
                $installedItem = Get-Item -LiteralPath $record.Destination -Force
                $isReparsePoint = (($installedItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
                if (-not $installedItem.PSIsContainer -and -not $isReparsePoint -and
                    (Get-Sha256 -Path $record.Destination) -ceq $record.SourceHash) {
                    Remove-Item -LiteralPath $record.Destination -Force
                } else {
                    Write-Warning "Rollback preserved a destination that no longer matches the installed profile: $($record.Destination)"
                }
            }

            if (-not $record.WasMissing -and $null -ne $record.BackupPath -and
                (Test-Path -LiteralPath $record.BackupPath -PathType Leaf) -and
                -not (Test-Path -LiteralPath $record.Destination)) {
                Copy-Item -LiteralPath $record.BackupPath -Destination $record.Destination -Force
            }
        } catch {
            Write-Warning "Rollback failed for: $($record.Destination)"
        }
    }

    throw
} finally {
    if (Test-Path -LiteralPath $stagingRoot) {
        Assert-DirectChildPath -Root $backupRootPath -Child $stagingRoot
        Assert-PlainTree -Root $stagingRoot
        Remove-Item -LiteralPath $stagingRoot -Recurse -Force
    }
}

Write-Output 'Installed Kit-managed Codex agent profiles successfully.'
if ($null -ne $backupRunRoot) {
    Write-Output "Conflicting profiles backed up to: $backupRunRoot"
}
