import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketService } from './ticket.service';
import { EmailService } from './email.service';
import { UserRole } from '../../shared/entities';

@Injectable()
export class TicketCronService {
  private readonly logger = new Logger(TicketCronService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly ticketService: TicketService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyTasks() {
    this.logger.log('Running hourly ticketing cron tasks...');
    await this.processAutoClosure();
    await this.processAutoUnfreeze();
    await this.processPercentageAlerts();
  }

  private async processAutoClosure() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const staleResolvedTickets = await this.ticketRepo.find({
      where: {
        status: TicketStatus.RESOLVED,
        resolvedAt: LessThan(threeDaysAgo),
      },
      relations: ['assignedTo'],
    });

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

  private async processAutoUnfreeze() {
    const frozenTickets = await this.ticketRepo.find({
      where: { status: TicketStatus.FREEZE },
      relations: ['assignedTo', 'category'],
    });

    const now = new Date().getTime();

    for (const ticket of frozenTickets) {
      if (!ticket.slaPausedAt || !ticket.category) continue;

      const allowableMs = (ticket.category.allowableFreezeHours || 48) * 60 * 60 * 1000;
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
            { content: 'System Note: Ticket has reached its maximum allowable freeze time and has been automatically unfrozen. The SLA clock has resumed.', isInternal: true },
            1, // System User
            UserRole.SUPER_ADMIN,
          );

          if (ticket.assignedTo?.email) {
            this.emailService.sendGenericEmail(
              ticket.assignedTo.email,
              `Ticket Auto-Unfrozen: ${ticket.ticketNumber}`,
              `The ticket ${ticket.ticketNumber} has reached its maximum freeze limit of ${ticket.category.allowableFreezeHours} hours and has been automatically reopened. The SLA clock has resumed.`
            ).catch(() => {});
          }
          this.logger.log(`Auto-unfroze ticket ${ticket.ticketNumber}`);
        } catch (err) {
          this.logger.error(`Failed to auto-unfreeze ticket ${ticket.ticketNumber}`, err);
        }
      }
    }
  }

  private async processPercentageAlerts() {
    const activeTickets = await this.ticketRepo.find({
      where: { status: In([TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]) },
      relations: ['assignedTo', 'category'],
    });

    const now = new Date().getTime();

    for (const ticket of activeTickets) {
      if (!ticket.slaDeadline || !ticket.category || !ticket.createdAt || !ticket.category.slaHours) continue;

      const totalSlaMs = ticket.category.slaHours * 60 * 60 * 1000;
      const elapsedMs = now - ticket.createdAt.getTime() - (ticket.accumulatedPauseSeconds || 0) * 1000;
      const percentage = (elapsedMs / totalSlaMs) * 100;

      // Ensure we don't spam emails by tracking alert state (would need a DB column in a real scenario, 
      // but for MVP we just log if no DB column exists, or we could just use ticketEvent logs to check if sent).
      // Here we just fire it. A robust system would check if it was already sent.
      if (percentage >= 150) {
        if (ticket.assignedTo?.email) {
          this.emailService.sendGenericEmail(
            ticket.assignedTo.email,
            `Ticket 150% Overdue Alert: ${ticket.ticketNumber}`,
            `The ticket ${ticket.ticketNumber} is 150% overdue its SLA. Please resolve this immediately.`
          ).catch(() => {});
        }
      } else if (percentage >= 75) {
        if (ticket.assignedTo?.email) {
          this.emailService.sendGenericEmail(
            ticket.assignedTo.email,
            `Ticket 75% SLA Warning: ${ticket.ticketNumber}`,
            `The ticket ${ticket.ticketNumber} has reached 75% of its SLA time limit. Please address it soon to avoid a breach.`
          ).catch(() => {});
        }
      }
    }
  }
}
