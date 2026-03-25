import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ticket, TicketType, TicketStatus, TicketPriority } from '../entities/ticket.entity';
import { TicketComment } from '../entities/ticket-comment.entity';
import { User, UserRole } from '../../users/entities/user.entity';

// --- DTOs --------------------------------------------------------------------

export interface CreateTicketDto {
  subject: string;
  description: string;
  ticketType: TicketType;
  priority?: TicketPriority;
  /** Staff only: override the requester (for walk-ins / phone calls) */
  requesterId?: number;
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  resolutionNotes?: string;
}

export interface AssignTicketDto {
  assignedToId: number;
}

export interface AddCommentDto {
  /** Alias accepted from frontend (content or comment) */
  content?: string;
  comment?: string;
  isInternal?: boolean;
}

export interface SubmitSatisfactionDto {
  rating: number;   // 1�5
  comment?: string;
}

// --- Service -----------------------------------------------------------------

@Injectable()
export class TicketService implements OnModuleInit {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private readonly commentRepo: Repository<TicketComment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // --- Schema Migration ----------------------------------------------------

  async onModuleInit(): Promise<void> {
    try {
      await this.runMigrations();
    } catch (err) {
      this.logger.warn(`Ticket schema migration failed (non-fatal): ${err?.message}`);
    }
  }

