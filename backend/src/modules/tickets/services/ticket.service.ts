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
  /** Required when status = DUPLICATE: UUID of the original ticket */
  duplicateOfId?: string;
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

      // v0.6.7 migrations
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS duplicate_of_id VARCHAR(36) NULL').catch(() => undefined);

      // v0.6.8 migrations
      // Make priority nullable so focals can tag it manually (not auto-set by the app)
      await qr.query(
        'ALTER TABLE tickets MODIFY COLUMN priority VARCHAR(10) NULL DEFAULT NULL',
      ).catch(() => undefined);

      // Make legacy reported_by_id nullable so new tickets only need requester_id
      await qr.query(
        'ALTER TABLE tickets MODIFY COLUMN reported_by_id INT(11) NULL',
      ).catch(() => undefined);

      // Ensure status enum includes all current values
      await qr.query(
        "ALTER TABLE tickets MODIFY COLUMN status ENUM('open','assigned','in_progress','resolved','closed','freeze','duplicate') NOT NULL DEFAULT 'open'",
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

      // ── v0.6.3 migrations ─────────────────────────────────────────────────

      // Expand ticket_type column to include pantawid_ict_support
      await qr.query(
        "ALTER TABLE tickets MODIFY COLUMN ticket_type VARCHAR(30) NOT NULL DEFAULT 'it_support'",
      ).catch(() => undefined);

      // Reset any weekend office-days that were accidentally set as office days
      await qr.query(
        "UPDATE office_days SET is_office_day = 0 WHERE DAYOFWEEK(date) IN (1, 7) AND is_office_day = 1",
      ).catch(() => undefined);

      // Seed default categories if table is empty
      await this.seedDefaultCategories(qr);

      // Seed default keyword rules
      await this.seedDefaultKeywordRules(qr);

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
      // Pantawid ICT Support categories
      { key: 'pantawid_ict_support_general', name: 'Pantawid ICT Support', type: 'pantawid_ict_support' },
      { key: 'pantawid_device_issue', name: 'Pantawid Device Issue', type: 'pantawid_ict_support' },
      { key: 'pantawid_network_connectivity', name: 'Pantawid Network/Connectivity', type: 'pantawid_ict_support' },
      { key: 'pantawid_system_access', name: 'Pantawid System Access', type: 'pantawid_ict_support' },
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

  private async seedDefaultKeywordRules(qr: any): Promise<void> {
    const rules = [
      { keyword: 'internet', type: 'it_support' },
      { keyword: 'printer repair', type: 'desktop_support' },
    ];

    let inserted = 0;
    for (const r of rules) {
      const [existing] = await qr.query(
        'SELECT COUNT(*) AS cnt FROM ticket_keyword_rules WHERE keyword = ?', [r.keyword],
      ).catch(() => [{ cnt: 1 }]);
      if (Number(existing?.cnt) === 0) {
        await qr.query(
          `INSERT INTO ticket_keyword_rules (id, keyword, target_ticket_type, is_active, created_at, updated_at)
           VALUES (UUID(), ?, ?, 1, NOW(), NOW())`,
          [r.keyword, r.type],
        ).catch(() => undefined);
        inserted++;
      }
    }
    if (inserted > 0) this.logger.log(`Seeded ${inserted} default keyword rules`);
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
            // Only consider techs with ZERO active tickets (not just fewest)
          if (openCount === 0 && openCount < minCount) {
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
      priority: dto.priority ?? null,
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
    if (filters.viewerRole === UserRole.USER) {
      // Regular users see only their own tickets
      qb.where('t.requesterId = :uid', { uid: filters.viewerId });
    } else if (filters.viewerRole === UserRole.TECHNICIAN_IT_STAFF) {
      // Lower-level IT staff see only tickets assigned to them
      qb.where('t.assignedToId = :uid', { uid: filters.viewerId });
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    } else if (filters.viewerRole === UserRole.TECHNICIAN_DESKTOP_STAFF) {
      // Lower-level Desktop staff see only tickets assigned to them
      qb.where('t.assignedToId = :uid', { uid: filters.viewerId });
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    } else if (filters.viewerRole === UserRole.TECHNICIAN_DESKTOP) {
      // Desktop focal technicians see all desktop_support tickets
      qb.where('t.ticketType = :type', { type: TicketType.DESKTOP_SUPPORT });
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    } else if (filters.viewerRole === UserRole.TECHNICIAN_IT_SUPPORT) {
      // IT focal technicians see all it_support tickets
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

    // Terminal state: DUPLICATE tickets cannot be modified further
    if (ticket.status === TicketStatus.DUPLICATE) {
      throw new ForbiddenException('Duplicate tickets are in a terminal state and cannot be updated.');
    }

    // Technicians / admins can update status + resolution
    if (dto.subject) ticket.subject = dto.subject.trim();
    if (dto.description) ticket.description = dto.description.trim();

    // Priority changes allowed for all technician-level roles and above
    if (dto.priority !== undefined) {
      const priorityRoles = [
        UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.REVIEWER, UserRole.SUPER_ADMIN,
        UserRole.TECHNICIAN, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_DESKTOP,
        UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
      ];
      if (!priorityRoles.includes(actorRole)) {
        throw new ForbiddenException('Only technicians and above can change ticket priority.');
      }
      ticket.priority = dto.priority;
    }

    if (dto.status) {
      // If ticket is OPEN (not yet assigned), only FREEZE or DUPLICATE are valid transitions
      if (ticket.status === TicketStatus.OPEN) {
        if (dto.status !== TicketStatus.FREEZE && dto.status !== TicketStatus.DUPLICATE) {
          throw new ForbiddenException('An OPEN (unassigned) ticket can only be marked as Freeze or Duplicate. Assign it first before changing to other statuses.');
        }
      }

      if (dto.status === TicketStatus.DUPLICATE) {
        if (!dto.duplicateOfId) {
          throw new BadRequestException('duplicateOfId is required when marking a ticket as Duplicate.');
        }
        const original = await this.ticketRepo.findOne({ where: { id: dto.duplicateOfId } });
        if (!original) throw new BadRequestException(`Original ticket ${dto.duplicateOfId} not found.`);
        ticket.duplicateOfId = dto.duplicateOfId;
        ticket.status = TicketStatus.DUPLICATE;
        // Duplicate tickets are terminal — treat like closed
        if (!ticket.resolvedAt) ticket.resolvedAt = new Date();
      } else {
        // Guard: ticket must have a priority before it can be resolved
        if (dto.status === TicketStatus.RESOLVED && !ticket.priority && dto.priority === undefined) {
          throw new BadRequestException(
            'A priority must be set on this ticket before it can be marked as Resolved. Please tag the priority first.',
          );
        }
        ticket.status = dto.status;
        if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
          ticket.resolvedAt = new Date();
        }
      }
    }
    if (dto.resolutionNotes !== undefined) ticket.resolutionNotes = dto.resolutionNotes;

    const saved = await this.ticketRepo.save(ticket);

    // On RESOLVED: auto-assign the oldest pending OPEN ticket of the same type to this technician
    if (dto.status === TicketStatus.RESOLVED && saved.assignedToId) {
      try {
        const nextTicket = await this.ticketRepo
          .createQueryBuilder('t')
          .where('t.status = :status', { status: TicketStatus.OPEN })
          .andWhere('t.assignedToId IS NULL')
          .andWhere('t.ticketType = :type', { type: saved.ticketType })
          .orderBy('t.createdAt', 'ASC')
          .getOne();
        if (nextTicket) {
          nextTicket.assignedToId = saved.assignedToId;
          nextTicket.status = TicketStatus.ASSIGNED;
          await this.ticketRepo.save(nextTicket);
          this.logger.log(
            `Auto-reassign on resolve: ticket ${nextTicket.ticketNumber} → technician #${saved.assignedToId}`,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Auto-reassign on resolve failed (non-fatal): ${err?.message}`);
      }
    }

    return saved;
  }

  async assignTicket(id: string, dto: AssignTicketDto, actorRole: UserRole): Promise<Ticket> {
    const allowedActors = [
      UserRole.SUPER_ADMIN, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.REVIEWER,
      UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT,
      UserRole.TECHNICIAN, UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
    ];
    if (!allowedActors.includes(actorRole)) {
      throw new ForbiddenException('Only admins, focal persons, and technicians can assign tickets.');
    }

    const ticket = await this.getTicketById(id);

    // Duplicate tickets are terminal – assignment is not allowed
    if (ticket.status === TicketStatus.DUPLICATE) {
      throw new ForbiddenException('Cannot assign a technician to a ticket that is marked as Duplicate.');
    }

    const technician = await this.userRepo.findOne({ where: { id: dto.assignedToId } });
    if (!technician) throw new NotFoundException('Technician not found');

    // Guard: lower-level techs can only escalate to focal-level technicians
    const lowerLevelRoles: UserRole[] = [UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF];
    const focalTechRoles: UserRole[] = [UserRole.TECHNICIAN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT];
    if (lowerLevelRoles.includes(actorRole) && !focalTechRoles.includes(technician.role as UserRole)) {
      throw new ForbiddenException('Lower-level technicians may only escalate to focal-level technicians.');
    }

    // Guard: technician must have no active tickets
    const busyCount = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.assignedToId = :id', { id: dto.assignedToId })
      .andWhere('t.status NOT IN (:...terminal)', {
        terminal: [TicketStatus.CLOSED, TicketStatus.DUPLICATE, TicketStatus.RESOLVED],
      })
      .getCount();
    if (busyCount > 0) {
      throw new BadRequestException(
        `${technician.firstName} ${technician.lastName} still has ${busyCount} unresolved ticket(s). Resolve them before assigning a new one.`,
      );
    }

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

  /** Monthly stats for tickets assigned to a specific technician */
  async getTechAssignedStats(techId: number, year: number, month: number): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    satisfactionAvg: number | null;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.assignedToId = :techId', { techId })
      .andWhere('t.createdAt >= :startDate', { startDate })
      .andWhere('t.createdAt <= :endDate', { endDate })
      .getMany();

    let open = 0, inProgress = 0, resolved = 0, closed = 0;
    let totalSat = 0, countSat = 0;

    for (const t of tickets) {
      if (t.status === TicketStatus.OPEN) open++;
      else if (t.status === TicketStatus.ASSIGNED || t.status === TicketStatus.IN_PROGRESS) inProgress++;
      else if (t.status === TicketStatus.RESOLVED) resolved++;
      else if (t.status === TicketStatus.CLOSED) closed++;
      if (t.satisfactionRating != null) {
        totalSat += t.satisfactionRating;
        countSat++;
      }
    }

    return {
      total: tickets.length,
      open,
      inProgress,
      resolved,
      closed,
      satisfactionAvg: countSat > 0 ? Math.round((totalSat / countSat) * 10) / 10 : null,
    };
  }

  async getTechnicianAvailability(): Promise<Array<{ id: number; email: string; firstName: string; lastName: string; role: string; openCount: number }>> {
    const technicians = await this.userRepo.find({
      where: [
        { role: UserRole.TECHNICIAN_DESKTOP },
        { role: UserRole.TECHNICIAN_IT_SUPPORT },
        { role: UserRole.TECHNICIAN },
        { role: UserRole.TECHNICIAN_IT_STAFF },
        { role: UserRole.TECHNICIAN_DESKTOP_STAFF },
        { role: UserRole.FOCAL, ticketMainFocal: true },
      ],
    });

    const results = [];
    for (const tech of technicians) {
      // "open" = anything that isn't CLOSED or DUPLICATE (terminal states)
      const openCount = await this.ticketRepo
        .createQueryBuilder('t')
        .where('t.assignedToId = :id', { id: tech.id })
        .andWhere('t.status NOT IN (:...closed)', {
          closed: [TicketStatus.CLOSED, TicketStatus.DUPLICATE],
        })
        .getCount();
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

  /** Returns all non-closed, non-duplicate tickets for a given requester (used in Duplicate picker) */
  async getOpenTicketsForRequester(requesterId: number): Promise<Ticket[]> {
    return this.ticketRepo
      .createQueryBuilder('t')
      .where('t.requesterId = :rid', { rid: requesterId })
      .andWhere('t.status NOT IN (:...terminal)', {
        terminal: [TicketStatus.CLOSED, TicketStatus.DUPLICATE],
      })
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }}