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


function Assert-DisjointPaths {
    param([string]$First, [string]$Second)
    $a = [IO.Path]::GetFullPath($First).TrimEnd([char[]]'\/')
    $b = [IO.Path]::GetFullPath($Second).TrimEnd([char[]]'\/')
    $separator = [IO.Path]::DirectorySeparatorChar
    if ($a.Equals($b, [StringComparison]::OrdinalIgnoreCase) -or
        $a.StartsWith($b + $separator, [StringComparison]::OrdinalIgnoreCase) -or
        $b.StartsWith($a + $separator, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Installation paths must not overlap: $First ; $Second"
    }
}
