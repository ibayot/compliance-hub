const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'admin',
    database: '02_db_stg_compliance_hub_ticketing'
  });
  
  const [rows] = await connection.query('DESCRIBE keyword_rules');
  console.log(rows);
  
  process.exit(0);
}

run().catch(console.error);
