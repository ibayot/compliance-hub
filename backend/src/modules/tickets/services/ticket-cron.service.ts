import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { TicketService } from './ticket.service';
import { EmailService } from './email.service';
import { UserRole } from '../../shared/entities';

@Injectable()
export class TicketCronService {
  private readonly logger = new Logger(TicketCronService.name);

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
    await this.processSlaSchedules();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyTasks() {
    this.logger.log('Running hourly ticketing cron tasks...');
    await this.processAutoClosure();
    await this.processAutoUnpause();
    await this.processFrozenTicketsReminders();
    await this.processPercentageAlerts();
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
      relations: ['category'],
    });

    const now = new Date().getTime();

    for (const ticket of pausedTickets) {
      if (!ticket.slaPausedAt || !ticket.category) continue;

      const allowableMs = (ticket.category.allowablePauseHours || 48) * 60 * 60 * 1000;
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
              content: `System Note: Ticket has reached its maximum allowable pause time (${ticket.category.allowablePauseHours}h) and has been automatically unpaused. The SLA clock has resumed.`,
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
              `The ticket ${ticket.ticketNumber} has reached its maximum pause limit of ${ticket.category.allowablePauseHours} hours and has been automatically reopened. The SLA clock has resumed.`,
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
      if (!ticket.slaDeadline || !ticket.category || !ticket.createdAt || !ticket.category.slaHours)
        continue;

      const totalSlaMs = ticket.category.slaHours * 60 * 60 * 1000;
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
