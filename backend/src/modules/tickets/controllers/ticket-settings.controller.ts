import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  TicketSettingsService,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateKeywordRuleDto,
  UpdateKeywordRuleDto,
  CreateEscalationFocalDto,
  CreateIssueTypeDto,
  UpdateIssueTypeDto,
  UpdateGlobalConfigDto,
} from '../services/ticket-settings.service';
import { EmailService } from '../services/email.service';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import { TicketPriority, TicketType } from '../entities/ticket.entity';

// All named staff roles — the CapabilityGuard enforces is_ticket_settings_focal at runtime
const ALL_STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
  UserRole.COMPLIANCE_OFFICER,
  UserRole.CYBERSEC,
  UserRole.INFOSEC,
  UserRole.PANTAWID_ICT,
  UserRole.DESKTOP_SR,
  UserRole.IT_SUPPORT_SR,
  UserRole.DESKTOP_JR,
  UserRole.IT_SUPPORT_JR,
  UserRole.LEAD_INFRA,
  UserRole.SERVER_ADMIN,
  UserRole.DB_ADMIN,
  UserRole.NETWORK_ADMIN,
  UserRole.PROJECT_MGR,
  UserRole.DEV_LEAD,
  UserRole.SQA_LEAD,
  UserRole.RECORDS_OFFICER,
  UserRole.HR_ID_OFFICER,
];