  private async runMigrations(): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      // Ensure new columns exist on tickets table
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50) NULL').catch(() => undefined);
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(30) NOT NULL DEFAULT "it_support"').catch(() => undefined);
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS requester_id INT NULL').catch(() => undefined);
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_notes TEXT NULL').catch(() => undefined);
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at DATETIME NULL').catch(() => undefined);
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS satisfaction_rating TINYINT NULL').catch(() => undefined);
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT NULL').catch(() => undefined);
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS satisfaction_submitted_at DATETIME NULL').catch(() => undefined);

      // Backfill requester_id from legacy reported_by_id if needed
      await qr.query(
        'UPDATE tickets SET requester_id = reported_by_id WHERE requester_id IS NULL AND reported_by_id IS NOT NULL',
      ).catch(() => undefined);

      // Add unique index for ticket_number if not already present
      await qr.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS uq_tickets_ticket_number ON tickets (ticket_number)',
      ).catch(() => undefined);

      // Add is_internal flag to ticket_comments
      await qr.query(
        'ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS is_internal TINYINT(1) NOT NULL DEFAULT 0',
      ).catch(() => undefined);

      // Rename ticket_comments columns if old names exist
      await qr.query(
        'ALTER TABLE ticket_comments CHANGE COLUMN ticket_id ticket_id VARCHAR(36) NOT NULL',
      ).catch(() => undefined);
      await qr.query(
        'ALTER TABLE ticket_comments CHANGE COLUMN user_id user_id INT NOT NULL',
      ).catch(() => undefined);

      this.logger.log('Ticket schema migrations applied.');
    } finally {
      await qr.release();
    }
  }

  // --- Ticket Number Generator ---------------------------------------------

  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;
    // Count tickets for this year to get next sequence
    const count = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }

  // --- Create --------------------------------------------------------------

  async createTicket(
    dto: CreateTicketDto,
    callerId: number,
    callerRole?: UserRole,
  ): Promise<Ticket> {
    // Determine effective requesterId:
    // - Staff (non-user) may provide dto.requesterId to create on behalf of a user (walk-in/phone)
    // - Regular users always use their own ID
    const isStaff = callerRole && callerRole !== UserRole.USER;
    const requesterId =
      isStaff && dto.requesterId ? dto.requesterId : callerId;

    const requester = await this.userRepo.findOne({ where: { id: requesterId } });
    if (!requester) throw new BadRequestException('Requester not found');

    const ticketNumber = await this.generateTicketNumber();

    const ticket = this.ticketRepo.create({
      ticketNumber,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      ticketType: dto.ticketType,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      requesterId,
      assignedToId: null,
      resolutionNotes: null,
      resolvedAt: null,
      satisfactionRating: null,
      satisfactionComment: null,
      satisfactionSubmittedAt: null,
    });

    return this.ticketRepo.save(ticket);
  }

  // --- Read ----------------------------------------------------------------

  async getTickets(filters: {
    status?: TicketStatus;
    ticketType?: TicketType;
    requesterId?: number;
    assignedToId?: number;
    viewerId?: number;
    viewerRole?: UserRole;
  }): Promise<Ticket[]> {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.requester', 'requester')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.comments', 'comments')
      .leftJoinAndSelect('comments.user', 'commentUser')
      .orderBy('t.createdAt', 'DESC');

    // Role-based visibility
    if (
      filters.viewerRole === UserRole.USER
    ) {
      // Regular users see only their own tickets
      qb.where('t.requesterId = :uid', { uid: filters.viewerId });
    } else if (
      filters.viewerRole === UserRole.TECHNICIAN_DESKTOP
    ) {
      // Desktop technicians see all desktop_support tickets
      qb.where('t.ticketType = :type', { type: TicketType.DESKTOP_SUPPORT });
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    } else if (
      filters.viewerRole === UserRole.TECHNICIAN_IT_SUPPORT
    ) {
      // IT technicians see all it_support tickets
      qb.where('t.ticketType = :type', { type: TicketType.IT_SUPPORT });
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    } else {
      // super_admin, reviewer, focal, auditor, technician see all
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
      if (filters.ticketType) qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
      if (filters.requesterId) qb.andWhere('t.requesterId = :rid', { rid: filters.requesterId });
      if (filters.assignedToId) qb.andWhere('t.assignedToId = :aid', { aid: filters.assignedToId });
    }

    return qb.getMany();
  }

  async getTicketById(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['requester', 'assignedTo', 'comments', 'comments.user'],
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  // --- Update --------------------------------------------------------------

  async updateTicket(
    id: string,
    dto: UpdateTicketDto,
    actorId: number,
    actorRole: UserRole,
  ): Promise<Ticket> {
    const ticket = await this.getTicketById(id);

    // Regular users can only edit their own open tickets (subject/description)
    if (actorRole === UserRole.USER) {
      if (ticket.requesterId !== actorId) {
        throw new ForbiddenException('You can only update your own tickets.');
      }
      if (ticket.status !== TicketStatus.OPEN) {
        throw new ForbiddenException('You can only edit tickets that are still open.');
      }
      if (dto.subject) ticket.subject = dto.subject.trim();
      if (dto.description) ticket.description = dto.description.trim();
      return this.ticketRepo.save(ticket);
    }

    // Technicians / admins can update status + resolution
    if (dto.subject) ticket.subject = dto.subject.trim();
    if (dto.description) ticket.description = dto.description.trim();
    if (dto.priority) ticket.priority = dto.priority;
    if (dto.status) {
      ticket.status = dto.status;
      if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }
    }
    if (dto.resolutionNotes !== undefined) ticket.resolutionNotes = dto.resolutionNotes;

    return this.ticketRepo.save(ticket);
  }

  async assignTicket(id: string, dto: AssignTicketDto, actorRole: UserRole): Promise<Ticket> {
    if (![UserRole.SUPER_ADMIN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN].includes(actorRole)) {
      throw new ForbiddenException('Only admins and technicians can assign tickets.');
    }

    const ticket = await this.getTicketById(id);
    const technician = await this.userRepo.findOne({ where: { id: dto.assignedToId } });
    if (!technician) throw new NotFoundException('Technician not found');

    ticket.assignedToId = dto.assignedToId;
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.ASSIGNED;
    }

    return this.ticketRepo.save(ticket);
  }

  // --- Comments ------------------------------------------------------------

  async addComment(
    ticketId: string,
    dto: AddCommentDto,
    actorId: number,
    actorRole: UserRole,
  ): Promise<TicketComment> {
    const ticket = await this.getTicketById(ticketId);

    // Regular users cannot add internal notes
    const isInternal = dto.isInternal && actorRole !== UserRole.USER;

    // Regular users can only comment on their own tickets
    if (actorRole === UserRole.USER && ticket.requesterId !== actorId) {
      throw new ForbiddenException('You can only comment on your own tickets.');
    }

    const commentText = (dto.content ?? dto.comment ?? '').trim();
    if (!commentText) throw new BadRequestException('Comment content cannot be empty.');

    const comment = this.commentRepo.create({
      ticketId,
      comment: commentText,
      userId: actorId,
      isInternal: isInternal ?? false,
    });

    return this.commentRepo.save(comment);
  }

  // --- Client Satisfaction ------------------------------------------------

  async submitSatisfaction(
    id: string,
    dto: SubmitSatisfactionDto,
    requesterId: number,
  ): Promise<Ticket> {
    const ticket = await this.getTicketById(id);

    if (ticket.requesterId !== requesterId) {
      throw new ForbiddenException('Only the requester can submit satisfaction.');
    }
    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      throw new BadRequestException('Satisfaction can only be submitted for resolved or closed tickets.');
    }
    if (ticket.satisfactionSubmittedAt) {
      throw new BadRequestException('Satisfaction has already been submitted for this ticket.');
    }
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5.');
    }

    ticket.satisfactionRating = dto.rating;
    ticket.satisfactionComment = dto.comment ?? null;
    ticket.satisfactionSubmittedAt = new Date();

    return this.ticketRepo.save(ticket);
  }

  // --- Statistics ----------------------------------------------------------

  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    satisfactionAvg: number | null;
    satisfactionFillRate: number;
    resolvedTickets: number;
  }> {
    const all = await this.ticketRepo.find();
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let ratingSum = 0;
    let ratingCount = 0;
    let resolvedCount = 0;

    for (const t of all) {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      byType[t.ticketType] = (byType[t.ticketType] ?? 0) + 1;
      if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) {
        resolvedCount++;
        if (t.satisfactionRating) {
          ratingSum += t.satisfactionRating;
          ratingCount++;
        }
      }
    }

    const fillRate = resolvedCount > 0 ? Math.round((ratingCount / resolvedCount) * 100) : 0;

    return {
      total: all.length,
      byStatus,
      byType,
      satisfactionAvg: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
      satisfactionFillRate: fillRate,
      resolvedTickets: resolvedCount,
    };
  }

  async getUserDashboardStats(requesterId: number): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    satisfactionFillRate: number;
    pendingSatisfactionTickets: Ticket[];
  }> {
    const tickets = await this.ticketRepo.find({ where: { requesterId } });

    let open = 0, inProgress = 0, resolved = 0, closed = 0;
    let needsSatisfaction = 0;
    const pendingSatisfactionTickets: Ticket[] = [];

    for (const t of tickets) {
      if (t.status === TicketStatus.OPEN) open++;
      else if (t.status === TicketStatus.ASSIGNED || t.status === TicketStatus.IN_PROGRESS) inProgress++;
      else if (t.status === TicketStatus.RESOLVED) {
        resolved++;
        needsSatisfaction++;
        if (!t.satisfactionSubmittedAt) pendingSatisfactionTickets.push(t);
      }
      else if (t.status === TicketStatus.CLOSED) {
        closed++;
        if (t.resolvedAt) needsSatisfaction++;
        if (!t.satisfactionSubmittedAt && t.resolvedAt) pendingSatisfactionTickets.push(t);
      }
    }

    const filled = tickets.filter(
      (t) => (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) && t.satisfactionSubmittedAt,
    ).length;

    const fillRate = needsSatisfaction > 0 ? Math.round((filled / needsSatisfaction) * 100) : 0;

    return {
      total: tickets.length,
      open,
      inProgress,
      resolved,
      closed,
      satisfactionFillRate: fillRate,
      pendingSatisfactionTickets,
    };
  }

  async getTechnicianAvailability(): Promise<Array<{ id: number; email: string; firstName: string; lastName: string; role: string; openCount: number }>> {
    const technicians = await this.userRepo.find({
      where: [
        { role: UserRole.TECHNICIAN_DESKTOP },
        { role: UserRole.TECHNICIAN_IT_SUPPORT },
        { role: UserRole.TECHNICIAN },
      ],
    });

    const results = [];
    for (const tech of technicians) {
      const openCount = await this.ticketRepo.count({
        where: { assignedToId: tech.id, status: TicketStatus.IN_PROGRESS },
      });
      results.push({
        id: tech.id,
        email: tech.email,
        firstName: tech.firstName,
        lastName: tech.lastName,
        role: tech.role,
        openCount,
      });
    }
    return results;
  }
}
