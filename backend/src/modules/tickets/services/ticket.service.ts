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
import { TicketCategoryConfig } from '../entities/ticket-category.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { TicketSettingsService } from './ticket-settings.service';
import { AttendanceService } from './attendance.service';
import { EmailService, TicketEmailData } from './email.service';

// --- DTOs --------------------------------------------------------------------

export interface CreateTicketDto {
  subject: string;
  description: string;
  ticketType: TicketType;
  priority?: TicketPriority;
  /** Category UUID from ticket_categories */
  categoryId?: string;
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
    private readonly settingsService: TicketSettingsService,
    private readonly attendanceService: AttendanceService,
    private readonly emailService: EmailService,
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

      // Make legacy reported_by_id nullable so new tickets only need requester_id
      await qr.query(
        'ALTER TABLE tickets MODIFY COLUMN reported_by_id INT(11) NULL',
      ).catch(() => undefined);

      // Ensure status enum includes all current values (add 'assigned' if missing)
      await qr.query(
        "ALTER TABLE tickets MODIFY COLUMN status ENUM('open','assigned','in_progress','resolved','closed') NOT NULL DEFAULT 'open'",
      ).catch(() => undefined);

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

      // ── v0.6 migrations ──────────────────────────────────────────────────

      // Add ticket_type to ticket_categories
      await qr.query(
        "ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(30) NOT NULL DEFAULT 'it_support'",
      ).catch(() => undefined);

      // Add category_id to tickets
      await qr.query(
        'ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category_id VARCHAR(36) NULL',
      ).catch(() => undefined);

      // Create ticket_keyword_rules table
      await qr.query(`
        CREATE TABLE IF NOT EXISTS ticket_keyword_rules (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          keyword VARCHAR(100) NOT NULL,
          target_ticket_type VARCHAR(30) NOT NULL,
          target_category_id VARCHAR(36) NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_by INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `).catch(() => undefined);

      // Create tech_attendance table
      await qr.query(`
        CREATE TABLE IF NOT EXISTS tech_attendance (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          user_id INT NOT NULL,
          date DATE NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'present',
          set_by_id INT NULL,
          notes TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_tech_att_user_date (user_id, date)
        )
      `).catch(() => undefined);

