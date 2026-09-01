import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';

import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
  ForbiddenException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TechAttendance, AttendanceStatus } from '../entities/tech-attendance.entity';
import { OfficeDay } from '../entities/office-day.entity';
import { DtrView } from '../entities/dtr-view.entity';
import { User, UserRole } from '../../shared/entities';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { SseService } from './sse.service';
import { auditContext } from '../../../shared/audit/audit.context';
import { DutyService } from './duty.service';

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
  // Local Docker does not have the external DTR view. Staging/production omit
  // this flag and continue to detect the real DTR connection automatically.
  public isDtrViewOnline: boolean = process.env.DTR_VIEW_ENABLED?.trim().toLowerCase() !== 'false';

  constructor(
    @InjectRepository(TechAttendance)
    private readonly attendanceRepo: Repository<TechAttendance>,
    @InjectRepository(OfficeDay)
    private readonly officeDayRepo: Repository<OfficeDay>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DtrView)
    private readonly dtrViewRepo: Repository<DtrView>,
    @InjectRepository(TicketingConfig)
    private readonly configRepo: Repository<TicketingConfig>,
    private readonly roleCapSvc: RoleCapabilitiesService,
    private readonly eventBus: EventBusService,
    private readonly sseService: SseService,
    @Optional() private readonly dutyService?: DutyService,
  ) {}

  async onModuleInit() {
    // We no longer rely on user login for attendance.
    // Attendance is purely driven by the DTR view (cron-synced).
  }

  // ── Attendance ──────────────────────────────────────────────────────────

  private getItoRoles(): string[] {
    // Derived from role_capabilities.is_ito (startup-cached).
    return this.roleCapSvc.getRolesWhere('isIto');
  }

  // Capability-backed groups keep attendance and assignment independent of role names.
  private async getRoleGroups(): Promise<Record<string, string[]>> {
    const withoutSuperAdmin = (roles: string[]) => roles.filter((role) => role !== UserRole.SUPER_ADMIN);
    return {
      desktop_support: withoutSuperAdmin(this.roleCapSvc.getRolesWhere('isDesktop')),
      it_support: withoutSuperAdmin(this.roleCapSvc.getRolesWhere('isItSupport')),
      pantawid_ict_support: withoutSuperAdmin(this.roleCapSvc.getRolesWhere('isPantawidIct')),
      ito: withoutSuperAdmin(this.roleCapSvc.getRolesWhere('isIto')),
      all: withoutSuperAdmin(this.roleCapSvc.getRolesWhere('isAttendanceEligible')),
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

    if (ticketType) {
      const groups = await this.getRoleGroups();
      const roles = groups[ticketType] || [];
      if (roles.length === 0) return [];
      qb.andWhere('user.role IN (:...roles)', { roles });
    } else {
      qb.andWhere('user.role NOT IN (:...excludedRoles)', {
        excludedRoles: [UserRole.USER, UserRole.SUPER_ADMIN],
      });
    }

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
        this.logger.error('Failed to publish attendance unavailable event.');
      });
    } else if (dto.status === AttendanceStatus.PRESENT) {
      // Force trigger ticket assignment logic when a technician is manually set to PRESENT
      this.eventBus.publish('attendance.verified', { userId: dto.userId }).catch((err: any) => {
        this.logger.error('Failed to publish attendance verified event.');
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


  /** Get technicians who are available (present or half_day) for a ticket type on a given date */
  async getAvailableTechnicians(ticketType: string, date: string): Promise<User[]> {
    const groups = await this.getRoleGroups();
    const roles = groups[ticketType] || groups.all;

    // Avoid generating invalid empty IN clauses when the capability cache/schema
    // has no matching technician roles yet.
    if (!roles || roles.length === 0) return [];
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
    this.logger.log(`[getAvailableTechnicians] available technician count: ${allTechs.length}.`);

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
    this.logger.log(`[getPresentTechnicians] available technician count: ${available.length}.`);
    if (available.length === 0) return [];

    const presentRows = await this.attendanceRepo.find({
      where: {
        date,
        status: AttendanceStatus.PRESENT,
        userId: In(available.map((u) => u.id)),
      },
    });
    this.logger.log(`[getPresentTechnicians] present technician count: ${presentRows.length}.`);
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
            this.logger.log('[getPresentTechnicians] Excluding technician after CWW shift ended.');
          }
        } else {
          // Standard schedule: Ticket assignment strictly stays between 8AM to 5PM (or config stdClockOutStr)
          const clockOutTime = new Date();
          const [hours, minutes] = stdClockOutStr.split(':').map(Number);
          clockOutTime.setHours(hours, minutes, 0, 0);
          isShiftActive = now <= clockOutTime;
          if (!isShiftActive) {
            this.logger.log('[getPresentTechnicians] Excluding technician after standard shift ended.');
          }
        }
        
        return isShiftActive;
      });
    }

    return presentTechs;
  }

  /**
   * Automatic-assignment pool. Manual technician lists intentionally use the
   * unfiltered availability methods so an opted-out technician can still be
   * selected explicitly by an authorized user.
   */
  async getAutoAssignmentTechnicians(ticketType: string, date: string): Promise<User[]> {
    const presentTechs = await this.getPresentTechnicians(ticketType, date);
    const dutyBlockedIds = new Set(this.dutyService ? await this.dutyService.blockedTechnicianIds(date) : []);
    return presentTechs.filter((technician) =>
      !dutyBlockedIds.has(technician.id) && technician.autoAssignmentEligible !== false,
    );
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

    const query = this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
    if (forcedType) {
      const groups = await this.getRoleGroups();
      const roles = groups[forcedType] || [];
      if (roles.length === 0) return [];
      query.andWhere('u.role IN (:...roles)', { roles });
    } else {
      query.andWhere('u.role NOT IN (:...excludedRoles)', {
        excludedRoles: [UserRole.USER, UserRole.SUPER_ADMIN],
      });
    }

    // Fetch active users, excluding only regular users and super admins by default.
    const byRole = await query
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

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    const attendanceRows = merged.length
      ? await this.attendanceRepo.find({ where: { date: today, userId: In(merged.map((u) => u.id)) } })
      : [];
    const attendanceMap = new Map<number, AttendanceStatus>(
      attendanceRows.map((record) => [record.userId, record.status]),
    );

    return merged.map((u) => {
      const attendanceStatus = attendanceMap.get(u.id) ?? null;
      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        attendanceStatus,
        isUnavailable: attendanceStatus !== AttendanceStatus.PRESENT,
      };
    });
  }

  /** Get all staff who logged in on a specific date (for staff activity tab) */
  async getStaffLoginsForDate(date: string): Promise<User[]> {
    const startOfDay = new Date(date + 'T00:00:00');
    const endOfDay = new Date(date + 'T23:59:59.999');

    return this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.role <> :superAdmin', { superAdmin: UserRole.SUPER_ADMIN })
      .andWhere('u.last_login BETWEEN :start AND :end', {
        start: startOfDay.toISOString().replace('T', ' ').replace('Z', ''),
        end: endOfDay.toISOString().replace('T', ' ').replace('Z', ''),
      })
      .orderBy('u.last_login', 'DESC')
      .getMany();
  }

  /** Get all non-user, non-technician, non-super-admin staff — returns each user with their lastLogin (for monthly grid) */
  async getStaffLoginsMonthly(_startDate: string, _endDate: string): Promise<User[]> {
    const technicianRoles = new Set([
      ...this.roleCapSvc.getRolesWhere('isDesktop'),
      ...this.roleCapSvc.getRolesWhere('isItSupport'),
      ...this.roleCapSvc.getRolesWhere('isPantawidIct'),
    ]);
    const staff = await this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .getMany();
    return staff.filter(
      (user) => user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.USER && !technicianRoles.has(user.role),
    );
  }

  // ── Office Days ─────────────────────────────────────────────────────────

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

    const saved = await this.officeDayRepo.save(record);
    await this.eventBus.publish('office-day.changed', { date: dto.date, isOfficeDay: dto.isOfficeDay });
    this.sseService.emitAttendanceUpdated();
    return saved;
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

  async getMyShift(user: User): Promise<{ clockIn: Date | null; clockOut: Date | null; attendanceStatus: AttendanceStatus | null }> {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    
    const attendanceRecord = await this.attendanceRepo.findOne({
      where: { date: todayStr, userId: user.id }
    });

    if (!attendanceRecord || !attendanceRecord.clockInTime) {
      return {
        clockIn: null,
        clockOut: null,
        attendanceStatus: attendanceRecord?.status ?? null,
      };
    }

    const clockIn = attendanceRecord.clockInTime;
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    const isCWW = config?.scheduleMode === 'CWW';
    
    if (isCWW) {
      const clockInStartStr = config?.cwwClockinStart || '07:00:00';
      const [startH, startM] = clockInStartStr.split(':').map(Number);
      const clockInStart = new Date(clockIn);
      clockInStart.setHours(startH, startM, 0, 0);

      const clockInEndStr = config?.cwwClockinEnd || '08:00:00';
      const [endH, endM] = clockInEndStr.split(':').map(Number);
      const clockInEnd = new Date(clockIn);
      clockInEnd.setHours(endH, endM, 0, 0);

      if (clockIn < clockInStart) {
        // Super early bird - shift ends exactly at official clock-out start
        const clockOutStartStr = config?.cwwClockoutStart || '18:00:00';
        const [outH, outM] = clockOutStartStr.split(':').map(Number);
        const clockOut = new Date(clockIn);
        clockOut.setHours(outH, outM, 0, 0);
        return { clockIn, clockOut, attendanceStatus: attendanceRecord.status };
      } else if (clockIn <= clockInEnd) {
        // Within sliding window - exactly 11 hours from actual clock in
        const clockOut = new Date(clockIn.getTime() + 11 * 3600 * 1000);
        return { clockIn, clockOut, attendanceStatus: attendanceRecord.status };
      } else {
        // Late clock in - shift ends exactly at official clock-out end
        const clockOut = new Date(clockIn);
        const clockOutEndStr = config?.cwwClockoutEnd || '19:00:00';
        const [outH, outM] = clockOutEndStr.split(':').map(Number);
        clockOut.setHours(outH, outM, 0, 0);
        return { clockIn, clockOut, attendanceStatus: attendanceRecord.status };
      }
    } else {
      const clockOut = new Date();
      const stdClockOutStr = config?.officeClockout || '17:00:00';
      const [hours, minutes] = stdClockOutStr.split(':').map(Number);
      clockOut.setHours(hours, minutes, 0, 0);
      return { clockIn, clockOut, attendanceStatus: attendanceRecord.status };
    }
  }

  getDtrSystemStatus(): { isOnline: boolean } {
    return { isOnline: this.isDtrViewOnline };
  }

  /** Background cron job to sync attendance from the DTR view for missing staff */
  async syncAttendanceWithDTR(): Promise<boolean> {
    if (process.env.DTR_VIEW_ENABLED?.trim().toLowerCase() === 'false') {
      this.isDtrViewOnline = false;
      return false;
    }

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    
    try {
      // 1. Get all assignable attendance roles
      const allRoles = this.roleCapSvc.getRolesWhere('isAttendanceEligible');
      if (allRoles.length === 0) {
        return false;
      }

      // 2. Get all active staff with these roles
      const allTechs = await this.userRepo.find({
        where: { active: true, role: In(allRoles) }
      });
      const validTechs = allTechs.filter(t => t.staffId); // Only those with a DTR staffId
      if (validTechs.length === 0) {
        return false;
      }

      // 3. Query DTR View for all valid staff
      const staffIds = validTechs.map(t => t.staffId);
      const dtrRecords = await this.dtrViewRepo.find({
        where: { workDate: todayStr, empCode: In(staffIds) }
      });
      
      this.logger.log(`DTR attendance sync fetched ${dtrRecords.length} record(s)`);

      if (!this.isDtrViewOnline) {
        this.isDtrViewOnline = true; // Connection succeeded!
        this.sseService.emitSystemStatusChanged(true);
      } else {
        this.isDtrViewOnline = true; // Connection succeeded!
      }

      // 4. Fetch existing attendance records to update
      const existingAttendance = await this.attendanceRepo.find({
        where: { date: todayStr, userId: In(validTechs.map(t => t.id)) }
      });

      // 5. Upsert the records
      let savedCount = 0;
      for (const dtr of dtrRecords) {
        if (!dtr.firstClockInTime) {
          continue;
        }

        const tech = validTechs.find(t => String(t.staffId) === String(dtr.empCode));
        if (!tech) {
          continue;
        }

        const existingRecord = existingAttendance.find(a => a.userId === tech.id);
        
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
        savedCount++;
        
        // Trigger assignment
      }
      return savedCount > 0;
    } catch (err: any) {
      this.logger.error(`DTR attendance synchronization failed (${err?.code || 'unknown'})`);
      if (this.isDtrViewOnline) {
        this.isDtrViewOnline = false; // Mark system as offline so Fallback UI kicks in
        this.sseService.emitSystemStatusChanged(false);
      } else {
        this.isDtrViewOnline = false; // Mark system as offline so Fallback UI kicks in
      }
      return false;
    }
  }
}
