# Dot-source this optional helper. It never writes PLAN or the journal.
function Get-PlanBytesHash {
    param([Parameter(Mandatory=$true)][AllowEmptyCollection()][byte[]]$Bytes)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
function Get-PlanReceiptBytes {
    param(
        [Parameter(Mandatory=$true)][ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\z')][string]$AtomicUnit,
        [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}\z')][string]$MutationFingerprint,
        [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$Evidence
    )
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Evidence))
    $lines = @('', "<!-- goal-unit:$AtomicUnit -->", "Verified Mutation Fingerprint: $($MutationFingerprint.ToLowerInvariant())",
        "Evidence (UTF-8 base64): $encoded", '<!-- /goal-unit -->', '')
    return ,([Text.Encoding]::UTF8.GetBytes(($lines -join [string][char]10)))
}
function Get-PlanReceiptState {
    param(
        [Parameter(Mandatory=$true)][AllowEmptyCollection()][byte[]]$PlanBytes,
        [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}\z')][string]$BaselineFingerprint,
        [byte[]]$ReceiptBytes = @(),
        [bool]$Verified = $false
    )
    if ((Get-PlanBytesHash $PlanBytes) -ceq $BaselineFingerprint.ToLowerInvariant()) { return 'UNCHANGED' }
    if (-not $Verified -or $ReceiptBytes.Length -eq 0 -or $PlanBytes.Length -lt $ReceiptBytes.Length) { return 'CONFLICT' }
    $prefixLength = $PlanBytes.Length - $ReceiptBytes.Length
    for ($i=0; $i -lt $ReceiptBytes.Length; $i++) {
        if ($PlanBytes[$prefixLength+$i] -ne $ReceiptBytes[$i]) { return 'CONFLICT' }
    }
    $prefix = New-Object byte[] $prefixLength
    [Array]::Copy($PlanBytes, $prefix, $prefixLength)
    if ((Get-PlanBytesHash $prefix) -ceq $BaselineFingerprint.ToLowerInvariant()) { return 'APPLIED' }
    return 'CONFLICT'
}
