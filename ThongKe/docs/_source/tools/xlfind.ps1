param(
  [Parameter(Mandatory=$true)][string]$Xlsx,
  [Parameter(Mandatory=$true)][string]$SheetFile,
  [Parameter(Mandatory=$true)][string]$Needle,
  [int]$Before = 0,
  [int]$After = 400,
  [int]$MaxHits = 3
)
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead($Xlsx)
$sr = New-Object System.IO.StreamReader($zip.GetEntry($SheetFile).Open(), [System.Text.Encoding]::UTF8)
$buf = ''
$chunk = New-Object char[] 1048576
$hits = 0
while ($hits -lt $MaxHits) {
  $n = $sr.Read($chunk, 0, $chunk.Length)
  if ($n -le 0) { break }
  $buf += (New-Object string($chunk, 0, $n))
  while ($true) {
    $i = $buf.IndexOf($Needle)
    if ($i -lt 0) { break }
    $start = [Math]::Max(0, $i - $Before)
    $len = [Math]::Min($buf.Length - $start, $Before + $Needle.Length + $After)
    if ($start + $len -gt $buf.Length -and $n -gt 0) { break }   # wait for more data
    Write-Output ("HIT: " + $buf.Substring($start, $len))
    Write-Output "-----"
    $hits++
    $buf = $buf.Substring($i + $Needle.Length)
    if ($hits -ge $MaxHits) { break }
  }
  if ($buf.Length -gt 2000000) { $buf = $buf.Substring($buf.Length - 4096) }
}
$sr.Close(); $zip.Dispose()
Write-Output "hits=$hits"
