import { BadRequestException, Controller, Get, Param, NotFoundException, UseGuards, ParseIntPipe, Post, Body, Optional, ServiceUnavailableException, Query, ForbiddenException, ParseUUIDPipe } from '@nestjs/common';
import { OutboundEmailPolicyService, OutboundEmailRecipientDto } from '../users/outbound-email-policy.service';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { UnitsService } from '../units/units.service';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { InternalServiceGuard } from '../../common/guards/internal-service.guard';
import { ACCOUNT_ACCESS_BATCH_SIZE } from '../../common/auth/account-access-batch';
import { AuthorizeAccountAccessDto } from './dto/authorize-account-access.dto';
import { USER_STUB_BATCH_SIZE } from '../../common/http-clients/user-stub-batch';
import { DemoModeService } from '../users/demo-mode.service';

/**
 * InternalController — inter-service API endpoints for users-service.
 *
 * These endpoints are NOT protected by JWT.  They are secured by the
 * InternalServiceGuard which checks the X-Service-Token header against
 * the INTERNAL_SERVICE_SECRET environment variable.
 *
 * Routes:
 *  GET /api/internal/users                 All users, or up to 100 IDs via ?ids=1,2
 *  GET /api/internal/users/:id             Single user by ID
 *  GET /api/internal/units                 All active units
 *  GET /api/internal/units/:id             Single unit by ID
 *  GET /api/internal/role-capabilities     Full role capability matrix
 *
 * These endpoints are called by compliance-service and ticketing-service
 * via UsersHttpClient as an HTTP-first alternative to cross-DB SQL views.
 */
@ApiTags('_internal')
@Controller('internal')
@UseGuards(InternalServiceGuard)
export class InternalController {
  constructor(
    private readonly usersService: UsersService,
    private readonly unitsService: UnitsService,
    private readonly roleCapabilitiesService: RoleCapabilitiesService,
    @Optional() private readonly outboundEmailPolicy?: OutboundEmailPolicyService,
    @Optional() private readonly demoMode?: DemoModeService,
  ) {}

  @Post('demo/authorize')
  async authorizeDemo(@Body('userId', ParseIntPipe) userId: number, @Body('tokenJti', ParseUUIDPipe) jti: string,
    @Body('runId', ParseUUIDPipe) runId: string) {
    if (!this.outboundEmailPolicy) throw new ServiceUnavailableException('Demo access could not be verified.');
    const account = await this.outboundEmailPolicy.authorizeRequestAccount(userId, jti, runId);
    return account.demo;
  }

  @Post('demo/authorize-administrator')
  async authorizeDemoAdministrator(@Body() dto: AuthorizeAccountAccessDto) {
    if (!this.outboundEmailPolicy) throw new ServiceUnavailableException('Demo access could not be verified.');
    const account = await this.outboundEmailPolicy.authorizeRequestAccount(dto.userId, dto.tokenJti);
    if (!this.roleCapabilitiesService.isSecuritySettingsAccess(account.role)) throw new ForbiddenException();
    return { allowed: true };
  }

  @Get('demo/expired')
  async expiredDemoRuns() {
    if (!this.demoMode) throw new ServiceUnavailableException('Demo cleanup is unavailable.');
    return this.demoMode.expired();
  }

  @Post('demo/expired/:id/purged')
  async markDemoRunPurged(@Param('id', ParseUUIDPipe) id: string) {
    if (!this.demoMode) throw new ServiceUnavailableException('Demo cleanup is unavailable.');
    return this.demoMode.markPurged(id);
  }

  @Post('outbound-email/decision')
  decideOutboundEmail(@Body() dto: OutboundEmailRecipientDto) {
    if (!this.outboundEmailPolicy) throw new ServiceUnavailableException('Email policy is unavailable.');
    return this.outboundEmailPolicy.decide(dto.recipientEmail, dto.purpose);
  }

  @Get('account-access/:id')
  decideAccountAccess(@Param('id', ParseIntPipe) id: number) {
    if (!this.outboundEmailPolicy) throw new ServiceUnavailableException('Application access policy is unavailable.');
    return this.outboundEmailPolicy.decideAccountAccess(id);
  }

