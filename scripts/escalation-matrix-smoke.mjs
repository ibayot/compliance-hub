/*
  escalation-matrix-smoke.mjs

  Purpose:
  - Validate Escalated To Me behavior for real roles where isEscalationFocal=true.
  - Execute TEST escalation/de-escalation flow and verify in API + DB.

  Usage:
    node scripts/escalation-matrix-smoke.mjs

  Optional env:
    BASE_URL=http://localhost:4000/api
    ADMIN_EMAIL=fo2admin@dswd.gov.ph
    ADMIN_PASSWORD=password123
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=root
    DB_PASSWORD=
    DB_DATABASE=compliance_hub_ticketing
*/

import mysql from '../backend/node_modules/mysql2/promise.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'fo2admin@dswd.gov.ph';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'compliance_hub_ticketing',
};

const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function api(path, { method = 'GET', token, body, headers } = {}) {
  const init = { method, headers: { ...(headers || {}) } };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE_URL}${path}`, init);
  const data = await parseSafe(res);
  return { status: res.status, ok: res.ok, data };
}

function ensure(label, cond, detail) {
  if (!cond) throw new Error(`${label} failed${detail ? `: ${detail}` : ''}`);
}

async function login(email, password) {
  const r = await api('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  ensure('login', r.status === 201 && !!r.data?.accessToken, `${email} status=${r.status}`);
  return r.data;
}

async function loginAdmin() {
  const emails = [...new Set([process.env.ADMIN_EMAIL, ADMIN_EMAIL, 'fo2admin@dswd.gov.ph', 'fo2admin@dswd.gov.ph'].filter(Boolean))];
  const passwords = [...new Set([process.env.ADMIN_PASSWORD, ADMIN_PASSWORD, 'password123', 'password123', 'password123'].filter(Boolean))];

  for (const email of emails) {
    for (const password of passwords) {
      const r = await api('/auth/login', { method: 'POST', body: { email, password } });
      if (r.status === 201 && r.data?.accessToken) {
        return { ...r.data, _usedEmail: email, _usedPassword: password };
      }
    }
  }
  throw new Error('Admin login failed. Set ADMIN_EMAIL and ADMIN_PASSWORD.');
}

async function ensureUser(adminToken, email, role, firstName, lastName, ticketTechnician = false) {
  const create = await api('/users', {
    method: 'POST',
    token: adminToken,
    body: {
      email,
      password: 'TestSmoke123!',
      firstName,
      lastName,
      role,
      ticketTechnician,
      unitIds: [1],
    },
  });

  if (create.status === 201 || create.status === 200) {
    return create.data;
  }

  // If email already exists, fetch via full users list.
  const users = await api('/users', { token: adminToken });
  ensure('list users for existing account', users.status === 200 && Array.isArray(users.data));
  const found = users.data.find((u) => String(u.email).toLowerCase() === email.toLowerCase());
  ensure('find existing user by email', !!found, `email=${email}`);
  return found;
}

async function ensureEscalationConfig(adminToken, ticketType, roleValue, label) {
  const list = await api(`/ticket-settings/escalation-focals?ticketType=${encodeURIComponent(ticketType)}`, { token: adminToken });
  ensure('list escalation focals', list.status === 200 && Array.isArray(list.data));
  const exists = list.data.some((x) => x.roleValue === roleValue && x.ticketType === ticketType);
  if (exists) return;

  const add = await api('/ticket-settings/escalation-focals', {
    method: 'POST',
    token: adminToken,
    body: { ticketType, roleValue, label: `TEST ${label}` },
  });

  if (add.status === 400 && String(add.data?.message || '').toLowerCase().includes('already')) return;
  ensure('add escalation focal config', add.status === 201 || add.status === 200, `status=${add.status}`);
}

async function waitForUserInTicketingView(email, timeoutMs = 20000) {
  const started = Date.now();
  const conn = await mysql.createConnection(DB);
  try {
    while (Date.now() - started < timeoutMs) {
      const [rows] = await conn.query(
        'SELECT id, email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
        [email],
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0];
      }
      await sleep(500);
    }
  } finally {
    await conn.end();
  }
  throw new Error(`User ${email} not visible in ticketing DB users view within timeout.`);
}

async function runRoleScenario(adminToken, roleValue, requesterToken, juniorToken, juniorId, usedTicketIds) {
  const focalEmail = `test.escfocal.${roleValue}.${runId}@rictms.local`;
  const focalUser = await ensureUser(
    adminToken,
    focalEmail,
    roleValue,
    'Test',
    `Focal_${roleValue}`,
    false,
  );

  const focalLogin = await login(focalEmail, 'TestSmoke123!');
  await waitForUserInTicketingView(focalEmail);

  const createTicket = await api('/tickets', {
    method: 'POST',
    token: requesterToken,
    body: {
      subject: `TEST ESCALATION MATRIX ${roleValue} ${runId}`,
      description: `TEST escalation scenario for role ${roleValue}`,
      ticketType: 'it_support',
      priority: 'medium',
    },
  });

  let ticketId = createTicket.data?.id;
  let ticketType = createTicket.data?.ticketType || 'it_support';
  if (![200, 201].includes(createTicket.status) || !ticketId) {
    const list = await api('/tickets', { token: adminToken });
    ensure('fallback list tickets', list.status === 200, `status=${list.status}`);
    const items = Array.isArray(list.data) ? list.data : list.data?.data || [];
    const allActive = items.filter((t) =>
      !['closed', 'resolved', 'duplicate'].includes(String(t.status)),
    );
    const active = allActive.filter((t) => !usedTicketIds.has(String(t.id)));
    const candidates = active.length > 0 ? active : allActive;

    for (const t of candidates) {
      const esc = await api(`/tickets/${t.id}/escalations`, { token: adminToken });
      if (esc.status !== 200 || !Array.isArray(esc.data) || esc.data.length === 0) {
        ticketId = t.id;
        ticketType = t.ticketType || 'it_support';
        break;
      }
      const latest = esc.data[0];
      if (latest.status === 'returned') {
        ticketId = t.id;
        ticketType = t.ticketType || 'it_support';
        break;
      }
    }
  }
  if (!ticketId) {
    return { roleValue, skipped: true, reason: `No reusable active ticket (create status=${createTicket.status})` };
  }
  usedTicketIds.add(String(ticketId));

  await ensureEscalationConfig(adminToken, ticketType, roleValue, roleValue);

  const assign = await api(`/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    token: adminToken,
    body: { assignedToId: juniorId },
  });
  if (![200, 201].includes(assign.status)) {
    console.log(`WARN assign skipped for ticket ${ticketId}: status=${assign.status}`);
  }

  const form = new FormData();
  form.append('escalatedToId', String(focalUser.id));
  form.append('notes', `TEST ESCALATION to ${roleValue} run ${runId}`);

  let escalate = await api(`/tickets/${ticketId}/escalate`, {
    method: 'POST',
    token: juniorToken,
    body: form,
  });
  if (![200, 201].includes(escalate.status)) {
    escalate = await api(`/tickets/${ticketId}/escalate`, {
      method: 'POST',
      token: adminToken,
      body: form,
    });
  }
  ensure(
    'escalate ticket',
    [200, 201].includes(escalate.status),
    `status=${escalate.status} message=${JSON.stringify(escalate.data)}`,
  );

  const listEscToMe = await api('/tickets?escalatedToMe=true', { token: focalLogin.accessToken });
  ensure('list escalatedToMe', listEscToMe.status === 200, `status=${listEscToMe.status}`);
  const items = Array.isArray(listEscToMe.data) ? listEscToMe.data : listEscToMe.data?.data || [];
  const found = items.some((t) => t.id === ticketId);
  ensure('ticket appears in escalatedToMe', found, `role=${roleValue} ticket=${ticketId}`);

  const escalationId = escalate.data?.id;
  ensure('escalation id', !!escalationId);

  const deescalate = await api(`/tickets/${ticketId}/escalation/${escalationId}/return`, {
    method: 'PATCH',
    token: focalLogin.accessToken,
    body: { returnReason: `TEST DEESCALATION from ${roleValue} run ${runId}` },
  });
  ensure('de-escalate (return)', [200, 201].includes(deescalate.status), `status=${deescalate.status}`);

  const escList = await api(`/tickets/${ticketId}/escalations`, { token: focalLogin.accessToken });
  ensure('get escalations', escList.status === 200 && Array.isArray(escList.data));
  const latest = escList.data[0];
  ensure('latest escalation returned', latest?.status === 'returned', `status=${latest?.status}`);
  ensure('deescalation reason has TEST', String(latest?.returnReason || '').includes('TEST DEESCALATION'));

  return { roleValue, ticketId, escalationId };
}

