import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { createConnection, RowDataPacket } from 'mysql2/promise';
import { DataSource, In, Repository } from 'typeorm';
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
    @InjectRepository(UserUnitOverride)
    private readonly overridesRepository: Repository<UserUnitOverride>,
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

  async synchronize(): Promise<UnitSyncResult> {
    const emptyResult: UnitSyncResult = {
      discoveredUnits: 0,
      updatedUsers: 0,
      clearedOverrides: 0,
      retainedOverrides: 0,
      skippedAmbiguousStaff: 0,
      skippedRestrictedAssignments: 0,
    };

    if (!this.isEnabled()) return emptyResult;
    if (this.running) {
      this.logger.warn('Skipped overlapping UMS unit synchronization.');
      return emptyResult;
    }

    this.running = true;
    try {
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
      const overrides = await this.overridesRepository.find({
        where: { userId: In(users.map((user) => user.id)) },
      });
      const overrideByUserId = new Map(overrides.map((override) => [override.userId, override]));

      for (const user of users) {
        const staffSections = sectionsByStaff.get(String(user.staffId).trim());
        if (!staffSections || staffSections.size !== 1) {
          if (staffSections && staffSections.size > 1) result.skippedAmbiguousStaff += 1;
          continue;
        }

        const [sectionKey] = staffSections.keys();
        const targetUnit = unitsByKey.get(sectionKey);
        if (!targetUnit?.active) continue;

        const override = overrideByUserId.get(user.id);
        if (override) {
          if (override.unitId === targetUnit.id) {
            await this.overridesRepository.delete({ userId: user.id });
            result.clearedOverrides += 1;
          } else {
            result.retainedOverrides += 1;
          }
          continue;
        }

        const currentUnitId = user.units?.[0]?.id ?? null;
        if (currentUnitId === targetUnit.id) continue;

        const requiresReportorialUnit = user.role !== UserRole.USER;
        if (Boolean(targetUnit.hasReportorialRequirements) !== requiresReportorialUnit) {
          result.skippedRestrictedAssignments += 1;
          continue;
        }

        await this.dataSource.transaction(async (manager) => {
          const managedUser = await manager.getRepository(User).findOne({
            where: { id: user.id, active: true },
            relations: ['units'],
          });
          if (!managedUser) return;
          managedUser.units = [targetUnit];
          await manager.getRepository(User).save(managedUser);
        });
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
    } finally {
      this.running = false;
    }
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
      const [rows] = await connection.query<Array<RowDataPacket & UmsWorkHistoryRow>>(
        `SELECT CAST(\`staff_id\` AS CHAR) AS \`staffId\`, TRIM(\`section_name\`) AS \`sectionName\`
         FROM \`work_history\`
         WHERE \`is_active\` = 1
           AND \`staff_id\` IS NOT NULL
           AND TRIM(COALESCE(\`section_name\`, '')) <> ''`,
      );
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
