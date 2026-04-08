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
import * as fs from 'fs';
import * as path from 'path';
import { Ticket, TicketType, TicketStatus, TicketPriority } from '../entities/ticket.entity';
import { TicketComment } from '../entities/ticket-comment.entity';
import { TicketCategoryConfig } from '../entities/ticket-category.entity';
import { TicketEvent } from '../entities/ticket-event.entity';
import { TicketEscalation, EscalationStatus } from '../entities/ticket-escalation.entity';
import { EscalationFocalConfig } from '../entities/escalation-focal-config.entity';
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

export interface CsatFormData {
  consentGiven: boolean;
  unitSection: string;
  dateOfTransaction: string;
  clientFirstName: string;
  clientMiddleInitial?: string;
  clientLastName: string;
  suffix?: string;
  religion: string;
  age?: number;
  sex: string;
  contactNumber?: string;
  technicianName: string;
  likert: Array<number | 'NA'>; // 9 items index 0-8
}

export interface SubmitSatisfactionDto {
  rating?: number;   // Legacy 1-5 star (used if formData absent)
  comment?: string;  // Legacy comment
  formData?: CsatFormData; // New full CSAT form
}

export interface EscalateTicketDto {
  escalatedToId: number;
  notes?: string;
}

export interface ReturnEscalationDto {
  returnReason: string;
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
    @InjectRepository(TicketEvent)
    private readonly eventRepo: Repository<TicketEvent>,
    @InjectRepository(TicketEscalation)
    private readonly escalationRepo: Repository<TicketEscalation>,
    @InjectRepository(EscalationFocalConfig)
    private readonly escalationFocalRepo: Repository<EscalationFocalConfig>,
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

