import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TechAttendance, AttendanceStatus } from '../entities/tech-attendance.entity';
import { OfficeDay } from '../entities/office-day.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { RoleDefinitionEntity } from '../../users/entities/role-definition.entity';
// Note: TECHNICIAN_IT_STAFF and TECHNICIAN_DESKTOP_STAFF are accessed via UserRole enum

// --- DTOs ------------------------------------------------------------------

export interface SetAttendanceDto {
  userId: number;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
}

export interface BulkSetAttendanceDto {
  entries: SetAttendanceDto[];
}

export interface SetOfficeDayDto {
  date: string; // YYYY-MM-DD
  isOfficeDay: boolean;
  notes?: string;
}

export interface BulkSetOfficeDaysDto {
  entries: SetOfficeDayDto[];
}

// --- Service ----------------------------------------------------------------

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(TechAttendance)
    private readonly attendanceRepo: Repository<TechAttendance>,
    @InjectRepository(OfficeDay)
    private readonly officeDayRepo: Repository<OfficeDay>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RoleDefinitionEntity)
    private readonly roleDefRepo: Repository<RoleDefinitionEntity>,
  ) {}

  // ── Attendance ──────────────────────────────────────────────────────────

  /**
   * Get role codes from role_definitions that are tagged with a specific technician_type.
   * Used to include users with custom roles in the technician attendance grid.
   */
  private async getCustomRoleValues(technicianType?: string): Promise<string[]> {
    const qb = this.roleDefRepo
      .createQueryBuilder('rd')
      .select('rd.value', 'value')
      .where('rd.technicianType IS NOT NULL');
    if (technicianType) {
      qb.andWhere('rd.technicianType = :t', { t: technicianType });
    }
    const rows = await qb.getRawMany<{ value: string }>();
    return rows.map(r => r.value);
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

    const customRoles = await this.getCustomRoleValues(ticketType || undefined);

    if (ticketType === 'desktop_support') {
      // Desktop Support: desktop_sr and desktop_jr ONLY
      const roles = [...new Set([UserRole.DESKTOP_SR, UserRole.DESKTOP_JR, ...customRoles])];
      qb.andWhere('user.role IN (:...roles)', { roles });
    } else if (ticketType === 'it_support') {
      // IT Support: it_support_sr and it_support_jr ONLY
      const roles = [...new Set([UserRole.IT_SUPPORT_SR, UserRole.IT_SUPPORT_JR, ...customRoles])];
      qb.andWhere('user.role IN (:...roles)', { roles });
    } else if (ticketType === 'pantawid_ict_support') {
      // Pantawid ICT Support: pantawid_ict ONLY
      const roles = [...new Set([UserRole.PANTAWID_ICT, ...customRoles])];
      qb.andWhere('user.role IN (:...roles)', { roles });
    } else if (ticketType === 'ito') {
      // ITO = all focal-equivalent + compliance/cybersec staff (excludes technicians and pantawid)
      const itoHardcoded: string[] = [
        UserRole.FOCAL, UserRole.SECTION_HEAD,
        UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
        UserRole.LEAD_INFRA, UserRole.SERVER_ADMIN, UserRole.DB_ADMIN, UserRole.NETWORK_ADMIN,
        UserRole.PROJECT_MGR, UserRole.DEV_LEAD, UserRole.SQA_LEAD,
        UserRole.RECORDS_OFFICER, UserRole.HR_ID_OFFICER,
      ];
      const roles = [...new Set([...itoHardcoded, ...customRoles])];
      qb.andWhere('user.role IN (:...roles)', { roles });
    } else if (customRoles.length > 0) {
      // No type filter but custom roles may need to be included — no additional restriction needed
      // (all tech roles are already included by the base query with no filter)
    }

    return qb.getMany();
  }

  /** Get attendance for a single date */
  async getAttendanceForDate(date: string): Promise<TechAttendance[]> {
    return this.attendanceRepo.find({
      where: { date },
      relations: ['user', 'setBy'],
    });
  }

  /** Set (upsert) attendance for a single user on a date */
  async setAttendance(dto: SetAttendanceDto, setById: number, actorRole?: string): Promise<TechAttendance> {
    if (!dto.userId || !dto.date || !dto.status) {
      throw new BadRequestException('userId, date, and status are required');
    }

    // Validate status
    if (!Object.values(AttendanceStatus).includes(dto.status)) {
      throw new BadRequestException(`Invalid status: ${dto.status}`);
    }

    // Scope restriction: lower-level tech focals can only tag their own tier's staff
    const itFocalRoles = [UserRole.TECHNICIAN_IT_SUPPORT, UserRole.IT_SUPPORT_SR];
    const deskFocalRoles = [UserRole.TECHNICIAN_DESKTOP, UserRole.DESKTOP_SR];
    if (itFocalRoles.includes(actorRole as UserRole)) {
      const target = await this.userRepo.findOne({ where: { id: dto.userId } });
      const itStaffRoles = [UserRole.TECHNICIAN_IT_STAFF, UserRole.IT_SUPPORT_JR, UserRole.IT_SUPPORT_SR, UserRole.TECHNICIAN_IT_SUPPORT];
      if (target && !itStaffRoles.includes(target.role as UserRole) && actorRole !== UserRole.SUPER_ADMIN) {
        throw new BadRequestException('IT Support focal can only manage attendance for IT Support team members.');
      }
    } else if (deskFocalRoles.includes(actorRole as UserRole)) {
      const target = await this.userRepo.findOne({ where: { id: dto.userId } });
      const deskStaffRoles = [UserRole.TECHNICIAN_DESKTOP_STAFF, UserRole.DESKTOP_JR, UserRole.DESKTOP_SR, UserRole.TECHNICIAN_DESKTOP];
      if (target && !deskStaffRoles.includes(target.role as UserRole) && actorRole !== UserRole.SUPER_ADMIN) {
        throw new BadRequestException('Desktop focal can only manage attendance for Desktop Support team members.');
      }
    }

    let record = await this.attendanceRepo.findOne({
      where: { userId: dto.userId, date: dto.date },
    });

    if (record) {
      record.status = dto.status;
      record.notes = dto.notes ?? record.notes;
      record.setById = setById;
    } else {
      record = this.attendanceRepo.create({
        userId: dto.userId,
        date: dto.date,
        status: dto.status,
        notes: dto.notes ?? null,
        setById,
      });
    }

    return this.attendanceRepo.save(record);
  }

  /** Bulk set attendance for multiple users */
  async bulkSetAttendance(dto: BulkSetAttendanceDto, setById: number, actorRole?: string): Promise<TechAttendance[]> {
    const results: TechAttendance[] = [];
    for (const entry of dto.entries) {
      results.push(await this.setAttendance(entry, setById, actorRole));
    }
    return results;
  }

  /** Get technicians who are available (present or half_day) for a ticket type on a given date */
  async getAvailableTechnicians(ticketType: string, date: string): Promise<User[]> {
    const customRoles = await this.getCustomRoleValues(ticketType);

    // Map ticket type to roles — using updated role assignments per QA spec
    let hardcodedRoles: string[];
    if (ticketType === 'desktop_support') {
      // Desktop Support: desktop_sr and desktop_jr (+ legacy technician_desktop_staff)
      hardcodedRoles = [UserRole.DESKTOP_SR, UserRole.DESKTOP_JR, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_DESKTOP_STAFF];
    } else if (ticketType === 'it_support') {
      // IT Support: it_support_sr and it_support_jr (+ legacy technician_it_staff)
      hardcodedRoles = [UserRole.IT_SUPPORT_SR, UserRole.IT_SUPPORT_JR, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_IT_STAFF];
    } else if (ticketType === 'pantawid_ict_support') {
      // Pantawid ICT: pantawid_ict (+ legacy technician)
      hardcodedRoles = [UserRole.PANTAWID_ICT, UserRole.TECHNICIAN];
    } else {
      hardcodedRoles = [
        UserRole.TECHNICIAN,
        UserRole.TECHNICIAN_DESKTOP,
        UserRole.TECHNICIAN_IT_SUPPORT,
        UserRole.TECHNICIAN_IT_STAFF,
        UserRole.TECHNICIAN_DESKTOP_STAFF,
      ];
    }

    const roles = [...new Set([...hardcodedRoles, ...customRoles])];

    // Get all active techs with matching roles
    const byRole = await this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.role IN (:...roles)', { roles })
      .getMany();

    // Also include users flagged individually as technicians (custom role scenario)
    const byFlag = await this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.ticketTechnician = :flag', { flag: true })
      .andWhere('u.role NOT IN (:...roles)', { roles })
      .getMany();

    const seen = new Set<number>();
    const allTechs: User[] = [];
    for (const u of [...byRole, ...byFlag]) {
      if (!seen.has(u.id)) { seen.add(u.id); allTechs.push(u); }
    }

    if (allTechs.length === 0) return [];

    // Get attendance records for today for these techs
    const techIds = allTechs.map(t => t.id);
    const attendance = await this.attendanceRepo.find({
      where: { date, userId: In(techIds) },
    });

    const attendanceMap = new Map(attendance.map(a => [a.userId, a.status]));

    // Filter: only techs marked present or half_day (or no record — assume present)
    return allTechs.filter(tech => {
      const status = attendanceMap.get(tech.id);
      if (!status) return true;
      return status === AttendanceStatus.PRESENT || status === AttendanceStatus.HALF_DAY;
    });
  }

  /** Get technicians filtered for the current session (all staff or filtered by type) */
  async listTechnicians(ticketType?: string, actorRole?: string): Promise<User[]> {
    const customRoles = await this.getCustomRoleValues(ticketType || undefined);

    // Focal technicians see only their own staff tier when no explicit filter is set
    let forcedType = ticketType;
    if ([UserRole.TECHNICIAN_IT_SUPPORT, UserRole.IT_SUPPORT_SR].includes(actorRole as UserRole) && !ticketType) {
      forcedType = 'it_support';
    } else if ([UserRole.TECHNICIAN_DESKTOP, UserRole.DESKTOP_SR].includes(actorRole as UserRole) && !ticketType) {
      forcedType = 'desktop_support';
    } else if ([UserRole.TECHNICIAN, UserRole.PANTAWID_ICT].includes(actorRole as UserRole) && !ticketType) {
      forcedType = 'pantawid_ict_support';
    }

    let hardcodedRoles: string[];
    if (forcedType === 'desktop_support') {
      // Desktop Support: desktop_sr and desktop_jr ONLY
      hardcodedRoles = [UserRole.DESKTOP_SR, UserRole.DESKTOP_JR];
    } else if (forcedType === 'it_support') {
      // IT Support: it_support_sr and it_support_jr ONLY
      hardcodedRoles = [UserRole.IT_SUPPORT_SR, UserRole.IT_SUPPORT_JR];
    } else if (forcedType === 'pantawid_ict_support') {
      // Pantawid ICT Support: pantawid_ict ONLY
      hardcodedRoles = [UserRole.PANTAWID_ICT];
    } else if (forcedType === 'ito') {
      // ITO = all focal-equivalent + compliance/cybersec staff
      hardcodedRoles = [
        UserRole.FOCAL, UserRole.SECTION_HEAD,
        UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
        UserRole.LEAD_INFRA, UserRole.SERVER_ADMIN, UserRole.DB_ADMIN, UserRole.NETWORK_ADMIN,
        UserRole.PROJECT_MGR, UserRole.DEV_LEAD, UserRole.SQA_LEAD,
        UserRole.RECORDS_OFFICER, UserRole.HR_ID_OFFICER,
      ];
    } else {
      // No filter = all tech roles (technicians + ITO staff)
      hardcodedRoles = [
        UserRole.TECHNICIAN,
        UserRole.TECHNICIAN_DESKTOP,
        UserRole.TECHNICIAN_IT_SUPPORT,
        UserRole.TECHNICIAN_IT_STAFF,
        UserRole.TECHNICIAN_DESKTOP_STAFF,
      ];
    }

    const roles = [...new Set([...hardcodedRoles, ...customRoles])];

    // Fetch by known roles (hardcoded + custom-tagged)
    const byRole = await this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.role IN (:...roles)', { roles })
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .getMany();

    // Also include users with any custom role who have the ticketTechnician flag set
    const byFlag = await this.userRepo
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.ticketTechnician = :flag', { flag: true })
      .andWhere('u.role NOT IN (:...roles)', { roles })
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .getMany();

    // Merge, deduplicate by id
    const seen = new Set<number>();
    const merged: User[] = [];
    for (const u of [...byRole, ...byFlag]) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        merged.push(u);
      }
    }

    return merged;
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
  async getStaffLoginsMonthly(startDate: string, endDate: string): Promise<User[]> {
    const EXCLUDED_ROLES = [
      UserRole.SUPER_ADMIN,
      UserRole.TECHNICIAN,
      UserRole.TECHNICIAN_DESKTOP,
      UserRole.TECHNICIAN_IT_SUPPORT,
      UserRole.TECHNICIAN_IT_STAFF,
      UserRole.TECHNICIAN_DESKTOP_STAFF,
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
   * - If they are already marked ABSENT → correct to PRESENT.
   * - If already PRESENT / OUT_OF_OFFICE → no change.
   * Non-technician roles are skipped so the table stays clean.
   * Called from AuthService.login() / googleLogin() after recording the login timestamp.
   */
  async autoCorrectAbsentOnLogin(userId: number): Promise<void> {
    // Only auto-mark attendance for technician-tier accounts
    const techRoles = new Set<string>([
      UserRole.DESKTOP_SR, UserRole.DESKTOP_JR,
      UserRole.IT_SUPPORT_SR, UserRole.IT_SUPPORT_JR,
      UserRole.TECHNICIAN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT,
      UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
      UserRole.PANTAWID_ICT,
    ]);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    // Check built-in tech roles
    if (!techRoles.has(user.role)) {
      // Also check custom roles tagged with a technicianType in role_definitions
      const customRoleValues = await this.getCustomRoleValues();
      if (!customRoleValues.includes(user.role)) return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const record = await this.attendanceRepo.findOne({ where: { userId, date: today } });

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
    } else if (record.status === AttendanceStatus.ABSENT) {
      record.status = AttendanceStatus.PRESENT;
      record.notes = (record.notes ? record.notes + ' | ' : '') + 'Auto-corrected: logged in while marked absent';
      await this.attendanceRepo.save(record);
    }
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
    const today = new Date().toISOString().slice(0, 10);
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
    const result = await this.attendanceRepo.query('DELETE FROM tech_attendance');
    const deleted = result?.affectedRows ?? 0;
    this.logger.warn(`[ADMIN] Cleared all tech_attendance records (${deleted} rows deleted)`);
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
        .filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.HALF_DAY)
        .map(a => a.userId),
    );

    return staff.filter(s => !attendedIds.has(s.id));
  }
}
