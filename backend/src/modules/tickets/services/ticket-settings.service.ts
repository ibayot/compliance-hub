import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TicketCategoryConfig } from '../entities/ticket-category.entity';
import { TicketKeywordRule } from '../entities/ticket-keyword-rule.entity';
import { TicketIssueType } from '../entities/ticket-issue-type.entity';
import { EscalationFocalConfig } from '../entities/escalation-focal-config.entity';
import { RoleDefinitionEntity } from '../../users/entities/role-definition.entity';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { Ticket } from '../entities/ticket.entity';

// --- DTOs ------------------------------------------------------------------

export interface CreateCategoryDto {
  name: string;
  ticketType: string; // 'desktop_support' | 'it_support' | 'pantawid_ict_support'
  description?: string;
  slaHours?: number | null;
  allowablePauseHours?: number | null;
}

export interface UpdateCategoryDto {
  name?: string;
  ticketType?: string;
  description?: string;
  isActive?: boolean;
  slaHours?: number | null;
  allowablePauseHours?: number | null;
}

export interface CreateKeywordRuleDto {
  keyword?: string; // legacy single keyword — kept for compat
  keywords?: string[]; // preferred: multiple keywords for this rule
  targetTicketType: string;
  targetCategoryId?: string;
}

export interface UpdateKeywordRuleDto {
  keyword?: string;
  keywords?: string[];
  targetTicketType?: string;
  targetCategoryId?: string | null;
  isActive?: boolean;
}

export interface CreateEscalationFocalDto {
  ticketType: string;
  userId: number;
  label: string;
}

export interface CreateIssueTypeDto {
  name: string;
  description?: string;
  categoryId?: string | null;
}

export interface UpdateIssueTypeDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  categoryId?: string | null;
}

export interface UpdateGlobalConfigDto {
  assignmentStrategy?: string;
  roundRobinCapHours?: number;
  autoCloseDays?: number;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFrom?: string | null;
  smtpFromName?: string | null;
  primarySmtpDailyLimit?: number;
  scheduleMode?: string;
  officeClockin?: string;
  officeClockout?: string;
  cwwClockinStart?: string;
  cwwClockinEnd?: string;
  cwwClockoutStart?: string;
  cwwClockoutEnd?: string;
  isFlagCeremonyPaused?: boolean;
}

// --- Service ----------------------------------------------------------------

@Injectable()
export class TicketSettingsService {
  private readonly logger = new Logger(TicketSettingsService.name);

  constructor(
    @InjectRepository(TicketCategoryConfig)
    private readonly categoryRepo: Repository<TicketCategoryConfig>,
    @InjectRepository(TicketKeywordRule)
    private readonly keywordRepo: Repository<TicketKeywordRule>,
    @InjectRepository(TicketIssueType)
    private readonly issueTypeRepo: Repository<TicketIssueType>,
    @InjectRepository(EscalationFocalConfig)
    private readonly escalationFocalRepo: Repository<EscalationFocalConfig>,
    @InjectRepository(RoleDefinitionEntity)
    private readonly roleDefRepo: Repository<RoleDefinitionEntity>,
    @InjectRepository(TicketingConfig)
    private readonly configRepo: Repository<TicketingConfig>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly roleCapSvc: RoleCapabilitiesService,
  ) { }

  // ── Categories ──────────────────────────────────────────────────────────

  async listCategories(ticketType?: string): Promise<TicketCategoryConfig[]> {
    const where: any = { isDeleted: false };
    if (ticketType) where.ticketType = ticketType;
    return this.categoryRepo.find({ where, order: { name: 'ASC' } });
  }

  async listActiveCategories(ticketType?: string): Promise<TicketCategoryConfig[]> {
    const where: any = { isActive: true, isDeleted: false };
    if (ticketType) where.ticketType = ticketType;
    return this.categoryRepo.find({ where, order: { name: 'ASC' } });
  }

