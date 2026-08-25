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
  UploadedFile,
  UseInterceptors,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
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
import { TicketSettingsService } from '../services/ticket-settings.service';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard, CapabilityGuard)
export class TicketController {
  private readonly logger = new Logger(TicketController.name);
  constructor(
    private readonly ticketService: TicketService,
    private readonly settingsService: TicketSettingsService,
  ) {}

  /** POST /tickets - Any authenticated user can submit a ticket */
  @Post()
  @RequireCapability('isTicketModuleAccess')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async createTicket(
    @Body() dto: CreateTicketDto,
    @Request() req: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (image && !image.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only picture attachments (images) are allowed.');
    }
    const callerId = req.user.id ?? req.user.userId;
    const callerRole = req.user.role as UserRole;
    return this.ticketService.createTicket(dto, callerId, callerRole, image);
  }

  @Post('global-pause')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  async globalPauseTickets() {
    await this.settingsService.updateGlobalConfig({ isFlagCeremonyPaused: true });
    const count = await this.ticketService.pauseAllActiveTickets();
    return { success: true, count, message: 'All active tickets have been paused globally.' };
  }

  @Post('global-resume')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  async globalResumeTickets() {
    await this.settingsService.updateGlobalConfig({ isFlagCeremonyPaused: false });
    const count = await this.ticketService.resumeAllActiveTickets();
    return {
      success: true,
      count,
      message: 'All previously paused active tickets have been resumed globally.',
    };
  }

