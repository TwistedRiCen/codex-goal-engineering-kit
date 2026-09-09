[CmdletBinding()]
param(
    [string]$Root
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Join-Path $PSScriptRoot '..\agents'
}

function ConvertFrom-FlatAgentToml {
    param([Parameter(Mandatory = $true)][string]$Path)

    $result = @{}
    $multilineKey = $null
    $multilineValue = [System.Collections.Generic.List[string]]::new()
    $lineNumber = 0

    foreach ($line in Get-Content -LiteralPath $Path) {
        $lineNumber++

        if ($null -ne $multilineKey) {
            if ($line -cmatch '^\s*"""\s*$') {
                $result[$multilineKey] = $multilineValue -join "`n"
                $multilineKey = $null
                $multilineValue.Clear()
            } else {
                $multilineValue.Add($line)
            }
            continue
        }

        if ($line -cmatch '^\s*(?:#.*)?$') {
            continue
        }

        $multilineMatch = [regex]::Match($line, '^\s*(?<key>[A-Za-z0-9_-]+)\s*=\s*"""\s*$')
        if ($multilineMatch.Success) {
            $key = $multilineMatch.Groups['key'].Value
            if ($result.ContainsKey($key)) {
                throw "$Path`:$lineNumber duplicates TOML key '$key'."
            }
            $multilineKey = $key
            continue
        }

        $stringMatch = [regex]::Match($line, '^\s*(?<key>[A-Za-z0-9_-]+)\s*=\s*"(?<value>[^"\\]*)"\s*$')
        if (-not $stringMatch.Success) {
            throw "$Path`:$lineNumber is not valid in the supported flat custom-agent TOML format."
        }

        $key = $stringMatch.Groups['key'].Value
        if ($result.ContainsKey($key)) {
            throw "$Path`:$lineNumber duplicates TOML key '$key'."
        }
        $result[$key] = $stringMatch.Groups['value'].Value
    }

    if ($null -ne $multilineKey) {
        throw "$Path has an unterminated multiline TOML string for '$multilineKey'."
    }

    return $result
}

$expected = [ordered]@{
    'docs-researcher.toml' = @{
        name = 'docs_researcher'
        sandbox_mode = 'read-only'
    }
    'explorer.toml' = @{
        name = 'explorer'
        sandbox_mode = 'read-only'
    }
    'reviewer.toml' = @{
        name = 'reviewer'
        sandbox_mode = 'read-only'
    }
    'routine-worker.toml' = @{
        name = 'routine_worker'
        sandbox_mode = 'workspace-write'
    }
    'test-analyst.toml' = @{
        name = 'test_analyst'
        sandbox_mode = 'read-only'
    }
}
$requiredKeys = @('name', 'description', 'developer_instructions', 'sandbox_mode')
$optionalKeys = @('model', 'model_reasoning_effort')
$rootPath = (Resolve-Path -LiteralPath $Root).Path
$actualFiles = @(Get-ChildItem -LiteralPath $rootPath -File -Filter '*.toml' | Sort-Object Name)
$actualNames = @($actualFiles.Name)
$expectedNames = @($expected.Keys)

$fileDifference = @(Compare-Object -ReferenceObject $expectedNames -DifferenceObject $actualNames)
if ($fileDifference.Count -gt 0) {
    throw "Agent profile set must contain exactly: $($expectedNames -join ', ')."
}

$seenAgentNames = @{}
foreach ($fileName in $expectedNames) {
    $path = Join-Path $rootPath $fileName
    $profile = ConvertFrom-FlatAgentToml -Path $path

    $profileKeys = @($profile.Keys)
    $missingKeys = @($requiredKeys | Where-Object { $_ -notin $profileKeys })
    $unsupportedKeys = @($profileKeys | Where-Object { $_ -notin ($requiredKeys + $optionalKeys) })
    if ($missingKeys.Count -gt 0 -or $unsupportedKeys.Count -gt 0) {
        throw "$fileName has missing required keys or unsupported keys: $($missingKeys + $unsupportedKeys -join ', ')."
    }

    foreach ($key in $profileKeys) {
        if ([string]::IsNullOrWhiteSpace([string]$profile[$key])) {
            throw "$fileName has an empty value: $key"
        }
    }
    # Model availability and supported effort values belong to the host runtime,
    # not a version-specific allowlist in this portable role validator.

    foreach ($key in $expected[$fileName].Keys) {
        if ([string]$profile[$key] -cne [string]$expected[$fileName][$key]) {
            throw "$fileName has unexpected $key value '$($profile[$key])'."
        }
    }

    if ($profile['developer_instructions'].Length -lt 160) {
        throw "$fileName developer_instructions are not sufficiently bounded."
    }

    $agentName = [string]$profile['name']
    if ($seenAgentNames.ContainsKey($agentName)) {
        throw "Duplicate custom-agent name: $agentName"
    }
    $seenAgentNames[$agentName] = $true
}

Write-Output "Agent profile validation passed: $($expectedNames.Count) profiles."
