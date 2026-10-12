param(
  [Parameter(Mandatory=$true)][string]$Xlsx,
  [Parameter(Mandatory=$true)][string]$SheetFile,
  [string]$Mode = 'profile',        # profile | row
  [int]$EndRow = 2000,
  [int]$Row = 5,
  [int]$TopN = 10,
  [string]$OutPath = ''
)

Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Xlsx)

# ---- shared strings (de giai ma o co t="s")
$shared = New-Object System.Collections.Generic.List[string]
$ssEntry = $zip.GetEntry('xl/sharedStrings.xml')
if ($ssEntry) {
  $ssr = New-Object System.IO.StreamReader($ssEntry.Open(), [System.Text.Encoding]::UTF8)
  $ssTxt = $ssr.ReadToEnd(); $ssr.Close()
  foreach ($m in [regex]::Matches($ssTxt, '<si>(.*?)</si>', 'Singleline')) {
    $sb2 = New-Object System.Text.StringBuilder
    foreach ($t in [regex]::Matches($m.Groups[1].Value, '<t[^>]*>(.*?)</t>', 'Singleline')) {
      [void]$sb2.Append($t.Groups[1].Value)
    }
    [void]$shared.Add([System.Net.WebUtility]::HtmlDecode($sb2.ToString()))
  }
}

$entry = $zip.GetEntry($SheetFile)
$reader = [System.Xml.XmlReader]::Create($entry.Open())

$sigs = @{}
$curRow = -1
$cols = New-Object System.Collections.Generic.List[string]
$rowCells = New-Object System.Collections.Generic.List[string]
$maxRowSeen = 0

function FlushSig() {
  if ($curRow -lt 0 -or $cols.Count -eq 0) { return }
  $sig = ($cols -join ',')
  if ($sigs.ContainsKey($sig)) {
    $e = $sigs[$sig]; $e[0]++; $e[2] = $curRow
  } else {
    $sigs[$sig] = [System.Collections.ArrayList]@(1, $curRow, $curRow, $cols.Count)
  }
}

$advance = $true
while ($true) {
  if ($advance) { if (-not $reader.Read()) { break } } else { $advance = $true }
  if ($reader.NodeType -ne 'Element' -or $reader.Name -ne 'c') { continue }

  $xml = $reader.ReadOuterXml()      # advances correctly past </c>
  $advance = $false
  if (-not $xml) { continue }

  if ($xml -notmatch '\sr="([A-Z]+)([0-9]+)"') { continue }
  $col = $Matches[1]; $rw = [int]$Matches[2]
  if ($rw -gt $maxRowSeen) { $maxRowSeen = $rw }

  $f = $null
  if ($xml -match '<f[^>]*>(.*?)</f>') { $f = $Matches[1] }

  if ($Mode -eq 'profile') {
    if ($rw -gt $EndRow) { break }
    if ($rw -ne $curRow) { FlushSig; $cols.Clear(); $curRow = $rw }
    if ($f) { [void]$cols.Add($col) }
  } else {
    if ($rw -gt $Row) { break }
    if ($rw -eq $Row) {
      $v = $null
      if ($xml -match '<v[^>]*>(.*?)</v>') { $v = $Matches[1] }
      if ($v -ne $null -and $xml -match '\st="s"' -and $v -match '^[0-9]+$') {
        $ix = [int]$v
        if ($ix -lt $shared.Count) { $v = $shared[$ix] }
      }
      if ($f) { [void]$rowCells.Add("$col$rw = $f") }
      elseif ($v) { [void]$rowCells.Add("$col$rw : $v") }
    }
  }
}
if ($Mode -eq 'profile') { FlushSig }
$reader.Close(); $zip.Dispose()

$out = New-Object System.Text.StringBuilder
if ($Mode -eq 'profile') {
  [void]$out.AppendLine("Da quet toi dong $maxRowSeen. So layout khac nhau: $($sigs.Count)")
  [void]$out.AppendLine("")
  [void]$out.AppendLine(("{0,-8} {1,-7} {2,-9} {3,-9}  {4}" -f 'SoDong','SoCot','DongDau','DongCuoi','MauCot'))
  $sigs.GetEnumerator() | Sort-Object { -$_.Value[0] } | Select-Object -First $TopN | ForEach-Object {
    $v = $_.Value
    $short = $_.Key
    if ($short.Length -gt 260) { $short = $short.Substring(0,260) + '...' }
    [void]$out.AppendLine(("{0,-8} {1,-7} {2,-9} {3,-9}  {4}" -f $v[0], $v[3], $v[1], $v[2], $short))
  }
  [void]$out.AppendLine("")
  [void]$out.AppendLine("=== TOP theo SO COT CO CONG THUC (du cong thuc nhat) ===")
  $sigs.GetEnumerator() | Sort-Object { -$_.Value[3] } | Select-Object -First 6 | ForEach-Object {
    $v = $_.Value
    [void]$out.AppendLine(("SoCot={0,-6} SoDong={1,-6} DongDau={2,-8} DongCuoi={3}" -f $v[3], $v[0], $v[1], $v[2]))
  }
} else {
  [void]$out.AppendLine("### DONG $Row cua $SheetFile - $($rowCells.Count) o")
  foreach ($c in $rowCells) { [void]$out.AppendLine($c) }
}

if ($OutPath -ne '') {
  [System.IO.File]::WriteAllText($OutPath, $out.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output "WROTE $OutPath chars=$($out.Length)"
} else {
  Write-Output $out.ToString()
}
