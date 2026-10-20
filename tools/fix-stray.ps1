$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$files = @('assets\data\reviews.js','assets\data\catalog.js')
foreach ($f in $files) {
  $c = Get-Content $f -Raw -Encoding UTF8
  # Strip any CJK ideograph run (stray characters from generation)
  $c = [regex]::Replace($c, '[\u4e00-\u9fff]+', ' ')
  # Tidy artefacts left behind
  $c = $c -replace '\.\s*,\s*', '. '
  $c = $c -replace "'\s+'", "'"
  Set-Content -Path $f -Value $c -Encoding UTF8 -NoNewline
}

Write-Output 'Stray characters removed.'
