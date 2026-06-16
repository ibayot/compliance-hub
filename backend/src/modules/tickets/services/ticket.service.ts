import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository, Not } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Ticket, TicketType, TicketStatus, TicketPriority } from '../entities/ticket.entity';
import { TicketComment } from '../entities/ticket-comment.entity';
import { TicketCategoryConfig } from '../entities/ticket-category.entity';
import { TicketIssueType } from '../entities/ticket-issue-type.entity';
import { TicketEvent } from '../entities/ticket-event.entity';
import { TicketEscalation, EscalationStatus } from '../entities/ticket-escalation.entity';
import { EscalationFocalConfig } from '../entities/escalation-focal-config.entity';
import { User, UserRole } from '../../shared/entities';
import { TicketSettingsService } from './ticket-settings.service';
import { AttendanceService } from './attendance.service';
import { EmailService, TicketEmailData } from './email.service';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import { EventBusService } from '../../../common/events/event-bus.service';

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
  /** Optional issue type reference from ticket_issue_types */
  issueTypeId?: string;
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  resolutionNotes?: string;
  resolutionSteps?: string;
  resolutionDate?: string;
  issueTypeId?: string | null;
  /** Required when status = DUPLICATE: UUID of the original ticket */
  duplicateOfId?: string;
  ticketType?: TicketType;
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

  private isDbBootstrapEnabled(): boolean {
    return String(process.env.DB_BOOTSTRAP ?? 'true').toLowerCase() === 'true';
  }

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private readonly commentRepo: Repository<TicketComment>,
    @InjectRepository(TicketIssueType)
    private readonly issueTypeRepo: Repository<TicketIssueType>,
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
    private readonly roleCapSvc: RoleCapabilitiesService,
    @Optional()
    private readonly eventBus?: EventBusService,
  ) {}

  // --- Schema Migration ----------------------------------------------------

  async onModuleInit(): Promise<void> {
    if (this.isDbBootstrapEnabled()) {
      try {
        await this.runMigrations();
      } catch (err) {
        this.logger.warn(`Ticket schema migration failed (non-fatal): ${err?.message}`);
      }
    } else {
      this.logger.log('DB bootstrap disabled; skipping ticket startup migration/views/seed.');
    }

    if (this.eventBus) {
      this.eventBus.subscribe('attendance.unavailable', (payload: any) => {
        if (payload?.techId) {
          this.reassignUnavailableTechnicianTickets(payload.techId).catch(() => {});
        }
      });
      this.eventBus.subscribe('user.login', (payload: any) => {
        if (payload?.userId) {
          this.assignPendingTicketsOnLogin(payload.userId).catch(() => {});
        }
      });
    }
  }

  private async runMigrations(): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const usersDb = process.env.USERS_DB_DATABASE || await this.resolveExistingSchemaName(
        qr,
        ['02_db_stg_compliance_hub_users', 'compliance_hub_users', 'ricms_users', 'rictms_users'],
        'compliance_hub_users',
      );
      const complianceDb = process.env.COMPLIANCE_DB_DATABASE || await this.resolveExistingSchemaName(
        qr,
        ['compliance_hub', 'ricms_compliance', 'rictms_compliance'],
        'compliance_hub',
      );

      // Schema DDL has been extracted to versioned migration files.
      // See backend/database/migrations/v0.0.50-service-ddl-extraction.sql.

      // ── Cross-DB compatibility views (re-created on every startup) ─────────
      // These are infrastructure config, not data mutations. They must be
      // re-applied on restart so TypeORM entity JOINs continue to work.

      await qr.query('DROP VIEW IF EXISTS attendance').catch(() => undefined);
      await qr.query('DROP TABLE IF EXISTS attendance').catch(() => undefined);
      await qr.query(`CREATE VIEW attendance AS SELECT * FROM \`${usersDb}\`.attendance`).catch(() => undefined);

      await qr.query('DROP VIEW IF EXISTS users').catch(() => undefined);
      await qr.query('DROP TABLE IF EXISTS users').catch(() => undefined);
      await qr.query(`CREATE VIEW users AS SELECT * FROM \`${usersDb}\`.users`).catch(() => undefined);

      await qr.query('DROP VIEW IF EXISTS units').catch(() => undefined);
      await qr.query('DROP TABLE IF EXISTS units').catch(() => undefined);
      await qr.query(`CREATE VIEW units AS SELECT * FROM \`${complianceDb}\`.units`).catch(() => undefined);

      await qr.query('DROP VIEW IF EXISTS role_definitions').catch(() => undefined);
      await qr.query('DROP TABLE IF EXISTS role_definitions').catch(() => undefined);
      await qr.query(`CREATE VIEW role_definitions AS SELECT * FROM \`${usersDb}\`.role_definitions`).catch(() => undefined);

      await qr.query('DROP VIEW IF EXISTS role_capabilities').catch(() => undefined);
      await qr.query(`CREATE OR REPLACE VIEW role_capabilities AS SELECT * FROM \`${usersDb}\`.role_capabilities`).catch(() => undefined);

      // ── Data seeding (idempotent) ──────────────────────────────────────────
      await this.seedDefaultCategories(qr);
      await this.seedDefaultKeywordRules(qr);

      this.logger.log('Ticket service views and seed data applied.');
    } finally {
      await qr.release();
    }
    // Reload capability cache now that the VIEW is guaranteed to exist
    await this.roleCapSvc.reload().catch(() => undefined);
  }

  private async resolveExistingSchemaName(
    qr: QueryRunner,
    candidates: string[],
    fallback: string,
  ): Promise<string> {
    const quoted = candidates.map((name) => `'${name}'`).join(',');
    const rows = await qr.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name IN (${quoted}) ORDER BY schema_name ASC LIMIT 1`,
    ) as Array<{ schema_name?: string }>;
    return rows?.[0]?.schema_name || fallback;
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
    const latest = await this.ticketRepo
      .createQueryBuilder('t')
      .select('t.ticketNumber', 'ticketNumber')
      .where('t.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.ticketNumber', 'DESC')
      .limit(1)
      .getRawOne<{ ticketNumber?: string }>();

    const latestNumber = latest?.ticketNumber ?? '';
    const latestSeq = Number((latestNumber.split('-').pop() ?? '0').replace(/[^0-9]/g, '')) || 0;
    const seq = String(latestSeq + 1).padStart(4, '0');
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
  async getTicketEvents(
    ticketId: string,
    viewerId?: number,
    viewerRole?: UserRole,
  ): Promise<Array<TicketEvent & { actorName?: string }>> {
    await this.getTicketById(ticketId, viewerRole, viewerId);

    const events = await this.eventRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.actor', 'actor')
      .where('e.ticketId = :id', { id: ticketId })
      .orderBy('e.createdAt', 'DESC')
      .addOrderBy("CASE WHEN e.eventType = 'created' THEN 0 WHEN e.eventType = 'auto_assigned' THEN 1 ELSE 2 END", 'DESC')
      .getMany();

    return events.map(e => ({
      ...e,
      meta: e.meta ? JSON.parse(e.meta) : null,
      actorName: e.actor
        ? [e.actor.firstName, e.actor.lastName].filter(Boolean).join(' ') || e.actor.email
        : (e.eventType === 'auto_assigned' ? 'Automatic Ticket Assignment' : undefined),
    }));
  }

  private canViewAllTicketsInTicketing(role?: string): boolean {
    if (!role) return false;
    return this.roleCapSvc.isAllTickets(role);
  }

  private canViewEscalatedQueue(role?: string): boolean {
    if (!role) return false;
    if (role === UserRole.SUPER_ADMIN) return true;
    return this.roleCapSvc.isEscalationFocal(role);
  }

  private async canAccessTicketByEscalation(ticketId: string, viewerId?: number): Promise<boolean> {
    if (!viewerId) return false;

    const count = await this.escalationRepo
      .createQueryBuilder('e')
      .where('e.ticketId = :ticketId', { ticketId })
      .andWhere('(e.escalatedById = :viewerId OR e.escalatedToId = :viewerId)', { viewerId })
      .getCount();

    return count > 0;
  }

  private async assertTicketReadAccess(ticket: Ticket, viewerId?: number, viewerRole?: UserRole): Promise<void> {
    if (!viewerRole || !viewerId) return;
    if (this.canViewAllTicketsInTicketing(viewerRole as string)) return;
    const vId = Number(viewerId);
    // Allow access to: requester, assigned tech, the person who created it (proxy filer)
    if (Number(ticket.requesterId) === vId || Number(ticket.assignedToId) === vId) return;
    if (ticket.createdById && Number(ticket.createdById) === vId) return;
    if (await this.canAccessTicketByEscalation(ticket.id, vId)) return;

    throw new ForbiddenException('You do not have access to this ticket.');
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

    // NOTE: Multiple concurrent tickets per requester are now allowed.
    // The unclosed-ticket restriction was removed per business rule change.
    // The satisfaction reminder is shown on the frontend only (non-blocking).

    let ticketType = dto.ticketType;
    let categoryId = dto.categoryId || null;
    let issueTypeId = dto.issueTypeId || null;
    let issueTypeKey: string = 'other';
    let autoShifted = false;

    if (issueTypeId) {
      const issueType = await this.issueTypeRepo.findOne({
        where: { id: issueTypeId, is_deleted: false, is_active: true },
      });
      if (!issueType) {
        throw new BadRequestException('Selected issue type is invalid or inactive.');
      }
      issueTypeKey = issueType.key;
    }

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

      // ── Unified Fallback Chain for Auto-Assignment ──
      let fallbackChain: TicketType[] = [];
      if (ticketType === TicketType.IT_SUPPORT) {
        fallbackChain = [TicketType.IT_SUPPORT, TicketType.DESKTOP_SUPPORT, TicketType.PANTAWID_ICT_SUPPORT];
      } else if (ticketType === TicketType.DESKTOP_SUPPORT) {
        fallbackChain = [TicketType.DESKTOP_SUPPORT, TicketType.IT_SUPPORT, TicketType.PANTAWID_ICT_SUPPORT];
      } else if (ticketType === TicketType.PANTAWID_ICT_SUPPORT) {
        fallbackChain = [TicketType.PANTAWID_ICT_SUPPORT, TicketType.DESKTOP_SUPPORT, TicketType.IT_SUPPORT];
      } else {
        fallbackChain = [ticketType];
      }

      for (const tType of fallbackChain) {
        // Pantawid is processed regardless of office days, others only if it is an office day
        if (tType !== TicketType.PANTAWID_ICT_SUPPORT && !isOfficeDayToday) {
          continue;
        }

        const availableTechs = await this.attendanceService.getPresentTechnicians(
          tType,
          today,
        );

        if (availableTechs.length > 0) {
          // QA #2: Senior technicians are NOT eligible for auto-assignment
          // Fix: Ensure a ticket is never assigned to its own requester
          const eligibleTechs = availableTechs.filter(t => !this.roleCapSvc.isSeniorTech(t.role) && t.id !== requesterId);
          
          // Sort techs by tier: junior first, then others
          const tierPriority = (role: string): number => {
            const juniorRoles: string[] = [UserRole.IT_SUPPORT_JR, UserRole.DESKTOP_JR];
            if (juniorRoles.includes(role)) return 1;
            return 3; 
          };
          eligibleTechs.sort((a, b) => tierPriority(a.role) - tierPriority(b.role));

          let minCount = Infinity;
          for (const tech of eligibleTechs) {
            const openCount = await this.ticketRepo.count({
              where: [
                { assignedToId: tech.id, status: TicketStatus.OPEN },
                { assignedToId: tech.id, status: TicketStatus.ASSIGNED },
                { assignedToId: tech.id, status: TicketStatus.IN_PROGRESS },
              ],
            });
            // Only consider techs with ZERO active tickets
            if (openCount === 0 && openCount < minCount) {
              minCount = openCount;
              assignedTech = tech;
            }
          }

          if (assignedTech) {
            assignedToId = assignedTech.id;
            this.logger.log(`Auto-assign resolved: original=${ticketType} → assigned=${tType} to ${assignedTech.email}`);
            break;
          }
        }
      }

      if (!assignedToId) {
        noTechAvailable = true;
        this.logger.log('Auto-assign: no technician available across fallback chain');
      }
    } catch (err: any) {
      this.logger.warn(`Auto-assign failed (non-fatal): ${err?.message}`);
    }

    const ticketNumber = await this.generateTicketNumber();
    const status = assignedToId ? TicketStatus.ASSIGNED : TicketStatus.OPEN;

    let slaDeadline: Date | null = null;
    if (assignedToId && categoryId) {
      const cat = await this.settingsService.getCategoryById(categoryId).catch(() => null);
      if (cat?.slaHours) {
        slaDeadline = new Date();
        slaDeadline.setHours(slaDeadline.getHours() + cat.slaHours);
      }
    }

    const ticket = this.ticketRepo.create({
      ticketNumber,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      ticketType: ticketType,
      priority: dto.priority ?? null,
      status,
      categoryId,
      slaDeadline,
      issueTypeId,
      issueType: issueTypeKey,
      requesterId,
      createdById: callerId,
      assignedToId,
      resolutionNotes: null,
      resolutionSteps: null,
      resolutionDate: null,
      resolvedAt: null,
      satisfactionRating: null,
      satisfactionComment: null,
      satisfactionSubmittedAt: null,
    });

    let saved: Ticket | null = null;
    // Guard against duplicate ticket numbers in concurrent creation scenarios.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        saved = await this.ticketRepo.save(ticket);
        break;
      } catch (err: any) {
        const isDuplicate = /duplicate entry|ER_DUP_ENTRY/i.test(String(err?.message ?? ''));
        if (!isDuplicate || attempt === 2) throw err;
        ticket.ticketNumber = await this.generateTicketNumber();
      }
    }
    if (!saved) {
      throw new BadRequestException('Failed to create ticket due to ticket number allocation conflict.');
    }

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
      ticketId: saved.id,
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
    escalatedToId?: number;
    viewerId?: number;
    viewerRole?: UserRole;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Ticket[] | {
    data: Ticket[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const allowedSortColumns: Record<string, string> = {
      createdAt: 't.createdAt',
      updatedAt: 't.updatedAt',
      priority: 't.priority',
      status: 't.status',
      slaDeadline: 't.slaDeadline',
    };
    const sortBy = allowedSortColumns[filters.sortBy || 'createdAt'] || allowedSortColumns.createdAt;
    const sortOrder = filters.sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.requester', 'requester')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.category', 'category')
      .leftJoinAndSelect('t.issueTypeConfig', 'issueTypeConfig')
      .leftJoinAndSelect('t.comments', 'comments')
      .leftJoinAndSelect('comments.user', 'commentUser')
      .orderBy(sortBy, sortOrder as 'ASC' | 'DESC')
      .distinct(true);

    const isEscalatedQueue = Boolean(filters.escalatedToId);

    if (isEscalatedQueue && !this.canViewEscalatedQueue(filters.viewerRole as string)) {
      throw new ForbiddenException('Your role does not have escalation queue access.');
    }

    if (isEscalatedQueue) {
      qb.innerJoin(
        'ticket_escalations',
        'te',
        'te.ticket_id = t.id AND te.escalated_to_id = :escalatedToId AND te.status IN (:...escalationStatuses)',
        {
          escalatedToId: filters.escalatedToId,
          escalationStatuses: [EscalationStatus.PENDING, EscalationStatus.ACCEPTED],
        },
      ).distinct(true);

      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
      if (filters.ticketType) qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
      if (filters.requesterId) qb.andWhere('t.requesterId = :rid', { rid: filters.requesterId });
      if (filters.assignedToId) qb.andWhere('t.assignedToId = :aid', { aid: filters.assignedToId });
    } else {
      // Role-based visibility
      // Focal roles (is_focal=1) and super_admin see ALL tickets (full management view).
      if (filters.viewerRole === UserRole.USER) {
        // Regular users see their own tickets AND tickets filed on their behalf (proxy),
        // plus tickets they created on behalf of others (proxy filer visibility)
        qb.where('(t.requesterId = :uid OR t.createdById = :uid)', { uid: filters.viewerId });
      } else if (filters.viewerRole && this.canViewAllTicketsInTicketing(filters.viewerRole as string)) {
        // Privileged roles: no WHERE restriction — see all tickets with full filter support
        if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
        if (filters.ticketType) qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
        if (filters.requesterId) qb.andWhere('t.requesterId = :rid', { rid: filters.requesterId });
        if (filters.assignedToId) qb.andWhere('t.assignedToId = :aid', { aid: filters.assignedToId });
      } else {
        // All other staff: see only tickets assigned to them OR submitted by them
        qb.where('(t.assignedToId = :uid OR t.requesterId = :uid)', { uid: filters.viewerId });
        if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
        if (filters.ticketType) qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
      }
    }

    const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : undefined;
    const limit = filters.limit && filters.limit > 0 ? Math.min(100, Math.floor(filters.limit)) : undefined;
    const usePagination = Boolean(page && limit);

    let tickets: Ticket[] = [];
    let total = 0;
    if (usePagination) {
      const offset = ((page as number) - 1) * (limit as number);
      tickets = await qb.clone().skip(offset).take(limit as number).getMany();
      const totalRow = await qb
        .clone()
        .select('COUNT(DISTINCT t.id)', 'count')
        .getRawOne<{ count?: string | number }>();
      total = Number(totalRow?.count ?? 0);
    } else {
      tickets = await qb.getMany();
    }

    // Augment with today's absence flag for assigned technicians (used in admin/section-head views)
    const today = new Date().toISOString().slice(0, 10);
    const absentRows = await this.dataSource
      .createQueryBuilder()
      .select('ta.user_id', 'userId')
      .from('attendance', 'ta')
      .where('ta.date = :today', { today })
      .andWhere("ta.status IN ('absent', 'out_of_office')")
      .getRawMany();
    const absentIds = new Set<number>(absentRows.map(r => Number(r.userId)));

    const now = new Date();
    const withAvailability = tickets.map(t => {
      let isOverdue = false;
      let isNearingSLA = false;
      if (t.slaDeadline) {
        const deadline = new Date(t.slaDeadline);
        const createdAt = new Date(t.createdAt);
        const totalSlaMs = deadline.getTime() - createdAt.getTime();
        const fortyPercentSlaMs = totalSlaMs * 0.40;

        if (now > deadline) {
          isOverdue = true;
        } else if (deadline.getTime() - now.getTime() <= fortyPercentSlaMs) {
          isNearingSLA = true;
        }
      }
      return Object.assign(t, {
        assignedTechAbsent: t.assignedToId ? absentIds.has(t.assignedToId) : false,
        isOverdue,
        isNearingSLA,
      });
    }) as any;

    if (!usePagination) {
      return withAvailability;
    }

    return {
      data: withAvailability,
      total,
      page: page as number,
      limit: limit as number,
      totalPages: Math.max(1, Math.ceil(total / (limit as number))),
    };
  }

  async getTicketById(id: string, viewerRole?: UserRole, viewerId?: number): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['requester', 'createdBy', 'assignedTo', 'category', 'issueTypeConfig', 'comments', 'comments.user'],
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    await this.assertTicketReadAccess(ticket, viewerId, viewerRole);
    // Strip internal notes for regular users — they should never see staff-only comments
    if (viewerRole === UserRole.USER && ticket.comments) {
      (ticket as any).comments = ticket.comments.filter((c: any) => !c.isInternal);
    }
    
    // Add SLA indicators
    let isOverdue = false;
    let isNearingSLA = false;
    if (ticket.slaDeadline) {
      const now = new Date();
      const deadline = new Date(ticket.slaDeadline);
      const createdAt = new Date(ticket.createdAt);
      const totalSlaMs = deadline.getTime() - createdAt.getTime();
      const fortyPercentSlaMs = totalSlaMs * 0.40;

      if (now > deadline) {
        isOverdue = true;
      } else if (deadline.getTime() - now.getTime() <= fortyPercentSlaMs) {
        isNearingSLA = true;
      }
    }
    return Object.assign(ticket, { isOverdue, isNearingSLA });
  }

  // --- Update --------------------------------------------------------------

  async updateTicket(
    id: string,
    dto: UpdateTicketDto,
    actorId: number,
    actorRole: UserRole,
  ): Promise<Ticket> {
    const ticket = await this.getTicketById(id, actorRole, actorId);
    const latestEscalation = await this.escalationRepo.findOne({
      where: { ticketId: id },
      order: { createdAt: 'DESC' },
    });
    const acceptedEscalation = latestEscalation?.status === EscalationStatus.ACCEPTED
      ? latestEscalation
      : null;

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
        const savedClosed = await this.ticketRepo.save(ticket);
        this.logEvent(savedClosed.id, 'closed', actorId).catch(() => {});
        if (ticket.assignedTo?.email) {
          this.emailService.sendTicketClosedOrRatedEmailToTechnician({
            ticketId: savedClosed.id,
            ticketNumber: savedClosed.ticketNumber,
            subject: savedClosed.subject,
            technicianName: [ticket.assignedTo.firstName, ticket.assignedTo.lastName].filter(Boolean).join(' ') || ticket.assignedTo.email,
            technicianEmail: ticket.assignedTo.email,
            action: 'closed',
          }).catch(() => {});
        }
        return savedClosed;
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

    if (dto.ticketType) {
      const isSettingsFocal = this.roleCapSvc.isTicketSettingsFocal(actorRole as string);
      const isAssigned = ticket.assignedToId === actorId;
      if (!isSettingsFocal && !isAssigned) {
        throw new ForbiddenException('You do not have permission to change the ticket type.');
      }
      ticket.ticketType = dto.ticketType;
    }

    if (dto.issueTypeId !== undefined) {
      if (!dto.issueTypeId) {
        ticket.issueTypeId = null;
        ticket.issueType = 'other';
      } else {
        const issueType = await this.issueTypeRepo.findOne({
          where: { id: dto.issueTypeId, is_deleted: false, is_active: true },
        });
        if (!issueType) {
          throw new BadRequestException('Selected issue type is invalid or inactive.');
        }
        ticket.issueTypeId = issueType.id;
        ticket.issueType = issueType.key;
      }
    }

    // Priority changes allowed for all technician-level roles and above
    if (dto.priority !== undefined) {
      if (!this.roleCapSvc.canChangePriority(actorRole as string)) {
        throw new ForbiddenException('Only technicians and above can change ticket priority.');
      }
      ticket.priority = dto.priority;
    }

    if (dto.status) {
      if (acceptedEscalation) {
        const isEscalationAdmin =
          actorRole === UserRole.SUPER_ADMIN ||
          actorRole === UserRole.SECTION_HEAD ||
          actorRole === UserRole.COMPLIANCE_OFFICER;
        const isAcceptedFocal = acceptedEscalation.escalatedToId === actorId;
        if (!isEscalationAdmin && !isAcceptedFocal) {
          throw new ForbiddenException(
            'This ticket has an accepted escalation. Only the accepting focal, compliance officer, section head, or super admin can change status.',
          );
        }
      } else {
        // Enforce that only admins or the assigned technician can update status
        const isStatusAdmin =
          actorRole === UserRole.SUPER_ADMIN ||
          actorRole === UserRole.SECTION_HEAD ||
          actorRole === UserRole.COMPLIANCE_OFFICER ||
          this.roleCapSvc.isSeniorAuthority(actorRole as string);

        if (!isStatusAdmin && ticket.assignedToId !== actorId) {
          throw new ForbiddenException('You can only update the status of tickets explicitly assigned to you.');
        }
      }

      // QA #4/#3/#6: Full status transition matrix enforcement
      const isSeniorAuthority = this.roleCapSvc.isSeniorAuthority(actorRole as string);

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
        // QA: When transitioning back to OPEN, remove the assigned technician
        if (dto.status === TicketStatus.OPEN) {
          ticket.assignedToId = null;

          // QA: if there is an available PRESENT technician, auto-assign immediately
          const today = new Date().toISOString().slice(0, 10);
          const isOfficeDayToday = await this.attendanceService.isOfficeDay(today);
          if (ticket.ticketType === TicketType.PANTAWID_ICT_SUPPORT || isOfficeDayToday) {
            const presentTechs = await this.attendanceService.getPresentTechnicians(ticket.ticketType, today);

const eligibleTechs = ticket.ticketType === TicketType.PANTAWID_ICT_SUPPORT
            ? presentTechs
            : presentTechs.filter(t => !this.roleCapSvc.isSeniorTech(t.role));

            // Pick first eligible tech with zero active tickets
            for (const tech of eligibleTechs) {
              const openCount = await this.ticketRepo.count({
                where: [
                  { assignedToId: tech.id, status: TicketStatus.OPEN },
                  { assignedToId: tech.id, status: TicketStatus.ASSIGNED },
                  { assignedToId: tech.id, status: TicketStatus.IN_PROGRESS },
                ],
              });
              if (openCount === 0) {
                ticket.assignedToId = tech.id;
                ticket.status = TicketStatus.ASSIGNED;
                break;
              }
            }
          }
        }
        if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
          ticket.resolvedAt = new Date();
        }
      }
    }
    if (dto.resolutionNotes !== undefined) ticket.resolutionNotes = dto.resolutionNotes;
    if (dto.resolutionSteps !== undefined) ticket.resolutionSteps = dto.resolutionSteps?.trim() || null;
    if (dto.resolutionDate !== undefined) {
      if (!dto.resolutionDate) {
        ticket.resolutionDate = null;
      } else {
        const parsed = new Date(dto.resolutionDate);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException('resolutionDate must be a valid ISO date string.');
        }
        ticket.resolutionDate = parsed;
      }
    }

    const saved = await this.ticketRepo.save(ticket);

    // Log status/priority change event
    if (dto.status) {
      this.logEvent(saved.id, 'status_changed', actorId, {
        to: dto.status,
        resolutionNotes: dto.resolutionNotes ?? undefined,
      }).catch(() => {});

      if (dto.status === TicketStatus.RESOLVED && ticket.requester?.email) {
        this.emailService.sendTicketResolvedEmailToRequester({
          ticketId: saved.id,
          ticketNumber: saved.ticketNumber,
          subject: saved.subject,
          requesterName: [ticket.requester.firstName, ticket.requester.lastName].filter(Boolean).join(' ') || ticket.requester.email,
          requesterEmail: ticket.requester.email,
          technicianName: ticket.assignedTo
            ? ([ticket.assignedTo.firstName, ticket.assignedTo.lastName].filter(Boolean).join(' ') || ticket.assignedTo.email)
            : undefined,
        }).catch(() => {});
      }

      if (dto.status === TicketStatus.CLOSED && ticket.assignedTo?.email) {
        this.emailService.sendTicketClosedOrRatedEmailToTechnician({
          ticketId: saved.id,
          ticketNumber: saved.ticketNumber,
          subject: saved.subject,
          technicianName: [ticket.assignedTo.firstName, ticket.assignedTo.lastName].filter(Boolean).join(' ') || ticket.assignedTo.email,
          technicianEmail: ticket.assignedTo.email,
          action: 'closed',
        }).catch(() => {});
      }
    }

    // QA #1/#2: On RESOLVED, auto-assign next OPEN ticket — only for non-senior techs
    // Bug fix: removed ticketType restriction so cross-type tickets are considered;
    // also verifies technician is available (not absent) before assigning.
    if (dto.status === TicketStatus.RESOLVED && saved.assignedToId) {
      try {
        const resolvedByTech = await this.userRepo.findOne({ where: { id: saved.assignedToId } });
        const isSeniorTech = resolvedByTech && this.roleCapSvc.isSeniorTech(resolvedByTech.role);

        if (!isSeniorTech) {
          // Check technician is available today before assigning
          const today = new Date().toISOString().slice(0, 10);
          const absentRow = await this.dataSource
            .createQueryBuilder()
            .select('ta.user_id', 'userId')
            .from('attendance', 'ta')
            .where('ta.date = :today', { today })
            .andWhere('ta.user_id = :uid', { uid: saved.assignedToId })
            .andWhere("ta.status IN ('absent', 'out_of_office')")
            .getRawOne();

          if (!absentRow) {
            // Find next oldest unassigned open ticket — no ticketType restriction (cross-type support)
            // Fix: ensure the ticket requester is not the technician being assigned
            const nextTicket = await this.ticketRepo
              .createQueryBuilder('t')
              .where('t.status = :status', { status: TicketStatus.OPEN })
              .andWhere('t.assignedToId IS NULL')
              .andWhere('t.requesterId != :assignedToId', { assignedToId: saved.assignedToId })
              .orderBy('t.createdAt', 'ASC')
              .getOne();
            if (nextTicket) {
              nextTicket.assignedToId = saved.assignedToId;
              nextTicket.status = TicketStatus.ASSIGNED;

              if (nextTicket.categoryId) {
                const cat = await this.settingsService.getCategoryById(nextTicket.categoryId).catch(() => null);
                if (cat?.slaHours) {
                  const deadline = new Date();
                  deadline.setHours(deadline.getHours() + cat.slaHours);
                  nextTicket.slaDeadline = deadline;
                }
              }

              await this.ticketRepo.save(nextTicket);

              this.logEvent(nextTicket.id, 'auto_assigned', null, {
                technicianId: resolvedByTech!.id,
                technicianName: [resolvedByTech!.firstName, resolvedByTech!.lastName].filter(Boolean).join(' ') || resolvedByTech!.email,
              }).catch(() => {});

              this.logger.log(
                `Auto-reassign on resolve: ticket ${nextTicket.ticketNumber} (${nextTicket.ticketType}) → technician #${saved.assignedToId}`,
              );
            } else {
              this.logger.log(`Auto-reassign on resolve: no open unassigned tickets available for technician #${saved.assignedToId}`);
            }
          } else {
            this.logger.log(`Auto-reassign on resolve: technician #${saved.assignedToId} is absent today — skipping`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Auto-reassign on resolve failed (non-fatal): ${err?.message}`);
      }
    }

    return saved;
  }

  async assignTicket(id: string, dto: AssignTicketDto, actorRole: UserRole, actorId?: number): Promise<Ticket> {
    if (!this.roleCapSvc.canAssignTickets(actorRole as string)) {
      throw new ForbiddenException('Only admins, focal persons, and technicians can assign tickets.');
    }

    const ticket = await this.getTicketById(id, actorRole, actorId);
    const latestEscalation = await this.escalationRepo.findOne({
      where: { ticketId: id },
      order: { createdAt: 'DESC' },
    });
    const acceptedEscalation = latestEscalation?.status === EscalationStatus.ACCEPTED
      ? latestEscalation
      : null;

    // Duplicate, Resolved, and Closed tickets are terminal – assignment is not allowed
    if (ticket.status === TicketStatus.DUPLICATE) {
      throw new ForbiddenException('Cannot assign a technician to a ticket that is marked as Duplicate.');
    }
    if ([TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status as TicketStatus)) {
      throw new ForbiddenException('Resolved or closed tickets cannot be reassigned.');
    }

    // A ticket cannot be assigned to its requester or reporter
    if (dto.assignedToId === ticket.requesterId || dto.assignedToId === ticket.createdById) {
      throw new ForbiddenException('A ticket cannot be assigned to the person who requested or reported it.');
    }

    const technician = await this.userRepo.findOne({ where: { id: dto.assignedToId } });
    if (!technician) throw new NotFoundException('Technician not found');

    // Once an escalation is accepted, only CO/SH/super_admin may reassign,
    // and only to another configured escalation focal.
    if (acceptedEscalation) {
      const isEscalationAdmin =
        actorRole === UserRole.SUPER_ADMIN ||
        actorRole === UserRole.SECTION_HEAD ||
        actorRole === UserRole.COMPLIANCE_OFFICER;
      if (!isEscalationAdmin) {
        throw new ForbiddenException(
          'This ticket has an accepted escalation. Only compliance officer, section head, or super admin can reassign it.',
        );
      }

      const focals = await this.escalationFocalRepo.find();
      const allowedRoles = focals
        .filter((f) => f.ticketType === ticket.ticketType || f.ticketType === 'all')
        .map((f) => f.roleValue);
      if (allowedRoles.length > 0 && !allowedRoles.includes(String(technician.id))) {
        throw new ForbiddenException(
          'During an accepted escalation, reassignment is limited to configured escalation focal users for this ticket type.',
        );
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const attendanceRow = await this.dataSource
      .createQueryBuilder()
      .select('ta.status', 'status')
      .from('attendance', 'ta')
      .where('ta.user_id = :userId', { userId: dto.assignedToId })
      .andWhere('ta.date = :today', { today })
      .getRawOne<{ status?: string }>();
    if (attendanceRow?.status === 'absent' || attendanceRow?.status === 'out_of_office') {
      throw new BadRequestException('Selected technician is not available today and cannot be assigned tickets.');
    }

    // If the actor has ticketMainFocal=true they are empowered to re-assign freely (skip busy guard)
    let actorIsMainFocal = false;
    if (actorId) {
      const actorUser = await this.userRepo.findOne({ where: { id: actorId } });
      actorIsMainFocal = actorUser?.ticketMainFocal === true;
    }
    const bypassBusyGuard = actorIsMainFocal || actorRole === UserRole.SUPER_ADMIN ||
      actorRole === UserRole.SECTION_HEAD || this.roleCapSvc.isFocal(actorRole as string);

    // Guard: lower-level techs can only escalate to focal-level technicians
    const lowerLevelRoles: UserRole[] = [UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR];
    if (lowerLevelRoles.includes(actorRole) && !this.roleCapSvc.isFocal(technician.role as string)) {
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
      ticketId: assigned.id,
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
    const ticket = await this.getTicketById(id, viewerRole, viewerId);
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
    const ticket = await this.getTicketById(ticketId, actorRole, actorId);

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
    return savedComment;
  }

  // --- Client Satisfaction ------------------------------------------------

  async submitSatisfaction(
    id: string,
    dto: SubmitSatisfactionDto,
    requesterId: number,
  ): Promise<Ticket> {
    const ticket = await this.getTicketById(id, UserRole.USER, requesterId);

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
    ticket.status = TicketStatus.CLOSED;
    const saved = await this.ticketRepo.save(ticket);
    this.logEvent(saved.id, 'closed', requesterId).catch(() => {});
    this.logEvent(saved.id, 'rated', requesterId, { rating: saved.satisfactionRating }).catch(() => {});

    if (ticket.assignedTo?.email) {
      this.emailService.sendTicketClosedOrRatedEmailToTechnician({
        ticketId: saved.id,
        ticketNumber: saved.ticketNumber,
        subject: saved.subject,
        technicianName: [ticket.assignedTo.firstName, ticket.assignedTo.lastName].filter(Boolean).join(' ') || ticket.assignedTo.email,
        technicianEmail: ticket.assignedTo.email,
        action: 'rated',
        rating: saved.satisfactionRating,
      }).catch(() => {});
    }

    return saved;
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

  async getRatingsReport(filters: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    technicianId?: number;
    ticketType?: string;
  }): Promise<{
    byDay: { date: string; avgRating: number }[];
    byWeek: { week: string; avgRating: number }[];
    byTicket: any[];
    byTechnician: Record<string, { average: number, count: number }>;
    summary: { average: number, count: number };
  }> {
    const qb = this.ticketRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .where('t.satisfactionRating IS NOT NULL');

    if (filters.year) {
      qb.andWhere('YEAR(t.satisfactionSubmittedAt) = :year', { year: filters.year });
    }
    if (filters.month) {
      qb.andWhere('MONTH(t.satisfactionSubmittedAt) = :month', { month: filters.month });
    }
    if (filters.quarter) {
      qb.andWhere('QUARTER(t.satisfactionSubmittedAt) = :quarter', { quarter: filters.quarter });
    }
    if (filters.semester) {
      if (filters.semester === 1) {
        qb.andWhere('MONTH(t.satisfactionSubmittedAt) BETWEEN 1 AND 6');
      } else {
        qb.andWhere('MONTH(t.satisfactionSubmittedAt) BETWEEN 7 AND 12');
      }
    }
    if (filters.technicianId) {
      qb.andWhere('t.assignedToId = :techId', { techId: filters.technicianId });
    }
    if (filters.ticketType) {
      qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
    }

    const tickets = await qb.orderBy('t.satisfactionSubmittedAt', 'DESC').getMany();

    const byTicket = tickets.map(t => ({
      ticketId: t.id,
      ticketNumber: t.ticketNumber,
      rating: t.satisfactionRating,
      comment: t.satisfactionComment,
      formData: t.satisfactionFormData,
      submittedAt: t.satisfactionSubmittedAt,
      technicianId: t.assignedTo?.id,
      technicianName: t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Unknown'
    }));

    const byTechnician: Record<string, { total: number, count: number }> = {};
    let totalSum = 0;
    
    for (const t of tickets) {
      const techName = t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}`.trim() : 'Unknown';
      if (!byTechnician[techName]) {
        byTechnician[techName] = { total: 0, count: 0 };
      }
      byTechnician[techName].total += t.satisfactionRating!;
      byTechnician[techName].count += 1;
      totalSum += t.satisfactionRating!;
    }

    const technicianAverages: Record<string, { average: number, count: number }> = {};
    for (const [tech, data] of Object.entries(byTechnician)) {
      technicianAverages[tech] = {
        average: Math.round((data.total / data.count) * 10) / 10,
        count: data.count
      };
    }

    const byDayMap: Record<string, { total: number, count: number }> = {};
    const byWeekMap: Record<string, { total: number, count: number }> = {};
    for (const t of tickets) {
      if (!t.satisfactionSubmittedAt) continue;
      const dateStr = new Date(t.satisfactionSubmittedAt).toISOString().slice(0, 10);
      if (!byDayMap[dateStr]) byDayMap[dateStr] = { total: 0, count: 0 };
      byDayMap[dateStr].total += t.satisfactionRating!;
      byDayMap[dateStr].count += 1;

      // Week calculation
      const d = new Date(t.satisfactionSubmittedAt);
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const weekStr = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
      if (!byWeekMap[weekStr]) byWeekMap[weekStr] = { total: 0, count: 0 };
      byWeekMap[weekStr].total += t.satisfactionRating!;
      byWeekMap[weekStr].count += 1;
    }
    const byDay = Object.keys(byDayMap).sort().map(date => ({
      date,
      avgRating: Math.round((byDayMap[date].total / byDayMap[date].count) * 10) / 10
    }));
    const byWeek = Object.keys(byWeekMap).sort().map(week => ({
      week,
      avgRating: Math.round((byWeekMap[week].total / byWeekMap[week].count) * 10) / 10
    }));

    return {
      byDay,
      byWeek,
      byTicket,
      byTechnician: technicianAverages,
      summary: {
        average: tickets.length > 0 ? Math.round((totalSum / tickets.length) * 10) / 10 : 0,
        count: tickets.length
      }
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
      else if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) {
        if (t.status === TicketStatus.RESOLVED) resolved++;
        if (t.status === TicketStatus.CLOSED) closed++;
        needsSatisfaction++;
        if (!t.satisfactionSubmittedAt) pendingSatisfactionTickets.push(t);
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

  async getSlaSummary(viewerId?: number, viewerRole?: UserRole): Promise<{
    totalWithSla: number;
    activeWithSla: number;
    overdueActive: number;
    dueToday: number;
    breachedResolved: number;
    complianceRate: number;
  }> {
    const activeStatuses = [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.FREEZE];

    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .where('t.slaDeadline IS NOT NULL');

    if (viewerRole === UserRole.USER) {
      qb.andWhere('t.requesterId = :viewerId', { viewerId });
    } else if (viewerRole && !this.canViewAllTicketsInTicketing(viewerRole as string)) {
      qb.andWhere('(t.requesterId = :viewerId OR t.assignedToId = :viewerId)', { viewerId });
    }

    const tickets = await qb.getMany();
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let activeWithSla = 0;
    let overdueActive = 0;
    let dueToday = 0;
    let breachedResolved = 0;

    for (const t of tickets) {
      if (!t.slaDeadline) continue;

      const deadline = new Date(t.slaDeadline);
      const isActive = activeStatuses.includes(t.status as TicketStatus);
      if (isActive) {
        activeWithSla++;
        if (deadline < now) overdueActive++;
        if (deadline >= startOfDay && deadline <= endOfDay) dueToday++;
      }

      if ((t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) && t.resolvedAt && deadline < t.resolvedAt) {
        breachedResolved++;
      }
    }

    const complianceRate = activeWithSla > 0
      ? Math.max(0, Math.round(((activeWithSla - overdueActive) / activeWithSla) * 100))
      : 100;

    return {
      totalWithSla: tickets.length,
      activeWithSla,
      overdueActive,
      dueToday,
      breachedResolved,
      complianceRate,
    };
  }

  /** Monthly stats for tickets assigned to a specific technician */
  async getTechAssignedStats(techId: number, year: number, month: number): Promise<{
    total: number;
    assigned: number;
    inProgress: number;
    resolved: number;
    closed: number;
    ratedCount: number;
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

    let assigned = 0, inProgress = 0, resolved = 0, closed = 0;
    let totalSat = 0, countSat = 0;

    for (const t of tickets) {
      if (t.status === TicketStatus.ASSIGNED) assigned++;
      else if (t.status === TicketStatus.IN_PROGRESS) inProgress++;
      else if (t.status === TicketStatus.RESOLVED) resolved++;
      else if (t.status === TicketStatus.CLOSED) closed++;
      if (t.satisfactionRating != null) {
        totalSat += t.satisfactionRating;
        countSat++;
      }
    }

    return {
      total: tickets.length,
      assigned,
      inProgress,
      resolved,
      closed,
      ratedCount: countSat,
      satisfactionAvg: countSat > 0 ? Math.round((totalSat / countSat) * 10) / 10 : null,
    };
  }

  async getTechnicianAvailability(): Promise<Array<{ id: number; email: string; firstName: string; lastName: string; role: string; openCount: number; attendanceStatus: string | null; isUnavailable: boolean }>> {
    // Fetch all active users except standard 'USER' role
    const technicians = await this.userRepo.find({
      where: {
        active: true,
        role: Not(UserRole.USER),
      },
    });

    // Read attendance for today so assignment UI can hide unavailable technicians.
    const today = new Date().toISOString().slice(0, 10);
    const attendanceRows = await this.dataSource
      .createQueryBuilder()
      .select('ta.user_id', 'userId')
      .addSelect('ta.status', 'status')
      .from('attendance', 'ta')
      .where('ta.date = :today', { today })
      .getRawMany();
    const attendanceMap = new Map<number, string>(attendanceRows.map((r) => [Number(r.userId), String(r.status)]));
    const unavailableStatuses = new Set(['absent', 'out_of_office']);

    // Bulk fetch open ticket counts
    const openCountsRaw = await this.ticketRepo
      .createQueryBuilder('t')
      .select('t.assignedToId', 'techId')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.status NOT IN (:...closed)', {
        closed: [TicketStatus.CLOSED, TicketStatus.DUPLICATE],
      })
      .andWhere('t.assignedToId IS NOT NULL')
      .groupBy('t.assignedToId')
      .getRawMany();
    const countMap = new Map<number, number>(openCountsRaw.map(r => [Number(r.techId), Number(r.count)]));

    const results = [];
    for (const tech of technicians) {
      // Skip absent / out-of-office technicians — they cannot be assigned
      const attendanceStatus = attendanceMap.get(tech.id) ?? null;
      const isUnavailable = attendanceStatus ? unavailableStatuses.has(attendanceStatus) : false;
      if (isUnavailable) continue;

      results.push({
        id: tech.id,
        email: tech.email,
        firstName: tech.firstName,
        lastName: tech.lastName,
        role: tech.role,
        openCount: countMap.get(tech.id) ?? 0,
        attendanceStatus,
        isUnavailable,
      });
    }
    return results;
  }

  /** Returns all non-closed, non-duplicate tickets for a given requester (used in Duplicate picker) */
  async getOpenTicketsForRequester(
    requesterId: number,
    viewerId?: number,
    viewerRole?: UserRole,
  ): Promise<Ticket[]> {
    if (viewerRole && viewerId && !this.canViewAllTicketsInTicketing(viewerRole as string) && viewerId !== requesterId) {
      throw new ForbiddenException('You can only view open tickets for your own requester account.');
    }

    return this.ticketRepo
      .createQueryBuilder('t')
      .where('t.requesterId = :rid', { rid: requesterId })
      .andWhere('t.status NOT IN (:...terminal)', {
        terminal: [TicketStatus.CLOSED, TicketStatus.DUPLICATE],
      })
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }

  /**
   * QA F1: When a technician logs in, auto-assign any unassigned OPEN tickets
   * that belong to their ticket type, following the same rules as createTicket().
   * This is fire-and-forget — called from AuthService after successful login.
   */
  async assignPendingTicketsOnLogin(techId: number): Promise<void> {
    try {
      const tech = await this.userRepo.findOne({ where: { id: techId } });
      if (!tech) return;

      // Determine which ticket types this technician handles
      const roleDefRows = await this.dataSource.query('SELECT technician_type as technicianType FROM role_definitions WHERE value = ?', [tech.role]);
      let ticketType: string | null = roleDefRows[0]?.technicianType || null;

      if (!ticketType) {
        const DESKTOP_ROLES: string[] = [UserRole.DESKTOP_JR];
        const IT_ROLES: string[] = [UserRole.IT_SUPPORT_JR];
        const PANTAWID_ROLES: string[] = [UserRole.PANTAWID_ICT];
        if (DESKTOP_ROLES.includes(tech.role)) ticketType = 'desktop_support';
        else if (IT_ROLES.includes(tech.role)) ticketType = 'it_support';
        else if (PANTAWID_ROLES.includes(tech.role)) ticketType = 'pantawid_ict_support';
      }

      // Senior roles are excluded from auto-assignment per existing rule
      const SENIOR_EXCLUDED: string[] = [UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_SR];
      if (SENIOR_EXCLUDED.includes(tech.role)) return;

      if (!ticketType) return;

      const today = new Date().toISOString().slice(0, 10);
      const isOfficeDayToday = await this.attendanceService.isOfficeDay(today);
      if (ticketType !== TicketType.PANTAWID_ICT_SUPPORT && !isOfficeDayToday) return;

      // Guard: tech must be present (attendance check)
      const available = await this.attendanceService.getPresentTechnicians(ticketType, today);
      const isPresent = available.some(t => t.id === techId);
      if (!isPresent) return;

      // Guard: tech must currently have zero active tickets
      const currentOpen = await this.ticketRepo
        .createQueryBuilder('t')
        .where('t.assignedToId = :id', { id: techId })
        .andWhere('t.status NOT IN (:...terminal)', {
          terminal: [TicketStatus.CLOSED, TicketStatus.DUPLICATE, TicketStatus.RESOLVED],
        })
        .getCount();
      if (currentOpen > 0) return;

      // Find the oldest unassigned OPEN ticket of the matching type
      // Fix: ensure the ticket requester is not the technician being assigned
      const pending = await this.ticketRepo
        .createQueryBuilder('t')
        .where('t.status = :status', { status: TicketStatus.OPEN })
        .andWhere('t.assignedToId IS NULL')
        .andWhere('t.ticketType = :type', { type: ticketType })
        .andWhere('t.requesterId != :techId', { techId })
        .orderBy('t.createdAt', 'ASC')
        .getOne();

      if (!pending) return;

      pending.assignedToId = techId;
      pending.status = TicketStatus.ASSIGNED;
      await this.ticketRepo.save(pending);

      this.logEvent(pending.id, 'auto_assigned', null, {
        technicianId: techId,
        technicianName: [tech.firstName, tech.lastName].filter(Boolean).join(' ') || tech.email,
        via: 'login_auto_assign',
      }).catch(() => {});

      this.emailService.sendTicketAssignedEmail({
        ticketId: pending.id,
        ticketNumber: pending.ticketNumber,
        subject: pending.subject,
        ticketType: pending.ticketType,
        priority: pending.priority,
        assignedToName: [tech.firstName, tech.lastName].filter(Boolean).join(' ') || tech.email,
        assignedToEmail: tech.email,
      } as any).catch(() => {});

      this.logger.log(
        `[Login Auto-Assign] Ticket ${pending.ticketNumber} → ${tech.email} on login`,
      );
    } catch (err: any) {
      this.logger.warn(`[Login Auto-Assign] Failed (non-fatal): ${err?.message}`);
    }
  }

  /**
   * Called when a technician is marked absent, out of office, or half day.
   * Auto-reassigns their assigned tickets to other available technicians.
   */
  async reassignUnavailableTechnicianTickets(techId: number): Promise<void> {
    try {
      const tickets = await this.ticketRepo.find({
        where: { assignedToId: techId, status: TicketStatus.ASSIGNED },
      });

      for (const ticket of tickets) {
        this.logger.log(`[Absence Reassign] Attempting to reassign ticket ${ticket.ticketNumber} from absent technician #${techId}`);
        // Nullify assignedTo so it acts like an open ticket for the auto assignment logic
        ticket.assignedToId = null as any;
        ticket.status = TicketStatus.OPEN;
        await this.ticketRepo.save(ticket);

        // Auto assign right away
        const today = new Date().toISOString().slice(0, 10);
        const isOfficeDayToday = await this.attendanceService.isOfficeDay(today);
        if (ticket.ticketType === TicketType.PANTAWID_ICT_SUPPORT || isOfficeDayToday) {
          const presentTechs = await this.attendanceService.getPresentTechnicians(ticket.ticketType, today);
          const eligibleTechs = ticket.ticketType === TicketType.PANTAWID_ICT_SUPPORT
            ? presentTechs
            : presentTechs.filter(t => !this.roleCapSvc.isSeniorTech(t.role));

          for (const tech of eligibleTechs) {
            const openCount = await this.ticketRepo.count({
              where: [
                { assignedToId: tech.id, status: TicketStatus.OPEN },
                { assignedToId: tech.id, status: TicketStatus.ASSIGNED },
                { assignedToId: tech.id, status: TicketStatus.IN_PROGRESS },
              ],
            });
            if (openCount === 0) {
              ticket.assignedToId = tech.id;
              ticket.status = TicketStatus.ASSIGNED;
              await this.ticketRepo.save(ticket);
              this.logEvent(ticket.id, 'auto_assigned', null, {
                technicianId: tech.id,
                technicianName: `${tech.firstName} ${tech.lastName}`.trim(),
                via: 'absence_reassign'
              }).catch(() => {});
              break;
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`[Absence Reassign] Failed for tech ${techId}: ${err?.message}`);
    }
  }

  // --- Report Technicians (period-filtered for dropdown) -----------------

  async getTechniciansByPeriod(filters: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    ticketType?: string;
  }): Promise<Array<{ id: number; firstName: string; lastName: string; role: string }>> {
    const now = new Date();
    const year = filters.year ?? now.getFullYear();

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

    const techRoles = [
      UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR,
      UserRole.PANTAWID_ICT,
      ...this.roleCapSvc.getRolesWhere('isFocal').map(r => r as UserRole),
    ];

    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.assignedToId', 'id')
      .where('t.assignedToId IS NOT NULL')
      .andWhere('t.createdAt >= :startDate', { startDate })
      .andWhere('t.createdAt <= :endDate', { endDate });

    if (filters.ticketType) {
      qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
    }

    const rows = await qb.getRawMany<{ id: number }>();
    if (!rows.length) return [];

    const ids = rows.map((r) => Number(r.id)).filter(Boolean);
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids })
      .andWhere('u.role IN (:...roles)', { roles: techRoles })
      .getMany();

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
    }));
  }

  // --- Ticket Reports (QA #11) --------------------------------------------

  async getTicketReports(filters: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    technicianId?: number;
    ticketType?: string;
    viewerId?: number;
    viewerRole?: string;
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
    const isTicketSettingsViewer = (filters.viewerRole === UserRole.SUPER_ADMIN)
      || this.roleCapSvc.isTicketSettingsFocal(filters.viewerRole || '');
    
    const isTechnician = filters.viewerRole && !isTicketSettingsViewer && [
      UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR
    ].includes(filters.viewerRole as UserRole);

    const requesterIdFilter = (!isTicketSettingsViewer && !isTechnician) ? filters.viewerId : undefined;
    const techIdFilter = isTechnician ? filters.viewerId : (isTicketSettingsViewer ? filters.technicianId : undefined);

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
      .where('t.createdAt >= :startDate', { startDate })
      .andWhere('t.createdAt <= :endDate', { endDate })
      .andWhere('t.status IN (:...statuses)', { statuses: [TicketStatus.CLOSED, TicketStatus.RESOLVED] });

    if (requesterIdFilter) {
      qb = qb.andWhere('t.requesterId = :requesterId', { requesterId: requesterIdFilter });
    }
    if (techIdFilter) {
      qb = qb.andWhere('t.assignedToId = :techId', { techId: techIdFilter });
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
    if (requesterIdFilter) totalQb = totalQb.andWhere('t.requesterId = :requesterId', { requesterId: requesterIdFilter });
    if (techIdFilter) totalQb = totalQb.andWhere('t.assignedToId = :techId', { techId: techIdFilter });
    if (filters.ticketType) totalQb = totalQb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
    const allTickets = await totalQb.getMany();
    const totalTickets = allTickets.length;

    if (tickets.length === 0 && allTickets.length === 0) {
      return { totalTickets, totalWithRating: 0, avgOverallRating: null, avgRatingByType: [], avgRatingByTechnician: [], totalEscalations: 0, acceptedEscalations: 0, returnedEscalations: 0 };
    }

    const ratedTickets = tickets.filter(t => t.satisfactionRating !== null);
    const totalWithRating = ratedTickets.length;

    // Overall average
    const overallSum = ratedTickets.reduce((s, t) => s + (t.satisfactionRating ?? 0), 0);
    const avgOverallRating = totalWithRating > 0 ? Math.round((overallSum / totalWithRating) * 10) / 10 : null;

    // Per type (count total ALL TICKETS, but avg based on rated)
    const byTypeMap = new Map<string, { sum: number; ratedCount: number; totalCount: number }>();
    for (const t of allTickets) {
      const key = t.ticketType;
      const cur = byTypeMap.get(key) ?? { sum: 0, ratedCount: 0, totalCount: 0 };
      if (t.satisfactionRating !== null) {
        byTypeMap.set(key, { sum: cur.sum + t.satisfactionRating, ratedCount: cur.ratedCount + 1, totalCount: cur.totalCount + 1 });
      } else {
        byTypeMap.set(key, { ...cur, totalCount: cur.totalCount + 1 });
      }
    }
    const avgRatingByType = Array.from(byTypeMap.entries()).map(([type, { sum, ratedCount, totalCount }]) => ({
      type,
      avg: ratedCount > 0 ? Math.round((sum / ratedCount) * 10) / 10 : 0,
      count: totalCount,
      ratedCount,
    }));

    // Per technician
    const byTechMap = new Map<number, { name: string; sum: number; ratedCount: number; totalCount: number }>();
    for (const t of tickets) {
      if (!t.assignedToId) continue;
      const techName = t.assignedTo
        ? [t.assignedTo.firstName, t.assignedTo.lastName].filter(Boolean).join(' ') || t.assignedTo.email
        : `Tech #${t.assignedToId}`;
      const cur = byTechMap.get(t.assignedToId) ?? { name: techName, sum: 0, ratedCount: 0, totalCount: 0 };
      if (t.satisfactionRating !== null) {
        byTechMap.set(t.assignedToId, { name: techName, sum: cur.sum + t.satisfactionRating, ratedCount: cur.ratedCount + 1, totalCount: cur.totalCount + 1 });
      } else {
        byTechMap.set(t.assignedToId, { ...cur, totalCount: cur.totalCount + 1 });
      }
    }
    const avgRatingByTechnician = Array.from(byTechMap.entries()).map(([techId, { name, sum, ratedCount, totalCount }]) => ({
      techId,
      techName: name,
      avg: ratedCount > 0 ? Math.round((sum / ratedCount) * 10) / 10 : 0,
      count: totalCount,
      ratedCount,
    })).sort((a, b) => b.count - a.count);

    // Escalation counts in the same date range
    let escQb = this.escalationRepo
      .createQueryBuilder('e')
      .innerJoin('tickets', 't', 't.id = e.ticket_id')
      .where('t.created_at >= :startDate', { startDate })
      .andWhere('t.created_at <= :endDate', { endDate });
    if (requesterIdFilter) {
      escQb = escQb.andWhere('t.requester_id = :requesterId', { requesterId: requesterIdFilter });
    }
    if (filters.ticketType) {
      escQb = escQb.andWhere('t.ticket_type = :ticketType', { ticketType: filters.ticketType });
    }
    const totalEscalations = await escQb.getCount();
    const acceptedEscalations = await escQb.clone().andWhere('e.status = :s', { s: EscalationStatus.ACCEPTED }).getCount();
    const returnedEscalations = await escQb.clone().andWhere('e.status = :s', { s: EscalationStatus.RETURNED }).getCount();

    return { totalTickets, totalWithRating, avgOverallRating, avgRatingByType, avgRatingByTechnician, totalEscalations, acceptedEscalations, returnedEscalations };
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
    if (!this.roleCapSvc.canEscalateTickets(actorRole as string)) {
      throw new ForbiddenException('Your role is not allowed to escalate tickets.');
    }

    const ticket = await this.getTicketById(ticketId, actorRole, actorId);

    const latestEscalation = await this.escalationRepo.findOne({
      where: { ticketId },
      order: { createdAt: 'DESC' },
    });
    if (latestEscalation && latestEscalation.status === EscalationStatus.PENDING) {
      throw new BadRequestException(
        'This ticket already has a pending escalation. You cannot escalate again until it is accepted or returned.',
      );
    }

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

    if (allowedRoles.length > 0 && !allowedRoles.includes(String(focal.id))) {
      throw new ForbiddenException('The selected user is not designated as an escalation focal for this ticket type.');
    }

    // QA #9: Verify that the selected focal is actually PRESENT today
    const today = new Date().toISOString().slice(0, 10);
    const presentFocals = await this.attendanceService.getPresentTechnicians('all', today);
    const isPresent = presentFocals.some(t => t.id === focal.id);
    if (!isPresent) {
      throw new BadRequestException('The selected escalation focal is not currently marked as present or available today.');
    }

    // Save proof photos to disk
    const savedPaths: string[] = [];
    if (proofFiles && proofFiles.length > 0) {
      for (const f of proofFiles) {
        if (!f.mimetype.startsWith('image/')) throw new BadRequestException('Only image files are allowed for proof photos.');
      }
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
    await this.escalationRepo.save(escalation);

    // Auto-transition ticket to in_progress when escalation is accepted
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (ticket && ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      const previousStatus = ticket.status;
      ticket.status = TicketStatus.IN_PROGRESS;
      await this.ticketRepo.save(ticket);
      this.logEvent(ticketId, 'status_changed', actorId, { from: previousStatus, to: TicketStatus.IN_PROGRESS, reason: 'escalation_accepted' }).catch(() => {});
    }
    this.logEvent(ticketId, 'escalation_accepted', actorId).catch(() => {});

    return escalation;
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
  async getEscalations(ticketId: string, viewerId?: number, viewerRole?: UserRole): Promise<TicketEscalation[]> {
    await this.getTicketById(ticketId, viewerRole, viewerId);
    return this.escalationRepo.find({
      where: { ticketId },
      relations: ['escalatedBy', 'escalatedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async ensureProofFileReadable(
    ticketId: string,
    filename: string,
    viewerId?: number,
    viewerRole?: UserRole,
  ): Promise<{ root: string; safeFilename: string }> {
    await this.getTicketById(ticketId, viewerRole, viewerId);

    const safeFilename = path.basename(filename);
    const escalations = await this.escalationRepo.find({ where: { ticketId } });
    const proofPaths = escalations.flatMap((e) => e.proofFiles ?? []);
    const isReferenced = proofPaths.some((p) => path.basename(String(p)) === safeFilename);
    if (!isReferenced) {
      throw new NotFoundException('Proof file not found');
    }

    const safeTicketId = path.basename(ticketId);
    return {
      root: path.resolve(process.cwd(), 'storage', 'escalation-proofs', safeTicketId),
      safeFilename,
    };
  }

  /**
   * PATCH /tickets/:id/escalation/:eid/update-proof
   * Allows the escalating technician to supplement notes and/or proof photos on a
   * PENDING escalation they initiated.  Appends new files; does not overwrite existing ones.
   */
  async updateEscalationProof(
    ticketId: string,
    escalationId: string,
    dto: { notes?: string },
    proofFiles: Express.Multer.File[],
    actorId: number,
  ): Promise<TicketEscalation> {
    const escalation = await this.escalationRepo.findOne({
      where: { id: escalationId, ticketId },
      relations: ['escalatedBy', 'escalatedTo'],
    });
    if (!escalation) throw new NotFoundException('Escalation record not found.');
    if (escalation.escalatedById !== actorId) {
      throw new ForbiddenException('Only the technician who initiated the escalation may update it.');
    }
    if (escalation.status !== EscalationStatus.PENDING) {
      throw new BadRequestException('Only a pending escalation can be updated.');
    }

    if (dto.notes !== undefined) {
      escalation.notes = dto.notes.trim() || null;
    }

    if (proofFiles && proofFiles.length > 0) {
      for (const f of proofFiles) {
        if (!f.mimetype.startsWith('image/')) throw new BadRequestException('Only image files are allowed for proof photos.');
      }
      const dir = path.join(this.escalationStorageRoot(), ticketId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const savedPaths: string[] = [...(escalation.proofFiles ?? [])];
      for (const file of proofFiles) {
        const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const fullPath = path.join(dir, filename);
        fs.writeFileSync(fullPath, file.buffer);
        savedPaths.push(`escalation-proofs/${ticketId}/${filename}`);
      }
      escalation.proofFiles = savedPaths;
    }

    return this.escalationRepo.save(escalation);
  }
}