import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';

import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TechAttendance, AttendanceStatus } from '../entities/tech-attendance.entity';
import { OfficeDay } from '../entities/office-day.entity';
import { DtrView } from '../entities/dtr-view.entity';
import { User, UserRole } from '../../shared/entities';
import { RoleDefinitionEntity } from '../../shared/entities';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { auditContext } from '../../../shared/audit/audit.context';

// --- DTOs ------------------------------------------------------------------

export class SetAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  userId: number;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  date: string; // YYYY-MM-DD
  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  @ApiProperty()
  status: AttendanceStatus;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notes?: string;
  
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  clockInTime?: string;
}

export class BulkSetAttendanceDto {
  @IsNotEmpty()
  @IsArray()
  @ApiProperty()
  entries: SetAttendanceDto[];
}

export class SetOfficeDayDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  date: string; // YYYY-MM-DD
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  isOfficeDay: boolean;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notes?: string;
}

export class BulkSetOfficeDaysDto {
  @IsNotEmpty()
  @IsArray()
  @ApiProperty()
  entries: SetOfficeDayDto[];
}

export class TechnicianListItemDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  id: number;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  email: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  firstName: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  lastName: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  role: string;
}

// --- Service ----------------------------------------------------------------

@Injectable()
export class AttendanceService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceService.name);
  private readonly excludedAttendanceEmails: string[] = [];
  private readonly excludedAttendanceRoleValues = ['user', 'super_admin'];
  public isDtrViewOnline: boolean = true;

  constructor(
    @InjectRepository(TechAttendance)
    private readonly attendanceRepo: Repository<TechAttendance>,
    @InjectRepository(OfficeDay)
    private readonly officeDayRepo: Repository<OfficeDay>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RoleDefinitionEntity)
    private readonly roleDefRepo: Repository<RoleDefinitionEntity>,
    @InjectRepository(DtrView)
    private readonly dtrViewRepo: Repository<DtrView>,
    @InjectRepository(TicketingConfig)
    private readonly configRepo: Repository<TicketingConfig>,
    private readonly roleCapSvc: RoleCapabilitiesService,
    private readonly eventBus: EventBusService,
  ) {}

  async onModuleInit() {
    // We no longer rely on user login for attendance.
    // Attendance is purely driven by the DTR view (cron-synced).
  }

  // ── Attendance ──────────────────────────────────────────────────────────

  private async getAssignableAttendanceRoles(): Promise<string[]> {
    const rows = await this.roleDefRepo
      .createQueryBuilder('rd')
      .select('rd.value', 'value')
      .where('rd.assignable = :assignable', { assignable: true })
      .andWhere('rd.value NOT IN (:...excluded)', { excluded: this.excludedAttendanceRoleValues })
      .getRawMany<{ value: string }>();
    return rows.map((r) => r.value);
  }

  private async getTechnicianTypeRoles(technicianType: string): Promise<string[]> {
    const rows = await this.roleDefRepo
      .createQueryBuilder('rd')
      .select('rd.value', 'value')
      .where('rd.assignable = :assignable', { assignable: true })
      .andWhere('rd.technicianType = :technicianType', { technicianType })
      .andWhere('rd.value NOT IN (:...excluded)', { excluded: this.excludedAttendanceRoleValues })
      .getRawMany<{ value: string }>();
    return rows.map((r) => r.value);
  }

  private getItoRoles(): string[] {
    // Derived from role_capabilities.is_ito=1 (startup-cached)
    return this.roleCapSvc.getRolesWhere('isIto');
  }

  // ✅ CENTRALIZED ROLE GROUPING
  private async getRoleGroups(): Promise<Record<string, string[]>> {
    const [desktopSupportRoles, itSupportRoles, pantawidRoles, allRoles] = await Promise.all([
      this.getTechnicianTypeRoles('desktop_support'),
      this.getTechnicianTypeRoles('it_support'),
      this.getTechnicianTypeRoles('pantawid_ict_support'),
      this.getAssignableAttendanceRoles(),
    ]);

    return {
      desktop_support: [
        ...new Set([UserRole.DESKTOP_SR, UserRole.DESKTOP_JR, ...desktopSupportRoles]),
      ],
      it_support: [...new Set([UserRole.IT_SUPPORT_SR, UserRole.IT_SUPPORT_JR, ...itSupportRoles])],
      pantawid_ict_support: [...new Set([UserRole.PANTAWID_ICT, ...pantawidRoles])],
      ito: this.getItoRoles(),
      all: [...new Set(allRoles)],
    };
  }

  /** Get attendance records for a date range, optionally filtered by ticket type */
  async getAttendance(
    startDate: string,
    endDate: string,
    ticketType?: string,
  ): Promise<TechAttendance[]> {
    const qb = this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'user')
      .leftJoinAndSelect('a.setBy', 'setBy')
      .where('a.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('a.date', 'ASC')
      .addOrderBy('user.lastName', 'ASC');

    const groups = await this.getRoleGroups();
    const roles = groups[ticketType || 'all'] || groups.all;
    qb.andWhere('user.role IN (:...roles)', { roles });

    return qb.getMany();
  }

  /** Get attendance for a single date */
  async getAttendanceForDate(date: string): Promise<TechAttendance[]> {
    return this.getAttendance(date, date);
  }

  /** Set (upsert) attendance for a single user on a date */
  async setAttendance(
    dto: SetAttendanceDto,
    setById: number,
    actorRole?: string,
  ): Promise<TechAttendance> {
    if (!dto.userId || !dto.date || !dto.status) {
      throw new BadRequestException('userId, date, and status are required');
    }

    // Validate status
    if (!Object.values(AttendanceStatus).includes(dto.status)) {
      throw new BadRequestException(`Invalid status: ${dto.status}`);
    }

    // Use UTC+8 explicitly for day boundary comparisons
    const _d = new Date();
    _d.setHours(_d.getHours() + 8);
    const today = `${_d.getUTCFullYear()}-${String(_d.getUTCMonth() + 1).padStart(2, '0')}-${String(_d.getUTCDate()).padStart(2, '0')}`;
    if (dto.date < today) {
      throw new BadRequestException('Cannot modify attendance for past dates');
    }
    if (dto.date > today) {
      throw new BadRequestException('Cannot modify attendance for future dates');
    }

    // Scope restriction: strict matrix capability check
    if (actorRole && !this.roleCapSvc.isAttendanceManage(actorRole)) {
      throw new ForbiddenException('You do not have permission to manage attendance.');
    }

    let record = await this.attendanceRepo.findOne({
      where: { userId: dto.userId, date: dto.date },
    });

    if (record) {
      record.status = dto.status;
      record.notes = dto.notes ?? record.notes;
      record.setById = setById;
      record.isManualOverride = true;
      if (dto.clockInTime !== undefined) {
        record.clockInTime = dto.clockInTime ? new Date(dto.clockInTime) : null as any;
      }
    } else {
      record = this.attendanceRepo.create({
        userId: dto.userId,
        date: dto.date,
        status: dto.status,
        notes: dto.notes ?? null,
        setById,
        isManualOverride: true,
        clockInTime: dto.clockInTime ? new Date(dto.clockInTime) : null,
      });
    }

    const savedRecord = await this.attendanceRepo.save(record);

    if (
      dto.status === AttendanceStatus.ABSENT ||
      dto.status === AttendanceStatus.OUT_OF_OFFICE ||
      dto.status === AttendanceStatus.HALF_DAY
    ) {
      // Background execution: reassignment via event
      this.eventBus.publish('attendance.unavailable', { techId: dto.userId }).catch((err: any) => {
        this.logger.error(`Failed to publish attendance unavailable event: ${err.message}`);
      });
    } else if (dto.status === AttendanceStatus.PRESENT) {
      // Force trigger ticket assignment logic when a technician is manually set to PRESENT
      this.eventBus.publish('attendance.verified', { userId: dto.userId }).catch((err: any) => {
        this.logger.error(`Failed to publish attendance verified event: ${err.message}`);
      });
    }

    return savedRecord;
  }


  async deleteAttendance(userId: number, date: string): Promise<{ message: string }> {
    const existing = await this.attendanceRepo.findOne({
      where: {
        userId,
        date: date,
      }
    });
    if (existing) {
      await this.attendanceRepo.remove(existing);
    }
    return { message: 'Attendance deleted' };
  }

  /** Bulk set attendance for multiple users */
  async bulkSetAttendance(
    dto: BulkSetAttendanceDto,
    setById: number,
    actorRole?: string,
  ): Promise<TechAttendance[]> {
    const results: TechAttendance[] = [];
    for (const entry of dto.entries) {
      results.push(await this.setAttendance(entry, setById, actorRole));
    }
    return results;
  }

  /** Get technicians who are available (present or half_day) for a ticket type on a given date */
  async getAvailableTechnicians(ticketType: string, date: string): Promise<User[]> {
    const groups = await this.getRoleGroups();
    const roles = groups[ticketType] || groups.all;

    // Get all active techs with matching roles
    const byRole = await this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.role IN (:...roles)', { roles })
      .getMany();

    const seen = new Set<number>();
    const allTechs: User[] = [];
    for (const u of byRole) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        allTechs.push(u);
      }
    }
    this.logger.log(
      `[getAvailableTechnicians] ticketType=${ticketType}, date=${date}, roles=[${roles.join(',')}], allTechsCount=${allTechs.length}`,
    );

    if (allTechs.length === 0) return [];

    // Get attendance records for today for these techs
    const techIds = allTechs.map((t) => t.id);
    const attendance = await this.attendanceRepo.find({
      where: { date, userId: In(techIds) },
    });

    const attendanceMap = new Map(attendance.map((a) => [a.userId, a.status]));

    // Filter: only techs marked present or half_day (or no record — assume present)
    return allTechs.filter((tech) => {
      const status = attendanceMap.get(tech.id);
      if (!status) return true;
      return status === AttendanceStatus.PRESENT || status === AttendanceStatus.HALF_DAY;
    });
  }

  /**
   * Strict availability for auto-assignment: only technicians with explicit PRESENT attendance.
   * No attendance record and HALF_DAY are treated as not eligible for automatic assignment.
   */
  async getPresentTechnicians(ticketType: string, date: string): Promise<User[]> {
    const available = await this.getAvailableTechnicians(ticketType, date);
    this.logger.log(
      `[getPresentTechnicians] ticketType=${ticketType}, date=${date}, availableCount=${available.length}`,
    );
    if (available.length === 0) return [];

    const presentRows = await this.attendanceRepo.find({
      where: {
        date,
        status: AttendanceStatus.PRESENT,
        userId: In(available.map((u) => u.id)),
      },
    });
    this.logger.log(
      `[getPresentTechnicians] presentRowsCount=${presentRows.length}, userIds=[${presentRows.map((r) => r.userId).join(',')}]`,
    );
    const presentIds = new Set<number>(presentRows.map((r) => r.userId));
    let presentTechs = available.filter((u) => presentIds.has(u.id));

    // DTR Auto-Clock-Out Filter
    // Only apply if the requested date is today
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    if (date === todayStr && presentTechs.length > 0) {
      const now = new Date();
      // Fetch global config to know the schedule mode
      const config = await this.configRepo.findOne({ where: { id: 1 } });
      const isCWW = config?.scheduleMode === 'CWW';
      const stdClockOutStr = config?.officeClockout || '17:00:00';

      presentTechs = presentTechs.filter((u) => {
        const attendanceRecord = presentRows.find(r => r.userId === u.id);
        const clockInTime = attendanceRecord?.clockInTime;
        
        // Gatekeeper: Technician must have a clock_in_time entry
        // (unless it was a manual override which we assume grants them tickets anyway)
        if (!clockInTime && attendanceRecord?.isManualOverride === false) {
          return false;
        }

        if (!clockInTime) return true; // manual override fallback

        let isShiftActive = false;
        
        if (isCWW) {
          // Compute clockOut: clockIn + 11 hours
          const clockOutTime = new Date(clockInTime.getTime() + 11 * 3600 * 1000);
          isShiftActive = now <= clockOutTime;
          if (!isShiftActive) {
            this.logger.log(`[getPresentTechnicians] Excluding user ${u.id}: CWW shift ended at ${clockOutTime.toISOString()}`);
          }
        } else {
          // Standard schedule: Ticket assignment strictly stays between 8AM to 5PM (or config stdClockOutStr)
          const clockOutTime = new Date();
          const [hours, minutes] = stdClockOutStr.split(':').map(Number);
          clockOutTime.setHours(hours, minutes, 0, 0);
          isShiftActive = now <= clockOutTime;
          if (!isShiftActive) {
            this.logger.log(`[getPresentTechnicians] Excluding user ${u.id}: Standard shift ended at ${clockOutTime.toISOString()}`);
          }
        }
        
        return isShiftActive;
      });
    }

    return presentTechs;
  }

  /** Get technicians filtered for the current session (all staff or filtered by type) */
  async listTechnicians(ticketType?: string, actorRole?: string): Promise<TechnicianListItemDto[]> {
    // Focal technicians see only their own staff tier when no explicit filter is set,
    // EXCEPT if they have the Attendance View Role Capability (isAttendanceAccess)
    const canViewAll = actorRole ? this.roleCapSvc.isAttendanceAccess(actorRole) : false;

    // If not allowed to view all and no specific ticketType requested, they get nothing
    if (!canViewAll && !ticketType) {
      return [];
    }

    const forcedType = ticketType;

    const groups = await this.getRoleGroups();
    const roles = groups[forcedType || 'all'] || groups.all;

    if (!roles || roles.length === 0) {
      return [];
    }

    // Fetch by known roles (hardcoded + custom-tagged)
    const byRole = await this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.role IN (:...roles)', { roles })
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .getMany();

    // Merge, deduplicate by id
    const seen = new Set<number>();
    const merged: User[] = [];
    for (const u of byRole) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        merged.push(u);
      }
    }

    return merged.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
    }));
  }

  /** Get all staff who logged in on a specific date (for staff activity tab) */
  async getStaffLoginsForDate(date: string): Promise<User[]> {
    const startOfDay = new Date(date + 'T00:00:00');
    const endOfDay = new Date(date + 'T23:59:59.999');

    return this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.last_login BETWEEN :start AND :end', {
        start: startOfDay.toISOString().replace('T', ' ').replace('Z', ''),
        end: endOfDay.toISOString().replace('T', ' ').replace('Z', ''),
      })
      .orderBy('u.last_login', 'DESC')
      .getMany();
  }

  /** Get all non-user, non-technician, non-super-admin staff — returns each user with their lastLogin (for monthly grid) */
  async getStaffLoginsMonthly(_startDate: string, _endDate: string): Promise<User[]> {
    const EXCLUDED_ROLES = [
      UserRole.SUPER_ADMIN,
      UserRole.DESKTOP_SR,
      UserRole.DESKTOP_JR,
      UserRole.IT_SUPPORT_SR,
      UserRole.IT_SUPPORT_JR,
      UserRole.PANTAWID_ICT,
      UserRole.USER,
    ];

    return this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.role NOT IN (:...excluded)', { excluded: EXCLUDED_ROLES })
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .getMany();
  }

  // ── Office Days ─────────────────────────────────────────────────────────

  // ── Auto-correct attendance on login ─────────────────────────────────

  /**
   * When a technician logs in, auto-mark them PRESENT for today.
   * - If no attendance record exists yet → create one with PRESENT status.
   * - If they are already marked ABSENT, OUT_OF_OFFICE, or HALF_DAY → correct to PRESENT.
   * - If already PRESENT → no change.
   * Non-technician roles are skipped so the table stays clean.
   * Called from AuthService.login() / googleLogin() after recording the login timestamp.
   */
  async autoCorrectAbsentOnLogin(userId: number): Promise<void> {
    // Skip only non-staff roles; all other roles (technicians, ITO staff, etc.) get auto-attendance
    const EXCLUDED_FROM_ATTENDANCE = new Set<string>([UserRole.USER, UserRole.SUPER_ADMIN]);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    if (EXCLUDED_FROM_ATTENDANCE.has(user.role as UserRole)) return;

    // Use UTC+8 explicitly for day boundary comparisons
    const _d = new Date();
    _d.setHours(_d.getHours() + 8);
    const today = `${_d.getUTCFullYear()}-${String(_d.getUTCMonth() + 1).padStart(2, '0')}-${String(_d.getUTCDate()).padStart(2, '0')}`;
    const record = await this.attendanceRepo.findOne({ where: { userId, date: today } });

    await auditContext.run(
      { email: user.email, ipAddress: 'system-auto-login', sessionId: 'auto-login-event' },
      async () => {
        try {
          if (!record) {
            // No record for today — create a new PRESENT record
            await this.attendanceRepo.save(
              this.attendanceRepo.create({
                userId,
                date: today,
                status: AttendanceStatus.PRESENT,
                notes: 'Auto-marked present on login',
                setById: null as any,
              }),
            );
          } else if (
            record.status === AttendanceStatus.ABSENT ||
            record.status === AttendanceStatus.OUT_OF_OFFICE ||
            record.status === AttendanceStatus.HALF_DAY
          ) {
            const prevStatus =
              record.status === AttendanceStatus.ABSENT
                ? 'absent'
                : record.status === AttendanceStatus.OUT_OF_OFFICE
                  ? 'OOO'
                  : 'half-day';
            record.status = AttendanceStatus.PRESENT;
            record.notes =
              (record.notes ? record.notes + ' | ' : '') +
              `Auto-corrected: logged in while marked ${prevStatus}`;
            await this.attendanceRepo.save(record);
          }
        } catch (err: any) {
          if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            // Harmless race condition during rapid test logins
            this.logger.debug(`Skipped duplicate attendance entry for user ${userId}`);
          } else {
            throw err;
          }
        }
      },
    );
  }

  /** Get office days for a date range */
  async getOfficeDays(startDate: string, endDate: string): Promise<OfficeDay[]> {
    return this.officeDayRepo
      .createQueryBuilder('od')
      .leftJoinAndSelect('od.setBy', 'setBy')
      .where('od.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('od.date', 'ASC')
      .getMany();
  }

  /** Set (upsert) a single office day */
  async setOfficeDay(dto: SetOfficeDayDto, setById: number): Promise<OfficeDay> {
    if (!dto.date) throw new BadRequestException('date is required');

    // Only allow setting current date onwards
    // Use UTC+8 explicitly for day boundary comparisons
    const _d = new Date();
    _d.setHours(_d.getHours() + 8);
    const today = `${_d.getUTCFullYear()}-${String(_d.getUTCMonth() + 1).padStart(2, '0')}-${String(_d.getUTCDate()).padStart(2, '0')}`;
    if (dto.date < today) {
      throw new BadRequestException('Cannot modify office days in the past');
    }

    let record = await this.officeDayRepo.findOne({ where: { date: dto.date } });

    if (record) {
      record.isOfficeDay = dto.isOfficeDay;
      record.notes = dto.notes ?? record.notes;
      record.setById = setById;
    } else {
      record = this.officeDayRepo.create({
        date: dto.date,
        isOfficeDay: dto.isOfficeDay,
        notes: dto.notes ?? null,
        setById,
      });
    }

    return this.officeDayRepo.save(record);
  }

  /** Bulk set office days */
  async bulkSetOfficeDays(dto: BulkSetOfficeDaysDto, setById: number): Promise<OfficeDay[]> {
    const results: OfficeDay[] = [];
    for (const entry of dto.entries) {
      results.push(await this.setOfficeDay(entry, setById));
    }
    return results;
  }

  /** Delete all attendance records (admin reset — destructive) */
  async clearAllAttendance(): Promise<{ deleted: number }> {
    const result = await this.attendanceRepo.query('DELETE FROM attendance');
    const deleted = result?.affectedRows ?? 0;
    this.logger.warn(`[ADMIN] Cleared all attendance records (${deleted} rows deleted)`);
    return { deleted };
  }

  /** Check if a specific date is an office day. Default: weekdays are office days */
  async isOfficeDay(date: string): Promise<boolean> {
    const record = await this.officeDayRepo.findOne({ where: { date } });
    if (record) return record.isOfficeDay;
    // Default: Mon-Fri are office days
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  // ── Non-attendance report (for scheduled cron) ──────────────────────────

  /** Get all RICTMS staff who haven't logged in today (for non-attendance consolidation) */
  async getNonAttendantStaff(date: string): Promise<User[]> {
    // All active non-user staff
    const staff = await this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.role NOT IN (:...excluded)', { excluded: [UserRole.USER] })
      .getMany();

    // Check attendance records
    const attendance = await this.attendanceRepo.find({ where: { date } });
    const attendedIds = new Set(
      attendance
        .filter(
          (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.HALF_DAY,
        )
        .map((a) => a.userId),
    );

    return staff.filter((s) => !attendedIds.has(s.id));
  }

  async getMyShift(user: User): Promise<{ clockIn: Date | null; clockOut: Date | null }> {
    console.log('[getMyShift] Starting for user:', user.email);
    
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    
    const attendanceRecord = await this.attendanceRepo.findOne({
      where: { date: todayStr, userId: user.id }
    });

    if (!attendanceRecord || !attendanceRecord.clockInTime) {
      return { clockIn: null, clockOut: null };
    }

    const clockIn = attendanceRecord.clockInTime;
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    const isCWW = config?.scheduleMode === 'CWW';
    
    if (isCWW) {
      const clockInEndStr = config?.cwwClockinEnd || '08:00:00';
      const [endH, endM] = clockInEndStr.split(':').map(Number);
      const clockInEnd = new Date(clockIn);
      clockInEnd.setHours(endH, endM, 0, 0);

      if (clockIn <= clockInEnd) {
        // Exactly 11 hours
        const clockOut = new Date(clockIn.getTime() + 11 * 3600 * 1000);
        return { clockIn, clockOut };
      } else {
        // Exactly clockout end time
        const clockOut = new Date(clockIn);
        const clockOutEndStr = config?.cwwClockoutEnd || '19:00:00';
        const [outH, outM] = clockOutEndStr.split(':').map(Number);
        clockOut.setHours(outH, outM, 0, 0);
        return { clockIn, clockOut };
      }
    } else {
      const clockOut = new Date();
      const stdClockOutStr = config?.officeClockout || '17:00:00';
      const [hours, minutes] = stdClockOutStr.split(':').map(Number);
      clockOut.setHours(hours, minutes, 0, 0);
      return { clockIn, clockOut };
    }
  }

  getDtrSystemStatus(): { isOnline: boolean } {
    return { isOnline: this.isDtrViewOnline };
  }

  /** Background cron job to sync attendance from the DTR view for missing staff */
  async syncAttendanceWithDTR(): Promise<void> {
    this.logger.log(`[DTR SYNC DBG] Entering syncAttendanceWithDTR...`);
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    
    try {
      // 1. Get all assignable attendance roles
      const allRoles = await this.getAssignableAttendanceRoles();
      if (allRoles.length === 0) {
        this.logger.log(`[DTR SYNC DBG] Aborting: allRoles is empty!`);
        return;
      }
      this.logger.log(`[DTR SYNC DBG] allRoles count: ${allRoles.length}`);

      // 2. Get all active staff with these roles
      const allTechs = await this.userRepo.find({
        where: { active: true, role: In(allRoles) }
      });
      const validTechs = allTechs.filter(t => t.staffId); // Only those with a DTR staffId
      if (validTechs.length === 0) {
        this.logger.log(`[DTR SYNC DBG] Aborting: validTechs (with staffId) is empty!`);
        return;
      }
      this.logger.log(`[DTR SYNC DBG] validTechs count: ${validTechs.length}`);

      // 3. Query DTR View for all valid staff
      const staffIds = validTechs.map(t => t.staffId);
      this.logger.log(`[DTR SYNC DBG] Querying dtrViewRepo for workDate=${todayStr} with staffIds: ${staffIds.join(', ')}`);
      
      const dtrRecords = await this.dtrViewRepo.find({
        where: { workDate: todayStr, empCode: In(staffIds) }
      });
      
      this.logger.log(`[DTR SYNC DBG] dtrRecords fetched count: ${dtrRecords.length}`);

      this.isDtrViewOnline = true; // Connection succeeded!

      // 4. Fetch existing attendance records to update
      const existingAttendance = await this.attendanceRepo.find({
        where: { date: todayStr, userId: In(validTechs.map(t => t.id)) }
      });

      // 5. Upsert the records
      for (const dtr of dtrRecords) {
        if (!dtr.firstClockInTime) continue;

        const tech = validTechs.find(t => t.staffId === dtr.empCode);
        if (!tech) continue;

        const existingRecord = existingAttendance.find(a => a.userId === tech.id);
        
        // If the existing record is manual override and already has clock in time, we might skip it or still update it.
        // User requested: "The sync should happen regardless if the RICTMS staff has an entry in attendance table for the current day... The notes column should indicate Marked present on sync."
        
        await auditContext.run(
          { email: 'system@dswd.gov.ph', ipAddress: 'DTR-Cron', sessionId: 'dtr-sync' },
          async () => {
            if (existingRecord) {
              existingRecord.clockInTime = dtr.firstClockInTime;
              existingRecord.status = AttendanceStatus.PRESENT;
              existingRecord.notes = 'Marked present on sync.';
              await this.attendanceRepo.save(existingRecord);
            } else {
              const newRecord = this.attendanceRepo.create({
                userId: tech.id,
                date: todayStr,
                status: AttendanceStatus.PRESENT,
                clockInTime: dtr.firstClockInTime,
                isManualOverride: false,
                notes: 'Marked present on sync.',
              });
              await this.attendanceRepo.save(newRecord);
            }
          }
        );
        
        // Trigger assignment
        this.eventBus.publish('attendance.verified', { userId: tech.id }).catch(() => {});
      }
    } catch (err: any) {
      this.logger.error(`Failed to sync DTR attendance: ${err.message}`);
      this.isDtrViewOnline = false; // Mark system as offline so Fallback UI kicks in
    }
  }
}
