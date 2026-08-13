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
import { ApiTags } from '@nestjs/swagger';
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
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { RequireCapability } from '../../common/decorators/require-capability.decorator';
import { UserRole } from './entities/user.entity';
import { EventBusService, CAPABILITIES_UPDATED_EVENT } from '../../common/events/event-bus.service';

@ApiTags('users')
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
  async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    const isView = this.roleCapabilitiesService.isUserManagementView(req.user.role);
    const isAdmin = this.roleCapabilitiesService.isUserManagementAdmin(req.user.role);
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;

    if (!isView && !isAdmin && !isSuperAdmin) {
      throw new ForbiddenException('You do not have permission to create users.');
    }

    if (isView && !isAdmin && !isSuperAdmin) {
      // Force role to regular user
      createUserDto.role = UserRole.USER;
    }

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
  @UseGuards(CapabilityGuard)
  @RequireCapability('isRoleCapabilitiesAccess')
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

  /** Updates capability flags for a specific role. Super admin or Section Head only for Admin cap. */
  @Patch('role-capabilities/:roleValue')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isRoleCapabilitiesAccess')
  async updateRoleCapability(
    @Param('roleValue') roleValue: string,
    @Body() dto: UpdateRoleCapabilityDto,
    @Request() req: any,
  ) {
    const isSectionHead = req.user.role === UserRole.SECTION_HEAD;
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;

    if (dto.isUserManagementAdmin !== undefined && !isSectionHead && !isSuperAdmin) {
      throw new ForbiddenException('Only Section Head or Super Admin can modify the User Management Admin capability.');
    }

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
  async update(@Request() req: any, @Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const parsedId = parseInt(id, 10);
    const targetUser = await this.usersService.findOne(parsedId);

    const isView = this.roleCapabilitiesService.isUserManagementView(req.user.role);
    const isAdmin = this.roleCapabilitiesService.isUserManagementAdmin(req.user.role);
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
    const isSectionHead = req.user.role === UserRole.SECTION_HEAD;
    const isSelf = req.user.id === parsedId;

    const hasManagementAccess = isView || isAdmin || isSuperAdmin;

    if (!hasManagementAccess && !isSelf) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // View capability can only target "user" role
    if (isView && !isAdmin && !isSuperAdmin && !isSelf && targetUser.role !== UserRole.USER) {
      throw new ForbiddenException('You can only modify Regular Staff users.');
    }

    const targetIsAdmin = this.roleCapabilitiesService.isUserManagementAdmin(targetUser.role);
    const targetIsSuperAdmin = targetUser.role === UserRole.SUPER_ADMIN;

    // Admin capability can target anyone except another Admin/SuperAdmin, UNLESS they are a Section Head/Super Admin
    if (isAdmin && !isSuperAdmin && !isSectionHead && !isSelf && (targetIsAdmin || targetIsSuperAdmin)) {
      throw new ForbiddenException('You do not have permission to modify another administrator.');
    }

    // Section Head cannot modify Super Admin
    if (isSectionHead && !isSuperAdmin && targetIsSuperAdmin) {
      throw new ForbiddenException('You do not have permission to modify a Super Admin.');
    }

    if (!hasManagementAccess) {
      // Prevent privilege escalation for normal users
      delete updateUserDto.role;
      delete updateUserDto.active;
      delete updateUserDto.ticketMainFocal;
      delete updateUserDto.ticketTechnician;
    } else if (isSelf && updateUserDto.active === false) {
      throw new ForbiddenException('You cannot disable your own account.');
    }

    return this.usersService.update(parsedId, updateUserDto);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Request() req: any) {
    const parsedId = parseInt(id, 10);
    const targetUser = await this.usersService.findOne(parsedId);

    const isView = this.roleCapabilitiesService.isUserManagementView(req.user.role);
    const isAdmin = this.roleCapabilitiesService.isUserManagementAdmin(req.user.role);
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
    const isSectionHead = req.user.role === UserRole.SECTION_HEAD;

    if (!isView && !isAdmin && !isSuperAdmin) {
      throw new ForbiddenException('You do not have permission to reset passwords.');
    }

    if (isView && !isAdmin && !isSuperAdmin && targetUser.role !== UserRole.USER) {
      throw new ForbiddenException('You can only reset passwords for Regular Staff users.');
    }

    const targetIsAdmin = this.roleCapabilitiesService.isUserManagementAdmin(targetUser.role);
    const targetIsSuperAdmin = targetUser.role === UserRole.SUPER_ADMIN;

    if (isAdmin && !isSuperAdmin && !isSectionHead && (targetIsAdmin || targetIsSuperAdmin)) {
      throw new ForbiddenException('You do not have permission to reset another administrator\'s password.');
    }

    if (isSectionHead && !isSuperAdmin && targetIsSuperAdmin) {
      throw new ForbiddenException('You do not have permission to reset a Super Admin\'s password.');
    }

    return this.usersService.resetPassword(parsedId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const parsedId = parseInt(id, 10);
    if (req.user.id === parsedId) {
      throw new ForbiddenException('You cannot disable your own account.');
    }

    const targetUser = await this.usersService.findOne(parsedId);
    const isView = this.roleCapabilitiesService.isUserManagementView(req.user.role);
    const isAdmin = this.roleCapabilitiesService.isUserManagementAdmin(req.user.role);
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
    const isSectionHead = req.user.role === UserRole.SECTION_HEAD;

    if (!isView && !isAdmin && !isSuperAdmin) {
      throw new ForbiddenException('You do not have permission to disable users.');
    }

    if (isView && !isAdmin && !isSuperAdmin && targetUser.role !== UserRole.USER) {
      throw new ForbiddenException('You can only disable Regular Staff users.');
    }

    const targetIsAdmin = this.roleCapabilitiesService.isUserManagementAdmin(targetUser.role);
    const targetIsSuperAdmin = targetUser.role === UserRole.SUPER_ADMIN;

    if (isAdmin && !isSuperAdmin && !isSectionHead && (targetIsAdmin || targetIsSuperAdmin)) {
      throw new ForbiddenException('You do not have permission to disable another administrator.');
    }

    if (isSectionHead && !isSuperAdmin && targetIsSuperAdmin) {
      throw new ForbiddenException('You do not have permission to disable a Super Admin.');
    }

    return this.usersService.remove(parsedId);
  }
}
