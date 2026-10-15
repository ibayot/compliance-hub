import { ForbiddenException } from '@nestjs/common';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketComment } from '../entities/ticket-comment.entity';

export function commentImagePaths(
  comment: Pick<TicketComment, 'attachmentPath' | 'attachmentPaths'>,
): string[] {
  return [
    ...new Set([
      ...(comment.attachmentPaths || []),
      ...(comment.attachmentPath ? [comment.attachmentPath] : []),
    ]),
  ];
}

export function isDescriptionAttachment(
  ticket: Pick<Ticket, 'createdById' | 'requesterId'>,
  comment: Pick<TicketComment, 'comment' | 'userId' | 'isInternal'>,
): boolean {
  return (
    comment.comment === '[Initial Ticket Attachment]' &&
    !comment.isInternal &&
    Number(comment.userId) === Number(ticket.createdById ?? ticket.requesterId)
  );
}

export function assertImageReplacementAllowed(
  ticket: Pick<Ticket, 'status' | 'createdById' | 'requesterId'>,
  comment: Pick<TicketComment, 'comment' | 'userId' | 'isInternal'>,
  actorId: number,
  role: string,
): void {
  const allowed =
    role === 'user'
      ? [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]
      : [
          TicketStatus.OPEN,
          TicketStatus.ASSIGNED,
          TicketStatus.IN_PROGRESS,
          TicketStatus.PAUSE,
          TicketStatus.FREEZE,
          TicketStatus.RESOLVED,
        ];
  if (!allowed.includes(ticket.status))
    throw new ForbiddenException(
      role === 'user'
        ? 'Regular users can replace images only on Open, Assigned, or In Progress tickets.'
        : 'Images cannot be replaced on Closed or Duplicate tickets.',
    );
  const owns = isDescriptionAttachment(ticket, comment)
    ? [ticket.createdById ?? ticket.requesterId, ticket.requesterId].some(
        (id) => Number(id) === actorId,
      )
    : Number(comment.userId) === actorId;
  if (!owns)
    throw new ForbiddenException(
      'Only the filer/requester can replace description images; comment images belong to their author.',
    );
}
