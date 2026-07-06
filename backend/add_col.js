const mysql = require('mysql2/promise');
async function run() {
  const columns = [
    'staff_id VARCHAR(255) NULL',
    'position VARCHAR(255) NULL',
    'position_full VARCHAR(255) NULL',
    'designation VARCHAR(255) NULL',
    'ticket_main_focal BOOLEAN DEFAULT FALSE',
    'ticket_technician BOOLEAN DEFAULT FALSE',
    'google_sub VARCHAR(255) NULL',
    'mfa_code VARCHAR(255) NULL',
    'mfa_code_expires_at DATETIME NULL',
    'mfa_last_verified_at DATETIME NULL'
  ];
  try {
    const conn = await mysql.createConnection({ host: 'localhost', user: 'root', database: '02_db_stg_compliance_hub_users' });
    for (const col of columns) {
      const colName = col.split(' ')[0];
      try {
        await conn.query(`ALTER TABLE users ADD COLUMN ${col};`);
        console.log(`Added ${colName}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists: ${colName}`);
        } else {
          console.error(`Error adding ${colName}:`, err.message);
        }
      }
    }
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
