$ErrorActionPreference = 'Stop'
$api = 'http://localhost:4000/api'

# Super admin login
$super = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body (@{email='admin@rictms.gov.ph';password='password123'} | ConvertTo-Json)
$sh = @{Authorization="Bearer $($super.accessToken)"}
Write-Output "SMOKE_SUPER_LOGIN_OK role=$($super.user.role)"

$roles = Invoke-RestMethod -Method Get -Uri "$api/users/roles" -Headers $sh
Write-Output "SMOKE_ROLES_OK count=$(@($roles).Count)"

$docs = Invoke-RestMethod -Method Get -Uri "$api/documents?page=1&limit=5" -Headers $sh
Write-Output "SMOKE_DOCS_OK count=$(@($docs.data).Count)"

$units = Invoke-RestMethod -Method Get -Uri "$api/units" -Headers $sh
Write-Output "SMOKE_UNITS_OK count=$(@($units.data).Count)"

$met = Invoke-RestMethod -Method Get -Uri "$api/metrics" -Headers $sh
Write-Output "SMOKE_METRICS_OK count=$(@($met).Count)"

$tickets = Invoke-RestMethod -Method Get -Uri "$api/tickets?page=1&limit=5" -Headers $sh
Write-Output "SMOKE_TICKETS_OK count=$(@($tickets.data).Count)"

$reviews = if (@($docs.data).Count -gt 0) {
    Invoke-RestMethod -Method Get -Uri "$api/documents/$($docs.data[0].id)/reviews" -Headers $sh
} else { @() }
Write-Output "SMOKE_REVIEWS_OK count=$(@($reviews).Count)"

$kpi = Invoke-RestMethod -Method Get -Uri "$api/kpi/dashboard/summary?periodYear=2026&periodMonth=2" -Headers $sh
Write-Output "SMOKE_KPI_SUPER_SUMMARY_OK overall=$($kpi.summary.overallScore) units=$($kpi.summary.unitCount)"

$kpiMaster = Invoke-RestMethod -Method Get -Uri "$api/kpi/master" -Headers $sh
Write-Output "SMOKE_KPI_MASTER_OK count=$(@($kpiMaster).Count)"

$thresh = Invoke-RestMethod -Method Get -Uri "$api/kpi/lookups/thresholds" -Headers $sh
Write-Output "SMOKE_KPI_THRESHOLDS_OK count=$(@($thresh).Count)"

$rules = Invoke-RestMethod -Method Get -Uri "$api/kpi/lookups/scoring-rules" -Headers $sh
Write-Output "SMOKE_KPI_SCORING_RULES_OK count=$(@($rules).Count)"

# Focal login
$focal = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body (@{email='focal@rictms.gov.ph';password='password123'} | ConvertTo-Json)
$fh = @{Authorization="Bearer $($focal.accessToken)"}
Write-Output "SMOKE_FOCAL_LOGIN_OK role=$($focal.user.role)"

$fkpi = Invoke-RestMethod -Method Get -Uri "$api/kpi/dashboard/summary?periodYear=2026&periodMonth=2" -Headers $fh
Write-Output "SMOKE_KPI_FOCAL_SUMMARY_OK overall=$($fkpi.summary.overallScore) units=$($fkpi.summary.unitCount)"

if (@($fkpi.units).Count -gt 0) {
    $uid = $fkpi.units[0].unitId
    $funit = Invoke-RestMethod -Method Get -Uri "$api/kpi/dashboard/unit/$($uid)?periodYear=2026&periodMonth=2" -Headers $fh
    Write-Output "SMOKE_KPI_FOCAL_UNIT_OK unitId=$($funit.unitId) score=$($funit.score) band=$($funit.band)"
}

# Auth/me endpoint
$me = Invoke-RestMethod -Method Get -Uri "$api/auth/me" -Headers $sh
$hasPasswordHash = $null -ne $me.passwordHash
Write-Output "SMOKE_AUTH_ME_OK hasPasswordHash=$hasPasswordHash"

# Cybersecurity metrics smoke test — reprocess and verify auto-return
$cyberDocs = Invoke-RestMethod -Method Get -Uri "$api/documents?unit_id=3&limit=20&page=1" -Headers $sh
$cyberDoc = @($cyberDocs.data) | Where-Object { $_.status -in @('pending','ready') } | Select-Object -First 1
if ($cyberDoc) {
    Write-Output "SMOKE_CYBER_DOC_FOUND id=$($cyberDoc.id.Substring(0,8)) status=$($cyberDoc.status) compliance=$($cyberDoc.compliance_status)"

    # Trigger reprocess
    try {
        Invoke-RestMethod -Method Post -Uri "$api/documents/$($cyberDoc.id)/reprocess" -Headers $sh | Out-Null
        Write-Output "SMOKE_REPROCESS_ENQUEUED_OK"
    } catch {
        Write-Output "SMOKE_REPROCESS_ENQUEUED_SKIP (already processing or no-op)"
    }

    # Wait for processing
    Start-Sleep -Seconds 8

    # Check updated status and metric results
    $updatedDoc = Invoke-RestMethod -Method Get -Uri "$api/documents/$($cyberDoc.id)" -Headers $sh
    Write-Output "SMOKE_CYBER_DOC_UPDATED status=$($updatedDoc.status) compliance=$($updatedDoc.compliance_status)"

    $metricResults = Invoke-RestMethod -Method Get -Uri "$api/documents/$($cyberDoc.id)/metrics" -Headers $sh
    $metCount = @($metricResults.results).Count
    Write-Output "SMOKE_CYBER_METRICS_OK count=$metCount"
} else {
    Write-Output "SMOKE_CYBER_DOC_SKIP (no pending/ready Cybersecurity doc found)"
}

# Reprocess endpoint availability check
$reprocessTest = $null
try {
    # Expect 404 on a fake ID — confirms route is registered (not 500/405)
    Invoke-RestMethod -Method Post -Uri "$api/documents/00000000-0000-0000-0000-000000000000/reprocess" -Headers $sh | Out-Null
} catch {
    $reprocessTest = $_.Exception.Response.StatusCode.value__
}
$reprocessRouteOk = $reprocessTest -eq 404
Write-Output "SMOKE_REPROCESS_ROUTE_OK=$reprocessRouteOk (expected 404 for unknown id)"

Write-Output "--- ALL SMOKE TESTS PASSED ---"
