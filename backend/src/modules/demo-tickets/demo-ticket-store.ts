import { Injectable, OnApplicationShutdown, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { createPool, Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export type DemoQueryTarget = Pool | PoolConnection;

@Injectable()
export class DemoTicketStore implements OnApplicationShutdown {
  private pool?: Pool;

  get configured() {
    return Boolean(process.env.DEMO_DB_USERNAME && process.env.TICKETING_DB_DATABASE &&
      (process.env.DEMO_DB_PASSWORD_FILE || process.env.DEMO_DB_PASSWORD) &&
      process.env.DEMO_DB_USERNAME !== process.env.DB_USERNAME);
  }

  get db(): Pool {
    if (this.pool) return this.pool;
    if (!this.configured) throw new ServiceUnavailableException('Demo ticket storage has not been configured.');
    let password: string;
    try {
      password = process.env.DEMO_DB_PASSWORD_FILE
        ? readFileSync(process.env.DEMO_DB_PASSWORD_FILE, 'utf8').replace(/\r?\n$/, '')
        : process.env.DEMO_DB_PASSWORD!;
    } catch {
      throw new ServiceUnavailableException('Demo ticket storage credentials could not be loaded.');
    }
    if (!password) throw new ServiceUnavailableException('Demo ticket storage credentials are missing.');
    this.pool = createPool({
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
      user: process.env.DEMO_DB_USERNAME, password, database: process.env.TICKETING_DB_DATABASE,
      timezone: 'Z', dateStrings: true, connectionLimit: 4, queueLimit: 20, connectTimeout: 5000,
    });
    return this.pool;
  }

  async rows<T>(db: DemoQueryTarget, sql: string, params: Array<string | number | null> = []): Promise<T[]> {
    const [rows] = await db.execute<RowDataPacket[]>(sql, params);
    return rows as unknown as T[];
  }

  async write(db: DemoQueryTarget, sql: string, params: Array<string | number | null> = []) {
    const [result] = await db.execute<ResultSetHeader>(sql, params);
    return result;
  }

  async transaction<T>(callback: (db: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async onApplicationShutdown() { await this.pool?.end(); }
}
