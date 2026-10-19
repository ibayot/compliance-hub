import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Ticket, TicketStatus } from '../entities/ticket.entity';

export function assertTicketCancellationAllowed(
  ticket: Pick<Ticket, 'status' | 'requesterId' | 'createdById'>,
  actorId: number,
  actorRole: string,
  hasCapability: boolean,
): void {
  if (!hasCapability) throw new ForbiddenException('Ticket cancellation capability is required.');
  if (![TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS].includes(ticket.status))
    throw new BadRequestException('Only Open, Assigned, or In Progress tickets can be cancelled.');
  if (actorRole === 'user' && ![ticket.requesterId, ticket.createdById].some(id => Number(id) === actorId))
    throw new ForbiddenException('You can only cancel your own requests or tickets you filed.');
}
