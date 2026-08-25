import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { In, Repository } from 'typeorm';
import { UsersHttpClient, UserStub } from '../../../common/http-clients/users.http-client';
import { EventBusService } from '../../../common/events/event-bus.service';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import {
  DutyAssignment,
  DutyCoverageStatus,
  DutyDailyCoverage,
  DutyException,
  DutyExceptionType,
  DutyMeetingReservation,
  DutyReservationStatus,
  DutyRosterMembership,
  DutyType,
} from '../entities/duty.entity';
import { AttendanceStatus, TechAttendance } from '../entities/tech-attendance.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { SseService } from './sse.service';

type Actor = { id: number; role: string };
const DUTY_PRIORITY = [DutyType.OD, DutyType.ROC, DutyType.CONFERENCE, DutyType.OPCEN];
const DUTY_TYPES = DUTY_PRIORITY;
const MEETING_TYPES = [DutyType.ROC, DutyType.CONFERENCE, DutyType.OPCEN];
// OPEN tickets have no assigned technician yet, so they must not block duty selection.
const ACTIVE_TICKET_STATUSES = [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.PAUSE];
const DUTY_TIME_ZONE = 'Asia/Manila';

@Injectable()
export class DutyService {
  constructor(
    @InjectRepository(DutyRosterMembership) private readonly rosterRepo: Repository<DutyRosterMembership>,
    @InjectRepository(DutyAssignment) private readonly assignmentRepo: Repository<DutyAssignment>,
    @InjectRepository(DutyException) private readonly exceptionRepo: Repository<DutyException>,
    @InjectRepository(DutyMeetingReservation) private readonly reservationRepo: Repository<DutyMeetingReservation>,
    @InjectRepository(DutyDailyCoverage) private readonly coverageRepo: Repository<DutyDailyCoverage>,
    @InjectRepository(TechAttendance) private readonly attendanceRepo: Repository<TechAttendance>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    private readonly usersClient: UsersHttpClient,
    private readonly roleCaps: RoleCapabilitiesService,
    private readonly eventBus: EventBusService,
    private readonly sse: SseService,
    @InjectRepository(TicketingConfig) private readonly configRepo: Repository<TicketingConfig>,
  ) {}

  private today(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
  }

  private assertDutyType(value: string, meetingsOnly = false): DutyType {
    if (!DUTY_TYPES.includes(value as DutyType) || (meetingsOnly && !MEETING_TYPES.includes(value as DutyType))) {
      throw new BadRequestException(`Invalid duty type: ${value}`);
    }
    return value as DutyType;
  }

  private isAdmin(actor: Actor): boolean {
    return this.roleCaps.isDutyAdminAccess(actor.role);
  }

  private timeToMinutes(value: string | null | undefined): number {
    const [hours, minutes] = String(value || '00:00:00').split(':').map(Number);
    return hours * 60 + minutes;
  }

