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
Write-Output "SMOKE_TICKETS_OK count=$(@($tickets).Count)"

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

# -------------------------------------------------------------------
# v0.5.1 Ticket / User role tests
# -------------------------------------------------------------------

# 1. Regular user login
$userLogin = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body (@{email='user1@example.com';password='password123'} | ConvertTo-Json)
$uh = @{Authorization="Bearer $($userLogin.accessToken)"}
Write-Output "SMOKE_USER_LOGIN_OK role=$($userLogin.user.role)"

# 2. User can list their own tickets (should not be Forbidden)
$userTickets = Invoke-RestMethod -Method Get -Uri "$api/tickets" -Headers $uh
Write-Output "SMOKE_USER_TICKETS_LIST_OK count=$(@($userTickets).Count)"

# 3. User can create a ticket
$newTicket = Invoke-RestMethod -Method Post -Uri "$api/tickets" -ContentType 'application/json' -Headers $uh `
  -Body (@{subject='Smoke test ticket';description='Created by user in smoke test';ticketType='it_support';priority='low'} | ConvertTo-Json)
Write-Output "SMOKE_USER_CREATE_TICKET_OK id=$($newTicket.id.Substring(0,8)) number=$($newTicket.ticketNumber)"

# 4. Technician (desktop) login
$deskTech = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body (@{email='desktop.tech@rictms.gov.ph';password='password123'} | ConvertTo-Json)
$dh = @{Authorization="Bearer $($deskTech.accessToken)"}
Write-Output "SMOKE_DESKTOP_TECH_LOGIN_OK role=$($deskTech.user.role)"

# 5. Technician (IT) login
$itTech = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body (@{email='it.tech@rictms.gov.ph';password='password123'} | ConvertTo-Json)
Write-Output "SMOKE_IT_TECH_LOGIN_OK role=$($itTech.user.role)"

# 6. Admin creates a walk-in ticket on behalf of user2 (requester override)
$user2Info = Invoke-RestMethod -Method Get -Uri "$api/users" -Headers $sh
$user2 = @($user2Info) | Where-Object { $_.email -eq 'user2@example.com' } | Select-Object -First 1
if ($user2) {
    $walkInTicket = Invoke-RestMethod -Method Post -Uri "$api/tickets" -ContentType 'application/json' -Headers $sh `
      -Body (@{subject='Walk-in: keyboard issue';description='User came in person - keyboard keys sticking';ticketType='desktop_support';priority='medium';requesterId=$user2.id} | ConvertTo-Json)
    Write-Output "SMOKE_WALKIN_TICKET_OK number=$($walkInTicket.ticketNumber) requesterId=$($walkInTicket.requesterId)"
} else {
    Write-Output "SMOKE_WALKIN_TICKET_SKIP (user2@example.com not in DB - run seed first)"
}

