param([string]$OutputDirectory = (Join-Path $PSScriptRoot '../outputs/windows'))
$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) {
    $compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe'
}
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Instale o .NET Framework 4.8 para compilar.' }
$output = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $output | Out-Null
Add-Type -AssemblyName System.Drawing
$bitmap = [Drawing.Bitmap]::new(64, 64)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([Drawing.Color]::FromArgb(19, 31, 29))
$pen = [Drawing.Pen]::new([Drawing.Color]::FromArgb(217, 181, 112), 3)
$points = [Drawing.PointF[]]@([Drawing.PointF]::new(32,5),[Drawing.PointF]::new(57,20),[Drawing.PointF]::new(57,45),[Drawing.PointF]::new(32,59),[Drawing.PointF]::new(7,45),[Drawing.PointF]::new(7,20))
$graphics.DrawPolygon($pen, $points)
$graphics.DrawLine($pen, 7,20,57,20)
$graphics.DrawLine($pen, 7,20,32,59)
$graphics.DrawLine($pen, 57,20,32,59)
$font = [Drawing.Font]::new('Georgia', 16, [Drawing.FontStyle]::Bold)
$brush = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(244,229,196))
$graphics.DrawString('A', $font, $brush, 21,23)
$icon = [Drawing.Icon]::FromHandle($bitmap.GetHicon())
$iconPath = Join-Path $output 'aether.ico'
$stream = [IO.File]::Create($iconPath)
try { $icon.Save($stream) } finally { $stream.Dispose(); $icon.Dispose(); $brush.Dispose(); $font.Dispose(); $pen.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
$exe = Join-Path $output 'Cronicas de Aether.exe'
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ "/out:$exe" "/win32icon:$iconPath" "/win32manifest:$(Join-Path $PSScriptRoot 'app.manifest')" /reference:System.Windows.Forms.dll (Join-Path $PSScriptRoot 'Program.cs')
if ($LASTEXITCODE -ne 0) { throw 'A compilação falhou.' }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'LEIA-ME.txt') -Destination $output -Force
$hash = (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $output 'SHA256.txt'), "$hash  Cronicas de Aether.exe`r`n")
Compress-Archive -LiteralPath $exe,(Join-Path $output 'LEIA-ME.txt'),(Join-Path $output 'SHA256.txt') -DestinationPath (Join-Path $output 'Cronicas-de-Aether-Windows.zip') -Force
Write-Output "Executável: $exe"
Write-Output "SHA256: $hash"
