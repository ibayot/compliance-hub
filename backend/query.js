const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('compliance_hub.db');

db.all("SELECT id, email, role_code FROM users", [], (err, rows) => {
  if (err) console.error(err);
  console.log(rows);
});
