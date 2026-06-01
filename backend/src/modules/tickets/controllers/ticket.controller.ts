import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  UploadedFiles,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  TicketService,
  CreateTicketDto,
  UpdateTicketDto,
  AssignTicketDto,
  AddCommentDto,
  SubmitSatisfactionDto,
  EscalateTicketDto,
  ReturnEscalationDto,
} from '../services/ticket.service';
import { TicketStatus, TicketType } from '../entities/ticket.entity';

const ALL_ROLES = [
  UserRole.USER, UserRole.SECTION_HEAD, UserRole.SUPER_ADMIN,
  // Named compliance roles
  UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
  // Named technician roles
  UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR,
  UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR,
  // Named focal-equivalent roles (also matched via roleCode='focal' in RolesGuard)
  UserRole.LEAD_INFRA, UserRole.SERVER_ADMIN, UserRole.DB_ADMIN, UserRole.NETWORK_ADMIN,
  UserRole.PROJECT_MGR, UserRole.DEV_LEAD, UserRole.SQA_LEAD,
  UserRole.RECORDS_OFFICER, UserRole.HR_ID_OFFICER,
];

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketController {
  private readonly logger = new Logger(TicketController.name);
  constructor(private readonly ticketService: TicketService) {}

  /** POST /tickets - Any authenticated user can submit a ticket */
  @Post()
  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createTicket(@Body() dto: CreateTicketDto, @Request() req: any) {
    const callerId = req.user.id ?? req.user.userId;
    const callerRole = req.user.role as UserRole;
    return this.ticketService.createTicket(dto, callerId, callerRole);
  }

  /** GET /tickets - Role-scoped listing */
  @Get()
  @Roles(...ALL_ROLES)
  async getTickets(
    @Query('status') status?: TicketStatus,
    @Query('ticketType') ticketType?: TicketType,
    @Query('requesterId') requesterId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('escalatedToMe') escalatedToMe?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Request() req?: any,
  ) {
    const viewerId = req?.user?.id ?? req?.user?.userId;
    const showEscalatedToMe = escalatedToMe === 'true' || escalatedToMe === '1';
    return this.ticketService.getTickets({
      status, ticketType,
      requesterId: requesterId ? Number(requesterId) : undefined,
      assignedToId: assignedToId ? Number(assignedToId) : undefined,
      escalatedToId: showEscalatedToMe ? viewerId : undefined,
      viewerId,
      viewerRole: req?.user?.role,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  /** GET /tickets/sla/summary — aggregate SLA breach and due metrics */
  @Get('sla/summary')
  @Roles(...ALL_ROLES)
  async getSlaSummary(@Request() req: any) {
    return this.ticketService.getSlaSummary(req.user.id ?? req.user.userId, req.user.role);
  }

  /** GET /tickets/statistics */
  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD,
    UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, 'focal')
  async getStatistics() { return this.ticketService.getStatistics(); }

  /** GET /tickets/technicians */
  @Get('technicians')
  @Roles(...ALL_ROLES)
  async getTechnicians() { return this.ticketService.getTechnicianAvailability(); }

  /** GET /tickets/dashboard */
  @Get('dashboard')
  @Roles(...ALL_ROLES)
  async getDashboardStats(@Request() req: any) {
    return this.ticketService.getUserDashboardStats(req.user.id ?? req.user.userId);
  }

  /** GET /tickets/assigned-stats?year=&month= — monthly stats for tickets ASSIGNED to the caller */
  @Get('assigned-stats')
  @Roles(...ALL_ROLES)
  async getAssignedStats(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.ticketService.getTechAssignedStats(
      req.user.id ?? req.user.userId,
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
    );
  }

  /** GET /tickets/reports — satisfaction reports (QA #11) */
  @Get('reports')
  @Roles(...ALL_ROLES)
  async getTicketReports(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('quarter') quarter?: string,
    @Query('semester') semester?: string,
    @Query('technicianId') technicianId?: string,
    @Query('ticketType') ticketType?: string,
    @Request() req?: any,
  ) {
    return this.ticketService.getTicketReports({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      semester: semester ? Number(semester) : undefined,
      technicianId: technicianId ? Number(technicianId) : undefined,
      ticketType,
      viewerId: req?.user?.id ?? req?.user?.userId,
      viewerRole: req?.user?.role,
    });
  }

  /** GET /tickets/report-technicians — technicians who had tickets in a given period */
  @Get('report-technicians')
  @Roles(...ALL_ROLES)
  async getReportTechnicians(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('quarter') quarter?: string,
    @Query('semester') semester?: string,
    @Query('ticketType') ticketType?: string,
  ) {
    return this.ticketService.getTechniciansByPeriod({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      semester: semester ? Number(semester) : undefined,
      ticketType,
    });
  }

  /** GET /tickets/:id */
  @Get(':id')
  @Roles(...ALL_ROLES)
  async getTicket(@Param('id') id: string, @Request() req: any) {
    return this.ticketService.getTicketById(id, req.user?.role as UserRole, req.user.id ?? req.user.userId);
  }

  /** PATCH /tickets/:id */
  @Patch(':id')
  @Roles(...ALL_ROLES)
  async updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Request() req: any) {
    return this.ticketService.updateTicket(id, dto, req.user.id ?? req.user.userId, req.user.role);
  }

  /** GET /tickets/requester/:requesterId/open - open tickets for Duplicate picker */
  @Get('requester/:requesterId/open')
  @Roles(...ALL_ROLES)
  async getRequesterOpenTickets(@Param('requesterId') requesterId: string, @Request() req: any) {
    return this.ticketService.getOpenTicketsForRequester(
      Number(requesterId),
      req.user.id ?? req.user.userId,
      req.user.role,
    );
  }

  /** PATCH /tickets/:id/assign */
  @Patch(':id/assign')
  @Roles(...ALL_ROLES)
  async assignTicket(@Param('id') id: string, @Body() dto: AssignTicketDto, @Request() req: any) {
    return this.ticketService.assignTicket(id, dto, req.user.role, req.user.id ?? req.user.userId);
  }

  /** PATCH /tickets/:id/mark-viewed — auto-transition assigned→in_progress when technician views the ticket */
  @Patch(':id/mark-viewed')
  @Roles(...ALL_ROLES)
  async markTicketViewed(@Param('id') id: string, @Request() req: any) {
    return this.ticketService.markTicketViewed(id, req.user.id ?? req.user.userId, req.user.role);
  }

  /** GET /tickets/:id/events — timeline of all ticket events */
  @Get(':id/events')
  @Roles(...ALL_ROLES)
  async getTicketEvents(@Param('id') id: string, @Request() req: any) {
    return this.ticketService.getTicketEvents(id, req.user.id ?? req.user.userId, req.user.role);
  }

  /** POST /tickets/:id/comments */
  @Post(':id/comments')
  @Roles(...ALL_ROLES)
  async addComment(@Param('id') ticketId: string, @Body() dto: AddCommentDto, @Request() req: any) {
    return this.ticketService.addComment(ticketId, dto, req.user.id ?? req.user.userId, req.user.role);
  }

  /** POST /tickets/:id/satisfaction */
  @Post(':id/satisfaction')
  @Roles(...ALL_ROLES)
  async submitSatisfaction(@Param('id') id: string, @Body() dto: SubmitSatisfactionDto, @Request() req: any) {
    return this.ticketService.submitSatisfaction(id, dto, req.user.id ?? req.user.userId);
  }

  /** POST /tickets/:id/rate — backward-compatible alias for satisfaction submission */
  @Post(':id/rate')
  @Roles(...ALL_ROLES)
  async submitSatisfactionAlias(@Param('id') id: string, @Body() dto: SubmitSatisfactionDto, @Request() req: any) {
    return this.ticketService.submitSatisfaction(id, dto, req.user.id ?? req.user.userId);
  }

  /** GET /tickets/satisfaction/unit-suggestions — distinct unit values from past CSAT forms */
  @Get('satisfaction/unit-suggestions')
  @Roles(...ALL_ROLES)
  async getSatisfactionUnitSuggestions() {
    return this.ticketService.getSatisfactionUnitSuggestions();
  }

  // ── Escalation ────────────────────────────────────────────────────────────

  /** GET /tickets/:id/escalations */
  @Get(':id/escalations')
  @Roles(...ALL_ROLES)
  async getEscalations(@Param('id') id: string, @Request() req: any) {
    return this.ticketService.getEscalations(id, req.user.id ?? req.user.userId, req.user.role);
  }

  /** POST /tickets/:id/escalate — upload proof photos (multipart/form-data) */
  @Post(':id/escalate')
  @Roles(
    UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD,
    UserRole.COMPLIANCE_OFFICER, UserRole.PANTAWID_ICT,
    UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR,
    UserRole.LEAD_INFRA, UserRole.SERVER_ADMIN, UserRole.DB_ADMIN, UserRole.NETWORK_ADMIN,
    UserRole.PROJECT_MGR, UserRole.DEV_LEAD, UserRole.SQA_LEAD,
    UserRole.RECORDS_OFFICER, UserRole.HR_ID_OFFICER,
  )
  @UseInterceptors(FilesInterceptor('proofFiles', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async escalateTicket(
    @Param('id') id: string,
    @Body() body: { escalatedToId: string; notes?: string },
    @UploadedFiles() proofFiles: Express.Multer.File[],
    @Request() req: any,
  ) {
    const dto: EscalateTicketDto = {
      escalatedToId: Number(body.escalatedToId),
      notes: body.notes,
    };
    return this.ticketService.escalateTicket(id, dto, proofFiles ?? [], req.user.id ?? req.user.userId, req.user.role);
  }

  /** PATCH /tickets/:id/escalation/:eid/accept */
  @Patch(':id/escalation/:eid/accept')
  @Roles(...ALL_ROLES)
  async acceptEscalation(@Param('id') id: string, @Param('eid') eid: string, @Request() req: any) {
    return this.ticketService.acceptEscalation(id, eid, req.user.id ?? req.user.userId);
  }

  /** PATCH /tickets/:id/escalation/:eid/return */
  @Patch(':id/escalation/:eid/return')
  @Roles(...ALL_ROLES)
  async returnEscalation(
    @Param('id') id: string,
    @Param('eid') eid: string,
    @Body() dto: ReturnEscalationDto,
    @Request() req: any,
  ) {
    return this.ticketService.returnEscalation(id, eid, dto, req.user.id ?? req.user.userId);
  }

  /**
   * PATCH /tickets/:id/escalation/:eid/update-proof
   * Lets the escalating technician append additional notes and/or proof photos
   * to a pending escalation they initiated.
   */
  @Patch(':id/escalation/:eid/update-proof')
  @Roles(...ALL_ROLES)
  @UseInterceptors(FilesInterceptor('proofFiles', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async updateEscalationProof(
    @Param('id') id: string,
    @Param('eid') eid: string,
    @Body() body: { notes?: string },
    @UploadedFiles() proofFiles: Express.Multer.File[],
    @Request() req: any,
  ) {
    return this.ticketService.updateEscalationProof(
      id, eid, body, proofFiles ?? [], req.user.id ?? req.user.userId,
    );
  }

  /** GET /tickets/proof/:ticketId/:filename — serve escalation proof photo */
  @Get('proof/:ticketId/:filename')
  @Roles(...ALL_ROLES)
  async serveProofFile(
    @Param('ticketId') ticketId: string,
    @Param('filename') filename: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { root, safeFilename } = await this.ticketService.ensureProofFileReadable(
      ticketId,
      filename,
      req.user.id ?? req.user.userId,
      req.user.role,
    );
    const filePath = path.join(root, safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ statusCode: 404, message: 'Proof file not found' });
    }
    res.sendFile(safeFilename, { root }, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ statusCode: 500, message: 'Error serving file' });
      }
    });
  }
}