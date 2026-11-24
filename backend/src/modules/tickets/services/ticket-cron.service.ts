import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketEvent } from '../entities/ticket-event.entity';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { TicketService } from './ticket.service';
import { EmailService } from './email.service';
import { AttendanceService } from './attendance.service';
import { SseService } from './sse.service';
import { UserRole } from '../../shared/entities';
import { NotificationService } from './notification.service';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import { slaSoundStep, SlaSoundKind } from './sla-sound-kind';

@Injectable()
export class TicketCronService implements OnModuleInit {
  private readonly logger = new Logger(TicketCronService.name);
  private readonly finalizedAbsenceDates = new Set<string>();
  private readonly absenceFinalizationAttempts = new Map<string, number>();
  private runningSlaSounds = false;

  onModuleInit() {
    this.logger.log('TicketCronService initialized and ready for cron jobs.');
  }

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketingConfig)
    private readonly configRepo: Repository<TicketingConfig>,
    @InjectRepository(TicketEvent)
    private readonly eventRepo: Repository<TicketEvent>,
    private readonly ticketService: TicketService,
    private readonly emailService: EmailService,
    private readonly attendanceService: AttendanceService,
    private readonly sseService: SseService,
    private readonly notificationService: NotificationService,
    private readonly roleCapabilities: RoleCapabilitiesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduleTasks() {
    this.logger.log('Running minute cron tasks...');
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    if (!config) {
      this.logger.error('[Minute Tasks] No global ticketing config found.');
      return;
    }

    const dtrSynced = await this.processDtrSyncs(config);
    if (dtrSynced) {
      this.sseService.emitAttendanceUpdated();
    }
    await this.processEndOfDayAbsences(config);
    // Attendance must be current before the CWW resume decision is made.
    await this.processSlaSchedules(config);
    // Pause limits are minute-precise. Running this only hourly could grant up
    // to 59 extra paused minutes beyond the configured allowance.
    await this.processAutoUnpause();
    // Never promote queued work using a stale, pre-resume SLA deadline.
    await this.processOverdueTicketsUnpauseNext();
    await this.processSlaSounds(config).catch(() => this.logger.warn('Scheduled SLA sounds could not be processed.'));
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyTasks() {
    this.logger.log('Running hourly ticketing cron tasks...');
    await this.processAutoClosure();
    await this.processAutoUnfreeze();
    await this.processPercentageAlerts();
  }

  @Cron('*/15 * * * *')
  async handle15MinuteTasks() {
    await this.ticketService.retryBenchedKbs();
  }

  private addHoursToTime(timeStr: string, hoursToAdd: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h + hoursToAdd, m, 0, 0);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
  }

  private async processDtrSyncs(config: TicketingConfig) {
    this.logger.log(`[DTR SYNC DEBUG] Starting processDtrSyncs...`);

    // Derive current time in Manila timezone (UTC+8) for schedule boundary comparison
    const now = new Date();
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const currentTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;

    let morningStart, morningEnd, lateEnd;
    if (config.scheduleMode === 'CWW') {
      morningStart = config.cwwClockinStart;
      morningEnd = this.addHoursToTime(config.cwwClockinEnd, 2);
      lateEnd = config.cwwClockoutEnd;
    } else {
      morningStart = config.officeClockin;
      morningEnd = this.addHoursToTime(config.officeClockin, 2);
      lateEnd = config.officeClockout;
    }

    const currentMins = d.getMinutes();
    this.logger.log(`[DTR SYNC DEBUG] CurrentTime: ${currentTime} | Mode: ${config.scheduleMode} | Window: ${morningStart} - ${lateEnd}`);

    // Check if in Morning window
    if (currentTime >= morningStart && currentTime <= morningEnd) {
      this.logger.log(`[DTR SYNC DEBUG] Inside Morning window. Syncing!`);
      return await this.attendanceService.syncAttendanceWithDTR();
    }
    // Check if in Late window (after morning end, before late end)
    else if (currentTime > morningEnd && currentTime <= lateEnd) {
      this.logger.log(`[DTR SYNC DEBUG] Inside Late window. Syncing!`);
      return await this.attendanceService.syncAttendanceWithDTR();
    } else {
      this.logger.log(`[DTR SYNC DEBUG] Outside all active windows. Doing nothing.`);
      return false;
    }
  }

  @Cron('0 8 * * *', { timeZone: 'Asia/Manila' })
  async handleDailyFrozenEmails() {
    this.logger.log('Running daily frozen ticket emails at 8 AM PHT...');
    const frozenTickets = await this.ticketRepo.find({
      where: { status: TicketStatus.FREEZE },
    });

    await this.ticketService.enrichTicketsWithUsers(frozenTickets);

    const byTech: Record<string, { email: string; tickets: Ticket[] }> = {};
    for (const t of frozenTickets) {
      if (t.assignedTo?.email) {
        if (!byTech[t.assignedTo.email]) byTech[t.assignedTo.email] = { email: t.assignedTo.email, tickets: [] };
        byTech[t.assignedTo.email].tickets.push(t);
      }
    }

    for (const data of Object.values(byTech)) {
      try {
        const ticketList = data.tickets.map((t) => `- ${t.ticketNumber}: ${t.subject}`).join('\n');
        await this.emailService.sendGenericEmail(
          data.email,
          'Daily Reminder: Frozen Tickets',
          `You have ${data.tickets.length} frozen ticket(s) waiting for third-party response.\n\n${ticketList}\n\nPlease follow up on them.`
        );
        this.logger.log('Sent daily frozen tickets email.');
      } catch (err: any) {
        this.logger.error(`Failed to send frozen tickets email (${err?.code || 'unknown'}).`);
      }
    }
    for (const ticket of frozenTickets) {
      if (!ticket.assignedToId) continue;
      await this.notificationService.create([ticket.assignedToId], {
        ticketId: ticket.id,
        eventType: 'frozen_ticket_reminder',
        message: `Ticket ${ticket.ticketNumber} is still frozen and requires follow-up.`,
      });
    }
  }

  private async processSlaSchedules(config: TicketingConfig) {
    if (config.isFlagCeremonyPaused) return;
    const overtimeToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    if (await this.attendanceService.isOvertimeDay(overtimeToday)) {
      await this.ticketService.processOvertimeSlaSchedule(config);
      return;
    }

    const now = new Date();
    const manilaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const currentTime = `${String(manilaNow.getHours()).padStart(2, '0')}:${String(manilaNow.getMinutes()).padStart(2, '0')}:00`;
    const isOfficeDay = await this.attendanceService.isOfficeDay(today);

    if (!isOfficeDay) {
      await this.ticketService.pauseAllActiveTickets();
      return;
    }

    // Lunch is outside the SLA business-time window for both schedule modes.
    // Persisting the pause marker keeps the live timer and timeline aligned
    // with the same 12:00–13:00 exclusion already used by deadline calculations.
    if (currentTime >= '12:00:00' && currentTime < '13:00:00') {
      await this.ticketService.pauseAllActiveTickets();
      return;
    }

    if (config.scheduleMode === 'OFFICE_HOURS') {
      if (currentTime >= config.officeClockin && currentTime < config.officeClockout) {
        const resumeAt = new Date(`${today}T${config.officeClockin}+08:00`);
        await this.ticketService.resumeAllActiveTickets(undefined, resumeAt);
      } else {
        await this.ticketService.pauseAllActiveTickets();
      }
    } else if (config.scheduleMode === 'CWW') {
      if (currentTime >= config.cwwClockinStart && currentTime < config.cwwClockinEnd) {
        await this.ticketService.resumeCwwPresentTechnicianTickets(now);
      } else if (currentTime >= config.cwwClockinEnd && currentTime < config.cwwClockoutEnd) {
        const resumeAt = new Date(`${today}T${config.cwwClockinEnd}+08:00`);
        await this.ticketService.resumeAllActiveTickets(undefined, resumeAt);
      } else {
        await this.ticketService.pauseAllActiveTickets();
      }
    }
  }

  private async processEndOfDayAbsences(config: TicketingConfig): Promise<void> {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const manilaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const currentTime = `${String(manilaNow.getHours()).padStart(2, '0')}:${String(manilaNow.getMinutes()).padStart(2, '0')}:00`;
    const workdayEnd = config.scheduleMode === 'CWW'
      ? config.cwwClockoutEnd
      : config.officeClockout;

    if (
      currentTime < workdayEnd ||
      this.finalizedAbsenceDates.has(today) ||
      !(await this.attendanceService.isOfficeDay(today))
    ) {
      return;
    }

    let dtrStatus = this.attendanceService.getDtrSystemStatus();
    if (!dtrStatus.isOnline || dtrStatus.lastSuccessfulSyncDate !== today) {
      const lastAttempt = this.absenceFinalizationAttempts.get(today) ?? 0;
      if (now.getTime() - lastAttempt < 5 * 60 * 1000) return;
      this.absenceFinalizationAttempts.set(today, now.getTime());
      await this.attendanceService.syncAttendanceWithDTR();
      dtrStatus = this.attendanceService.getDtrSystemStatus();
    }

    if (!dtrStatus.isOnline || dtrStatus.lastSuccessfulSyncDate !== today) return;

    const saved = await this.attendanceService.markMissingAttendanceAsAbsent(today);
    this.finalizedAbsenceDates.add(today);
    this.absenceFinalizationAttempts.delete(today);
    for (const date of this.finalizedAbsenceDates) {
      if (date !== today) this.finalizedAbsenceDates.delete(date);
    }
    if (saved > 0) {
      this.logger.log(`Recorded ${saved} end-of-day absence(s) after a healthy DTR sync.`);
      this.sseService.emitAttendanceUpdated();
      await this.notificationService.createForRoles(
        this.roleCapabilities.getRolesWhere('isTicketSettingsFocal'),
        {
          targetPath: '/operations/tickets',
          eventType: 'attendance_absence_report',
          message: `${saved} staff attendance record(s) were marked absent after the workday ended. Review any active ticket assignments.`,
        },
      );
    }
  }

  private async processOverdueTicketsUnpauseNext() {
    const overdueActiveTickets = await this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.status = :status', { status: TicketStatus.IN_PROGRESS })
      .andWhere('ticket.slaStartedAt IS NOT NULL')
      .andWhere('ticket.isSlaWaiting = :isWaiting', { isWaiting: false })
      .andWhere('(ticket.slaPausedAt IS NULL OR ticket.slaDeadline <= ticket.slaPausedAt)')
      .andWhere('ticket.slaDeadline < :now', { now: new Date() })
      .getMany();

    if (overdueActiveTickets.length > 0) {
      this.logger.log(`Cron check: found ${overdueActiveTickets.length} overdue active tickets.`);
    }
    const assigneeIds = new Set(overdueActiveTickets.map((ticket) => ticket.assignedToId));
    for (const techId of assigneeIds) {
      if (techId && await this.ticketService.promoteNextAfterSlaBreach(techId)) {
        this.logger.log('Cron: promoted a queued ticket after an SLA breach.');
      }
    }
  }

  private async processAutoClosure() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const staleResolvedTickets = await this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.status = :status', { status: TicketStatus.RESOLVED })
      .andWhere('COALESCE(ticket.resolutionTimeOverride, ticket.resolvedAt) < :threeDaysAgo', {
        threeDaysAgo,
      })
      .getMany();
    await this.ticketService.enrichTicketsWithUsers(staleResolvedTickets);

    for (const ticket of staleResolvedTickets) {
      try {
        await this.ticketService.updateTicket(
          ticket.id,
          { status: TicketStatus.CLOSED },
          ticket.assignedToId || 1, // System fallback
          UserRole.SUPER_ADMIN,
          { automaticClosure: true },
        );
        this.logger.log('Auto-closed a resolved ticket.');
      } catch (err) {
        this.logger.error(`Failed to auto-close ticket (${err?.code || 'unknown'}).`);
      }
    }
  }

  private async processAutoUnpause() {
    const pausedTickets = await this.ticketRepo.find({
      where: { status: TicketStatus.PAUSE },
      relations: ['category', 'issueTypeConfig'],
    });

    const config = await this.configRepo.findOne({ where: { id: 1 } });
    if (!config) {
      this.logger.error('[Auto-Unpause] No global ticketing config found.');
      return;
    }

    const now = new Date();

    for (const ticket of pausedTickets) {
      if (!ticket.slaPausedAt || !ticket.category) continue;

      const allowableSeconds = (ticket.issueTypeConfig?.allowablePauseHours ?? 48) * 60 * 60;
      const pausedBusinessSeconds = await this.ticketService.calculateBusinessSecondsForSla(
        ticket.slaPausedAt,
        now,
        ticket.overtimeSlaDate ? { ...config, overtimeSlaDate: ticket.overtimeSlaDate } : config,
      );

      if (pausedBusinessSeconds >= allowableSeconds) {
        try {
          await this.ticketService.updateTicket(
            ticket.id,
            { status: TicketStatus.IN_PROGRESS },
            ticket.assignedToId || 1,
            UserRole.SUPER_ADMIN,
            {
              automaticStatusChange: true,
              automaticSource: 'pause_limit_reached',
              expectedInterruption: { status: TicketStatus.PAUSE, pausedAt: ticket.slaPausedAt },
            },
          );

          await this.ticketService.addComment(
            ticket.id,
            {
              content: `System Note: Ticket has reached its maximum allowable pause time (${ticket.issueTypeConfig?.allowablePauseHours ?? 48}h) and has been automatically unpaused. The SLA clock has resumed.`,
              isInternal: true,
            },
            1, // System User
            UserRole.SUPER_ADMIN,
          );

          this.logger.log('Auto-unpaused a ticket after its configured pause limit.');
        } catch (err) {
          this.logger.error(`Failed to auto-unpause ticket (${err?.code || 'unknown'}).`);
        }
      }
    }
  }

  private async processAutoUnfreeze() {
    const frozenTickets = await this.ticketRepo.find({
      where: { status: TicketStatus.FREEZE },
      relations: ['category', 'issueTypeConfig'],
    });

    const now = new Date().getTime();

    for (const ticket of frozenTickets) {
      if (!ticket.slaPausedAt || !ticket.category) continue;

      if (ticket.issueTypeConfig?.maxFreezeHours == null) continue; // null = unlimited

      const allowableMs = ticket.issueTypeConfig.maxFreezeHours * 60 * 60 * 1000;
      const frozenMs = now - ticket.slaPausedAt.getTime();

      if (frozenMs >= allowableMs) {
        try {
          const returnStatus = await this.ticketService.getFrozenReturnStatus(ticket.id);
          await this.ticketService.updateTicket(
            ticket.id,
            { status: returnStatus },
            ticket.assignedToId || 1,
            UserRole.SUPER_ADMIN,
            {
              automaticStatusChange: true,
              automaticSource: 'freeze_limit_reached',
              expectedInterruption: { status: TicketStatus.FREEZE, pausedAt: ticket.slaPausedAt },
            },
          );

          await this.ticketService.addComment(
            ticket.id,
            {
              content: `System Note: Ticket has reached its maximum allowable hold time (${ticket.issueTypeConfig.maxFreezeHours}h) and has been automatically unfrozen. The SLA clock has resumed.`,
              isInternal: true,
            },
            1, // System User
            UserRole.SUPER_ADMIN,
          );

          this.logger.log('Auto-unfrozen a ticket after its configured freeze limit.');
        } catch (err) {
          this.logger.error(`Failed to auto-unfreeze ticket (${err?.code || 'unknown'}).`);
        }
      }
    }
  }

  private async processPercentageAlerts() {
    const activeTickets = await this.ticketRepo.find({
      where: {
        status: TicketStatus.IN_PROGRESS,
        assignedToId: Not(IsNull()),
      } as any,
      relations: ['category', 'issueTypeConfig'],
    });
    await this.ticketService.enrichTicketsWithUsers(activeTickets);
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    if (!config) return;

    for (const ticket of activeTickets) {
      const isPausedBeforeBreach = Boolean(
        ticket.slaPausedAt &&
        ticket.slaDeadline &&
        ticket.slaDeadline.getTime() > ticket.slaPausedAt.getTime(),
      );
      if (
        isPausedBeforeBreach ||
        ticket.isSlaWaiting ||
        !ticket.slaDeadline ||
        !ticket.slaStartedAt ||
        !ticket.issueTypeConfig ||
        !ticket.createdAt ||
        !ticket.issueTypeConfig.slaHours
      )
        continue;

      const now = new Date();
      const totalSlaSeconds = ticket.issueTypeConfig.slaHours * 60 * 60;
      // The persisted deadline is the authoritative SLA clock: it already
      // includes the In Progress start, office-hour boundaries, and extensions
      // applied when a paused clock resumes.
      const elapsedSeconds = now <= ticket.slaDeadline
        ? Math.max(
            0,
            totalSlaSeconds - await this.ticketService.calculateBusinessSecondsForSla(
              now,
              ticket.slaDeadline,
              ticket.overtimeSlaDate ? { ...config, overtimeSlaDate: ticket.overtimeSlaDate } : config,
            ),
          )
        : totalSlaSeconds + await this.ticketService.calculateBusinessSecondsForSla(
            ticket.slaDeadline,
            now,
            ticket.overtimeSlaDate ? { ...config, overtimeSlaDate: ticket.overtimeSlaDate } : config,
          );
      const percentage = (elapsedSeconds / totalSlaSeconds) * 100;

      for (const threshold of [75, 100, 150]) {
        if (percentage < threshold || !ticket.assignedToId || !ticket.assignedTo?.email) continue;
        const eventType = `sla_alert_${threshold}`;
        const alreadySent = await this.eventRepo.findOne({
          where: { ticketId: ticket.id, eventType },
        });
        if (alreadySent) continue;

        const label = threshold === 75 ? 'SLA Warning' : 'SLA Alert';
        const message = threshold === 75
          ? `Ticket ${ticket.ticketNumber} has reached 75% of its SLA time limit.`
          : `Ticket ${ticket.ticketNumber} has reached ${threshold}% of its SLA time limit.`;
        await this.emailService.sendGenericEmail(
          ticket.assignedTo.email,
          `Ticket ${threshold}% ${label}: ${ticket.ticketNumber}`,
          `${message} Please address it as soon as possible.`,
        );
        await this.notificationService.create([ticket.assignedToId], {
          ticketId: ticket.id,
          eventType,
          message,
        });
        await this.eventRepo.save(this.eventRepo.create({
          ticketId: ticket.id,
          actorId: null,
          eventType,
          meta: JSON.stringify({ threshold, percentage }),
        }));
      }
    }
  }

  private async processSlaSounds(config: TicketingConfig, now = new Date()): Promise<void> {
    if (this.runningSlaSounds || config.isFlagCeremonyPaused) return;
    this.runningSlaSounds = true;
    try {
      const alerts = new Map<number, SlaSoundKind>();
      let adminIds: number[] | undefined;
      const calendarCache = new Map<string, boolean>();
      const windowCheck = new Map<string, boolean>();
      const nextSecond = new Date(now.getTime() + 1000);
      let lastId = '';
      for (;;) {
        const tickets = await this.ticketRepo.createQueryBuilder('t')
          .select(['t.id', 't.assignedToId', 't.slaStartedAt', 't.slaDeadline', 't.overtimeSlaDate'])
          .leftJoin('t.issueTypeConfig', 'issue')
          .addSelect(['issue.id', 'issue.slaHours'])
          .where('t.status = :status', { status: TicketStatus.IN_PROGRESS })
          .andWhere('t.id > :lastId', { lastId })
          .andWhere('t.assignedToId IS NOT NULL AND t.slaStartedAt IS NOT NULL AND t.slaDeadline IS NOT NULL')
          .andWhere('t.slaPausedAt IS NULL AND COALESCE(t.isSlaWaiting, 0) = 0')
          .andWhere('(t.slaDeadline <= :now OR TIMESTAMPDIFF(SECOND, :now, t.slaDeadline) <= COALESCE(issue.slaHours * 3600, TIMESTAMPDIFF(SECOND, t.slaStartedAt, t.slaDeadline)) * 0.4)', { now })
          .orderBy('t.id', 'ASC').take(100).getMany();
        if (!tickets.length) break;
        lastId = tickets[tickets.length - 1].id;

        for (const ticket of tickets) {
          const assigneeId = ticket.assignedToId;
          const start = ticket.slaStartedAt;
          const deadline = ticket.slaDeadline;
          if (!assigneeId || !start || !deadline) continue;
          const calendar = ticket.overtimeSlaDate ? { ...config, overtimeSlaDate: ticket.overtimeSlaDate } : config;
          const calendarKey = ticket.overtimeSlaDate || '';
          if (!windowCheck.has(calendarKey)) {
            // A one-second probe uses the same lunch, office-day, overtime and shift calendar as SLA.
            windowCheck.set(calendarKey, (await this.ticketService.calculateBusinessSecondsForSla(
              now, nextSecond, calendar, calendarCache,
            )) > 0);
          }
          if (!windowCheck.get(calendarKey)) continue;

          const overdue = deadline.getTime() <= now.getTime();
          const budget = ticket.issueTypeConfig?.slaHours
            ? Number(ticket.issueTypeConfig.slaHours) * 3600
            : (deadline.getTime() - start.getTime()) / 1000;
          const remaining = overdue ? 0 : await this.ticketService.calculateBusinessSecondsForSla(now, deadline, calendar, calendarCache);
          const overdueSeconds = overdue
            ? await this.ticketService.calculateBusinessSecondsForSla(deadline, now, calendar, calendarCache)
            : 0;
          const step = slaSoundStep(overdue ? 0 : Math.max(1, remaining), budget, overdueSeconds);
          if (!step || !(await this.claimSlaSoundStep(ticket.id, assigneeId, start, deadline, step))) continue;

          adminIds ??= await this.notificationService.getActiveIdsForRoles([
            ...this.roleCapabilities.getRolesWhere('isTicketFocal'),
            ...this.roleCapabilities.getRolesWhere('isTicketSettingsFocal'),
          ]);
          for (const recipient of [assigneeId, ...adminIds]) {
            // One sound per recipient per scan, with the overdue cue taking precedence.
            if (overdue || !alerts.has(recipient)) alerts.set(recipient, overdue ? 'overdue_sla' : 'nearing_sla');
          }
        }
        if (tickets.length < 100) break;
      }
      await this.notificationService.sendSlaSounds(alerts);
    } finally {
      this.runningSlaSounds = false;
    }
  }

  private async claimSlaSoundStep(
    ticketId: string, assigneeId: number, start: Date, deadline: Date, step: number,
  ): Promise<boolean> {
    const clockKey = `${assigneeId}:${start.getTime()}`;
    const stillActive = `t.id = ? AND t.assigned_to_id = ? AND t.sla_started_at = ? AND t.sla_deadline = ?
      AND t.status = ? AND t.sla_paused_at IS NULL AND COALESCE(t.is_sla_waiting, 0) = 0`;
    const activeParameters = [ticketId, assigneeId, start, deadline, TicketStatus.IN_PROGRESS];
    const updated = await this.ticketRepo.query(
      `UPDATE ticket_sla_sound_state s JOIN tickets t ON t.id = s.ticket_id
        SET s.clock_key = ?, s.step = ? WHERE ${stillActive} AND (s.clock_key <> ? OR s.step < ?)`,
      [clockKey, step, ...activeParameters, clockKey, step],
    );
    if (updated.affectedRows > 0) return true;
    const inserted = await this.ticketRepo.query(
      `INSERT IGNORE INTO ticket_sla_sound_state (ticket_id, clock_key, step)
        SELECT t.id, ?, ? FROM tickets t WHERE ${stillActive}`,
      [clockKey, step, ...activeParameters],
    );
    return inserted.affectedRows > 0;
  }
}
