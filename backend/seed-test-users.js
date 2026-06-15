const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'compliance_hub_users'
  });

  const defaultPassword = await bcrypt.hash('password123', 10);
  const passwordSpecial = await bcrypt.hash('Password12345', 10);
  const passwordOasswird = await bcrypt.hash('Oasswird12345', 10);

  const users = [
    { email: 'admin@rictms.gov.ph', role: 'super_admin', pass: defaultPassword },
    { email: 'jmmmaguigad@dswd.gov.ph', role: 'cybersec', pass: passwordSpecial },
    { email: 'mpmabazza@dswd.gov.ph', role: 'desktop_sr', pass: defaultPassword },
    { email: 'jrcardona@dswd.gov.ph', role: 'technician', pass: passwordOasswird },
    { email: 'test@dswd.gov.ph', role: 'user', pass: defaultPassword }
  ];

  for (const u of users) {
    const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [u.email]);
    if (rows.length > 0) {
      await connection.execute('UPDATE users SET passwordHash = ?, role = ?, active = 1 WHERE email = ?', [u.pass, u.role, u.email]);
      console.log(`Updated user ${u.email}`);
    } else {
      await connection.execute('INSERT INTO users (email, passwordHash, role, active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())', [u.email, u.pass, u.role]);
      console.log(`Created user ${u.email}`);
    }
  }

  await connection.end();
}

main().catch(console.error);
