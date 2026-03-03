import { readFileSync } from 'fs';
import { join } from 'path';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_DATABASE || 'rictms_compliance';

  const sqlPath = join(__dirname, 'seed-data.sql');
  const sql = readFileSync(sqlPath, 'utf8').replace(/^\uFEFF/, '');

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  try {
    await connection.query(sql);

    const [[metricCountRow]] = await connection.query<any[]>(
      "SELECT COUNT(*) AS cnt FROM metric_templates WHERE is_active = 1",
    );
    const [[metricMapRow]] = await connection.query<any[]>(
      "SELECT COUNT(*) AS cnt FROM metric_applicability",
    );
    const [[pendingDocsRow]] = await connection.query<any[]>(
      "SELECT COUNT(*) AS cnt FROM documents WHERE status = 'pending' AND is_deleted = 0",
    );

    console.log('Seed completed successfully.');
    console.log(`Active metric templates: ${metricCountRow.cnt}`);
    console.log(`Metric applicability rows: ${metricMapRow.cnt}`);
    console.log(`Pending documents: ${pendingDocsRow.cnt}`);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('Seed failed:', error?.message || error);
  process.exit(1);
});