@ApiTags('ticket-settings')
@Controller('ticket-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketSettingsController {
  constructor(
    private readonly settingsService: TicketSettingsService,
    private readonly emailService: EmailService,
    private readonly roleCapSvc: RoleCapabilitiesService,
  ) {}

  /** POST /ticket-settings/email-test — send a test email to verify SMTP (super_admin only) */
  @ApiTags('_test-only')
  @Post('email-test')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async testEmail(@Body('to') to: string) {
    if (!to) {
      return {
        message:
          'Provide a recipient email address in the request body: { "to": "email@example.com" }',
      };
    }
    return this.emailService.sendTestEmail(to);
  }

  /** GET /ticket-settings — consolidated reference data for ticket forms/settings screens */
  @Get()
  @Roles(
    UserRole.USER,
    UserRole.SUPER_ADMIN,
    UserRole.SECTION_HEAD,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.CYBERSEC,
    UserRole.INFOSEC,
    UserRole.PANTAWID_ICT,
    UserRole.DESKTOP_SR,
    UserRole.IT_SUPPORT_SR,
    UserRole.DESKTOP_JR,
    UserRole.IT_SUPPORT_JR,
    UserRole.LEAD_INFRA,
    UserRole.SERVER_ADMIN,
    UserRole.DB_ADMIN,
    UserRole.NETWORK_ADMIN,
    UserRole.PROJECT_MGR,
    UserRole.DEV_LEAD,
    UserRole.SQA_LEAD,
    UserRole.RECORDS_OFFICER,
    UserRole.HR_ID_OFFICER,
  )
  async getTicketSettingsSnapshot(
    @Query('ticketType') ticketType?: string,
    @Query('all') all?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const includeAll = all === 'true' || activeOnly === 'false';
    const [categories, issueTypes] = await Promise.all([
      includeAll
        ? this.settingsService.listCategories(ticketType)
        : this.settingsService.listActiveCategories(ticketType),
      includeAll
        ? this.settingsService.listIssueTypes()
        : this.settingsService.listActiveIssueTypes(),
    ]);

    return {
      categories,
      issueTypes,
      priorities: Object.values(TicketPriority),
      ticketTypes: Object.values(TicketType),
    };
  }

  // ── Categories ──────────────────────────────────────────────────────────

  /** GET /ticket-settings/categories — active categories by default; pass ?all=true for admin to see all */
  @Get('categories')
  @Roles(
    UserRole.USER,
    UserRole.SUPER_ADMIN,
    UserRole.SECTION_HEAD,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.CYBERSEC,
    UserRole.INFOSEC,
    UserRole.PANTAWID_ICT,
    UserRole.DESKTOP_SR,
    UserRole.IT_SUPPORT_SR,
    UserRole.DESKTOP_JR,
    UserRole.IT_SUPPORT_JR,
    UserRole.LEAD_INFRA,
    UserRole.SERVER_ADMIN,
    UserRole.DB_ADMIN,
    UserRole.NETWORK_ADMIN,
    UserRole.PROJECT_MGR,
    UserRole.DEV_LEAD,
    UserRole.SQA_LEAD,
    UserRole.RECORDS_OFFICER,
    UserRole.HR_ID_OFFICER,
  )
  async listCategories(
    @Query('ticketType') ticketType?: string,
    @Query('all') all?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    // ?all=true → return everything (admin settings view)
    // ?activeOnly=false → also return everything
    // default (or ?activeOnly=true) → active only (ticket creation dropdown)
    if (all === 'true' || activeOnly === 'false')
      return this.settingsService.listCategories(ticketType);
    return this.settingsService.listActiveCategories(ticketType);
  }

  @Get('categories/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async getCategory(@Param('id') id: string) {
    return this.settingsService.getCategoryById(id);
  }

  @Post('categories')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto, @Request() req: any) {
    return this.settingsService.createCategory(dto, req.user.id ?? req.user.userId);
  }

  @Patch('categories/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Request() req: any,
  ) {
    return this.settingsService.updateCategory(id, dto, req.user.id ?? req.user.userId);
  }

  @Delete('categories/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string, @Request() req: any) {
    await this.settingsService.deleteCategory(id, req.user.id ?? req.user.userId);
  }

  // ── Keyword Rules ──────────────────────────────────────────────────────

  @Get('keyword-rules')
  @Roles(
    UserRole.USER,
    ...ALL_STAFF_ROLES,
  )
  async listKeywordRules() {
    return this.settingsService.listKeywordRules();
  }

  @Get('keyword-rules/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async getKeywordRule(@Param('id') id: string) {
    return this.settingsService.getKeywordRuleById(id);
  }

  @Post('keyword-rules')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createKeywordRule(@Body() dto: CreateKeywordRuleDto, @Request() req: any) {
    return this.settingsService.createKeywordRule(dto, req.user.id ?? req.user.userId);
  }

  @Patch('keyword-rules/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async updateKeywordRule(@Param('id') id: string, @Body() dto: UpdateKeywordRuleDto) {
    return this.settingsService.updateKeywordRule(id, dto);
  }

  @Delete('keyword-rules/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKeywordRule(@Param('id') id: string) {
    await this.settingsService.deleteKeywordRule(id);
  }

  // ── Issue Types ───────────────────────────────────────────────────────

  @Get('issue-types')
  @Roles(
    UserRole.USER,
    UserRole.SUPER_ADMIN,
    UserRole.SECTION_HEAD,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.CYBERSEC,
    UserRole.INFOSEC,
    UserRole.PANTAWID_ICT,
    UserRole.DESKTOP_SR,
    UserRole.IT_SUPPORT_SR,
    UserRole.DESKTOP_JR,
    UserRole.IT_SUPPORT_JR,
    UserRole.LEAD_INFRA,
    UserRole.SERVER_ADMIN,
    UserRole.DB_ADMIN,
    UserRole.NETWORK_ADMIN,
    UserRole.PROJECT_MGR,
    UserRole.DEV_LEAD,
    UserRole.SQA_LEAD,
    UserRole.RECORDS_OFFICER,
    UserRole.HR_ID_OFFICER,
  )
  async listIssueTypes(
    @Query('categoryId') categoryId?: string,
    @Query('all') all?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    if (all === 'true' || activeOnly === 'false') {
      return this.settingsService.listIssueTypes(categoryId);
    }
    return this.settingsService.listActiveIssueTypes(categoryId);
  }

  @Get('issue-types/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async getIssueType(@Param('id') id: string) {
    return this.settingsService.getIssueTypeById(id);
  }

  @Post('issue-types')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createIssueType(@Body() dto: CreateIssueTypeDto, @Request() req: any) {
    return this.settingsService.createIssueType(dto, req.user.id ?? req.user.userId);
  }

  @Patch('issue-types/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async updateIssueType(
    @Param('id') id: string,
    @Body() dto: UpdateIssueTypeDto,
    @Request() req: any,
  ) {
    return this.settingsService.updateIssueType(id, dto, req.user.id ?? req.user.userId);
  }

  @Delete('issue-types/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIssueType(@Param('id') id: string, @Request() req: any) {
    await this.settingsService.deleteIssueType(id, req.user.id ?? req.user.userId);
  }

  // ── Escalation Focal Configuration ──────────────────────────────────────

  /** GET /ticket-settings/escalation-focals */
  @Get('escalation-focals')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isEscalationFocal')
  @Roles(...ALL_STAFF_ROLES)
  async listEscalationFocals(@Query('ticketType') ticketType?: string) {
    return this.settingsService.listEscalationFocals(ticketType);
  }

  /**
   * GET /ticket-settings/escalation-available-roles
   * QA #13: Returns roles from DB (role_definitions), excluding non-assignable platform roles.
   */
  @Get('escalation-available-users')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async listAvailableEscalationUsers() {
    return this.settingsService.listAvailableEscalationUsers();
  }

  /** POST /ticket-settings/escalation-focals */
  @Post('escalation-focals')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async addEscalationFocal(@Body() dto: CreateEscalationFocalDto, @Request() req: any) {
    return this.settingsService.addEscalationFocal(dto, req.user.id ?? req.user.userId);
  }

  /** DELETE /ticket-settings/escalation-focals/:id */
  @Delete('escalation-focals/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEscalationFocal(@Param('id') id: string) {
    await this.settingsService.removeEscalationFocal(Number(id));
  }

  // ── Global Config ───────────────────────────────────────────────────────

  @Get('global-config')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async getGlobalConfig() {
    return this.settingsService.getGlobalConfig();
  }

  @Patch('global-config')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async updateGlobalConfig(@Body() dto: UpdateGlobalConfigDto) {
    const updated = await this.settingsService.updateGlobalConfig(dto);

    // If SMTP fields were touched, immediately trigger the email service to reload its Nodemailer transporter
    if (
      dto.smtpHost !== undefined ||
      dto.smtpPort !== undefined ||
      dto.smtpUser !== undefined ||
      dto.smtpPass !== undefined ||
      dto.smtpFrom !== undefined ||
      dto.smtpFromName !== undefined
    ) {
      await this.emailService.reloadSmtpConfig();
    }

    return updated;
  }

  // ── SLA Insights ───────────────────────────────────────────────────────

  @Get('sla-insights')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async getSlaInsights(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('quarter') quarter?: string,
    @Query('semester') semester?: string,
  ) {
    const filters = {
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      semester: semester ? Number(semester) : undefined,
    };
    return this.settingsService.getSlaInsights(filters);
  }
}
