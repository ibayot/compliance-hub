import { DataSource } from 'typeorm';
const ds = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '',
  database: '02_db_stg_compliance_hub'
});
ds.initialize().then(async () => {
  const res = await ds.query(`SELECT ticket_number, created_at, assigned_to_id FROM tickets ORDER BY id DESC LIMIT 5;`);
  console.log(res);
  process.exit(0);
}).catch(console.error);
