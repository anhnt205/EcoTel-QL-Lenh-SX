param(
  [string]$XmlPath,
  [string]$OutPath
)

$W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

$xml = New-Object System.Xml.XmlDocument
$xml.PreserveWhitespace = $true
$xml.Load($XmlPath)

$sb = New-Object System.Text.StringBuilder

function Get-ParaText($p) {
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($n in $p.SelectNodes('.//*')) {
    if ($n.NamespaceURI -eq $W) {
      switch ($n.LocalName) {
        't'    { $parts.Add($n.InnerText) }
        'tab'  { $parts.Add("`t") }
        'br'   { $parts.Add(' / ') }
        'drawing' { $parts.Add('[HINH ANH]') }
        'pict'    { $parts.Add('[HINH ANH]') }
      }
    }
  }
  return ($parts -join '')
}

function Get-Style($p) {
  $ps = $p.SelectSingleNode('*[local-name()="pPr"]/*[local-name()="pStyle"]')
  if ($ps) { return $ps.GetAttribute('val', $W) }
  return ''
}

function Walk($node) {
  foreach ($child in $node.ChildNodes) {
    if ($child.NamespaceURI -ne $W) { continue }
    switch ($child.LocalName) {
      'p' {
        $txt = (Get-ParaText $child)
        $style = (Get-Style $child)
        if ($txt.Trim().Length -gt 0 -or $style -ne '') {
          if ($style -match 'Heading(\d)') {
            $lvl = [int]$Matches[1]
            [void]$sb.AppendLine('')
            [void]$sb.AppendLine(('#' * ($lvl + 1)) + ' ' + $txt.Trim())
          } elseif ($txt.Trim().Length -gt 0) {
            [void]$sb.AppendLine($txt)
          }
        }
      }
      'tbl' {
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('<<TABLE>>')
        foreach ($tr in $child.ChildNodes) {
          if ($tr.LocalName -ne 'tr') { continue }
          $cells = New-Object System.Collections.Generic.List[string]
          foreach ($tc in $tr.ChildNodes) {
            if ($tc.LocalName -ne 'tc') { continue }
            $cellParts = New-Object System.Collections.Generic.List[string]
            foreach ($cp in $tc.SelectNodes('*[local-name()="p"]')) {
              $t = (Get-ParaText $cp).Trim()
              if ($t.Length -gt 0) { $cellParts.Add($t) }
            }
            $cells.Add(($cellParts -join ' ~ '))
          }
          [void]$sb.AppendLine('| ' + ($cells -join ' | ') + ' |')
        }
        [void]$sb.AppendLine('<</TABLE>>')
        [void]$sb.AppendLine('')
      }
      'sdt' {
        $content = $child.SelectSingleNode('*[local-name()="sdtContent"]')
        if ($content) { Walk $content }
      }
      default {
        if ($child.HasChildNodes) { Walk $child }
      }
    }
  }
}

$body = $xml.DocumentElement.SelectSingleNode('*[local-name()="body"]')
Walk $body

[System.IO.File]::WriteAllText($OutPath, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("WROTE " + $OutPath + " chars=" + $sb.Length)