  async getCategoryById(id: string): Promise<TicketCategoryConfig> {
    const cat = await this.categoryRepo.findOne({ where: { id, isDeleted: false } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  async createCategory(dto: CreateCategoryDto, actorId: number): Promise<TicketCategoryConfig> {
    if (!dto.name?.trim()) throw new BadRequestException('Category name is required');
    if (!['desktop_support', 'it_support', 'pantawid_ict_support'].includes(dto.ticketType)) {
      throw new BadRequestException(
        'ticketType must be desktop_support, it_support, or pantawid_ict_support',
      );
    }

    const key = dto.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');

    const existing = await this.categoryRepo.findOne({ where: { key, isDeleted: false } });
    if (existing) throw new BadRequestException(`Category key "${key}" already exists`);

    // Reactivate soft-deleted category with same key if it exists
    const softDeleted = await this.categoryRepo.findOne({ where: { key, isDeleted: true } });
    if (softDeleted) {
      softDeleted.name = dto.name.trim();
      softDeleted.ticketType = dto.ticketType;
      softDeleted.description = dto.description?.trim() || null;
      softDeleted.isActive = true;
      softDeleted.isDeleted = false;
      softDeleted.created_by = actorId;
      softDeleted.updated_by = actorId;
      if (dto.slaHours !== undefined) softDeleted.slaHours = dto.slaHours;
      if (dto.allowablePauseHours !== undefined)
        softDeleted.allowablePauseHours = dto.allowablePauseHours ?? 48;
      return this.categoryRepo.save(softDeleted);
    }

    if (dto.slaHours !== undefined && dto.slaHours !== null) {
      if (dto.slaHours < 0 || dto.slaHours > 168) {
        throw new BadRequestException('SLA hours must be between 0 and 168');
      }
    }

    if (dto.allowablePauseHours !== undefined && dto.allowablePauseHours !== null) {
      if (dto.allowablePauseHours < 0 || dto.allowablePauseHours > 168) {
        throw new BadRequestException('Allowable Pause Hours must be between 0 and 168');
      }
    }

    const cat = this.categoryRepo.create({
      key,
      name: dto.name.trim(),
      ticketType: dto.ticketType,
      description: dto.description?.trim() || null,
      slaHours: dto.slaHours ?? null,
      allowablePauseHours: dto.allowablePauseHours ?? 48,
      isActive: (dto.slaHours ?? null) !== null,
      isDeleted: false,
      created_by: actorId,
      updated_by: actorId,
    });
    return this.categoryRepo.save(cat);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    actorId: number,
  ): Promise<TicketCategoryConfig> {
    const cat = await this.getCategoryById(id);

    if (dto.name !== undefined) {
      cat.name = dto.name.trim();
      cat.key = dto.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
    }
    if (dto.ticketType !== undefined) {
      if (!['desktop_support', 'it_support', 'pantawid_ict_support'].includes(dto.ticketType)) {
        throw new BadRequestException(
          'ticketType must be desktop_support, it_support, or pantawid_ict_support',
        );
      }
      cat.ticketType = dto.ticketType;
    }
    if (dto.description !== undefined) cat.description = dto.description?.trim() || null;

    if (dto.slaHours !== undefined) {
      if (dto.slaHours !== null && (dto.slaHours < 0 || dto.slaHours > 168)) {
        throw new BadRequestException('SLA hours must be between 0 and 168');
      }
      cat.slaHours = dto.slaHours ?? null;
      if (cat.slaHours === null) {
        cat.isActive = false; // Force inactive if SLA is blank
      }
    }

    if (dto.allowablePauseHours !== undefined) {
      if (
        dto.allowablePauseHours !== null &&
        (dto.allowablePauseHours < 0 || dto.allowablePauseHours > 168)
      ) {
        throw new BadRequestException('Allowable Pause Hours must be between 0 and 168');
      }
      cat.allowablePauseHours = dto.allowablePauseHours ?? 48;
    }

    if (dto.isActive !== undefined) {
      // Don't allow activating if SLA is blank
      if (dto.isActive && cat.slaHours === null) {
        throw new BadRequestException('Cannot activate category with blank SLA');
      }
      cat.isActive = dto.isActive;
    }

    cat.updated_by = actorId;

    return this.categoryRepo.save(cat);
  }

  async deleteCategory(id: string, actorId: number): Promise<void> {
    const cat = await this.getCategoryById(id);
    cat.isDeleted = true;
    cat.isActive = false;
    cat.updated_by = actorId;
    await this.categoryRepo.save(cat);
  }

  // ── Keyword Rules ──────────────────────────────────────────────────────

  async listKeywordRules(): Promise<TicketKeywordRule[]> {
    return this.keywordRepo.find({
      relations: ['targetCategory'],
      order: { keyword: 'ASC' },
    });
  }

  async getKeywordRuleById(id: string): Promise<TicketKeywordRule> {
    const rule = await this.keywordRepo.findOne({ where: { id }, relations: ['targetCategory'] });
    if (!rule) throw new NotFoundException(`Keyword rule ${id} not found`);
    return rule;
  }

  async createKeywordRule(dto: CreateKeywordRuleDto, actorId: number): Promise<TicketKeywordRule> {
    // Support both multi-keyword and single-keyword creation
    const kwList: string[] =
      dto.keywords && dto.keywords.length > 0
        ? dto.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)
        : dto.keyword?.trim()
          ? [dto.keyword.trim().toLowerCase()]
          : [];

    if (kwList.length === 0) throw new BadRequestException('At least one keyword is required');
    if (!['desktop_support', 'it_support', 'pantawid_ict_support'].includes(dto.targetTicketType)) {
      throw new BadRequestException(
        'targetTicketType must be desktop_support, it_support, or pantawid_ict_support',
      );
    }

    const rule = this.keywordRepo.create({
      keyword: kwList[0],
      keywords: JSON.stringify(kwList),
      targetTicketType: dto.targetTicketType,
      targetCategoryId: dto.targetCategoryId || null,
      isActive: true,
      createdBy: actorId,
    });
    return this.keywordRepo.save(rule);
  }

  async updateKeywordRule(id: string, dto: UpdateKeywordRuleDto): Promise<TicketKeywordRule> {
    const rule = await this.getKeywordRuleById(id);

    if (dto.keywords !== undefined && dto.keywords.length > 0) {
      const kwList = dto.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
      rule.keywords = JSON.stringify(kwList);
      rule.keyword = kwList[0]; // keep primary keyword in sync
    } else if (dto.keyword !== undefined) {
      rule.keyword = dto.keyword.trim().toLowerCase();
      // Rebuild the JSON array keeping the new primary as first
      const existing: string[] = rule.keywords ? JSON.parse(rule.keywords) : [rule.keyword];
      existing[0] = rule.keyword;
      rule.keywords = JSON.stringify(existing);
    }
    if (dto.targetTicketType !== undefined) {
      if (
        !['desktop_support', 'it_support', 'pantawid_ict_support'].includes(dto.targetTicketType)
      ) {
        throw new BadRequestException(
          'targetTicketType must be desktop_support, it_support, or pantawid_ict_support',
        );
      }
      rule.targetTicketType = dto.targetTicketType;
    }
    if (dto.targetCategoryId !== undefined) rule.targetCategoryId = dto.targetCategoryId || null;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;

    return this.keywordRepo.save(rule);
  }

  async deleteKeywordRule(id: string): Promise<void> {
    const rule = await this.getKeywordRuleById(id);
    await this.keywordRepo.remove(rule);
  }

  // ── Issue Types ───────────────────────────────────────────────────────

  async listIssueTypes(categoryId?: string): Promise<TicketIssueType[]> {
    const qb = this.issueTypeRepo
      .createQueryBuilder('it')
      .leftJoinAndSelect('it.category', 'category')
      .where('it.is_deleted = :deleted', { deleted: false })
      .orderBy('it.name', 'ASC');

    if (categoryId) {
      qb.andWhere('it.category_id = :categoryId', { categoryId });
    }

    return qb.getMany();
  }

  async listActiveIssueTypes(categoryId?: string): Promise<TicketIssueType[]> {
    const qb = this.issueTypeRepo
      .createQueryBuilder('it')
      .leftJoinAndSelect('it.category', 'category')
      .where('it.is_deleted = :deleted', { deleted: false })
      .andWhere('it.is_active = :active', { active: true })
      .orderBy('it.name', 'ASC');

    if (categoryId) {
      qb.andWhere('it.category_id = :categoryId', { categoryId });
    }

    return qb.getMany();
  }

  async getIssueTypeById(id: string): Promise<TicketIssueType> {
    const issueType = await this.issueTypeRepo.findOne({
      where: { id, is_deleted: false },
      relations: ['category'],
    });
    if (!issueType) throw new NotFoundException(`Issue type ${id} not found`);
    return issueType;
  }

  async createIssueType(dto: CreateIssueTypeDto, actorId: number): Promise<TicketIssueType> {
    if (!dto.name?.trim()) throw new BadRequestException('Issue type name is required');

    const key = dto.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');
    const existing = await this.issueTypeRepo.findOne({ where: { key, is_deleted: false } });
    if (existing) throw new BadRequestException(`Issue type key "${key}" already exists`);

    if (dto.categoryId) {
      await this.getCategoryById(dto.categoryId);
    }

    const issueType = this.issueTypeRepo.create({
      key,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      is_active: true,
      is_deleted: false,
      category_id: dto.categoryId || null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.issueTypeRepo.save(issueType);
  }

  async updateIssueType(
    id: string,
    dto: UpdateIssueTypeDto,
    actorId: number,
  ): Promise<TicketIssueType> {
    const issueType = await this.getIssueTypeById(id);

    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BadRequestException('Issue type name is required');
      issueType.name = dto.name.trim();
      issueType.key = dto.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
    }
    if (dto.description !== undefined) issueType.description = dto.description?.trim() || null;
    if (dto.isActive !== undefined) issueType.is_active = dto.isActive;
    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        await this.getCategoryById(dto.categoryId);
      }
      issueType.category_id = dto.categoryId || null;
    }
    issueType.updated_by = actorId;

    return this.issueTypeRepo.save(issueType);
  }

  async deleteIssueType(id: string, actorId: number): Promise<void> {
    const issueType = await this.getIssueTypeById(id);
    issueType.is_deleted = true;
    issueType.is_active = false;
    issueType.updated_by = actorId;
    await this.issueTypeRepo.save(issueType);
  }

  /** Find the first matching keyword rule for a given text (subject + description) */
  async matchKeywordRules(text: string): Promise<TicketKeywordRule | null> {
    const rules = await this.keywordRepo.find({
      where: { isActive: true },
      relations: ['targetCategory'],
    });

    const lower = text.toLowerCase();

    // Build a flat list of (rule, keyword) pairs sorted by keyword length descending
    const pairs: Array<{ rule: TicketKeywordRule; kw: string }> = [];
    for (const rule of rules) {
      const kwList: string[] = rule.keywords ? JSON.parse(rule.keywords) : [rule.keyword];
      for (const kw of kwList) {
        pairs.push({ rule, kw });
      }
    }
    pairs.sort((a, b) => b.kw.length - a.kw.length);

    for (const { rule, kw } of pairs) {
      if (lower.includes(kw)) return rule;
    }
    return null;
  }

  // ── Escalation Focal Configuration ──────────────────────────────────────

  /** List configured escalation focals  (QA #3, #9) */
  async listEscalationFocals(ticketType?: string): Promise<EscalationFocalConfig[]> {
    const where: any = {};
    if (ticketType) {
      where.ticketType = In([ticketType, 'all']);
    }
    return this.escalationFocalRepo.find({ where, order: { ticketType: 'ASC', label: 'ASC' } });
  }

  async listAvailableEscalationUsers(): Promise<{ value: string; label: string }[]> {
    const rows = await this.roleDefRepo.find();
    const focalRoles = rows.filter((r) => this.roleCapSvc.isEscalationFocal(r.value));
    const roleMap = new Map(focalRoles.map((r) => [r.value, r.label]));

    // Fetch users with focal roles
    const users = await this.categoryRepo.manager.query(
      `SELECT id, first_name, last_name, email, role FROM users WHERE active = 1`,
    );

    const focalUsers = users.filter((u: any) => roleMap.has(u.role));

    return focalUsers.map((u: any) => {
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
      return {
        value: String(u.id),
        label: `${name} - ${roleMap.get(u.role)}`,
      };
    });
  }

  /** Add a role as an escalation focal for a ticket type (QA #3, #13) */
  async addEscalationFocal(
    dto: CreateEscalationFocalDto,
    actorId: number,
  ): Promise<EscalationFocalConfig> {
    const validTypes = ['desktop_support', 'it_support', 'pantawid_ict_support', 'all'];
    if (!validTypes.includes(dto.ticketType)) {
      throw new BadRequestException(`ticketType must be one of: ${validTypes.join(', ')}`);
    }

    // Role validation is bypassed here because the dropdown passes user IDs (String) as the "roleValue"
    // instead of actual role identifiers to ensure uniqueness of target individuals.

    const userId = Number(dto.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('userId must be a valid user id');
    }

    const existing = await this.escalationFocalRepo.findOne({
      where: { ticketType: dto.ticketType, userId },
    });
    if (existing)
      throw new BadRequestException(
        'This user is already configured as an escalation focal for that ticket type.',
      );


    const user = await this.categoryRepo.manager.query(
      `SELECT id, first_name, last_name, email, role FROM users WHERE id = ? AND active = 1`,
      [userId],
    );
    if (!user || user.length === 0) {
      throw new BadRequestException('Selected user does not exist or is inactive.');
    }

    if (!this.roleCapSvc.isEscalationFocal(user[0].role)) {
      throw new BadRequestException('Selected user is not eligible to be an escalation focal.');
    }

    const name = [user[0].first_name, user[0].last_name].filter(Boolean).join(' ') || user[0].email;

    const config = this.escalationFocalRepo.create({
      ticketType: dto.ticketType,
      userId,
      label: dto.label?.trim() || name,
      createdById: actorId,
    });
    return this.escalationFocalRepo.save(config);
  }

  /** Remove an escalation focal config */
  async removeEscalationFocal(id: number): Promise<void> {
    const config = await this.escalationFocalRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException(`Escalation focal config ${id} not found`);
    await this.escalationFocalRepo.remove(config);
  }

  // ── Global Config ───────────────────────────────────────────────────────

  async getGlobalConfig(): Promise<TicketingConfig> {
    let config = await this.configRepo.findOne({ where: { id: 1 } });
    if (!config) {
      config = this.configRepo.create({
        id: 1,
        assignmentStrategy: 'CURRENT_AUTO',
        roundRobinCapHours: 80,
      });
      await this.configRepo.save(config);
    }
    return config;
  }

  async updateGlobalConfig(dto: UpdateGlobalConfigDto): Promise<TicketingConfig> {
    const config = await this.getGlobalConfig();
    if (dto.assignmentStrategy !== undefined) config.assignmentStrategy = dto.assignmentStrategy;
    if (dto.roundRobinCapHours !== undefined) config.roundRobinCapHours = dto.roundRobinCapHours;
    if (dto.autoCloseDays !== undefined) config.autoCloseDays = dto.autoCloseDays;

    if (dto.smtpHost !== undefined) config.smtpHost = dto.smtpHost;
    if (dto.smtpPort !== undefined) config.smtpPort = dto.smtpPort;
    if (dto.smtpUser !== undefined) config.smtpUser = dto.smtpUser;
    if (dto.smtpPass !== undefined) config.smtpPass = dto.smtpPass;
    if (dto.smtpFrom !== undefined) config.smtpFrom = dto.smtpFrom;
    if (dto.smtpFromName !== undefined) config.smtpFromName = dto.smtpFromName;
    if (dto.primarySmtpDailyLimit !== undefined)
      config.primarySmtpDailyLimit = dto.primarySmtpDailyLimit;

    if (dto.scheduleMode !== undefined) config.scheduleMode = dto.scheduleMode;
    if (dto.officeClockin !== undefined) config.officeClockin = dto.officeClockin;
    if (dto.officeClockout !== undefined) config.officeClockout = dto.officeClockout;
    if (dto.cwwClockinStart !== undefined) config.cwwClockinStart = dto.cwwClockinStart;
    if (dto.cwwClockinEnd !== undefined) config.cwwClockinEnd = dto.cwwClockinEnd;
    if (dto.cwwClockoutStart !== undefined) config.cwwClockoutStart = dto.cwwClockoutStart;
    if (dto.cwwClockoutEnd !== undefined) config.cwwClockoutEnd = dto.cwwClockoutEnd;
    if (dto.isFlagCeremonyPaused !== undefined)
      config.isFlagCeremonyPaused = dto.isFlagCeremonyPaused;

    return this.configRepo.save(config);
  }

  // ── SLA Insights ───────────────────────────────────────────────────────

  async getSlaInsights(days: number = 30): Promise<any[]> {
    // Calculates the average resolution time in hours per category over the last X days
    const insights = await this.ticketRepo.query(
      `
      SELECT 
        tc.name as categoryName,
        tc.sla_hours as configuredSlaHours,
        COUNT(t.id) as resolvedTicketsCount,
        AVG(TIMESTAMPDIFF(SECOND, t.created_at, t.resolved_at)) / 3600 as avgResolutionHours
      FROM tickets t
      JOIN ticket_categories tc ON t.category_id = tc.id
      WHERE t.status IN ('RESOLVED', 'CLOSED')
        AND t.resolved_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND tc.sla_hours IS NOT NULL AND tc.sla_hours > 0
      GROUP BY tc.id
    `,
      [days],
    );

    return insights.map((row: any) => ({
      categoryName: row.categoryName,
      configuredSlaHours: Number(row.configuredSlaHours),
      resolvedTicketsCount: Number(row.resolvedTicketsCount),
      avgResolutionHours: Number(row.avgResolutionHours),
      isFailingSla: Number(row.avgResolutionHours) > Number(row.configuredSlaHours),
    }));
  }
}
