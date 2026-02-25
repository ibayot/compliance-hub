import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketPriority,
  IssueType,
} from '../entities/ticket.entity';
import { TicketComment } from '../entities/ticket-comment.entity';
import { TicketIssueType } from '../entities/ticket-issue-type.entity';
import { TicketCategoryConfig } from '../entities/ticket-category.entity';

export interface CreateTicketDto {
  subject: string;
  description: string;
  category: TicketCategory;
  category_id?: string;
  priority: TicketPriority;
  issue_type?: IssueType;
  issue_type_id?: string;
  resolution_steps?: string;
  resolution_date?: Date;
  unit_id?: number;
  reported_by_id: number;
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  category?: TicketCategory;
  category_id?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  issue_type?: IssueType;
  issue_type_id?: string;
  resolution_steps?: string;
  resolution_date?: Date;
  assigned_to_id?: number;
}

export interface UpsertTicketConfigDto {
  key: string;
  name: string;
  description?: string;
  is_active?: boolean;
  category_id?: string;
}

export interface AddCommentDto {
  comment: string;
  user_id: number;
}

@Injectable()
export class TicketService implements OnModuleInit {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private commentRepo: Repository<TicketComment>,
    @InjectRepository(TicketIssueType)
    private issueTypeRepo: Repository<TicketIssueType>,
    @InjectRepository(TicketCategoryConfig)
    private categoryRepo: Repository<TicketCategoryConfig>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ticket_issue_types (
        id varchar(36) NOT NULL,
        \`key\` varchar(100) NOT NULL,
        name varchar(150) NOT NULL,
        description text DEFAULT NULL,
        is_active tinyint(1) NOT NULL DEFAULT 1,
        is_deleted tinyint(1) NOT NULL DEFAULT 0,
        created_by int DEFAULT NULL,
        updated_by int DEFAULT NULL,
        category_id varchar(36) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_ticket_issue_types_key (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ticket_categories (
        id varchar(36) NOT NULL,
        \`key\` varchar(100) NOT NULL,
        name varchar(150) NOT NULL,
        description text DEFAULT NULL,
        is_active tinyint(1) NOT NULL DEFAULT 1,
        is_deleted tinyint(1) NOT NULL DEFAULT 0,
        created_by int DEFAULT NULL,
        updated_by int DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_ticket_categories_key (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await this.dataSource.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS issue_type_id varchar(36) NULL,
      ADD COLUMN IF NOT EXISTS category_id varchar(36) NULL;
    `);

    await this.dataSource.query(`
      ALTER TABLE ticket_issue_types
      ADD COLUMN IF NOT EXISTS category_id varchar(36) NULL;
    `);

    await this.dataSource.query(`
      ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_issue_type_id
      FOREIGN KEY (issue_type_id) REFERENCES ticket_issue_types(id)
      ON DELETE SET NULL;
    `).catch(() => undefined);

    await this.dataSource.query(`
      ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_category_id
      FOREIGN KEY (category_id) REFERENCES ticket_categories(id)
      ON DELETE SET NULL;
    `).catch(() => undefined);

    await this.dataSource.query(`
      ALTER TABLE ticket_issue_types
      ADD CONSTRAINT fk_issue_type_category_id
      FOREIGN KEY (category_id) REFERENCES ticket_categories(id)
      ON DELETE SET NULL;
    `).catch(() => undefined);

