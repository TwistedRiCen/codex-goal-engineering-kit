function Invoke-WithRuntimeConfigGuard {
    <#
    .SYNOPSIS
    在只读共享锁内运行操作，拒绝保护文件的写入和替换。
    .DESCRIPTION
    所有路径必须是现有普通文件。先全部加锁，再校验操作前后 SHA256；
    无论操作成功或失败都释放全部句柄。不复制、不恢复、不输出文件内容。
    返回 Result 与仅含路径、哈希的 Manifest。操作失败仍抛出原错误；
    异常 Data['RuntimeConfigGuardManifest'] 保留已完成的哈希校验结果。
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string[]]$Paths,
        [Parameter(Mandatory = $true)][scriptblock]$Operation
    )
    $handles = New-Object 'System.Collections.Generic.List[object]'
    $manifest = [ordered]@{ Before = @(); After = @(); Unchanged = $false }
    $operationError = $null
    $guardError = $null
    $result = $null
    try {
        $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
        foreach ($entry in $Paths) {
            $absolute = [IO.Path]::GetFullPath($entry)
            if (-not $seen.Add($absolute)) { throw 'RUNTIME_GUARD_DUPLICATE_PATH' }
            $item = Get-Item -LiteralPath $absolute -Force -ErrorAction Stop
            if ($item.PSIsContainer) { throw 'RUNTIME_GUARD_NOT_FILE' }
            $node = $item
            while ($null -ne $node) {
                if (($node.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'RUNTIME_GUARD_REPARSE_PATH' }
                if ($node -is [IO.FileInfo]) { $node = $node.Directory } else { $node = $node.Parent }
            }
            try { $stream = [IO.File]::Open($absolute, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read) }
            catch { throw 'RUNTIME_GUARD_LOCK_FAILED' }
            $handles.Add([pscustomobject]@{ Path = $absolute; Stream = $stream })
        }
        foreach ($handle in $handles) {
            $sha = [Security.Cryptography.SHA256]::Create()
            try { $handle.Stream.Position = 0; $hash = [BitConverter]::ToString($sha.ComputeHash($handle.Stream)).Replace('-', '').ToLowerInvariant() }
            finally { $sha.Dispose() }
            $manifest.Before += [pscustomobject]@{ Path = $handle.Path; SHA256 = $hash }
        }
        try { $result = @(& $Operation) } catch { $operationError = $_ }
        foreach ($handle in $handles) {
            $sha = [Security.Cryptography.SHA256]::Create()
            try { $handle.Stream.Position = 0; $hash = [BitConverter]::ToString($sha.ComputeHash($handle.Stream)).Replace('-', '').ToLowerInvariant() }
            finally { $sha.Dispose() }
            $manifest.After += [pscustomobject]@{ Path = $handle.Path; SHA256 = $hash }
        }
        for ($index = 0; $index -lt $handles.Count; $index++) {
            if ($manifest.Before[$index].SHA256 -cne $manifest.After[$index].SHA256) { throw 'RUNTIME_GUARD_HASH_CHANGED' }
            # Windows 锁阻止替换；同时重开路径验证其仍指向相同内容。
            if ((Get-FileHash -LiteralPath $handles[$index].Path -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() -cne $manifest.Before[$index].SHA256) { throw 'RUNTIME_GUARD_PATH_CHANGED' }
        }
        $manifest.Unchanged = $true
    } catch { $guardError = $_ }
    finally { foreach ($handle in $handles) { $handle.Stream.Dispose() } }
    if ($null -ne $guardError) { $guardError.Exception.Data['RuntimeConfigGuardManifest'] = $manifest; throw $guardError }
    if ($null -ne $operationError) { $operationError.Exception.Data['RuntimeConfigGuardManifest'] = $manifest; throw $operationError }
    [pscustomobject]@{ Result = $result; Manifest = $manifest }
}
