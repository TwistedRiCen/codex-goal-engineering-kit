[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$base = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$root = Join-Path $base ('kit-encoding-' + [Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $root)
try {
    foreach ($folder in @('scripts','skills','templates','agents','prompts')) { Copy-Item -LiteralPath (Join-Path $repo $folder) -Destination $root -Recurse }
    foreach ($name in @('README.md','README.zh-CN.md')) { Copy-Item -LiteralPath (Join-Path $repo $name) -Destination $root }
    foreach ($variant in @('LF','CRLF','CRLF-BOM')) {
        foreach ($file in Get-ChildItem -LiteralPath $root -Recurse -File -Filter '*.md') {
            $text = [IO.File]::ReadAllText($file.FullName) -replace '\r\n?', [string][char]10
            if ($variant -ne 'LF') { $text = $text.Replace([string][char]10, ([string][char]13 + [char]10)) }
            $encoding = New-Object Text.UTF8Encoding ($variant -eq 'CRLF-BOM')
            [IO.File]::WriteAllText($file.FullName, $text, $encoding)
        }
        & (Join-Path $root 'scripts/validate-skill.ps1') | Out-Null
    }
    $template = Join-Path $root 'templates/PLAN.full.md'
    [IO.File]::WriteAllText($template, ([IO.File]::ReadAllText($template).Replace('## Project Goal','## Missing')))
    $rejected = $false
    try { & (Join-Path $root 'scripts/validate-skill.ps1') | Out-Null } catch { $rejected = $true }
    if (-not $rejected) { throw 'Missing real heading was accepted' }
    Write-Output 'Encoding tests passed: LF, CRLF, UTF-8 BOM, and missing-heading rejection.'
} finally {
    $full = [IO.Path]::GetFullPath($root)
    if (-not $full.StartsWith($base, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cleanup' }
    Remove-Item -LiteralPath $full -Recurse -Force
}
