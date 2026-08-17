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

$sourceCandidate = Join-Path $PSScriptRoot '..\skills\goal-driven-engineering'
$source = (Resolve-Path -LiteralPath $sourceCandidate).Path
$destinationRootPath = [System.IO.Path]::GetFullPath($DestinationRoot)
$destination = Join-Path $destinationRootPath 'goal-driven-engineering'

if (-not (Test-Path -LiteralPath (Join-Path $source 'SKILL.md') -PathType Leaf)) {
    throw "Source is not a valid goal-driven-engineering skill: $source"
}

if ($source.Equals([System.IO.Path]::GetFullPath($destination), [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Source and destination must be different directories.'
}

Assert-DirectChildPath -Root $destinationRootPath -Child $destination

Write-Output "Source:      $source"
Write-Output "Destination: $destination"

$destinationExists = Test-Path -LiteralPath $destination
if ($destinationExists -and -not (Test-Path -LiteralPath $destination -PathType Container)) {
    throw "Destination exists but is not a directory: $destination"
}

if ($destinationExists) {
    $sourceManifest = Get-DirectoryManifest -Root $source
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

$runId = [Guid]::NewGuid().ToString('N')
$staging = Join-Path $destinationRootPath ".goal-driven-engineering.install-$runId"
$previous = $null
$installComplete = $false

Assert-DirectChildPath -Root $destinationRootPath -Child $staging

try {
    Copy-Item -LiteralPath $source -Destination $staging -Recurse -Force

    if ($destinationExists) {
        if ($ConflictAction -eq 'Backup') {
            $timestamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
            $previous = Join-Path $destinationRootPath "goal-driven-engineering.backup-$timestamp-$($runId.Substring(0, 8))"
        } else {
            $previous = Join-Path $destinationRootPath ".goal-driven-engineering.previous-$runId"
        }

        Assert-DirectChildPath -Root $destinationRootPath -Child $previous
        Move-Item -LiteralPath $destination -Destination $previous
    }

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
        Remove-Item -LiteralPath $staging -Recurse -Force
    }
}

if ($ConflictAction -eq 'Overwrite' -and $null -ne $previous -and (Test-Path -LiteralPath $previous)) {
    try {
        Remove-Item -LiteralPath $previous -Recurse -Force
    } catch {
        Write-Warning "The new skill is installed, but the previous copy could not be removed: $previous"
    }
}

Write-Output 'Installed goal-driven-engineering successfully.'
if ($ConflictAction -eq 'Backup' -and $null -ne $previous) {
    Write-Output "Previous version backed up to: $previous"
}