  /** GET /tickets - Role-scoped listing */
  @Get()
  @RequireCapability('isTicketModuleAccess')
  async getTickets(
    @Query('status') status?: TicketStatus,
    @Query('ticketType') ticketType?: TicketType,
    @Query('requesterId') requesterId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('escalatedToMe') escalatedToMe?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('quarter') quarter?: string,
    @Query('semester') semester?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Request() req?: any,
  ) {
    const viewerId = req?.user?.id ?? req?.user?.userId;
    const showEscalatedToMe = escalatedToMe === 'true' || escalatedToMe === '1';
    return this.ticketService.getTickets({
      status,
      ticketType,
      requesterId: requesterId ? Number(requesterId) : undefined,
      assignedToId: assignedToId ? Number(assignedToId) : undefined,
      escalatedToId: showEscalatedToMe ? viewerId : undefined,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      semester: semester ? Number(semester) : undefined,
      search,
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
  @RequireCapability('isTicketModuleAccess')
  async getSlaSummary(@Request() req: any) {
    return this.ticketService.getSlaSummary(req.user.id ?? req.user.userId, req.user.role);
  }

  /** GET /tickets/statistics */
  @Get('statistics')
  @RequireCapability('isReportsAccess')
  async getStatistics(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('quarter') quarter?: string,
    @Query('semester') semester?: string,
  ) {
    return this.ticketService.getStatistics({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      semester: semester ? Number(semester) : undefined,
    });
  }

  /** GET /tickets/technicians */
  @Get('technicians')
  @RequireCapability('isTicketModuleAccess')
  async getTechnicians() {
    return this.ticketService.getTechnicianAvailability();
  }

  /** GET /tickets/general-overview-stats?year=&month= */
  @Get('general-overview-stats')
  @RequireCapability('isReportsAccess')
  async getGeneralOverviewStats(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.ticketService.getGeneralOverviewStats(
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
    );
  }

  /** GET /tickets/dashboard */
  @Get('dashboard')
  @RequireCapability('isTicketModuleAccess')
  async getDashboardStats(@Request() req: any) {
    return this.ticketService.getUserDashboardStats(req.user.id ?? req.user.userId);
  }

  /** GET /tickets/assigned-stats?year=&month= — monthly stats for tickets ASSIGNED to the caller */
  @Get('assigned-stats')
  @RequireCapability('isTicketModuleAccess')
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
  @RequireCapability('isTicketModuleAccess')
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

  @Get('performance-metrics')
  @RequireCapability('isTicketModuleAccess')
  async getPerformanceMetrics(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('quarter') quarter?: string,
    @Query('semester') semester?: string,
    @Query('technicianId') technicianId?: string,
    @Query('ticketType') ticketType?: string,
    @Request() req?: any,
  ) {
    return this.ticketService.getPerformanceMetrics({
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

  /** GET /tickets/ratings-report — detailed ratings report (Tickets, Techs, Days/Weeks/Months/Quarters) */
  @Get('ratings-report')
  @RequireCapability('isTicketModuleAccess')
  async getRatingsReport(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('quarter') quarter?: string,
    @Query('semester') semester?: string,
    @Query('technicianId') technicianId?: string,
    @Query('ticketType') ticketType?: string,
  ) {
    return this.ticketService.getRatingsReport({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      semester: semester ? Number(semester) : undefined,
      technicianId: technicianId ? Number(technicianId) : undefined,
      ticketType,
    });
  }

  /** GET /tickets/report-technicians — technicians who had tickets in a given period */
  @Get('report-technicians')
  @RequireCapability('isTicketModuleAccess')
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
  @RequireCapability('isTicketModuleAccess')
  async getTicket(@Param('id') id: string, @Request() req: any) {
    return this.ticketService.getTicketById(
      id,
      req.user?.role as UserRole,
      req.user.id ?? req.user.userId,
    );
  }

  /** PATCH /tickets/:id */
  @Patch(':id')
  @RequireCapability('isTicketModuleAccess')
  async updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Request() req: any) {
    return this.ticketService.updateTicket(id, dto, req.user.id ?? req.user.userId, req.user.role);
  }

  /** GET /tickets/requester/:requesterId/open - open tickets for Duplicate picker */
  @Get('requester/:requesterId/open')
  @RequireCapability('isTicketModuleAccess')
  async getRequesterOpenTickets(@Param('requesterId') requesterId: string, @Request() req: any) {
    return this.ticketService.getOpenTicketsForRequester(
      Number(requesterId),
      req.user.id ?? req.user.userId,
      req.user.role,
    );
  }

  /** PATCH /tickets/:id/assign */
  @Patch(':id/assign')
  @RequireCapability('isTicketModuleAccess')
  async assignTicket(@Param('id') id: string, @Body() dto: AssignTicketDto, @Request() req: any) {
    return this.ticketService.assignTicket(id, dto, req.user.role, req.user.id ?? req.user.userId);
  }

  /** PATCH /tickets/:id/mark-viewed — auto-transition assigned→in_progress when technician views the ticket */
  @Patch(':id/mark-viewed')
  @RequireCapability('isTicketModuleAccess')
  async markTicketViewed(@Param('id') id: string, @Request() req: any) {
    return this.ticketService.markTicketViewed(id, req.user.id ?? req.user.userId, req.user.role);
  }

  /** GET /tickets/:id/events — timeline of all ticket events */
  @Get(':id/events')
  @RequireCapability('isTicketModuleAccess')
  async getTicketEvents(@Param('id') id: string, @Request() req: any) {
    return this.ticketService.getTicketEvents(id, req.user.id ?? req.user.userId, req.user.role);
  }

  /** POST /tickets/:id/comments */
  @Post(':id/comments')
  @RequireCapability('isTicketModuleAccess')
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async addComment(
    @Param('id') ticketId: string,
    @Body() dto: AddCommentDto,
    @Request() req: any,
    @UploadedFile() attachment?: Express.Multer.File,
  ) {
    if (attachment && !attachment.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only picture attachments (images) are allowed.');
    }
    return this.ticketService.addComment(
      ticketId,
      dto,
      req.user.id ?? req.user.userId,
      req.user.role,
      attachment,
    );
  }

  /** POST /tickets/:id/satisfaction */
  @Post(':id/satisfaction')
  @RequireCapability('isTicketModuleAccess')
  async submitSatisfaction(
    @Param('id') id: string,
    @Body() dto: SubmitSatisfactionDto,
    @Request() req: any,
  ) {
    return this.ticketService.submitSatisfaction(id, dto, req.user.id ?? req.user.userId);
  }

  /** POST /tickets/:id/rate — backward-compatible alias for satisfaction submission */
  @Post(':id/rate')
  @RequireCapability('isTicketModuleAccess')
  async submitSatisfactionAlias(
    @Param('id') id: string,
    @Body() dto: SubmitSatisfactionDto,
    @Request() req: any,
  ) {
    return this.ticketService.submitSatisfaction(id, dto, req.user.id ?? req.user.userId);
  }

  /** GET /tickets/satisfaction/unit-suggestions — distinct unit values from past CSAT forms */
  @Get('satisfaction/unit-suggestions')
  @RequireCapability('isTicketModuleAccess')
  async getSatisfactionUnitSuggestions() {
    return this.ticketService.getSatisfactionUnitSuggestions();
  }

  // ── Escalation ────────────────────────────────────────────────────────────

  /** GET /tickets/escalations/all */
  @Get('escalations/all')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isEscalationFocal')
  async getAllEscalations() {
    return this.ticketService.getAllEscalations();
  }

  /** GET /tickets/:id/escalations */
  @Get(':id/escalations')
  @RequireCapability('isTicketModuleAccess')
  async getEscalations(@Param('id') id: string, @Request() req: any) {
    return this.ticketService.getEscalations(id, req.user.id ?? req.user.userId, req.user.role);
  }

  /** POST /tickets/:id/escalate — upload proof photos (multipart/form-data) */
  @Post(':id/escalate')
  @RequireCapability('isTicketModuleAccess')
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
    try {
      return await this.ticketService.escalateTicket(
        id,
        dto,
        proofFiles ?? [],
        req.user.id ?? req.user.userId,
        req.user.role,
      );
    } catch (e) {
      console.error('Escalate error:', e);
      throw e;
    }
  }

  /** PATCH /tickets/:id/escalation/:eid/accept */
  @Patch(':id/escalation/:eid/accept')
  @RequireCapability('isTicketModuleAccess')
  async acceptEscalation(@Param('id') id: string, @Param('eid') eid: string, @Request() req: any) {
    return this.ticketService.acceptEscalation(id, eid, req.user.id ?? req.user.userId);
  }

  /** PATCH /tickets/:id/escalation/:eid/return */
  @Patch(':id/escalation/:eid/return')
  @RequireCapability('isTicketModuleAccess')
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
  @RequireCapability('isTicketModuleAccess')
  @UseInterceptors(FilesInterceptor('proofFiles', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async updateEscalationProof(
    @Param('id') id: string,
    @Param('eid') eid: string,
    @Body() body: { notes?: string },
    @UploadedFiles() proofFiles: Express.Multer.File[],
    @Request() req: any,
  ) {
    return this.ticketService.updateEscalationProof(
      id,
      eid,
      body,
      proofFiles ?? [],
      req.user.id ?? req.user.userId,
    );
  }

  /** GET /tickets/proof/:ticketId/:filename — serve escalation proof photo */
  @Get('proof/:ticketId/:filename')
  @RequireCapability('isTicketModuleAccess')
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
      throw new NotFoundException('Proof file not found.');
    }

    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(filePath);
  }

  /** GET /tickets/comment-attachment/:ticketId/:filename — serve comment attachment */
  @Get('comment-attachment/:ticketId/:filename')
  @RequireCapability('isTicketModuleAccess')
  async serveCommentAttachmentFile(
    @Param('ticketId') ticketId: string,
    @Param('filename') filename: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { root, safeFilename } = await this.ticketService.ensureCommentAttachmentReadable(
      ticketId,
      filename,
      req.user.id ?? req.user.userId,
      req.user.role,
    );
    const filePath = path.join(root, safeFilename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Attachment file not found.');
    }

    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(filePath);
  }

  @Post('technician-pause')
  async technicianPauseTickets(@Request() req: any) {
    const technicianId = req.user.id ?? req.user.userId;
    const count = await this.ticketService.pauseAllActiveTickets(technicianId);
    return { success: true, count, message: `Paused ${count} active tickets for technician.` };
  }

  @Get('reports/issue-counts')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @RequireCapability('isTicketModuleAccess')
  async getIssueCountsReport(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('quarter') quarter?: string,
    @Query('semester') semester?: string,
    @Query('technicianId') technicianId?: string,
    @Query('ticketType') ticketType?: string,
  ) {
    return this.ticketService.getIssueCountsReport({
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
      quarter: quarter ? parseInt(quarter, 10) : undefined,
      semester: semester ? parseInt(semester, 10) : undefined,
      technicianId,
      ticketType,
    });
  }
}
