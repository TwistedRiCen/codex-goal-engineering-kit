[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('Fail', 'Backup', 'Overwrite')]
    [string]$ConflictAction = 'Fail',

    [string]$DestinationRoot = (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.agents\skills')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-DirectoryManifest {
    param([Parameter(Mandatory = $true)][string]$Root)

    $normalizedRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd([char[]]'\/')
    $prefix = $normalizedRoot + [System.IO.Path]::DirectorySeparatorChar
    $rows = Get-ChildItem -LiteralPath $normalizedRoot -Recurse -File -Force |
        Sort-Object FullName |
        ForEach-Object {
            $relativePath = $_.FullName.Substring($prefix.Length).Replace('\', '/')
            $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
            "${relativePath}`t${hash}"
        }

    return ($rows -join "`n")
}

function Assert-DirectChildPath {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Child
    )

    $normalizedRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd([char[]]'\/')
    $normalizedChild = [System.IO.Path]::GetFullPath($Child)
    $prefix = $normalizedRoot + [System.IO.Path]::DirectorySeparatorChar

    if (-not $normalizedChild.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside destination root: $normalizedChild"
    }
}


function Assert-PlainPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    $cursor = [System.IO.Path]::GetFullPath($Path)
    while (-not [string]::IsNullOrEmpty($cursor)) {
        if (Test-Path -LiteralPath $cursor) {
            $item = Get-Item -LiteralPath $cursor -Force
            if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw "Refusing reparse-point path: $cursor"
            }
        }
        $cursor = Split-Path -Parent $cursor
    }
}

function Assert-PlainTree {
    param([Parameter(Mandatory = $true)][string]$Root)
    Assert-PlainPath -Path $Root
    if (-not (Test-Path -LiteralPath $Root -PathType Container)) { return }
    $pending = New-Object 'System.Collections.Generic.Stack[string]'
    $pending.Push($Root)
    while ($pending.Count -gt 0) {
        foreach ($item in Get-ChildItem -LiteralPath $pending.Pop() -Force) {
            if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw "Refusing reparse-point package entry: $($item.FullName)"
            }
            if ($item.PSIsContainer) { $pending.Push($item.FullName) }
        }
    }
}

$sourceCandidate = Join-Path $PSScriptRoot '..\skills\goal-driven-engineering'
$source = (Resolve-Path -LiteralPath $sourceCandidate).Path
$destinationRootPath = [System.IO.Path]::GetFullPath($DestinationRoot).TrimEnd([char[]]'\/')
$destination = Join-Path $destinationRootPath 'goal-driven-engineering'

if (-not (Test-Path -LiteralPath (Join-Path $source 'SKILL.md') -PathType Leaf)) {
    throw "Source is not a valid goal-driven-engineering skill: $source"
}

if ($source.Equals([System.IO.Path]::GetFullPath($destination), [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Source and destination must be different directories.'
}

Assert-DirectChildPath -Root $destinationRootPath -Child $destination
$parentRoot = Split-Path -Parent $destinationRootPath
if ([string]::IsNullOrWhiteSpace($parentRoot)) { throw 'Destination root requires a parent directory.' }
# A sibling of the scanned skills directory: backups and partial packages must not be discovered.
$storageRoot = Join-Path $parentRoot 'skill-backups'
if ($storageRoot.Equals($destinationRootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Destination root must differ from the external skill-backups directory.'
}
$sourcePrefix = $source.TrimEnd([char[]]'\/') + [System.IO.Path]::DirectorySeparatorChar
$destinationPrefix = $destination.TrimEnd([char[]]'\/') + [System.IO.Path]::DirectorySeparatorChar
if ($destination.StartsWith($sourcePrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
    $source.StartsWith($destinationPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Source and destination must not overlap.'
}
Assert-PlainTree -Root $source
Assert-PlainTree -Root $destination
Assert-PlainPath -Path $storageRoot
$sourceManifest = Get-DirectoryManifest -Root $source

Write-Output "Source:      $source"
Write-Output "Destination: $destination"
Write-Output "Backup root: $storageRoot"

$destinationExists = Test-Path -LiteralPath $destination
if ($destinationExists -and -not (Test-Path -LiteralPath $destination -PathType Container)) {
    throw "Destination exists but is not a directory: $destination"
}

if ($destinationExists) {
    $destinationManifest = Get-DirectoryManifest -Root $destination

    if ($sourceManifest -ceq $destinationManifest) {
        Write-Output 'Already synchronized; no changes made.'
        return
    }

    if ($ConflictAction -eq 'Fail') {
        throw "Destination contains different content. Re-run with -ConflictAction Backup (recommended) or -ConflictAction Overwrite. No changes were made."
    }
}

$operation = if ($destinationExists) {
    "Synchronize goal-driven-engineering using conflict action '$ConflictAction'"
} else {
    'Install goal-driven-engineering'
}

if (-not $PSCmdlet.ShouldProcess($destination, $operation)) {
    return
}

[void](New-Item -ItemType Directory -Path $destinationRootPath -Force)
[void](New-Item -ItemType Directory -Path $storageRoot -Force)

$runId = [Guid]::NewGuid().ToString('N')
$staging = Join-Path $storageRoot ".goal-driven-engineering.install-$runId"
$previous = $null
$installComplete = $false

Assert-DirectChildPath -Root $storageRoot -Child $staging

try {
    Copy-Item -LiteralPath $source -Destination $staging -Recurse -Force
    if ((Get-DirectoryManifest -Root $staging) -cne $sourceManifest) {
        throw 'Staged package does not match the source manifest.'
    }

    if ($destinationExists) {
        if ($ConflictAction -eq 'Backup') {
            $timestamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
            $previous = Join-Path $storageRoot "goal-driven-engineering.backup-$timestamp-$($runId.Substring(0, 8))"
        } else {
            $previous = Join-Path $storageRoot ".goal-driven-engineering.previous-$runId"
        }

        Assert-DirectChildPath -Root $storageRoot -Child $previous
        Assert-PlainTree -Root $destination
        if ((Get-DirectoryManifest -Root $destination) -cne $destinationManifest) {
            throw 'Destination changed after inspection; refusing replacement.'
        }
        Move-Item -LiteralPath $destination -Destination $previous
    }

    if (Test-Path -LiteralPath $destination) { throw 'Destination appeared before activation; refusing replacement.' }
    Move-Item -LiteralPath $staging -Destination $destination
    $installComplete = $true
} catch {
    if (-not $installComplete -and $null -ne $previous -and
        (Test-Path -LiteralPath $previous) -and -not (Test-Path -LiteralPath $destination)) {
        Move-Item -LiteralPath $previous -Destination $destination
    }

    throw
} finally {
    if (Test-Path -LiteralPath $staging) {
        Assert-DirectChildPath -Root $storageRoot -Child $staging
        Assert-PlainTree -Root $staging
        Remove-Item -LiteralPath $staging -Recurse -Force
    }
}

if ($ConflictAction -eq 'Overwrite' -and $null -ne $previous -and (Test-Path -LiteralPath $previous)) {
    try {
        Assert-DirectChildPath -Root $storageRoot -Child $previous
        Assert-PlainTree -Root $previous
        Remove-Item -LiteralPath $previous -Recurse -Force
    } catch {
        Write-Warning "The new skill is installed, but the previous copy could not be removed: $previous"
    }
}

Write-Output 'Installed goal-driven-engineering successfully.'
if ($ConflictAction -eq 'Backup' -and $null -ne $previous) {
    Write-Output "Previous version backed up to: $previous"
}