  @Post('account-access/authorize')
  authorizeAccountAccess(@Body() dto: AuthorizeAccountAccessDto) {
    if (!this.outboundEmailPolicy) throw new ServiceUnavailableException('Application access policy is unavailable.');
    return this.outboundEmailPolicy.decideRequestAccountAccess(dto.userId, dto.tokenJti);
  }

  @Post('account-access/batch')
  decideAccountAccessBatch(@Body('accountIds') accountIds: unknown) {
    if (!Array.isArray(accountIds) || accountIds.length < 1 || accountIds.length > ACCOUNT_ACCESS_BATCH_SIZE ||
        accountIds.some(id => !Number.isSafeInteger(id) || id < 1)) {
      throw new BadRequestException(`Supply between 1 and ${ACCOUNT_ACCESS_BATCH_SIZE} valid account IDs.`);
    }
    if (!this.outboundEmailPolicy) throw new ServiceUnavailableException('Application access policy is unavailable.');
    return this.outboundEmailPolicy.decideAccountAccessBatch([...new Set<number>(accountIds)]);
  }

  @Get('users')
  async getUsers(@Query('ids') ids?: string, @Query('include_phone') includePhone?: string) {
    if (includePhone !== undefined && includePhone !== 'true' && includePhone !== 'false') {
      throw new BadRequestException('include_phone must be true or false.');
    }
    if (includePhone === 'true' && ids === undefined) {
      throw new BadRequestException('include_phone requires a bounded ids query.');
    }
    const users = ids === undefined
      ? await this.usersService.findAllInternalStubs()
      : await this.usersService.findInternalStubsByIds(this.parseUserIds(ids), includePhone === 'true');
    return users.map((u) => {
      const result: Record<string, unknown> = {
        id: u.id,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
        middle_name: u.middleName ?? null,
        suffix: u.suffix ?? null,
        role: u.role,
        active: u.active,
        autoAssignmentEligible: u.autoAssignmentEligible !== false,
        attendanceEligible: (u as any).attendanceEligible === true,
        technicianEligible: (u as any).technicianEligible === true,
        staff_id: u.staffId ?? null,

        units: u.units || [],
      };
      if (includePhone === 'true') result.phone_number = u.phoneNumber ?? null;
      return result;
    });
  }

  private parseUserIds(value: string): number[] {
    const parts = value.split(',');
    if (parts.length > USER_STUB_BATCH_SIZE || parts.some((part) => !/^\d+$/.test(part.trim()))) {
      throw new BadRequestException(`Supply between 1 and ${USER_STUB_BATCH_SIZE} valid user IDs.`);
    }
    const ids = [...new Set(parts.map((part) => Number(part.trim())))];
    if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
      throw new BadRequestException(`Supply between 1 and ${USER_STUB_BATCH_SIZE} valid user IDs.`);
    }
    return ids;
  }

  @Get('users/:id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    const [user] = await this.usersService.findInternalStubsByIds([id], true);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      middle_name: user.middleName ?? null,
      suffix: user.suffix ?? null,
      role: user.role,
      active: user.active,
      autoAssignmentEligible: user.autoAssignmentEligible !== false,
      attendanceEligible: (user as any).attendanceEligible === true,
      technicianEligible: (user as any).technicianEligible === true,
      staff_id: user.staffId ?? null,
      phone_number: user.phoneNumber ?? null,

      units: user.units || [],
    };
  }

  @Get('units')
  async getUnits() {
    return this.unitsService.findAll();
  }

  @Get('units/:id')
  async getUnitById(@Param('id', ParseIntPipe) id: number) {
    const unit = await this.unitsService.findOne(id);
    if (!unit) {
      throw new NotFoundException(`Unit ${id} not found`);
    }
    return unit;
  }

  /**
   * Returns the full role capability matrix.
   * Consumed by ticketing-service and compliance-service to seed their local
   * RoleCapabilitiesHttpClient cache without needing a cross-DB SQL view.
   *
   * Response shape matches RoleCapabilityStub in UsersHttpClient.
   */
  @Get('role-capabilities')
  getRoleCapabilities() {
    return this.roleCapabilitiesService.findAll();
  }
}