      // Create office_days table
      await qr.query(`
        CREATE TABLE IF NOT EXISTS office_days (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          date DATE NOT NULL UNIQUE,
          is_office_day TINYINT(1) NOT NULL DEFAULT 1,
          notes TEXT NULL,
          set_by_id INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).catch(() => undefined);

      // Seed default categories if table is empty
      await this.seedDefaultCategories(qr);

      this.logger.log('Ticket schema migrations applied.');
    } finally {
      await qr.release();
    }
  }

  // --- Seed Default Categories -----------------------------------------------

  private async seedDefaultCategories(qr: any): Promise<void> {
    const cats = [
      // IT Support categories
      { key: 'website_posting', name: 'Website Posting', type: 'it_support' },
      { key: 'internet', name: 'Internet', type: 'it_support' },
      { key: 'corporate_email', name: 'Corporate Email', type: 'it_support' },
      { key: 'ad_account', name: 'AD Account', type: 'it_support' },
      { key: 'global_protect', name: 'Global Protect', type: 'it_support' },
      { key: 'software_installation', name: 'Software Installation', type: 'it_support' },
      { key: 'software', name: 'Software', type: 'it_support' },
      // Desktop Support categories
      { key: 'printer_installation', name: 'Printer Installation/Configuration', type: 'desktop_support' },
      { key: 'printer_repair', name: 'Printer Repair', type: 'desktop_support' },
      { key: 'desktop_laptop_repair', name: 'Desktop/Laptop Repair', type: 'desktop_support' },
    ];

    let inserted = 0;
    for (const c of cats) {
      // Only insert if key doesn't already exist (idempotent)
      const [existing] = await qr.query(
        'SELECT COUNT(*) AS cnt FROM ticket_categories WHERE `key` = ?', [c.key],
      ).catch(() => [{ cnt: 1 }]);
      if (Number(existing?.cnt) === 0) {
        await qr.query(
          `INSERT INTO ticket_categories (id, \`key\`, name, ticket_type, is_active, is_deleted, created_at, updated_at)
           VALUES (UUID(), ?, ?, ?, 1, 0, NOW(), NOW())`,
          [c.key, c.name, c.type],
        ).catch(() => undefined);
        inserted++;
      }
    }
    if (inserted > 0) this.logger.log(`Seeded ${inserted} default ticket categories`);
  }

  // --- Ticket Number Generator ---------------------------------------------

  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;
    const count = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }

  // --- Create (with Auto-Shift, Auto-Assign, Email) -------------------------

  async createTicket(
    dto: CreateTicketDto,
    callerId: number,
    callerRole?: UserRole,
  ): Promise<Ticket & { autoShifted?: boolean; autoAssigned?: boolean; noTechAvailable?: boolean }> {
    const isStaff = callerRole && callerRole !== UserRole.USER;
    const requesterId =
      isStaff && dto.requesterId ? dto.requesterId : callerId;

    const requester = await this.userRepo.findOne({ where: { id: requesterId } });
    if (!requester) throw new BadRequestException('Requester not found');

    let ticketType = dto.ticketType;
    let categoryId = dto.categoryId || null;
    let autoShifted = false;

    // ── Auto-Shift based on keyword rules ──────────────────────────────
    try {
      const combinedText = `${dto.subject} ${dto.description}`;
      const matchedRule = await this.settingsService.matchKeywordRules(combinedText);
      if (matchedRule) {
        ticketType = matchedRule.targetTicketType as TicketType;
        if (matchedRule.targetCategoryId) {
          categoryId = matchedRule.targetCategoryId;
        }
        autoShifted = true;
        this.logger.log(`Auto-shift: keyword "${matchedRule.keyword}" → type=${ticketType}, cat=${categoryId}`);
      }
    } catch (err: any) {
      this.logger.warn(`Auto-shift failed (non-fatal): ${err?.message}`);
    }

    // ── Auto-Assign based on attendance & workload ─────────────────────
    let assignedToId: number | null = null;
    let assignedTech: User | null = null;
    let noTechAvailable = false;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const isOfficeDayToday = await this.attendanceService.isOfficeDay(today);

      if (isOfficeDayToday) {
        const availableTechs = await this.attendanceService.getAvailableTechnicians(
          ticketType,
          today,
        );

        if (availableTechs.length > 0) {
          // Pick the tech with fewest open/assigned/in_progress tickets
          let bestTech: User | null = null;
          let minCount = Infinity;

          for (const tech of availableTechs) {
            const openCount = await this.ticketRepo.count({
              where: [
                { assignedToId: tech.id, status: TicketStatus.OPEN },
                { assignedToId: tech.id, status: TicketStatus.ASSIGNED },
                { assignedToId: tech.id, status: TicketStatus.IN_PROGRESS },
              ],
            });
            if (openCount < minCount) {
              minCount = openCount;
              bestTech = tech;
            }
          }

          if (bestTech) {
            assignedToId = bestTech.id;
            assignedTech = bestTech;
            this.logger.log(`Auto-assign: ticket → ${bestTech.email} (${minCount} open tickets)`);
          }
        } else {
          noTechAvailable = true;
          this.logger.log('Auto-assign: no technician available for this ticket type today');
        }
      }
    } catch (err: any) {
      this.logger.warn(`Auto-assign failed (non-fatal): ${err?.message}`);
    }

    const ticketNumber = await this.generateTicketNumber();
    const status = assignedToId ? TicketStatus.ASSIGNED : TicketStatus.OPEN;

    const ticket = this.ticketRepo.create({
      ticketNumber,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      ticketType: ticketType,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      status,
      categoryId,
      requesterId,
      assignedToId,
      resolutionNotes: null,
      resolvedAt: null,
      satisfactionRating: null,
      satisfactionComment: null,
      satisfactionSubmittedAt: null,
    });

    const saved = await this.ticketRepo.save(ticket);

    // ── Send email notification (fire-and-forget) ──────────────────────
    const categoryName = categoryId
      ? (await this.settingsService.getCategoryById(categoryId).catch(() => null))?.name
      : undefined;

    const emailData: TicketEmailData = {
      ticketNumber: saved.ticketNumber,
      subject: saved.subject,
      description: saved.description,
      ticketType: saved.ticketType,
      categoryName: categoryName ?? undefined,
      priority: saved.priority,
      status: saved.status,
      requesterName: [requester.firstName, requester.lastName].filter(Boolean).join(' ') || requester.email,
      requesterEmail: requester.email,
      assignedToName: assignedTech
        ? [assignedTech.firstName, assignedTech.lastName].filter(Boolean).join(' ') || assignedTech.email
        : undefined,
      assignedToEmail: assignedTech?.email,
      createdAt: saved.createdAt?.toISOString?.() ?? new Date().toISOString(),
      noTechAvailable,
    };
    this.emailService.sendTicketCreatedEmail(emailData).catch(() => {});

    return Object.assign(saved, { autoShifted, autoAssigned: !!assignedToId, noTechAvailable });
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
      .leftJoinAndSelect('t.category', 'category')
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
      relations: ['requester', 'assignedTo', 'category', 'comments', 'comments.user'],
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
