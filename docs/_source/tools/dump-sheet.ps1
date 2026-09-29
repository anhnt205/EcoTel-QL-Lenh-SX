param([string]$Sheet,[string]$Out,[int]$Max=100000)
$x='D:\EcoTel\3. Dự án\TKV Công ty than Cao sơn\Phần mềm thống kê\Dữ liệu\Tháng 5 đổi tên xe.xlsx'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z=[System.IO.Compression.ZipFile]::OpenRead($x)
function ReadEntry($n){ $r=New-Object System.IO.StreamReader($z.GetEntry($n).Open(),[Text.Encoding]::UTF8); $t=$r.ReadToEnd(); $r.Close(); $t }
$ss=New-Object 'System.Collections.Generic.List[string]'
$ssd=New-Object System.Xml.XmlDocument; $ssd.LoadXml((ReadEntry 'xl/sharedStrings.xml'))
foreach($si in $ssd.DocumentElement.ChildNodes){ [void]$ss.Add($si.InnerText) }
$d=New-Object System.Xml.XmlDocument; $d.LoadXml((ReadEntry "xl/worksheets/$Sheet.xml"))
$ns=New-Object System.Xml.XmlNamespaceManager($d.NameTable); $ns.AddNamespace('m','http://schemas.openxmlformats.org/spreadsheetml/2006/main')
$sb=New-Object System.Text.StringBuilder
foreach($row in $d.SelectNodes('//m:sheetData/m:row',$ns)){
  $rn=[int]$row.r; if($rn -gt $Max){break}
  foreach($c in $row.SelectNodes('m:c',$ns)){
    $v=$c.SelectSingleNode('m:v',$ns); if(-not $v){continue}
    $val=$v.InnerText; if($c.t -eq 's'){ $val=$ss[[int]$val] }
    [void]$sb.Append(("{0}`t{1}`t{2}`n" -f $rn,($c.r -replace '\d',''),($val -replace "[`t`r`n]",' ')))
  }
}
$z.Dispose()
[IO.File]::WriteAllText($Out,$sb.ToString(),(New-Object Text.UTF8Encoding($false)))