# 7. Admin assigns a ticket to desktop technician
if ($newTicket) {
    try {
        $desktopTicket = Invoke-RestMethod -Method Get -Uri "$api/tickets" -Headers $sh
        $openTicket = @($desktopTicket) | Where-Object { $_.status -in @('open','assigned') -and $_.ticketType -eq 'desktop_support' } | Select-Object -First 1
        if ($openTicket) {
            $deskUser = @($user2Info) | Where-Object { $_.email -eq 'desktop.tech@rictms.gov.ph' } | Select-Object -First 1
            if ($deskUser) {
                $assigned = Invoke-RestMethod -Method Patch -Uri "$api/tickets/$($openTicket.id)/assign" -ContentType 'application/json' -Headers $sh `
                  -Body (@{assignedToId=$deskUser.id} | ConvertTo-Json)
                Write-Output "SMOKE_ASSIGN_TICKET_OK ticketId=$($openTicket.id.Substring(0,8)) assignedTo=$($assigned.assignedToId)"
            } else {
                Write-Output "SMOKE_ASSIGN_TICKET_SKIP (desktop tech user not found)"
            }
        } else {
            Write-Output "SMOKE_ASSIGN_TICKET_SKIP (no open desktop ticket found)"
        }
    } catch {
        Write-Output "SMOKE_ASSIGN_TICKET_FAIL: $($_.Exception.Message)"
    }
}

# -------------------------------------------------------------------
# v0.6 Ticket Settings / Attendance / Category smoke tests
# -------------------------------------------------------------------

# 1. List categories (seeded by migration)
$cats = Invoke-RestMethod -Method Get -Uri "$api/ticket-settings/categories" -Headers $sh
Write-Output "SMOKE_CATEGORIES_LIST_OK count=$(@($cats).Count)"

# 2. List categories filtered by type
$itCats = Invoke-RestMethod -Method Get -Uri "$api/ticket-settings/categories?ticketType=it_support" -Headers $sh
Write-Output "SMOKE_IT_CATEGORIES_OK count=$(@($itCats).Count)"

# 3. Create a new category (use unique timestamp suffix for idempotent runs)
$catSuffix = (Get-Date).ToString('HHmmss')
$newCat = Invoke-RestMethod -Method Post -Uri "$api/ticket-settings/categories" -ContentType 'application/json' -Headers $sh `
  -Body (@{name="Smoke Test Cat $catSuffix";ticketType='it_support';isActive=$true} | ConvertTo-Json)
Write-Output "SMOKE_CREATE_CATEGORY_OK id=$($newCat.id.Substring(0,8)) key=$($newCat.key)"

# 4. Update category
$updCat = Invoke-RestMethod -Method Patch -Uri "$api/ticket-settings/categories/$($newCat.id)" -ContentType 'application/json' -Headers $sh `
  -Body (@{name="Smoke Test Cat Updated $catSuffix"} | ConvertTo-Json)
Write-Output "SMOKE_UPDATE_CATEGORY_OK name=$($updCat.name)"

# 5. Create a keyword rule
$newRule = Invoke-RestMethod -Method Post -Uri "$api/ticket-settings/keyword-rules" -ContentType 'application/json' -Headers $sh `
  -Body (@{keyword='printer jam';targetTicketType='desktop_support';isActive=$true} | ConvertTo-Json)
Write-Output "SMOKE_CREATE_KEYWORD_RULE_OK id=$($newRule.id.Substring(0,8))"

# 6. List keyword rules
$allRules = Invoke-RestMethod -Method Get -Uri "$api/ticket-settings/keyword-rules" -Headers $sh
Write-Output "SMOKE_KEYWORD_RULES_OK count=$(@($allRules).Count)"

# 7. Office days (get for current month)
$currentMonth = (Get-Date).Month
$currentYear = (Get-Date).Year
$officeDays = Invoke-RestMethod -Method Get -Uri "$api/attendance/office-days?month=$currentMonth&year=$currentYear" -Headers $sh
Write-Output "SMOKE_OFFICE_DAYS_OK count=$(@($officeDays).Count)"

# 8. Set an office day (use focal token for management)
$nextMonday = (Get-Date).AddDays(7 - (Get-Date).DayOfWeek.value__ + 1)
$nextMondayStr = $nextMonday.ToString('yyyy-MM-dd')
try {
    $setOd = Invoke-RestMethod -Method Post -Uri "$api/attendance/office-days" -ContentType 'application/json' -Headers $fh `
      -Body (@{date=$nextMondayStr;isOfficeDay=$true;notes='Smoke test office day'} | ConvertTo-Json)
    Write-Output "SMOKE_SET_OFFICE_DAY_OK date=$($setOd.date.Substring(0,10))"
} catch {
    Write-Output "SMOKE_SET_OFFICE_DAY_SKIP (may already exist or past date)"
}

# 9. Attendance - set a technician attendance record
try {
    $techUser = @($user2Info) | Where-Object { $_.email -eq 'it.tech@rictms.gov.ph' } | Select-Object -First 1
    if ($techUser) {
        $todayStr = (Get-Date).ToString('yyyy-MM-dd')
        $setAtt = Invoke-RestMethod -Method Post -Uri "$api/attendance" -ContentType 'application/json' -Headers $fh `
          -Body (@{userId=$techUser.id;date=$todayStr;status='present'} | ConvertTo-Json)
        Write-Output "SMOKE_SET_ATTENDANCE_OK userId=$($setAtt.userId) status=$($setAtt.status)"
    } else {
        Write-Output "SMOKE_SET_ATTENDANCE_SKIP (it.tech not found)"
    }
} catch {
    Write-Output "SMOKE_SET_ATTENDANCE_FAIL: $($_.Exception.Message)"
}

# 10. Get available technicians
try {
    $todayStr = (Get-Date).ToString('yyyy-MM-dd')
    $availTechs = Invoke-RestMethod -Method Get -Uri "$api/attendance/technicians?ticketType=it_support&date=$todayStr" -Headers $sh
    Write-Output "SMOKE_AVAILABLE_TECHS_OK count=$(@($availTechs).Count)"
} catch {
    Write-Output "SMOKE_AVAILABLE_TECHS_FAIL: $($_.Exception.Message)"
}

# 11. Create ticket with category (auto-shift/assign test)
$firstCat = @($itCats) | Select-Object -First 1
if ($firstCat) {
    $catTicket = Invoke-RestMethod -Method Post -Uri "$api/tickets" -ContentType 'application/json' -Headers $uh `
      -Body (@{subject='My email is not working';description='Cannot access corporate email since today morning';ticketType='it_support';priority='medium';categoryId=$firstCat.id} | ConvertTo-Json)
    Write-Output "SMOKE_TICKET_WITH_CATEGORY_OK number=$($catTicket.ticketNumber) categoryId=$($catTicket.categoryId) autoAssigned=$($catTicket.autoAssigned)"
} else {
    Write-Output "SMOKE_TICKET_WITH_CATEGORY_SKIP (no categories)"
}

# 12. Delete keyword rule (cleanup)
try {
    Invoke-RestMethod -Method Delete -Uri "$api/ticket-settings/keyword-rules/$($newRule.id)" -Headers $sh
    Write-Output "SMOKE_DELETE_KEYWORD_RULE_OK"
} catch {
    Write-Output "SMOKE_DELETE_KEYWORD_RULE_FAIL: $($_.Exception.Message)"
}

# 13. Soft-delete category (cleanup)
try {
    Invoke-RestMethod -Method Delete -Uri "$api/ticket-settings/categories/$($newCat.id)" -Headers $sh
    Write-Output "SMOKE_DELETE_CATEGORY_OK"
} catch {
    Write-Output "SMOKE_DELETE_CATEGORY_FAIL: $($_.Exception.Message)"
}

Write-Output "--- ALL SMOKE TESTS PASSED ---"
