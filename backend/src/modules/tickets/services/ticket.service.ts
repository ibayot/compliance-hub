import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Transform } from 'class-transformer';

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
import { Brackets, DataSource, QueryRunner, Repository, Not, In, LessThan, MoreThanOrEqual } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Ticket, TicketType, TicketStatus, TicketPriority } from '../entities/ticket.entity';
import { TicketComment } from '../entities/ticket-comment.entity';
import { TicketIssueType } from '../entities/ticket-issue-type.entity';
import { TicketEvent } from '../entities/ticket-event.entity';
import { TicketEscalation, EscalationStatus } from '../entities/ticket-escalation.entity';
import { EscalationFocalConfig } from '../entities/escalation-focal-config.entity';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { TicketStatusJustification } from '../entities/ticket-status-justification.entity';
import { TicketNotification } from '../entities/ticket-notification.entity';
import { UserRole } from '../../shared/entities';
import { UsersHttpClient } from '../../../common/http-clients/users.http-client';
import { TicketSettingsService } from './ticket-settings.service';
import { AttendanceService } from './attendance.service';
import { EmailService, TicketEmailData } from './email.service';
import { SseService } from './sse.service';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { KnowledgeBaseService } from './knowledge-base.service';

// --- DTOs --------------------------------------------------------------------

export class CreateTicketDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  subject: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  description: string;
  @IsNotEmpty()
  @IsEnum(TicketType)
  @ApiProperty()
  ticketType: TicketType;
  @IsOptional()
  @IsEnum(TicketPriority)
  @ApiPropertyOptional()
  priority?: TicketPriority;
  /** Category UUID from ticket_categories */
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  categoryId?: string;
  /** Staff only: override the requester (for walk-ins / phone calls) */
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  requesterId?: number;
  /** Optional issue type reference from ticket_issue_types */
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  issueTypeId?: string;
}

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  subject?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;
  @IsOptional()
  @IsEnum(TicketStatus)
  @ApiPropertyOptional()
  status?: TicketStatus;
  @IsOptional()
  @IsEnum(TicketPriority)
  @ApiPropertyOptional()
  priority?: TicketPriority;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  resolutionNotes?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  resolutionSteps?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  resolutionDate?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  issueTypeId?: string | null;
  /** Required when status = DUPLICATE: UUID of the original ticket */
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  duplicateOfId?: string;
  @IsOptional()
  @IsEnum(TicketType)
  @ApiPropertyOptional()
  ticketType?: TicketType;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  generateKb?: boolean;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  categoryId?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  statusJustification?: string;
}

export class AssignTicketDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  assignedToId: number;
}

export class AddCommentDto {
  /** Alias accepted from frontend (content or comment) */
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  content?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  comment?: string;
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @ApiPropertyOptional()
  isInternal?: boolean;
}

export class CsatFormData {
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  consentGiven: boolean;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  unitSection: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  dateOfTransaction: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  clientFirstName: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  clientMiddleInitial?: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  clientLastName: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  suffix?: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  religion: string;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  age?: number;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  sex: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  contactNumber?: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  technicianName: string;
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  likert: Array<number | 'NA'>; // 9 items index 0-8
}

export class SubmitSatisfactionDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  rating?: number; // Legacy 1-5 star (used if formData absent)
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  comment?: string; // Legacy comment
  @IsOptional()
  @ApiPropertyOptional()
  formData?: CsatFormData; // New full CSAT form
}

export class EscalateTicketDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  escalatedToId: number;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notes?: string;
}

export class ReturnEscalationDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  returnReason: string;
}

// --- Service -----------------------------------------------------------------

@Injectable()
export class TicketService implements OnModuleInit {
  private readonly logger = new Logger(TicketService.name);

