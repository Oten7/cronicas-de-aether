$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectDir '.dev.vars'
if ((Test-Path -LiteralPath $target) -and ((Get-Item -LiteralPath $target).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'O arquivo de configuração não pode ser um link.'
}
$secureKey = Read-Host 'Cole sua chave Gemini (o valor ficará oculto)' -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $keyValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    if ($keyValue -notmatch '^[A-Za-z0-9._-]{20,200}$') { throw 'Formato de chave inválido; arquivo preservado.' }
    $existing = if (Test-Path -LiteralPath $target) { [IO.File]::ReadAllText($target) } else { '' }
    $entries = @{ GEMINI_API_KEY = $keyValue; GEMINI_MODEL = 'gemini-3.5-flash-lite'; AI_PROVIDER = 'gemini' }
    foreach ($entry in $entries.GetEnumerator()) {
        $pattern = '(?m)^' + [regex]::Escape($entry.Key) + '=.*$'
        $line = $entry.Key + '=' + $entry.Value
        if ([regex]::IsMatch($existing, $pattern)) { $existing = [regex]::Replace($existing, $pattern, $line) }
        else { $existing = $existing.TrimEnd() + "`n" + $line + "`n" }
    }
    $temporary = Join-Path $projectDir ('.dev.vars.' + [guid]::NewGuid().ToString('N') + '.tmp')
    [IO.File]::WriteAllText($temporary, $existing, [Text.UTF8Encoding]::new($false))
    [IO.File]::Move($temporary, $target, $true)
    Write-Host 'Gemini configurado em .dev.vars. A chave não foi exibida.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    $keyValue = $null
    $existing = $null
    $entries = $null
    $secureKey.Dispose()
}
