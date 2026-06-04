const mysql = require('mysql2/promise');

async function fixView() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'compliance_hub_users',
    multipleStatements: true,
  });

  try {
    // Drop the broken view
    await conn.execute('DROP VIEW IF EXISTS `units`');
    console.log('Dropped old view');

    // Re-create with correct definer (SQL SECURITY INVOKER so any user can query it)
    await conn.execute(`
      CREATE DEFINER=\`root\`@\`localhost\`
      SQL SECURITY INVOKER
      VIEW \`units\` AS
      SELECT
        \`compliance_hub\`.\`units\`.\`id\`          AS \`id\`,
        \`compliance_hub\`.\`units\`.\`name\`        AS \`name\`,
        \`compliance_hub\`.\`units\`.\`description\` AS \`description\`,
        \`compliance_hub\`.\`units\`.\`active\`      AS \`active\`,
        \`compliance_hub\`.\`units\`.\`created_at\`  AS \`created_at\`
      FROM \`compliance_hub\`.\`units\`
    `);
    console.log('View re-created successfully with proper definer');

    // Verify
    const [rows] = await conn.execute('SELECT TABLE_NAME, DEFINER FROM information_schema.VIEWS WHERE TABLE_SCHEMA=\'compliance_hub_users\'');
    console.log('Views now:', JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Error:', e.message, e.sqlMessage);
  } finally {
    await conn.end();
  }
}

fixView();
