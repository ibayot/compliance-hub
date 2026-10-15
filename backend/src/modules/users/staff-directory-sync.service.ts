import { Injectable, Logger, OnApplicationBootstrap, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { createConnection } from 'mysql2/promise';
import {
  StaffDirectoryStore,
  staffNameKey,
} from '../../shared/staff-directory/staff-directory.store';
import { EventBusService } from '../../common/events/event-bus.service';
import { SSE_EVENT_CHANNEL } from '../../common/events/sse.service';
import { createHash } from 'crypto';

@Injectable()
export class StaffDirectorySyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StaffDirectorySyncService.name);
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly store: StaffDirectoryStore,
    private readonly events: EventBusService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.enabled()) return;
    const timer = setTimeout(
      () =>
        void this.run().catch((e) => this.logger.error(`Staff sync failed: ${e.code || e.name}`)),
      15_000,
    );
    timer.unref?.();
  }
  @Cron('40 2 * * *', { timeZone: 'Asia/Manila' })
  async scheduled(): Promise<void> {
    if (this.enabled())
      await this.run().catch((e) => this.logger.error(`Staff sync failed: ${e.code || e.name}`));
  }
  private enabled(): boolean {
    return String(this.config.get('UMS_STAFF_SYNC_ENABLED') ?? 'false').toLowerCase() === 'true';
  }
  private value(key: string, fallback: string): any {
    return this.config.get(key) ?? this.config.get(fallback);
  }
  private async source(): Promise<any[]> {
    const database = String(this.config.get('UMS_DB_DATABASE') || '');
    const view = String(this.config.get('UMS_STAFF_VIEW') || 'vStaffBasicInfo');
    if (!/^[A-Za-z0-9_]+$/.test(database) || !/^[A-Za-z0-9_]+$/.test(view))
      throw new BadRequestException('Configure a valid UMS database and staff view.');
    const connection = await createConnection({
      host: this.value('UMS_DB_HOST', 'DB_HOST'),
      port: Number(this.value('UMS_DB_PORT', 'DB_PORT') || 3306),
      user: this.value('UMS_DB_USERNAME', 'DB_USERNAME'),
      password: this.value('UMS_DB_PASSWORD', 'DB_PASSWORD'),
      database,
      connectTimeout: 10000,
    });
    try {
      const [columns]: any = await connection.query(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
        [database, view],
      );
      const names = new Set(columns.map((c: any) => c.COLUMN_NAME));
      const required = [
        'staff_id',
        'last_name',
        'first_name',
        'middle_name',
        'suffix',
        'section_name',
        'staff_is_active',
        'wh_is_active',
      ];
      if (required.some((c) => !names.has(c)))
        throw new BadRequestException(
          'The UMS staff view is missing required identity or active-status columns.',
        );
      const position = names.has('position')
        ? 'position'
        : names.has('position_name')
          ? 'position_name'
          : null;
      if (!position)
        throw new BadRequestException('The UMS staff view needs position or position_name.');
      const [rows]: any = await connection.query(
        `SELECT CAST(staff_id AS CHAR) staff_id,last_name,first_name,middle_name,suffix,\`${position}\` position_full,section_name FROM \`${view}\` WHERE staff_is_active=1 AND wh_is_active=1`,
      );
      return rows;
    } finally {
      await connection.end();
    }
  }

  async run(dryRun = false): Promise<any> {
    const source = await this.source(); // Fail before writing if source is unavailable.
    const s = this.store.schema();
    const lockName =
      'compliance_hub_staff_sync_' + createHash('sha256').update(s).digest('hex').slice(0, 24);
    const runner = this.db.createQueryRunner();
    await runner.connect();
    let locked = false;
    try {
      const [lock] = await runner.query('SELECT GET_LOCK(?,0) acquired', [lockName]);
      if (Number(lock.acquired) !== 1) return { busy: true };
      locked = true;
      await runner.startTransaction();
      const users = await runner.query(
        `SELECT id,staff_id,first_name,middle_name,last_name,suffix,position_full FROM ${s}.users`,
      );
      const units = await runner.query(
        `SELECT id,name,active,has_reportorial_requirements FROM ${s}.units`,
      );
      const norm = (v: any) =>
        String(v ?? '')
          .trim()
          .replace(/\s+/g, ' ');
      const unitMap = new Map<string, any>(units.map((u: any) => [norm(u.name).toLowerCase(), u]));
      const byStaff = new Map<string, any>(
        users.filter((u: any) => u.staff_id).map((u: any) => [String(u.staff_id), u]),
      );
      const unmatchedNames = new Set(
        users.filter((u: any) => !String(u.staff_id ?? '').trim()).map(staffNameKey),
      );
      const grouped = new Map<string, any[]>();
      const result = {
        sourceRows: source.length,
        insertedPending: 0,
        updatedPositions: 0,
        reviewRequired: 0,
        invalidRows: 0,
        discoveredUnits: 0,
      };
      for (const raw of source) {
        const p: any = {};
        for (const key of [
          'staff_id',
          'first_name',
          'last_name',
          'middle_name',
          'suffix',
          'position_full',
          'section_name',
        ])
          p[key] = norm(raw[key]) || null;
        if (
          !/^\d{1,6}$/.test(p.staff_id || '') ||
          !p.first_name ||
          !p.last_name ||
          !p.section_name ||
          ['first_name', 'last_name', 'middle_name', 'position_full', 'section_name'].some(
            (k) => (p[k]?.length || 0) > 100,
          ) ||
          (p.suffix?.length || 0) > 5
        ) {
          result.invalidRows++;
          continue;
        }
        const group = grouped.get(p.staff_id) || [];
        group.push(p);
        grouped.set(p.staff_id, group);
      }
      const seen: string[] = [];
      for (const [staffId, group] of grouped) {
        const p = group[0];
        seen.push(staffId);
        const conflicting = new Set(group.map((r) => JSON.stringify(r))).size > 1;
        const existing = byStaff.get(staffId);
        let reason = conflicting
          ? 'Conflicting active source records for this staff ID.'
          : !existing && unmatchedNames.has(staffNameKey(p))
            ? 'Possible existing account without staff ID.'
            : null;
        let unit = unitMap.get(p.section_name.toLowerCase());
        if (!conflicting && !unit) {
          result.discoveredUnits++;
          unit = { id: null, active: 1, has_reportorial_requirements: 0 };
          if (!dryRun) {
            const inserted = await runner.query(
              `INSERT INTO ${s}.units (name,description,active,has_reportorial_requirements) VALUES (?,'Synchronized from UMS staff directory',1,0)`,
              [p.section_name],
            );
            unit.id = inserted.insertId;
          }
          unitMap.set(p.section_name.toLowerCase(), unit);
        }
        if (!conflicting && unit && !unit.active)
          reason = 'The corresponding application unit is inactive.';
        if (!existing && !conflicting && unit?.has_reportorial_requirements)
          reason = 'Reportorial-unit staff require authorized account setup.';
        if (reason) result.reviewRequired++;
        if (
          existing &&
          !conflicting &&
          p.position_full &&
          p.position_full !== existing.position_full
        ) {
          result.updatedPositions++;
          if (!dryRun)
            await runner.query(`UPDATE ${s}.users SET position_full=? WHERE id=? AND staff_id=?`, [
              p.position_full,
              existing.id,
              staffId,
            ]);
        }
        const [prior] = await runner.query(
          `SELECT id FROM ${s}.ums_staff_directory WHERE staff_id=?`,
          [staffId],
        );
        if (!prior && !existing) result.insertedPending++;
        if (!dryRun)
          await runner.query(
            `INSERT INTO ${s}.ums_staff_directory (staff_id,last_name,first_name,middle_name,suffix,position_full,unit_id,available,review_reason,linked_user_id,synced_at) VALUES (?,?,?,?,?,?,?,1,?,?,NOW(6)) ON DUPLICATE KEY UPDATE last_name=VALUES(last_name),first_name=VALUES(first_name),middle_name=VALUES(middle_name),suffix=VALUES(suffix),position_full=VALUES(position_full),unit_id=VALUES(unit_id),available=1,review_reason=VALUES(review_reason),linked_user_id=VALUES(linked_user_id),synced_at=NOW(6)`,
            [
              staffId,
              p.last_name,
              p.first_name,
              p.middle_name,
              p.suffix,
              p.position_full,
              unit?.id ?? null,
              reason,
              existing?.id ?? null,
            ],
          );
      }
      // Missing rows only disappear from pending selections. Existing application accounts remain untouched.
      if (!dryRun) {
        if (seen.length)
          await runner.query(
            `UPDATE ${s}.ums_staff_directory SET available=0 WHERE staff_id NOT IN (?)`,
            [seen],
          );
        else await runner.query(`UPDATE ${s}.ums_staff_directory SET available=0`);
        await runner.commitTransaction();
        void this.events.publish(SSE_EVENT_CHANNEL, {
          sourceId: 'users-staff-sync',
          event: { type: 'USER_DIRECTORY_UPDATED', payload: { action: 'updated' } },
        });
      } else await runner.rollbackTransaction();
      this.logger.log(
        `UMS staff directory ${dryRun ? 'preview' : 'sync'}: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (e) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw e;
    } finally {
      if (locked) await runner.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => undefined);
      await runner.release();
    }
  }

  async review(): Promise<any[]> {
    return this.db.query(
      `SELECT staff_id,last_name,first_name,middle_name,suffix,review_reason FROM ${this.store.schema()}.ums_staff_directory WHERE available=1 AND review_reason IS NOT NULL ORDER BY last_name,first_name`,
    );
  }
}
