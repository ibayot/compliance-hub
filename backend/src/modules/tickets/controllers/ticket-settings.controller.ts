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
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  TicketSettingsService,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateKeywordRuleDto,
  UpdateKeywordRuleDto,
} from '../services/ticket-settings.service';
import { EmailService } from '../services/email.service';

const SETTINGS_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.TECHNICIAN,
  UserRole.TECHNICIAN_DESKTOP,
  UserRole.TECHNICIAN_IT_SUPPORT,
];

@Controller('ticket-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketSettingsController {
  constructor(
    private readonly settingsService: TicketSettingsService,
    private readonly emailService: EmailService,
  ) {}

  /** POST /ticket-settings/email-test — send a test email to verify SMTP (super_admin only) */
  @Post('email-test')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async testEmail(@Body('to') to: string) {
    const recipient = to || 'mjdibay@dswd.gov.ph';
    return this.emailService.sendTestEmail(recipient);
  }

  // ── Categories ──────────────────────────────────────────────────────────

  /** GET /ticket-settings/categories — all active categories (any logged-in user can fetch for dropdowns) */
  @Get('categories')
  @Roles(
    UserRole.USER, UserRole.FOCAL, UserRole.TECHNICIAN,
    UserRole.TECHNICIAN_DESKTOP, UserRole.TECHNICIAN_IT_SUPPORT,
    UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN,
  )
  async listCategories(@Query('ticketType') ticketType?: string, @Query('all') all?: string) {
    if (all === 'true') return this.settingsService.listCategories(ticketType);
    return this.settingsService.listActiveCategories(ticketType);
  }

  @Get('categories/:id')
  @Roles(...SETTINGS_ROLES)
  async getCategory(@Param('id') id: string) {
    return this.settingsService.getCategoryById(id);
  }

  @Post('categories')
  @Roles(...SETTINGS_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto, @Request() req: any) {
    return this.settingsService.createCategory(dto, req.user.id ?? req.user.userId);
  }

  @Patch('categories/:id')
  @Roles(...SETTINGS_ROLES)
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Request() req: any) {
    return this.settingsService.updateCategory(id, dto, req.user.id ?? req.user.userId);
  }

  @Delete('categories/:id')
  @Roles(...SETTINGS_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string, @Request() req: any) {
    await this.settingsService.deleteCategory(id, req.user.id ?? req.user.userId);
  }

  // ── Keyword Rules ──────────────────────────────────────────────────────

  @Get('keyword-rules')
  @Roles(...SETTINGS_ROLES)
  async listKeywordRules() {
    return this.settingsService.listKeywordRules();
  }

  @Get('keyword-rules/:id')
  @Roles(...SETTINGS_ROLES)
  async getKeywordRule(@Param('id') id: string) {
    return this.settingsService.getKeywordRuleById(id);
  }

  @Post('keyword-rules')
  @Roles(...SETTINGS_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createKeywordRule(@Body() dto: CreateKeywordRuleDto, @Request() req: any) {
    return this.settingsService.createKeywordRule(dto, req.user.id ?? req.user.userId);
  }

  @Patch('keyword-rules/:id')
  @Roles(...SETTINGS_ROLES)
  async updateKeywordRule(@Param('id') id: string, @Body() dto: UpdateKeywordRuleDto) {
    return this.settingsService.updateKeywordRule(id, dto);
  }

  @Delete('keyword-rules/:id')
  @Roles(...SETTINGS_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKeywordRule(@Param('id') id: string) {
    await this.settingsService.deleteKeywordRule(id);
  }
}