  private currentTimeMinutes(): number {
    const value = new Intl.DateTimeFormat('en-GB', {
      timeZone: DUTY_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
    return this.timeToMinutes(value);
  }

  /** Duty selection follows attendance, office start, and the configured shift end. */
  private async isAttendanceEligible(userId: number, date: string): Promise<boolean> {
    const attendance = await this.attendanceRepo.findOne({ where: { userId, date } });
    if (!attendance || attendance.status !== AttendanceStatus.PRESENT) return false;
    if (date !== this.today()) return true;

    const config = await this.configRepo.findOne({ where: { id: 1 } });
    const now = this.currentTimeMinutes();
    const isCww = config?.scheduleMode === 'CWW';
    const officeStart = this.timeToMinutes(isCww ? config?.cwwClockinStart : config?.officeClockin);
    const officeEnd = this.timeToMinutes(isCww ? config?.cwwClockoutEnd : config?.officeClockout);
    if (now < officeStart || now > officeEnd) return false;

    // A manual PRESENT override is accepted by the attendance module even without DTR time.
    if (!attendance.clockInTime && attendance.isManualOverride) return true;
    if (!attendance.clockInTime) return false;

    const clockIn = new Date(attendance.clockInTime);
    const clockInText = new Intl.DateTimeFormat('en-GB', {
      timeZone: DUTY_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(clockIn);
    const clockInMinutes = this.timeToMinutes(clockInText);
    const cwwWindowEnd = this.timeToMinutes(config?.cwwClockinEnd);
    if (isCww && clockInMinutes > cwwWindowEnd) return false;
    if (!isCww && clockInMinutes > this.timeToMinutes(config?.officeClockin)) return false;

    if (isCww && clockInMinutes <= cwwWindowEnd) {
      const cwwStart = this.timeToMinutes(config?.cwwClockinStart);
      if (clockInMinutes < cwwStart) return now <= this.timeToMinutes(config?.cwwClockoutStart);
      return Date.now() <= clockIn.getTime() + 11 * 60 * 60 * 1000;
    }
    return true;
  }

  private meetingSlot(startTime?: string | null, endTime?: string | null): 'AM' | 'PM' | 'WHOLE_DAY' {
    if (!startTime && !endTime) return 'WHOLE_DAY';
    if (!startTime || !endTime) throw new BadRequestException('Meeting start and end are both required, or leave both blank for Whole Day.');
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    if (end <= start) throw new BadRequestException('Meeting end time must be after the start time.');
    if (start < 12 * 60 && end <= 12 * 60) return 'AM';
    if (start >= 12 * 60 && end <= 24 * 60) return 'PM';
    throw new BadRequestException('A meeting cannot cross AM and PM. Use separate AM and PM reservations.');
  }

  private async isCurrentOd(userId: number, date = this.today()): Promise<boolean> {
    const logged = await this.assignmentRepo.exist({ where: { dutyDate: date, dutyType: DutyType.OD, userId } });
    if (logged) return true;
    const rotation = await this.getRotation(date, DutyType.OD);
    return rotation[0]?.userId === userId;
  }

  async getAccess(actor: Actor) {
    const admin = this.isAdmin(actor);
    const viewer = admin || this.roleCaps.isDutyViewerAccess(actor.role);
    const currentOd = await this.isCurrentOd(actor.id);
    return { viewer, admin, canSchedule: admin || currentOd, currentOd };
  }

  async assertRead(actor: Actor): Promise<void> {
    const access = await this.getAccess(actor);
    if (!access.viewer && !access.canSchedule) throw new ForbiddenException('Duty access is required.');
  }

  private assertAdmin(actor: Actor): void {
    if (!this.isAdmin(actor)) throw new ForbiddenException('Duty Administrator access is required.');
  }

  private async usersById(): Promise<Map<number, UserStub>> {
    const users = await this.usersClient.getUsers();
    return new Map(users.map((u) => [u.id, u]));
  }

  /**
   * The roster is shared by all duties. Existing installations may still have
   * legacy per-duty rows, so OD is treated as the canonical list until the
   * shared-roster migration is applied.
   */
  private async sharedRosterMembers(): Promise<DutyRosterMembership[]> {
    const rows = await this.rosterRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const canonicalRows = rows.filter((row) => row.dutyType === DutyType.OD);
    const source = canonicalRows.length
      ? canonicalRows
      : [...rows].sort((a, b) => DUTY_PRIORITY.indexOf(a.dutyType) - DUTY_PRIORITY.indexOf(b.dutyType) || a.sortOrder - b.sortOrder);
    const unique = new Map<number, DutyRosterMembership>();
    for (const row of source) if (!unique.has(row.userId)) unique.set(row.userId, row);
    return [...unique.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.userId - b.userId);
  }

  async getRotation(date = this.today(), type?: DutyType) {
    const sharedRoster = await this.sharedRosterMembers();
    const roster = (type ? [type] : DUTY_PRIORITY).flatMap((dutyType) =>
      sharedRoster.map((member) => ({ ...member, id: `${member.id}:${dutyType}`, dutyType })),
    );
    const exceptions = await this.exceptionRepo.find({ where: { exceptionDate: date } });
    const excluded = new Set(exceptions.map((e) => e.userId));
    const users = await this.usersById();
    const rows = await Promise.all(roster.map(async (member) => {
      const last = await this.assignmentRepo
        .createQueryBuilder('d')
        .where('d.user_id = :userId', { userId: member.userId })
        .andWhere('d.duty_type = :dutyType', { dutyType: member.dutyType })
        .andWhere('d.duty_date <= :date', { date })
        .orderBy('d.duty_date', 'DESC')
        .getOne();
      const daysSince = last
        ? Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${last.dutyDate}T00:00:00Z`)) / 86400000)
        : 9999;
      const user = users.get(member.userId);
      return {
        ...member,
        name: user ? `${user.first_name} ${user.last_name}`.trim() : `User #${member.userId}`,
        lastAssigned: last?.dutyDate ?? null,
        daysSince,
        excluded: exceptions.some((exception) =>
          exception.userId === member.userId
          && (!exception.dutyType || exception.dutyType === member.dutyType),
        ),
        next: false,
      };
    }));
    const selectedForToday = new Set<number>();
    // OD is first because it is the daily duty; a person already selected there
    // cannot become NEXT for a venue duty on the same day.
    for (const dutyType of type ? [type] : DUTY_PRIORITY) {
      const eligible = rows
        .filter((r) => r.dutyType === dutyType && !r.excluded && !selectedForToday.has(r.userId))
        .sort((a, b) => b.daysSince - a.daysSince || a.sortOrder - b.sortOrder || a.userId - b.userId);
      if (eligible[0]) {
        eligible[0].next = true;
        selectedForToday.add(eligible[0].userId);
      }
    }
    return rows.sort((a, b) => DUTY_PRIORITY.indexOf(a.dutyType) - DUTY_PRIORITY.indexOf(b.dutyType) || Number(b.next) - Number(a.next) || b.daysSince - a.daysSince || a.sortOrder - b.sortOrder);
  }

  async getDashboard(date = this.today()) {
    const rotation = await this.getRotation(date);
    const coverages = await this.coverageRepo.find({ where: { dutyDate: date } });
    const users = await this.usersById();
    const selectedUsers = new Set<number>();
    const cards = [];
    for (const dutyType of DUTY_PRIORITY) {
      const coverage = coverages.find((c) => c.dutyType === dutyType && c.status !== DutyCoverageStatus.CANCELLED);
      const assigned = coverage?.assignedUserId ? users.get(coverage.assignedUserId) : null;
      const assignedRotation = coverage?.assignedUserId ? rotation.find((r) => r.userId === coverage.assignedUserId && r.dutyType === dutyType) : null;
      const assignedIsEligible = Boolean(
        assigned
        && coverage?.status === DutyCoverageStatus.ACTIVE
        && !selectedUsers.has(coverage.assignedUserId!)
        && await this.isActiveCoverageAttendanceEligible(coverage),
      );
      let displayCoverage: DutyDailyCoverage | null = coverage ?? null;
      let interventionCandidate = null;
      if (coverage?.status === DutyCoverageStatus.ACTIVE && !assignedIsEligible) displayCoverage = null;
      if (coverage?.status === DutyCoverageStatus.INTERVENTION_REQUIRED) {
        const candidates = rotation
          .filter((r) => r.dutyType === dutyType && !r.excluded && !selectedUsers.has(r.userId))
          .sort((a, b) => b.daysSince - a.daysSince || a.sortOrder - b.sortOrder || a.userId - b.userId);
        for (const candidate of candidates) {
          if (await this.isAttendanceEligible(candidate.userId, date)) {
            interventionCandidate = candidate;
            break;
          }
        }
        if (interventionCandidate) selectedUsers.add(interventionCandidate.userId);
        if (!interventionCandidate) displayCoverage = null;
      }
      if (assignedIsEligible) selectedUsers.add(coverage!.assignedUserId!);
      let next = null;
      if (!displayCoverage) {
        const candidates = rotation
          .filter((r) => r.dutyType === dutyType && !r.excluded && !selectedUsers.has(r.userId))
          .sort((a, b) => b.daysSince - a.daysSince || a.sortOrder - b.sortOrder || a.userId - b.userId);
        for (const candidate of candidates) {
          if (await this.isAttendanceEligible(candidate.userId, date)) { next = candidate; break; }
        }
        if (next) selectedUsers.add(next.userId);
      }
      const isOnDuty = assignedIsEligible;
      cards.push({
        dutyType,
        coverageId: displayCoverage?.id ?? null,
        userId: displayCoverage?.status === DutyCoverageStatus.INTERVENTION_REQUIRED ? interventionCandidate?.userId ?? null : displayCoverage?.assignedUserId ?? next?.userId ?? null,
        name: isOnDuty ? `${assigned!.first_name} ${assigned!.last_name}`.trim() : interventionCandidate?.name ?? next?.name ?? 'No Eligible Technicians',
        daysSince: isOnDuty
          ? (assignedRotation?.daysSince === 9999 ? null : assignedRotation?.daysSince ?? null)
          : (interventionCandidate ?? next)?.daysSince === 9999 ? null : (interventionCandidate ?? next)?.daysSince ?? null,
        isOnDuty,
        isNext: Boolean(next),
        hasTechnician: Boolean(isOnDuty || next || interventionCandidate),
        isSubstitute: displayCoverage?.isSubstitute ?? false,
        coverageStatus: displayCoverage?.status ?? null,
        requiresReassignment: displayCoverage?.status === DutyCoverageStatus.INTERVENTION_REQUIRED,
      });
    }
    return cards;
  }

  async getMap(year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    const between = (field: string) => `${field} BETWEEN :start AND :end`;
    const [assignments, exceptions, reservations, coverages, users] = await Promise.all([
      this.assignmentRepo.createQueryBuilder('x').where(between('x.duty_date'), { start, end }).getMany(),
      this.exceptionRepo.createQueryBuilder('x').where(between('x.exception_date'), { start, end }).getMany(),
      this.reservationRepo.createQueryBuilder('x').where(between('x.meeting_date'), { start, end }).getMany(),
      this.coverageRepo.createQueryBuilder('x').where(between('x.duty_date'), { start, end }).getMany(),
      this.usersById(),
    ]);
    const name = (id: number | null) => id && users.get(id) ? `${users.get(id)!.first_name} ${users.get(id)!.last_name}`.trim() : null;
    return {
      assignments: assignments.map((x) => ({ ...x, name: name(x.userId) })),
      exceptions: exceptions.map((x) => ({ ...x, name: name(x.userId) })),
      reservations,
      coverages: coverages.map((x) => ({ ...x, name: name(x.assignedUserId) })),
    };
  }

  async listAssignments(page = 1, limit = 10) {
    const pagination = this.normalizePagination(page, limit);
    const [[rows, total], users] = await Promise.all([
      this.assignmentRepo.findAndCount({
        order: { dutyDate: 'DESC', createdAt: 'DESC' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.usersById(),
    ]);
    return {
      items: rows.map((x) => ({ ...x, name: users.get(x.userId) ? `${users.get(x.userId)!.first_name} ${users.get(x.userId)!.last_name}`.trim() : `User #${x.userId}` })),
      total,
      ...pagination,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async saveAssignment(actor: Actor, body: Partial<DutyAssignment>, id?: string) {
    this.assertAdmin(actor);
    const existing = id ? await this.assignmentRepo.findOne({ where: { id } }) : null;
    if (id && !existing) throw new NotFoundException('Duty log entry not found.');
    const dutyDate = String(body.dutyDate ?? existing?.dutyDate ?? '');
    const userId = Number(body.userId ?? existing?.userId);
    const dutyType = this.assertDutyType(String(body.dutyType ?? existing?.dutyType));
    const sameDay = await this.assignmentRepo.find({ where: { dutyDate, userId } });
    const duplicate = sameDay.find((row) => row.id !== existing?.id);
    if (duplicate) {
      throw new BadRequestException(`This technician already has ${duplicate.dutyType} duty on ${dutyDate}. One technician cannot cover multiple duties on the same day.`);
    }
    const row = this.assignmentRepo.create({ ...existing, ...body, dutyDate, userId, dutyType, createdById: existing?.createdById ?? actor.id });
    const saved = await this.assignmentRepo.save(row);
    this.sse.emitDutyUpdated();
    return saved;
  }

  async deleteAssignment(actor: Actor, id: string) {
    this.assertAdmin(actor);
    const existing = await this.assignmentRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Duty log entry not found. It may have already been deleted.');
    await this.assignmentRepo.delete(id);
    this.sse.emitDutyUpdated();
  }

  async listExceptions(page = 1, limit = 10) {
    const pagination = this.normalizePagination(page, limit);
    const [items, total] = await this.exceptionRepo.findAndCount({
      order: { exceptionDate: 'DESC', createdAt: 'DESC' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });
    return { items, total, ...pagination, totalPages: Math.ceil(total / pagination.limit) };
  }
  async saveException(actor: Actor, body: Partial<DutyException>, id?: string) {
    this.assertAdmin(actor);
    const existing = id ? await this.exceptionRepo.findOne({ where: { id } }) : null;
    if (id && !existing) throw new NotFoundException('Duty exception not found.');
    const exceptionDate = String(body.exceptionDate ?? existing?.exceptionDate ?? '');
    const userId = Number(body.userId ?? existing?.userId);
    const registeredRoster = await this.sharedRosterMembers();
    if (!registeredRoster.some((member) => member.userId === userId)) {
      throw new BadRequestException('Duty exceptions can only be registered for technicians on the shared duty roster.');
    }
    const dutyType = body.dutyType !== undefined
      ? (body.dutyType ? this.assertDutyType(String(body.dutyType)) : null)
      : (existing?.dutyType ?? null);
    const sameUserDate = await this.exceptionRepo.find({ where: { exceptionDate, userId } });
    const duplicate = sameUserDate.find((row) =>
      row.id !== existing?.id && (row.dutyType ?? null) === dutyType,
    );
    if (duplicate && duplicate.id !== existing?.id) {
      throw new BadRequestException(`This technician already has an exception for ${dutyType || 'all duties'} on ${exceptionDate}.`);
    }
    const saved = await this.exceptionRepo.save(this.exceptionRepo.create({ ...existing, ...body, exceptionDate, userId, dutyType, createdById: existing?.createdById ?? actor.id }));
    if (exceptionDate === this.today()) await this.reconcileToday();
    this.sse.emitDutyUpdated();
    return saved;
  }
  async deleteException(actor: Actor, id: string) {
    this.assertAdmin(actor);
    const existing = await this.exceptionRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Duty exception not found. It may have already been deleted.');
    await this.exceptionRepo.delete(id);
    if (existing?.exceptionDate === this.today()) await this.reconcileToday();
    this.sse.emitDutyUpdated();
  }

  async getRoster() {
    const [members, users] = await Promise.all([this.sharedRosterMembers(), this.usersById()]);
    return members.map((member) => {
      const user = users.get(member.userId);
      return {
        id: member.id,
        userId: member.userId,
        sortOrder: member.sortOrder,
        name: user ? `${user.first_name} ${user.last_name}`.trim() : `User #${member.userId}`,
      };
    });
  }

  async replaceRoster(actor: Actor, userIds: number[]) {
    this.assertAdmin(actor);
    const selectedUserIds = Array.from(new Set((userIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
    const users = await this.usersById();
    for (const userId of selectedUserIds) {
      const user = users.get(userId);
      if (!user || !this.roleCaps.isAttendanceEligible(user.role)) {
        throw new BadRequestException('Only active duty staff can be added to a Duty roster.');
      }
    }
    await this.rosterRepo.update({ isActive: true }, { isActive: false });
    for (let i = 0; i < selectedUserIds.length; i++) {
      let row = await this.rosterRepo.findOne({ where: { dutyType: DutyType.OD, userId: selectedUserIds[i] } });
      row = this.rosterRepo.create({ ...row, dutyType: DutyType.OD, userId: selectedUserIds[i], sortOrder: i, isActive: true });
      await this.rosterRepo.save(row);
    }
    this.sse.emitDutyUpdated();
    return this.getRoster();
  }

  async listReservations() { return this.reservationRepo.find({ order: { meetingDate: 'DESC', startTime: 'ASC' }, take: 500 }); }
  async saveReservation(actor: Actor, body: Partial<DutyMeetingReservation>, id?: string) {
    const access = await this.getAccess(actor);
    if (!access.canSchedule) throw new ForbiddenException('Only a Duty Administrator or the current OD can manage meeting schedules.');
    const existing = id ? await this.reservationRepo.findOne({ where: { id } }) : null;
    if (id && !existing) throw new NotFoundException('Meeting reservation not found.');
    const venueType = this.assertDutyType(String(body.venueType ?? existing?.venueType), true);
    const meetingDate = String(body.meetingDate ?? existing?.meetingDate ?? '');
    const status = body.status ?? existing?.status ?? (meetingDate === this.today() ? DutyReservationStatus.CONFIRMED : DutyReservationStatus.SCHEDULED);
    const slot = this.meetingSlot(body.startTime ?? existing?.startTime, body.endTime ?? existing?.endTime);
    const sameDayReservations = await this.reservationRepo.find({ where: { meetingDate, venueType } });
    for (const reservation of sameDayReservations) {
      if (reservation.id === existing?.id || reservation.status === DutyReservationStatus.CANCELLED) continue;
      const otherSlot = this.meetingSlot(reservation.startTime, reservation.endTime);
      if (slot === 'WHOLE_DAY' || otherSlot === 'WHOLE_DAY' || slot === otherSlot) {
        throw new BadRequestException(`${venueType} already has a ${otherSlot.replace('_', ' ')} meeting on ${meetingDate}. Only one AM and one PM meeting are allowed per duty area.`);
      }
    }
    const saved = await this.reservationRepo.save(this.reservationRepo.create({ ...existing, ...body, venueType, meetingDate, status, createdById: existing?.createdById ?? actor.id }));
    if (meetingDate === this.today() && status !== DutyReservationStatus.CANCELLED) await this.reconcileToday();
    this.sse.emitDutyUpdated();
    return saved;
  }

  async deleteReservation(actor: Actor, id: string) {
    const access = await this.getAccess(actor);
    if (!access.canSchedule) throw new ForbiddenException('Duty schedule access is required.');
    const row = await this.reservationRepo.findOne({ where: { id } });
    if (!row) return;
    await this.reservationRepo.delete(id);
    this.sse.emitDutyUpdated();
  }

  async blockedTechnicianIds(date: string): Promise<number[]> {
    const rows = await this.coverageRepo.find({ where: { dutyDate: date, status: In([DutyCoverageStatus.ACTIVE, DutyCoverageStatus.INTERVENTION_REQUIRED]) } });
    return rows.filter((x) => x.status === DutyCoverageStatus.ACTIVE && x.assignedUserId).map((x) => x.assignedUserId!);
  }

  private coverageCandidateUserId(coverage: DutyDailyCoverage): number | null {
    if (coverage.status === DutyCoverageStatus.ACTIVE) return coverage.assignedUserId;
    if (coverage.status === DutyCoverageStatus.INTERVENTION_REQUIRED) return coverage.primaryUserId;
    return null;
  }

  private async isActiveCoverageAttendanceEligible(coverage: DutyDailyCoverage): Promise<boolean> {
    const attendance = await this.attendanceRepo.findOne({
      where: { userId: coverage.assignedUserId!, date: coverage.dutyDate },
    });
    if (
      coverage.attendanceOverridden
      && attendance?.status === AttendanceStatus.OUT_OF_OFFICE
      && String(attendance.notes || '').endsWith(' DUTY')
    ) return true;
    return this.isAttendanceEligible(coverage.assignedUserId!, coverage.dutyDate);
  }

  async reconcileCoverage(date: string, type: DutyType) {
    const reservations = await this.reservationRepo.find({ where: { meetingDate: date, venueType: type } });
    if (type !== DutyType.OD && !reservations.some((r) => r.status !== DutyReservationStatus.CANCELLED)) return null;
    const priorTypes = DUTY_PRIORITY.slice(0, DUTY_PRIORITY.indexOf(type));
    const priorCoverages = priorTypes.length
      ? await this.coverageRepo.find({
        where: {
          dutyDate: date,
          dutyType: In(priorTypes),
          status: In([DutyCoverageStatus.ACTIVE, DutyCoverageStatus.INTERVENTION_REQUIRED]),
        },
      })
      : [];
    const reservedByPriorDuty = new Map<number, DutyDailyCoverage>();
    for (const coverage of priorCoverages) {
      const userId = this.coverageCandidateUserId(coverage);
      if (userId) reservedByPriorDuty.set(userId, coverage);
    }
    let currentCoverage = await this.coverageRepo.findOne({ where: { dutyDate: date, dutyType: type } });
    const currentCandidateId = currentCoverage ? this.coverageCandidateUserId(currentCoverage) : null;
    if (currentCoverage && currentCandidateId && reservedByPriorDuty.has(currentCandidateId)) {
      const priorCoverage = reservedByPriorDuty.get(currentCandidateId)!;
      if (currentCoverage.attendanceOverridden) {
        const attendance = await this.attendanceRepo.findOne({ where: { userId: currentCandidateId, date } });
        if (attendance) {
          attendance.status = AttendanceStatus.OUT_OF_OFFICE;
          attendance.notes = `${priorCoverage.dutyType} DUTY`;
          attendance.isManualOverride = true;
          await this.attendanceRepo.save(attendance);
        }
      }
      currentCoverage.status = DutyCoverageStatus.CANCELLED;
      currentCoverage.assignedUserId = null;
      currentCoverage.attendanceOverridden = false;
      currentCoverage = await this.coverageRepo.save(currentCoverage);
    }
    if (currentCoverage?.assignedUserId && currentCoverage.status === DutyCoverageStatus.ACTIVE) {
      const assignedException = await this.exceptionRepo.findOne({ where: { exceptionDate: date, userId: currentCoverage.assignedUserId } });
      const assignedAttendanceEligible = await this.isActiveCoverageAttendanceEligible(currentCoverage);
      if (assignedException || !assignedAttendanceEligible) {
        await this.restoreAttendance(currentCoverage);
        currentCoverage.status = DutyCoverageStatus.CANCELLED;
        await this.coverageRepo.save(currentCoverage);
        currentCoverage = null;
      }
    }
    // Duty must never auto-substitute around a primary technician with tickets.
    // Existing substitute coverage is returned to manual intervention so the
    // administrator can activate the primary after reassignment or skip them.
    if (currentCoverage?.status === DutyCoverageStatus.ACTIVE && currentCoverage.isSubstitute) {
      await this.restoreAttendance(currentCoverage);
      currentCoverage.assignedUserId = null;
      currentCoverage.isSubstitute = false;
      currentCoverage.substitutionReason = null;
      currentCoverage.attendanceOverridden = false;
      currentCoverage.status = DutyCoverageStatus.INTERVENTION_REQUIRED;
      currentCoverage = await this.coverageRepo.save(currentCoverage);
    }
    if (currentCoverage && ![DutyCoverageStatus.INTERVENTION_REQUIRED, DutyCoverageStatus.CANCELLED].includes(currentCoverage.status)) {
      return currentCoverage;
    }
    const rotation = (await this.getRotation(date, type)).filter((r) => !r.excluded);
    if (!rotation.length) throw new BadRequestException(`No eligible ${type} duty roster members.`);
    const alreadyServing = new Set(reservedByPriorDuty.keys());
    const candidates = (await Promise.all(rotation.map(async (candidate) => ({
      candidate,
      eligible: await this.isAttendanceEligible(candidate.userId, date),
    })))).filter((x) => x.eligible && !alreadyServing.has(x.candidate.userId)).map((x) => x.candidate);
    // No present/on-time candidate means there is no duty coverage yet. This is
    // different from intervention_required, which means every eligible person
    // is blocked by active tickets and requires manual reassignment.
    if (candidates.length === 0) {
      if (currentCoverage?.status === DutyCoverageStatus.INTERVENTION_REQUIRED) {
        currentCoverage.status = DutyCoverageStatus.CANCELLED;
        await this.coverageRepo.save(currentCoverage);
      }
      return null;
    }
    const counts = candidates.length ? await this.ticketRepo.createQueryBuilder('t')
      .select('t.assigned_to_id', 'userId').addSelect('COUNT(*)', 'count')
      .where('t.assigned_to_id IN (:...ids)', { ids: candidates.map((x) => x.userId) })
      .andWhere('t.status IN (:...statuses)', { statuses: ACTIVE_TICKET_STATUSES })
      .groupBy('t.assigned_to_id').getRawMany() : [];
    const activeCounts = new Map(counts.map((x) => [Number(x.userId), Number(x.count)]));
    const selected = activeCounts.get(candidates[0].userId) ? null : candidates[0];
    let coverage = currentCoverage;
    coverage = this.coverageRepo.create({
      ...coverage,
      dutyDate: date,
      dutyType: type,
      primaryUserId: candidates[0].userId,
      assignedUserId: selected?.userId ?? null,
      isSubstitute: Boolean(selected && selected.userId !== candidates[0].userId),
      substitutionReason: null,
      status: selected ? DutyCoverageStatus.ACTIVE : DutyCoverageStatus.INTERVENTION_REQUIRED,
      previousAttendanceStatus: null,
      previousAttendanceNotes: null,
      attendanceOverridden: false,
      releasedAt: null,
    });
    if (selected) {
      const attendance = await this.attendanceRepo.findOne({ where: { userId: selected.userId, date } });
      if (!attendance) throw new BadRequestException('The selected technician has no attendance record.');
      coverage.previousAttendanceStatus = attendance.status;
      coverage.previousAttendanceNotes = attendance.notes;
      coverage.attendanceOverridden = true;
      attendance.status = AttendanceStatus.OUT_OF_OFFICE;
      attendance.notes = `${type} DUTY`;
      attendance.isManualOverride = true;
      await this.attendanceRepo.save(attendance);
    }
    coverage = await this.coverageRepo.save(coverage);
    this.sse.emitAttendanceUpdated();
    this.sse.emitDutyUpdated();
    return { ...coverage, activeTicketCounts: Object.fromEntries(activeCounts) };
  }

  async activateCoverage(actor: Actor, id: string, userId: number) {
    this.assertAdmin(actor);
    const coverage = await this.coverageRepo.findOne({ where: { id } });
    if (!coverage) throw new NotFoundException('Duty coverage not found.');
    const otherCoverages = await this.coverageRepo.find({
      where: {
        dutyDate: coverage.dutyDate,
        status: In([DutyCoverageStatus.ACTIVE, DutyCoverageStatus.INTERVENTION_REQUIRED]),
      },
    });
    const conflictingDuty = otherCoverages.find((row) => row.id !== coverage.id && this.coverageCandidateUserId(row) === userId);
    if (conflictingDuty) {
      throw new BadRequestException(`This technician is already selected for ${conflictingDuty.dutyType} duty on ${coverage.dutyDate}.`);
    }
    const activeTickets = await this.ticketRepo.count({
      where: { assignedToId: userId, status: In(ACTIVE_TICKET_STATUSES) },
    });
    if (activeTickets > 0) {
      throw new BadRequestException('Reassign the technician active tickets with justification before activating Duty coverage.');
    }
    const attendance = await this.attendanceRepo.findOne({ where: { date: coverage.dutyDate, userId } });
    if (!attendance || attendance.status !== AttendanceStatus.PRESENT) {
      throw new BadRequestException('The selected technician must have PRESENT attendance.');
    }
    coverage.assignedUserId = userId;
    coverage.isSubstitute = userId !== coverage.primaryUserId;
    coverage.substitutionReason = coverage.isSubstitute ? 'Duty Administrator selected a substitute after ticket reassignment.' : null;
    coverage.previousAttendanceStatus = attendance.status;
    coverage.previousAttendanceNotes = attendance.notes;
    coverage.attendanceOverridden = true;
    coverage.status = DutyCoverageStatus.ACTIVE;
    attendance.status = AttendanceStatus.OUT_OF_OFFICE;
    attendance.notes = `${coverage.dutyType} DUTY`;
    attendance.isManualOverride = true;
    await this.attendanceRepo.save(attendance);
    await this.coverageRepo.save(coverage);
    this.sse.emitAttendanceUpdated();
    this.sse.emitDutyUpdated();
    return coverage;
  }

  async skipCoverage(actor: Actor, id: string, userId: number) {
    this.assertAdmin(actor);
    const coverage = await this.coverageRepo.findOne({ where: { id } });
    if (!coverage) throw new NotFoundException('Duty coverage not found.');
    if (coverage.status !== DutyCoverageStatus.INTERVENTION_REQUIRED) {
      throw new BadRequestException('Only a duty technician blocked by active tickets can be skipped.');
    }
    if (coverage.dutyDate !== this.today()) {
      throw new BadRequestException('Only the current day duty technician can be skipped.');
    }
    const rotation = await this.getRotation(coverage.dutyDate, coverage.dutyType);
    const candidate = rotation.find((row) => row.userId === userId && !row.excluded);
    if (!candidate || !(await this.isAttendanceEligible(userId, coverage.dutyDate))) {
      throw new BadRequestException('The selected technician is not an eligible current duty candidate.');
    }
    const activeTickets = await this.ticketRepo.count({
      where: { assignedToId: userId, status: In(ACTIVE_TICKET_STATUSES) },
    });
    if (activeTickets === 0) {
      throw new BadRequestException('Skip is only for a technician who is keeping active tickets instead of taking the duty.');
    }
    await this.saveException(actor, {
      exceptionDate: coverage.dutyDate,
      userId,
      dutyType: coverage.dutyType,
      type: DutyExceptionType.DUE_TO_TA,
      remarks: 'Technician chose to continue active tickets instead of taking the scheduled duty.',
    });
    return { skippedUserId: userId, dashboard: await this.getDashboard(coverage.dutyDate) };
  }

  async releaseCoverage(actor: Actor, id: string) {
    this.assertAdmin(actor);
    const coverage = await this.coverageRepo.findOne({ where: { id } });
    if (!coverage) throw new NotFoundException('Duty coverage not found.');
    await this.restoreAttendance(coverage);
    coverage.status = DutyCoverageStatus.RELEASED;
    coverage.releasedAt = new Date();
    await this.coverageRepo.save(coverage);
    this.sse.emitDutyUpdated();
    return coverage;
  }

  private async restoreAttendance(coverage: DutyDailyCoverage) {
    if (coverage.assignedUserId && coverage.attendanceOverridden) {
      const attendance = await this.attendanceRepo.findOne({ where: { date: coverage.dutyDate, userId: coverage.assignedUserId } });
      if (attendance) {
        attendance.status = (coverage.previousAttendanceStatus as AttendanceStatus) || AttendanceStatus.PRESENT;
        attendance.notes = coverage.previousAttendanceNotes;
        await this.attendanceRepo.save(attendance);
      }
      await this.eventBus.publish('attendance.verified', { userId: coverage.assignedUserId });
    }
    this.sse.emitAttendanceUpdated();
  }

  /**
   * Clear duty-generated OOO states left behind by a cancelled or incomplete
   * coverage row. Real attendance records are untouched unless their exact
   * synthetic duty note no longer belongs to an active assigned coverage.
   */
  private async restoreOrphanedDutyAttendance(date: string): Promise<void> {
    const [attendanceRows, coverages] = await Promise.all([
      this.attendanceRepo.find({ where: { date, status: AttendanceStatus.OUT_OF_OFFICE } }),
      this.coverageRepo.find({ where: { dutyDate: date } }),
    ]);
    const assignedDutyUsers = new Set(
      coverages
        .filter((coverage) => coverage.status === DutyCoverageStatus.ACTIVE && coverage.assignedUserId && coverage.attendanceOverridden)
        .map((coverage) => coverage.assignedUserId),
    );
    let restored = false;
    for (const attendance of attendanceRows) {
      const note = String(attendance.notes || '').trim().toUpperCase();
      const isSyntheticDutyNote = DUTY_TYPES.some((type) => note === `${type} DUTY`);
      if (!isSyntheticDutyNote || assignedDutyUsers.has(attendance.userId)) continue;
      attendance.status = AttendanceStatus.PRESENT;
      attendance.notes = null;
      attendance.isManualOverride = false;
      await this.attendanceRepo.save(attendance);
      restored = true;
    }
    if (restored) this.sse.emitAttendanceUpdated();
  }

  @Cron('*/5 * * * *', { timeZone: 'Asia/Manila' })
  async reconcileToday() {
    const date = this.today();
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    const now = this.currentTimeMinutes();
    const start = this.timeToMinutes(config?.scheduleMode === 'CWW' ? config?.cwwClockinStart : config?.officeClockin);
    if (now < start) return;
    await this.restoreOrphanedDutyAttendance(date);
    // OD is resolved first so the daily officer cannot also be selected for a venue duty.
    for (const type of DUTY_PRIORITY) await this.reconcileCoverage(date, type);
  }

  async reconcile(actor: Actor) {
    this.assertAdmin(actor);
    await this.reconcileToday();
    return { reconciled: true };
  }

  private normalizePagination(page: number, limit: number) {
    const safePage = Math.max(1, Number.isFinite(Number(page)) ? Math.floor(Number(page)) : 1);
    const safeLimit = Math.min(100, Math.max(1, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : 10));
    return { page: safePage, limit: safeLimit };
  }

  @Cron('* * * * 1-5', { timeZone: 'Asia/Manila' })
  async finalizeToday() {
    const date = this.today();
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    const now = this.currentTimeMinutes();
    const workdayEnd = this.timeToMinutes(config?.scheduleMode === 'CWW' ? config?.cwwClockoutEnd : config?.officeClockout);
    if (now < workdayEnd) return;
    const coverages = await this.coverageRepo.find({ where: { dutyDate: date, status: In([DutyCoverageStatus.ACTIVE, DutyCoverageStatus.RELEASED]) } });
    for (const coverage of coverages) {
      const reservations = await this.reservationRepo.find({ where: { meetingDate: date, venueType: coverage.dutyType } });
      const dutyOccurred = coverage.dutyType === DutyType.OD || reservations.some((x) => [DutyReservationStatus.CONFIRMED, DutyReservationStatus.COMPLETED].includes(x.status));
      if (coverage.assignedUserId && dutyOccurred) {
        const exists = await this.assignmentRepo.exist({ where: { dutyDate: date, dutyType: coverage.dutyType, userId: coverage.assignedUserId } });
        if (!exists) await this.assignmentRepo.save(this.assignmentRepo.create({ dutyDate: date, dutyType: coverage.dutyType, userId: coverage.assignedUserId, remarks: `${coverage.dutyType} meeting duty`, source: 'automatic', createdById: null }));
        coverage.status = DutyCoverageStatus.COMPLETED;
        await this.coverageRepo.save(coverage);
      }
      if (coverage.attendanceOverridden && coverage.status !== DutyCoverageStatus.RELEASED) {
        await this.restoreAttendance(coverage);
      }
    }
    this.sse.emitDutyUpdated();
  }
}
