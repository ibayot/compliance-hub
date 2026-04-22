/*
  Quick escalation smoke (targeted 5 scenarios)
  Usage:
    node scripts/quick-escalation-smoke.mjs
  Optional env:
    BASE_URL=http://localhost:4000/api
    ADMIN_EMAIL=admin@rictms.gov.ph
    ADMIN_PASSWORD=Admin@123
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rictms.gov.ph';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseBodySafe(res) {
  const txt = await res.text();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

async function request(path, { method = 'GET', token, body, headers } = {}) {
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
  const data = await parseBodySafe(res);
  return { status: res.status, ok: res.ok, data };
}

function assertStatus(label, got, expected) {
  if (Array.isArray(expected)) {
    if (!expected.includes(got)) {
      throw new Error(`${label}: expected one of ${expected.join(', ')}, got ${got}`);
    }
    return;
  }
  if (got !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${got}`);
  }
}

async function login(email, password) {
  const r = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  assertStatus(`login ${email}`, r.status, 201);
  if (!r.data?.accessToken) {
    throw new Error(`login ${email}: accessToken missing`);
  }
  return r.data;
}

async function loginAdminWithFallbacks() {
  const emailCandidates = [
    process.env.ADMIN_EMAIL,
    ADMIN_EMAIL,
    'admin@rictms.gov.ph',
    'admin@ricms.gov.ph',
  ].filter(Boolean);

  const passCandidates = [
    process.env.ADMIN_PASSWORD,
    ADMIN_PASSWORD,
    'Admin@123',
    'Admin123!',
    'password123',
  ].filter(Boolean);

  for (const email of [...new Set(emailCandidates)]) {
    for (const pass of [...new Set(passCandidates)]) {
      const r = await request('/auth/login', {
        method: 'POST',
        body: { email, password: pass },
      });
      if (r.status === 201 && r.data?.accessToken) {
        return { ...r.data, _usedEmail: email, _usedPassword: pass };
      }
    }
  }

  throw new Error('Admin login failed for all fallback credentials. Set ADMIN_EMAIL and ADMIN_PASSWORD explicitly.');
}

async function createUser(adminToken, { email, role, firstName, lastName, ticketTechnician = false }) {
  const body = {
    email,
    password: 'Smoke123!',
    firstName,
    lastName,
    role,
    ticketTechnician,
    unitIds: [1],
  };
  const r = await request('/users', {
    method: 'POST',
    token: adminToken,
    body,
  });
  assertStatus(`create user ${email}`, r.status, [201, 200]);
  return r.data;
}

async function ensureEscalationFocal(adminToken, ticketType, roleValue, label) {
  const list = await request(`/ticket-settings/escalation-focals?ticketType=${encodeURIComponent(ticketType)}`, {
    token: adminToken,
  });
  assertStatus('list escalation focals', list.status, 200);
  const exists = Array.isArray(list.data) && list.data.some((x) => x.roleValue === roleValue && x.ticketType === ticketType);
  if (exists) return;

  const add = await request('/ticket-settings/escalation-focals', {
    method: 'POST',
    token: adminToken,
    body: { ticketType, roleValue, label },
  });
  // already-configured path can return 400 depending on race; treat as pass if message indicates duplicate
  if (add.status === 400 && String(add.data?.message || '').toLowerCase().includes('already configured')) return;
  assertStatus('add escalation focal', add.status, [201, 200]);
}

async function main() {
  const results = [];
  const record = (name, pass, detail) => {
    results.push({ name, pass, detail });
    const prefix = pass ? 'PASS' : 'FAIL';
    console.log(`[${prefix}] ${name}${detail ? ` - ${detail}` : ''}`);
  };

  console.log(`Running quick escalation smoke against ${BASE_URL}`);

  const admin = await loginAdminWithFallbacks();
  const adminToken = admin.accessToken;
  console.log(`Admin login succeeded with ${admin._usedEmail}`);

  const emails = {
    requester: `smoke.requester.${runId}@rictms.local`,
    junior: `smoke.junior.${runId}@rictms.local`,
    focal1: `smoke.focal1.${runId}@rictms.local`,
    focal2: `smoke.focal2.${runId}@rictms.local`,
    pantawid: `smoke.pantawid.${runId}@rictms.local`,
  };

  await createUser(adminToken, {
    email: emails.requester,
    role: 'user',
    firstName: 'Smoke',
    lastName: 'Requester',
  });
  await createUser(adminToken, {
    email: emails.junior,
    role: 'desktop_jr',
    firstName: 'Smoke',
    lastName: 'Junior',
    ticketTechnician: true,
  });
  await createUser(adminToken, {
    email: emails.focal1,
    role: 'desktop_sr',
    firstName: 'Smoke',
    lastName: 'FocalOne',
    ticketTechnician: true,
  });
  await createUser(adminToken, {
    email: emails.focal2,
    role: 'desktop_sr',
    firstName: 'Smoke',
    lastName: 'FocalTwo',
    ticketTechnician: true,
  });
  await createUser(adminToken, {
    email: emails.pantawid,
    role: 'pantawid_ict',
    firstName: 'Smoke',
    lastName: 'Pantawid',
    ticketTechnician: true,
  });

  // Allow async hooks to settle in some environments
  await sleep(300);

  const requester = await login(emails.requester, 'Smoke123!');
  const junior = await login(emails.junior, 'Smoke123!');
  const focal1 = await login(emails.focal1, 'Smoke123!');
  const focal2 = await login(emails.focal2, 'Smoke123!');
  const pantawid = await login(emails.pantawid, 'Smoke123!');

  await ensureEscalationFocal(adminToken, 'desktop_support', 'desktop_sr', 'Desktop Senior');

  // Create and assign ticket
  const created = await request('/tickets', {
    method: 'POST',
    token: requester.accessToken,
    body: {
      subject: `Smoke escalation ${runId}`,
      description: 'Smoke test escalation scenario ticket',
      ticketType: 'desktop_support',
      priority: 'medium',
    },
  });
  assertStatus('create ticket', created.status, [201, 200]);
  const ticketId = created.data?.id;
  if (!ticketId) throw new Error('create ticket: missing ticketId');

  const assignJunior = await request(`/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    token: adminToken,
    body: { assignedToId: junior.user.id },
  });
  assertStatus('assign to junior', assignJunior.status, [200, 201]);

  // Escalate #1 (pending)
  const esc1Form = new FormData();
  esc1Form.append('escalatedToId', String(focal1.user.id));
  esc1Form.append('notes', 'first escalation');
  esc1Form.append('proofFiles', new Blob(['fake-image-1'], { type: 'image/png' }), 'proof1.png');
  const esc1 = await request(`/tickets/${ticketId}/escalate`, {
    method: 'POST',
    token: junior.accessToken,
    body: esc1Form,
  });
  assertStatus('first escalation', esc1.status, [200, 201]);

  // Scenario 1: single active escalation only
  const escAgainForm = new FormData();
  escAgainForm.append('escalatedToId', String(focal1.user.id));
  escAgainForm.append('notes', 'second escalation should fail');
  const escAgain = await request(`/tickets/${ticketId}/escalate`, {
    method: 'POST',
    token: junior.accessToken,
    body: escAgainForm,
  });
  const s1Pass = escAgain.status >= 400 && String(escAgain.data?.message || escAgain.data || '').toLowerCase().includes('active escalation');
  record('Scenario 1 - Single active escalation guard', s1Pass, `status=${escAgain.status}`);

  // Return escalation
  const esc1Id = esc1.data?.id;
  const ret1 = await request(`/tickets/${ticketId}/escalation/${esc1Id}/return`, {
    method: 'PATCH',
    token: focal1.accessToken,
    body: { returnReason: 'return for more details' },
  });
  assertStatus('return escalation 1', ret1.status, [200, 201]);

  // Re-escalate after return (pending #2)
  const esc2Form = new FormData();
  esc2Form.append('escalatedToId', String(focal1.user.id));
  esc2Form.append('notes', 'second escalation after return');
  esc2Form.append('proofFiles', new Blob(['fake-image-2'], { type: 'image/png' }), 'proof2.png');
  const esc2 = await request(`/tickets/${ticketId}/escalate`, {
    method: 'POST',
    token: junior.accessToken,
    body: esc2Form,
  });
  assertStatus('second escalation after return', esc2.status, [200, 201]);
  const esc2Id = esc2.data?.id;

  // Scenario 5: update proof on pending escalation + proof endpoint fetch
  const updForm = new FormData();
  updForm.append('notes', 'added more proof');
  updForm.append('proofFiles', new Blob(['fake-image-3'], { type: 'image/png' }), 'proof3.png');
  const upd = await request(`/tickets/${ticketId}/escalation/${esc2Id}/update-proof`, {
    method: 'PATCH',
    token: junior.accessToken,
    body: updForm,
  });

  let proofFetchOk = false;
  if (upd.ok && Array.isArray(upd.data?.proofFiles) && upd.data.proofFiles.length > 0) {
    const firstProof = upd.data.proofFiles[0];
    const filename = encodeURIComponent(String(firstProof).split('/').pop());
    const proofRes = await fetch(`${BASE_URL}/tickets/proof/${ticketId}/${filename}`, {
      headers: { Authorization: `Bearer ${junior.accessToken}` },
    });
    proofFetchOk = proofRes.ok;
  }
  record('Scenario 5 - Pending update-proof and proof fetch', upd.ok && proofFetchOk, `updateStatus=${upd.status}`);

  // Accept escalation #2
  const accept2 = await request(`/tickets/${ticketId}/escalation/${esc2Id}/accept`, {
    method: 'PATCH',
    token: focal1.accessToken,
  });
  assertStatus('accept escalation 2', accept2.status, [200, 201]);

  // Scenario 2: original assigned technician cannot update status after accepted escalation
  const juniorStatusUpdate = await request(`/tickets/${ticketId}`, {
    method: 'PATCH',
    token: junior.accessToken,
    body: { status: 'resolved' },
  });
  const s2Pass = juniorStatusUpdate.status === 403;
  record('Scenario 2 - Original technician status lock on accepted escalation', s2Pass, `status=${juniorStatusUpdate.status}`);

  // Scenario 3: pantawid/senior non-admin cannot change status or reassign after accepted escalation
  const pantawidStatusUpdate = await request(`/tickets/${ticketId}`, {
    method: 'PATCH',
    token: pantawid.accessToken,
    body: { status: 'resolved' },
  });
  const pantawidAssign = await request(`/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    token: pantawid.accessToken,
    body: { assignedToId: pantawid.user.id },
  });
  const s3Pass = pantawidStatusUpdate.status === 403 && pantawidAssign.status === 403;
  record('Scenario 3 - Pantawid/senior blocked from status+reassign on accepted escalation', s3Pass, `statusPatch=${pantawidStatusUpdate.status}, assign=${pantawidAssign.status}`);

  // Scenario 4: CO/SH/SA can reassign accepted escalation to another configured focal
  const adminReassign = await request(`/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    token: adminToken,
    body: { assignedToId: focal2.user.id },
  });
  const s4Pass = adminReassign.ok && Number(adminReassign.data?.assignedToId) === Number(focal2.user.id);
  record('Scenario 4 - Admin reassignment to another escalation focal', s4Pass, `status=${adminReassign.status}`);

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;

  console.log('\nSummary');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Run ID: ${runId}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('\nSmoke run failed with exception:');
  console.error(err?.message || err);
  process.exit(1);
});
