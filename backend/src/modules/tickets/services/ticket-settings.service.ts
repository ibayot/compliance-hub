import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';

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
import { SseService } from './sse.service';

// --- DTOs ------------------------------------------------------------------

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isIt?: boolean;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isDesktop?: boolean;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isPantawid?: boolean;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  name?: string;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isIt?: boolean;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isDesktop?: boolean;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isPantawid?: boolean;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isActive?: boolean;
}

export class CreateKeywordRuleDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  keyword?: string; // legacy single keyword — kept for compat
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional()
  keywords?: string[]; // preferred: multiple keywords for this rule
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  targetTicketType: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  targetCategoryId?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  targetIssueTypeId?: string;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isActive?: boolean;
}

export class UpdateKeywordRuleDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  keyword?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional()
  keywords?: string[];
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  targetTicketType?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  targetCategoryId?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  targetIssueTypeId?: string;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isActive?: boolean;
}

export class CreateEscalationFocalDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  ticketType: string;
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  userId: number;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  label: string;
}

export class CreateIssueTypeDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  categoryId?: string | null;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  slaHours?: number | null;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  allowablePauseHours?: number | null;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  maxFreezeHours?: number | null;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isActive?: boolean;
}

export class UpdateIssueTypeDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  name?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isActive?: boolean;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  categoryId?: string | null;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  slaHours?: number | null;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  allowablePauseHours?: number | null;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  maxFreezeHours?: number | null;
}

