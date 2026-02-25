Set-Location "c:\Users\mjdibay\source\repos\Compliance Hub"

$sampleRoot = Join-Path $PWD "smoke-artifacts\docx-src"
$sampleFile = Join-Path $PWD "smoke-artifacts\sample-upload.docx"
$zipPath = Join-Path $PWD "smoke-artifacts\sample-upload.zip"

New-Item -ItemType Directory -Force -Path $sampleRoot, (Join-Path $sampleRoot "_rels"), (Join-Path $sampleRoot "word") | Out-Null

$ctXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
'@
$relsXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@
$docXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Compliance Hub smoke DOCX sample for blob conversion.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Iteration upload validation content.</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>
'@

$contentTypesPath = Join-Path $sampleRoot "[Content_Types].xml"
$ctXml | Out-File -LiteralPath $contentTypesPath -Encoding utf8 -Force
$relsXml | Out-File -FilePath (Join-Path $sampleRoot "_rels\.rels") -Encoding utf8 -Force
$docXml | Out-File -FilePath (Join-Path $sampleRoot "word\document.xml") -Encoding utf8 -Force

if (Test-Path $sampleFile) { Remove-Item $sampleFile -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $sampleRoot "*") -DestinationPath $zipPath -Force
Move-Item -Path $zipPath -Destination $sampleFile -Force

$api = "http://localhost:4100/api"
$creds = @(
  @{ email = 'admin@rictms.edu.ph'; password = 'password123' },
  @{ email = 'admin@rictms.gov.ph'; password = 'Admin123!' },
  @{ email = 'admin@rictms.gov.ph'; password = 'password123' }
)

$token = $null
foreach ($c in $creds) {
  try {
    $resp = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body ($c | ConvertTo-Json)
    if ($resp.accessToken) { $token = $resp.accessToken; break }
  } catch {}
}
if (-not $token) { throw 'Login failed for all known credentials' }

$headers = @{ Authorization = "Bearer $token" }
$units = Invoke-RestMethod -Method Get -Uri "$api/units" -Headers $headers
$unitId = @($units)[0].id
if (-not $unitId) { throw 'No unit found for upload smoke test' }

$results = @()
for ($i = 1; $i -le 5; $i++) {
  $stamp = Get-Date -Format 'yyyyMMddHHmmssfff'
  $title = "Smoke Blob Upload $i $stamp"
  $period = "Q$i"

  $uploadJson = curl.exe -s -X POST "$api/documents" -H "Authorization: Bearer $token" -F "title=$title" -F "document_type=SmokeReport" -F "period=$period" -F "year=2026" -F "unit_id=$unitId" -F "file=@$sampleFile;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  $upload = $uploadJson | ConvertFrom-Json

  if (-not $upload.id) {
    $results += [pscustomobject]@{
      iteration = $i
      documentId = $null
      versionId = $null
      finalStatus = 'upload_failed'
      downloadType = $null
      downloadLength = 0
      previewOk = $false
      previewStatus = -1
      previewType = $null
      previewLength = 0
      uploadError = $uploadJson
    }
    continue
  }

  $docId = $upload.id
  $status = 'pending'

  for ($p = 1; $p -le 20; $p++) {
    Start-Sleep -Milliseconds 800
    try {
      $doc = Invoke-RestMethod -Method Get -Uri "$api/documents/$docId" -Headers $headers
      $status = $doc.status
      if ($status -eq 'ready' -or $status -eq 'failed') { break }
    } catch {}
  }

  $versions = Invoke-RestMethod -Method Get -Uri "$api/documents/$docId/versions" -Headers $headers
  $versionId = @($versions)[0].id

  $download = Invoke-WebRequest -Method Get -Uri "$api/documents/$docId/versions/$versionId/download" -Headers $headers

  $previewOk = $true
  $previewStatus = 200
  $previewType = ''
  $previewLength = 0
  try {
    $preview = Invoke-WebRequest -Method Get -Uri "$api/documents/$docId/versions/$versionId/preview" -Headers $headers
    $previewType = $preview.Headers['Content-Type']
    $previewLength = [int]$preview.Headers['Content-Length']
  } catch {
    $previewOk = $false
    if ($_.Exception.Response) {
      $previewStatus = [int]$_.Exception.Response.StatusCode
    } else {
      $previewStatus = -1
    }
  }

  $results += [pscustomobject]@{
    iteration = $i
    documentId = $docId
    versionId = $versionId
    finalStatus = $status
    downloadType = $download.Headers['Content-Type']
    downloadLength = [int]$download.Headers['Content-Length']
    previewOk = $previewOk
    previewStatus = $previewStatus
    previewType = $previewType
    previewLength = $previewLength
    uploadError = $null
  }
}

$resultsPath = Join-Path $PWD 'smoke-artifacts\blob-smoke-results.json'
$results | ConvertTo-Json -Depth 5 | Out-File -FilePath $resultsPath -Encoding utf8 -Force
$results | Format-Table -AutoSize | Out-String -Width 220
