param(
  [Parameter(Mandatory=$true)][string]$Xlsx,
  [Parameter(Mandatory=$true)][string]$SheetFile,
  [string]$OutPath,
  [int]$Top = 25
)

Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Xlsx)
$entry = $zip.GetEntry($SheetFile)
$sr = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)

$rows = New-Object System.Collections.Generic.List[object]
$buf = ''
$chunk = New-Object char[] 1048576
$curRow = -1
$cCount = 0
$fCount = 0
$totalRows = 0

function CommitRow() {
  if ($script:curRow -ge 0 -and $script:cCount -gt 0) {
    $script:rows.Add([pscustomobject]@{ Row = $script:curRow; Cells = $script:cCount; Formulas = $script:fCount })
    $script:totalRows++
  }
}

function ProcessSegment([string]$seg) {
  # seg starts right after a '<row ' marker OR is a continuation of current row
  $script:cCount += ([regex]::Matches($seg, '<c ')).Count
  $script:fCount += ([regex]::Matches($seg, '<f')).Count
}

while ($true) {
  $n = $sr.Read($chunk, 0, $chunk.Length)
  if ($n -le 0) { break }
  $buf += (New-Object string($chunk, 0, $n))

  while ($true) {
    $idx = $buf.IndexOf('<row ')
    if ($idx -lt 0) { break }
    # everything before this marker belongs to the current row
    if ($idx -gt 0) { ProcessSegment $buf.Substring(0, $idx) }
    CommitRow
    # need the row tag fully available to read r="N"
    $close = $buf.IndexOf('>', $idx)
    if ($close -lt 0) { $buf = $buf.Substring($idx); break }
    $tag = $buf.Substring($idx, $close - $idx + 1)
    if ($tag -match '\sr="([0-9]+)"') { $curRow = [int]$Matches[1] } else { $curRow = -1 }
    $cCount = 0; $fCount = 0
    $buf = $buf.Substring($close + 1)
  }

  # keep a small tail in case a '<row ' marker straddles the chunk boundary
  if ($buf.Length -gt 4096) {
    $keep = 8
    ProcessSegment $buf.Substring(0, $buf.Length - $keep)
    $buf = $buf.Substring($buf.Length - $keep)
  }
}
ProcessSegment $buf
CommitRow
$sr.Close(); $zip.Dispose()

$out = New-Object System.Text.StringBuilder
[void]$out.AppendLine("Sheet: $SheetFile")
[void]$out.AppendLine("Tong so dong co du lieu: $totalRows")
$maxF = ($rows | Measure-Object -Property Formulas -Maximum).Maximum
$maxC = ($rows | Measure-Object -Property Cells -Maximum).Maximum
[void]$out.AppendLine("Max so o/dong: $maxC   Max so cong thuc/dong: $maxF")
[void]$out.AppendLine("")
[void]$out.AppendLine("=== TOP $Top theo SO CONG THUC ===")
[void]$out.AppendLine(("{0,-9} {1,-8} {2}" -f 'Dong','SoO','SoCongThuc'))
$rows | Sort-Object -Property @{Expression='Formulas';Descending=$true}, @{Expression='Cells';Descending=$true} | Select-Object -First $Top | ForEach-Object {
  [void]$out.AppendLine(("{0,-9} {1,-8} {2}" -f $_.Row, $_.Cells, $_.Formulas))
}
[void]$out.AppendLine("")
[void]$out.AppendLine("=== TOP $Top theo SO O (nhieu du lieu nhat) ===")
[void]$out.AppendLine(("{0,-9} {1,-8} {2}" -f 'Dong','SoO','SoCongThuc'))
$rows | Sort-Object -Property @{Expression='Cells';Descending=$true}, @{Expression='Formulas';Descending=$true} | Select-Object -First $Top | ForEach-Object {
  [void]$out.AppendLine(("{0,-9} {1,-8} {2}" -f $_.Row, $_.Cells, $_.Formulas))
}
[void]$out.AppendLine("")
[void]$out.AppendLine("=== PHAN BO so cong thuc/dong ===")
$rows | Group-Object Formulas | Sort-Object { -$_.Count } | Select-Object -First 12 | ForEach-Object {
  [void]$out.AppendLine(("SoCongThuc={0,-6} co {1} dong" -f $_.Name, $_.Count))
}

if ($OutPath) {
  [System.IO.File]::WriteAllText($OutPath, $out.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output "WROTE $OutPath"
} else { Write-Output $out.ToString() }
