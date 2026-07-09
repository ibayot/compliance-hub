import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RoleCapabilitiesService } from './role-capabilities.service';
import {
  CreateRoleDefinitionDto,
  UpdateRoleDefinitionDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateRoleCapabilityDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { EventBusService, CAPABILITIES_UPDATED_EVENT } from '../../common/events/event-bus.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly roleCapabilitiesService: RoleCapabilitiesService,
    private readonly eventBus: EventBusService,
  ) {}

  @Get('roles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  getRoles() {
    return this.usersService.getRoles();
  }

  @Post('roles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  createRole(@Body() createRoleDefinitionDto: CreateRoleDefinitionDto) {
    return this.usersService.createRoleDefinition(createRoleDefinitionDto);
  }

  @Patch('roles/:value')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  updateRole(
    @Param('value') value: string,
    @Body() updateRoleDefinitionDto: UpdateRoleDefinitionDto,
  ) {
    return this.usersService.updateRoleDefinition(value, updateRoleDefinitionDto);
  }

  @Delete('roles/:value')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  deleteRole(@Param('value') value: string) {
    return this.usersService.deleteRoleDefinition(value);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('search-email')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  searchEmail(@Query('q') q: string) {
    return this.usersService.searchEmails(q);
  }

  @Get()
  // @Roles removed to allow any authenticated user to list users for ticket proxying
  findAll() {
    return this.usersService.findAll();
  }

  @Get('federated')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  getFederatedUsers() {
    return this.usersService.getFederatedUsers();
  }

  // ── Role Capabilities ── declared BEFORE :id to avoid NestJS route shadowing ──

  /** Returns all role capability rows. Admin read access. */
  @Get('role-capabilities')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  async getRoleCapabilities() {
    await this.roleCapabilitiesService.reload();
    return this.roleCapabilitiesService.findAll();
  }

  /**
   * Returns the capability row for the currently authenticated user's role.
   * Accessible to any logged-in user (no @Roles restriction).
   */
  @Get('role-capabilities/me')
  getMyCapabilities(@Request() req: any) {
    return this.roleCapabilitiesService.findOne(req.user.role) ?? null;
  }

  /** Updates capability flags for a specific role. Super admin only. */
  @Patch('role-capabilities/:roleValue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  async updateRoleCapability(
    @Param('roleValue') roleValue: string,
    @Body() dto: UpdateRoleCapabilityDto,
  ) {
    const result = await this.roleCapabilitiesService.updateOne(roleValue, dto);
    void this.eventBus.publish(CAPABILITIES_UPDATED_EVENT, {
      role: roleValue,
      updatedAt: new Date().toISOString(),
    });
    return result;
  }

  // ── Generic user :id routes — kept AFTER static capability routes ──

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  findOne(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.usersService.findOne(parsedId);
  }

  @Patch(':id')
  // @Roles removed to allow self-update; authorization is checked inside the method
  update(@Request() req: any, @Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const parsedId = parseInt(id, 10);
    const isAdmin = [
      UserRole.SUPER_ADMIN,
      UserRole.SECTION_HEAD,
      UserRole.COMPLIANCE_OFFICER,
    ].includes(req.user.role);

    if (!isAdmin && req.user.id !== parsedId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    if (!isAdmin) {
      // Prevent privilege escalation for normal users
      delete updateUserDto.role;
      delete updateUserDto.active;
      delete updateUserDto.ticketMainFocal;
      delete updateUserDto.ticketTechnician;
    }

    return this.usersService.update(parsedId, updateUserDto);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  resetPassword(@Param('id') id: string) {
    return this.usersService.resetPassword(+id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.COMPLIANCE_OFFICER)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
