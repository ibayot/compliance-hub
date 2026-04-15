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
  NotFoundException,
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
  UserRole.USER, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.TECHNICIAN,
  UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT,
  UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
  UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN,
  // v0.6.14 named roles
  UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
  UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR,
  UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR,
  // focal-equivalent staff roles — also matched via roleCode='focal' in RolesGuard
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
    });
  }

  /** GET /tickets/statistics */
  @Get('statistics')
  @Roles(UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN, UserRole.FOCAL, UserRole.SECTION_HEAD,
    UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC)
  async getStatistics() { return this.ticketService.getStatistics(); }

  /** GET /tickets/technicians */
  @Get('technicians')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.REVIEWER, UserRole.TECHNICIAN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
    UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.REVIEWER,
    UserRole.COMPLIANCE_OFFICER, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_DESKTOP,
    UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_SR, UserRole.PANTAWID_ICT, UserRole.TECHNICIAN)
  async getTicketReports(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('quarter') quarter?: string,
    @Query('semester') semester?: string,
    @Query('technicianId') technicianId?: string,
    @Query('ticketType') ticketType?: string,
  ) {
    return this.ticketService.getTicketReports({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      semester: semester ? Number(semester) : undefined,
      technicianId: technicianId ? Number(technicianId) : undefined,
      ticketType,
    });
  }

  /** GET /tickets/:id */
  @Get(':id')
  @Roles(...ALL_ROLES)
  async getTicket(@Param('id') id: string, @Request() req: any) {
    return this.ticketService.getTicketById(id, req.user?.role as UserRole);
  }

  /** PATCH /tickets/:id */
  @Patch(':id')
  @Roles(UserRole.USER, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.TECHNICIAN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF, UserRole.REVIEWER, UserRole.SUPER_ADMIN,
    UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR)
  async updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Request() req: any) {
    return this.ticketService.updateTicket(id, dto, req.user.id ?? req.user.userId, req.user.role);
  }

  /** GET /tickets/requester/:requesterId/open - open tickets for Duplicate picker */
  @Get('requester/:requesterId/open')
  @Roles(UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.SUPER_ADMIN, UserRole.REVIEWER, UserRole.TECHNICIAN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
    UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR)
  async getRequesterOpenTickets(@Param('requesterId') requesterId: string) {
    return this.ticketService.getOpenTicketsForRequester(Number(requesterId));
  }

  /** PATCH /tickets/:id/assign */
  @Patch(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.REVIEWER, UserRole.TECHNICIAN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
    UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR)
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
  async getTicketEvents(@Param('id') id: string) {
    return this.ticketService.getTicketEvents(id);
  }

  /** POST /tickets/:id/comments */
  @Post(':id/comments')
  @Roles(UserRole.USER, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.TECHNICIAN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT, UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF, UserRole.REVIEWER, UserRole.SUPER_ADMIN,
    UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR)
  async addComment(@Param('id') ticketId: string, @Body() dto: AddCommentDto, @Request() req: any) {
    return this.ticketService.addComment(ticketId, dto, req.user.id ?? req.user.userId, req.user.role);
  }

  /** POST /tickets/:id/satisfaction */
  @Post(':id/satisfaction')
  @Roles(...ALL_ROLES)
  async submitSatisfaction(@Param('id') id: string, @Body() dto: SubmitSatisfactionDto, @Request() req: any) {
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
  async getEscalations(@Param('id') id: string) {
    return this.ticketService.getEscalations(id);
  }

  /** POST /tickets/:id/escalate — upload proof photos (multipart/form-data) */
  @Post(':id/escalate')
  @Roles(
    UserRole.SUPER_ADMIN, UserRole.FOCAL, UserRole.SECTION_HEAD, UserRole.REVIEWER,
    UserRole.TECHNICIAN, UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT,
    UserRole.TECHNICIAN_IT_STAFF, UserRole.TECHNICIAN_DESKTOP_STAFF,
    UserRole.COMPLIANCE_OFFICER, UserRole.PANTAWID_ICT,
    UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR,
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

  /** GET /tickets/proof/:ticketId/:filename — serve escalation proof photo */
  @Get('proof/:ticketId/:filename')
  @Roles(...ALL_ROLES)
  async serveProofFile(
    @Param('ticketId') ticketId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Sanitize inputs — prevent path traversal
    const safeTicketId = path.basename(ticketId);
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'storage', 'escalation-proofs', safeTicketId, safeFilename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Proof file not found');
    }
    res.sendFile(filePath);
  }
}