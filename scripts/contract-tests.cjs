#!/usr/bin/env node
/**
 * contract-tests.cjs
 *
 * API contract tests — validate that each service exposes the expected
 * response shapes and health endpoints.
 *
 * Tests gracefully skip individual services when they are not running.
 *
 * Usage:
 *   node scripts/contract-tests.cjs
 *
 * Optional env vars:
 *   GATEWAY_URL      (default: http://localhost:4000)
 *   USERS_URL        (default: http://localhost:4101)
 *   TICKETING_URL    (default: http://localhost:4102)
 *   COMPLIANCE_URL   (default: http://localhost:4103)
 *   AUTH_TOKEN       JWT token for authenticated endpoint tests (optional)
 */

'use strict';

const GATEWAY_URL   = process.env.GATEWAY_URL   || 'http://localhost:4000';
const USERS_URL     = process.env.USERS_URL      || 'http://localhost:4101';
const TICKETING_URL = process.env.TICKETING_URL  || 'http://localhost:4102';
const COMPLIANCE_URL = process.env.COMPLIANCE_URL || 'http://localhost:4103';
const AUTH_TOKEN    = process.env.AUTH_TOKEN      || null;

let passed = 0;
let failed = 0;
let skipped = 0;

// ── Utility helpers ──────────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function isReachable(url) {
  try {
    const res = await fetchWithTimeout(url, {}, 2000);
    return res.status < 500;
  } catch {
    return false;
  }
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function skip(message) {
  console.warn(`  ~ SKIP: ${message}`);
  skipped++;
}

function section(title) {
  console.log(`\n── ${title}`);
}

// ── Auth header helper ───────────────────────────────────────────────────────

function authHeaders() {
  if (!AUTH_TOKEN) return {};
  return { Authorization: `Bearer ${AUTH_TOKEN}` };
}

// ── Contract: Health endpoints ───────────────────────────────────────────────

async function testHealthEndpoints() {
  section('Health Endpoints');

  // Gateway health
  try {
    const res = await fetchWithTimeout(`${GATEWAY_URL}/api/health`);
    const body = await res.json();
    assert(res.status === 200, `Gateway /api/health → 200`);
    assert(typeof body.service === 'string', 'Gateway health body has "service" field');
    assert(typeof body.status === 'string', 'Gateway health body has "status" field');
    assert(typeof body.services === 'object', 'Gateway health body has "services" object');
    assert('users' in body.services, 'Gateway health.services has "users" key');
    assert('ticketing' in body.services, 'Gateway health.services has "ticketing" key');
    assert('compliance' in body.services, 'Gateway health.services has "compliance" key');
  } catch (err) {
    skip(`Gateway not reachable at ${GATEWAY_URL}: ${err.message}`);
  }

  // Users-service health
  try {
    const res = await fetchWithTimeout(`${USERS_URL}/api/health`);
    const body = await res.json();
    assert(res.status === 200, `Users /api/health → 200`);
    assert(body.status === 'ok', 'Users health.status === "ok"');
  } catch {
    skip(`Users-service not reachable at ${USERS_URL}`);
  }

  // Users-service liveness/readiness
  try {
    const [liveRes, readyRes] = await Promise.all([
      fetchWithTimeout(`${USERS_URL}/api/health/live`),
      fetchWithTimeout(`${USERS_URL}/api/health/ready`),
    ]);
    assert(liveRes.status === 200, 'Users /api/health/live → 200');
    assert(readyRes.status === 200 || readyRes.status === 503, 'Users /api/health/ready → 200 or 503');
  } catch {
    skip('Users-service liveness/readiness endpoints not reachable');
  }

  // Ticketing-service health
  try {
    const res = await fetchWithTimeout(`${TICKETING_URL}/api/health`);
    const body = await res.json();
    assert(res.status === 200, `Ticketing /api/health → 200`);
    assert(body.status === 'ok', 'Ticketing health.status === "ok"');
  } catch {
    skip(`Ticketing-service not reachable at ${TICKETING_URL}`);
  }

  // Compliance-service health
  try {
    const res = await fetchWithTimeout(`${COMPLIANCE_URL}/api/health`);
    const body = await res.json();
    assert(res.status === 200, `Compliance /api/health → 200`);
    assert(body.status === 'ok', 'Compliance health.status === "ok"');
  } catch {
    skip(`Compliance-service not reachable at ${COMPLIANCE_URL}`);
  }
}

