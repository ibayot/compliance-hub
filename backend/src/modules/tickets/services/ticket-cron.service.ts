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
    // percentage based stale alerts can be handled here if emails are needed, 
    // otherwise frontend visually handles them.
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
            { status: TicketStatus.OPEN },
            ticket.assignedToId || 1,
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
}
