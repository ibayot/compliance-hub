import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  TicketService,
  CreateTicketDto,
  UpdateTicketDto,
  AddCommentDto,
} from '../services/ticket.service';
import {
  TicketCategory,
  TicketStatus,
  TicketPriority,
} from '../entities/ticket.entity';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketController {
  private readonly logger = new Logger(TicketController.name);

  constructor(private readonly ticketService: TicketService) {}

  /**
   * Create a new ticket
   * POST /tickets
   */
  @Post()
  @Roles(UserRole.FOCAL, UserRole.TECHNICIAN, UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() dto: Omit<CreateTicketDto, 'reported_by_id'>,
    @Request() req: any,
  ) {
    const createDto: CreateTicketDto = {
      ...dto,
      reported_by_id: req.user.id ?? req.user.userId,
    };
    const ticket = await this.ticketService.createTicket(createDto);
    this.logger.log(
      JSON.stringify({
        action: 'ticket.create',
        actorId: req.user?.id ?? req.user?.userId,
        ticketId: ticket.id,
      }),
    );
    return ticket;
  }

  /**
   * Get all tickets
   * GET /tickets
   */
  @Get()
  @Roles(UserRole.FOCAL, UserRole.TECHNICIAN, UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async getTickets(
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('category') category?: TicketCategory,
    @Query('unit_id') unit_id?: string,
    @Query('assigned_to_id') assigned_to_id?: string,
    @Query('reported_by_id') reported_by_id?: string,
  ) {
    return this.ticketService.getTickets({
      status,
      priority,
      category,
      unit_id,
      assigned_to_id,
      reported_by_id,
    });
  }

  /**
   * Get ticket statistics
   * GET /tickets/statistics
   */
  @Get('statistics')
  @Roles(UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async getStatistics() {
    return this.ticketService.getStatistics();
  }

  /**
   * Get a single ticket
   * GET /tickets/:id
   */
  @Get(':id')
  @Roles(UserRole.FOCAL, UserRole.TECHNICIAN, UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async getTicket(@Param('id') id: string) {
    return this.ticketService.getTicket(id);
  }

  /**
   * Update a ticket
   * PUT /tickets/:id
   */
  @Put(':id')
  @Roles(UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Request() req: any) {
    const ticket = await this.ticketService.updateTicket(id, dto);
    this.logger.log(
      JSON.stringify({
        action: 'ticket.update',
        actorId: req.user?.id ?? req.user?.userId,
        ticketId: id,
        status: dto.status,
      }),
    );
    return ticket;
  }

  /**
   * Delete a ticket
   * DELETE /tickets/:id
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTicket(@Param('id') id: string, @Request() req: any) {
    await this.ticketService.deleteTicket(id);
    this.logger.log(
      JSON.stringify({
        action: 'ticket.delete',
        actorId: req.user?.id ?? req.user?.userId,
        ticketId: id,
      }),
    );
  }

  /**
   * Add a comment to a ticket
   * POST /tickets/:id/comments
   */
  @Post(':id/comments')
  @Roles(UserRole.FOCAL, UserRole.TECHNICIAN, UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async addComment(
    @Param('id') id: string,
    @Body() dto: Omit<AddCommentDto, 'user_id'>,
    @Request() req: any,
  ) {
    const commentDto: AddCommentDto = {
      ...dto,
      user_id: req.user.id ?? req.user.userId,
    };
    const comment = await this.ticketService.addComment(id, commentDto);
    this.logger.log(
      JSON.stringify({
        action: 'ticket.comment.add',
        actorId: req.user?.id ?? req.user?.userId,
        ticketId: id,
      }),
    );
    return comment;
  }
}
