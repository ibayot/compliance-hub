const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
  const sqlFile = 'src/database/schema.sql';
  if (!fs.existsSync(sqlFile)) {
    console.error('File not found:', sqlFile);
    return;
  }
  
  const sqlStatements = fs.readFileSync(sqlFile, 'utf8')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${sqlStatements.length} statements...`);

  try {
    const conn = await mysql.createConnection({ host: 'localhost', user: 'root', multipleStatements: true });
    
    const dbs = [
      '02_db_stg_compliance_hub',
      '02_db_stg_compliance_hub_ticketing'
    ];
    
    for (const db of dbs) {
      console.log('Setting up database:', db);
      await conn.query(`USE \`${db}\`;`);
      for (const sql of sqlStatements) {
        try {
          await conn.query(sql);
        } catch (e) {
          if (!e.message.includes('already exists') && !e.message.includes('Duplicate column')) {
            console.error('Error executing statement:', sql.substring(0, 50) + '...', e.message);
          }
        }
      }
    }
    
    console.log('Database setup complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
