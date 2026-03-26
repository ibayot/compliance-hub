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
  ) {}

  // ── Attendance ──────────────────────────────────────────────────────────

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

    if (ticketType === 'desktop_support') {
      qb.andWhere('user.role IN (:...roles)', {
        roles: [UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN],
      });
    } else if (ticketType === 'it_support') {
      qb.andWhere('user.role IN (:...roles)', {
        roles: [UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN],
      });
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
  async setAttendance(dto: SetAttendanceDto, setById: number): Promise<TechAttendance> {
    if (!dto.userId || !dto.date || !dto.status) {
      throw new BadRequestException('userId, date, and status are required');
    }

    // Validate status
    if (!Object.values(AttendanceStatus).includes(dto.status)) {
      throw new BadRequestException(`Invalid status: ${dto.status}`);
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
  async bulkSetAttendance(dto: BulkSetAttendanceDto, setById: number): Promise<TechAttendance[]> {
    const results: TechAttendance[] = [];
    for (const entry of dto.entries) {
      results.push(await this.setAttendance(entry, setById));
    }
    return results;
  }

  /** Get technicians who are available (present or half_day) for a ticket type on a given date */
  async getAvailableTechnicians(ticketType: string, date: string): Promise<User[]> {
    // Determine which roles to check
    const roles: UserRole[] = [UserRole.TECHNICIAN];
    if (ticketType === 'desktop_support') {
      roles.push(UserRole.TECHNICIAN_DESKTOP);
    } else if (ticketType === 'it_support') {
      roles.push(UserRole.TECHNICIAN_IT_SUPPORT);
    }

    // Get all active techs with matching roles
    const allTechs = await this.userRepo.find({
      where: roles.map(role => ({ role, active: true })),
    });

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
      // If no attendance record, treat as present (they're in the system)
      if (!status) return true;
      return status === AttendanceStatus.PRESENT || status === AttendanceStatus.HALF_DAY;
    });
  }

  /** Get technicians filtered for the current session (all staff or filtered by type) */
  async listTechnicians(ticketType?: string): Promise<User[]> {
    const roles: UserRole[] = [UserRole.TECHNICIAN];
    if (ticketType === 'desktop_support') {
      roles.push(UserRole.TECHNICIAN_DESKTOP);
    } else if (ticketType === 'it_support') {
      roles.push(UserRole.TECHNICIAN_IT_SUPPORT);
    } else {
      roles.push(UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT);
    }

    return this.userRepo.find({
      where: roles.map(r => ({ role: r, active: true })),
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
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
