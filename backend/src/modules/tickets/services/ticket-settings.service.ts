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

// --- DTOs ------------------------------------------------------------------

export interface CreateCategoryDto {
  name: string;
  ticketType: string; // 'desktop_support' | 'it_support'
  description?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  ticketType?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateKeywordRuleDto {
  keyword: string;
  targetTicketType: string;
  targetCategoryId?: string;
}

export interface UpdateKeywordRuleDto {
  keyword?: string;
  targetTicketType?: string;
  targetCategoryId?: string | null;
  isActive?: boolean;
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
    if (!dto.keyword?.trim()) throw new BadRequestException('Keyword is required');
    if (!['desktop_support', 'it_support'].includes(dto.targetTicketType)) {
      throw new BadRequestException('targetTicketType must be desktop_support or it_support');
    }

    const rule = this.keywordRepo.create({
      keyword: dto.keyword.trim().toLowerCase(),
      targetTicketType: dto.targetTicketType,
      targetCategoryId: dto.targetCategoryId || null,
      isActive: true,
      createdBy: actorId,
    });
    return this.keywordRepo.save(rule);
  }

  async updateKeywordRule(id: string, dto: UpdateKeywordRuleDto): Promise<TicketKeywordRule> {
    const rule = await this.getKeywordRuleById(id);

    if (dto.keyword !== undefined) rule.keyword = dto.keyword.trim().toLowerCase();
    if (dto.targetTicketType !== undefined) {
      if (!['desktop_support', 'it_support'].includes(dto.targetTicketType)) {
        throw new BadRequestException('targetTicketType must be desktop_support or it_support');
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
      order: { keyword: 'DESC' }, // longer keywords first (more specific)
    });

    const lower = text.toLowerCase();
    // Sort by keyword length descending so longer/more-specific rules win
    rules.sort((a, b) => b.keyword.length - a.keyword.length);

    for (const rule of rules) {
      if (lower.includes(rule.keyword)) {
        return rule;
      }
    }
    return null;
  }
}
