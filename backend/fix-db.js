const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const PASSWORD = 'password123';
const HASH_ROUNDS = 10;

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    multipleStatements: true,
  });

  try {
    // =========================================================
    // 1. Fix broken views in compliance_hub_users
    // =========================================================
    console.log('\n=== Fixing views in compliance_hub_users ===');
    await conn.execute('USE compliance_hub_users');

    // Get view definitions for the broken views
    const [viewsBroken] = await conn.execute(
      `SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA='compliance_hub_users'`
    );
    for (const { TABLE_NAME } of viewsBroken) {
      const [[viewDef]] = await conn.execute(`SHOW CREATE VIEW \`${TABLE_NAME}\``);
      let createSql = viewDef['Create View'];
      // Replace empty definer with root@localhost and add SQL SECURITY INVOKER
      createSql = createSql
        .replace(/CREATE ALGORITHM=UNDEFINED DEFINER=`` SQL SECURITY DEFINER/, 
                 'CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY INVOKER');
      await conn.execute(`DROP VIEW IF EXISTS \`${TABLE_NAME}\``);
      await conn.execute(createSql);
      console.log(`  Fixed view: ${TABLE_NAME}`);
    }

    // =========================================================
    // 2. Fix broken views in compliance_hub 
    // =========================================================
    console.log('\n=== Fixing views in compliance_hub ===');
    await conn.execute('USE compliance_hub');

    const [viewsBroken2] = await conn.execute(
      `SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA='compliance_hub'`
    );
    for (const { TABLE_NAME } of viewsBroken2) {
      const [[viewDef]] = await conn.execute(`SHOW CREATE VIEW \`${TABLE_NAME}\``);
      let createSql = viewDef['Create View'];
      createSql = createSql
        .replace(/CREATE ALGORITHM=UNDEFINED DEFINER=`` SQL SECURITY DEFINER/, 
                 'CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY INVOKER');
      await conn.execute(`DROP VIEW IF EXISTS \`${TABLE_NAME}\``);
      await conn.execute(createSql);
      console.log(`  Fixed view: ${TABLE_NAME}`);
    }

    // =========================================================
    // 3. Add test accounts to compliance_hub_users if missing
    // =========================================================
    console.log('\n=== Ensuring test accounts exist ===');
    await conn.execute('USE compliance_hub_users');

    const hash = await bcrypt.hash(PASSWORD, HASH_ROUNDS);
    console.log('  Generated bcrypt hash for password123');

    // Test accounts needed for E2E tests
    const testAccounts = [
      // [id, email, first_name, last_name, role]
      [1,   'admin@rictms.gov.ph',    'System',       'Admin',    'super_admin'],
      [5,   'jcbucayu@dswd.gov.ph',   'Jaylord',      'Bucayu',   'dev_lead'],     // Escalation Focal (dev_lead is_escalation_focal=1)
      [7,   'mpmabazza@dswd.gov.ph',  'Mylord',       'Mabazza',  'desktop_sr'],   // Senior Desktop Tech
      [8,   'fggarcia@dswd.gov.ph',   'Ferdinand',    'Garcia',   'desktop_sr'],   // Senior Desktop Tech
      [10,  'jmmmaguigad@dswd.gov.ph','John Manuel',  'Maguigad', 'cybersec'],     // Escalation Focal (cybersec)
      [95,  'test@dswd.gov.ph',       'Test',         'User',     'user'],         // Regular user (ticket submitter)
      [6,   'jrcardona@dswd.gov.ph',  'Jaymark',      'Cardona',  'desktop_jr'],   // Junior Desktop Tech
      [3,   'gmjavierjr@dswd.gov.ph', 'Godofredo',    'Javier',   'it_support_jr'],// Junior IT Support
    ];

    for (const [id, email, first_name, last_name, role] of testAccounts) {
      await conn.execute(
        `INSERT INTO users (id, email, passwordHash, first_name, last_name, role, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE email=VALUES(email), first_name=VALUES(first_name), last_name=VALUES(last_name), role=VALUES(role)`,
        [id, email, hash, first_name, last_name, role]
      );
      console.log(`  Upserted user: ${email} (${role})`);
    }

    // =========================================================
    // 4. Update ALL passwords to password123
    // =========================================================
    console.log('\n=== Updating all passwords to password123 ===');
    const [updated] = await conn.execute(
      `UPDATE users SET passwordHash = ?`,
      [hash]
    );
    console.log(`  Updated ${updated.affectedRows} user(s) passwords`);

    // =========================================================
    // 5. Also update passwords in compliance_hub_ticketing.users
    // =========================================================
    console.log('\n=== Syncing passwords to compliance_hub_ticketing.users ===');
    await conn.execute('USE compliance_hub_ticketing');
    const [updated2] = await conn.execute(
      `UPDATE users SET password_hash = ? WHERE password_hash IS NOT NULL`,
      [hash]
    ).catch(async () => {
      // Try alternate column name
      return await conn.execute(`UPDATE users SET passwordHash = ?`, [hash]);
    });
    console.log(`  Updated ${updated2.affectedRows} ticketing user(s) passwords`);

    // =========================================================
    // 6. Update seed-data.sql to add test accounts
    // =========================================================
    console.log('\n=== All done! ===');
    console.log('Views fixed, test accounts added, all passwords set to "password123"');

  } catch (e) {
    console.error('Error:', e.message, e.sqlMessage || '');
  } finally {
    await conn.end();
  }
}

run();