export class UpdateGlobalConfigDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  assignmentStrategy?: string;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  roundRobinCapHours?: number;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  autoCloseDays?: number;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  smtpHost?: string | null;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  smtpPort?: number | null;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  smtpUser?: string | null;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  smtpPass?: string | null;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  smtpFrom?: string | null;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  smtpFromName?: string | null;
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  primarySmtpDailyLimit?: number;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  scheduleMode?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  officeClockin?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  officeClockout?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  cwwClockinStart?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  cwwClockinEnd?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  cwwClockoutStart?: string;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  cwwClockoutEnd?: string;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isFlagCeremonyPaused?: boolean;
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isEmailNotificationsEnabled?: boolean;
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  emailTestOverride?: string | null;
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
    private readonly sseService: SseService,
  ) {}

  // ── Categories ──────────────────────────────────────────────────────────

  async listCategories(ticketType?: string): Promise<TicketCategoryConfig[]> {
    const qb = this.categoryRepo.createQueryBuilder('c').where('c.isDeleted = false');
    if (ticketType === 'it_support') qb.andWhere('c.isIt = true');
    else if (ticketType === 'desktop_support') qb.andWhere('c.isDesktop = true');
    else if (ticketType === 'pantawid_ict_support') qb.andWhere('c.isPantawid = true');
    return qb.orderBy('c.name', 'ASC').getMany();
  }

  async listActiveCategories(ticketType?: string): Promise<TicketCategoryConfig[]> {
    const qb = this.categoryRepo.createQueryBuilder('c').where('c.isDeleted = false').andWhere('c.isActive = true');
    if (ticketType === 'it_support') qb.andWhere('c.isIt = true');
    else if (ticketType === 'desktop_support') qb.andWhere('c.isDesktop = true');
    else if (ticketType === 'pantawid_ict_support') qb.andWhere('c.isPantawid = true');
    return qb.orderBy('c.name', 'ASC').getMany();
  }

  async getCategoryById(id: string): Promise<TicketCategoryConfig> {
    const cat = await this.categoryRepo.findOne({ where: { id, isDeleted: false } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  async createCategory(dto: CreateCategoryDto, actorId: number): Promise<TicketCategoryConfig> {
    if (!dto.name?.trim()) throw new BadRequestException('Category name is required');
    if (!dto.isIt && !dto.isDesktop && !dto.isPantawid) {
      throw new BadRequestException('At least one support type must be selected');
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
      softDeleted.isIt = !!dto.isIt;
      softDeleted.isDesktop = !!dto.isDesktop;
      softDeleted.isPantawid = !!dto.isPantawid;
      softDeleted.description = dto.description?.trim() || null;
      softDeleted.isActive = true;
      softDeleted.isDeleted = false;
      softDeleted.created_by = actorId;
      softDeleted.updated_by = actorId;
      const saved = await this.categoryRepo.save(softDeleted);
      this.sseService.emitGlobalSettingsUpdated();
      return saved;
    }

    const cat = this.categoryRepo.create({
      key,
      name: dto.name.trim(),
      isIt: !!dto.isIt,
      isDesktop: !!dto.isDesktop,
      isPantawid: !!dto.isPantawid,
      description: dto.description?.trim() || null,
      isActive: dto.isActive ?? true,
      isDeleted: false,
      created_by: actorId,
      updated_by: actorId,
    });
    const saved = await this.categoryRepo.save(cat);
    this.sseService.emitGlobalSettingsUpdated();
    return saved;
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
    if (dto.isIt !== undefined || dto.isDesktop !== undefined || dto.isPantawid !== undefined) {
      const isIt = dto.isIt !== undefined ? dto.isIt : cat.isIt;
      const isDesktop = dto.isDesktop !== undefined ? dto.isDesktop : cat.isDesktop;
      const isPantawid = dto.isPantawid !== undefined ? dto.isPantawid : cat.isPantawid;
      if (!isIt && !isDesktop && !isPantawid) {
        throw new BadRequestException('At least one support type must be selected');
      }
      if (dto.isIt !== undefined) cat.isIt = dto.isIt;
      if (dto.isDesktop !== undefined) cat.isDesktop = dto.isDesktop;
      if (dto.isPantawid !== undefined) cat.isPantawid = dto.isPantawid;
    }
    if (dto.description !== undefined) cat.description = dto.description?.trim() || null;

    if (dto.isActive !== undefined) {
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
    this.sseService.emitGlobalSettingsUpdated();
  }

  // ── Keyword Rules ──────────────────────────────────────────────────────

  async listKeywordRules(): Promise<TicketKeywordRule[]> {
    return this.keywordRepo.find({
      relations: ['targetCategory', 'targetIssueType'],
      order: { keyword: 'ASC' },
    });
  }

  async getKeywordRuleById(id: string): Promise<TicketKeywordRule> {
    const rule = await this.keywordRepo.findOne({ where: { id }, relations: ['targetCategory', 'targetIssueType'] });
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
    if (!dto.targetCategoryId) {
      throw new BadRequestException('targetCategoryId is required when creating a keyword rule');
    }

    const rule = this.keywordRepo.create({
      keyword: kwList[0],
      keywords: JSON.stringify(kwList),
      targetTicketType: dto.targetTicketType,
      targetCategoryId: dto.targetCategoryId || null,
      targetIssueTypeId: dto.targetIssueTypeId || null,
      isActive: dto.isActive ?? true,
      createdBy: actorId,
    });
    const saved = await this.keywordRepo.save(rule);
    this.sseService.emitGlobalSettingsUpdated();
    return saved;
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
    if (dto.targetCategoryId !== undefined) {
      if (!dto.targetCategoryId) {
        throw new BadRequestException('targetCategoryId cannot be empty when updating a keyword rule');
      }
      rule.targetCategoryId = dto.targetCategoryId;
    }
    if (dto.targetIssueTypeId !== undefined) {
      rule.targetIssueTypeId = dto.targetIssueTypeId;
    }
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;

    const saved = await this.keywordRepo.save(rule);
    this.sseService.emitGlobalSettingsUpdated();
    return saved;
  }

  async deleteKeywordRule(id: string): Promise<void> {
    const rule = await this.getKeywordRuleById(id);
    await this.keywordRepo.remove(rule);
    this.sseService.emitGlobalSettingsUpdated();
  }

  // ── Issue Types ───────────────────────────────────────────────────────

  async listIssueTypes(categoryId?: string): Promise<TicketIssueType[]> {
    const qb = this.issueTypeRepo
      .createQueryBuilder('it')
      .leftJoinAndSelect('it.category', 'category')
      .where('it.isDeleted = :deleted', { deleted: false })
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
      .where('it.isDeleted = :deleted', { deleted: false })
      .andWhere('it.isActive = :active', { active: true })
      .orderBy('it.name', 'ASC');

    if (categoryId) {
      qb.andWhere('it.category_id = :categoryId', { categoryId });
    }

    return qb.getMany();
  }

  async getIssueTypeById(id: string): Promise<TicketIssueType> {
    const issueType = await this.issueTypeRepo.findOne({
      where: { id, isDeleted: false },
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
    const existing = await this.issueTypeRepo.findOne({ where: { key, isDeleted: false } });
    if (existing) throw new BadRequestException(`Issue type key "${key}" already exists`);

    if (dto.slaHours !== undefined && dto.slaHours !== null) {
      if (dto.slaHours < 0 || dto.slaHours > 168) {
        throw new BadRequestException('SLA hours must be between 0 and 168');
      }
    }

    if (dto.categoryId) {
      await this.getCategoryById(dto.categoryId);
    }

    const issueType = this.issueTypeRepo.create({
      key,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      isActive: dto.isActive ?? (dto.slaHours ?? null) !== null,
      isDeleted: false,
      category_id: dto.categoryId || null,
      slaHours: dto.slaHours ?? null,
      allowablePauseHours: dto.allowablePauseHours ?? 48,
      maxFreezeHours: dto.maxFreezeHours ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    const saved = await this.issueTypeRepo.save(issueType);
    this.sseService.emitGlobalSettingsUpdated();
    return saved;
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
    if (dto.slaHours !== undefined) {
      if (dto.slaHours !== null && (dto.slaHours < 0 || dto.slaHours > 168)) {
        throw new BadRequestException('SLA hours must be between 0 and 168');
      }
      issueType.slaHours = dto.slaHours ?? null;
      if (issueType.slaHours === null) {
        issueType.isActive = false;
      }
    }

    if (dto.isActive !== undefined) {
      if (dto.isActive && issueType.slaHours === null) {
        throw new BadRequestException('Cannot activate issue with blank SLA');
      }
      issueType.isActive = dto.isActive;
    }
    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        await this.getCategoryById(dto.categoryId);
      }
      issueType.category_id = dto.categoryId || null;
    }
    if (dto.allowablePauseHours !== undefined) {
      issueType.allowablePauseHours = dto.allowablePauseHours ?? 48;
    }
    if (dto.maxFreezeHours !== undefined) {
      issueType.maxFreezeHours = dto.maxFreezeHours ?? null;
    }
    issueType.updated_by = actorId;

    const saved = await this.issueTypeRepo.save(issueType);
    this.sseService.emitGlobalSettingsUpdated();
    return saved;
  }

  async deleteIssueType(id: string, actorId: number): Promise<void> {
    const issueType = await this.getIssueTypeById(id);
    issueType.isDeleted = true;
    issueType.isActive = false;
    issueType.updated_by = actorId;
    await this.issueTypeRepo.save(issueType);
    this.sseService.emitGlobalSettingsUpdated();
  }

  /** Find the first matching keyword rule for a given text (subject + description) */
  async matchKeywordRules(text: string, currentTicketType?: string): Promise<TicketKeywordRule | null> {
    const rules = await this.keywordRepo.find({
      where: { isActive: true },
      relations: ['targetCategory', 'targetIssueType'],
    });

    const lower = text.toLowerCase();

    // Build a flat list of (rule, keyword) pairs
    const pairs: Array<{ rule: TicketKeywordRule; kw: string }> = [];
    for (const rule of rules) {
      const kwList: string[] = rule.keywords ? JSON.parse(rule.keywords) : [rule.keyword];
      for (const kw of kwList) {
        pairs.push({ rule, kw });
      }
    }
    
    // Sort so longer keywords are matched first
    pairs.sort((a, b) => b.kw.length - a.kw.length);

    // Helper function for fuzzy word matching
    const levenshtein = (a: string, b: string) => {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
      for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }
      return matrix[a.length][b.length];
    };

    const fuzzyMatch = (kw: string, lowerText: string): boolean => {
      if (lowerText.includes(kw)) return true; // Exact match is fastest
      const kwWords = kw.split(/\s+/).filter(Boolean);
      const textWords = lowerText.split(/\s+/).filter(Boolean);
      if (kwWords.length === 0) return false;

      let matchedWords = 0;
      for (const kwWord of kwWords) {
        let bestMatch = false;
        for (const tWord of textWords) {
          if (tWord === kwWord) {
            bestMatch = true;
            break;
          }
          const dist = levenshtein(kwWord, tWord);
          // Allow up to 1 typo for short words (>=4 chars), 2 for longer ones
          const allowedTypos = kwWord.length >= 6 ? 2 : (kwWord.length >= 4 ? 1 : 0);
          if (dist <= allowedTypos) {
            bestMatch = true;
            break;
          }
        }
        if (bestMatch) matchedWords++;
      }
      // Require 100% of keywords to be found in the text, allowing typos and disregarding order.
      return matchedWords === kwWords.length;
    };

    let matchedKw: string | null = null;
    const matchedRules: TicketKeywordRule[] = [];
    
    for (const { rule, kw } of pairs) {
      if (matchedKw && kw.length < matchedKw.length) {
        break; // Exhausted all keywords of the same length
      }
      if (matchedKw && kw !== matchedKw) {
        continue; // Skip other keywords of the same length that don't match
      }
      if (fuzzyMatch(kw, lower)) {
        matchedKw = kw;
        matchedRules.push(rule);
      }
    }
    
    if (matchedRules.length === 0) return null;

    // 1. Direct Match: Keyword rule exists for the user's selected Support Type
    if (currentTicketType) {
      const directMatch = matchedRules.find(r => r.targetTicketType === currentTicketType);
      if (directMatch) return directMatch;
    }
    
    // 2. Unambiguous Mistake: Keyword only exists in exactly ONE other Support Type
    const uniqueTypes = new Set(matchedRules.map(r => r.targetTicketType));
    if (uniqueTypes.size === 1) {
      return matchedRules[0];
    }
    
    // 3. Ambiguous Mistake (uniqueTypes.size > 1):
    // The keyword belongs to multiple support types, and none of them is the user's selected type.
    // We cannot reliably guess which one they meant, so we do nothing.
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
    const saved = await this.escalationFocalRepo.save(config);
    this.sseService.emitGlobalSettingsUpdated();
    return saved;
  }

  /** Remove an escalation focal config */
  async removeEscalationFocal(id: number): Promise<void> {
    const config = await this.escalationFocalRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException(`Escalation focal config ${id} not found`);
    await this.escalationFocalRepo.remove(config);
    this.sseService.emitGlobalSettingsUpdated();
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

    if (dto.isEmailNotificationsEnabled !== undefined)
      config.isEmailNotificationsEnabled = dto.isEmailNotificationsEnabled;
    if (dto.emailTestOverride !== undefined) config.emailTestOverride = dto.emailTestOverride;

    const saved = await this.configRepo.save(config);
    this.sseService.emitGlobalSettingsUpdated();
    return saved;
  }

  // ── SLA Insights ───────────────────────────────────────────────────────

  async getSlaInsights(filters: { year?: number; month?: number; quarter?: number; semester?: number } = {}): Promise<any[]> {
    // Calculates the average resolution time in hours per issue
    const qb = this.ticketRepo.createQueryBuilder('t')
      .innerJoin('t.issueTypeConfig', 'ti')
      .innerJoin('ti.category', 'tc')
      .select('ti.name', 'issueName')
      .addSelect('tc.name', 'categoryName')
      .addSelect('ti.slaHours', 'configuredSlaHours')
      .addSelect('COUNT(t.id)', 'resolvedTicketsCount')
      .addSelect('AVG(TIMESTAMPDIFF(SECOND, t.createdAt, t.resolvedAt)) / 3600', 'avgResolutionHours')
      .where("LOWER(t.status) IN ('resolved', 'closed')")
      .andWhere('ti.slaHours IS NOT NULL')
      .andWhere('ti.slaHours > 0')
      .groupBy('ti.id');

    if (filters.year || filters.month || filters.quarter || filters.semester) {
      if (filters.year) qb.andWhere('YEAR(t.resolvedAt) = :year', { year: filters.year });
      if (filters.month) qb.andWhere('MONTH(t.resolvedAt) = :month', { month: filters.month });
      if (filters.quarter) qb.andWhere('QUARTER(t.resolvedAt) = :quarter', { quarter: filters.quarter });
      if (filters.semester) {
        if (filters.semester === 1) qb.andWhere('MONTH(t.resolvedAt) BETWEEN 1 AND 6');
        else qb.andWhere('MONTH(t.resolvedAt) BETWEEN 7 AND 12');
      }
    } else {
      qb.andWhere('t.resolvedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    }

    const insights = await qb.getRawMany();

    return insights.map((row: any) => ({
      issueName: row.issueName,
      categoryName: row.categoryName,
      configuredSlaHours: Number(row.configuredSlaHours),
      resolvedTicketsCount: Number(row.resolvedTicketsCount),
      avgResolutionHours: Number(row.avgResolutionHours || 0),
      isFailingSla: Number(row.avgResolutionHours || 0) > Number(row.configuredSlaHours),
    }));
  }
}
