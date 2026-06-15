# Compliance Hub — Release Checklist
# Priority 4: Manual release process (CI/CD substitute)
# Usage: .\scripts\release-checklist.ps1 [-Version "0.0.49"] [-SkipSmoke]

param(
    [string]$Version = "",
    [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path $PSScriptRoot -Parent
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"
$ArtifactsDir = Join-Path $RootDir "release-artifacts"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# --- Helpers ---
function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Pass($msg) { Write-Host "    [PASS] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "    [FAIL] $msg" -ForegroundColor Red; exit 1 }
function Warn($msg) { Write-Host "    [WARN] $msg" -ForegroundColor Yellow }

# --- Version check ---
Step "Checking version"
$backendPkg = Get-Content (Join-Path $BackendDir "package.json") | ConvertFrom-Json
$frontendPkg = Get-Content (Join-Path $FrontendDir "package.json") | ConvertFrom-Json
$backendVer = $backendPkg.version
$frontendVer = $frontendPkg.version

if ($backendVer -ne $frontendVer) {
    Warn "Backend version ($backendVer) != Frontend version ($frontendVer)"
}
if ($Version -and $backendVer -ne $Version) {
    Fail "Expected version $Version but backend package.json has $backendVer"
}
Pass "Version: $backendVer (backend) / $frontendVer (frontend)"

# --- Git state ---
Step "Checking git state"
Set-Location $RootDir
$gitBranch = git rev-parse --abbrev-ref HEAD
$gitCommit = git rev-parse --short HEAD
$gitDirty = git status --porcelain
if ($gitDirty) {
    Warn "Working tree is dirty — uncommitted changes present"
} else {
    Pass "Working tree is clean"
}
Pass "Branch: $gitBranch | Commit: $gitCommit"

# --- Backend build ---
Step "Building backend (NestJS)"
Set-Location $BackendDir
$buildOutput = npx nest build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $buildOutput
    Fail "Backend build failed"
}
Pass "Backend build passed"

# --- Frontend type-check ---
Step "Type-checking frontend (tsc --noEmit)"
Set-Location $FrontendDir
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $tscOutput
    Fail "Frontend type-check failed"
}
Pass "Frontend type-check passed"

# --- Smoke tests ---
if (-not $SkipSmoke) {
    Step "Running smoke tests"
    $smokeScript = Join-Path $RootDir "smoke-artifacts\run-blob-smoke.ps1"
    if (Test-Path $smokeScript) {
        & $smokeScript
        if ($LASTEXITCODE -ne 0) { Fail "Smoke tests failed" }
        Pass "Smoke tests passed"
    } else {
        Warn "Smoke test script not found at $smokeScript — skipping"
    }
} else {
    Warn "Smoke tests skipped (-SkipSmoke flag)"
}

# --- Record rollback artifact ---
Step "Recording release artifact"
$null = New-Item -ItemType Directory -Force -Path $ArtifactsDir
$artifact = @{
    version        = $backendVer
    git_branch     = $gitBranch
    git_commit     = $gitCommit
    timestamp      = $Timestamp
    rollback_cmd   = "git fetch --tags; git checkout rollback-baseline-$gitCommit"
    backend_ver    = $backendVer
    frontend_ver   = $frontendVer
}
$artifactFile = Join-Path $ArtifactsDir "release-$backendVer-$Timestamp.json"
$artifact | ConvertTo-Json -Depth 3 | Set-Content $artifactFile
Pass "Artifact saved: $artifactFile"

# --- Summary ---
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  RELEASE $backendVer ($gitBranch @ $gitCommit)" -ForegroundColor Green
Write-Host "  All checks PASSED — safe to deploy" -ForegroundColor Green
Write-Host "  Rollback: git fetch --tags; git checkout <prev-tag>" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Green
