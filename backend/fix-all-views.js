const mysql = require('mysql2/promise');

async function fixAllViews() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    multipleStatements: true,
  });

  const schemas = ['compliance_hub', 'compliance_hub_users', 'compliance_hub_ticketing'];

  for (const schema of schemas) {
    await conn.execute(`USE \`${schema}\``);
    const [views] = await conn.execute(
      `SELECT TABLE_NAME, DEFINER FROM information_schema.VIEWS WHERE TABLE_SCHEMA=?`,
      [schema]
    );

    for (const view of views) {
      if (view.DEFINER === '' || view.DEFINER === '@') {
        const [[viewDef]] = await conn.execute(`SHOW CREATE VIEW \`${view.TABLE_NAME}\``);
        let createSql = viewDef['Create View'];

        // Fix the definer
        createSql = createSql
          .replace(/CREATE ALGORITHM=UNDEFINED DEFINER=`` SQL SECURITY DEFINER/g,
                   'CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY INVOKER');

        await conn.execute(`DROP VIEW IF EXISTS \`${view.TABLE_NAME}\``);
        await conn.execute(createSql);
        console.log(`  [${schema}] Fixed view: ${view.TABLE_NAME}`);
      } else {
        console.log(`  [${schema}] View OK: ${view.TABLE_NAME} (${view.DEFINER})`);
      }
    }
  }

  // Verify
  console.log('\n=== Final view status ===');
  const [allViews] = await conn.execute(
    `SELECT TABLE_SCHEMA, TABLE_NAME, DEFINER FROM information_schema.VIEWS
     WHERE TABLE_SCHEMA IN ('compliance_hub','compliance_hub_users','compliance_hub_ticketing')`
  );
  for (const v of allViews) {
    const ok = v.DEFINER !== '' && v.DEFINER !== '@';
    console.log(`  ${ok ? '✓' : '✗'} [${v.TABLE_SCHEMA}] ${v.TABLE_NAME} — definer: ${v.DEFINER || '(empty)'}`);
  }

  await conn.end();
  console.log('\nDone!');
}

fixAllViews().catch(e => console.error('Error:', e.message));
