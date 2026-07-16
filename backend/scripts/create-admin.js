const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: '02_db_stg_compliance_hub_users'
  });

  try {
    // Check if user exists
    const [rows] = await connection.execute("SELECT * FROM users WHERE email = 'testadmin@dswd.gov.ph'");
    if (rows.length === 0) {
      // Hash of "Admin@123" is $2b$10$sihjC.EXqMnXtS7u6IMkmeUGtQAyNysaGLMTyKz5sfcdJrAiQcBz2
      await connection.execute(`
        INSERT INTO users (email, passwordHash, first_name, last_name, role, active, created_at, updated_at) 
        VALUES ('testadmin@dswd.gov.ph', '$2b$10$sihjC.EXqMnXtS7u6IMkmeUGtQAyNysaGLMTyKz5sfcdJrAiQcBz2', 'Test', 'Admin', 'super_admin', 1, NOW(), NOW())
      `);
      console.log('Inserted testadmin@dswd.gov.ph with password Admin@123');
    } else {
      console.log('User already exists');
    }
  } catch (err) {
    console.error('Failed', err);
  } finally {
    await connection.end();
  }
}
run();
