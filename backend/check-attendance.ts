import { DataSource } from 'typeorm';
const ds = new DataSource({
  type: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  username: 'root',
  password: '',
  database: '02_db_stg_compliance_hub_ticketing'
});
ds.initialize().then(async () => {
  const res = await ds.query(`SELECT * FROM attendance ORDER BY date DESC LIMIT 10;`);
  console.log(res);
  process.exit(0);
}).catch(console.error);
