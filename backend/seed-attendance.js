const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'compliance_hub_users'
  });

  const emails = ['jrcardona@dswd.gov.ph', 'mpmabazza@dswd.gov.ph', 'jmmmaguigad@dswd.gov.ph'];
  const today = new Date().toISOString().split('T')[0];

  for (const email of emails) {
    const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      const userId = users[0].id;
      // check if attendance exists
      const [att] = await connection.execute('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [userId, today]);
      if (att.length === 0) {
        try {
          await connection.execute('INSERT INTO attendance (user_id, date, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', [userId, today, 'present']);
          console.log(`Marked ${email} as present for ${today}`);
        } catch(e) {
          console.log(`Failed to mark attendance for ${email}:`, e.message);
        }
      } else {
        console.log(`${email} already present today.`);
      }
    }
  }

  await connection.end();
}

main().catch(console.error);
