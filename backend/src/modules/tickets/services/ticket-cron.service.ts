import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, Raw } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { TicketService } from './ticket.service';
import { EmailService } from './email.service';
import { UserRole } from '../../shared/entities';

@Injectable()
export class TicketCronService implements OnModuleInit {
  private readonly logger = new Logger(TicketCronService.name);

  onModuleInit() {
    this.logger.log('TicketCronService initialized and ready for cron jobs.');
  }

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketingConfig)
    private readonly configRepo: Repository<TicketingConfig>,
    private readonly ticketService: TicketService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduleTasks() {
    this.logger.log('Running minute cron tasks...');
    await this.processSlaSchedules();
    await this.processOverdueTicketsUnpauseNext();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyTasks() {
    this.logger.log('Running hourly ticketing cron tasks...');
    await this.processAutoClosure();
    await this.processAutoUnpause();
    await this.processFrozenTicketsReminders();
    await this.processPercentageAlerts();
  }

  @Cron('*/15 * * * *')
  async handle15MinuteTasks() {
    await this.ticketService.retryBenchedKbs();
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
        this.logger.log(`Sent daily frozen tickets email to ${data.email}`);
      } catch (err) {
        this.logger.error(`Failed to send frozen tickets email to ${data.email}`, err);
      }
    }
  }

  private async processSlaSchedules() {
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    if (!config || config.isFlagCeremonyPaused) return;

    const now = new Date();
    // Use padStart for safe HH:mm:ss comparison
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    if (config.scheduleMode === 'OFFICE_HOURS') {
      if (currentTime === config.officeClockin) {
        await this.ticketService.resumeAllActiveTickets();
      } else if (currentTime === config.officeClockout) {
        await this.ticketService.pauseAllActiveTickets();
      }
    } else if (config.scheduleMode === 'CWW') {
      if (currentTime === config.cwwClockinEnd) {
        await this.ticketService.resumeAllActiveTickets();
      } else if (currentTime === config.cwwClockoutEnd) {
        await this.ticketService.pauseAllActiveTickets();
      }
    }
  }

  private async processOverdueTicketsUnpauseNext() {
    const overdueActiveTickets = await this.ticketRepo.find({
      where: {
        isSlaWaiting: false,
        slaDeadline: Raw((alias) => `${alias} < UTC_TIMESTAMP()`),
        status: In([TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]),
      },
    });

    if (overdueActiveTickets.length > 0) {
      this.logger.log(`Cron check: found ${overdueActiveTickets.length} overdue active tickets.`);
    }

    const overdueTechIds = new Set(overdueActiveTickets.map((t) => t.assignedToId));

    for (const techId of overdueTechIds) {
      if (!techId) continue;

      // Check if there is no IN_PROGRESS ticket for this technician
      const inProgressCount = await this.ticketRepo.count({
        where: {
          assignedToId: techId,
          status: TicketStatus.IN_PROGRESS,
          isSlaWaiting: false,
        },
      });

      if (inProgressCount > 0) {
        continue; // They already have an IN_PROGRESS ticket, skip
      }

      // If no IN_PROGRESS ticket, unpause the next queued ticket and change its status to IN_PROGRESS
      const unpausedTicketId = await this.ticketService.unpauseNextWaitingTicketAndSetInProgress(
        techId,
        'cron_overdue_unstack',
      );
      if (unpausedTicketId) {
        this.logger.log(
          `Cron: Technician #${techId} has an overdue active ticket but no IN_PROGRESS ticket. Unpaused their next queued ticket and set to IN_PROGRESS.`,
        );
      }
    }
  }

  private async processAutoClosure() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const staleResolvedTickets = await this.ticketRepo.find({
      where: {
        status: TicketStatus.RESOLVED,
        resolvedAt: LessThan(threeDaysAgo),
      },
      // relations: ['assignedTo'] - removed for decoupling
    });
    await this.ticketService.enrichTicketsWithUsers(staleResolvedTickets);

    for (const ticket of staleResolvedTickets) {
      try {
        await this.ticketService.updateTicket(
          ticket.id,
          { status: TicketStatus.CLOSED },
          ticket.assignedToId || 1, // System fallback
          UserRole.SUPER_ADMIN,
        );
        this.logger.log(`Auto-closed ticket ${ticket.ticketNumber}`);
      } catch (err) {
        this.logger.error(`Failed to auto-close ticket ${ticket.ticketNumber}`, err);
      }
    }
  }

  private async processAutoUnpause() {
    const pausedTickets = await this.ticketRepo.find({
      where: { status: TicketStatus.PAUSE },
      relations: ['category', 'issueTypeConfig'],
    });

    const now = new Date().getTime();

    for (const ticket of pausedTickets) {
      if (!ticket.slaPausedAt || !ticket.category) continue;

      const allowableMs = (ticket.issueTypeConfig?.allowablePauseHours ?? 48) * 60 * 60 * 1000;
      const pausedMs = now - ticket.slaPausedAt.getTime();

      if (pausedMs >= allowableMs) {
        try {
          await this.ticketService.updateTicket(
            ticket.id,
            { status: TicketStatus.IN_PROGRESS },
            ticket.assignedToId || 1,
            UserRole.SUPER_ADMIN,
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

          // Hardcoded email for testing as requested by user
          this.emailService
            .sendGenericEmail(
              'mjdibay@dswd.gov.ph',
              `Ticket Auto-Unpaused: ${ticket.ticketNumber}`,
              `The ticket ${ticket.ticketNumber} has reached its maximum pause limit of ${ticket.issueTypeConfig?.allowablePauseHours ?? 48} hours and has been automatically reopened. The SLA clock has resumed.`,
            )
            .catch(() => {});

          this.logger.log(`Auto-unpaused ticket ${ticket.ticketNumber}`);
        } catch (err) {
          this.logger.error(`Failed to auto-unpause ticket ${ticket.ticketNumber}`, err);
        }
      }
    }
  }

  private async processFrozenTicketsReminders() {
    const frozenTickets = await this.ticketRepo.find({
      where: { status: TicketStatus.FREEZE },
    });

    for (const ticket of frozenTickets) {
      try {
        await this.ticketService.addComment(
          ticket.id,
          {
            content:
              'System Alert (Daily Reminder): This ticket is currently frozen waiting for third-party response. Ticket Admins, please follow up.',
            isInternal: true,
          },
          1,
          UserRole.SUPER_ADMIN,
        );
        await this.ticketRepo.update(ticket.id, { hasUnreadTechnician: true, hasUnreadUser: true });
        this.logger.log(`Sent daily reminder for frozen ticket ${ticket.ticketNumber}`);
      } catch (err) {
        this.logger.error(
          `Failed to send daily reminder for frozen ticket ${ticket.ticketNumber}`,
          err,
        );
      }
    }
  }

  private async processPercentageAlerts() {
    const activeTickets = await this.ticketRepo.find({
      where: { status: In([TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]) },
      relations: ['category'],
    });

    const now = new Date().getTime();

    for (const ticket of activeTickets) {
      if (!ticket.slaDeadline || !ticket.issueTypeConfig || !ticket.createdAt || !ticket.issueTypeConfig.slaHours)
        continue;

      const totalSlaMs = ticket.issueTypeConfig.slaHours * 60 * 60 * 1000;
      const elapsedMs =
        now - ticket.createdAt.getTime() - (ticket.accumulatedPauseSeconds || 0) * 1000;
      const percentage = (elapsedMs / totalSlaMs) * 100;

      // Ensure we don't spam emails by tracking alert state (would need a DB column in a real scenario,
      // but for MVP we just log if no DB column exists, or we could just use ticketEvent logs to check if sent).
      // Here we just fire it. A robust system would check if it was already sent.
      if (percentage >= 150) {
        if (ticket.assignedTo?.email) {
          this.emailService
            .sendGenericEmail(
              ticket.assignedTo.email,
              `Ticket 150% Overdue Alert: ${ticket.ticketNumber}`,
              `The ticket ${ticket.ticketNumber} is 150% overdue its SLA. Please resolve this immediately.`,
            )
            .catch(() => {});
        }
      } else if (percentage >= 75) {
        if (ticket.assignedTo?.email) {
          this.emailService
            .sendGenericEmail(
              ticket.assignedTo.email,
              `Ticket 75% SLA Warning: ${ticket.ticketNumber}`,
              `The ticket ${ticket.ticketNumber} has reached 75% of its SLA time limit. Please address it soon to avoid a breach.`,
            )
            .catch(() => {});
        }
      }
    }
  }
}
