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
} from '../services/ticket-settings.service';
import { EmailService } from '../services/email.service';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';

// All named staff roles — the CapabilityGuard enforces is_ticket_settings_focal at runtime
const ALL_STAFF_ROLES = [
  UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD,
  UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
  UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR,
  UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR,
  UserRole.LEAD_INFRA, UserRole.SERVER_ADMIN, UserRole.DB_ADMIN, UserRole.NETWORK_ADMIN,
  UserRole.PROJECT_MGR, UserRole.DEV_LEAD, UserRole.SQA_LEAD,
  UserRole.RECORDS_OFFICER, UserRole.HR_ID_OFFICER,
];

@Controller('ticket-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketSettingsController {
  constructor(
    private readonly settingsService: TicketSettingsService,
    private readonly emailService: EmailService,
    private readonly roleCapSvc: RoleCapabilitiesService,
  ) {}

  /** POST /ticket-settings/email-test — send a test email to verify SMTP (super_admin only) */
  @Post('email-test')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async testEmail(@Body('to') to: string) {
    if (!to) {
      return { message: 'Provide a recipient email address in the request body: { "to": "email@example.com" }' };
    }
    return this.emailService.sendTestEmail(to);
  }

  // ── Categories ──────────────────────────────────────────────────────────

  /** GET /ticket-settings/categories — active categories by default; pass ?all=true for admin to see all */
  @Get('categories')
  @Roles(
    UserRole.USER, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD,
    UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
    UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR,
    UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR,
    UserRole.LEAD_INFRA, UserRole.SERVER_ADMIN, UserRole.DB_ADMIN, UserRole.NETWORK_ADMIN,
    UserRole.PROJECT_MGR, UserRole.DEV_LEAD, UserRole.SQA_LEAD,
    UserRole.RECORDS_OFFICER, UserRole.HR_ID_OFFICER,
  )
  async listCategories(
    @Query('ticketType') ticketType?: string,
    @Query('all') all?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    // ?all=true → return everything (admin settings view)
    // ?activeOnly=false → also return everything
    // default (or ?activeOnly=true) → active only (ticket creation dropdown)
    if (all === 'true' || activeOnly === 'false') return this.settingsService.listCategories(ticketType);
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
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Request() req: any) {
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
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
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

  // ── Escalation Focal Configuration ──────────────────────────────────────

  /** GET /ticket-settings/escalation-focals */
  @Get('escalation-focals')
  @Roles(...ALL_STAFF_ROLES)
  async listEscalationFocals(@Query('ticketType') ticketType?: string) {
    return this.settingsService.listEscalationFocals(ticketType);
  }

  /**
   * GET /ticket-settings/escalation-available-roles
   * QA #13: Returns roles from DB (role_definitions), excluding non-assignable platform roles.
   */
  @Get('escalation-available-roles')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Roles(...ALL_STAFF_ROLES)
  async listAvailableEscalationRoles() {
    return this.settingsService.listAvailableEscalationRoles();
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
}
