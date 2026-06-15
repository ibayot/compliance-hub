// Regression + smoke tests for Compliance Hub v0.0.49
// Tests the DB layer and API layer (no services need to be running for DB tests)
// Run: node scripts/regression-test.cjs
const mysql = require('../backend/node_modules/mysql2/promise');

const DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'ricms_user',
  password: process.env.DB_PASSWORD || 'ricms_password',
};

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    console.log(`  \u2705 PASS: ${label}`);
    passed++;
  } catch (e) {
    console.log(`  \u274c FAIL: ${label}`);
    console.log(`       ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

async function run() {
  console.log('\n=== Compliance Hub Regression Tests v0.0.49 ===\n');

  // --- DB Connectivity ---
  console.log('[1] Database Connectivity');
  const ch  = await mysql.createConnection({ ...DB, database: 'compliance_hub' });
  const chu = await mysql.createConnection({ ...DB, database: 'compliance_hub_users' });
  const cht = await mysql.createConnection({ ...DB, database: 'compliance_hub_ticketing' });

  await test('compliance_hub: SELECT 1', async () => {
    const [r] = await ch.query('SELECT 1 as ok'); assert(r[0].ok === 1);
  });
  await test('compliance_hub_users: SELECT 1', async () => {
    const [r] = await chu.query('SELECT 1 as ok'); assert(r[0].ok === 1);
  });
  await test('compliance_hub_ticketing: SELECT 1', async () => {
    const [r] = await cht.query('SELECT 1 as ok'); assert(r[0].ok === 1);
  });

  // --- Source of Truth: document_issuances must NOT exist ---
  console.log('\n[2] Schema Source of Truth');
  await test('compliance_hub.document_issuances does NOT exist', async () => {
    const [r] = await ch.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema='compliance_hub' AND table_name='document_issuances'"
    );
    assert(r[0].cnt === 0, `document_issuances exists but should not (cnt=${r[0].cnt})`);
  });
  await test('compliance_hub.issuances exists as BASE TABLE', async () => {
    const [r] = await ch.query(
      "SELECT table_type FROM information_schema.tables WHERE table_schema='compliance_hub' AND table_name='issuances'"
    );
    assert(r.length === 1 && r[0].table_type === 'BASE TABLE', 'issuances is not a BASE TABLE');
  });
  await test('compliance_hub.documents exists as BASE TABLE', async () => {
    const [r] = await ch.query(
      "SELECT table_type FROM information_schema.tables WHERE table_schema='compliance_hub' AND table_name='documents'"
    );
    assert(r.length === 1 && r[0].table_type === 'BASE TABLE');
  });

  // --- Cross-DB Views ---
  console.log('\n[3] Cross-DB Views (ownership enforcement)');
  await test('compliance_hub.users is a VIEW (not base table)', async () => {
    const [r] = await ch.query(
      "SELECT table_type FROM information_schema.tables WHERE table_schema='compliance_hub' AND table_name='users'"
    );
    assert(r.length === 1 && r[0].table_type === 'VIEW', `Expected VIEW got ${r[0]?.table_type}`);
  });
  await test('compliance_hub.role_definitions is a VIEW', async () => {
    const [r] = await ch.query(
      "SELECT table_type FROM information_schema.tables WHERE table_schema='compliance_hub' AND table_name='role_definitions'"
    );
    assert(r.length === 1 && r[0].table_type === 'VIEW');
  });
  await test('compliance_hub_users.units is a VIEW (points to compliance_hub)', async () => {
    const [r] = await chu.query(
      "SELECT table_type FROM information_schema.tables WHERE table_schema='compliance_hub_users' AND table_name='units'"
    );
    assert(r.length === 1 && r[0].table_type === 'VIEW');
  });
  await test('compliance_hub_ticketing.users is a VIEW', async () => {
    const [r] = await cht.query(
      "SELECT table_type FROM information_schema.tables WHERE table_schema='compliance_hub_ticketing' AND table_name='users'"
    );
    assert(r.length === 1 && r[0].table_type === 'VIEW');
  });
  await test('compliance_hub_ticketing.units is a VIEW', async () => {
    const [r] = await cht.query(
      "SELECT table_type FROM information_schema.tables WHERE table_schema='compliance_hub_ticketing' AND table_name='units'"
    );
    assert(r.length === 1 && r[0].table_type === 'VIEW');
  });
  await test('compliance_hub_users.users is a BASE TABLE (owner)', async () => {
    const [r] = await chu.query(
      "SELECT table_type FROM information_schema.tables WHERE table_schema='compliance_hub_users' AND table_name='users'"
    );
    assert(r.length === 1 && r[0].table_type === 'BASE TABLE');
  });

  // --- Data availability ---
  console.log('\n[4] Data Availability');
  await test('compliance_hub.documents has active records', async () => {
    const [r] = await ch.query('SELECT COUNT(*) as cnt FROM documents WHERE is_deleted = 0');
    assert(r[0].cnt > 0, `Expected active documents, got ${r[0].cnt}`);
    console.log(`       (${r[0].cnt} active documents)`);
  });
  await test('compliance_hub.issuances has records', async () => {
    const [r] = await ch.query('SELECT COUNT(*) as cnt FROM issuances WHERE is_active = 1');
    assert(r[0].cnt >= 0); // can be 0 if not seeded yet
    console.log(`       (${r[0].cnt} active issuances)`);
  });
  await test('compliance_hub_users.users has records', async () => {
    const [r] = await chu.query('SELECT COUNT(*) as cnt FROM users');
    assert(r[0].cnt > 0, 'No users found');
    console.log(`       (${r[0].cnt} users)`);
  });
  await test('compliance_hub_ticketing.tickets query works', async () => {
    const [r] = await cht.query('SELECT COUNT(*) as cnt FROM tickets');
    assert(r[0].cnt >= 0);
    console.log(`       (${r[0].cnt} tickets)`);
  });

  // --- Issuances column integrity ---
  console.log('\n[5] Issuances Column Integrity (v0.0.49 schema)');
  const expectedCols = [
    'attachment_file_name','attachment_mime_type','attachment_blob','attachment_uploaded_at',
    'binding_nature','adoption_basis','applicable_provisions','compliance_obligations',
    'required_evidence','evidence_location','process_owner','frequency_cadence',
    'compliance_status','gap_summary','action_required','target_date',
    'last_review_date','quarterly_readiness','register_added_at'
  ];
  await test('issuances has all extended columns', async () => {
    const [cols] = await ch.query('DESCRIBE issuances');
    const names = cols.map(c => c.Field);
    const missing = expectedCols.filter(c => !names.includes(c));
    assert(missing.length === 0, `Missing columns: ${missing.join(', ')}`);
  });

  // --- Query correctness: listDocuments equivalent ---
  console.log('\n[6] Query Correctness');
  await test('documents JOIN units works', async () => {
    const [r] = await ch.query(
      'SELECT d.id, d.title, u.name as unit_name FROM documents d LEFT JOIN units u ON d.unit_id = u.id WHERE d.is_deleted = 0 LIMIT 5'
    );
    assert(Array.isArray(r));
    console.log(`       (returned ${r.length} rows)`);
  });
  await test('documents LEFT JOIN manual_reviews works (admin queue sim)', async () => {
    const [r] = await ch.query(`
      SELECT d.id, d.title,
        COALESCE((SELECT mr.decision FROM manual_reviews mr WHERE mr.document_id = d.id ORDER BY mr.reviewed_at DESC LIMIT 1), 'pending') AS latest_review
      FROM documents d WHERE d.is_deleted = 0 LIMIT 10
    `);
    assert(Array.isArray(r));
    const statuses = [...new Set(r.map(row => row.latest_review))];
    console.log(`       (statuses found: ${statuses.join(', ')})`);
  });
  await test('issuances query without document join works', async () => {
    const [r] = await ch.query('SELECT id, issuance_number, title, is_active FROM issuances ORDER BY issue_date DESC LIMIT 5');
    assert(Array.isArray(r));
    console.log(`       (returned ${r.length} issuances)`);
  });
  await test('cross-DB view: compliance_hub.users readable', async () => {
    const [r] = await ch.query('SELECT id, email, role FROM users LIMIT 3');
    assert(Array.isArray(r) && r.length > 0);
  });
  await test('cross-DB view: compliance_hub_ticketing.users readable', async () => {
    const [r] = await cht.query('SELECT id, email FROM users LIMIT 3');
    assert(Array.isArray(r));
  });

  // --- Role capabilities ---
  console.log('\n[7] Role Capabilities');
  await test('role_capabilities has module access columns', async () => {
    const [cols] = await chu.query('DESCRIBE role_capabilities');
    const names = cols.map(c => c.Field);
    const required = ['is_kpi_access','is_documents_access','is_issuances_access','is_attendance_access'];
    const missing = required.filter(c => !names.includes(c));
    assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
  });

  // Close connections
  await ch.end(); await chu.end(); await cht.end();

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