// ── Contract: Response shapes ────────────────────────────────────────────────

async function testDocumentsContract() {
  section('Documents API Contract (compliance-service)');

  if (!AUTH_TOKEN) {
    skip('AUTH_TOKEN not set — skipping authenticated endpoint shape tests');
    return;
  }

  const reachable = await isReachable(`${COMPLIANCE_URL}/api/health`);
  if (!reachable) {
    skip(`Compliance-service not reachable at ${COMPLIANCE_URL}`);
    return;
  }

  try {
    const res = await fetchWithTimeout(
      `${COMPLIANCE_URL}/api/documents?page=1&limit=5`,
      { headers: authHeaders() },
    );
    assert(res.status === 200, 'GET /api/documents → 200');

    if (res.status === 200) {
      const body = await res.json();
      assert(
        Array.isArray(body.data) || Array.isArray(body),
        'Documents response is array or {data:[]}',
      );
    }
  } catch (err) {
    skip(`Documents endpoint error: ${err.message}`);
  }
}

async function testIssuancesContract() {
  section('Issuances API Contract (compliance-service)');

  if (!AUTH_TOKEN) {
    skip('AUTH_TOKEN not set — skipping authenticated endpoint shape tests');
    return;
  }

  const reachable = await isReachable(`${COMPLIANCE_URL}/api/health`);
  if (!reachable) {
    skip(`Compliance-service not reachable at ${COMPLIANCE_URL}`);
    return;
  }

  try {
    const res = await fetchWithTimeout(
      `${COMPLIANCE_URL}/api/issuances`,
      { headers: authHeaders() },
    );
    assert(res.status === 200, 'GET /api/issuances → 200');

    if (res.status === 200) {
      const body = await res.json();
      assert(Array.isArray(body), 'Issuances response is an array');
      if (Array.isArray(body) && body.length > 0) {
        const first = body[0];
        assert(typeof first.id !== 'undefined', 'Issuance has id field');
        assert(typeof first.issuance_number === 'string', 'Issuance has issuance_number field');
        assert(typeof first.title === 'string', 'Issuance has title field');
      }
    }
  } catch (err) {
    skip(`Issuances endpoint error: ${err.message}`);
  }
}

async function testTicketsContract() {
  section('Tickets API Contract (ticketing-service)');

  if (!AUTH_TOKEN) {
    skip('AUTH_TOKEN not set — skipping authenticated endpoint shape tests');
    return;
  }

  const reachable = await isReachable(`${TICKETING_URL}/api/health`);
  if (!reachable) {
    skip(`Ticketing-service not reachable at ${TICKETING_URL}`);
    return;
  }

  try {
    const res = await fetchWithTimeout(
      `${TICKETING_URL}/api/tickets`,
      { headers: authHeaders() },
    );
    assert(res.status === 200, 'GET /api/tickets → 200');

    if (res.status === 200) {
      const body = await res.json();
      const items = Array.isArray(body) ? body : body.data;
      assert(Array.isArray(items), 'Tickets response is array or {data:[]}');
    }
  } catch (err) {
    skip(`Tickets endpoint error: ${err.message}`);
  }
}

