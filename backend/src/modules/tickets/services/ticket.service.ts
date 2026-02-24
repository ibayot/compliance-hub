import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketPriority,
  IssueType,
} from '../entities/ticket.entity';
import { TicketComment } from '../entities/ticket-comment.entity';

export interface CreateTicketDto {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  issue_type?: IssueType;
  resolution_steps?: string;
  resolution_date?: Date;
  unit_id?: number;
  reported_by_id: number;
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  category?: TicketCategory;
  status?: TicketStatus;
  priority?: TicketPriority;
  issue_type?: IssueType;
  resolution_steps?: string;
  resolution_date?: Date;
  assigned_to_id?: number;
}

export interface AddCommentDto {
  comment: string;
  user_id: number;
}

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private commentRepo: Repository<TicketComment>,
  ) {}

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

    const ticket = this.ticketRepo.create({
      ...dto,
      issue_type: dto.issue_type || IssueType.OTHER,
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
      .leftJoinAndSelect('ticket.unit', 'unit');

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
}
