/**
 * reset-for-uat.js
 * Run with: node scripts/reset-for-uat.js
 * Uses mysql2 from the backend node_modules.
 */

const path = require('path');
const fs = require('fs');

// Read .env from backend/
const envPath = path.join(__dirname, '..', 'backend', '.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const m = line.trim().match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});

const mysql2 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mysql2', 'promise'));

async function main() {
  const conn = await mysql2.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_DATABASE || 'rictms_compliance',
    multipleStatements: true,
  });

  console.log(`\nConnected to ${env.DB_DATABASE} @ ${env.DB_HOST}:${env.DB_PORT}\n`);

  const steps = [
    ['Disable FK checks',              'SET FOREIGN_KEY_CHECKS = 0'],
    ['Truncate ticket_comments',       'TRUNCATE TABLE ticket_comments'],
    ['Clear circular FK on tickets',   'UPDATE tickets SET duplicate_of_id = NULL WHERE duplicate_of_id IS NOT NULL'],
    ['Truncate tickets',               'TRUNCATE TABLE tickets'],
    ['Truncate ticket_keyword_rules',  'TRUNCATE TABLE ticket_keyword_rules'],
    ['Truncate tech_attendance',       'TRUNCATE TABLE tech_attendance'],
    ['Delete non-super_admin users',   "DELETE FROM users WHERE role != 'super_admin'"],
    ['Delete ALL role_definitions',    'DELETE FROM role_definitions'],
    ['Re-enable FK checks',            'SET FOREIGN_KEY_CHECKS = 1'],
  ];

  for (const [label, sql] of steps) {
    try {
      const [result] = await conn.execute(sql);
      const affected = result.affectedRows !== undefined ? ` (${result.affectedRows} rows)` : '';
      console.log(`  ✔  ${label}${affected}`);
    } catch (err) {
      console.error(`  ✘  ${label}: ${err.message}`);
    }
  }

  // Sanity checks
  console.log('\n── Verification ──────────────────────────────────');
  const checks = [
    ['Users remaining',        'SELECT COUNT(*) AS cnt FROM users'],
    ['Tickets remaining',      'SELECT COUNT(*) AS cnt FROM tickets'],
    ['Comments remaining',     'SELECT COUNT(*) AS cnt FROM ticket_comments'],
    ['Total role_defs',        'SELECT COUNT(*) AS cnt FROM role_definitions'],
  ];

  for (const [label, sql] of checks) {
    const [[row]] = await conn.execute(sql);
    console.log(`  ${label.padEnd(28)}: ${row.cnt}`);
  }

  await conn.end();
  console.log('\n✔ Reset complete.\n');
  console.log('Next steps:');
  console.log('  1. Restart the backend (npm run start:dev) to re-seed system role definitions');
  console.log('  2. Log in as super_admin');
  console.log('  3. Create the actual staff roles via Settings → Role Definitions');
  console.log('  4. Add users with the new roles\n');
}

main().catch(err => {
  console.error('\n✘ Reset failed:', err.message);
  process.exit(1);
});
