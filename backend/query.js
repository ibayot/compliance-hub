const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'admin',
    database: '02_db_stg_compliance_hub_ticketing'
  });
  const [rows] = await conn.execute("SELECT COUNT(*) as c FROM tickets WHERE assigned_to_id = 6 AND status IN ('open', 'assigned', 'in_progress')");
  console.log(rows);
  await conn.end();
}
run();
