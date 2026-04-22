import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketCategoryConfig } from '../entities/ticket-category.entity';
import { TicketKeywordRule } from '../entities/ticket-keyword-rule.entity';
import { EscalationFocalConfig } from '../entities/escalation-focal-config.entity';
import { RoleDefinitionEntity } from '../../users/entities/role-definition.entity';

// --- DTOs ------------------------------------------------------------------

export interface CreateCategoryDto {
  name: string;
  ticketType: string; // 'desktop_support' | 'it_support' | 'pantawid_ict_support'
  description?: string;
  slaHours?: number | null;
}

export interface UpdateCategoryDto {
  name?: string;
  ticketType?: string;
  description?: string;
  isActive?: boolean;
  slaHours?: number | null;
}

export interface CreateKeywordRuleDto {
  keyword?: string;      // legacy single keyword — kept for compat
  keywords?: string[];   // preferred: multiple keywords for this rule
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
  roleValue: string;
  label: string;
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
    @InjectRepository(EscalationFocalConfig)
    private readonly escalationFocalRepo: Repository<EscalationFocalConfig>,
    @InjectRepository(RoleDefinitionEntity)
    private readonly roleDefRepo: Repository<RoleDefinitionEntity>,
  ) {}

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
      throw new BadRequestException('ticketType must be desktop_support, it_support, or pantawid_ict_support');
    }

    const key = dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

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
      return this.categoryRepo.save(softDeleted);
    }

    const cat = this.categoryRepo.create({
      key,
      name: dto.name.trim(),
      ticketType: dto.ticketType,
      description: dto.description?.trim() || null,
      slaHours: dto.slaHours ?? null,
      isActive: true,
      isDeleted: false,
      created_by: actorId,
      updated_by: actorId,
    });
    return this.categoryRepo.save(cat);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, actorId: number): Promise<TicketCategoryConfig> {
    const cat = await this.getCategoryById(id);

    if (dto.name !== undefined) {
      cat.name = dto.name.trim();
      cat.key = dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    }
    if (dto.ticketType !== undefined) {
      if (!['desktop_support', 'it_support'].includes(dto.ticketType)) {
        throw new BadRequestException('ticketType must be desktop_support or it_support');
      }
      cat.ticketType = dto.ticketType;
    }
    if (dto.description !== undefined) cat.description = dto.description?.trim() || null;
    if (dto.isActive !== undefined) cat.isActive = dto.isActive;
    if (dto.slaHours !== undefined) cat.slaHours = dto.slaHours ?? null;
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
    const kwList: string[] = (dto.keywords && dto.keywords.length > 0)
      ? dto.keywords.map(k => k.trim().toLowerCase()).filter(Boolean)
      : (dto.keyword?.trim() ? [dto.keyword.trim().toLowerCase()] : []);

    if (kwList.length === 0) throw new BadRequestException('At least one keyword is required');
    if (!['desktop_support', 'it_support', 'pantawid_ict_support'].includes(dto.targetTicketType)) {
      throw new BadRequestException('targetTicketType must be desktop_support, it_support, or pantawid_ict_support');
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
      const kwList = dto.keywords.map(k => k.trim().toLowerCase()).filter(Boolean);
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
      if (!['desktop_support', 'it_support', 'pantawid_ict_support'].includes(dto.targetTicketType)) {
        throw new BadRequestException('targetTicketType must be desktop_support, it_support, or pantawid_ict_support');
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
      const kwList: string[] = rule.keywords
        ? JSON.parse(rule.keywords)
        : [rule.keyword];
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
    if (ticketType) where.ticketType = ticketType;
    return this.escalationFocalRepo.find({ where, order: { ticketType: 'ASC', label: 'ASC' } });
  }

  /**
   * List roles available to be designated as escalation focals.
   * Includes all defined roles except non-staff system roles and management roles
   * (user, super_admin, section_head, compliance_officer).
   */
  async listAvailableEscalationRoles(): Promise<{ value: string; label: string }[]> {
    const excluded = ['user', 'super_admin', 'section_head', 'compliance_officer'];
    const rows = await this.roleDefRepo.find();
    return rows
      .filter(r => !excluded.includes(r.value))
      .map(r => ({ value: r.value, label: r.label }));
  }

  /** Add a role as an escalation focal for a ticket type (QA #3, #13) */
  async addEscalationFocal(dto: CreateEscalationFocalDto, actorId: number): Promise<EscalationFocalConfig> {
    const validTypes = ['desktop_support', 'it_support', 'pantawid_ict_support', 'all'];
    if (!validTypes.includes(dto.ticketType)) {
      throw new BadRequestException(`ticketType must be one of: ${validTypes.join(', ')}`);
    }
    const existing = await this.escalationFocalRepo.findOne({
      where: { ticketType: dto.ticketType, roleValue: dto.roleValue },
    });
    if (existing) throw new BadRequestException('This role is already configured as an escalation focal for that ticket type.');

    const config = this.escalationFocalRepo.create({
      ticketType: dto.ticketType,
      roleValue: dto.roleValue,
      label: dto.label?.trim() || dto.roleValue,
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
}
