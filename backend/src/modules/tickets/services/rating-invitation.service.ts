import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, Length } from 'class-validator';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { UsersHttpClient, UserStub } from '../../../common/http-clients/users.http-client';
import { formatPersonName } from '../../../shared/utils/person-name';
import {
  RatingInvitation,
  RatingInvitationDeliveryStatus,
  RatingInvitationEvent,
  RatingInvitationStatus,
  RatingInvitationTicket,
} from '../entities/rating-invitation.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { EmailService } from './email.service';
import { SubmitSatisfactionDto, TicketService } from './ticket.service';

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const RATING_SESSION_LIFETIME_MS = 30 * 60 * 1000;
export const RATING_SESSION_COOKIE_NAME = 'rictms_rating_session';

export class SendRatingInvitationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  requesterIds: number[];
}

export class VerifyRatingInvitationDto {
  @IsString()
  @Length(6, 6)
  code: string;
}

export interface RatingRequestMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class RatingInvitationService {
  constructor(
    @InjectRepository(RatingInvitation)
    private readonly invitationRepo: Repository<RatingInvitation>,
    @InjectRepository(RatingInvitationTicket)
    private readonly invitationTicketRepo: Repository<RatingInvitationTicket>,
    @InjectRepository(RatingInvitationEvent)
    private readonly eventRepo: Repository<RatingInvitationEvent>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketingConfig)
    private readonly configRepo: Repository<TicketingConfig>,
    private readonly usersHttpClient: UsersHttpClient,
    private readonly emailService: EmailService,
    private readonly ticketService: TicketService,
    private readonly dataSource: DataSource,
  ) {}

  private hash(value: string): string {
    const secret = process.env.JWT_SECRET || 'rating-access-local-development-secret';
    return createHmac('sha256', secret).update(value).digest('hex');
  }

  private safeEquals(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private sanitizeMetadata(metadata: RatingRequestMetadata): RatingRequestMetadata {
    return {
      ipAddress: metadata.ipAddress?.slice(0, 64) || null,
      userAgent: metadata.userAgent?.slice(0, 255) || null,
    };
  }

  private async logEvent(
    invitationId: string,
    eventType: string,
    metadata: RatingRequestMetadata = {},
    actorId: number | null = null,
    ticketId: string | null = null,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const safe = this.sanitizeMetadata(metadata);
    await this.eventRepo.save(
      this.eventRepo.create({
        invitationId,
        ticketId,
        eventType,
        actorId,
        ipAddress: safe.ipAddress ?? null,
        userAgent: safe.userAgent ?? null,
        metadata: details ? JSON.stringify(details) : null,
      }),
    );
  }

  private async eligibleTicketsFor(requesterId: number): Promise<Ticket[]> {
    return this.ticketRepo.find({
      where: {
        requesterId,
        status: In([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
        satisfactionSubmittedAt: IsNull(),
      },
      order: { resolvedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async getAvailability(): Promise<{ available: boolean }> {
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    return { available: config?.isEmailNotificationsEnabled === false };
  }

  private async assertManualInvitationsAvailable(): Promise<void> {
    const { available } = await this.getAvailability();
    if (!available) {
      throw new ConflictException(
        'Manual rating invitations are unavailable while automatic outbound emails are enabled.',
      );
    }
  }

  async getEligibleRecipients(): Promise<
    Array<{
      id: number;
      email: string;
      name: string;
      eligibleTicketCount: number;
    }>
  > {
    await this.assertManualInvitationsAvailable();
    const counts = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('ticket.requesterId', 'requesterId')
      .addSelect('COUNT(ticket.id)', 'eligibleTicketCount')
      .where('ticket.status IN (:...statuses)', {
        statuses: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
      })
      .andWhere('ticket.satisfactionSubmittedAt IS NULL')
      .groupBy('ticket.requesterId')
      .getRawMany<{ requesterId: string; eligibleTicketCount: string }>();

    const countByUser = new Map(
      counts.map((row) => [Number(row.requesterId), Number(row.eligibleTicketCount)]),
    );
    const users = await this.usersHttpClient.getUsers();
    return users
      .filter(
        (user) =>
          user.active !== false &&
          user.role === 'user' &&
          (countByUser.get(Number(user.id)) || 0) > 0,
      )
      .map((user) => ({
        id: Number(user.id),
        email: user.email,
        name: formatPersonName(user, user.email),
        eligibleTicketCount: countByUser.get(Number(user.id)) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async sendInvitations(
    requesterIds: number[],
    actorId: number,
  ): Promise<{
    sent: number;
    failed: number;
    skipped: number;
    results: Array<{ requesterId: number; status: 'sent' | 'failed' | 'skipped'; message: string }>;
  }> {
    await this.assertManualInvitationsAvailable();
    const uniqueIds = [...new Set(requesterIds.map(Number).filter(Number.isInteger))];
    if (uniqueIds.length === 0 || uniqueIds.length > 50) {
      throw new BadRequestException('Select between 1 and 50 eligible recipients.');
    }

    const users = await this.usersHttpClient.getUsers();
    const usersById = new Map(users.map((user) => [Number(user.id), user]));
    const results: Array<{
      requesterId: number;
      status: 'sent' | 'failed' | 'skipped';
      message: string;
    }> = [];

    for (const requesterId of uniqueIds) {
      const user = usersById.get(requesterId);
      if (!user || user.active === false || user.role !== 'user' || !user.email) {
        results.push({ requesterId, status: 'skipped', message: 'Recipient is not eligible.' });
        continue;
      }

      const eligibleTickets = await this.eligibleTicketsFor(requesterId);
      if (eligibleTickets.length === 0) {
        results.push({
          requesterId,
          status: 'skipped',
          message: 'No tickets are awaiting feedback.',
        });
        continue;
      }

      const rawToken = randomBytes(32).toString('base64url');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + INVITATION_LIFETIME_MS);
      const invitation = await this.dataSource.transaction(async (manager) => {
        const invitationRepository = manager.getRepository(RatingInvitation);
        const linkRepository = manager.getRepository(RatingInvitationTicket);
        const eventRepository = manager.getRepository(RatingInvitationEvent);
        const previous = await invitationRepository.find({
          where: { requesterId, status: RatingInvitationStatus.ACTIVE },
        });
        for (const existing of previous) {
          existing.status = RatingInvitationStatus.REVOKED;
          existing.revokedAt = now;
          existing.otpHash = null;
          existing.otpExpiresAt = null;
          existing.sessionHash = null;
          existing.sessionExpiresAt = null;
          await invitationRepository.save(existing);
          await eventRepository.save(
            eventRepository.create({
              invitationId: existing.id,
              ticketId: null,
              eventType: 'revoked_by_resend',
              actorId,
              ipAddress: null,
              userAgent: null,
              metadata: null,
            }),
          );
        }

        const created = await invitationRepository.save(
          invitationRepository.create({
            requesterId,
            recipientEmail: user.email.trim().toLowerCase(),
            tokenHash: this.hash(rawToken),
            status: RatingInvitationStatus.ACTIVE,
            createdById: actorId,
            expiresAt,
            revokedAt: null,
            completedAt: null,
            lastAccessedAt: null,
            verifiedAt: null,
            otpHash: null,
            otpExpiresAt: null,
            otpAttempts: 0,
            otpSentAt: null,
            sessionHash: null,
            sessionExpiresAt: null,
            emailDeliveryStatus: RatingInvitationDeliveryStatus.PENDING,
            emailSentAt: null,
          }),
        );

        await linkRepository.save(
          eligibleTickets.map((ticket) =>
            linkRepository.create({
              invitationId: created.id,
              ticketId: ticket.id,
              ratedAt: null,
            }),
          ),
        );
        await eventRepository.save(
          eventRepository.create({
            invitationId: created.id,
            ticketId: null,
            eventType: 'invitation_created',
            actorId,
            ipAddress: null,
            userAgent: null,
            metadata: JSON.stringify({ eligibleTicketCount: eligibleTickets.length }),
          }),
        );
        return created;
      });

      const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:3000')
        .trim()
        .replace(/\/$/, '');
      const localUrl = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(frontendUrl);
      const secureFrontendUrl = localUrl
        ? frontendUrl
        : frontendUrl.replace(/^http:\/\//i, 'https://');
      const sent = await this.emailService.sendRatingInvitationEmail({
        recipientEmail: user.email,
        recipientName: formatPersonName(user, user.email),
        eligibleTicketCount: eligibleTickets.length,
        expiresAt,
        ratingUrl: `${secureFrontendUrl}/rate/${rawToken}`,
      });

      invitation.emailDeliveryStatus = sent
        ? RatingInvitationDeliveryStatus.SENT
        : RatingInvitationDeliveryStatus.FAILED;
      invitation.emailSentAt = sent ? new Date() : null;
      if (!sent) {
        invitation.status = RatingInvitationStatus.REVOKED;
        invitation.revokedAt = new Date();
      }
      await this.invitationRepo.save(invitation);
      await this.logEvent(
        invitation.id,
        sent ? 'invitation_sent' : 'invitation_delivery_failed',
        {},
        actorId,
        null,
        { eligibleTicketCount: eligibleTickets.length },
      );
      results.push({
        requesterId,
        status: sent ? 'sent' : 'failed',
        message: sent ? 'Invitation sent.' : 'Email delivery failed; the new link was revoked.',
      });
    }

    return {
      sent: results.filter((result) => result.status === 'sent').length,
      failed: results.filter((result) => result.status === 'failed').length,
      skipped: results.filter((result) => result.status === 'skipped').length,
      results,
    };
  }

  private async getActiveInvitationByToken(rawToken: string): Promise<RatingInvitation> {
    if (!/^[A-Za-z0-9_-]{40,128}$/.test(rawToken)) {
      throw new NotFoundException('This feedback invitation is invalid or unavailable.');
    }
    const invitation = await this.invitationRepo.findOne({
      where: { tokenHash: this.hash(rawToken) },
    });
    if (!invitation || invitation.status !== RatingInvitationStatus.ACTIVE) {
      throw new NotFoundException('This feedback invitation is invalid or unavailable.');
    }
    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      invitation.status = RatingInvitationStatus.EXPIRED;
      invitation.otpHash = null;
      invitation.sessionHash = null;
      await this.invitationRepo.save(invitation);
      await this.logEvent(invitation.id, 'invitation_expired');
      throw new HttpException('This feedback invitation has expired.', HttpStatus.GONE);
    }
    return invitation;
  }

  async getInvitationStatus(rawToken: string, metadata: RatingRequestMetadata) {
    const invitation = await this.getActiveInvitationByToken(rawToken);
    if (!invitation.lastAccessedAt) {
      invitation.lastAccessedAt = new Date();
      await this.invitationRepo.save(invitation);
      await this.logEvent(invitation.id, 'invitation_opened', metadata);
    }
    return { valid: true, requiresVerification: true, expiresAt: invitation.expiresAt };
  }

  async requestVerificationCode(rawToken: string, metadata: RatingRequestMetadata) {
    const invitation = await this.getActiveInvitationByToken(rawToken);
    if (
      invitation.otpSentAt &&
      Date.now() - new Date(invitation.otpSentAt).getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        'Please wait one minute before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersHttpClient.getUserById(invitation.requesterId);
    if (!user) {
      throw new HttpException(
        'Recipient verification is temporarily unavailable. Please try again.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (user.active === false || user.role !== 'user') {
      throw new ForbiddenException('This feedback invitation is no longer available.');
    }
    if (user.email.trim().toLowerCase() !== invitation.recipientEmail.trim().toLowerCase()) {
      invitation.status = RatingInvitationStatus.REVOKED;
      invitation.revokedAt = new Date();
      invitation.otpHash = null;
      invitation.sessionHash = null;
      await this.invitationRepo.save(invitation);
      await this.logEvent(invitation.id, 'revoked_after_recipient_email_change', metadata);
      throw new ForbiddenException(
        'The recipient email has changed. Ask an authorized staff member to send a new invitation.',
      );
    }
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    invitation.otpHash = this.hash(`${invitation.id}:${code}`);
    invitation.otpExpiresAt = new Date(Date.now() + OTP_LIFETIME_MS);
    invitation.otpAttempts = 0;
    invitation.otpSentAt = new Date();
    await this.invitationRepo.save(invitation);

    const sent = await this.emailService.sendRatingVerificationCodeEmail({
      recipientEmail: invitation.recipientEmail,
      recipientName: formatPersonName(user, invitation.recipientEmail),
      code,
    });
    await this.logEvent(
      invitation.id,
      sent ? 'verification_code_sent' : 'verification_code_delivery_failed',
      metadata,
    );
    if (!sent) {
      invitation.otpHash = null;
      invitation.otpExpiresAt = null;
      await this.invitationRepo.save(invitation);
      throw new HttpException(
        'The verification email could not be sent. Please contact support.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { message: 'A verification code was sent to the invitation recipient.' };
  }

  async verifyCode(rawToken: string, code: string, metadata: RatingRequestMetadata) {
    const invitation = await this.getActiveInvitationByToken(rawToken);
    if (!/^\d{6}$/.test(code)) throw new BadRequestException('Enter the six-digit code.');
    if (!invitation.otpHash || !invitation.otpExpiresAt) {
      throw new BadRequestException('Request a verification code first.');
    }
    if (new Date(invitation.otpExpiresAt).getTime() <= Date.now()) {
      invitation.otpHash = null;
      invitation.otpExpiresAt = null;
      await this.invitationRepo.save(invitation);
      throw new BadRequestException('The verification code has expired. Request a new code.');
    }

    const expected = this.hash(`${invitation.id}:${code}`);
    if (!this.safeEquals(expected, invitation.otpHash)) {
      invitation.otpAttempts = Number(invitation.otpAttempts || 0) + 1;
      const exhausted = invitation.otpAttempts >= 5;
      if (exhausted) {
        invitation.otpHash = null;
        invitation.otpExpiresAt = null;
      }
      await this.invitationRepo.save(invitation);
      await this.logEvent(invitation.id, 'verification_failed', metadata, null, null, {
        attempts: invitation.otpAttempts,
      });
      throw new UnauthorizedException(
        exhausted
          ? 'Too many incorrect attempts. Request a new code.'
          : 'The verification code is incorrect.',
      );
    }

    const sessionToken = randomBytes(32).toString('base64url');
    invitation.sessionHash = this.hash(sessionToken);
    invitation.sessionExpiresAt = new Date(Date.now() + RATING_SESSION_LIFETIME_MS);
    invitation.verifiedAt = new Date();
    invitation.lastAccessedAt = new Date();
    invitation.otpHash = null;
    invitation.otpExpiresAt = null;
    invitation.otpAttempts = 0;
    await this.invitationRepo.save(invitation);
    await this.logEvent(invitation.id, 'recipient_verified', metadata);
    return { sessionToken, maxAgeMs: RATING_SESSION_LIFETIME_MS };
  }

  private async getInvitationBySession(
    sessionToken: string | null,
  ): Promise<{ invitation: RatingInvitation; requester: UserStub }> {
    if (!sessionToken || !/^[A-Za-z0-9_-]{40,128}$/.test(sessionToken)) {
      throw new UnauthorizedException('Feedback verification is required.');
    }
    const invitation = await this.invitationRepo.findOne({
      where: { sessionHash: this.hash(sessionToken) },
    });
    if (!invitation || invitation.status !== RatingInvitationStatus.ACTIVE) {
      throw new UnauthorizedException('This feedback session is no longer available.');
    }
    if (
      new Date(invitation.expiresAt).getTime() <= Date.now() ||
      !invitation.sessionExpiresAt ||
      new Date(invitation.sessionExpiresAt).getTime() <= Date.now()
    ) {
      invitation.sessionHash = null;
      invitation.sessionExpiresAt = null;
      if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
        invitation.status = RatingInvitationStatus.EXPIRED;
      }
      await this.invitationRepo.save(invitation);
      throw new UnauthorizedException('This feedback session has expired.');
    }
    const user = await this.usersHttpClient.getUserById(invitation.requesterId);
    if (!user) {
      throw new HttpException(
        'Recipient verification is temporarily unavailable. Please try again.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (
      user.active === false ||
      user.role !== 'user' ||
      user.email.trim().toLowerCase() !== invitation.recipientEmail.trim().toLowerCase()
    ) {
      invitation.status = RatingInvitationStatus.REVOKED;
      invitation.revokedAt = new Date();
      invitation.sessionHash = null;
      invitation.sessionExpiresAt = null;
      await this.invitationRepo.save(invitation);
      throw new ForbiddenException('This feedback invitation is no longer available.');
    }
    return { invitation, requester: user };
  }

  async getSessionTickets(sessionToken: string | null, metadata: RatingRequestMetadata) {
    const { invitation, requester: user } = await this.getInvitationBySession(sessionToken);
    const links = await this.invitationTicketRepo.find({
      where: { invitationId: invitation.id },
      order: { createdAt: 'ASC' },
    });
    const tickets = links.length
      ? await this.ticketRepo.find({
          where: { id: In(links.map((link) => link.ticketId)) },
          relations: ['category', 'issueTypeConfig'],
        })
      : [];
    const assigneeIds = [
      ...new Set(tickets.map((ticket) => ticket.assignedToId).filter((id): id is number => !!id)),
    ];
    const assignees = await Promise.all(
      assigneeIds.map(async (id) => [id, await this.usersHttpClient.getUserById(id)] as const),
    );
    const assigneeById = new Map<number, UserStub | null>(assignees);
    const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
    await this.logEvent(invitation.id, 'rating_page_viewed', metadata);

    return {
      expiresAt: invitation.expiresAt,
      recipient: {
        firstName: user.first_name || '',
        middleInitial: user.middle_name?.trim().charAt(0) || '',
        lastName: user.last_name || '',
        suffix: user.suffix || '',
        unitSection: user.units?.[0]?.name || '',
      },
      tickets: links
        .map((link) => {
          const ticket = ticketById.get(link.ticketId);
          if (!ticket || Number(ticket.requesterId) !== Number(invitation.requesterId)) return null;
          const technician = ticket.assignedToId
            ? assigneeById.get(Number(ticket.assignedToId))
            : null;
          return {
            // Expose only the invitation-item identifier. The underlying ticket
            // UUID remains server-side and cannot be manipulated in the public URL.
            id: link.id,
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            description:
              ticket.description.length > 300
                ? `${ticket.description.slice(0, 297)}...`
                : ticket.description,
            createdAt: ticket.createdAt,
            resolvedAt: ticket.resolutionTimeOverride || ticket.resolvedAt || ticket.resolutionDate,
            categoryName: ticket.category?.name || null,
            issueName: ticket.issueTypeConfig?.name || null,
            technicianName: technician
              ? formatPersonName(technician, technician.email)
              : 'Service Team',
            ratingStatus: ticket.satisfactionSubmittedAt ? 'rated' : 'eligible',
            rating: ticket.satisfactionRating,
          };
        })
        .filter(Boolean),
    };
  }

  async submitRating(
    sessionToken: string | null,
    ratingItemId: string,
    dto: SubmitSatisfactionDto,
    metadata: RatingRequestMetadata,
  ) {
    const { invitation } = await this.getInvitationBySession(sessionToken);
    const link = await this.invitationTicketRepo.findOne({
      where: { id: ratingItemId, invitationId: invitation.id },
    });
    if (!link) throw new NotFoundException('This ticket is not included in the invitation.');
    const ticketId = link.ticketId;
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket || Number(ticket.requesterId) !== Number(invitation.requesterId)) {
      throw new NotFoundException('This ticket is not included in the invitation.');
    }
    if (ticket.satisfactionSubmittedAt) {
      throw new BadRequestException('Feedback has already been submitted for this ticket.');
    }
    if (![TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status)) {
      throw new BadRequestException('This ticket is not currently eligible for feedback.');
    }
    const technician = ticket.assignedToId
      ? await this.usersHttpClient.getUserById(Number(ticket.assignedToId))
      : null;
    const technicianName = technician
      ? formatPersonName(technician, technician.email)
      : 'Service Team';
    const safeDto: SubmitSatisfactionDto = dto.formData
      ? { ...dto, formData: { ...dto.formData, technicianName } }
      : dto;
    const saved = await this.ticketService.submitSatisfaction(
      ticketId,
      safeDto,
      invitation.requesterId,
    );
    link.ratedAt = saved.satisfactionSubmittedAt || new Date();
    await this.invitationTicketRepo.save(link);
    await this.logEvent(invitation.id, 'rating_submitted', metadata, null, ticketId, {
      rating: saved.satisfactionRating,
    });

    const remainingLinks = await this.invitationTicketRepo.find({
      where: { invitationId: invitation.id, ratedAt: IsNull() },
    });
    if (remainingLinks.length > 0) {
      const remainingTickets = await this.ticketRepo.find({
        where: { id: In(remainingLinks.map((remaining) => remaining.ticketId)) },
        select: ['id', 'satisfactionSubmittedAt'],
      });
      const ratedIds = new Set(
        remainingTickets
          .filter((remaining) => Boolean(remaining.satisfactionSubmittedAt))
          .map((remaining) => remaining.id),
      );
      for (const remaining of remainingLinks.filter((item) => ratedIds.has(item.ticketId))) {
        remaining.ratedAt = new Date();
        await this.invitationTicketRepo.save(remaining);
      }
    }
    const unratedCount = await this.invitationTicketRepo.count({
      where: { invitationId: invitation.id, ratedAt: IsNull() },
    });
    if (unratedCount === 0) {
      invitation.status = RatingInvitationStatus.COMPLETED;
      invitation.completedAt = new Date();
      invitation.sessionHash = null;
      invitation.sessionExpiresAt = null;
      await this.invitationRepo.save(invitation);
      await this.logEvent(invitation.id, 'invitation_completed', metadata);
    }
    return {
      success: true,
      ratingItemId,
      ratingStatus: 'rated',
      invitationCompleted: unratedCount === 0,
    };
  }
}
