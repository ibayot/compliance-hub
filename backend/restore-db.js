const fs = require('fs');
const mysql = require('mysql2/promise');

async function restoreDump(conn, dbName, dumpFile) {
  console.log(`Restoring ${dbName} from ${dumpFile}...`);
  if (!fs.existsSync(dumpFile)) {
    console.error(`Dump file not found: ${dumpFile}`);
    return;
  }
  
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.query(`USE \`${dbName}\``);
  
  const sqlContent = fs.readFileSync(dumpFile, 'utf8');
  // Simple split by ; is not safe for dumps because of trigger/stored procedure bodies or strings containing semicolons.
  // But wait, mysqldump creates standard SQL. Let's try splitting by ; and if it fails, we will use mysql cli via child_process if available.
  // We can't use mysql cli because it's not in PATH.
  
  // Let's use string manipulation to extract queries, or simply pass the whole script to conn.query if multipleStatements: true is enabled!
  try {
    await conn.query(sqlContent);
    console.log(`Successfully restored ${dbName}`);
  } catch (e) {
    console.error(`Error restoring ${dbName}:`, e.message);
  }
}

async function run() {
  try {
    const conn = await mysql.createConnection({ host: 'localhost', user: 'root', multipleStatements: true });
    
    await restoreDump(conn, '02_db_stg_compliance_hub_users', 'C:\\\\Users\\\\mjdibay\\\\Documents\\\\dumps\\\\compliance-users-copy.sql');
    await restoreDump(conn, '02_db_stg_compliance_hub_ticketing', 'C:\\\\Users\\\\mjdibay\\\\Documents\\\\dumps\\\\compliance-ticketing-copy.sql');
    
    console.log('Done restoring databases.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
