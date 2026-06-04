/**
 * test-escalate.js — Quick API sanity test for escalation flow
 * 
 * Tests:
 *   1. Login as desktop_jr (jrcardona) → escalate to desktop_sr (mpmabazza) 
 *   2. Verifies escalation succeeds (200 OK) with attendance mock
 */
const axios = require('axios');
const mysql = require('mysql2/promise');
const FormData = require('form-data');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:4000/api';

async function test() {
  let conn;
  try {
    conn = await mysql.createConnection({ host: 'localhost', user: 'root', multipleStatements: true });

    const today = new Date().toISOString().slice(0, 10);

    // 1. Setup: clean + seed test data
    await conn.execute('USE compliance_hub_ticketing');
    await conn.execute('DELETE FROM ticket_escalations WHERE ticket_id = \'test-tick-api\'');
    await conn.execute('DELETE FROM tickets WHERE id = \'test-tick-api\'');
    await conn.execute(
      `INSERT INTO tickets (id, ticket_number, ticket_type, subject, description, status, requester_id, assigned_to_id, created_at, updated_at)
       VALUES ('test-tick-api', 'TKT-TEST-001', 'desktop_support', 'API Test Ticket', 'desc', 'in_progress', 95, 6, NOW(), NOW())`
    );
    console.log('  ✓ Test ticket created');

    // 2. Mark desktop_sr (mpmabazza, id=7) as present
    await conn.execute('USE compliance_hub_users');
    const attendId = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO attendance (id, user_id, date, status, set_by_id, notes, created_at)
       VALUES (?, 7, ?, 'present', 1, 'api-test', NOW())
       ON DUPLICATE KEY UPDATE status='present'`,
      [attendId, today]
    );
    console.log('  ✓ desktop_sr (mpmabazza, id=7) marked as present');

    // 3. Login as desktop_jr (jrcardona, id=6)
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'jrcardona@dswd.gov.ph',
      password: 'password123',
    });
    const token = loginRes.data.accessToken;
    console.log('  ✓ Logged in as jrcardona (desktop_jr)');

    // 4. Escalate to mpmabazza (desktop_sr, id=7)
    const escRes = await axios.post(
      `${BASE_URL}/tickets/test-tick-api/escalate`,
      { escalatedToId: '7', notes: 'API test escalation' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('  ✓ Escalation succeeded!', JSON.stringify(escRes.data, null, 2));

    // 5. Cleanup
    await conn.execute('USE compliance_hub_ticketing');
    await conn.execute('DELETE FROM ticket_escalations WHERE ticket_id = \'test-tick-api\'');
    await conn.execute('DELETE FROM tickets WHERE id = \'test-tick-api\'');
    await conn.execute('USE compliance_hub_users');
    await conn.execute(`DELETE FROM attendance WHERE notes = 'api-test' AND user_id = 7 AND date = '${today}'`);
    console.log('  ✓ Cleanup done');

  } catch (e) {
    console.error('✗ Error:', e.response ? `${e.response.status} — ${JSON.stringify(e.response.data)}` : e.message);
  } finally {
    if (conn) await conn.end();
  }
}

test();
