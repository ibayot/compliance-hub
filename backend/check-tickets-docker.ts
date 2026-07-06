import { DataSource } from 'typeorm';
const ds = new DataSource({
  type: 'mysql',
  host: '127.0.0.1',
  port: 3307,
  username: 'root',
  password: 'admin',
  database: '02_db_stg_compliance_hub_ticketing'
});
ds.initialize().then(async () => {
  const res = await ds.query(`SELECT ticket_number, created_at, assigned_to_id FROM tickets ORDER BY id DESC LIMIT 5;`);
  console.log(res);
  process.exit(0);
}).catch(console.error);