    await this.seedDefaultConfigs();
  }

  private async seedDefaultConfigs(): Promise<void> {
    const defaultIssueTypes = [
      { key: 'policy_gap', name: 'Policy Gap' },
      { key: 'missing_evidence', name: 'Missing Evidence' },
      { key: 'data_inconsistency', name: 'Data Inconsistency' },
      { key: 'late_submission', name: 'Late Submission' },
      { key: 'security_incident', name: 'Security Incident' },
      { key: 'other', name: 'Other' },
    ];

    const defaultCategories = [
      { key: 'document_related', name: 'Document Related' },
      { key: 'system_issue', name: 'System Issue' },
      { key: 'compliance_query', name: 'Compliance Query' },
      { key: 'training_request', name: 'Training Request' },
      { key: 'other', name: 'Other' },
    ];

    for (const issueType of defaultIssueTypes) {
      const existing = await this.issueTypeRepo.findOne({ where: { key: issueType.key } });
      if (!existing) {
        await this.issueTypeRepo.save(this.issueTypeRepo.create(issueType));
      }
    }

    for (const category of defaultCategories) {
      const existing = await this.categoryRepo.findOne({ where: { key: category.key } });
      if (!existing) {
        await this.categoryRepo.save(this.categoryRepo.create(category));
      }
    }
  }

  private normalizeConfigKey(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  private async resolveIssueType(
    issue_type_id?: string,
    fallbackIssueType?: IssueType,
    category_id?: string,
  ): Promise<{ issue_type_id: string | null; issue_type: IssueType }> {
    if (!issue_type_id) {
      return {
        issue_type_id: null,
        issue_type: fallbackIssueType || IssueType.OTHER,
      };
    }

    const issueType = await this.issueTypeRepo.findOne({
      where: { id: issue_type_id, is_deleted: false },
    });

    if (!issueType || !issueType.is_active) {
      throw new BadRequestException('Selected issue type is invalid or inactive.');
    }

    if (category_id && issueType.category_id && issueType.category_id !== category_id) {
      throw new BadRequestException('Selected issue type does not belong to the selected category.');
    }

    return {
      issue_type_id: issueType.id,
      issue_type: IssueType.OTHER,
    };
  }

  private async resolveCategory(
    category_id?: string,
    fallbackCategory?: TicketCategory,
  ): Promise<{ category_id: string | null; category: TicketCategory }> {
    if (!category_id) {
      return {
        category_id: null,
        category: fallbackCategory || TicketCategory.OTHER,
      };
    }

    const category = await this.categoryRepo.findOne({
      where: { id: category_id, is_deleted: false },
    });

    if (!category || !category.is_active) {
      throw new BadRequestException('Selected category is invalid or inactive.');
    }

    return {
      category_id: category.id,
      category: TicketCategory.OTHER,
    };
  }

  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.ticketRepo.count();
    const ticketNumber = `TICK-${year}-${(count + 1).toString().padStart(4, '0')}`;
    return ticketNumber;
  }

  /**
   * Create a new ticket
   */
  async createTicket(dto: CreateTicketDto): Promise<Ticket> {
    const ticket_number = await this.generateTicketNumber();

    const resolvedCategory = await this.resolveCategory(
      dto.category_id,
      dto.category,
    );

    const resolvedIssueType = await this.resolveIssueType(
      dto.issue_type_id,
      dto.issue_type,
      resolvedCategory.category_id || undefined,
    );

    const ticket = this.ticketRepo.create({
      ...dto,
      issue_type: resolvedIssueType.issue_type,
      issue_type_id: resolvedIssueType.issue_type_id,
      category: resolvedCategory.category,
      category_id: resolvedCategory.category_id,
      ticket_number,
    });

    await this.ticketRepo.save(ticket);

    this.logger.log(`Created ticket: ${ticket_number}`);
    return this.getTicket(ticket.id);
  }

  /**
   * Get all tickets with filters
   */
  async getTickets(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    unit_id?: string;
    assigned_to_id?: string;
    reported_by_id?: string;
  }): Promise<Ticket[]> {
    const query = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.reported_by', 'reporter')
      .leftJoinAndSelect('ticket.assigned_to', 'assignee')
      .leftJoinAndSelect('ticket.unit', 'unit')
      .leftJoinAndSelect('ticket.issue_type_config', 'issue_type_config')
      .leftJoinAndSelect('ticket.category_config', 'category_config');

    if (filters?.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('ticket.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters?.category) {
      query.andWhere('ticket.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.unit_id) {
      query.andWhere('ticket.unit_id = :unit_id', {
        unit_id: filters.unit_id,
      });
    }

    if (filters?.assigned_to_id) {
      query.andWhere('ticket.assigned_to_id = :assigned_to_id', {
        assigned_to_id: filters.assigned_to_id,
      });
    }

    if (filters?.reported_by_id) {
      query.andWhere('ticket.reported_by_id = :reported_by_id', {
        reported_by_id: filters.reported_by_id,
      });
    }

    query.orderBy('ticket.created_at', 'DESC');

    return query.getMany();
  }

  /**
   * Get a single ticket by ID
   */
  async getTicket(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: [
        'reported_by',
        'assigned_to',
        'unit',
        'issue_type_config',
        'category_config',
        'comments',
        'comments.user',
      ],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  /**
   * Update a ticket
   */
  async updateTicket(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // If status is being changed to resolved, set resolved_at
    if (dto.status === TicketStatus.RESOLVED && ticket.status !== TicketStatus.RESOLVED) {
      (ticket as any).resolved_at = new Date();
      if (!dto.resolution_date) {
        dto.resolution_date = new Date();
      }
    }

    if (dto.issue_type_id !== undefined) {
      const categoryForValidation = dto.category_id !== undefined
        ? dto.category_id
        : ticket.category_id || undefined;
      const resolvedIssueType = await this.resolveIssueType(
        dto.issue_type_id,
        dto.issue_type,
        categoryForValidation,
      );
      dto.issue_type = resolvedIssueType.issue_type;
      dto.issue_type_id = resolvedIssueType.issue_type_id || undefined;
    }

    if (dto.category_id !== undefined) {
      const resolvedCategory = await this.resolveCategory(
        dto.category_id,
        dto.category,
      );
      dto.category = resolvedCategory.category;
      dto.category_id = resolvedCategory.category_id || undefined;
    }

    Object.assign(ticket, dto);
    await this.ticketRepo.save(ticket);

    this.logger.log(`Updated ticket: ${ticket.ticket_number}`);
    return this.getTicket(id);
  }

  /**
   * Add a comment to a ticket
   */
  async addComment(ticketId: string, dto: AddCommentDto): Promise<TicketComment> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const comment = this.commentRepo.create({
      ticket_id: ticketId,
      comment: dto.comment,
      user_id: dto.user_id,
    });

    await this.commentRepo.save(comment);

    this.logger.log(`Added comment to ticket: ${ticket.ticket_number}`);

    // Return comment with user relation
    return this.commentRepo.findOne({
      where: { id: comment.id },
      relations: ['user'],
    }) as Promise<TicketComment>;
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(id: string): Promise<void> {
    const result = await this.ticketRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Ticket not found');
    }

    this.logger.log(`Deleted ticket: ${id}`);
  }

  /**
   * Get ticket statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const tickets = await this.ticketRepo.find();

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    tickets.forEach((ticket) => {
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
      byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
    });

    return {
      total: tickets.length,
      byStatus,
      byPriority,
    };
  }

  async listIssueTypes(
    includeInactive = true,
    categoryId?: string,
  ): Promise<TicketIssueType[]> {
    const qb = this.issueTypeRepo
      .createQueryBuilder('issueType')
      .where('issueType.is_deleted = :isDeleted', { isDeleted: false })
      .orderBy('issueType.name', 'ASC');

    qb.leftJoinAndSelect('issueType.category', 'category');

    if (!includeInactive) {
      qb.andWhere('issueType.is_active = :isActive', { isActive: true });
    }

    if (categoryId) {
      qb.andWhere('issueType.category_id = :categoryId', { categoryId });
    }

    return qb.getMany();
  }

  async listCategories(includeInactive = true): Promise<TicketCategoryConfig[]> {
    const qb = this.categoryRepo
      .createQueryBuilder('category')
      .where('category.is_deleted = :isDeleted', { isDeleted: false })
      .orderBy('category.name', 'ASC');

    if (!includeInactive) {
      qb.andWhere('category.is_active = :isActive', { isActive: true });
    }

    return qb.getMany();
  }

  async createIssueType(
    dto: UpsertTicketConfigDto,
    actorId: number,
  ): Promise<TicketIssueType> {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Issue type name is required.');
    }

    const key = this.normalizeConfigKey(dto.key || dto.name);
    if (!key) {
      throw new BadRequestException('Issue type key is required.');
    }

    let categoryId: string | null = null;
    if (dto.category_id) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.category_id, is_deleted: false },
      });
      if (!category) {
        throw new BadRequestException('Selected category is invalid.');
      }
      categoryId = category.id;
    }

    const existing = await this.issueTypeRepo.findOne({ where: { key } });
    if (existing && !existing.is_deleted) {
      throw new ConflictException('Issue type key already exists.');
    }

    if (existing?.is_deleted) {
      existing.name = dto.name.trim();
      existing.description = dto.description?.trim() || null;
      existing.is_active = dto.is_active ?? true;
      existing.is_deleted = false;
      existing.updated_by = actorId;
      existing.category_id = categoryId;
      return this.issueTypeRepo.save(existing);
    }

    return this.issueTypeRepo.save(
      this.issueTypeRepo.create({
        key,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        is_active: dto.is_active ?? true,
        category_id: categoryId,
        created_by: actorId,
        updated_by: actorId,
      }),
    );
  }

  async updateIssueType(
    id: string,
    dto: Partial<UpsertTicketConfigDto>,
    actorId: number,
  ): Promise<TicketIssueType> {
    const issueType = await this.issueTypeRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!issueType) {
      throw new NotFoundException('Issue type not found.');
    }

    if (dto.key || dto.name) {
      const nextKey = this.normalizeConfigKey(dto.key || dto.name || issueType.key);
      const duplicate = await this.issueTypeRepo.findOne({ where: { key: nextKey } });
      if (duplicate && duplicate.id !== issueType.id && !duplicate.is_deleted) {
        throw new ConflictException('Issue type key already exists.');
      }
      issueType.key = nextKey;
    }

    if (dto.name !== undefined) {
      if (!dto.name.trim()) {
        throw new BadRequestException('Issue type name is required.');
      }
      issueType.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      issueType.description = dto.description?.trim() || null;
    }

    if (dto.is_active !== undefined) {
      issueType.is_active = dto.is_active;
    }

    if (dto.category_id !== undefined) {
      if (!dto.category_id) {
        issueType.category_id = null;
      } else {
        const category = await this.categoryRepo.findOne({
          where: { id: dto.category_id, is_deleted: false },
        });
        if (!category) {
          throw new BadRequestException('Selected category is invalid.');
        }
        issueType.category_id = category.id;
      }
    }

    issueType.updated_by = actorId;
    return this.issueTypeRepo.save(issueType);
  }

  async deactivateIssueType(id: string, actorId: number): Promise<TicketIssueType> {
    return this.updateIssueType(id, { is_active: false }, actorId);
  }

  async softDeleteIssueType(id: string, actorId: number): Promise<void> {
    const issueType = await this.issueTypeRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!issueType) {
      throw new NotFoundException('Issue type not found.');
    }

    const inUse = await this.ticketRepo.count({ where: { issue_type_id: id } });
    if (inUse > 0) {
      throw new BadRequestException('Issue type is in use by existing tickets and cannot be deleted.');
    }

    issueType.is_deleted = true;
    issueType.is_active = false;
    issueType.updated_by = actorId;
    await this.issueTypeRepo.save(issueType);
  }

  async createCategory(
    dto: UpsertTicketConfigDto,
    actorId: number,
  ): Promise<TicketCategoryConfig> {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Category name is required.');
    }

    const key = this.normalizeConfigKey(dto.key || dto.name);
    if (!key) {
      throw new BadRequestException('Category key is required.');
    }

    const existing = await this.categoryRepo.findOne({ where: { key } });
    if (existing && !existing.is_deleted) {
      throw new ConflictException('Category key already exists.');
    }

    if (existing?.is_deleted) {
      existing.name = dto.name.trim();
      existing.description = dto.description?.trim() || null;
      existing.is_active = dto.is_active ?? true;
      existing.is_deleted = false;
      existing.updated_by = actorId;
      return this.categoryRepo.save(existing);
    }

    return this.categoryRepo.save(
      this.categoryRepo.create({
        key,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        is_active: dto.is_active ?? true,
        created_by: actorId,
        updated_by: actorId,
      }),
    );
  }

  async updateCategory(
    id: string,
    dto: Partial<UpsertTicketConfigDto>,
    actorId: number,
  ): Promise<TicketCategoryConfig> {
    const category = await this.categoryRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    if (dto.key || dto.name) {
      const nextKey = this.normalizeConfigKey(dto.key || dto.name || category.key);
      const duplicate = await this.categoryRepo.findOne({ where: { key: nextKey } });
      if (duplicate && duplicate.id !== category.id && !duplicate.is_deleted) {
        throw new ConflictException('Category key already exists.');
      }
      category.key = nextKey;
    }

    if (dto.name !== undefined) {
      if (!dto.name.trim()) {
        throw new BadRequestException('Category name is required.');
      }
      category.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      category.description = dto.description?.trim() || null;
    }

    if (dto.is_active !== undefined) {
      category.is_active = dto.is_active;
    }

    category.updated_by = actorId;
    return this.categoryRepo.save(category);
  }

  async deactivateCategory(id: string, actorId: number): Promise<TicketCategoryConfig> {
    return this.updateCategory(id, { is_active: false }, actorId);
  }

  async softDeleteCategory(id: string, actorId: number): Promise<void> {
    const category = await this.categoryRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    const inUse = await this.ticketRepo.count({ where: { category_id: id } });
    if (inUse > 0) {
      throw new BadRequestException('Category is in use by existing tickets and cannot be deleted.');
    }

    category.is_deleted = true;
    category.is_active = false;
    category.updated_by = actorId;
    await this.categoryRepo.save(category);
  }
}
