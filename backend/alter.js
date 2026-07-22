const mysql = require('mysql2/promise');
async function run() {
  const host = process.env.DB_HOST_OVERRIDE || process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.TICKETING_DB_DATABASE || process.env.DB_DATABASE || '02_db_stg_compliance_hub_ticketing';

  const conn = await mysql.createConnection({ host, port, user, password, database });
  await conn.query("ALTER TABLE tickets MODIFY COLUMN issue_type VARCHAR(100) NOT NULL DEFAULT 'other'");
  console.log('ALTER success');
  await conn.end();
}
run();