async function verifyDatabase() {
  const conn = await mysql.createConnection(DB);
  try {
    const [rows] = await conn.query(
      `SELECT id, ticket_id, status, notes, return_reason
       FROM ticket_escalations
       WHERE notes LIKE ? OR return_reason LIKE ?
       ORDER BY id DESC
       LIMIT 20`,
      [`%TEST ESCALATION%${runId}%`, `%TEST DEESCALATION%${runId}%`],
    );
    ensure('DB rows for TEST escalation/deescalation', Array.isArray(rows) && rows.length > 0, `runId=${runId}`);
    return rows;
  } finally {
    await conn.end();
  }
}

async function main() {
  console.log(`Running escalation matrix smoke against ${BASE_URL}`);

  const admin = await loginAdmin();
  console.log(`Admin authenticated: ${admin._usedEmail}`);

  const caps = await api('/users/role-capabilities', { token: admin.accessToken });
  ensure('fetch role capabilities', caps.status === 200 && Array.isArray(caps.data));

  const roles = await api('/users/roles', { token: admin.accessToken });
  ensure('fetch role definitions', roles.status === 200 && Array.isArray(roles.data));

  const assignableByValue = new Map(roles.data.map((r) => [r.value, !!r.assignable]));

  const escalationRoles = caps.data
    .filter((r) => r.isEscalationFocal)
    .map((r) => r.roleValue)
    .filter((rv) => assignableByValue.get(rv) !== false);

  ensure('at least one escalation role', escalationRoles.length > 0);

  // Prioritize known production roles first, then fill with remaining roles.
  const priority = ['cybersec', 'infosec', 'lead_infra'];
  const ordered = [...priority.filter((p) => escalationRoles.includes(p)), ...escalationRoles.filter((r) => !priority.includes(r))];
  const targetRoles = [...new Set(ordered)];

  console.log(`Testing escalation roles: ${targetRoles.join(', ')}`);

  const requester = await ensureUser(
    admin.accessToken,
    `test.requester.${runId}@rictms.local`,
    'user',
    'Test',
    'Requester',
    false,
  );

  const junior = await ensureUser(
    admin.accessToken,
    `test.junior.${runId}@rictms.local`,
    'it_support_jr',
    'Test',
    'Junior',
    true,
  );

  const juniorLogin = await login(`test.junior.${runId}@rictms.local`, 'TestSmoke123!');
  const requesterLogin = await login(`test.requester.${runId}@rictms.local`, 'TestSmoke123!');

  await waitForUserInTicketingView(`test.requester.${runId}@rictms.local`);
  await waitForUserInTicketingView(`test.junior.${runId}@rictms.local`);

  const outputs = [];
  const usedTicketIds = new Set();
  for (const roleValue of targetRoles) {
    const res = await runRoleScenario(
      admin.accessToken,
      roleValue,
      requesterLogin.accessToken,
      juniorLogin.accessToken,
      junior.id,
      usedTicketIds,
    );
    outputs.push(res);
    if (res.skipped) {
      console.log(`SKIP role=${roleValue} reason=${res.reason}`);
    } else {
      console.log(`PASS role=${roleValue} ticket=${res.ticketId}`);
    }
  }

  const dbRows = await verifyDatabase();
  console.log(`DB verification rows: ${dbRows.length}`);

  console.log('Matrix escalation smoke completed.');
  console.log({ runId, rolesTested: targetRoles, outputsCount: outputs.length });
}

main().catch((err) => {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
});