  private isDbBootstrapEnabled(): boolean {
    return String(process.env.DB_BOOTSTRAP ?? 'false').toLowerCase() === 'true';
  }

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private readonly commentRepo: Repository<TicketComment>,
    @InjectRepository(TicketIssueType)
    private readonly issueTypeRepo: Repository<TicketIssueType>,
    @InjectRepository(TicketEscalation)
    private readonly escalationRepo: Repository<TicketEscalation>,
    @InjectRepository(TicketingConfig)
    private readonly configRepo: Repository<TicketingConfig>,
    @InjectRepository(TicketStatusJustification)
    private readonly justificationRepo: Repository<TicketStatusJustification>,
    private readonly usersHttpClient: UsersHttpClient,
    @InjectRepository(TicketEvent)
    private readonly eventRepo: Repository<TicketEvent>,
    @InjectRepository(TicketNotification)
    private readonly notificationRepo: Repository<TicketNotification>,
    @InjectRepository(EscalationFocalConfig)
    private readonly escalationFocalRepo: Repository<EscalationFocalConfig>,
    private readonly dataSource: DataSource,
    private readonly settingsService: TicketSettingsService,
    private readonly attendanceService: AttendanceService,
    private readonly emailService: EmailService,
    private readonly roleCapSvc: RoleCapabilitiesService,
    private readonly kbService: KnowledgeBaseService,
    private readonly sseService: SseService,
    @Optional() private readonly eventBus?: EventBusService,
  ) { }

  /**
   * Returns the start of the current calendar week in Asia/Manila.
   * Weekly cap accounting uses the assignment timestamp, not current status.
   */
  private getManilaWeekStart(now = new Date()): Date {
    const dateText = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
    }).format(now);
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      weekday: 'short',
    }).format(now);
    const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
    const weekStart = new Date(`${dateText}T00:00:00+08:00`);
    weekStart.setTime(weekStart.getTime() - Math.max(dayIndex, 0) * 24 * 60 * 60 * 1000);
    return weekStart;
  }

  private async hasBreachedActiveTicket(technicianId: number): Promise<boolean> {
    const now = Date.now();
    const activeTickets = (await this.ticketRepo.find({
      where: [
        { assignedToId: technicianId, status: TicketStatus.ASSIGNED, isSlaWaiting: false },
        // IN_PROGRESS is authoritative; legacy queue flags must not hide a breach.
        { assignedToId: technicianId, status: TicketStatus.IN_PROGRESS },
      ],
    })) || [];

    return activeTickets.some(
      (ticket) => ticket.slaDeadline && new Date(ticket.slaDeadline).getTime() < now,
    );
  }
  private async getWeeklySlaLoad(technicianId: number): Promise<number> {
    const weekStart = this.getManilaWeekStart();
    const weeklyTickets = (await this.ticketRepo.find({
      where: {
        assignedToId: technicianId,
        lastAssignedAt: MoreThanOrEqual(weekStart),
      },
      relations: ['issueTypeConfig'],
    })) || [];

    return weeklyTickets.reduce(
      (total, ticket) => total + Number(ticket.issueTypeConfig?.slaHours || 24),
      0,
    );
  }
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
      this.eventBus.subscribe('office-day.changed', () => {
        this.recalculateActiveSlaDeadlines().catch((err) => {
          this.logger.warn(`SLA deadline recalculation failed: ${err?.message}`);
        });
      });

      this.eventBus.subscribe('attendance.unavailable', (payload: any) => {
        if (payload?.techId) {
          this.reassignUnavailableTechnicianTickets(payload.techId).catch(() => { });
        }
      });
      this.eventBus.subscribe('attendance.verified', (payload: any) => {
        if (payload?.userId) {
          this.assignPendingTicketsOnLogin(payload.userId).catch(() => { });
        }
      });
    }
  }

  private async runMigrations(): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const usersDb =
        process.env.USERS_DB_DATABASE ||
        (await this.resolveExistingSchemaName(
          qr,
          ['02_db_stg_compliance_hub_users', 'compliance_hub_users', 'ricms_users', 'rictms_users'],
          'compliance_hub_users',
        ));
      const complianceDb =
        process.env.COMPLIANCE_DB_DATABASE ||
        (await this.resolveExistingSchemaName(
          qr,
          ['compliance_hub', 'ricms_compliance', 'rictms_compliance'],
          'compliance_hub',
        ));

      // Schema DDL has been extracted to versioned migration files.
      // See backend/database/migrations/v0.0.50-service-ddl-extraction.sql.

      // ── Cross-DB compatibility views (re-created on every startup) ─────────
      // These are infrastructure config, not data mutations. They must be
      // re-applied on restart so TypeORM entity JOINs continue to work.

      await qr.query('DROP VIEW IF EXISTS attendance').catch(() => undefined);
      await qr.query('DROP TABLE IF EXISTS attendance').catch(() => undefined);
      await qr
        .query(`CREATE VIEW attendance AS SELECT * FROM \`${usersDb}\`.attendance`)
        .catch(() => undefined);

      await qr.query('DROP VIEW IF EXISTS users').catch(() => undefined);
      await qr.query('DROP TABLE IF EXISTS users').catch(() => undefined);
      await qr
        .query(`CREATE VIEW users AS SELECT * FROM \`${usersDb}\`.users`)
        .catch(() => undefined);

      await qr.query('DROP VIEW IF EXISTS units').catch(() => undefined);
      await qr.query('DROP TABLE IF EXISTS units').catch(() => undefined);
      await qr
        .query(`CREATE VIEW units AS SELECT * FROM \`${complianceDb}\`.units`)
        .catch(() => undefined);

      await qr.query('DROP VIEW IF EXISTS role_definitions').catch(() => undefined);
      await qr.query('DROP TABLE IF EXISTS role_definitions').catch(() => undefined);
      await qr
        .query(`CREATE VIEW role_definitions AS SELECT * FROM \`${usersDb}\`.role_definitions`)
        .catch(() => undefined);

      await qr.query('DROP VIEW IF EXISTS role_capabilities').catch(() => undefined);
      await qr
        .query(
          `CREATE OR REPLACE VIEW role_capabilities AS SELECT * FROM \`${usersDb}\`.role_capabilities`,
        )
        .catch(() => undefined);

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
    const rows = (await qr.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name IN (${quoted}) ORDER BY schema_name ASC LIMIT 1`,
    )) as Array<{ schema_name?: string }>;
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
      {
        key: 'printer_installation',
        name: 'Printer Installation/Configuration',
        type: 'desktop_support',
      },
      { key: 'printer_repair', name: 'Printer Repair', type: 'desktop_support' },
      { key: 'desktop_laptop_repair', name: 'Desktop/Laptop Repair', type: 'desktop_support' },
      // Pantawid ICT Support categories
      {
        key: 'pantawid_ict_support_general',
        name: 'Pantawid ICT Support',
        type: 'pantawid_ict_support',
      },
      { key: 'pantawid_device_issue', name: 'Pantawid Device Issue', type: 'pantawid_ict_support' },
      {
        key: 'pantawid_network_connectivity',
        name: 'Pantawid Network/Connectivity',
        type: 'pantawid_ict_support',
      },
      {
        key: 'pantawid_system_access',
        name: 'Pantawid System Access',
        type: 'pantawid_ict_support',
      },
    ];

    let inserted = 0;
    for (const c of cats) {
      // Only insert if key doesn't already exist (idempotent)
      const [existing] = await qr
        .query('SELECT COUNT(*) AS cnt FROM ticket_categories WHERE `key` = ?', [c.key])
        .catch(() => [{ cnt: 1 }]);
      if (Number(existing?.cnt) === 0) {
        await qr
          .query(
            `INSERT INTO ticket_categories (id, \`key\`, name, ticket_type, is_active, is_deleted, created_at, updated_at)
           VALUES (UUID(), ?, ?, ?, 1, 0, NOW(), NOW())`,
            [c.key, c.name, c.type],
          )
          .catch(() => undefined);
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
      const [existing] = await qr
        .query('SELECT COUNT(*) AS cnt FROM ticket_keyword_rules WHERE keyword = ?', [r.keyword])
        .catch(() => [{ cnt: 1 }]);
      if (Number(existing?.cnt) === 0) {
        await qr
          .query(
            `INSERT INTO ticket_keyword_rules (id, keyword, target_ticket_type, is_active, created_at, updated_at)
           VALUES (UUID(), ?, ?, 1, NOW(), NOW())`,
            [r.keyword, r.type],
          )
          .catch(() => undefined);
        inserted++;
      }
    }
    if (inserted > 0) this.logger.log(`Seeded ${inserted} default keyword rules`);
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
      this.sseService.emitTicketUpdated(ticketId);
    } catch (err: any) {
      this.logger.warn(`logEvent failed (non-fatal): ${err?.message}`);
    }
  }

  /** Return all events for a ticket, ordered chronologically, with actor info */

  async sendNotification(userIds: number[], ticketId: string, eventType: string, message: string) {
    if (!userIds || userIds.length === 0) return;
    try {
      const notifications = userIds.map(userId => this.notificationRepo.create({
        userId,
        ticketId,
        eventType,
        message,
      }));
      await this.notificationRepo.save(notifications);
      for (const notification of notifications) {
        this.sseService.emitNotificationCreated(notification.userId);
      }
      this.logger.log(`Created ${notifications.length} notifications for ticket ${ticketId}`);
    } catch (e) {
      this.logger.error("Failed to send notification: " + e.message);
    }
  }



  async getTicketEvents(
    ticketId: string,
    viewerId?: number,
    viewerRole?: UserRole,
  ): Promise<Array<TicketEvent & { actorName?: string }>> {
    await this.getTicketById(ticketId, viewerRole, viewerId);

    const events = await this.eventRepo
      .createQueryBuilder('e')

      .where('e.ticketId = :id', { id: ticketId })
      .orderBy('e.createdAt', 'DESC')
      .addOrderBy(
        "CASE WHEN e.eventType = 'created' THEN 0 WHEN e.eventType = 'auto_assigned' THEN 1 ELSE 2 END",
        'DESC',
      )
      .getMany();

    await this.enrichEventsWithUsers(events);

    return events.map((e) => ({
      ...e,
      meta: e.meta ? JSON.parse(e.meta) : null,
      actorName: e.actor
        ? [e.actor.first_name, e.actor.last_name].filter(Boolean).join(' ') || e.actor.email
        : e.eventType === 'auto_assigned'
          ? 'Automatic Ticket Assignment'
          : undefined,
    }));
  }

  private canViewAllTicketsInTicketing(role?: string): boolean {
    if (!role) return false;
    return this.roleCapSvc.isAllTickets(role);
  }

  private canViewEscalatedQueue(role?: string): boolean {
    if (!role) return false;
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

  private async assertTicketReadAccess(
    ticket: Ticket,
    viewerId?: number,
    viewerRole?: UserRole,
  ): Promise<void> {
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
    image?: Express.Multer.File,
  ): Promise<
    Ticket & { autoShifted?: boolean; autoAssigned?: boolean; noTechAvailable?: boolean }
  > {
    const requesterId = dto.requesterId ? dto.requesterId : callerId;

    const requester = await this.usersHttpClient.getUserById(requesterId);
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
        where: { id: issueTypeId, isDeleted: false, isActive: true },
      });
      if (!issueType) {
        throw new BadRequestException('Selected issue type is invalid or inactive.');
      }
      issueTypeKey = issueType.key;
    }

    // ── Auto-Shift based on keyword rules ─────────────────────────────────
    // The selected support type is passed to the matcher so duplicate rules
    // resolve to the closest support-type-specific category and issue type.
    try {
      const combinedText = dto.subject + ' ' + dto.description;
      const matchedRule = await this.settingsService.matchKeywordRules(combinedText, dto.ticketType);
      if (matchedRule) {
        ticketType = matchedRule.targetTicketType as TicketType;
        if (matchedRule.targetCategoryId) {
          categoryId = matchedRule.targetCategoryId;
        }
        if (matchedRule.targetIssueTypeId) {
          issueTypeId = matchedRule.targetIssueTypeId;
          if (matchedRule.targetIssueType) {
            issueTypeKey = matchedRule.targetIssueType.key;
          } else {
            const issueType = await this.issueTypeRepo.findOne({
              where: { id: matchedRule.targetIssueTypeId, isDeleted: false, isActive: true },
            });
            if (issueType) issueTypeKey = issueType.key;
          }
        }
        autoShifted = true;
        this.logger.log(
          'Auto-shift: keyword "' + matchedRule.keyword + '" -> type=' + ticketType +
          ', cat=' + categoryId + ', issueTypeId=' + issueTypeId,
        );
      }
    } catch (err: any) {
      this.logger.warn('Auto-shift failed (non-fatal): ' + err?.message);
    }

    if (!categoryId) {
      throw new BadRequestException('No matching category found. Please select an appropriate category');
    }

    // ── Auto-Assign based on attendance & workload ─────────────────────
    let assignedToId: number | null = null;
    let assignedTech: any = null;
    let noTechAvailable = false;
    let isSlaWaiting = false;
    let shouldStartInProgress = false;

    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const isOfficeDayToday = await this.attendanceService.isOfficeDay(today);

      // ── Unified Fallback Chain for Auto-Assignment ──
      let fallbackChain: string[] = [];
      if (ticketType === TicketType.IT_SUPPORT) {
        fallbackChain = [
          TicketType.IT_SUPPORT,
          TicketType.DESKTOP_SUPPORT,
          TicketType.PANTAWID_ICT_SUPPORT,
        ];
      } else if (ticketType === TicketType.DESKTOP_SUPPORT) {
        fallbackChain = [
          TicketType.DESKTOP_SUPPORT,
          TicketType.IT_SUPPORT,
          TicketType.PANTAWID_ICT_SUPPORT,
        ];
      } else if (ticketType === TicketType.PANTAWID_ICT_SUPPORT) {
        // Pantawid tries Pantawid technicians first, then any eligible technician.
        fallbackChain = [TicketType.PANTAWID_ICT_SUPPORT, 'all'];
      } else {
        fallbackChain = [ticketType];
      }

      for (const tType of fallbackChain) {
        // Pantawid is processed regardless of office days, others only if it is an office day
        if (tType !== TicketType.PANTAWID_ICT_SUPPORT && !isOfficeDayToday) {
          continue;
        }

        const availableTechs = await this.attendanceService.getPresentTechnicians(tType, today);

        if (availableTechs.length > 0) {
          // QA #2: Senior technicians are NOT eligible for auto-assignment
          // Fix: Ensure a ticket is never assigned to its own requester
          this.logger.log(`[Auto-assign] fallback=${tType} present=${availableTechs.length}`);

          const eligibleTechs = availableTechs.filter(
            (t) => !this.roleCapSvc.isSeniorTech(t.role) && t.id !== requesterId,
          );

          // Fetch Routing Configuration
          const config = await this.configRepo.findOne({ where: { id: 1 } });
          const assignmentStrategy = config?.assignmentStrategy || 'CURRENT_AUTO';
          const roundRobinCapHours = config?.roundRobinCapHours || 80;

          if (!config?.isFlagCeremonyPaused) {
            if (assignmentStrategy === 'CAPPED_ROUND_ROBIN') {
              // Capped Round-Robin Mode
              let minLastAssignedTime = Infinity;

              for (const tech of eligibleTechs) {
                // 1. Calculate Active SLA Load
                // Weekly cap: count SLA hours assigned during the current Manila week.
                const weeklySlaLoad = await this.getWeeklySlaLoad(tech.id);

                if (weeklySlaLoad < roundRobinCapHours) {
                  // 3. Find tech with oldest lastAssignedTime
                  const lastTicket = await this.ticketRepo.findOne({
                    where: { assignedToId: tech.id },
                    order: { lastAssignedAt: 'DESC' },
                  });

                  const techLastAssignedTime = lastTicket?.lastAssignedAt
                    ? lastTicket.lastAssignedAt.getTime()
                    : 0;

                  if (techLastAssignedTime < minLastAssignedTime) {
                    minLastAssignedTime = techLastAssignedTime;
                    assignedTech = tech;
                  }
                }
              }

              // Fallback: If ALL eligible techs are at max capacity, fallback to the one with the lowest load
              if (false && !assignedTech && eligibleTechs.length > 0) {
                let minLoad = Infinity;
                for (const tech of eligibleTechs) {
                  const openCount = await this.ticketRepo.count({
                    where: [
                      { assignedToId: tech.id, status: TicketStatus.ASSIGNED },
                      { assignedToId: tech.id, status: TicketStatus.IN_PROGRESS },
                    ],
                  });
                  if (openCount < minLoad) {
                    minLoad = openCount;
                    assignedTech = tech;
                  }
                }
              }
            } else {
              // CURRENT_AUTO Mode (Zero Active Tickets)
              let minCount = Infinity;
              for (const tech of eligibleTechs) {
                const openCount = await this.ticketRepo.count({
                  where: [
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
            }
          }

          if (assignedTech) {
            assignedToId = assignedTech.id;

            // Determine if tech is currently busy
            const activeTicketsCount = await this.ticketRepo.count({
              where: [
                { assignedToId: assignedTech.id, status: TicketStatus.ASSIGNED },
                { assignedToId: assignedTech.id, status: TicketStatus.IN_PROGRESS },
                { assignedToId: assignedTech.id, status: TicketStatus.PAUSE },
              ],
            });
            const hasBreachedTicket = await this.hasBreachedActiveTicket(assignedTech.id);
            shouldStartInProgress = activeTicketsCount === 0 || hasBreachedTicket;
            isSlaWaiting = activeTicketsCount > 0 && !hasBreachedTicket;

            this.logger.log(
              `Auto-assign resolved: original=${ticketType} -> assigned=${tType} to ${assignedTech.email} using ${assignmentStrategy} (isSlaWaiting: ${isSlaWaiting})`,
            );
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

    // const ticketNumber = await this.generateTicketNumber();
    const status = assignedToId
      ? (shouldStartInProgress ? TicketStatus.IN_PROGRESS : TicketStatus.ASSIGNED)
      : TicketStatus.OPEN;

    // Evaluate isSlaWaiting for manually assigned tickets (if not already done by auto-assign)
    if (assignedToId && !isSlaWaiting && !shouldStartInProgress) {
      const activeTicketsCount = await this.ticketRepo.count({
        where: [
          { assignedToId: assignedToId, status: TicketStatus.ASSIGNED },
          { assignedToId: assignedToId, status: TicketStatus.IN_PROGRESS },
          { assignedToId: assignedToId, status: TicketStatus.PAUSE },
        ],
      });
      isSlaWaiting = activeTicketsCount > 0;
    }

    const slaDeadline = assignedToId
      ? await this.calculateTicketSlaDeadline({ issueTypeId, categoryId }, new Date())
      : null;

    const ticket = this.ticketRepo.create({
      ticketNumber: '', //ticketNumber,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      ticketType: ticketType,
      priority: dto.priority ?? null,
      status,
      categoryId,
      slaDeadline,
      isSlaWaiting: !assignedToId ? true : isSlaWaiting,
      slaPausedAt: (!assignedToId || isSlaWaiting) ? new Date() : null,
      lastAssignedAt: assignedToId ? new Date() : null,
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

    // let saved: Ticket | null = null;
    // // Guard against duplicate ticket numbers in concurrent creation scenarios.
    // for (let attempt = 0; attempt < 3; attempt++) {
    //   try {
    //     saved = await this.ticketRepo.save(ticket);
    //     break;
    //   } catch (err: any) {
    //     const isDuplicate = /duplicate entry|ER_DUP_ENTRY/i.test(String(err?.message ?? ''));
    //     if (!isDuplicate || attempt === 2) throw err;
    //     ticket.ticketNumber = await this.generateTicketNumber();
    //   }
    // }
    // if (!saved) {
    //   throw new BadRequestException(
    //     'Failed to create ticket due to ticket number allocation conflict.',
    //   );
    // }

    const saved = await this.ticketRepo.save(ticket);
    const persisted = await this.ticketRepo.findOneByOrFail({ id: saved.id });

    // Log creation event
    this.logEvent(saved.id, 'created', callerId, {
      ticketNumber: persisted.ticketNumber,
      ticketType: persisted.ticketType,
      status: persisted.status,
    }).catch(() => { });

    if (assignedToId && assignedTech) {
      this.logEvent(saved.id, 'auto_assigned', null, {
        technicianId: assignedTech.id,
        technicianName:
          [assignedTech.first_name, assignedTech.lastName].filter(Boolean).join(' ') ||
          assignedTech.email,
      }).catch(() => { });
    }

    if (image) {
      await this.addComment(
        saved.id,
        { content: '[Initial Ticket Attachment]', isInternal: false },
        callerId,
        callerRole || UserRole.USER,
        image
      ).catch((err) => {
        this.logger.error(`Failed to attach initial image for ticket ${saved.id}:`, err);
      });
    }

    // return Object.assign(saved, { autoShifted, autoAssigned: !!assignedToId, noTechAvailable });
    return Object.assign(persisted, {
      autoShifted,
      autoAssigned: !!assignedToId,
      noTechAvailable,
    });
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
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    search?: string;
  }): Promise<
    | Ticket[]
    | {
      data: Ticket[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      statusCounts: Record<string, number>;
      pendingSatisfactionCount?: number;
      myTicketsCount?: number;
      escalatedToMeCount?: number;
    }
  > {
    const allowedSortColumns: Record<string, string> = {
      createdAt: 't.createdAt',
      updatedAt: 't.updatedAt',
      priority: 't.priority',
      status: 't.status',
      slaDeadline: 't.slaDeadline',
    };
    const sortBy =
      allowedSortColumns[filters.sortBy || 'createdAt'] || allowedSortColumns.createdAt;
    const sortOrder = filters.sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const qb = this.ticketRepo
      .createQueryBuilder('t')

      .leftJoinAndSelect('t.category', 'category')
      .leftJoinAndSelect('t.issueTypeConfig', 'issueTypeConfig')
      .leftJoinAndSelect('t.comments', 'comments')

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
          escalationStatuses: [EscalationStatus.PENDING],
          // EscalationStatus.ACCEPTED],
        },
      ).distinct(true);

      if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
      if (filters.ticketType)
        qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
      if (filters.requesterId) qb.andWhere('t.requesterId = :rid', { rid: filters.requesterId });
      if (filters.assignedToId) qb.andWhere('t.assignedToId = :aid', { aid: filters.assignedToId });
    } else {
      // Role-based visibility
      // Focal roles (is_focal=1) and super_admin see ALL tickets (full management view).
      if (filters.viewerRole === UserRole.USER) {
        // Regular users see their own tickets AND tickets filed on their behalf (proxy),
        // plus tickets they created on behalf of others (proxy filer visibility)
        qb.where('(t.requesterId = :uid OR t.createdById = :uid)', { uid: filters.viewerId });
      } else if (
        filters.viewerRole &&
        this.canViewAllTicketsInTicketing(filters.viewerRole as string)
      ) {
        // Privileged roles: no WHERE restriction — see all tickets with full filter support
        if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
        if (filters.ticketType)
          qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
        if (filters.requesterId) qb.andWhere('t.requesterId = :rid', { rid: filters.requesterId });
        if (filters.assignedToId)
          qb.andWhere('t.assignedToId = :aid', { aid: filters.assignedToId });
      } else {
        // All other staff: see only tickets assigned to them OR submitted by them
        qb.where('(t.assignedToId = :uid OR t.requesterId = :uid)', { uid: filters.viewerId });
        if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
        if (filters.ticketType)
          qb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
      }
    }

    // Apply optional text search before pagination so totals remain accurate.
    if (filters.search?.trim()) {
      const search = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(new Brackets((where) => {
        where
          .where('LOWER(t.ticketNumber) LIKE :search', { search })
          .orWhere('LOWER(t.subject) LIKE :search', { search })
          .orWhere('LOWER(t.description) LIKE :search', { search })
          .orWhere("EXISTS (SELECT 1 FROM users u WHERE u.id = t.requester_id AND (LOWER(u.email) LIKE :search OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE :search))", { search });
      }));
    }
    // Apply date filters
    if (filters.year) {
      qb.andWhere('EXTRACT(YEAR FROM t.createdAt) = :year', { year: filters.year });
    }
    if (filters.month) {
      qb.andWhere('EXTRACT(MONTH FROM t.createdAt) = :month', { month: filters.month });
    }
    if (filters.quarter) {
      qb.andWhere('EXTRACT(QUARTER FROM t.createdAt) = :quarter', { quarter: filters.quarter });
    }
    if (filters.semester) {
      if (filters.semester === 1) {
        qb.andWhere('EXTRACT(MONTH FROM t.createdAt) <= 6');
      } else {
        qb.andWhere('EXTRACT(MONTH FROM t.createdAt) > 6');
      }
    }

    const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : undefined;
    const limit =
      filters.limit && filters.limit > 0 ? Math.min(100, Math.floor(filters.limit)) : undefined;
    const usePagination = Boolean(page && limit);

    let tickets: Ticket[] = [];
    let total = 0;
    if (usePagination) {
      const offset = ((page as number) - 1) * (limit as number);
      tickets = await qb
        .clone()
        .skip(offset)
        .take(limit as number)
        .getMany();
      await this.enrichTicketsWithUsers(tickets);
      const totalRow = await qb
        .clone()
        .select('COUNT(DISTINCT t.id)', 'count')
        .getRawOne<{ count?: string | number }>();
      total = Number(totalRow?.count ?? 0);
    } else {
      tickets = await qb.getMany();
      await this.enrichTicketsWithUsers(tickets);
    }

    // Augment with today's absence flag for assigned technicians (used in admin/section-head views)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const absentRows = await this.dataSource
      .createQueryBuilder()
      .select('ta.user_id', 'userId')
      .from('attendance', 'ta')
      .where('ta.date = :today', { today })
      .andWhere("ta.status IN ('absent', 'out_of_office')")
      .getRawMany();
    const absentIds = new Set<number>(absentRows.map((r) => Number(r.userId)));

    const now = new Date();
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    const withAvailability = await Promise.all(
      tickets.map(async (t) => {
        if (t.status === TicketStatus.IN_PROGRESS && t.isSlaWaiting) {
          t.isSlaWaiting = false;
          t.slaPausedAt = null;
        }
        if (t.status === TicketStatus.IN_PROGRESS && !t.slaDeadline && t.assignedToId) {
          t.slaDeadline = await this.calculateTicketSlaDeadline(
            t,
            new Date(t.lastAssignedAt || t.createdAt),
          );
        }
        let isOverdue = false;
        let isNearingSLA = false;
        if (t.slaDeadline) {
          let deadline = new Date(t.slaDeadline);

          // Dynamically project deadline if ticket is currently paused in the queue
          if (t.isSlaWaiting && t.slaPausedAt && t.issueTypeConfig?.slaHours && config) {
            const businessSecondsElapsed = await this.calculateBusinessSeconds(
              new Date(t.slaPausedAt),
              now,
              config as TicketingConfig
            );
            const accumulatedPauseSeconds = (t.accumulatedPauseSeconds || 0) + businessSecondsElapsed;
            const totalBusinessSecondsSinceCreation = await this.calculateBusinessSeconds(
              new Date(t.createdAt),
              now,
              config as TicketingConfig
            );
            const activeBusinessSeconds = Math.max(0, totalBusinessSecondsSinceCreation - accumulatedPauseSeconds);
            const consumedSlaHours = activeBusinessSeconds / 3600;
            const remainingHours = Math.max(0, t.issueTypeConfig.slaHours - consumedSlaHours);
            deadline = await this.calculateSlaDeadline(
              now,
              remainingHours,
              config as TicketingConfig
            );
            t.slaDeadline = deadline; // Output true projected deadline in API
          }

          const originalSlaMs = t.issueTypeConfig?.slaHours
            ? t.issueTypeConfig.slaHours * 3600 * 1000
            : deadline.getTime() - new Date(t.createdAt).getTime();
          const fortyPercentSlaMs = originalSlaMs * 0.4;

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
      })
    );

    const statusRows = await qb
      .clone()
      .select('t.status', 'status')
      .addSelect('COUNT(DISTINCT t.id)', 'count')
      .groupBy('t.status')
      .orderBy('t.status', 'ASC')
      .getRawMany<{ status: string; count: string | number }>();
    const statusCounts: Record<string, number> = {};
    for (const row of statusRows) statusCounts[row.status] = Number(row.count);

      if (!usePagination) {
      return withAvailability;
    }

    return {
      data: withAvailability,
      total,
      page: page as number,
      limit: limit as number,
      totalPages: Math.max(1, Math.ceil(total / (limit as number))),
      statusCounts,
    };
  }

  async getTicketById(id: string, viewerRole?: UserRole, viewerId?: number): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['category', 'issueTypeConfig', 'comments'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.enrichTicketsWithUsers([ticket]);
    await this.assertTicketReadAccess(ticket, viewerId, viewerRole);

    // IN_PROGRESS tickets are active; repair legacy rows that still carry the queue flag.
    if (ticket.status === TicketStatus.IN_PROGRESS && ticket.isSlaWaiting) {
      ticket.isSlaWaiting = false;
      ticket.slaPausedAt = null;
    }
    if (ticket.status === TicketStatus.IN_PROGRESS && !ticket.slaDeadline && ticket.assignedToId) {
      ticket.slaDeadline = await this.calculateTicketSlaDeadline(
        ticket,
        new Date(ticket.lastAssignedAt || ticket.createdAt),
      );
    }
    if (viewerRole === UserRole.USER && ticket.hasUnreadUser) {
      ticket.hasUnreadUser = false;
    } else if (viewerRole !== UserRole.USER && ticket.hasUnreadTechnician) {
      ticket.hasUnreadTechnician = false;
    }
    
    // Strip internal notes for regular users — they should never see staff-only comments
    if (viewerRole === UserRole.USER && ticket.comments) {
      (ticket as any).comments = ticket.comments.filter((c: any) => !c.isInternal);
    }

    // Add SLA indicators
    let isOverdue = false;
    let isNearingSLA = false;
    if (ticket.slaDeadline) {
      const now = new Date();
      let deadline = new Date(ticket.slaDeadline);

      // Dynamically project deadline if ticket is currently paused in the queue
      if (ticket.isSlaWaiting && ticket.slaPausedAt && ticket.issueTypeConfig?.slaHours) {
        const config = await this.configRepo.findOne({ where: { id: 1 } });
        if (config) {
          const businessSecondsElapsed = await this.calculateBusinessSeconds(
            new Date(ticket.slaPausedAt),
            now,
            config as TicketingConfig
          );
          const accumulatedPauseSeconds = (ticket.accumulatedPauseSeconds || 0) + businessSecondsElapsed;
          const totalBusinessSecondsSinceCreation = await this.calculateBusinessSeconds(
            new Date(ticket.createdAt),
            now,
            config as TicketingConfig
          );
          const activeBusinessSeconds = Math.max(0, totalBusinessSecondsSinceCreation - accumulatedPauseSeconds);
          const consumedSlaHours = activeBusinessSeconds / 3600;
          const remainingHours = Math.max(0, ticket.issueTypeConfig.slaHours - consumedSlaHours);
          deadline = await this.calculateSlaDeadline(
            now,
            remainingHours,
            config as TicketingConfig
          );
          ticket.slaDeadline = deadline; // Output true projected deadline in API
        }
      }

      const originalSlaMs = ticket.issueTypeConfig?.slaHours
        ? ticket.issueTypeConfig.slaHours * 3600 * 1000
        : deadline.getTime() - new Date(ticket.createdAt).getTime();
      const fortyPercentSlaMs = originalSlaMs * 0.4;

      if (now > deadline) {
        isOverdue = true;
      } else if (deadline.getTime() - now.getTime() <= fortyPercentSlaMs) {
        isNearingSLA = true;
      }
    }
    return Object.assign(ticket, { isOverdue, isNearingSLA });
  }

  private commentAttachmentStorageRoot(): string {
    return process.env.COMMENT_ATTACHMENT_STORAGE_ROOT || './uploads/comments';
  }

  // --- Update --------------------------------------------------------------

  async updateTicket(
    id: string,
    dto: UpdateTicketDto,
    actorId: number,
    actorRole: UserRole,
  ): Promise<Ticket> {
    const ticket = await this.getTicketById(id, actorRole, actorId);
    const originalStatusForLogging = ticket.status as TicketStatus;
    const latestEscalation = await this.escalationRepo.findOne({
      where: { ticketId: id },
      order: { createdAt: 'DESC' },
    });
    const acceptedEscalation =
      latestEscalation?.status === EscalationStatus.ACCEPTED ? latestEscalation : null;

    // Guard: Only Ticket Settings Focals or Super Admins can revert a ticket back to OPEN status
    if (dto.status === TicketStatus.OPEN && ticket.status !== TicketStatus.OPEN) {
      const isAuthorizedToOpen =
        actorRole === UserRole.SUPER_ADMIN ||
        this.roleCapSvc.isTicketSettingsFocal(actorRole as string);

      if (!isAuthorizedToOpen) {
        throw new ForbiddenException(
          'Only Ticket Settings Focals or Super Admins can revert a ticket to OPEN status.',
        );
      }
    }

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
          throw new ForbiddenException(
            'Tickets can only be self-closed once they are in Resolved status.',
          );
        }
        ticket.status = TicketStatus.CLOSED;
        ticket.userClosed = true;
        if (!ticket.resolvedAt) ticket.resolvedAt = new Date();
        const savedClosed = await this.ticketRepo.save(ticket);
        this.logEvent(savedClosed.id, 'closed', actorId).catch(() => { });
        if (ticket.assignedTo?.email) {
          this.emailService
            .sendTicketClosedOrRatedEmailToTechnician({
              ticketId: savedClosed.id,
              ticketNumber: savedClosed.ticketNumber,
              subject: savedClosed.subject,
              technicianName:
                [ticket.assignedTo.first_name, ticket.assignedTo.last_name]
                  .filter(Boolean)
                  .join(' ') || ticket.assignedTo.email,
              technicianEmail: ticket.assignedTo.email,
              action: 'closed',
            })
            .catch(() => { });
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
      throw new ForbiddenException(
        'Duplicate tickets are in a terminal state and cannot be updated.',
      );
    }

    // Technicians / admins can update status + resolution
    if (dto.subject) ticket.subject = dto.subject.trim();
    if (dto.description) ticket.description = dto.description.trim();

    if (dto.ticketType) {
      // const isSettingsFocal = this.roleCapSvc.isTicketSettingsFocal(actorRole as string);
      // const isAssigned = ticket.assignedToId === actorId;
      // if (!isSettingsFocal && !isAssigned) {
      //   throw new ForbiddenException('You do not have permission to change the ticket type.');
      // }
      // ticket.ticketType = dto.ticketType;
      // If there is an active escalation (Pending or Accepted), restrict ticket type changes
      if (latestEscalation && latestEscalation.status !== 'returned') {
        const isSettingsFocal = this.roleCapSvc.isTicketSettingsFocal(actorRole as string);
        const isAcceptedFocal =
          latestEscalation.status === 'accepted' && latestEscalation.escalatedToId === actorId;
        if (!isSettingsFocal && !isAcceptedFocal) {
          throw new ForbiddenException(
            'You cannot change the ticket type while the ticket is escalated.',
          );
        }
      } else {
        const isSettingsFocal = this.roleCapSvc.isTicketSettingsFocal(actorRole as string);
        const isAssigned = ticket.assignedToId === actorId;
        if (!isSettingsFocal && !isAssigned) {
          throw new ForbiddenException('You do not have permission to change the ticket type.');
        }
      }
      if (ticket.ticketType !== dto.ticketType) {
        ticket.ticketType = dto.ticketType;
        if (dto.categoryId === undefined) {
          // Clear category if not explicitly provided in the same request
          ticket.categoryId = null;
          ticket.category = null;
        }
      }
    }

    if (dto.issueTypeId !== undefined) {
      let currentIssueType = null;
      if (!dto.issueTypeId) {
        ticket.issueTypeId = null;
        ticket.issueType = 'other';
      } else {
        const issueType = await this.issueTypeRepo.findOne({
          where: { id: dto.issueTypeId, isDeleted: false, isActive: true },
        });
        if (!issueType) {
          throw new BadRequestException('Selected issue type is invalid or inactive.');
        }
        ticket.issueTypeId = issueType.id;
        ticket.issueType = issueType.key;
        ticket.issueTypeConfig = issueType;
        currentIssueType = issueType;
      }

      // Recalculate SLA if ticket has an SLA deadline or is being assigned one
      if (currentIssueType?.slaHours) {
        const config = await this.configRepo.findOne({ where: { id: 1 } });
        if (config) {
          const now = new Date();
          const referenceTime = ticket.slaPausedAt ? new Date(ticket.slaPausedAt) : now;
          const activeBusinessSeconds = await this.calculateBusinessSeconds(
            new Date(ticket.createdAt),
            referenceTime,
            config as TicketingConfig
          );
          const totalConsumedSeconds = activeBusinessSeconds - (ticket.accumulatedPauseSeconds || 0);
          const remainingHours = Math.max(0, currentIssueType.slaHours - (totalConsumedSeconds / 3600));
          ticket.slaDeadline = await this.calculateSlaDeadline(
            referenceTime,
            remainingHours,
            config as TicketingConfig
          );
        }
      }
    }

    if (dto.categoryId !== undefined) {
      if (!dto.categoryId) {
        throw new BadRequestException('Category is required.');
      }
      const cat = await this.settingsService.getCategoryById(dto.categoryId).catch(() => null);
      if (!cat) {
        throw new BadRequestException('Selected category is invalid.');
      }
      ticket.categoryId = cat.id;
      ticket.category = cat;
    }

    // Priority changes allowed for all technician-level roles and above
    if (dto.priority !== undefined) {
      if (
        !this.roleCapSvc.isFocal(actorRole as string) &&
        !this.roleCapSvc.isIto(actorRole as string) &&
        !this.roleCapSvc.isTechnician(actorRole as string)
      ) {
        throw new ForbiddenException('Only technicians and above can change ticket priority.');
      }
      ticket.priority = dto.priority;
    }

    if (dto.status) {
      if (latestEscalation && latestEscalation.status === 'pending') {
        throw new ForbiddenException('Cannot change ticket status while an escalation is pending.');
      }

      if (acceptedEscalation) {
        const isEscalationAdmin = this.roleCapSvc.isTicketSettingsFocal(actorRole as string);
        const isAcceptedFocal = acceptedEscalation.escalatedToId === actorId;
        if (!isEscalationAdmin && !isAcceptedFocal) {
          throw new ForbiddenException(
            'This ticket has an accepted escalation. Only the accepting focal, compliance officer, section head, or super admin can change status.',
          );
        }
      } else {
        // Enforce that only admins or the assigned technician can update status
        const isStatusAdmin =
          this.roleCapSvc.isTicketSettingsFocal(actorRole as string) ||
          this.roleCapSvc.isTicketFocal(actorRole as string);

        if (!isStatusAdmin && ticket.assignedToId !== actorId) {
          throw new ForbiddenException(
            'You can only update the status of tickets explicitly assigned to you.',
          );
        }
      }

      // QA #4/#3/#6: Full status transition matrix enforcement
      const ALLOWED_TRANSITIONS: Partial<Record<TicketStatus, TicketStatus[]>> = {
        [TicketStatus.OPEN]:
          this.roleCapSvc.isTicketSettingsFocal(actorRole as string) ||
            this.roleCapSvc.isTicketFocal(actorRole as string)
            ? [TicketStatus.FREEZE, TicketStatus.DUPLICATE]
            : [TicketStatus.DUPLICATE],
        [TicketStatus.ASSIGNED]:
          this.roleCapSvc.isTicketSettingsFocal(actorRole as string) ||
            this.roleCapSvc.isTicketFocal(actorRole as string)
            ? [
              TicketStatus.IN_PROGRESS,
              TicketStatus.FREEZE,
              TicketStatus.DUPLICATE,
              TicketStatus.OPEN,
            ]
            : [TicketStatus.IN_PROGRESS, TicketStatus.DUPLICATE],
        [TicketStatus.IN_PROGRESS]:
          this.roleCapSvc.isTicketSettingsFocal(actorRole as string) ||
            this.roleCapSvc.isTicketFocal(actorRole as string)
            ? [TicketStatus.RESOLVED, TicketStatus.PAUSE, TicketStatus.FREEZE]
            : [TicketStatus.RESOLVED, TicketStatus.PAUSE],
        [TicketStatus.PAUSE]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
        [TicketStatus.RESOLVED]: [TicketStatus.CLOSED],
        [TicketStatus.FREEZE]: [
          TicketStatus.OPEN,
          TicketStatus.ASSIGNED,
          TicketStatus.IN_PROGRESS,
          TicketStatus.RESOLVED,
        ],
        [TicketStatus.CLOSED]: [],
        [TicketStatus.DUPLICATE]: [],
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
          throw new BadRequestException(
            'duplicateOfId is required when marking a ticket as Duplicate.',
          );
        }
        const original = await this.ticketRepo.findOne({ where: { id: dto.duplicateOfId } });
        if (!original) throw new BadRequestException('Original ticket not found.');
        ticket.duplicateOfId = dto.duplicateOfId;

        // --- SLA Freezing Logic for Terminal DUPLICATE State ---
        if (
          [TicketStatus.FREEZE, TicketStatus.PAUSE, TicketStatus.OPEN].includes(ticket.status as TicketStatus) &&
          ticket.slaPausedAt
        ) {
          const now = new Date();
          const config = await this.configRepo.findOne({ where: { id: 1 } });
          const businessSecondsElapsed = await this.calculateBusinessSeconds(
            ticket.slaPausedAt,
            now,
            config as TicketingConfig,
          );
          ticket.accumulatedPauseSeconds =
            (ticket.accumulatedPauseSeconds || 0) + businessSecondsElapsed;

          if (ticket.slaDeadline && ticket.issueTypeConfig?.slaHours) {
            const totalBusinessSecondsSinceCreation = await this.calculateBusinessSeconds(
              new Date(ticket.createdAt),
              now,
              config as TicketingConfig,
            );
            const activeBusinessSeconds = Math.max(
              0,
              totalBusinessSecondsSinceCreation - ticket.accumulatedPauseSeconds,
            );
            const consumedSlaHours = activeBusinessSeconds / 3600;
            const remainingHours = Math.max(0, ticket.issueTypeConfig.slaHours - consumedSlaHours);
            ticket.slaDeadline = await this.calculateSlaDeadline(
              now,
              remainingHours,
              config as TicketingConfig,
            );
          }
          ticket.slaPausedAt = null;
        }

        ticket.status = TicketStatus.DUPLICATE;
        // Duplicate tickets are terminal — treat like closed
        if (!ticket.resolvedAt) ticket.resolvedAt = new Date();
      } else {
        // Guard: ticket must have a priority before it can be resolved
        if (
          dto.status === TicketStatus.RESOLVED &&
          !ticket.priority &&
          dto.priority === undefined
        ) {
          throw new BadRequestException(
            'A priority must be set on this ticket before it can be marked as Resolved. Please set the priority first.',
          );
        }

        // const originalStatus = ticket.status as TicketStatus; // Removed hoisting here

        // --- SLA Freezing Logic ---
        if ([TicketStatus.FREEZE, TicketStatus.PAUSE].includes(dto.status as TicketStatus)) {
          if (!dto.statusJustification || !dto.statusJustification.trim()) {
            throw new BadRequestException(`A justification is required when setting the status to ${dto.status.toUpperCase()}.`);
          }
          const justif = this.justificationRepo.create({
            ticketId: ticket.id,
            status: dto.status,
            justification: dto.statusJustification.trim(),
            createdBy: actorId,
          });
          await this.justificationRepo.save(justif);
        }

        const wasPaused =
          [TicketStatus.FREEZE, TicketStatus.PAUSE, TicketStatus.OPEN].includes(ticket.status as TicketStatus) ||
          ticket.isSlaWaiting;
        const willBePaused = [TicketStatus.FREEZE, TicketStatus.PAUSE, TicketStatus.OPEN].includes(
          dto.status as TicketStatus,
        );

        if (willBePaused && !wasPaused) {
          ticket.slaPausedAt = new Date();
        } else if (wasPaused && !willBePaused && ticket.slaPausedAt) {
          const now = new Date();
          const config = await this.configRepo.findOne({ where: { id: 1 } });
          const businessSecondsElapsed = await this.calculateBusinessSeconds(
            ticket.slaPausedAt,
            now,
            config as TicketingConfig,
          );
          ticket.accumulatedPauseSeconds =
            (ticket.accumulatedPauseSeconds || 0) + businessSecondsElapsed;

          if (ticket.issueTypeConfig?.slaHours) {
            const totalBusinessSecondsSinceCreation = await this.calculateBusinessSeconds(
              new Date(ticket.createdAt),
              now,
              config as TicketingConfig,
            );
            const activeBusinessSeconds = Math.max(
              0,
              totalBusinessSecondsSinceCreation - ticket.accumulatedPauseSeconds,
            );
            const consumedSlaHours = activeBusinessSeconds / 3600;
            const remainingHours = Math.max(0, ticket.issueTypeConfig.slaHours - consumedSlaHours);
            ticket.slaDeadline = await this.calculateSlaDeadline(
              now,
              remainingHours,
              config as TicketingConfig,
            );
          }
          ticket.slaPausedAt = null;
          ticket.isSlaWaiting = false;
        }

        ticket.status = dto.status;

        if (dto.status === TicketStatus.IN_PROGRESS) {
          ticket.isSlaWaiting = false;
          ticket.slaPausedAt = null;
        }

        // Preemptive Queue Pushback (Unfreeze/Unpause Priority)
        // We only push back ASSIGNED tickets so that multiple IN_PROGRESS tickets can run concurrently.
        if (
          dto.status === TicketStatus.IN_PROGRESS &&
          [TicketStatus.FREEZE, TicketStatus.PAUSE].includes(originalStatusForLogging) &&
          ticket.assignedToId
        ) {
          const currentActiveTickets = await this.ticketRepo.find({
            where: {
              assignedToId: ticket.assignedToId,
              status: TicketStatus.ASSIGNED,
              id: Not(ticket.id),
              isSlaWaiting: false,
            },
          });
          for (const activeT of currentActiveTickets) {
            activeT.isSlaWaiting = true;
            if (!activeT.slaPausedAt) {
              activeT.slaPausedAt = new Date();
            }
          }
          if (currentActiveTickets.length > 0) {
            await this.ticketRepo.save(currentActiveTickets);
            this.logger.log(
              `Pushed back ${currentActiveTickets.length} active ticket(s) to queue for technician #${ticket.assignedToId} due to preemptive resume of ticket ${ticket.ticketNumber}`,
            );
          }
        }
        // QA: When transitioning back to OPEN, remove the assigned technician
        if (dto.status === TicketStatus.OPEN) {
          ticket.assignedToId = null;
          ticket.lastAssignedAt = null;
          ticket.isSlaWaiting = false;
          ticket.slaDeadline = null;
          ticket.accumulatedPauseSeconds = 0;
          ticket.slaPausedAt = null;

          // QA: if there is an available PRESENT technician, auto-assign immediately
          const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
          const isOfficeDayToday = await this.attendanceService.isOfficeDay(today);
          if (ticket.ticketType === TicketType.PANTAWID_ICT_SUPPORT || isOfficeDayToday) {
            const presentTechs = await this.attendanceService.getPresentTechnicians(
              ticket.ticketType,
              today,
            );

            // Senior focal roles are never eligible for automatic assignment.
            const eligibleTechs = presentTechs.filter(
              (t) => !this.roleCapSvc.isSeniorTech(t.role),
            );

            // Fetch Routing Configuration
            const config = await this.configRepo.findOne({ where: { id: 1 } });
            const assignmentStrategy = config?.assignmentStrategy || 'CURRENT_AUTO';
            const roundRobinCapHours = config?.roundRobinCapHours || 80;
            let assignedTech: any = null;

            if (assignmentStrategy === 'CAPPED_ROUND_ROBIN') {
              let minLastAssignedTime = Infinity;
              for (const tech of eligibleTechs) {
                // Weekly cap: count SLA hours assigned during the current Manila week.
                const weeklySlaLoad = await this.getWeeklySlaLoad(tech.id);

                if (weeklySlaLoad < roundRobinCapHours) {
                  const lastTicket = await this.ticketRepo.findOne({
                    where: { assignedToId: tech.id },
                    order: { lastAssignedAt: 'DESC' },
                  });
                  const techLastAssignedTime = lastTicket?.lastAssignedAt
                    ? lastTicket.lastAssignedAt.getTime()
                    : 0;
                  if (techLastAssignedTime < minLastAssignedTime) {
                    minLastAssignedTime = techLastAssignedTime;
                    assignedTech = tech;
                  }
                }
              }
              if (false && !assignedTech && eligibleTechs.length > 0) {
                let minLoad = Infinity;
                for (const tech of eligibleTechs) {
                  const openCount = await this.ticketRepo.count({
                    where: [
                      { assignedToId: tech.id, status: TicketStatus.ASSIGNED },
                      { assignedToId: tech.id, status: TicketStatus.IN_PROGRESS },
                    ],
                  });
                  if (openCount < minLoad) {
                    minLoad = openCount;
                    assignedTech = tech;
                  }
                }
              }
            } else {
              let minCount = Infinity;
              for (const tech of eligibleTechs) {
                const openCount = await this.ticketRepo.count({
                  where: [
                    { assignedToId: tech.id, status: TicketStatus.ASSIGNED },
                    { assignedToId: tech.id, status: TicketStatus.IN_PROGRESS },
                  ],
                });
                if (openCount < minCount) {
                  minCount = openCount;
                  assignedTech = tech;
                }
              }
            }

            if (assignedTech) {
              ticket.assignedToId = assignedTech.id;
              ticket.status = TicketStatus.ASSIGNED;
              ticket.lastAssignedAt = new Date();
              // Break not needed here, no outer loop
            }
          }
        }
        if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
          ticket.resolvedAt = new Date();
        }

        // Unpause SLA timer if moving to a terminal state
        if (
          [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.DUPLICATE].includes(
            dto.status as TicketStatus,
          )
        ) {
          if (ticket.slaPausedAt) {
            const now = new Date();
            const config = await this.configRepo.findOne({ where: { id: 1 } });
            const pausedTimeSeconds = await this.calculateBusinessSeconds(
              ticket.slaPausedAt,
              now,
              config as TicketingConfig,
            );

            ticket.accumulatedPauseSeconds += pausedTimeSeconds;
            if (ticket.slaDeadline && ticket.issueTypeConfig?.slaHours) {
              const totalBusinessSecondsSinceCreation = await this.calculateBusinessSeconds(
                new Date(ticket.createdAt),
                now,
                config as TicketingConfig,
              );
              const activeBusinessSeconds = Math.max(
                0,
                totalBusinessSecondsSinceCreation - ticket.accumulatedPauseSeconds,
              );
              const consumedSlaHours = activeBusinessSeconds / 3600;
              const remainingHours = Math.max(0, ticket.issueTypeConfig.slaHours - consumedSlaHours);
              ticket.slaDeadline = await this.calculateSlaDeadline(
                now,
                remainingHours,
                config as TicketingConfig,
              );
            }
          }
          ticket.slaPausedAt = null;
          ticket.isSlaWaiting = false;
        }
      }
    }
    if (dto.resolutionNotes !== undefined) ticket.resolutionNotes = dto.resolutionNotes;
    if (dto.resolutionSteps !== undefined)
      ticket.resolutionSteps = dto.resolutionSteps?.trim() || null;
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

    // Mark for KB generation if requested
    if (dto.status === TicketStatus.RESOLVED && dto.generateKb && ticket.resolutionNotes) {
      ticket.isKbGenerationPending = true;
    }

    const saved = await this.ticketRepo.save(ticket);

    // AI Knowledge Base Generation (Fire-and-forget)
    if (saved.isKbGenerationPending) {
      this.kbService
        .generateKbFromTicket(
          saved.subject,
          saved.description,
          saved.resolutionNotes!,
        )
        .then(async () => {
          // Successfully generated, clear the pending flag
          await this.ticketRepo.update(saved.id, { isKbGenerationPending: false });
        })
        .catch(async (err) => {
          this.logger.warn(`Failed to auto-generate KB, benched for retry: ${err.message}`);
          await this.commentRepo.save(
            this.commentRepo.create({
              ticketId: saved.id,
              userId: saved.assignedToId || 1, // System generated fallback
              comment: `⚠️ **System Info:** The AI Knowledge Base generation encountered an API limit or error and has been queued for automatic retry in the background.\n\n**Reason:** ${err.message}`,
              isInternal: true,
            }),
          );
        });
    }

    // Log status/priority change event
    if (dto.status) {
      if ([TicketStatus.FREEZE, TicketStatus.PAUSE].includes(dto.status as TicketStatus) && originalStatusForLogging === dto.status) {
        this.logEvent(saved.id, 'status_extended', actorId, {
          to: dto.status,
          justification: dto.statusJustification?.trim(),
        }).catch(() => { });
      } else {
        this.logEvent(saved.id, 'status_changed', actorId, {
          to: dto.status,
          resolutionNotes: dto.resolutionNotes ?? undefined,
          justification: dto.statusJustification?.trim() ?? undefined,
        }).catch(() => { });
      }

      // In-app notification
      const notifyUsers = [];
      if (ticket.requesterId && ticket.requesterId !== actorId) notifyUsers.push(ticket.requesterId);
      if (ticket.assignedToId && ticket.assignedToId !== actorId) notifyUsers.push(ticket.assignedToId);
      this.sendNotification(
        notifyUsers,
        saved.id,
        'status_changed',
        `Ticket ${saved.ticketNumber} status changed to ${dto.status}`,
      ).catch(() => {});

      if (dto.status === TicketStatus.RESOLVED && ticket.requester?.email) {
        this.emailService
          .sendTicketResolvedEmailToRequester({
            ticketId: saved.id,
            ticketNumber: saved.ticketNumber,
            subject: saved.subject,
            requesterName:
              [ticket.requester.first_name, ticket.requester.last_name].filter(Boolean).join(' ') ||
              ticket.requester.email,
            requesterEmail: ticket.requester.email,
            technicianName: ticket.assignedTo
              ? [ticket.assignedTo.first_name, ticket.assignedTo.last_name]
                .filter(Boolean)
                .join(' ') || ticket.assignedTo.email
              : undefined,
          })
          .catch(() => { });
      }

      if (dto.status === TicketStatus.CLOSED && ticket.assignedTo?.email) {
        this.emailService
          .sendTicketClosedOrRatedEmailToTechnician({
            ticketId: saved.id,
            ticketNumber: saved.ticketNumber,
            subject: saved.subject,
            technicianName:
              [ticket.assignedTo.first_name, ticket.assignedTo.last_name]
                .filter(Boolean)
                .join(' ') || ticket.assignedTo.email,
            technicianEmail: ticket.assignedTo.email,
            action: 'closed',
          })
          .catch(() => { });
      }
    }

    // QA #1/#2: On RESOLVED, auto-assign next OPEN ticket — only for non-senior techs
    // QA #1/#2: On RESOLVED, CLOSED, DUPLICATE, or FREEZE, auto-assign next queued ticket
    if (
      [
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
        TicketStatus.DUPLICATE,
        TicketStatus.FREEZE,
      ].includes(dto.status as TicketStatus) &&
      saved.assignedToId
    ) {
      try {
        const resolvedByTech = await this.usersHttpClient.getUserById(saved.assignedToId);
        const isSeniorTech = resolvedByTech && this.roleCapSvc.isSeniorTech(resolvedByTech.role);

        if (!isSeniorTech) {
          // Check technician is available today before assigning
          const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });            const presentTechs = await this.attendanceService.getPresentTechnicians('all', today);
            const isPresent = presentTechs.some((tech) => tech.id === saved.assignedToId);

          if (isPresent) {
            // Check if the technician is still busy with other tickets
            const busyCount = await this.ticketRepo.count({
              where: [
                {
                  assignedToId: saved.assignedToId,
                  status: TicketStatus.ASSIGNED,
                  isSlaWaiting: false,
                },
                { assignedToId: saved.assignedToId, status: TicketStatus.IN_PROGRESS },
              ],
            });

            if (busyCount === 0) {
              const unpaused = await this.unpauseNextWaitingTicket(
                saved.assignedToId,
                'auto_assigned',
              );
              if (unpaused) {
                // Done unpausing
              } else {
                // 2. Find next oldest unassigned open ticket
                let nextTicket = await this.ticketRepo
                  .createQueryBuilder('t')
                  .where('t.status = :status', { status: TicketStatus.OPEN })
                  .andWhere('t.assignedToId IS NULL')
                  .andWhere('t.requesterId != :assignedToId', { assignedToId: saved.assignedToId })
                  .orderBy('t.createdAt', 'ASC')
                  .getOne();
                if (nextTicket) {
                  const assignmentConfig = await this.configRepo.findOne({ where: { id: 1 } });
                  if (assignmentConfig?.assignmentStrategy === 'CAPPED_ROUND_ROBIN') {
                    const weeklySlaLoad = await this.getWeeklySlaLoad(saved.assignedToId);
                    const weeklyCap = assignmentConfig.roundRobinCapHours || 80;
                    if (weeklySlaLoad >= weeklyCap) {
                      this.logger.log(
                        `Auto-reassign on resolve: technician #${saved.assignedToId} reached weekly cap (${weeklySlaLoad}/${weeklyCap}).`,
                      );
                      nextTicket = null;
                    }
                  }
                }

                if (nextTicket) {
                  nextTicket.assignedToId = saved.assignedToId;
                  nextTicket.status = TicketStatus.ASSIGNED;
                  nextTicket.lastAssignedAt = new Date();

                  if (nextTicket.issueTypeId) {
                    const issueType = await this.settingsService
                      .getIssueTypeById(nextTicket.issueTypeId)
                      .catch(() => null);
                    if (issueType?.slaHours) {
                      const slaConfig = await this.configRepo
                        .findOne({ where: { id: 1 } })
                        .catch(() => null);
                      nextTicket.slaDeadline = slaConfig
                        ? await this.calculateSlaDeadline(new Date(), issueType.slaHours, slaConfig)
                        : (() => {
                          const d = new Date();
                          d.setHours(d.getHours() + issueType.slaHours);
                          return d;
                        })();
                    }
                  }

                  await this.ticketRepo.save(nextTicket);

                  this.logEvent(nextTicket.id, 'auto_assigned', null, {
                    technicianId: resolvedByTech!.id,
                    technicianName:
                      [resolvedByTech!.first_name, resolvedByTech!.last_name]
                        .filter(Boolean)
                        .join(' ') || resolvedByTech!.email,
                  }).catch(() => { });

                  this.logger.log(
                    `Auto-reassign on resolve: ticket ${nextTicket.ticketNumber} (${nextTicket.ticketType}) -> technician #${saved.assignedToId}`,
                  );
                } else {
                  this.logger.log(
                    `Auto-reassign on resolve: no open unassigned tickets available for technician #${saved.assignedToId}`,
                  );
                }
              }
            } else {
              this.logger.log(
                `Auto-reassign on resolve: technician #${saved.assignedToId} is still busy (has active tickets) — skipping unstacking/assigning`,
              );
            }
          } else {
            this.logger.log(
              `Auto-reassign on resolve: technician #${saved.assignedToId} is absent today — skipping`,
            );
          }
        }
      } catch (err: any) {
        this.logger.warn(`Auto-reassign on resolve failed (non-fatal): ${err?.message}`);
      }
    }

    return saved;
  }

  async assignTicket(
    id: string,
    dto: AssignTicketDto,
    actorRole: UserRole,
    actorId?: number,
  ): Promise<Ticket> {
    if (
      !this.roleCapSvc.isTicketFocal(actorRole as string) &&
      !this.roleCapSvc.isTicketSettingsFocal(actorRole as string) &&
      !this.roleCapSvc.isAllTickets(actorRole as string) &&
      !this.roleCapSvc.isTechnician(actorRole as string)
    ) {
      throw new ForbiddenException(
        'Only admins, focal persons, and technicians can assign tickets.',
      );
    }

    const ticket = await this.getTicketById(id, actorRole, actorId);
    const latestEscalation = await this.escalationRepo.findOne({
      where: { ticketId: id },
      order: { createdAt: 'DESC' },
    });
    const acceptedEscalation =
      latestEscalation?.status === EscalationStatus.ACCEPTED ? latestEscalation : null;

    // Duplicate, Resolved, and Closed tickets are terminal – assignment is not allowed
    if (ticket.status === TicketStatus.DUPLICATE) {
      throw new ForbiddenException(
        'Cannot assign a technician to a ticket that is marked as Duplicate.',
      );
    }
    if ([TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status as TicketStatus)) {
      throw new ForbiddenException('Resolved or closed tickets cannot be reassigned.');
    }

    // A ticket cannot be assigned to its requester or reporter
    if (dto.assignedToId === ticket.requesterId || dto.assignedToId === ticket.createdById) {
      throw new ForbiddenException(
        'A ticket cannot be assigned to the person who requested or reported it.',
      );
    }

    const technician = await this.usersHttpClient.getUserById(dto.assignedToId);
    if (!technician) throw new NotFoundException('Technician not found');

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const attendanceRecord = await this.attendanceService.getAttendanceForDate(todayStr);
    const techAttendance = attendanceRecord.find((a) => a.userId === dto.assignedToId);
    if (!techAttendance || techAttendance.status !== 'present') {
      throw new BadRequestException('Cannot assign a ticket to a technician who is not explicitly marked present.');
    }

    // Once an escalation is accepted, only CO/SH/super_admin may reassign,
    // and only to another configured escalation focal.
    if (acceptedEscalation) {
      const isEscalationAdmin = this.roleCapSvc.isTicketSettingsFocal(actorRole as string);
      if (!isEscalationAdmin) {
        const escalationAdminRoles = this.roleCapSvc.getRolesWhere('isTicketSettingsFocal');
        const adminList =
          escalationAdminRoles.length > 0
            ? escalationAdminRoles.join(', ')
            : 'super_admin, section_head, compliance_officer';

        throw new ForbiddenException(
          `This ticket has an accepted escalation. Only escalation admin role(s) (${adminList}) can reassign it.`,
        );
      }

      const focals = await this.escalationFocalRepo.find();
      const allowedUserIds = new Set<number>(
        focals
          .filter((f) => f.ticketType === ticket.ticketType || f.ticketType === 'all')
          .map((f) => Number(f.userId)),
      );

      // if (allowedUserIds.size > 0 && !allowedUserIds.has(Number(technician.id))) {
      if (!allowedUserIds.has(Number(technician.id))) {
        throw new ForbiddenException(
          'During an accepted escalation, reassignment is limited to configured escalation focal users for this ticket type.',
        );
      }
    }

    // If the actor has ticketMainFocal=true they are empowered to re-assign freely (skip busy guard)
    let actorIsMainFocal = false;
    if (actorId) {
      const actorUser = await this.usersHttpClient.getUserById(actorId);
      actorIsMainFocal = actorUser?.ticketMainFocal === true;
    }
    const bypassBusyGuard =
      actorIsMainFocal ||
      this.roleCapSvc.isTicketSettingsFocal(actorRole as string) ||
      this.roleCapSvc.isFocal(actorRole as string);

    // Guard: lower-level techs can only escalate to focal-level technicians
    const lowerLevelRoles: UserRole[] = [UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR];
    if (
      lowerLevelRoles.includes(actorRole) &&
      !this.roleCapSvc.isFocal(technician.role as string)
    ) {
      throw new ForbiddenException(
        'Lower-level technicians may only escalate to focal-level technicians.',
      );
    }

    // Check technician active load
    const busyCount = await this.ticketRepo.count({
      where: [
        { assignedToId: dto.assignedToId, status: TicketStatus.ASSIGNED },
        { assignedToId: dto.assignedToId, status: TicketStatus.IN_PROGRESS },
        { assignedToId: dto.assignedToId, status: TicketStatus.PAUSE },
      ],
    });

    // Guard: technician must have no active tickets (unless actor is main focal / admin)
    if (!bypassBusyGuard) {
      if (busyCount > 0) {
        throw new BadRequestException(
          `${technician.first_name} ${technician.last_name} still has ${busyCount} unresolved active ticket(s). Resolve them before assigning a new one.`,
        );
      }
    }
    const previousAssigneeId = ticket.assignedToId;

    ticket.assignedToId = dto.assignedToId;
    ticket.lastAssignedAt = new Date();
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.ASSIGNED;
    }

    // Set SLA deadline if the ticket's category has an SLA configured
    if (ticket.issueTypeConfig?.slaHours) {
      const isAuthorizedToResetSla =
        this.roleCapSvc.isTicketSettingsFocal(actorRole as string) ||
        actorRole === UserRole.SUPER_ADMIN;

      if (!ticket.slaDeadline || isAuthorizedToResetSla) {
        const slaConfig = await this.configRepo.findOne({ where: { id: 1 } }).catch(() => null);
        ticket.slaDeadline = slaConfig
          ? await this.calculateSlaDeadline(new Date(), ticket.issueTypeConfig.slaHours, slaConfig)
          : (() => {
            const d = new Date();
            d.setHours(d.getHours() + ticket.issueTypeConfig.slaHours);
            return d;
          })();
      }

      if (busyCount > 0) {
        ticket.isSlaWaiting = true;
        if (!ticket.slaPausedAt) ticket.slaPausedAt = new Date();
      } else {
        ticket.isSlaWaiting = false;
        ticket.slaPausedAt = null;
      }
    }

    const assigned = await this.ticketRepo.save(ticket);

    // Log assignment event
    const eventType = previousAssigneeId && previousAssigneeId !== dto.assignedToId ? 'manually_reassigned' : 'manually_assigned';
    this.logEvent(assigned.id, eventType, actorId ?? null, {
      technicianId: technician.id,
      technicianName:
        [technician.first_name, technician.last_name].filter(Boolean).join(' ') || technician.email,
      previousAssignee: previousAssigneeId !== dto.assignedToId ? previousAssigneeId : undefined,
    }).catch(() => { });

    // Send in-app notification for manual assignment/reassignment
    this.sendNotification(
      [dto.assignedToId],
      assigned.id,
      eventType,
      `Ticket ${assigned.ticketNumber} has been ${eventType === 'manually_reassigned' ? 'reassigned' : 'assigned'} to you`
    ).catch(() => { });

    if (previousAssigneeId && previousAssigneeId !== dto.assignedToId) {
      this.sendNotification(
        [previousAssigneeId],
        assigned.id,
        'unassigned',
        `Ticket ${assigned.ticketNumber} has been reassigned to another staff member.`
      ).catch(() => { });
    }

    // Send assignment notification email (fire-and-forget)
    this.emailService
      .sendTicketAssignedEmail({
        ticketId: assigned.id,
        ticketNumber: assigned.ticketNumber,
        subject: assigned.subject,
        ticketType: assigned.ticketType,
        priority: assigned.priority,
        status: assigned.status,
        technicianName:
          [technician.first_name, technician.last_name].filter(Boolean).join(' ') ||
          technician.email,
        technicianEmail: technician.email,
      })
      .catch(() => { });

    return assigned;
  }

  /** Mark ticket as In Progress when the assigned technician opens the detail view */
  async markTicketViewed(
    id: string,
    viewerId: number,
    viewerRole: UserRole,
  ): Promise<Ticket | null> {
    const ticket = await this.getTicketById(id, viewerRole, viewerId);
    // Persist unread clearing only through this explicit mutation endpoint.
    await this.ticketRepo.update(id, viewerRole === UserRole.USER
      ? { hasUnreadUser: false }
      : { hasUnreadTechnician: false });
    // Only auto-transition when the assigned technician views an 'assigned' ticket
    // QA #5: Skip auto-transition if priority has not been set yet
    if (ticket.status === TicketStatus.ASSIGNED && ticket.assignedToId === viewerId && !ticket.isSlaWaiting) {
      if (!ticket.priority) {
        this.logger.log(
          `Auto in_progress skipped: ticket ${ticket.ticketNumber} has no priority set.`,
        );
        return null; // Priority must be set first
      }
      ticket.status = TicketStatus.IN_PROGRESS;
      ticket.isSlaWaiting = false;
      ticket.slaPausedAt = null;
      const saved = await this.ticketRepo.save(ticket);
      this.logger.log(
        `Auto in_progress: ticket ${ticket.ticketNumber} viewed by technician #${viewerId}`,
      );
      this.logEvent(saved.id, 'in_progress', viewerId, { via: 'view' }).catch(() => { });
      return saved;
    }
    return null; // no change
  }

  private validateImageUpload(file: Express.Multer.File): void {
    const buffer = file?.buffer;
    const mime = String(file?.mimetype || '').toLowerCase();
    const isJpeg = buffer?.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer?.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isGif = buffer?.length >= 6 && (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a');
    const isWebp = buffer?.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    const valid = (isJpeg && mime === 'image/jpeg') || (isPng && mime === 'image/png') || (isGif && mime === 'image/gif') || (isWebp && mime === 'image/webp');
    if (!valid) {
      throw new BadRequestException('Only valid JPEG, PNG, GIF, or WebP images are allowed.');
    }
  }

  private createSafeImageFilename(file: Express.Multer.File): string {
    const mime = String(file.mimetype).toLowerCase();
    const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
    return `${randomUUID()}.${extension}`;
  }
  // --- Comments ------------------------------------------------------------

  async addComment(
    ticketId: string,
    dto: AddCommentDto,
    actorId: number,
    actorRole: UserRole,
    attachment?: Express.Multer.File,
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

    let attachmentPath: string | null = null;
    if (attachment) {
      this.validateImageUpload(attachment);
      const dir = path.join(this.commentAttachmentStorageRoot(), ticketId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filename = this.createSafeImageFilename(attachment);
      const fullPath = path.join(dir, filename);
      fs.writeFileSync(fullPath, attachment.buffer);
      attachmentPath = `comment-attachments/${ticketId}/${filename}`;
    }

    const comment = this.commentRepo.create({
      ticketId,
      comment: commentText,
      userId: actorId,
      isInternal: isInternal ?? false,
      attachmentPath,
    });

    const savedComment = await this.commentRepo.save(comment);

    if (actorRole === UserRole.USER) {
      ticket.hasUnreadTechnician = true;
      await this.ticketRepo.update(ticket.id, { hasUnreadTechnician: true });
    } else {
      ticket.hasUnreadUser = true;
      await this.ticketRepo.update(ticket.id, { hasUnreadUser: true });
    }

    this.logEvent(ticket.id, 'comment_added', actorId, {
      isInternal,
      hasAttachment: !!attachment,
    }).catch(() => { });

    // In-app notification
    const notifyUsers: number[] = [];
    if (actorRole === UserRole.USER) {
      if (ticket.assignedToId && ticket.assignedToId !== actorId) notifyUsers.push(ticket.assignedToId);
    } else if (ticket.requesterId === actorId) {
      if (ticket.assignedToId && ticket.assignedToId !== actorId) notifyUsers.push(ticket.assignedToId);
    } else {
      if (!isInternal && ticket.requesterId && ticket.requesterId !== actorId) notifyUsers.push(ticket.requesterId);
    }
    this.sendNotification(
      notifyUsers,
      ticket.id,
      'comment_added',
      `New comment on ticket ${ticket.ticketNumber}`,
    ).catch(() => {});

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
      throw new BadRequestException(
        'Satisfaction can only be submitted for resolved or closed tickets.',
      );
    }
    if (ticket.satisfactionSubmittedAt) {
      throw new BadRequestException('Satisfaction has already been submitted for this ticket.');
    }

    if (dto.formData) {
      // Full CSAT form submission
      const form = dto.formData;
      if (!form.consentGiven) {
        throw new BadRequestException(
          'Informed consent is required to submit the satisfaction form.',
        );
      }
      if (!form.unitSection?.trim()) throw new BadRequestException('Unit/Section is required.');
      if (!form.clientFirstName?.trim() || !form.clientLastName?.trim()) {
        throw new BadRequestException('Client first and last name are required.');
      }
      if (!form.sex) throw new BadRequestException('Sex is required.');
      if (!form.likert || form.likert.length !== 9) {
        throw new BadRequestException('All 9 service quality items must be answered.');
      }

      // Compute satisfactionRating as the average of all answered (numeric) Likert items.
      // Items with value 'NA' are excluded from the average.
      const numericLikert = (form.likert as (number | string | 'NA')[]).filter(
        (v) => typeof v === 'number' && (v as number) >= 1 && (v as number) <= 5,
      ) as number[];
      const derivedRating =
        numericLikert.length > 0
          ? Math.round((numericLikert.reduce((acc, v) => acc + v, 0) / numericLikert.length) * 10) /
          10
          : null;

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
    this.logEvent(saved.id, 'closed', requesterId).catch(() => { });
    this.logEvent(saved.id, 'rated', requesterId, { rating: saved.satisfactionRating }).catch(
      () => { },
    );

    if (ticket.assignedTo?.email) {
      this.emailService
        .sendTicketClosedOrRatedEmailToTechnician({
          ticketId: saved.id,
          ticketNumber: saved.ticketNumber,
          subject: saved.subject,
          technicianName:
            [ticket.assignedTo.first_name, ticket.assignedTo.last_name].filter(Boolean).join(' ') ||
            ticket.assignedTo.email,
          technicianEmail: ticket.assignedTo.email,
          action: 'rated',
          rating: saved.satisfactionRating,
        })
        .catch(() => { });
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
      } catch {
        /* skip malformed */
      }
    }
    return Array.from(units).sort();
  }

  // --- Statistics ----------------------------------------------------------

  async getStatistics(filters?: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
  }): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    satisfactionAvg: number | null;
    satisfactionFillRate: number;
    resolvedTickets: number;
    userClosedTickets: number;
  }> {
    const qb = this.ticketRepo.createQueryBuilder('t');

    if (filters?.year) {
      qb.andWhere('YEAR(t.createdAt) = :year', { year: filters.year });
    }
    if (filters?.month) {
      qb.andWhere('MONTH(t.createdAt) = :month', { month: filters.month });
    }
    if (filters?.quarter) {
      qb.andWhere('QUARTER(t.createdAt) = :quarter', { quarter: filters.quarter });
    }
    if (filters?.semester) {
      if (filters.semester == 1) {
        qb.andWhere('MONTH(t.createdAt) BETWEEN 1 AND 6');
      } else {
        qb.andWhere('MONTH(t.createdAt) BETWEEN 7 AND 12');
      }
    }

    const all = await qb.getMany();
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
    byTechnician: Record<string, { average: number; count: number }>;
    summary: { average: number; count: number };
  }> {
    const qb = this.ticketRepo
      .createQueryBuilder('t')

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
    await this.enrichTicketsWithUsers(tickets);

    const byTicket = tickets.map((t) => ({
      ticketId: t.id,
      ticketNumber: t.ticketNumber,
      rating: t.satisfactionRating,
      comment: t.satisfactionComment,
      formData: t.satisfactionFormData,
      submittedAt: t.satisfactionSubmittedAt,
      technicianId: t.assignedTo?.id,
      technicianName: t.assignedTo
        ? `${t.assignedTo.first_name} ${t.assignedTo.last_name}`
        : 'Unknown',
    }));

    const byTechnician: Record<string, { total: number; count: number }> = {};
    let totalSum = 0;
    let validCount = 0;

    for (const t of tickets) {
      if (!t.satisfactionRating || t.satisfactionRating <= 0) continue;
      const techName = t.assignedTo
        ? `${t.assignedTo.first_name} ${t.assignedTo.last_name}`.trim()
        : 'Unknown';
      if (!byTechnician[techName]) {
        byTechnician[techName] = { total: 0, count: 0 };
      }
      byTechnician[techName].total += t.satisfactionRating;
      byTechnician[techName].count += 1;
      totalSum += t.satisfactionRating;
      validCount += 1;
    }

    const technicianAverages: Record<string, { average: number; count: number }> = {};
    for (const [tech, data] of Object.entries(byTechnician)) {
      technicianAverages[tech] = {
        average: Math.round((data.total / data.count) * 10) / 10,
        count: data.count,
      };
    }

    const byDayMap: Record<string, { total: number; count: number }> = {};
    const byWeekMap: Record<string, { total: number; count: number }> = {};
    for (const t of tickets) {
      if (!t.satisfactionSubmittedAt || !t.satisfactionRating || t.satisfactionRating <= 0)
        continue;
      const dateStr = new Date(t.satisfactionSubmittedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      if (!byDayMap[dateStr]) byDayMap[dateStr] = { total: 0, count: 0 };
      byDayMap[dateStr].total += t.satisfactionRating;
      byDayMap[dateStr].count += 1;

      // Week calculation
      const d = new Date(t.satisfactionSubmittedAt);
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      const weekStr = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
      if (!byWeekMap[weekStr]) byWeekMap[weekStr] = { total: 0, count: 0 };
      byWeekMap[weekStr].total += t.satisfactionRating;
      byWeekMap[weekStr].count += 1;
    }
    const byDay = Object.keys(byDayMap)
      .sort()
      .map((date) => ({
        date,
        avgRating: Math.round((byDayMap[date].total / byDayMap[date].count) * 10) / 10,
      }));
    const byWeek = Object.keys(byWeekMap)
      .sort()
      .map((week) => ({
        week,
        avgRating: Math.round((byWeekMap[week].total / byWeekMap[week].count) * 10) / 10,
      }));

    return {
      byDay,
      byWeek,
      byTicket,
      byTechnician: technicianAverages,
      summary: {
        average: validCount > 0 ? Math.round((totalSum / validCount) * 10) / 10 : 0,
        count: validCount,
      },
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
    myTicketsCount: number;
    escalatedToMeCount: number;
  }> {
    const tickets = await this.ticketRepo.find({ where: { requesterId } });

    let open = 0,
      inProgress = 0,
      resolved = 0,
      closed = 0,
      frozen = 0,
      duplicate = 0;
    let needsSatisfaction = 0;
    const pendingSatisfactionTickets: Ticket[] = [];

    for (const t of tickets) {
      if (t.status === TicketStatus.OPEN) open++;
      else if (t.status === TicketStatus.ASSIGNED || t.status === TicketStatus.IN_PROGRESS)
        inProgress++;
      else if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) {
        if (t.status === TicketStatus.RESOLVED) resolved++;
        if (t.status === TicketStatus.CLOSED) closed++;
        needsSatisfaction++;
        if (!t.satisfactionSubmittedAt) pendingSatisfactionTickets.push(t);
      }
    }

    const filled = tickets.filter(
      (t) =>
        (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) &&
        t.satisfactionSubmittedAt,
    ).length;

    const fillRate = needsSatisfaction > 0 ? Math.round((filled / needsSatisfaction) * 100) : 0;

    const myTicketsCount = await this.ticketRepo.count({
      where: {
        assignedToId: requesterId,
        status: In([TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.PAUSE]),
      },
    });

    const escalatedToMeCount = await this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin(
        TicketEscalation,
        'e',
        'e.ticket_id = t.id AND e.escalated_to_id = :requesterId AND e.status IN (:...escStatuses)',
      )
      .where('t.status IN (:...ticketStatuses)')
      .setParameters({
        requesterId,
        escStatuses: [EscalationStatus.PENDING],
        //  EscalationStatus.ACCEPTED],
        ticketStatuses: [
          TicketStatus.ASSIGNED,
          TicketStatus.IN_PROGRESS,
          TicketStatus.PAUSE,
          TicketStatus.PAUSE,
        ],
      })
      .getCount();

    return {
      total: tickets.length,
      open,
      inProgress,
      resolved,
      closed,
      satisfactionFillRate: fillRate,
      pendingSatisfactionTickets,
      myTicketsCount,
      escalatedToMeCount,
    };
  }

  async getSlaSummary(
    viewerId?: number,
    viewerRole?: UserRole,
  ): Promise<{
    totalWithSla: number;
    activeWithSla: number;
    overdueActive: number;
    dueToday: number;
    breachedResolved: number;
    complianceRate: number;
  }> {
    const activeStatuses = [
      TicketStatus.OPEN,
      TicketStatus.ASSIGNED,
      TicketStatus.IN_PROGRESS,
      TicketStatus.FREEZE,
    ];

    const qb = this.ticketRepo.createQueryBuilder('t')
      .where('t.slaDeadline IS NOT NULL')
      .leftJoinAndSelect('t.issueTypeConfig', 'issueTypeConfig');

    if (viewerRole === UserRole.USER) {
      qb.andWhere('t.requesterId = :viewerId', { viewerId });
    } else if (viewerRole && !this.canViewAllTicketsInTicketing(viewerRole as string)) {
      qb.andWhere('(t.requesterId = :viewerId OR t.assignedToId = :viewerId)', { viewerId });
    }

    const tickets = await qb.getMany();
    await this.enrichTicketsWithUsers(tickets);
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

      if (
        (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) &&
        t.resolvedAt &&
        deadline < t.resolvedAt
      ) {
        breachedResolved++;
      }
    }

    const complianceRate =
      activeWithSla > 0
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

  /** General overview of all tickets for a specific month */
  async getGeneralOverviewStats(
    year: number,
    month: number,
  ): Promise<{
    total: number;
    open: number;
    assigned: number;
    inProgress: number;
    resolved: number;
    closed: number;
    frozen: number;
    duplicate: number;
    ratedCount: number;
    satisfactionAvg: number | null;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.createdAt >= :startDate', { startDate })
      .andWhere('t.createdAt <= :endDate', { endDate })
      .getMany();
    await this.enrichTicketsWithUsers(tickets);

    let open = 0,
      assigned = 0,
      inProgress = 0,
      resolved = 0,
      closed = 0,
      frozen = 0,
      duplicate = 0;
    let totalSat = 0,
      countSat = 0;

    for (const t of tickets) {
      if (t.status === TicketStatus.OPEN) open++;
      else if (t.status === TicketStatus.ASSIGNED) assigned++;
      else if (t.status === TicketStatus.IN_PROGRESS) inProgress++;
      else if (t.status === TicketStatus.RESOLVED) resolved++;
      else if (t.status === TicketStatus.CLOSED) closed++;
      else if (t.status === TicketStatus.FREEZE) frozen++;
      else if (t.status === TicketStatus.DUPLICATE) duplicate++;

      if (t.satisfactionRating) {
        totalSat += t.satisfactionRating;
        countSat++;
      }
    }

    return {
      total: tickets.length,
      open,
      assigned,
      inProgress,
      resolved,
      closed,
      frozen,
      duplicate,
      ratedCount: countSat,
      satisfactionAvg: countSat > 0 ? Number((totalSat / countSat).toFixed(1)) : null,
    };
  }

  /** Monthly stats for tickets assigned to a specific technician */
  async getTechAssignedStats(
    techId: number,
    year: number,
    month: number,
  ): Promise<{
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
    await this.enrichTicketsWithUsers(tickets);

    let assigned = 0,
      inProgress = 0,
      resolved = 0,
      closed = 0;
    let totalSat = 0,
      countSat = 0;

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

  async getTechnicianAvailability(): Promise<
    Array<{
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      openCount: number;
      attendanceStatus: string | null;
      isUnavailable: boolean;
    }>
  > {
    // Fetch all active users except standard 'USER' role
    const allTechUsers = await this.usersHttpClient.getUsers();
    const technicians = allTechUsers.filter(
      (u: any) => u.role !== UserRole.USER && u.role !== UserRole.SUPER_ADMIN,
    );

    // Read attendance for today so assignment UI can hide unavailable technicians.
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const attendanceRows = await this.dataSource
      .createQueryBuilder()
      .select('ta.user_id', 'userId')
      .addSelect('ta.status', 'status')
      .from('attendance', 'ta')
      .where('ta.date = :today', { today })
      .getRawMany();
    const attendanceMap = new Map<number, string>(
      attendanceRows.map((r) => [Number(r.userId), String(r.status)]),
    );
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
    const countMap = new Map<number, number>(
      openCountsRaw.map((r) => [Number(r.techId), Number(r.count)]),
    );

    const results = [];
    for (const tech of technicians) {
      // Skip absent / out-of-office technicians — they cannot be assigned
      const attendanceStatus = attendanceMap.get(tech.id) ?? null;
      const isUnavailable = attendanceStatus ? unavailableStatuses.has(attendanceStatus) : false;
      if (isUnavailable) continue;

      results.push({
        id: tech.id,
        email: tech.email,
        firstName: tech.first_name,
        lastName: tech.last_name,
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
    if (
      viewerRole &&
      viewerId &&
      !this.canViewAllTicketsInTicketing(viewerRole as string) &&
      viewerId !== requesterId
    ) {
      throw new ForbiddenException(
        'You can only view open tickets for your own requester account.',
      );
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
      const tech = await this.usersHttpClient.getUserById(techId);
      if (!tech) return;

      // Determine which ticket types this technician handles
      const roleDefRows = await this.dataSource.query(
        'SELECT technician_type as technicianType FROM role_definitions WHERE value = ?',
        [tech.role],
      );
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

      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const isOfficeDayToday = await this.attendanceService.isOfficeDay(today);
      if (ticketType !== TicketType.PANTAWID_ICT_SUPPORT && !isOfficeDayToday) return;

      // Guard: tech must be present (attendance check)
      const available = await this.attendanceService.getPresentTechnicians(ticketType, today);
      const isPresent = available.some((t) => t.id === techId);
      if (!isPresent) return;
      // Existing active work affects queue state, but not the weekly cap.
      const currentOpen = await this.ticketRepo
        .createQueryBuilder('t')
        .where('t.assignedToId = :id', { id: techId })
        .andWhere('t.status IN (:...active)', {
          active: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.PAUSE],
        })
        .getCount();

      const config = await this.configRepo.findOne({ where: { id: 1 } });
      const assignmentStrategy = config?.assignmentStrategy || 'CURRENT_AUTO';
      const roundRobinCapHours = config?.roundRobinCapHours || 80;
      const weeklySlaLoad = await this.getWeeklySlaLoad(techId);
      if (assignmentStrategy === 'CAPPED_ROUND_ROBIN' && weeklySlaLoad >= roundRobinCapHours) {
        this.logger.log(
          `[Attendance Auto-Assign] Technician #${techId} reached the weekly SLA cap (${weeklySlaLoad}/${roundRobinCapHours}).`,
        );
        return;
      }
      if (assignmentStrategy !== 'CAPPED_ROUND_ROBIN' && currentOpen > 0) return;
      // Use the same support-type fallback order as new-ticket assignment.
      const pendingTypes = ticketType === TicketType.DESKTOP_SUPPORT
        ? [TicketType.DESKTOP_SUPPORT, TicketType.IT_SUPPORT, TicketType.PANTAWID_ICT_SUPPORT]
        : ticketType === TicketType.IT_SUPPORT
          ? [TicketType.IT_SUPPORT, TicketType.DESKTOP_SUPPORT, TicketType.PANTAWID_ICT_SUPPORT]
          : [TicketType.PANTAWID_ICT_SUPPORT, TicketType.DESKTOP_SUPPORT, TicketType.IT_SUPPORT];
      let pending: Ticket | null = null;
      for (const pendingType of pendingTypes) {
        pending = await this.ticketRepo
          .createQueryBuilder('t')
          .where('t.status = :status', { status: TicketStatus.OPEN })
          .andWhere('t.assignedToId IS NULL')
          .andWhere('t.ticketType = :type', { type: pendingType })
          .andWhere('t.requesterId != :techId', { techId })
          .orderBy('t.createdAt', 'ASC')
          .getOne();
        if (pending) break;
      }

      if (!pending) return;

      // Compute SLA deadline now that we're assigning
      let slaDeadlineOnAssign: Date | null = null;
      if (pending.issueTypeId) {
        const issueType = await this.settingsService
          .getIssueTypeById(pending.issueTypeId)
          .catch(() => null);
        if (issueType?.slaHours) {
          const slaConfig = await this.configRepo.findOne({ where: { id: 1 } }).catch(() => null);
          slaDeadlineOnAssign = slaConfig
            ? await this.calculateSlaDeadline(new Date(), issueType.slaHours, slaConfig)
            : (() => {
              const d = new Date();
              d.setHours(d.getHours() + issueType.slaHours);
              return d;
            })();
          this.logger.log(
            `[Login Auto-Assign] SLA deadline set to ${slaDeadlineOnAssign?.toISOString()} for ticket ${pending.ticketNumber}`,
          );
        }
      }

      pending.assignedToId = techId;
      const hasBreachedTicket = await this.hasBreachedActiveTicket(techId);
      const shouldStartInProgress = currentOpen === 0 || hasBreachedTicket;
      pending.status = shouldStartInProgress ? TicketStatus.IN_PROGRESS : TicketStatus.ASSIGNED;
      pending.lastAssignedAt = new Date();
      pending.isSlaWaiting = currentOpen > 0 && !hasBreachedTicket;
      pending.slaPausedAt = currentOpen > 0 && !hasBreachedTicket ? new Date() : null;
      if (slaDeadlineOnAssign) pending.slaDeadline = slaDeadlineOnAssign;
      await this.ticketRepo.save(pending);

      this.logEvent(pending.id, 'auto_assigned', null, {
        technicianId: techId,
        technicianName: [tech.first_name, tech.last_name].filter(Boolean).join(' ') || tech.email,
        via: 'login_auto_assign',
      }).catch(() => { });

      this.emailService
        .sendTicketAssignedEmail({
          ticketId: pending.id,
          ticketNumber: pending.ticketNumber,
          subject: pending.subject,
          ticketType: pending.ticketType,
          priority: pending.priority,
          assignedToName: [tech.first_name, tech.last_name].filter(Boolean).join(' ') || tech.email,
          assignedToEmail: tech.email,
        } as any)
        .catch(() => { });

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
        this.logger.log(
          `[Absence Reassign] Attempting to reassign ticket ${ticket.ticketNumber} from absent technician #${techId}`,
        );
        // Nullify assignedTo so it acts like an open ticket for the auto assignment logic
        ticket.assignedToId = null as any;
        ticket.status = TicketStatus.OPEN;
        await this.ticketRepo.save(ticket);

        // Auto assign right away
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        const isOfficeDayToday = await this.attendanceService.isOfficeDay(today);
        if (ticket.ticketType === TicketType.PANTAWID_ICT_SUPPORT || isOfficeDayToday) {
          const presentTechs = await this.attendanceService.getPresentTechnicians(
            ticket.ticketType,
            today,
          );
          // Senior focal roles are never eligible for automatic assignment.
            const eligibleTechs = presentTechs.filter(
              (t) => !this.roleCapSvc.isSeniorTech(t.role),
            );

          for (const tech of eligibleTechs) {
            const openCount = await this.ticketRepo.count({
              where: [
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
                via: 'absence_reassign',
              }).catch(() => { });
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
      UserRole.DESKTOP_SR,
      UserRole.IT_SUPPORT_SR,
      UserRole.DESKTOP_JR,
      UserRole.IT_SUPPORT_JR,
      UserRole.PANTAWID_ICT,
      ...this.roleCapSvc.getRolesWhere('isFocal').map((r) => r as UserRole),
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
    const allUserRows = await this.usersHttpClient.getUsers();
    const users = allUserRows.filter((u: any) => ids.includes(u.id) && techRoles.includes(u.role));

    return users.map((u) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
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
    slaStats: {
      met: number;
      missed: number;
      avgResolutionTimeHours: number;
    };
    slaByType: Array<{
      type: string;
      met: number;
      missed: number;
      avgResolutionTimeHours: number;
      count: number;
    }>;
    slaByTechnician: Array<{
      techId: number;
      techName: string;
      met: number;
      missed: number;
      avgResolutionTimeHours: number;
      count: number;
    }>;
  }> {
    const now = new Date();
    const year = filters.year ?? now.getFullYear();
    const isSuperAdmin = filters.viewerRole === 'super_admin';
    const isTicketSettingsViewer = isSuperAdmin || this.roleCapSvc.isTicketSettingsFocal(filters.viewerRole || '');
    const isTechnician =
      filters.viewerRole &&
      !isTicketSettingsViewer &&
      this.roleCapSvc.isTechnician(filters.viewerRole);

    const requesterIdFilter =
      !isTicketSettingsViewer && !isTechnician ? filters.viewerId : undefined;
    const techIdFilter = isTechnician
      ? filters.viewerId
      : isTicketSettingsViewer
        ? filters.technicianId
        : undefined;

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

      .where('t.createdAt >= :startDate', { startDate })
      .andWhere('t.createdAt <= :endDate', { endDate })
      .andWhere('t.status IN (:...statuses)', {
        statuses: [TicketStatus.CLOSED, TicketStatus.RESOLVED],
      });

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
    await this.enrichTicketsWithUsers(tickets);

    // Total tickets (any status) in the date range with optional filters
    let totalQb = this.ticketRepo
      .createQueryBuilder('t')
      .where('t.createdAt >= :startDate', { startDate })
      .andWhere('t.createdAt <= :endDate', { endDate });
    if (requesterIdFilter)
      totalQb = totalQb.andWhere('t.requesterId = :requesterId', {
        requesterId: requesterIdFilter,
      });
    if (techIdFilter)
      totalQb = totalQb.andWhere('t.assignedToId = :techId', { techId: techIdFilter });
    if (filters.ticketType)
      totalQb = totalQb.andWhere('t.ticketType = :ticketType', { ticketType: filters.ticketType });
    const allTickets = await totalQb.getMany();
    await this.enrichTicketsWithUsers(allTickets);
    const totalTickets = allTickets.length;

    if (tickets.length === 0 && allTickets.length === 0) {
      return {
        totalTickets,
        totalWithRating: 0,
        avgOverallRating: null,
        avgRatingByType: [],
        avgRatingByTechnician: [],
        totalEscalations: 0,
        acceptedEscalations: 0,
        returnedEscalations: 0,
        slaStats: { met: 0, missed: 0, avgResolutionTimeHours: 0 },
        slaByType: [],
        slaByTechnician: [],
      };
    }

    const ratedTickets = tickets.filter((t) => t.satisfactionRating !== null);
    const totalWithRating = ratedTickets.length;

    // Overall average
    const overallSum = ratedTickets.reduce((s, t) => s + (t.satisfactionRating ?? 0), 0);
    const avgOverallRating =
      totalWithRating > 0 ? Math.round((overallSum / totalWithRating) * 10) / 10 : null;

    // Per type (count total ALL TICKETS, but avg based on rated)
    const byTypeMap = new Map<string, { sum: number; ratedCount: number; totalCount: number }>();
    for (const t of allTickets) {
      const key = t.ticketType;
      const cur = byTypeMap.get(key) ?? { sum: 0, ratedCount: 0, totalCount: 0 };
      if (t.satisfactionRating !== null) {
        byTypeMap.set(key, {
          sum: cur.sum + t.satisfactionRating,
          ratedCount: cur.ratedCount + 1,
          totalCount: cur.totalCount + 1,
        });
      } else {
        byTypeMap.set(key, { ...cur, totalCount: cur.totalCount + 1 });
      }
    }
    const avgRatingByType = Array.from(byTypeMap.entries()).map(
      ([type, { sum, ratedCount, totalCount }]) => ({
        type,
        avg: ratedCount > 0 ? Math.round((sum / ratedCount) * 10) / 10 : 0,
        count: totalCount,
        ratedCount,
      }),
    );

    // Per technician
    const byTechMap = new Map<
      number,
      { name: string; sum: number; ratedCount: number; totalCount: number }
    >();
    for (const t of tickets) {
      if (!t.assignedToId) continue;
      const techName = t.assignedTo
        ? [t.assignedTo.first_name, t.assignedTo.last_name].filter(Boolean).join(' ') ||
        t.assignedTo.email
        : `Tech #${t.assignedToId}`;
      const cur = byTechMap.get(t.assignedToId) ?? {
        name: techName,
        sum: 0,
        ratedCount: 0,
        totalCount: 0,
      };
      if (t.satisfactionRating !== null) {
        byTechMap.set(t.assignedToId, {
          name: techName,
          sum: cur.sum + t.satisfactionRating,
          ratedCount: cur.ratedCount + 1,
          totalCount: cur.totalCount + 1,
        });
      } else {
        byTechMap.set(t.assignedToId, { ...cur, totalCount: cur.totalCount + 1 });
      }
    }
    const avgRatingByTechnician = Array.from(byTechMap.entries())
      .map(([techId, { name, sum, ratedCount, totalCount }]) => ({
        techId,
        techName: name,
        avg: ratedCount > 0 ? Math.round((sum / ratedCount) * 10) / 10 : 0,
        count: totalCount,
        ratedCount,
      }))
      .sort((a, b) => b.count - a.count);

    let slaMet = 0;
    let slaMissed = 0;
    let totalResolutionHours = 0;
    let resolvedSlaTickets = 0;

    const slaByTypeMap = new Map<
      string,
      { met: number; missed: number; hours: number; count: number }
    >();
    const slaByTechMap = new Map<
      number,
      { name: string; met: number; missed: number; hours: number; count: number }
    >();

    for (const t of tickets) {
      if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) {
        if (t.resolvedAt) {
          const resolvedAt = new Date(t.resolvedAt);
          const createdAt = new Date(t.createdAt);
          const hours = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

          let metSla = false;
          if (t.slaDeadline) {
            if (resolvedAt <= new Date(t.slaDeadline)) {
              metSla = true;
            }
          } else {
            metSla = true; // default to met if no deadline
          }

          // Global metrics
          totalResolutionHours += hours;
          resolvedSlaTickets++;
          if (metSla) slaMet++;
          else slaMissed++;

          // Type metrics
          const typeKey = t.ticketType || 'Unknown';
          const typeData = slaByTypeMap.get(typeKey) ?? { met: 0, missed: 0, hours: 0, count: 0 };
          typeData.count++;
          typeData.hours += hours;
          if (metSla) typeData.met++;
          else typeData.missed++;
          slaByTypeMap.set(typeKey, typeData);

          // Tech metrics
          if (t.assignedToId) {
            const techName = t.assignedTo
              ? [t.assignedTo.first_name, t.assignedTo.last_name].filter(Boolean).join(' ') ||
              t.assignedTo.email
              : `Tech #${t.assignedToId}`;
            const techData = slaByTechMap.get(t.assignedToId) ?? {
              name: techName,
              met: 0,
              missed: 0,
              hours: 0,
              count: 0,
            };
            techData.count++;
            techData.hours += hours;
            if (metSla) techData.met++;
            else techData.missed++;
            slaByTechMap.set(t.assignedToId, techData);
          }
        }
      }
    }

    const avgResolutionTimeHours =
      resolvedSlaTickets > 0
        ? Math.round((totalResolutionHours / resolvedSlaTickets) * 10) / 10
        : 0;

    const slaByType = Array.from(slaByTypeMap.entries())
      .map(([type, data]) => ({
        type,
        met: data.met,
        missed: data.missed,
        count: data.count,
        avgResolutionTimeHours:
          data.count > 0 ? Math.round((data.hours / data.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const slaByTechnician = Array.from(slaByTechMap.entries())
      .map(([techId, data]) => ({
        techId,
        techName: data.name,
        met: data.met,
        missed: data.missed,
        count: data.count,
        avgResolutionTimeHours:
          data.count > 0 ? Math.round((data.hours / data.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

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
    const acceptedEscalations = await escQb
      .clone()
      .andWhere('e.status = :s', { s: EscalationStatus.ACCEPTED })
      .getCount();
    const returnedEscalations = await escQb
      .clone()
      .andWhere('e.status = :s', { s: EscalationStatus.RETURNED })
      .getCount();

    return {
      totalTickets,
      totalWithRating,
      avgOverallRating,
      avgRatingByType,
      avgRatingByTechnician,
      totalEscalations,
      acceptedEscalations,
      returnedEscalations,
      slaStats: {
        met: slaMet,
        missed: slaMissed,
        avgResolutionTimeHours,
      },
      slaByType,
      slaByTechnician,
    };
  }

  // --- Escalation ----------------------------------------------------------

  /**
   * Storage root for escalation proof photos.
   * QA #5/#6: Photos are stored on the existing backend filesystem (not a separate DB/service).
   */
  private escalationStorageRoot(): string {
    return process.env.ESCALATION_STORAGE_ROOT || './uploads/escalations';
  }

  /** POST /tickets/:id/escalate — tech escalates a ticket to a focal/senior */
  async escalateTicket(
    ticketId: string,
    dto: EscalateTicketDto,
    proofFiles: Express.Multer.File[],
    actorId: number,
    actorRole: UserRole,
  ): Promise<TicketEscalation> {
    if (
      !this.roleCapSvc.isTicketFocal(actorRole as string) &&
      !this.roleCapSvc.isTicketSettingsFocal(actorRole as string) &&
      !this.roleCapSvc.isAllTickets(actorRole as string) &&
      !this.roleCapSvc.isTechnician(actorRole as string)
    ) {
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
    if (
      [TicketStatus.CLOSED, TicketStatus.DUPLICATE, TicketStatus.RESOLVED].includes(
        ticket.status as TicketStatus,
      )
    ) {
      throw new ForbiddenException('Resolved, closed, or duplicate tickets cannot be escalated.');
    }

    // Verify target is a valid escalation focal for this ticket type
    const focals = await this.escalationFocalRepo.find();
    const focal = await this.usersHttpClient.getUserById(dto.escalatedToId);
    if (!focal) throw new NotFoundException('Escalation target user not found.');

    const allowedUserIds = new Set<number>(
      focals
        .filter((f) => f.ticketType === ticket.ticketType || f.ticketType === 'all')
        .map((f) => Number(f.userId)),
    );

    // if (allowedUserIds.size > 0 && !allowedUserIds.has(Number(focal.id))) {
    if (!allowedUserIds.has(Number(focal.id))) {
      throw new ForbiddenException(
        'The selected user is not designated as an escalation focal for this ticket type.',
      );
    }

    // QA #9: Verify that the selected focal is actually PRESENT today
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const presentFocals = await this.attendanceService.getPresentTechnicians('all', today);
    const isPresent = presentFocals.some((t) => t.id === focal.id);
    if (!isPresent) {
      throw new BadRequestException(
        'The selected escalation focal is not currently marked as present or available today.',
      );
    }

    // Save proof photos to disk
    const savedPaths: string[] = [];
    if (proofFiles && proofFiles.length > 0) {
      for (const f of proofFiles) {
        this.validateImageUpload(f);
      }
      const dir = path.join(this.escalationStorageRoot(), ticketId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      for (const file of proofFiles) {
        const filename = this.createSafeImageFilename(file);
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

    this.logEvent(ticketId, 'escalated', actorId, {
      escalatedToId: dto.escalatedToId,
      escalatedToName: [focal.first_name, focal.last_name].filter(Boolean).join(' ') || focal.email,
      hasProof: savedPaths.length > 0,
    }).catch(() => { });

    this.sendNotification(
      [dto.escalatedToId],
      ticketId,
      'escalation_received',
      `You received an escalation request for ticket ${ticket.ticketNumber}`,
    ).catch(() => {});

    return saved;
  }

  /** PATCH /tickets/:id/escalation/:eid/accept — focal accepts the escalation */
  async acceptEscalation(
    ticketId: string,
    escalationId: string,
    actorId: number,
  ): Promise<TicketEscalation> {
    const escalation = await this.escalationRepo.findOne({ where: { id: escalationId, ticketId } });
    if (!escalation) throw new NotFoundException('Escalation record not found.');
    if (escalation.escalatedToId !== actorId) {
      throw new ForbiddenException(
        'Only the escalation target may accept or return this escalation.',
      );
    }
    if (escalation.status !== EscalationStatus.PENDING) {
      throw new BadRequestException('This escalation has already been processed.');
    }
    escalation.status = EscalationStatus.ACCEPTED;
    await this.escalationRepo.save(escalation);

    // Auto-transition ticket to in_progress and assign to focal when escalation is accepted
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    let previousAssigneeId: number | null = null;
    if (ticket) {
      previousAssigneeId = ticket.assignedToId;
      ticket.assignedToId = actorId;
      ticket.lastAssignedAt = new Date();
      ticket.isSlaWaiting = false;
      if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
        const previousStatus = ticket.status;
        ticket.status = TicketStatus.IN_PROGRESS;
        await this.ticketRepo.save(ticket);
        this.logEvent(ticketId, 'status_changed', actorId, {
          from: previousStatus,
          to: TicketStatus.IN_PROGRESS,
          reason: 'escalation_accepted',
        }).catch(() => { });
      } else {
        await this.ticketRepo.save(ticket);
      }
    }
    this.logEvent(ticketId, 'escalation_accepted', actorId).catch(() => { });

    this.sendNotification(
      [escalation.escalatedById],
      ticketId,
      'escalation_accepted',
      `Your escalation request for ticket ${ticket?.ticketNumber} was accepted`,
    ).catch(() => {});

    if (ticket && previousAssigneeId && previousAssigneeId !== actorId) {
      this.sendNotification(
        [previousAssigneeId],
        ticketId,
        'unassigned',
        `Ticket ${ticket.ticketNumber} has been reassigned to another staff member due to an accepted escalation.`
      ).catch(() => { });
    }

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
      throw new ForbiddenException(
        'Only the escalation target may accept or return this escalation.',
      );
    }
    if (escalation.status !== EscalationStatus.PENDING) {
      throw new BadRequestException('This escalation has already been processed.');
    }
    if (!dto.returnReason?.trim()) {
      throw new BadRequestException('A return reason is required.');
    }
    escalation.status = EscalationStatus.RETURNED;
    escalation.returnReason = dto.returnReason.trim();

    this.logEvent(ticketId, 'escalation_returned', actorId, { reason: dto.returnReason }).catch(
      () => { },
    );
    
    this.sendNotification(
      [escalation.escalatedById],
      ticketId,
      'escalation_declined',
      `Your escalation request was declined`,
    ).catch(() => {});
    return this.escalationRepo.save(escalation);
  }

  /** GET /tickets/:id/escalations — list all escalations for a ticket */
  async getEscalations(
    ticketId: string,
    viewerId?: number,
    viewerRole?: UserRole,
  ): Promise<TicketEscalation[]> {
    await this.getTicketById(ticketId, viewerRole, viewerId);
    return this.escalationRepo.find({
      where: { ticketId },
      relations: ['escalatedBy', 'escalatedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllEscalations(): Promise<TicketEscalation[]> {
    return this.escalationRepo.find({
      relations: ['ticket', 'escalatedBy', 'escalatedTo'],
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
      root: path.resolve(this.escalationStorageRoot(), safeTicketId),
      safeFilename,
    };
  }

  async ensureCommentAttachmentReadable(
    ticketId: string,
    filename: string,
    viewerId?: number,
    viewerRole?: UserRole,
  ): Promise<{ root: string; safeFilename: string }> {
    // Basic access check
    await this.getTicketById(ticketId, viewerRole, viewerId);

    const safeFilename = path.basename(filename);
    const comments = await this.commentRepo.find({ where: { ticketId } });
    const isReferenced = comments.some(
      (c) => c.attachmentPath && path.basename(String(c.attachmentPath)) === safeFilename,
    );
    if (!isReferenced) {
      throw new NotFoundException('Comment attachment not found');
    }

    const safeTicketId = path.basename(ticketId);
    return {
      root: path.resolve(this.commentAttachmentStorageRoot(), safeTicketId),
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
      throw new ForbiddenException(
        'Only the technician who initiated the escalation may update it.',
      );
    }
    if (escalation.status !== EscalationStatus.PENDING) {
      throw new BadRequestException('Only a pending escalation can be updated.');
    }

    if (dto.notes !== undefined) {
      escalation.notes = dto.notes.trim() || null;
    }

    if (proofFiles && proofFiles.length > 0) {
      for (const f of proofFiles) {
        this.validateImageUpload(f);
      }
      const dir = path.join(this.escalationStorageRoot(), ticketId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const savedPaths: string[] = [...(escalation.proofFiles ?? [])];
      for (const file of proofFiles) {
        const filename = this.createSafeImageFilename(file);
        const fullPath = path.join(dir, filename);
        fs.writeFileSync(fullPath, file.buffer);
        savedPaths.push(`escalation-proofs/${ticketId}/${filename}`);
      }
      escalation.proofFiles = savedPaths;
    }

    return this.escalationRepo.save(escalation);
  }

  // --- SLA Pause / Resume ---

  async pauseAllActiveTickets(technicianId?: number): Promise<number> {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .where('t.status IN (:...statuses)', {
        statuses: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.PAUSE],
      })
      .andWhere('t.slaPausedAt IS NULL');

    if (technicianId) {
      qb.andWhere('t.assignedToId = :technicianId', { technicianId });
    }

    const tickets = await qb.getMany();
    await this.enrichTicketsWithUsers(tickets);
    if (tickets.length === 0) return 0;

    const now = new Date();
    for (const t of tickets) {
      t.slaPausedAt = now;
    }
    await this.ticketRepo.save(tickets);
    return tickets.length;
  }

  async resumeAllActiveTickets(technicianId?: number): Promise<number> {
    const whereClause: any = {
      status: In([TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.PAUSE]),
    };
    if (technicianId) {
      whereClause.assignedToId = technicianId;
    }

    const tickets = await this.ticketRepo.find({
      where: whereClause,
      relations: ['category', 'issueTypeConfig'],
    });

    let resumedCount = 0;
    const now = new Date();

    for (const t of tickets) {
      if (t.slaPausedAt) {
        const config = await this.configRepo.findOne({ where: { id: 1 } });
        const businessSecondsElapsed = await this.calculateBusinessSeconds(
          t.slaPausedAt,
          now,
          config as TicketingConfig,
        );
        t.accumulatedPauseSeconds = (t.accumulatedPauseSeconds || 0) + businessSecondsElapsed;

        if (t.slaDeadline && t.issueTypeConfig?.slaHours) {
          const totalBusinessSecondsSinceCreation = await this.calculateBusinessSeconds(
            new Date(t.createdAt),
            now,
            config as TicketingConfig,
          );
          const activeBusinessSeconds = Math.max(
            0,
            totalBusinessSecondsSinceCreation - t.accumulatedPauseSeconds,
          );
          const consumedSlaHours = activeBusinessSeconds / 3600;
          const remainingHours = Math.max(0, t.issueTypeConfig.slaHours - consumedSlaHours);
          t.slaDeadline = await this.calculateSlaDeadline(
            now,
            remainingHours,
            config as TicketingConfig,
          );
        }
        t.slaPausedAt = null;
        resumedCount++;
      }
    }

    if (resumedCount > 0) {
      await this.ticketRepo.save(tickets);
    }
    return resumedCount;
  }

  public async enrichTicketsWithUsers(tickets: Ticket[]): Promise<Ticket[]> {
    if (!tickets?.length) return tickets;

    // Fix: Re-assign & Escalating Incorrect AssignedTo
    // Update assignedToId if there's an accepted escalation, so the frontend UI & Rating logic works.
    const ticketIds = tickets.map((t) => t.id);
    const acceptedEscalations = await this.escalationRepo.find({
      where: { ticketId: In(ticketIds), status: EscalationStatus.ACCEPTED },
      order: { createdAt: 'DESC' },
    });
    const escalationMap = new Map<string, TicketEscalation>();
    for (const esc of acceptedEscalations) {
      if (!escalationMap.has(esc.ticketId)) escalationMap.set(esc.ticketId, esc);
    }
    for (const t of tickets) {
      const latestEsc = escalationMap.get(t.id);
      // Only override assignedToId for active tickets — resolved/closed tickets should show
      // the actual resolver (who resolved the ticket), not the escalation focal.
      const isTerminal = ['resolved', 'closed', 'duplicate'].includes(t.status);
      if (latestEsc && !isTerminal) t.assignedToId = latestEsc.escalatedToId;
    }

    const userIds = new Set<number>();
    const extract = (id: number | null | undefined) => {
      if (id) userIds.add(id);
    };

    for (const t of tickets) {
      extract(t.requesterId);
      extract(t.createdById);
      extract(t.assignedToId);
      if (t.comments) {
        for (const c of t.comments) {
          extract(c.userId);
        }
      }
    }

    if (userIds.size === 0) return tickets;

    const userMap = new Map<number, any>();
    await Promise.all(
      Array.from(userIds).map(async (id) => {
        const user = await this.usersHttpClient.getUserById(id);
        if (user) {
          userMap.set(id, {
            ...user,
            firstName: user.first_name,
            lastName: user.last_name,
          });
        }
      }),
    );

    for (const t of tickets) {
      if (t.requesterId) t.requester = userMap.get(t.requesterId);
      if (t.createdById) t.createdBy = userMap.get(t.createdById);
      if (t.assignedToId) t.assignedTo = userMap.get(t.assignedToId);
      if (t.comments) {
        for (const c of t.comments) {
          if (c.userId) c.user = userMap.get(c.userId);
        }
      }
    }
    return tickets;
  }

  private async enrichEventsWithUsers(events: TicketEvent[]): Promise<TicketEvent[]> {
    if (!events?.length) return events;
    const userIds = new Set<number>();
    for (const e of events) if (e.actorId) userIds.add(e.actorId);
    if (userIds.size === 0) return events;
    const userMap = new Map<number, any>();
    await Promise.all(
      Array.from(userIds).map(async (id) => {
        const user = await this.usersHttpClient.getUserById(id);
        if (user) {
          userMap.set(id, {
            ...user,
            firstName: user.first_name,
            lastName: user.last_name,
          });
        }
      }),
    );
    for (const e of events) {
      if (e.actorId) e.actor = userMap.get(e.actorId);
    }
    return events;
  }

  private async calculateTicketSlaDeadline(
    ticket: Partial<Ticket>,
    start: Date,
  ): Promise<Date> {
    let slaHours = Number(ticket.issueTypeConfig?.slaHours || 0);

    if (!slaHours && ticket.issueTypeId) {
      const issueType = await this.settingsService
        .getIssueTypeById(ticket.issueTypeId)
        .catch(() => null);
      slaHours = Number(issueType?.slaHours || 0);
    }


    // Every assigned ticket must have a running SLA. 24h is the existing
    // system fallback used by capped round-robin.
    if (!slaHours) slaHours = 24;

    const config = await this.configRepo.findOne({ where: { id: 1 } }).catch(() => null);
    if (config) return this.calculateSlaDeadline(start, slaHours, config);

    const fallback = new Date(start);
    fallback.setHours(fallback.getHours() + slaHours);
    return fallback;
  }
  // --- SLA Computation Algorithm ---
  private async calculateSlaDeadline(
    start: Date,
    slaHours: number,
    config: TicketingConfig,
  ): Promise<Date> {
    start = new Date(start);
    start.setMilliseconds(0);
    if (slaHours <= 0) return start;

    const TZ = 'Asia/Manila';

    const parseTime = (timeStr: string, defaultHour: number): number => {
      if (!timeStr) return defaultHour;
      const match = timeStr.match(/^(\d{2}):(\d{2})/);
      return match ? parseInt(match[1], 10) + parseInt(match[2], 10) / 60 : defaultHour;
    };

    let shiftStartHour = 8;
    let shiftEndHour = 17;

    if (config.scheduleMode === 'CWW') {
      shiftStartHour = parseTime(config.cwwClockinStart, 7);
      shiftEndHour = parseTime(config.cwwClockoutStart, 18);
    } else {
      shiftStartHour = parseTime(config.officeClockin, 8);
      shiftEndHour = parseTime(config.officeClockout, 17);
    }

    // Helper: get Manila local hour + minute + second from a UTC Date
    const getManilaHour = (d: Date): number => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(d);
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
      const second = parseInt(parts.find((p) => p.type === 'second')?.value ?? '0', 10);
      return hour + minute / 60 + second / 3600;
    };

    // Helper: get Manila local YYYY-MM-DD
    const getManilaDateString = (d: Date): string => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d); // returns YYYY-MM-DD
    };

    const createManilaDate = (baseDateStr: string, addDays: number, hourFloat: number): Date => {
      const [y, m, day] = baseDateStr.split('-').map(Number);
      const temp = new Date(Date.UTC(y, m - 1, day + addDays));
      const nextY = temp.getUTCFullYear();
      const nextM = String(temp.getUTCMonth() + 1).padStart(2, '0');
      const nextD = String(temp.getUTCDate()).padStart(2, '0');
      const hh = String(Math.floor(hourFloat)).padStart(2, '0');
      const mm = String(Math.round((hourFloat % 1) * 60)).padStart(2, '0');
      return new Date(`${nextY}-${nextM}-${nextD}T${hh}:${mm}:00+08:00`);
    };

    // Helper: advance to start of next Manila day at shiftStartHour
    const advanceToNextDayStart = (d: Date): Date => {
      return createManilaDate(getManilaDateString(d), 1, shiftStartHour);
    };

    let current = new Date(start);
    let remainingHours = slaHours;
    let guard = 0; // safety guard to avoid infinite loops

    while (remainingHours > 0 && guard < 365) {
      guard++;
      const dateString = getManilaDateString(current);
      const isOfficeDay = await this.attendanceService.isOfficeDay(dateString);

      if (!isOfficeDay) {
        current = advanceToNextDayStart(current);
        continue;
      }

      const manilaHour = getManilaHour(current);

      const blocks = [];
      if (shiftStartHour < 12) blocks.push({ start: shiftStartHour, end: Math.min(shiftEndHour, 12) });
      if (shiftEndHour > 13) blocks.push({ start: Math.max(shiftStartHour, 13), end: shiftEndHour });

      const currentBlockIndex = blocks.findIndex((b) => manilaHour < b.end);

      if (currentBlockIndex === -1) {
        current = advanceToNextDayStart(current);
        continue;
      }

      const block = blocks[currentBlockIndex];

      if (manilaHour < block.start) {
        current = createManilaDate(getManilaDateString(current), 0, block.start);
        continue;
      }

      const availableHoursInBlock = block.end - manilaHour;

      if (remainingHours <= availableHoursInBlock) {
        current = new Date(current.getTime() + Math.round(remainingHours * 3600 * 1000));
        remainingHours = 0;
      } else {
        remainingHours -= availableHoursInBlock;
        current = createManilaDate(getManilaDateString(current), 0, block.end);
      }
    }

    return current;
  }

  /** Exposes the shared business-time calculator to scheduled alert processing. */
  async calculateBusinessSecondsForSla(start: Date, end: Date, config: TicketingConfig): Promise<number> {
    return this.calculateBusinessSeconds(start, end, config);
  }

  private async recalculateActiveSlaDeadlines(): Promise<void> {
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    if (!config) return;

    const tickets = await this.ticketRepo.find({
      where: { status: In([TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]) },
      relations: ['issueTypeConfig'],
    });
    const now = new Date();

    for (const ticket of tickets) {
      if (!ticket.slaDeadline || !ticket.createdAt || !ticket.issueTypeConfig?.slaHours) continue;
      const elapsedSeconds = await this.calculateBusinessSeconds(ticket.createdAt, now, config);
      const remainingHours = ticket.issueTypeConfig.slaHours -
        Math.max(0, elapsedSeconds - (ticket.accumulatedPauseSeconds || 0)) / 3600;
      if (remainingHours <= 0) continue;

      const adjustedDeadline = await this.calculateSlaDeadline(now, remainingHours, config);
      if (adjustedDeadline.getTime() === new Date(ticket.slaDeadline).getTime()) continue;
      ticket.slaDeadline = adjustedDeadline;
      await this.ticketRepo.save(ticket);
      await this.logEvent(ticket.id, 'sla_deadline_adjusted', null, {
        reason: 'office_day_changed',
      });
    }
  }

  private async calculateBusinessSeconds(
    start: Date,
    end: Date,
    config: TicketingConfig,
  ): Promise<number> {
    start = new Date(start);
    start.setMilliseconds(0);
    end = new Date(end);
    end.setMilliseconds(0);
    if (end <= start) return 0;
    const TZ = 'Asia/Manila';

    const parseTime = (timeStr: string, defaultHour: number): number => {
      if (!timeStr) return defaultHour;
      const match = timeStr.match(/^(\d{2}):(\d{2})/);
      return match ? parseInt(match[1], 10) + parseInt(match[2], 10) / 60 : defaultHour;
    };

    let shiftStartHour = 8;
    let shiftEndHour = 17;

    if (config.scheduleMode === 'CWW') {
      shiftStartHour = parseTime(config.cwwClockinStart, 7);
      shiftEndHour = parseTime(config.cwwClockoutStart, 18);
    } else {
      shiftStartHour = parseTime(config.officeClockin, 8);
      shiftEndHour = parseTime(config.officeClockout, 17);
    }

    const getManilaHour = (d: Date): number => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(d);
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
      const second = parseInt(parts.find((p) => p.type === 'second')?.value ?? '0', 10);
      return hour + minute / 60 + second / 3600;
    };

    const getManilaDateString = (d: Date): string => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    };

    const createManilaDate = (baseDateStr: string, addDays: number, hourFloat: number): Date => {
      const [y, m, day] = baseDateStr.split('-').map(Number);
      const temp = new Date(Date.UTC(y, m - 1, day + addDays));
      const nextY = temp.getUTCFullYear();
      const nextM = String(temp.getUTCMonth() + 1).padStart(2, '0');
      const nextD = String(temp.getUTCDate()).padStart(2, '0');
      const hh = String(Math.floor(hourFloat)).padStart(2, '0');
      const mm = String(Math.round((hourFloat % 1) * 60)).padStart(2, '0');
      return new Date(`${nextY}-${nextM}-${nextD}T${hh}:${mm}:00+08:00`);
    };

    const advanceToNextDayStart = (d: Date): Date => {
      return createManilaDate(getManilaDateString(d), 1, shiftStartHour);
    };

    let current = new Date(start);
    let seconds = 0;
    let guard = 0;

    while (current < end && guard < 365) {
      guard++;
      const dateString = getManilaDateString(current);
      const isOfficeDay = await this.attendanceService.isOfficeDay(dateString);

      if (!isOfficeDay) {
        current = advanceToNextDayStart(current);
        continue;
      }

      const manilaHour = getManilaHour(current);

      const blocks = [];
      if (shiftStartHour < 12) blocks.push({ start: shiftStartHour, end: Math.min(shiftEndHour, 12) });
      if (shiftEndHour > 13) blocks.push({ start: Math.max(shiftStartHour, 13), end: shiftEndHour });

      const currentBlockIndex = blocks.findIndex((b) => manilaHour < b.end);

      if (currentBlockIndex === -1) {
        current = advanceToNextDayStart(current);
        continue;
      }

      const block = blocks[currentBlockIndex];

      if (manilaHour < block.start) {
        current = createManilaDate(getManilaDateString(current), 0, block.start);
        if (current >= end) break;
        continue;
      }

      const endManilaHour = getManilaHour(end);
      const endsToday = getManilaDateString(current) === getManilaDateString(end);

      let effectiveEndHour = block.end;
      if (endsToday && endManilaHour < block.end) {
        effectiveEndHour = endManilaHour;
      }

      const hoursThisBlock = effectiveEndHour - manilaHour;
      if (hoursThisBlock > 0) {
        seconds += hoursThisBlock * 3600;
      }

      if (endsToday && endManilaHour <= block.end) {
        break;
      }

      current = createManilaDate(getManilaDateString(current), 0, block.end);
    }

    return Math.round(seconds);
  }

  async unpauseNextWaitingTicket(
    techId: number,
    trigger: string = 'auto_assigned',
  ): Promise<boolean> {
    const waitingTicket = await this.ticketRepo.findOne({
      where: {
        assignedToId: techId,
        isSlaWaiting: true,
        status: In([TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.PAUSE]),
      },
      order: { createdAt: 'ASC' },
    });

    if (!waitingTicket) return false;

    waitingTicket.isSlaWaiting = false;
    waitingTicket.lastAssignedAt = new Date();

    if (!waitingTicket.slaDeadline) {
      if (waitingTicket.issueTypeId) {
        const issueType = await this.settingsService
          .getIssueTypeById(waitingTicket.issueTypeId)
          .catch(() => null);
        if (issueType?.slaHours) {
          const slaConfig = await this.configRepo.findOne({ where: { id: 1 } }).catch(() => null);
          waitingTicket.slaDeadline = slaConfig
            ? await this.calculateSlaDeadline(new Date(), issueType.slaHours, slaConfig)
            : (() => {
              const d = new Date();
              d.setHours(d.getHours() + issueType.slaHours);
              return d;
            })();
        }
      }
    } else if (waitingTicket.slaPausedAt) {
      const now = new Date();
      const config = await this.configRepo.findOne({ where: { id: 1 } });
      const businessSecondsElapsed = await this.calculateBusinessSeconds(
        waitingTicket.slaPausedAt,
        now,
        config as TicketingConfig,
      );
      waitingTicket.accumulatedPauseSeconds =
        (waitingTicket.accumulatedPauseSeconds || 0) + businessSecondsElapsed;

      if (waitingTicket.issueTypeId) {
        const issueType = await this.settingsService
          .getIssueTypeById(waitingTicket.issueTypeId)
          .catch(() => null);
        if (issueType?.slaHours) {
          const totalBusinessSecondsSinceCreation = await this.calculateBusinessSeconds(
            new Date(waitingTicket.createdAt),
            now,
            config as TicketingConfig,
          );
          const activeBusinessSeconds = Math.max(0, totalBusinessSecondsSinceCreation - waitingTicket.accumulatedPauseSeconds);
          const consumedSlaHours = activeBusinessSeconds / 3600;
          const remainingHours = Math.max(0, issueType.slaHours - consumedSlaHours);
          waitingTicket.slaDeadline = await this.calculateSlaDeadline(
            now,
            remainingHours,
            config as TicketingConfig,
          );
        }
      }
      waitingTicket.slaPausedAt = null;
    }

    await this.ticketRepo.save(waitingTicket);

    let technicianName = 'System';
    try {
      const resolvedByTech = await this.usersHttpClient.getUserById(techId);
      if (resolvedByTech) {
        technicianName =
          [resolvedByTech.first_name, resolvedByTech.last_name].filter(Boolean).join(' ') ||
          resolvedByTech.email;
      }
    } catch { }

    this.logEvent(waitingTicket.id, trigger, null, {
      technicianId: techId,
      technicianName,
      note: 'Unstacked from waiting list',
    }).catch(() => { });

    this.logger.log(
      `Unstacked waiting ticket ${waitingTicket.ticketNumber} for technician #${techId}`,
    );
    return true;
  }

  async unpauseNextWaitingTicketAndSetInProgress(
    techId: number,
    trigger: string = 'auto_assigned',
  ): Promise<boolean> {
    const waitingTicket = await this.ticketRepo.findOne({
      where: {
        assignedToId: techId,
        isSlaWaiting: true,
        status: In([TicketStatus.ASSIGNED, TicketStatus.PAUSE]),
      },
      order: { createdAt: 'ASC' },
    });

    if (!waitingTicket) return false;

    waitingTicket.isSlaWaiting = false;
    waitingTicket.status = TicketStatus.IN_PROGRESS;
    waitingTicket.lastAssignedAt = new Date();

    if (!waitingTicket.slaDeadline) {
      if (waitingTicket.issueTypeId) {
        const issueType = await this.settingsService
          .getIssueTypeById(waitingTicket.issueTypeId)
          .catch(() => null);
        if (issueType?.slaHours) {
          const slaConfig = await this.configRepo.findOne({ where: { id: 1 } }).catch(() => null);
          waitingTicket.slaDeadline = slaConfig
            ? await this.calculateSlaDeadline(new Date(), issueType.slaHours, slaConfig)
            : (() => {
              const d = new Date();
              d.setHours(d.getHours() + issueType.slaHours);
              return d;
            })();
        }
      }
    } else if (waitingTicket.slaPausedAt) {
      const now = new Date();
      const config = await this.configRepo.findOne({ where: { id: 1 } });
      const businessSecondsElapsed = await this.calculateBusinessSeconds(
        waitingTicket.slaPausedAt,
        now,
        config as TicketingConfig,
      );
      waitingTicket.accumulatedPauseSeconds =
        (waitingTicket.accumulatedPauseSeconds || 0) + businessSecondsElapsed;

      if (waitingTicket.issueTypeId) {
        const issueType = await this.settingsService
          .getIssueTypeById(waitingTicket.issueTypeId)
          .catch(() => null);
        if (issueType?.slaHours) {
          const totalBusinessSecondsSinceCreation = await this.calculateBusinessSeconds(
            new Date(waitingTicket.createdAt),
            now,
            config as TicketingConfig,
          );
          const activeBusinessSeconds = Math.max(0, totalBusinessSecondsSinceCreation - waitingTicket.accumulatedPauseSeconds);
          const consumedSlaHours = activeBusinessSeconds / 3600;
          const remainingHours = Math.max(0, issueType.slaHours - consumedSlaHours);
          waitingTicket.slaDeadline = await this.calculateSlaDeadline(
            now,
            remainingHours,
            config as TicketingConfig,
          );
        }
      }
      waitingTicket.slaPausedAt = null;
    }

    await this.ticketRepo.save(waitingTicket);

    let technicianName = 'System';
    try {
      const resolvedByTech = await this.usersHttpClient.getUserById(techId);
      if (resolvedByTech) {
        technicianName =
          [resolvedByTech.first_name, resolvedByTech.last_name].filter(Boolean).join(' ') ||
          resolvedByTech.email;
      }
    } catch { }

    this.logEvent(waitingTicket.id, trigger, null, {
      technicianId: techId,
      technicianName,
      note: 'Unstacked from waiting list and set to IN_PROGRESS',
    }).catch(() => { });

    this.logEvent(waitingTicket.id, 'status_changed', null, {
      to: 'in_progress'
    }).catch(() => { });

    this.logger.log(
      `Unstacked waiting ticket ${waitingTicket.ticketNumber} and set to IN_PROGRESS for technician #${techId}`,
    );
    return true;
  }

  /**
   * Called by TicketCronService to retry generating KBs that failed due to API limits.
   */
  async retryBenchedKbs() {
    const pendingTickets = await this.ticketRepo.find({
      where: {
        status: TicketStatus.RESOLVED,
        isKbGenerationPending: true,
      },
    });

    if (pendingTickets.length === 0) {
      return;
    }

    this.logger.log(`Found ${pendingTickets.length} benched KB generations. Retrying...`);

    for (const ticket of pendingTickets) {
      if (!ticket.resolutionNotes) continue;

      try {
        await this.kbService.generateKbFromTicket(
          ticket.subject,
          ticket.description,
          ticket.resolutionNotes,
        );

        await this.ticketRepo.update(ticket.id, { isKbGenerationPending: false });
        this.logger.log(`Successfully recovered and generated KB for ticket ${ticket.ticketNumber}`);

        // Wait 15 seconds between requests to avoid rate limits again
        await new Promise((resolve) => setTimeout(resolve, 15000));
      } catch (err) {
        this.logger.warn(
          `Retry failed for ticket ${ticket.ticketNumber}, keeping benched: ${err.message}`,
        );
        // If it fails again (e.g. rate limit still active), just break out of the loop and try again next hour
        if (err.message.includes('429') || err.message.includes('503')) {
          this.logger.warn('API limit encountered during retry. Aborting current retry queue.');
          break;
        }
      }
    }
  }

  async getPerformanceMetrics(filters: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    technicianId?: number;
    ticketType?: string;
    viewerId?: number;
    viewerRole?: string;
  }) {
    const isTicketSettingsViewer = this.roleCapSvc.isTicketSettingsFocal(filters.viewerRole || '');
    const isTechnician =
      filters.viewerRole &&
      !isTicketSettingsViewer &&
      this.roleCapSvc.isTechnician(filters.viewerRole);

    const techIdFilter = isTechnician
      ? filters.viewerId
      : isTicketSettingsViewer
        ? filters.technicianId
        : undefined;

    const qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
      
      .where("ticket.status != 'duplicate'");

    if (filters.year) qb.andWhere('YEAR(ticket.createdAt) = :year', { year: filters.year });
    if (filters.month) qb.andWhere('MONTH(ticket.createdAt) = :month', { month: filters.month });
    if (filters.quarter) qb.andWhere('QUARTER(ticket.createdAt) = :quarter', { quarter: filters.quarter });
    if (filters.semester) {
      if (filters.semester === 1) qb.andWhere('MONTH(ticket.createdAt) BETWEEN 1 AND 6');
      else qb.andWhere('MONTH(ticket.createdAt) BETWEEN 7 AND 12');
    }
    if (techIdFilter) qb.andWhere('ticket.assignedToId = :techId', { techId: techIdFilter });
    if (filters.ticketType) qb.andWhere('ticket.ticketType = :ticketType', { ticketType: filters.ticketType });

    const tickets = await qb.getMany();

    const avgResolutionByTechnician: any[] = [];
    const slaComplianceByMonthMap = new Map<string, { met: number; missed: number }>();
    const escalationRateByTechnician: any[] = [];

    const techStats = new Map<number, { techName: string; totalHours: number; resCount: number; totalTickets: number; escalatedCount: number }>();

    const ticketIds = tickets.map(t => t.id);
    const escalationsMap = new Map();
    if (ticketIds.length > 0) {
      const escalations = await this.escalationRepo.createQueryBuilder('esc')
        .where('esc.ticketId IN (:...ticketIds)', { ticketIds })
        .getMany();
      escalations.forEach(e => {
        escalationsMap.set(e.ticketId, true);
      });
    }

    for (const t of tickets) {
      const monthLabel = t.createdAt.toLocaleString('default', { month: 'short' });
      if (!slaComplianceByMonthMap.has(monthLabel)) {
        slaComplianceByMonthMap.set(monthLabel, { met: 0, missed: 0 });
      }
      
      const isResolvedOrClosed = t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED;

      let missed = false;
      if (t.slaDeadline) {
        if (t.resolvedAt) {
          missed = t.resolvedAt > t.slaDeadline;
        } else {
          missed = new Date() > t.slaDeadline;
        }
      }

      if (missed) {
        slaComplianceByMonthMap.get(monthLabel)!.missed += 1;
      } else if (isResolvedOrClosed) {
        slaComplianceByMonthMap.get(monthLabel)!.met += 1;
      }

      if (t.assignedToId && t.assignedTo) {
        if (!techStats.has(t.assignedToId)) {
          techStats.set(t.assignedToId, {
            techName: [t.assignedTo.first_name, t.assignedTo.last_name].filter(Boolean).join(' ') || t.assignedTo.email,
            totalHours: 0,
            resCount: 0,
            totalTickets: 0,
            escalatedCount: 0,
          });
        }
        
        const stat = techStats.get(t.assignedToId)!;
        stat.totalTickets += 1;
        
        if (escalationsMap.has(t.id)) {
          stat.escalatedCount += 1;
        }

        if (isResolvedOrClosed && t.resolvedAt) {
          const ms = t.resolvedAt.getTime() - t.createdAt.getTime();
          stat.totalHours += ms / (1000 * 60 * 60);
          stat.resCount += 1;
        }
      }
    }

    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const slaComplianceByMonth = monthsOrder
      .filter(m => slaComplianceByMonthMap.has(m))
      .map(m => {
        const data = slaComplianceByMonthMap.get(m)!;
        const total = data.met + data.missed;
        return {
          month: m,
          met: data.met,
          missed: data.missed,
          rate: total > 0 ? (data.met / total) * 100 : 0
        };
      });

    for (const [techId, stat] of techStats.entries()) {
      if (stat.resCount > 0) {
        avgResolutionByTechnician.push({
          techId,
          techName: stat.techName,
          avgHours: stat.totalHours / stat.resCount,
          count: stat.resCount
        });
      }
      if (stat.totalTickets > 0) {
        escalationRateByTechnician.push({
          techId,
          techName: stat.techName,
          totalTickets: stat.totalTickets,
          escalatedCount: stat.escalatedCount,
          rate: (stat.escalatedCount / stat.totalTickets) * 100
        });
      }
    }

    avgResolutionByTechnician.sort((a, b) => a.avgHours - b.avgHours);
    escalationRateByTechnician.sort((a, b) => b.rate - a.rate);

    return {
      avgResolutionByTechnician,
      slaComplianceByMonth,
      escalationRateByTechnician
    };
  }

  async getIssueCountsReport(filters: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    technicianId?: string;
    ticketType?: string;
  }): Promise<{ issueName: string; count: number; categoryName: string; status: string }[]> {
    const qb = this.ticketRepo.createQueryBuilder('ticket')
      .leftJoin('ticket.issueTypeConfig', 'issueType')
      .leftJoin('issueType.category', 'category')
      .select('issueType.name', 'issueName')
      .addSelect('category.name', 'categoryName')
      .addSelect('ticket.status', 'status')
      .addSelect('COUNT(ticket.id)', 'count')
      .where('ticket.issueTypeId IS NOT NULL')
      .groupBy('issueType.name')
      .addGroupBy('category.name')
      .addGroupBy('ticket.status');

    qb.andWhere("ticket.status != 'duplicate'");

    if (filters.year) {
      qb.andWhere('YEAR(ticket.createdAt) = :year', { year: filters.year });
    }
    if (filters.month) {
      qb.andWhere('MONTH(ticket.createdAt) = :month', { month: filters.month });
    }
    if (filters.quarter) {
      qb.andWhere('QUARTER(ticket.createdAt) = :quarter', { quarter: filters.quarter });
    }
    if (filters.semester) {
      if (filters.semester === 1) {
        qb.andWhere('MONTH(ticket.createdAt) BETWEEN 1 AND 6');
      } else {
        qb.andWhere('MONTH(ticket.createdAt) BETWEEN 7 AND 12');
      }
    }
    if (filters.technicianId) {
      qb.andWhere('ticket.assignedToId = :techId', { techId: filters.technicianId });
    }
    if (filters.ticketType) {
      qb.andWhere('ticket.ticketType = :ticketType', { ticketType: filters.ticketType });
    }

    const raw = await qb.getRawMany();
    return raw.map(r => ({
      issueName: r.issueName,
      categoryName: r.categoryName,
      status: r.status,
      count: Number(r.count),
    }));
  }
}