      // v0.6.15 migrations
      // Track when a ticket is explicitly closed by the requesting user
      await qr.query(
        'ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_closed TINYINT(1) NOT NULL DEFAULT 0',
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

      // ── v0.6.16 migrations ──────────────────────────────────────────────────

      // Ticket events table for timeline view
      await qr.query(`
        CREATE TABLE IF NOT EXISTS ticket_events (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          ticket_id VARCHAR(36) NOT NULL,
          actor_id INT NULL,
          event_type VARCHAR(50) NOT NULL,
          meta TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_te_ticket_id (ticket_id)
        )
      `).catch(() => undefined);

      // ── v0.6.17 migrations ──────────────────────────────────────────────────

      // SLA deadline column on tickets
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_deadline DATETIME NULL').catch(() => undefined);
      // Full CSAT form data column on tickets
      await qr.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS satisfaction_form_data TEXT NULL').catch(() => undefined);
      // SLA hours on categories
      await qr.query('ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS sla_hours INT NULL').catch(() => undefined);
      // Multi-keyword support on keyword rules
      await qr.query('ALTER TABLE ticket_keyword_rules ADD COLUMN IF NOT EXISTS keywords TEXT NULL').catch(() => undefined);
      // Backfill keywords column from existing keyword column
      await qr.query(
        "UPDATE ticket_keyword_rules SET keywords = CONCAT('[\"', keyword, '\"]') WHERE keywords IS NULL"
      ).catch(() => undefined);

      // ── v0.6.21 migrations ──────────────────────────────────────────────────

      // Escalation records per ticket
      await qr.query(`
        CREATE TABLE IF NOT EXISTS ticket_escalations (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          ticket_id VARCHAR(36) NOT NULL,
          escalated_by_id INT NOT NULL,
          escalated_to_id INT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          notes TEXT NULL,
          return_reason TEXT NULL,
          proof_files JSON NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_te_ticket (ticket_id),
          CONSTRAINT fk_te_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
        )
      `).catch(() => undefined);

      // Escalation focal configuration (which roles can receive escalations per ticket type)
      await qr.query(`
        CREATE TABLE IF NOT EXISTS escalation_focal_configs (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          ticket_type VARCHAR(30) NOT NULL,
          role_value VARCHAR(50) NOT NULL,
          label VARCHAR(100) NOT NULL,
          created_by_id INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_efc_type_role (ticket_type, role_value)
        )
      `).catch(() => undefined);

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

  // --- Event Logging -------------------------------------------------------

  /** Persist a single ticket event (fire-and-forget safe) */
  private async logEvent(
    ticketId: string,
    eventType: string,
    actorId: number | null,
    meta?: Record<string, any>,
  ): Promise<void> {
    try {
      const event = this.eventRepo.create({
        ticketId,
        eventType,
        actorId,
        meta: meta ? JSON.stringify(meta) : null,
      });
      await this.eventRepo.save(event);
    } catch (err: any) {
      this.logger.warn(`logEvent failed (non-fatal): ${err?.message}`);
    }
  }

  /** Return all events for a ticket, ordered chronologically, with actor info */
  async getTicketEvents(ticketId: string): Promise<Array<TicketEvent & { actorName?: string }>> {
    const events = await this.eventRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.actor', 'actor')
      .where('e.ticketId = :id', { id: ticketId })
      .orderBy('e.createdAt', 'ASC')
      .getMany();

    return events.map(e => ({
      ...e,
      meta: e.meta ? JSON.parse(e.meta) : null,
      actorName: e.actor
        ? [e.actor.firstName, e.actor.lastName].filter(Boolean).join(' ') || e.actor.email
        : (e.eventType === 'auto_assigned' ? 'Automatic Ticket Assignment' : undefined),
    }));
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

    // ── Auto-Shift based on keyword rules (QA #13: skipped for Pantawid ICT) ────
    if (dto.ticketType !== TicketType.PANTAWID_ICT_SUPPORT) {
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
    }

    // ── Auto-Assign based on attendance & workload ─────────────────────
    let assignedToId: number | null = null;
    let assignedTech: User | null = null;
    let noTechAvailable = false;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const isOfficeDayToday = await this.attendanceService.isOfficeDay(today);

      // ── Pantawid tickets: ALWAYS assign to pantawid_ict technician ──
      if (ticketType === TicketType.PANTAWID_ICT_SUPPORT) {
        // Find any active pantawid_ict user
        const pantawidTechs = await this.userRepo.find({
          where: [
            { role: UserRole.PANTAWID_ICT, active: true as any },
            { role: UserRole.TECHNICIAN, active: true as any },
          ],
        });
        if (pantawidTechs.length > 0) {
          // Pick the one with fewest open tickets
          let bestTech: User | null = null;
          let minCount = Infinity;
          for (const tech of pantawidTechs) {
            const cnt = await this.ticketRepo.count({
              where: [
                { assignedToId: tech.id, status: TicketStatus.OPEN },
                { assignedToId: tech.id, status: TicketStatus.ASSIGNED },
                { assignedToId: tech.id, status: TicketStatus.IN_PROGRESS },
              ],
            });
            if (cnt <= minCount) { minCount = cnt; bestTech = tech; }
          }
          if (bestTech) {
            assignedToId = bestTech.id;
            assignedTech = bestTech;
          }
        } else {
          noTechAvailable = true;
        }
      } else if (isOfficeDayToday) {
        const availableTechs = await this.attendanceService.getAvailableTechnicians(
          ticketType,
          today,
        );

        if (availableTechs.length > 0) {
          // QA #2: Senior technicians are NOT eligible for auto-assignment — they self-assign via admin UI
          const SENIOR_AUTO_ASSIGN_EXCLUDED: string[] = [
            UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_SR,
            UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_DESKTOP,
          ];
          const eligibleTechs = availableTechs.filter(t => !SENIOR_AUTO_ASSIGN_EXCLUDED.includes(t.role));

          // Sort techs by tier: junior first, then others
          const tierPriority = (role: string): number => {
            const juniorRoles: string[] = [
              UserRole.IT_SUPPORT_JR, UserRole.DESKTOP_JR,
              UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
            ];
            if (juniorRoles.includes(role)) return 1;
            return 3; // focal / pantawid / others
          };
          eligibleTechs.sort((a, b) => tierPriority(a.role) - tierPriority(b.role));

          // Pick the tech with fewest open/assigned/in_progress tickets
          let bestTech: User | null = null;
          let minCount = Infinity;

          for (const tech of eligibleTechs) {
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
      } // end else if (isOfficeDayToday)
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

    // Log creation event
    this.logEvent(saved.id, 'created', callerId, {
      ticketNumber: saved.ticketNumber,
      ticketType: saved.ticketType,
      status: saved.status,
    }).catch(() => {});

    if (assignedToId && assignedTech) {
      this.logEvent(saved.id, 'auto_assigned', null, {
        technicianId: assignedTech.id,
        technicianName: [assignedTech.firstName, assignedTech.lastName].filter(Boolean).join(' ') || assignedTech.email,
      }).catch(() => {});
    }

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
    } else if ([UserRole.TECHNICIAN_IT_STAFF, UserRole.IT_SUPPORT_JR].includes(filters.viewerRole as any)) {
      // Lower-level IT staff see only tickets assigned to them
      qb.where('t.assignedToId = :uid', { uid: filters.viewerId });
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    } else if ([UserRole.TECHNICIAN_DESKTOP_STAFF, UserRole.DESKTOP_JR].includes(filters.viewerRole as any)) {
      // Lower-level Desktop staff see only tickets assigned to them
      qb.where('t.assignedToId = :uid', { uid: filters.viewerId });
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    } else if ([UserRole.TECHNICIAN_DESKTOP, UserRole.DESKTOP_SR].includes(filters.viewerRole as any)) {
      // Desktop-level technicians see all desktop_support tickets
      qb.where('t.ticketType = :type', { type: TicketType.DESKTOP_SUPPORT });
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    } else if ([UserRole.TECHNICIAN_IT_SUPPORT, UserRole.IT_SUPPORT_SR].includes(filters.viewerRole as any)) {
      // IT-level technicians see all it_support tickets
      qb.where('t.ticketType = :type', { type: TicketType.IT_SUPPORT });
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    } else {
      // super_admin, reviewer, focal, auditor, technician see all
      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
      if (filters.ticketType) qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
      if (filters.requesterId) qb.andWhere('t.requesterId = :rid', { rid: filters.requesterId });
      if (filters.assignedToId) qb.andWhere('t.assignedToId = :aid', { aid: filters.assignedToId });
    }

    const tickets = await qb.getMany();

    // Augment with today's absence flag for assigned technicians (used in admin/section-head views)
    const today = new Date().toISOString().slice(0, 10);
    const absentRows = await this.dataSource
      .createQueryBuilder()
      .select('ta.user_id', 'userId')
      .from('tech_attendance', 'ta')
      .where('ta.date = :today', { today })
      .andWhere("ta.status IN ('absent', 'out_of_office')")
      .getRawMany();
    const absentIds = new Set<number>(absentRows.map(r => Number(r.userId)));

    return tickets.map(t => Object.assign(t, {
      assignedTechAbsent: t.assignedToId ? absentIds.has(t.assignedToId) : false,
    })) as any;
  }

  async getTicketById(id: string, viewerRole?: UserRole): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['requester', 'assignedTo', 'category', 'comments', 'comments.user'],
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    // Strip internal notes for regular users — they should never see staff-only comments
    if (viewerRole === UserRole.USER && ticket.comments) {
      (ticket as any).comments = ticket.comments.filter((c: any) => !c.isInternal);
    }
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
    // OR close their own ticket if it is in a resolvable state
    if (actorRole === UserRole.USER) {
      if (ticket.requesterId !== actorId) {
        throw new ForbiddenException('You can only update your own tickets.');
      }
      // QA #10: User can only close their own ticket when it is in Resolved status
      if (dto.status === TicketStatus.CLOSED) {
        const closeable = [TicketStatus.RESOLVED];
        if (!closeable.includes(ticket.status as TicketStatus)) {
          throw new ForbiddenException('Tickets can only be self-closed once they are in Resolved status.');
        }
        ticket.status = TicketStatus.CLOSED;
        ticket.userClosed = true;
        if (!ticket.resolvedAt) ticket.resolvedAt = new Date();
        return this.ticketRepo.save(ticket);
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
        // v0.6.14 named roles
        UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
        UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR,
        UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR,
        UserRole.LEAD_INFRA, UserRole.SERVER_ADMIN, UserRole.DB_ADMIN, UserRole.NETWORK_ADMIN,
        UserRole.PROJECT_MGR, UserRole.DEV_LEAD, UserRole.SQA_LEAD,
        UserRole.RECORDS_OFFICER, UserRole.HR_ID_OFFICER,
      ];
      if (!priorityRoles.includes(actorRole)) {
        throw new ForbiddenException('Only technicians and above can change ticket priority.');
      }
      ticket.priority = dto.priority;
    }

    if (dto.status) {
      // QA #4/#3/#6: Full status transition matrix enforcement
      const SENIOR_AUTHORITY_ROLES: UserRole[] = [
        UserRole.SUPER_ADMIN, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.REVIEWER,
        UserRole.COMPLIANCE_OFFICER, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_DESKTOP,
        UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_SR,
      ];
      const isSeniorAuthority = SENIOR_AUTHORITY_ROLES.includes(actorRole);

      const ALLOWED_TRANSITIONS: Partial<Record<TicketStatus, TicketStatus[]>> = {
        [TicketStatus.OPEN]:        [TicketStatus.FREEZE, TicketStatus.DUPLICATE],
        [TicketStatus.ASSIGNED]:    isSeniorAuthority
          ? [TicketStatus.IN_PROGRESS, TicketStatus.FREEZE, TicketStatus.DUPLICATE, TicketStatus.OPEN]
          : [TicketStatus.IN_PROGRESS, TicketStatus.FREEZE, TicketStatus.DUPLICATE],
        [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
        [TicketStatus.RESOLVED]:    [TicketStatus.CLOSED],
        [TicketStatus.FREEZE]:      [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
        [TicketStatus.CLOSED]:      [],
        [TicketStatus.DUPLICATE]:   [],
      };
      const allowed = ALLOWED_TRANSITIONS[ticket.status as TicketStatus] ?? [];
      if (!allowed.includes(dto.status as TicketStatus)) {
        throw new ForbiddenException(
          `Cannot transition ticket from '${ticket.status}' to '${dto.status}'. ` +
          (allowed.length > 0 ? `Allowed: ${allowed.join(', ')}.` : 'This status is terminal.'),
        );
      }

      // QA #5: Priority is mandatory before moving to In Progress
      if (dto.status === TicketStatus.IN_PROGRESS) {
        const effectivePriority = dto.priority ?? ticket.priority;
        if (!effectivePriority) {
          throw new BadRequestException(
            'A priority must be set on this ticket before marking it as In Progress. Please tag the priority first.',
          );
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
            'A priority must be set on this ticket before it can be marked as Resolved. Please set the priority first.',
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

    // Log status/priority change event
    if (dto.status) {
      this.logEvent(saved.id, 'status_changed', actorId, {
        to: dto.status,
        resolutionNotes: dto.resolutionNotes ?? undefined,
      }).catch(() => {});
    }

    // QA #1/#2: On RESOLVED, auto-assign next OPEN ticket — only for non-senior techs
    if (dto.status === TicketStatus.RESOLVED && saved.assignedToId) {
      try {
        const SENIOR_AUTO_ASSIGN_EXCLUDED: string[] = [
          UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_SR,
          UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_DESKTOP,
        ];
        const resolvedByTech = await this.userRepo.findOne({ where: { id: saved.assignedToId } });
        const isSeniorTech = resolvedByTech && SENIOR_AUTO_ASSIGN_EXCLUDED.includes(resolvedByTech.role);

        if (!isSeniorTech) {
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
        }
      } catch (err: any) {
        this.logger.warn(`Auto-reassign on resolve failed (non-fatal): ${err?.message}`);
      }
    }

    return saved;
  }

  async assignTicket(id: string, dto: AssignTicketDto, actorRole: UserRole, actorId?: number): Promise<Ticket> {
    const allowedActors = [
      UserRole.SUPER_ADMIN, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.REVIEWER,
      UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT,
      UserRole.TECHNICIAN, UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
      // v0.6.14 named roles
      UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
      UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR,
      UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR,
      UserRole.LEAD_INFRA, UserRole.SERVER_ADMIN, UserRole.DB_ADMIN, UserRole.NETWORK_ADMIN,
      UserRole.PROJECT_MGR, UserRole.DEV_LEAD, UserRole.SQA_LEAD,
      UserRole.RECORDS_OFFICER, UserRole.HR_ID_OFFICER,
    ];
    if (!allowedActors.includes(actorRole)) {
      throw new ForbiddenException('Only admins, focal persons, and technicians can assign tickets.');
    }

    const ticket = await this.getTicketById(id);

    // Duplicate, Resolved, and Closed tickets are terminal – assignment is not allowed
    if (ticket.status === TicketStatus.DUPLICATE) {
      throw new ForbiddenException('Cannot assign a technician to a ticket that is marked as Duplicate.');
    }
    if ([TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status as TicketStatus)) {
      throw new ForbiddenException('Resolved or closed tickets cannot be reassigned.');
    }

    const technician = await this.userRepo.findOne({ where: { id: dto.assignedToId } });
    if (!technician) throw new NotFoundException('Technician not found');

    // If the actor has ticketMainFocal=true they are empowered to re-assign freely (skip busy guard)
    let actorIsMainFocal = false;
    if (actorId) {
      const actorUser = await this.userRepo.findOne({ where: { id: actorId } });
      actorIsMainFocal = actorUser?.ticketMainFocal === true;
    }
    const bypassBusyGuard = actorIsMainFocal || [UserRole.SUPER_ADMIN, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.REVIEWER].includes(actorRole);

    // Guard: lower-level techs can only escalate to focal-level technicians
    const lowerLevelRoles: UserRole[] = [UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR];
    const focalTechRoles: UserRole[] = [UserRole.TECHNICIAN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR];
    if (lowerLevelRoles.includes(actorRole) && !focalTechRoles.includes(technician.role as UserRole)) {
      throw new ForbiddenException('Lower-level technicians may only escalate to focal-level technicians.');
    }

    // Guard: technician must have no active tickets (unless actor is main focal / admin)
    if (!bypassBusyGuard) {
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
    }

    ticket.assignedToId = dto.assignedToId;
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.ASSIGNED;
    }

    // Set SLA deadline if the ticket's category has an SLA configured
    if (ticket.category?.slaHours) {
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + ticket.category.slaHours);
      ticket.slaDeadline = deadline;
    }

    const assigned = await this.ticketRepo.save(ticket);

    // Log assignment event
    this.logEvent(assigned.id, 'manually_assigned', actorId ?? null, {
      technicianId: technician.id,
      technicianName: [technician.firstName, technician.lastName].filter(Boolean).join(' ') || technician.email,
      previousAssignee: ticket.assignedToId !== dto.assignedToId ? ticket.assignedToId : undefined,
    }).catch(() => {});

    // Send assignment notification email (fire-and-forget)
    this.emailService.sendTicketAssignedEmail({
      ticketNumber: assigned.ticketNumber,
      subject: assigned.subject,
      ticketType: assigned.ticketType,
      priority: assigned.priority,
      status: assigned.status,
      technicianName: [technician.firstName, technician.lastName].filter(Boolean).join(' ') || technician.email,
      technicianEmail: technician.email,
    }).catch(() => {});

    return assigned;
  }

  /** Mark ticket as In Progress when the assigned technician opens the detail view */
  async markTicketViewed(id: string, viewerId: number, viewerRole: UserRole): Promise<Ticket | null> {
    const ticket = await this.getTicketById(id);
    // Only auto-transition when the assigned technician views an 'assigned' ticket
    // QA #5: Skip auto-transition if priority has not been set yet
    if (
      ticket.status === TicketStatus.ASSIGNED &&
      ticket.assignedToId === viewerId
    ) {
      if (!ticket.priority) {
        this.logger.log(`Auto in_progress skipped: ticket ${ticket.ticketNumber} has no priority set.`);
        return null; // Priority must be set first
      }
      ticket.status = TicketStatus.IN_PROGRESS;
      const saved = await this.ticketRepo.save(ticket);
      this.logger.log(`Auto in_progress: ticket ${ticket.ticketNumber} viewed by technician #${viewerId}`);
      this.logEvent(saved.id, 'in_progress', viewerId, { via: 'view' }).catch(() => {});
      return saved;
    }
    return null; // no change
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

    const savedComment = await this.commentRepo.save(comment);
    this.logEvent(ticketId, 'comment_added', actorId, { isInternal: isInternal ?? false }).catch(() => {});
    return savedComment;
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

    if (dto.formData) {
      // Full CSAT form submission
      const form = dto.formData;
      if (!form.consentGiven) {
        throw new BadRequestException('Informed consent is required to submit the satisfaction form.');
      }
      if (!form.unitSection?.trim()) throw new BadRequestException('Unit/Section is required.');
      if (!form.clientFirstName?.trim() || !form.clientLastName?.trim()) {
        throw new BadRequestException('Client first and last name are required.');
      }
      if (!form.sex) throw new BadRequestException('Sex is required.');
      if (!form.likert || form.likert.length !== 9) {
        throw new BadRequestException('All 9 service quality items must be answered.');
      }

      // Compute satisfactionRating from item 0 (overall satisfaction)
      const item0 = form.likert[0];
      const derivedRating = (typeof item0 === 'number' && item0 >= 1 && item0 <= 5) ? item0 : null;

      ticket.satisfactionRating = derivedRating;
      ticket.satisfactionComment = null;
      ticket.satisfactionFormData = JSON.stringify(form);
    } else {
      // Legacy star rating fallback
      const rating = dto.rating ?? 0;
      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5.');
      }
      ticket.satisfactionRating = rating;
      ticket.satisfactionComment = dto.comment ?? null;
    }

    ticket.satisfactionSubmittedAt = new Date();
    return this.ticketRepo.save(ticket);
  }

  /** Return distinct unit/section values from past satisfaction form submissions */
  async getSatisfactionUnitSuggestions(): Promise<string[]> {
    const rows = await this.ticketRepo
      .createQueryBuilder('t')
      .select('t.satisfactionFormData', 'formData')
      .where('t.satisfactionFormData IS NOT NULL')
      .getRawMany();

    const units = new Set<string>();
    for (const row of rows) {
      try {
        const data = JSON.parse(row.formData ?? '{}');
        if (data.unitSection) units.add(data.unitSection);
      } catch { /* skip malformed */ }
    }
    return Array.from(units).sort();
  }

  // --- Statistics ----------------------------------------------------------

  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    satisfactionAvg: number | null;
    satisfactionFillRate: number;
    resolvedTickets: number;
    userClosedTickets: number;
  }> {
    const all = await this.ticketRepo.find();
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let ratingSum = 0;
    let ratingCount = 0;
    let resolvedCount = 0;
    let userClosedCount = 0;

    for (const t of all) {
      // User-closed tickets (self-served) are tracked but excluded from operational stats
      if (t.userClosed) {
        userClosedCount++;
        continue;
      }
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

    const operationalTotal = all.length - userClosedCount;
    const fillRate = resolvedCount > 0 ? Math.round((ratingCount / resolvedCount) * 100) : 0;

    return {
      total: operationalTotal,
      byStatus,
      byType,
      satisfactionAvg: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
      satisfactionFillRate: fillRate,
      resolvedTickets: resolvedCount,
      userClosedTickets: userClosedCount,
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
        // v0.6.14+ named technician roles
        { role: UserRole.PANTAWID_ICT },
        { role: UserRole.DESKTOP_SR },
        { role: UserRole.IT_SUPPORT_SR },
        { role: UserRole.DESKTOP_JR },
        { role: UserRole.IT_SUPPORT_JR },
        { role: UserRole.FOCAL, ticketMainFocal: true },
      ],
    });

    // Get IDs of technicians marked absent or out_of_office today
    const today = new Date().toISOString().slice(0, 10);
    const absentRows = await this.dataSource
      .createQueryBuilder()
      .select('ta.user_id', 'userId')
      .from('tech_attendance', 'ta')
      .where('ta.date = :today', { today })
      .andWhere("ta.status IN ('absent', 'out_of_office')")
      .getRawMany();
    const absentIds = new Set<number>(absentRows.map(r => Number(r.userId)));

    const results = [];
    for (const tech of technicians) {
      // Skip absent / out-of-office technicians — they cannot be assigned
      if (absentIds.has(tech.id)) continue;

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
  }

  // --- Ticket Reports (QA #11) --------------------------------------------

  async getTicketReports(filters: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    technicianId?: number;
    ticketType?: string;
  }): Promise<{
    totalTickets: number;
    totalWithRating: number;
    avgOverallRating: number | null;
    avgRatingByType: Array<{ type: string; avg: number; count: number }>;
    avgRatingByTechnician: Array<{ techId: number; techName: string; avg: number; count: number }>;
    totalEscalations: number;
    acceptedEscalations: number;
    returnedEscalations: number;
  }> {
    const now = new Date();
    const year = filters.year ?? now.getFullYear();

    // Build date range from filters
    let startDate: Date;
    let endDate: Date;

    if (filters.month) {
      startDate = new Date(year, filters.month - 1, 1);
      endDate = new Date(year, filters.month, 0, 23, 59, 59, 999);
    } else if (filters.quarter) {
      const qStart = (filters.quarter - 1) * 3;
      startDate = new Date(year, qStart, 1);
      endDate = new Date(year, qStart + 3, 0, 23, 59, 59, 999);
    } else if (filters.semester) {
      const sStart = (filters.semester - 1) * 6;
      startDate = new Date(year, sStart, 1);
      endDate = new Date(year, sStart + 6, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    let qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .where('t.satisfactionRating IS NOT NULL')
      .andWhere('t.createdAt >= :startDate', { startDate })
      .andWhere('t.createdAt <= :endDate', { endDate });

    if (filters.technicianId) {
      qb = qb.andWhere('t.assignedToId = :techId', { techId: filters.technicianId });
    }
    if (filters.ticketType) {
      qb = qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
    }

    const tickets = await qb.getMany();

    // Total tickets (any status) in the date range with optional filters
    let totalQb = this.ticketRepo
      .createQueryBuilder('t')
      .where('t.createdAt >= :startDate', { startDate })
      .andWhere('t.createdAt <= :endDate', { endDate });
    if (filters.technicianId) totalQb = totalQb.andWhere('t.assignedToId = :techId', { techId: filters.technicianId });
    if (filters.ticketType) totalQb = totalQb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
    const totalTickets = await totalQb.getCount();

    if (tickets.length === 0) {
      return { totalTickets, totalWithRating: 0, avgOverallRating: null, avgRatingByType: [], avgRatingByTechnician: [], totalEscalations: 0, acceptedEscalations: 0, returnedEscalations: 0 };
    }

    // Overall average
    const overallSum = tickets.reduce((s, t) => s + (t.satisfactionRating ?? 0), 0);
    const avgOverallRating = Math.round((overallSum / tickets.length) * 10) / 10;

    // Per type
    const byTypeMap = new Map<string, { sum: number; count: number }>();
    for (const t of tickets) {
      const key = t.ticketType;
      const cur = byTypeMap.get(key) ?? { sum: 0, count: 0 };
      byTypeMap.set(key, { sum: cur.sum + (t.satisfactionRating ?? 0), count: cur.count + 1 });
    }
    const avgRatingByType = Array.from(byTypeMap.entries()).map(([type, { sum, count }]) => ({
      type,
      avg: Math.round((sum / count) * 10) / 10,
      count,
    }));

    // Per technician
    const byTechMap = new Map<number, { name: string; sum: number; count: number }>();
    for (const t of tickets) {
      if (!t.assignedToId) continue;
      const techName = t.assignedTo
        ? [t.assignedTo.firstName, t.assignedTo.lastName].filter(Boolean).join(' ') || t.assignedTo.email
        : `Tech #${t.assignedToId}`;
      const cur = byTechMap.get(t.assignedToId) ?? { name: techName, sum: 0, count: 0 };
      byTechMap.set(t.assignedToId, { name: techName, sum: cur.sum + (t.satisfactionRating ?? 0), count: cur.count + 1 });
    }
    const avgRatingByTechnician = Array.from(byTechMap.entries()).map(([techId, { name, sum, count }]) => ({
      techId,
      techName: name,
      avg: Math.round((sum / count) * 10) / 10,
      count,
    })).sort((a, b) => b.avg - a.avg);

    // Escalation counts in the same date range
    let escQb = this.escalationRepo
      .createQueryBuilder('e')
      .innerJoin('tickets', 't', 't.id = e.ticket_id')
      .where('t.created_at >= :startDate', { startDate })
      .andWhere('t.created_at <= :endDate', { endDate });
    if (filters.ticketType) {
      escQb = escQb.andWhere('t.ticket_type = :ticketType', { ticketType: filters.ticketType });
    }
    const totalEscalations = await escQb.getCount();
    const acceptedEscalations = await escQb.clone().andWhere('e.status = :s', { s: EscalationStatus.ACCEPTED }).getCount();
    const returnedEscalations = await escQb.clone().andWhere('e.status = :s', { s: EscalationStatus.RETURNED }).getCount();

    return { totalTickets, totalWithRating: tickets.length, avgOverallRating, avgRatingByType, avgRatingByTechnician, totalEscalations, acceptedEscalations, returnedEscalations };
  }

  // --- Escalation ----------------------------------------------------------

  /**
   * Storage root for escalation proof photos.
   * QA #5/#6: Photos are stored on the existing backend filesystem (not a separate DB/service).
   */
  private escalationStorageRoot(): string {
    return path.join(process.cwd(), 'storage', 'escalation-proofs');
  }

  /** POST /tickets/:id/escalate — tech escalates a ticket to a focal/senior */
  async escalateTicket(
    ticketId: string,
    dto: EscalateTicketDto,
    proofFiles: Express.Multer.File[],
    actorId: number,
    actorRole: UserRole,
  ): Promise<TicketEscalation> {
    const ticket = await this.getTicketById(ticketId);

    // Terminal tickets cannot be escalated
    if ([TicketStatus.CLOSED, TicketStatus.DUPLICATE, TicketStatus.RESOLVED].includes(ticket.status as TicketStatus)) {
      throw new ForbiddenException('Resolved, closed, or duplicate tickets cannot be escalated.');
    }

    // Verify target is a valid escalation focal for this ticket type
    const focals = await this.escalationFocalRepo.find();
    const focal = await this.userRepo.findOne({ where: { id: dto.escalatedToId } });
    if (!focal) throw new NotFoundException('Escalation target user not found.');

    const allowedRoles = focals
      .filter(f => f.ticketType === ticket.ticketType || f.ticketType === 'all')
      .map(f => f.roleValue);

    if (allowedRoles.length > 0 && !allowedRoles.includes(focal.role)) {
      throw new ForbiddenException('The selected user is not designated as an escalation focal for this ticket type.');
    }

    // Save proof photos to disk
    const savedPaths: string[] = [];
    if (proofFiles && proofFiles.length > 0) {
      const dir = path.join(this.escalationStorageRoot(), ticketId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      for (const file of proofFiles) {
        const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const fullPath = path.join(dir, filename);
        fs.writeFileSync(fullPath, file.buffer);
        savedPaths.push(`escalation-proofs/${ticketId}/${filename}`);
      }
    }

    const escalation = this.escalationRepo.create({
      ticketId,
      escalatedById: actorId,
      escalatedToId: dto.escalatedToId,
      status: EscalationStatus.PENDING,
      notes: dto.notes ?? null,
      proofFiles: savedPaths.length > 0 ? savedPaths : null,
    });
    const saved = await this.escalationRepo.save(escalation);

    // Re-assign ticket to the focal technician
    ticket.assignedToId = dto.escalatedToId;
    if (ticket.status === TicketStatus.OPEN) ticket.status = TicketStatus.ASSIGNED;
    await this.ticketRepo.save(ticket);

    this.logEvent(ticketId, 'escalated', actorId, {
      escalatedToId: dto.escalatedToId,
      escalatedToName: [focal.firstName, focal.lastName].filter(Boolean).join(' ') || focal.email,
      hasProof: savedPaths.length > 0,
    }).catch(() => {});

    return saved;
  }

  /** PATCH /tickets/:id/escalation/:eid/accept — focal accepts the escalation */
  async acceptEscalation(ticketId: string, escalationId: string, actorId: number): Promise<TicketEscalation> {
    const escalation = await this.escalationRepo.findOne({ where: { id: escalationId, ticketId } });
    if (!escalation) throw new NotFoundException('Escalation record not found.');
    if (escalation.escalatedToId !== actorId) {
      throw new ForbiddenException('Only the escalation target may accept or return this escalation.');
    }
    if (escalation.status !== EscalationStatus.PENDING) {
      throw new BadRequestException('This escalation has already been processed.');
    }
    escalation.status = EscalationStatus.ACCEPTED;
    return this.escalationRepo.save(escalation);
  }

  /** PATCH /tickets/:id/escalation/:eid/return — focal returns the ticket with a reason */
  async returnEscalation(
    ticketId: string,
    escalationId: string,
    dto: ReturnEscalationDto,
    actorId: number,
  ): Promise<TicketEscalation> {
    const escalation = await this.escalationRepo.findOne({ where: { id: escalationId, ticketId } });
    if (!escalation) throw new NotFoundException('Escalation record not found.');
    if (escalation.escalatedToId !== actorId) {
      throw new ForbiddenException('Only the escalation target may accept or return this escalation.');
    }
    if (escalation.status !== EscalationStatus.PENDING) {
      throw new BadRequestException('This escalation has already been processed.');
    }
    if (!dto.returnReason?.trim()) {
      throw new BadRequestException('A return reason is required.');
    }
    escalation.status = EscalationStatus.RETURNED;
    escalation.returnReason = dto.returnReason.trim();

    // Re-assign ticket back to the escalating technician
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (ticket) {
      ticket.assignedToId = escalation.escalatedById;
      if (ticket.status === TicketStatus.OPEN) ticket.status = TicketStatus.ASSIGNED;
      await this.ticketRepo.save(ticket);
    }

    this.logEvent(ticketId, 'escalation_returned', actorId, { reason: dto.returnReason }).catch(() => {});
    return this.escalationRepo.save(escalation);
  }

  /** GET /tickets/:id/escalations — list all escalations for a ticket */
  async getEscalations(ticketId: string): Promise<TicketEscalation[]> {
    return this.escalationRepo.find({
      where: { ticketId },
      relations: ['escalatedBy', 'escalatedTo'],
      order: { createdAt: 'DESC' },
    });
  }
}