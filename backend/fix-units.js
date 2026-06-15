const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    multipleStatements: true,
  });

  try {
    // =========================================================
    // 1. Create the units table in compliance_hub_users (the source of truth)
    // =========================================================
    console.log('\n=== Creating units table in compliance_hub_users ===');
    await conn.execute('USE compliance_hub_users');

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`units\` (
        \`id\`          INT           NOT NULL AUTO_INCREMENT,
        \`name\`        VARCHAR(255)  NOT NULL,
        \`description\` TEXT          NULL,
        \`active\`      TINYINT(1)    NOT NULL DEFAULT 1,
        \`created_at\`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`units_name_unique\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  units table created (or already exists)');

    // Seed basic units
    await conn.execute(`
      INSERT IGNORE INTO \`units\` (id, name, description, active, created_at) VALUES
      (1, 'Information Technology Unit', 'Handles ICT compliance and digital services.', 1, NOW()),
      (2, 'Finance Unit', 'Handles financial compliance and reporting.', 1, NOW())
    `);
    console.log('  Seeded units data');

    // Add back the user_unit_access seed for admin
    await conn.execute(`INSERT IGNORE INTO user_unit_access (user_id, unit_id) VALUES (1, 1), (1, 2)`);
    console.log('  Seeded user_unit_access for admin');

    // =========================================================
    // 2. Fix compliance_hub_users views (units view gone - recreate pointing to the actual table)
    // =========================================================
    console.log('\n=== Verifying compliance_hub_users views ===');
    const [views] = await conn.execute(
      `SELECT TABLE_NAME, DEFINER FROM information_schema.VIEWS WHERE TABLE_SCHEMA='compliance_hub_users'`
    );
    console.log('  Current views:', JSON.stringify(views));

    // =========================================================
    // 3. Fix compliance_hub views (cross-db views pointing to compliance_hub_users)
    // =========================================================
    console.log('\n=== Checking compliance_hub cross-DB views ===');
    await conn.execute('USE compliance_hub');

    // Check if compliance_hub.users view is working  
    try {
      const [usersTest] = await conn.execute('SELECT COUNT(*) as cnt FROM users');
      console.log('  compliance_hub.users view works, count:', usersTest[0].cnt);
    } catch(e) {
      console.error('  compliance_hub.users view broken:', e.message);
      // Recreate users view pointing to compliance_hub_users.users
      await conn.execute('DROP VIEW IF EXISTS `users`');
      await conn.execute(`
        CREATE DEFINER=\`root\`@\`localhost\`
        SQL SECURITY INVOKER
        VIEW \`users\` AS
        SELECT u.id, u.email, u.passwordHash, u.first_name, u.last_name, u.role, u.active, u.created_at, u.updated_at
        FROM compliance_hub_users.users u
      `);
      console.log('  Recreated compliance_hub.users view');
    }

    // =========================================================
    // 4. Also create units view in compliance_hub pointing to compliance_hub_users
    // =========================================================
    await conn.execute('DROP VIEW IF EXISTS `units`');
    try {
      await conn.execute(`
        CREATE DEFINER=\`root\`@\`localhost\`
        SQL SECURITY INVOKER
        VIEW \`units\` AS
        SELECT u.id, u.name, u.description, u.active, u.created_at
        FROM compliance_hub_users.units u
      `);
      console.log('  Created compliance_hub.units view pointing to compliance_hub_users.units');
    } catch(e) {
      console.error('  Could not create units view in compliance_hub:', e.message);
    }

    // =========================================================
    // 5. Verify the fix
    // =========================================================
    console.log('\n=== Verification ===');
    await conn.execute('USE compliance_hub_users');
    const [unitRows] = await conn.execute('SELECT * FROM units');
    console.log('  compliance_hub_users.units:', unitRows.map(r => r.name));

    await conn.execute('USE compliance_hub');
    try {
      const [unitRowsCH] = await conn.execute('SELECT * FROM units');
      console.log('  compliance_hub.units view:', unitRowsCH.map(r => r.name));
    } catch(e) {
      console.error('  compliance_hub.units view error:', e.message);
    }

    const [views2] = await conn.execute(
      `SELECT TABLE_NAME, DEFINER FROM information_schema.VIEWS WHERE TABLE_SCHEMA IN ('compliance_hub', 'compliance_hub_users')`
    );
    console.log('  All views:', JSON.stringify(views2, null, 2));

    console.log('\n=== Done! ===');
  } catch (e) {
    console.error('Error:', e.message, e.sqlMessage || '');
  } finally {
    await conn.end();
  }
}

run();
