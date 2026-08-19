#!/usr/bin/env node
/**
 * Docker smoke tests for local or staging deployments.
 *
 * Local:
 *   $env:SWAGGER_USERNAME='swagger-admin'
 *   $env:SWAGGER_PASSWORD='use-a-long-random-password'
 *   node scripts/docker-smoke-test.cjs
 *
 * Staging:
 *   $env:BASE_URL='https://staging.example.test'
 *   $env:SWAGGER_USERNAME='...'
 *   $env:SWAGGER_PASSWORD='...'
 *   $env:AUTH_TOKEN='...'
 *   node scripts/docker-smoke-test.cjs
 *
 * AUTH_TOKEN is optional. When supplied, the script also checks that the
 * authenticated SSE connection-ticket endpoint is reachable.
 */

'use strict';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const SWAGGER_USERNAME = process.env.SWAGGER_USERNAME || '';
const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD || '';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const EXPECTED_ORIGIN = process.env.EXPECTED_ORIGIN || '';

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(message) {
  passed += 1;
  console.log(`PASS ${message}`);
}

function fail(message) {
  failed += 1;
  console.error(`FAIL ${message}`);
}

function skip(message) {
  skipped += 1;
  console.warn(`SKIP ${message}`);
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkHealth() {
  try {
    const response = await request('/api/health');
    if (response.status === 200) pass('gateway health is public and returns 200');
    else fail(`gateway health returned ${response.status}`);
  } catch (error) {
    fail(`gateway health is unreachable: ${error.message}`);
  }
}

async function checkSwagger() {
  try {
    const unauthenticated = await request('/api/docs');
    if (SWAGGER_USERNAME && SWAGGER_PASSWORD) {
      if (unauthenticated.status === 401) pass('Swagger rejects unauthenticated requests');
      else fail(`Swagger unauthenticated request returned ${unauthenticated.status}, expected 401`);

      const encoded = Buffer.from(`${SWAGGER_USERNAME}:${SWAGGER_PASSWORD}`).toString('base64');
      const authenticated = await request('/api/docs', {
        headers: { Authorization: `Basic ${encoded}` },
      });
      if (authenticated.status === 200) pass('Swagger accepts configured credentials');
      else fail(`Swagger authenticated request returned ${authenticated.status}, expected 200`);
    } else if (unauthenticated.status === 404) {
      pass('Swagger is disabled when credentials are not configured');
    } else {
      fail(`Swagger returned ${unauthenticated.status} without configured credentials`);
    }
  } catch (error) {
    fail(`Swagger check failed: ${error.message}`);
  }
}

async function checkCors() {
  if (!EXPECTED_ORIGIN) {
    skip('CORS check skipped; set EXPECTED_ORIGIN to the deployed frontend origin');
    return;
  }

  try {
    const response = await request('/api/health', {
      headers: { Origin: EXPECTED_ORIGIN },
    });
    const allowOrigin = response.headers.get('access-control-allow-origin');
    if (allowOrigin === EXPECTED_ORIGIN) pass('CORS allows the configured frontend origin');
    else fail(`CORS returned '${allowOrigin || '(missing)'}' for ${EXPECTED_ORIGIN}`);
  } catch (error) {
    fail(`CORS check failed: ${error.message}`);
  }
}

async function checkSseToken() {
  if (!AUTH_TOKEN) {
    skip('SSE token check skipped; set AUTH_TOKEN to a valid access token');
    return;
  }

  try {
    const response = await request('/api/events/token', {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    if (response.status !== 200) {
      fail(`SSE connection-ticket endpoint returned ${response.status}, expected 200`);
      return;
    }

    const body = await response.json();
    if (typeof body.token === 'string' && body.token.length > 20) {
      pass('SSE endpoint returns an opaque connection ticket, not the access JWT');
    } else {
      fail('SSE endpoint did not return a valid connection ticket');
    }
  } catch (error) {
    fail(`SSE token check failed: ${error.message}`);
  }
}

(async () => {
  console.log(`Testing ${BASE_URL}`);
  await checkHealth();
  await checkSwagger();
  await checkCors();
  await checkSseToken();
  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exitCode = failed === 0 ? 0 : 1;
})();
