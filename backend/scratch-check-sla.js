const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || '02_db_stg_compliance_hub_ticketing',
});

async function run() {
  await AppDataSource.initialize();
  const configs = await AppDataSource.query(
    `SELECT * FROM ticketing_configs LIMIT 1`
  );
  console.log('Configs:', configs);
  process.exit(0);
}

run().catch(console.error);
