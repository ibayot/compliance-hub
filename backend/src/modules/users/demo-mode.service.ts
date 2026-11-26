import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

@Injectable()
export class DemoModeService {
  constructor(private readonly db: DataSource) {}

  async getState() {
    const [active] = await this.db.query(`
      SELECT run.id, run.requester_id AS requesterId, run.technician_id AS technicianId
      FROM demo_mode mode JOIN demo_runs run ON run.id = mode.active_run_id WHERE mode.id = 1
    `);
    const retained = await this.db.query(`
      SELECT id, DATE_FORMAT(purge_after, '%Y-%m-%dT%H:%i:%s.000Z') AS purgeAfter
      FROM demo_runs WHERE closed_at IS NOT NULL AND purged_at IS NULL ORDER BY opened_at DESC
    `);
    const candidates = await this.db.query(`
      SELECT id, email, LOWER(TRIM(last_name)) AS demoRole
      FROM users WHERE active = 1 AND LOWER(TRIM(first_name)) = 'demo' AND
        LOWER(TRIM(last_name)) IN ('user', 'technician')
      ORDER BY id
    `);
    return { active: active ?? null, retained, candidates };
  }

  async enable(requesterId: number, technicianId: number, administratorId: number) {
    if (![requesterId, technicianId].every(id => Number.isSafeInteger(id) && id > 0) ||
        new Set([requesterId, technicianId, administratorId]).size !== 3) {
      throw new BadRequestException('Choose two distinct, dedicated demo accounts.');
    }
    await this.db.transaction(async manager => {
      const [mode] = await manager.query('SELECT active_run_id FROM demo_mode WHERE id = 1 FOR UPDATE');
      if (!mode) throw new ServiceUnavailableException('Demo Mode has not been initialized.');
      if (mode.active_run_id) throw new ConflictException('Turn off the current demo before starting another.');
      const accounts: Array<{ id: number; first_name: string; last_name: string }> = await manager.query(`
        SELECT id, first_name, last_name FROM users
        WHERE id IN (?, ?) AND active = 1 ORDER BY id FOR UPDATE
      `, [requesterId, technicianId]);
      const matches = (id: number, last: string) => accounts.some(account =>
        Number(account.id) === id && account.first_name?.trim().toLowerCase() === 'demo' &&
        account.last_name?.trim().toLowerCase() === last);
      if (!matches(requesterId, 'user') || !matches(technicianId, 'technician')) {
        throw new BadRequestException('Choose active accounts named Demo User and Demo Technician.');
      }
      const runId = randomUUID();
      await manager.query('INSERT IGNORE INTO demo_accounts (user_id) VALUES (?), (?)', [requesterId, technicianId]);
      await manager.query(`
        INSERT INTO demo_runs (id, requester_id, technician_id, opened_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))
      `, [runId, requesterId, technicianId]);
      await manager.query('UPDATE demo_mode SET active_run_id = ? WHERE id = 1', [runId]);
    });
    return this.getState();
  }

  async disable() {
    await this.db.transaction(async manager => {
      const [mode] = await manager.query('SELECT active_run_id FROM demo_mode WHERE id = 1 FOR UPDATE');
      if (!mode?.active_run_id) return;
      await manager.query(`
        UPDATE demo_runs SET closed_at = UTC_TIMESTAMP(3), purge_after = UTC_TIMESTAMP(3) + INTERVAL 7 DAY
        WHERE id = ? AND closed_at IS NULL
      `, [mode.active_run_id]);
      await manager.query('UPDATE demo_mode SET active_run_id = NULL WHERE id = 1');
    });
    return this.getState();
  }

  async expired() {
    return this.db.query(`
      SELECT id FROM demo_runs WHERE purged_at IS NULL AND purge_after <= UTC_TIMESTAMP(3)
      ORDER BY purge_after LIMIT 20
    `);
  }

  async markPurged(id: string) {
    await this.db.query(`
      UPDATE demo_runs SET purged_at = UTC_TIMESTAMP(3)
      WHERE id = ? AND purged_at IS NULL AND purge_after <= UTC_TIMESTAMP(3)
    `, [id]);
    return { acknowledged: true };
  }
}
