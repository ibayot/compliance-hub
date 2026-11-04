import { ConflictException, Injectable, Logger, OnApplicationBootstrap, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { createConnection, RowDataPacket } from 'mysql2/promise';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { auditContext } from '../../shared/audit/audit.context';
import {
  APP_NOTIFICATION_REQUESTED_EVENT,
  EventBusService,
} from '../../common/events/event-bus.service';
import { SSE_EVENT_CHANNEL } from '../../common/events/sse.service';
import { Unit } from '../units/entities/unit.entity';
import { User, UserRole } from './entities/user.entity';
import { UserUnitOverride } from './entities/user-unit-override.entity';

type UmsWorkHistoryRow = {
  staffId: string;
  sectionName: string;
};

export type UnitSyncResult = {
  discoveredUnits: number;
  updatedUsers: number;
  clearedOverrides: number;
  retainedOverrides: number;
  skippedAmbiguousStaff: number;
  skippedRestrictedAssignments: number;
};

@Injectable()
export class UnitSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UnitSyncService.name);
  private running = false;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Unit)
    private readonly unitsRepository: Repository<Unit>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.isEnabled()) return;

    // Do not delay service readiness for an external database. The same guarded
    // synchronization runs again on its daily schedule if startup access fails.
    const timer = setTimeout(() => {
      void this.synchronize().catch((error) => {
        this.logger.error(`Startup UMS unit synchronization failed: ${this.errorMessage(error)}`);
      });
    }, 10_000);
    timer.unref?.();
  }

  @Cron('30 2 * * *', { timeZone: 'Asia/Manila' })
  async scheduledSynchronization(): Promise<void> {
    if (!this.isEnabled()) return;
    await this.synchronize().catch((error) => {
      this.logger.error(`Scheduled UMS unit synchronization failed: ${this.errorMessage(error)}`);
    });
  }

  async synchronize(options: { manual?: boolean } = {}): Promise<UnitSyncResult> {
    const emptyResult: UnitSyncResult = {
      discoveredUnits: 0,
      updatedUsers: 0,
      clearedOverrides: 0,
      retainedOverrides: 0,
      skippedAmbiguousStaff: 0,
      skippedRestrictedAssignments: 0,
    };

    // The enable flag controls automatic runs. An authorized explicit action
    // uses the same configured source without enabling the automatic schedule.
    if (!options.manual && !this.isEnabled()) return emptyResult;
    if (this.running) {
      if (options.manual) throw new ConflictException('Unit synchronization is already running. Wait for it to finish before trying again.');
      this.logger.warn('Skipped overlapping UMS unit synchronization.');
      return emptyResult;
    }

    this.running = true;
    try {
      await this.assertTicketUnitSnapshotsReady();
      const rows = await this.loadActiveWorkHistory();
      const result = { ...emptyResult };
      const sectionsByKey = new Map<string, string>();
      const sectionsByStaff = new Map<string, Map<string, string>>();

      for (const row of rows) {
        const staffId = String(row.staffId ?? '').trim();
        const sectionName = this.normalizeDisplayName(row.sectionName);
        if (!staffId || !sectionName || sectionName.length > 100) continue;

        const sectionKey = this.normalizedKey(sectionName);
        sectionsByKey.set(sectionKey, sectionName);
        const staffSections = sectionsByStaff.get(staffId) ?? new Map<string, string>();
        staffSections.set(sectionKey, sectionName);
        sectionsByStaff.set(staffId, staffSections);
      }

      const existingUnits = await this.unitsRepository.find();
      const unitsByKey = new Map(
        existingUnits.map((unit) => [this.normalizedKey(unit.name), unit] as const),
      );

      for (const [sectionKey, sectionName] of sectionsByKey) {
        if (unitsByKey.has(sectionKey)) continue;

        const created = await this.unitsRepository.save(
          this.unitsRepository.create({
            name: sectionName,
            description: 'Synchronized from the active UMS work-history directory.',
            active: true,
            // UMS does not identify Compliance Hub reportorial units. New
            // sections are therefore regular units; existing restrictions
            // block RICTMS-role assignment until an administrator classifies
            // a section as reportorial in Units Management.
            hasReportorialRequirements: false,
          }),
        );
        unitsByKey.set(sectionKey, created);
        result.discoveredUnits += 1;
      }

      const staffIds = [...sectionsByStaff.keys()];
      if (staffIds.length === 0) {
        this.logResult(result);
        return result;
      }

      const users = await this.usersRepository.find({
        where: { staffId: In(staffIds), active: true },
        relations: ['units'],
      });
      for (const user of users) {
        const staffSections = sectionsByStaff.get(String(user.staffId).trim());
        if (!staffSections || staffSections.size !== 1) {
          if (staffSections && staffSections.size > 1) result.skippedAmbiguousStaff += 1;
          continue;
        }

        const [sectionKey] = staffSections.keys();
        const targetUnit = unitsByKey.get(sectionKey);
        if (!targetUnit?.active) continue;

        const outcome = await this.dataSource.transaction(async (manager) => {
          const managedUser = await manager.getRepository(User).findOne({
            where: { id: user.id, active: true },
            relations: ['units'],
            lock: { mode: 'pessimistic_write' },
          });
          if (!managedUser || String(managedUser.staffId).trim() !== String(user.staffId).trim()) return 'unchanged';
          const currentUnit = await manager.getRepository(Unit).findOne({ where: { id: targetUnit.id, active: true } });
          if (!currentUnit) return 'unchanged';
          const overrideRepo = manager.getRepository(UserUnitOverride);
          const override = await overrideRepo.findOne({ where: { userId: user.id } });
          const previousUnits = (managedUser.units || []).map(unit => unit.id);
          if (override) {
            if (override.unitId !== currentUnit.id || previousUnits.length !== 1 || previousUnits[0] !== currentUnit.id) return 'retained';
            await overrideRepo.delete({ userId: user.id });
            await this.auditUnitChange(manager, user.id, previousUnits, currentUnit.id, true);
            return 'cleared';
          }
          if (previousUnits.length === 1 && previousUnits[0] === currentUnit.id) return 'unchanged';
          if (Boolean(currentUnit.hasReportorialRequirements) !== (managedUser.role !== UserRole.USER)) return 'restricted';
          managedUser.units = [currentUnit];
          await manager.getRepository(User).save(managedUser);
          await this.auditUnitChange(manager, user.id, previousUnits, currentUnit.id, false);
          return 'updated';
        });
        if (outcome === 'retained') result.retainedOverrides += 1;
        if (outcome === 'cleared') { result.clearedOverrides += 1; this.emitUserDirectoryUpdated(user.id); }
        if (outcome === 'restricted') result.skippedRestrictedAssignments += 1;
        if (outcome !== 'updated') continue;
        result.updatedUsers += 1;
        this.emitUserDirectoryUpdated(user.id);
        void this.eventBus.publish(APP_NOTIFICATION_REQUESTED_EVENT, {
          userIds: [user.id],
          targetPath: '/admin/settings',
          eventType: 'unit_synchronized',
          message: `Your unit was updated to ${targetUnit.name} from the personnel directory.`,
        });
      }

      this.logResult(result);
      return result;
    } catch (error) {
      this.logger.error(`UMS unit synchronization failed: ${(error as { code?: string })?.code || 'source or storage unavailable'}`);
      throw new ServiceUnavailableException('Unit synchronization could not complete. Some earlier changes may have been saved. Refresh the user list and check the UMS connection before trying again.');
    } finally {
      this.running = false;
    }
  }

  private async assertTicketUnitSnapshotsReady(): Promise<void> {
    const database = process.env.TICKETING_DB_DATABASE?.trim();
    if (!database || !/^[A-Za-z0-9_]+$/.test(database)) throw new Error('Ticketing database is unavailable.');
    const [row] = await this.dataSource.query(`SELECT COUNT(*) AS pending FROM \`${database}\`.tickets WHERE requester_unit_snapshot IS NULL`);
    if (Number(row?.pending) !== 0) throw new Error('Ticket unit snapshots must be initialized before unit synchronization.');
  }

  private async auditUnitChange(manager: EntityManager, userId: number, previousUnitIds: number[], unitId: number, clearedOverride: boolean): Promise<void> {
    const auditDatabase = process.env.AUDIT_DB_DATABASE?.trim();
    if (!auditDatabase || !/^[A-Za-z0-9_]+$/.test(auditDatabase)) throw new Error('Audit database is unavailable.');
    const context = auditContext.getStore();
    await manager.query(`INSERT INTO \`${auditDatabase}\`.audit_log
      (user_email, action, database_name, table_name, operation_type, row_id, description, old_values, new_values, ip_address, session_id)
      VALUES (?, 'UPDATE', ?, 'users', 'UMS_UNIT_SYNC', ?, ?, ?, ?, ?, ?)`, [
      context?.email || 'system_fallback@domain.local', manager.connection.options.database, String(userId),
      'Synchronized operational unit from UMS active work history.',
      JSON.stringify({ unitIds: previousUnitIds }), JSON.stringify({ unitIds: [unitId], clearedOverride }),
      context?.ipAddress || 'unknown', context?.sessionId || 'system-session',
    ]);
  }

  private isEnabled(): boolean {
    return (
      String(this.configService.get('UMS_UNIT_SYNC_ENABLED') ?? 'false').toLowerCase() === 'true'
    );
  }

  private umsDatabase(): string {
    const database = String(this.configService.get('UMS_DB_DATABASE') ?? '').trim();
    if (!/^[A-Za-z0-9_]+$/.test(database)) {
      throw new Error('UMS_DB_DATABASE must be configured with a valid database name.');
    }
    return database;
  }

  private async loadActiveWorkHistory(): Promise<UmsWorkHistoryRow[]> {
    const connection = await createConnection({
      host: this.configValue('UMS_DB_HOST', 'DB_HOST'),
      port: Number(this.configValue('UMS_DB_PORT', 'DB_PORT') || 3306),
      user: this.configValue('UMS_DB_USERNAME', 'DB_USERNAME'),
      password: this.configValue('UMS_DB_PASSWORD', 'DB_PASSWORD', true),
      database: this.umsDatabase(),
      connectTimeout: 10_000,
    });

    try {
      const [rows] = await connection.query<Array<RowDataPacket & UmsWorkHistoryRow>>({
        sql: `SELECT CAST(\`staff_id\` AS CHAR) AS \`staffId\`, TRIM(\`section_name\`) AS \`sectionName\`
         FROM \`work_history\`
         WHERE \`is_active\` = 1
           AND \`staff_id\` IS NOT NULL
           AND TRIM(COALESCE(\`section_name\`, '')) <> ''`,
        timeout: 30_000,
      });
      return rows.map((row) => ({
        staffId: String(row.staffId),
        sectionName: String(row.sectionName),
      }));
    } finally {
      await connection.end();
    }
  }

  private configValue(primaryKey: string, fallbackKey: string, allowEmpty = false): string {
    const primary = this.configService.get<string>(primaryKey);
    if (
      primary !== undefined &&
      primary !== null &&
      (allowEmpty || String(primary).trim() !== '')
    ) {
      return String(primary);
    }
    return String(this.configService.get<string>(fallbackKey) ?? '');
  }

  private normalizeDisplayName(value: unknown): string {
    return String(value ?? '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private normalizedKey(value: unknown): string {
    return this.normalizeDisplayName(value).toLocaleLowerCase('en-US');
  }

  private emitUserDirectoryUpdated(userId: number): void {
    void this.eventBus.publish(SSE_EVENT_CHANNEL, {
      sourceId: 'users-service-unit-sync',
      event: {
        type: 'USER_DIRECTORY_UPDATED',
        payload: { userId, action: 'updated' },
      },
    });
  }

  private logResult(result: UnitSyncResult): void {
    this.logger.log(`UMS unit sync completed: ${JSON.stringify(result)}`);
  }

  private errorMessage(error: unknown): string {
    const candidate = error as { code?: string; message?: string };
    return candidate?.code || candidate?.message || 'unknown error';
  }
}
