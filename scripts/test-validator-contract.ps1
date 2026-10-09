[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$temporaryBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([char[]]'\/') + [IO.Path]::DirectorySeparatorChar
$fixtureRoot = Join-Path $temporaryBase ('kit-validator-' + [Guid]::NewGuid().ToString('N'))
$utf8 = New-Object Text.UTF8Encoding $false
$checks = 0
$originals = @{}

function Write-Fixture {
    param([string]$RelativePath, [string]$Text)
    [IO.File]::WriteAllText((Join-Path $fixtureRoot $RelativePath), $Text, $utf8)
}
function Test-ContractFixture {
    param([string]$Name, [scriptblock]$Mutate, [bool]$Reject = $false, [bool]$Agent = $false)
    foreach ($path in $originals.Keys) { Write-Fixture $path $originals[$path] }
    & $Mutate
    $errorRecord = $null
    try {
        if ($Agent) {
            & (Join-Path $repositoryRoot 'scripts/validate-agent-profiles.ps1') -Root (Join-Path $fixtureRoot 'agents') | Out-Null
        } else {
            & (Join-Path $repositoryRoot 'scripts/validate-skill.ps1') -Root $fixtureRoot | Out-Null
        }
    } catch { $errorRecord = $_ }
    if ($Reject -and $null -eq $errorRecord) { throw "Invalid fixture was accepted: $Name" }
    if (-not $Reject -and $null -ne $errorRecord) { throw "Valid fixture was rejected: $Name. $errorRecord" }
    $script:checks++
}

[void](New-Item -ItemType Directory -Path $fixtureRoot)
try {
    foreach ($folder in @('skills', 'templates', 'agents', 'prompts')) {
        Copy-Item -LiteralPath (Join-Path $repositoryRoot $folder) -Destination $fixtureRoot -Recurse
    }
    [void](New-Item -ItemType Directory -Path (Join-Path $fixtureRoot 'scripts'))
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'scripts/test-execution-continuity.ps1') -Destination (Join-Path $fixtureRoot 'scripts')
    foreach ($name in @('README.md', 'README.zh-CN.md')) { Copy-Item -LiteralPath (Join-Path $repositoryRoot $name) -Destination $fixtureRoot }
    foreach ($file in Get-ChildItem -LiteralPath $fixtureRoot -Recurse -File) {
        $relative = $file.FullName.Substring($fixtureRoot.Length + 1)
        $originals[$relative] = ([IO.File]::ReadAllText($file.FullName) -replace '\r\n?', [string][char]10)
    }
    $lifecyclePath = 'skills\goal-driven-engineering\references\full-lifecycle.md'
    $recoveryPath = 'skills\goal-driven-engineering\references\execution-continuity.md'
    $entryPath = 'skills\goal-driven-engineering\SKILL.md'
    Test-ContractFixture 'unchanged package' {}
    Test-ContractFixture 'paraphrased lead prose' {
        Write-Fixture $lifecyclePath ($originals[$lifecyclePath].Replace('Use these phase names exactly:', 'Canonical ordered phases:'))
        Write-Fixture $recoveryPath ($originals[$recoveryPath].Replace('Use only these execution states:', 'Canonical journal states:').Replace('Use only these recovery actions:', 'Canonical recovery actions:').Replace('Journal absence is the conceptual `IDLE` state', 'An absent journal represents `IDLE`').Replace('Never hash raw newline-joined entries', 'Raw newline concatenation is not an admissible fingerprint encoding'))
    }
    Test-ContractFixture 'historical forbidden labels are ordinary explanatory text' {
        Write-Fixture $entryPath ($originals[$entryPath] + "`nHistorical note: RECONCILE_EXTERNAL, Commit Token, Finalize Mode, Idempotency Key, Readback Query are not implemented.`n")
    }
    Test-ContractFixture 'missing phase' { Write-Fixture $lifecyclePath ($originals[$lifecyclePath].Replace("`nDISCOVERY`n", "`n")) } $true
    Test-ContractFixture 'extra phase' { Write-Fixture $lifecyclePath ($originals[$lifecyclePath].Replace("`nDISCOVERY`n", "`nDISCOVERY`nUNKNOWN PHASE`n")) } $true
    Test-ContractFixture 'missing state' { Write-Fixture $recoveryPath ($originals[$recoveryPath].Replace("`nIDLE`n", "`n")) } $true
    Test-ContractFixture 'extra state' { Write-Fixture $recoveryPath ($originals[$recoveryPath].Replace("`nIDLE`n", "`nIDLE`nUNKNOWN STATE`n")) } $true
    Test-ContractFixture 'state ordering changed' { Write-Fixture $recoveryPath ($originals[$recoveryPath].Replace("IDLE`nPREPARED", "PREPARED`nIDLE")) } $true
    Test-ContractFixture 'missing action' { Write-Fixture $recoveryPath ($originals[$recoveryPath].Replace("`nCONTINUE`n", "`n")) } $true
    Test-ContractFixture 'extra action' { Write-Fixture $recoveryPath ($originals[$recoveryPath].Replace("`nCONTINUE`n", "`nCONTINUE`nUNKNOWN ACTION`n")) } $true
    Test-ContractFixture 'missing journal field' { Write-Fixture $recoveryPath ($originals[$recoveryPath].Replace('Intent, Prepared HEAD', 'Prepared HEAD')) } $true
    Test-ContractFixture 'extra journal field' { Write-Fixture $recoveryPath ($originals[$recoveryPath].Replace('Intent, Prepared HEAD', 'Intent, Unknown Field, Prepared HEAD')) } $true
    Test-ContractFixture 'missing full section' { Write-Fixture 'templates\PLAN.full.md' ($originals['templates\PLAN.full.md'].Replace('## Project Goal', '## Missing')) } $true
    Test-ContractFixture 'missing compact section' { Write-Fixture 'templates\PLAN.md' ($originals['templates\PLAN.md'].Replace('## Current Work', '## Missing')) } $true
    Test-ContractFixture 'broken installed reference' { Write-Fixture $entryPath ($originals[$entryPath] + "`n[missing](references/missing.md)`n") } $true
    Test-ContractFixture 'escaping installed reference' { Write-Fixture $entryPath ($originals[$entryPath] + "`n[outside](../../README.md)`n") } $true
    Test-ContractFixture 'reference cannot mask wrong entrypoint name' {
        Write-Fixture $entryPath ($originals[$entryPath].Replace('name: goal-driven-engineering', 'name: wrong-skill'))
        Write-Fixture $lifecyclePath ($originals[$lifecyclePath] + "`nname: goal-driven-engineering`n")
    } $true
    Test-ContractFixture 'body cannot mask wrong frontmatter name' {
        Write-Fixture $entryPath ($originals[$entryPath].Replace('name: goal-driven-engineering', 'name: wrong-skill') + "`nname: goal-driven-engineering`n")
    } $true
    Test-ContractFixture 'missing opening frontmatter block' {
        Write-Fixture $entryPath ([regex]::Replace($originals[$entryPath], '\A---\n.*?---\n', '', [Text.RegularExpressions.RegexOptions]::Singleline))
    } $true
    Test-ContractFixture 'empty frontmatter description' {
        Write-Fixture $entryPath ([regex]::Replace($originals[$entryPath], '(?m)^description:.*$', 'description: ""'))
    } $true
    Test-ContractFixture 'paired double-quoted canonical name' {
        Write-Fixture $entryPath ($originals[$entryPath].Replace('name: goal-driven-engineering', 'name: "goal-driven-engineering"'))
    }
    Test-ContractFixture 'paired single-quoted canonical name' {
        Write-Fixture $entryPath ($originals[$entryPath].Replace('name: goal-driven-engineering', "name: 'goal-driven-engineering'"))
    }
    Test-ContractFixture 'comment does not define resolver' {
        Write-Fixture 'scripts\test-execution-continuity.ps1' ($originals['scripts\test-execution-continuity.ps1'].Replace('function Resolve-ExecutionContinuityAction', "# Resolve-ExecutionContinuityAction`nfunction Renamed-Resolver"))
    } $true
    Test-ContractFixture 'invalid PowerShell test source' { Write-Fixture 'scripts\test-execution-continuity.ps1' 'function Broken {' } $true
    Test-ContractFixture 'unchanged role profiles' {} $false $true
    # Concision is accepted for each actual role identity and permission boundary.
    # This establishes parser constraints, not semantic sufficiency of arbitrary prose.
    foreach ($role in @('docs-researcher', 'explorer', 'reviewer', 'routine-worker', 'test-analyst')) {
        $rolePath = "agents\$role.toml"
        Test-ContractFixture "concise instructions: $role" {
            $text = [regex]::Replace($originals[$rolePath], '(?s)developer_instructions\s*=\s*""".*?"""', 'developer_instructions = "Use the assigned role and scope. Preserve its permission boundary."')
            Write-Fixture $rolePath $text
        } $false $true
    }
    Test-ContractFixture 'wrong role sandbox' { Write-Fixture 'agents\reviewer.toml' ($originals['agents\reviewer.toml'].Replace('sandbox_mode = "read-only"', 'sandbox_mode = "workspace-write"')) } $true $true
    Test-ContractFixture 'wrong role identity' { Write-Fixture 'agents\reviewer.toml' ($originals['agents\reviewer.toml'].Replace('name = "reviewer"', 'name = "wrong"')) } $true $true
    Test-ContractFixture 'empty role purpose' { Write-Fixture 'agents\reviewer.toml' ([regex]::Replace($originals['agents\reviewer.toml'], '(?m)^description = .*$', 'description = ""')) } $true $true
    Test-ContractFixture 'empty instructions' { Write-Fixture 'agents\reviewer.toml' ([regex]::Replace($originals['agents\reviewer.toml'], '(?s)developer_instructions\s*=\s*""".*?"""', 'developer_instructions = ""')) } $true $true
    Test-ContractFixture 'duplicate TOML key' { Write-Fixture 'agents\reviewer.toml' ($originals['agents\reviewer.toml'] + "`nname = `"reviewer`"`n") } $true $true
    Test-ContractFixture 'unsupported TOML key' { Write-Fixture 'agents\reviewer.toml' ($originals['agents\reviewer.toml'] + "`nunknown_key = `"value`"`n") } $true $true
    Test-ContractFixture 'model and effort remain host-owned' { Write-Fixture 'agents\reviewer.toml' ($originals['agents\reviewer.toml'] + "`nmodel = `"future-host-model`"`nmodel_reasoning_effort = `"future-host-effort`"`n") } $false $true
    # Existing isolated encoding fixtures cover LF, CRLF, BOM, and real-heading rejection.
    & (Join-Path $repositoryRoot 'scripts/test-validator-encoding.ps1') | Out-Null
    Write-Output "Validator contract tests passed: $checks fixtures plus existing encoding fixtures. Static checks do not prove lifecycle or role semantics."
} finally {
    $resolvedFixture = [IO.Path]::GetFullPath($fixtureRoot)
    if (-not $resolvedFixture.StartsWith($temporaryBase, [StringComparison]::OrdinalIgnoreCase) -or
        [IO.Path]::GetFileName($resolvedFixture) -cnotmatch '^kit-validator-[a-f0-9]{32}$') { throw 'Unsafe fixture cleanup' }
    Remove-Item -LiteralPath $resolvedFixture -Recurse -Force
}