async function testUsersContract() {
  section('Users API Contract (users-service)');

  if (!AUTH_TOKEN) {
    skip('AUTH_TOKEN not set — skipping authenticated endpoint shape tests');
    return;
  }

  const reachable = await isReachable(`${USERS_URL}/api/health`);
  if (!reachable) {
    skip(`Users-service not reachable at ${USERS_URL}`);
    return;
  }

  try {
    const res = await fetchWithTimeout(
      `${USERS_URL}/api/units`,
      { headers: authHeaders() },
    );
    assert(res.status === 200, 'GET /api/units → 200');

    if (res.status === 200) {
      const body = await res.json();
      assert(Array.isArray(body), 'Units response is an array');
      if (Array.isArray(body) && body.length > 0) {
        const first = body[0];
        assert(typeof first.id !== 'undefined', 'Unit has id field');
        assert(typeof first.name === 'string', 'Unit has name field');
      }
    }
  } catch (err) {
    skip(`Units endpoint error: ${err.message}`);
  }
}

// ── Contract: Correlation ID ─────────────────────────────────────────────────

async function testCorrelationId() {
  section('Correlation ID (X-Request-ID header)');

  const sentId = 'contract-test-' + Date.now();

  try {
    const res = await fetchWithTimeout(`${GATEWAY_URL}/api/health`, {
      headers: { 'X-Request-ID': sentId },
    });
    const returned = res.headers.get('x-request-id');
    assert(returned === sentId, `Gateway echoes back X-Request-ID: ${sentId}`);
  } catch {
    skip(`Gateway not reachable at ${GATEWAY_URL} — cannot test correlation ID`);
  }
}

// ── Contract: Internal inter-service endpoints ───────────────────────────────

async function testInternalEndpoints() {
  section('Internal Inter-Service Endpoints (users-service)');

  const secret = process.env.INTERNAL_SERVICE_SECRET;
  if (!secret) {
    skip('INTERNAL_SERVICE_SECRET not set — internal endpoints use open mode, skipping explicit tests');
    return;
  }

  const reachable = await isReachable(`${USERS_URL}/api/health`);
  if (!reachable) {
    skip(`Users-service not reachable at ${USERS_URL}`);
    return;
  }

  const headers = { 'X-Service-Token': secret };

  try {
    const res = await fetchWithTimeout(`${USERS_URL}/api/internal/users`, { headers });
    assert(res.status === 200, 'GET /api/internal/users → 200 with valid token');
    if (res.status === 200) {
      const body = await res.json();
      assert(Array.isArray(body), 'Internal users response is an array');
    }
  } catch (err) {
    skip(`Internal users endpoint error: ${err.message}`);
  }

  try {
    const res = await fetchWithTimeout(`${USERS_URL}/api/internal/units`, { headers });
    assert(res.status === 200, 'GET /api/internal/units → 200 with valid token');
    if (res.status === 200) {
      const body = await res.json();
      assert(Array.isArray(body), 'Internal units response is an array');
    }
  } catch (err) {
    skip(`Internal units endpoint error: ${err.message}`);
  }

  // Unauthorized access should be rejected when secret is configured
  try {
    const res = await fetchWithTimeout(`${USERS_URL}/api/internal/users`, {
      headers: { 'X-Service-Token': 'invalid-token' },
    });
    assert(res.status === 403, 'GET /api/internal/users → 403 with invalid token');
  } catch (err) {
    skip(`Internal endpoint rejection test error: ${err.message}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Compliance Hub — Contract Tests v0.0.50');
  console.log(`  Gateway:    ${GATEWAY_URL}`);
  console.log(`  Users:      ${USERS_URL}`);
  console.log(`  Ticketing:  ${TICKETING_URL}`);
  console.log(`  Compliance: ${COMPLIANCE_URL}`);
  if (AUTH_TOKEN) {
    console.log('  Auth token: provided');
  } else {
    console.log('  Auth token: not set (authenticated tests will be skipped)');
  }

  await testHealthEndpoints();
  await testCorrelationId();
  await testInternalEndpoints();
  await testDocumentsContract();
  await testIssuancesContract();
  await testTicketsContract();
  await testUsersContract();

  console.log(`\n──────────────────────────────────────────`);
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`──────────────────────────────────────────`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error in contract tests:', err);
  process.exit(1);
});
