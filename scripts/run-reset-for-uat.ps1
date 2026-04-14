#!/usr/bin/env pwsh
# ============================================================
# run-reset-for-uat.ps1
# Compliance Hub — Reset users, tickets, and custom roles for UAT
#
# Usage:
#   .\run-reset-for-uat.ps1
#
# Reads DB credentials from backend\.env automatically.
# Requires mysql.exe on PATH (MariaDB / MySQL client).
# ============================================================

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot | Split-Path   # scripts\ → repo root

# ── Load .env ────────────────────────────────────────────────────────────────
$envFile = Join-Path $repoRoot 'backend\.env'
if (-not (Test-Path $envFile)) { Write-Error ".env not found at $envFile"; exit 1 }

$env = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^([A-Z_]+)=(.*)$') {
        $env[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
    }
}

$host_    = $env['DB_HOST']     ?? 'localhost'
$port     = $env['DB_PORT']     ?? '3306'
$user     = $env['DB_USERNAME'] ?? 'root'
$password = $env['DB_PASSWORD'] ?? ''
$database = $env['DB_DATABASE'] ?? 'compliance_hub'

$sqlFile = Join-Path $PSScriptRoot 'reset-for-uat.sql'

Write-Host ""
Write-Host "======================================================"
Write-Host "  Compliance Hub — UAT Reset Script"
Write-Host "======================================================"
Write-Host "  Database : $database @ $host_`:$port"
Write-Host "  SQL file : $sqlFile"
Write-Host ""
Write-Host "  This will PERMANENTLY DELETE:"
Write-Host "    - All tickets and comments"
Write-Host "    - All users except super_admin"
Write-Host "    - All custom (non-system) role definitions"
Write-Host "    - All attendance records"
Write-Host ""
$confirm = Read-Host "  Type YES to continue"
if ($confirm -ne 'YES') { Write-Host "Aborted."; exit 0 }

Write-Host ""
Write-Host "Running reset…"

# Pipe the SQL file into mysql via stdin
$mysqlArgs = "-h$host_ -P$port -u$user"
if ($password -ne '') { $mysqlArgs += " -p$password" }
$mysqlArgs += " $database"

$result = Get-Content $sqlFile -Raw | & mysql -h$host_ -P$port -u$user $(if ($password -ne '') { "-p$password" } else { $null }) $database 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✔ Reset complete." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Restart the backend (npm run start:dev) to re-seed system role definitions"
    Write-Host "  2. Log in as super_admin"
    Write-Host "  3. Create the actual staff roles via Settings → Role Definitions"
    Write-Host "  4. Add users with the new roles"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✘ Reset failed. mysql output:" -ForegroundColor Red
    Write-Host $result
    exit 1
}
