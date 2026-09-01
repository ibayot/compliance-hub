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
  @UseGuards(CapabilityGuard)
  @RequireCapability('isUserManagementRolesManage')
  getRoles() {
    return this.usersService.getRoles();
  }

  @Post('roles')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isUserManagementRolesManage')
  createRole(@Body() createRoleDefinitionDto: CreateRoleDefinitionDto) {
    return this.usersService.createRoleDefinition(createRoleDefinitionDto);
  }

  @Patch('roles/:value')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isUserManagementRolesManage')
  updateRole(
    @Param('value') value: string,
    @Body() updateRoleDefinitionDto: UpdateRoleDefinitionDto,
  ) {
    return this.usersService.updateRoleDefinition(value, updateRoleDefinitionDto);
  }

  @Delete('roles/:value')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isUserManagementRolesManage')
  deleteRole(@Param('value') value: string) {
    return this.usersService.deleteRoleDefinition(value);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    const isView = this.roleCapabilitiesService.isUserManagementView(req.user.role);
    const isAdmin = this.roleCapabilitiesService.isUserManagementAdmin(req.user.role);
    const canManageRoles = this.roleCapabilitiesService.isUserManagementRolesManage(req.user.role);

    if (!isView && !isAdmin && !canManageRoles) {
      throw new ForbiddenException('You do not have permission to create users.');
    }

    if (isView && !isAdmin && !canManageRoles) {
      // Force role to regular user
      createUserDto.role = UserRole.USER;
    }

    return this.usersService.create(createUserDto);
  }

  @Get('search-email')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isUserManagementView')
  searchEmail(@Query('q') q: string) {
    return this.usersService.searchEmails(q);
  }

  @Get()
  @UseGuards(CapabilityGuard)
  @RequireCapability(['isUserManagementView', 'isUserManagementAdmin'])
  findAll() {
    return this.usersService.findAll();
  }

  @Get('federated')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isUserManagementView')
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
  async getMyCapabilities(@Request() req: any) {
    await this.roleCapabilitiesService.reload();
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
    const canManageRoles = this.roleCapabilitiesService.isUserManagementRolesManage(req.user.role);

    if (dto.isUserManagementAdmin !== undefined && !canManageRoles) {
      throw new ForbiddenException('Only Section Head or Super Admin can modify the User Management Admin capability.');
    }

    const result = await this.roleCapabilitiesService.updateOne(roleValue, dto);
    void this.eventBus.publish(CAPABILITIES_UPDATED_EVENT, {
      role: roleValue,
      updatedAt: new Date().toISOString(),
    });
    return result;
  }

  @Get('profile-units')
  getProfileUnits() {
    return this.usersService.getProfileUnits();
  }

  // ── Generic user :id routes — kept AFTER static capability routes ──

  @Get(':id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isUserManagementView')
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
    const canManageRoles = this.roleCapabilitiesService.isUserManagementRolesManage(req.user.role);
    const isSelf = req.user.id === parsedId;

    const hasManagementAccess = isView || isAdmin || canManageRoles;

    if (!hasManagementAccess && !isSelf) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // View capability can only target "user" role
    if (isView && !isAdmin && !canManageRoles && !isSelf && targetUser.role !== UserRole.USER) {
      throw new ForbiddenException('You can only modify Regular Staff users.');
    }

    const targetIsAdmin = this.roleCapabilitiesService.isUserManagementAdmin(targetUser.role);
    const targetIsSuperAdmin = targetUser.role === UserRole.SUPER_ADMIN;

    // Admin capability can target anyone except another Admin/SuperAdmin, UNLESS they are a Section Head/Super Admin
    if (isAdmin && !canManageRoles && !isSelf && (targetIsAdmin || targetIsSuperAdmin)) {
      throw new ForbiddenException('You do not have permission to modify another administrator.');
    }


    if (!hasManagementAccess) {
      // Prevent privilege escalation for normal users
      delete updateUserDto.role;
      delete updateUserDto.active;

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
    const canManageRoles = this.roleCapabilitiesService.isUserManagementRolesManage(req.user.role);

    if (!isView && !isAdmin && !canManageRoles) {
      throw new ForbiddenException('You do not have permission to reset passwords.');
    }

    if (isView && !isAdmin && !canManageRoles && targetUser.role !== UserRole.USER) {
      throw new ForbiddenException('You can only reset passwords for Regular Staff users.');
    }

    const targetIsAdmin = this.roleCapabilitiesService.isUserManagementAdmin(targetUser.role);
    const targetIsSuperAdmin = targetUser.role === UserRole.SUPER_ADMIN;

    if (isAdmin && !canManageRoles && (targetIsAdmin || targetIsSuperAdmin)) {
      throw new ForbiddenException('You do not have permission to reset another administrator\'s password.');
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
    const canManageRoles = this.roleCapabilitiesService.isUserManagementRolesManage(req.user.role);

    if (!isView && !isAdmin && !canManageRoles) {
      throw new ForbiddenException('You do not have permission to disable users.');
    }

    if (isView && !isAdmin && !canManageRoles && targetUser.role !== UserRole.USER) {
      throw new ForbiddenException('You can only disable Regular Staff users.');
    }

    const targetIsAdmin = this.roleCapabilitiesService.isUserManagementAdmin(targetUser.role);
    const targetIsSuperAdmin = targetUser.role === UserRole.SUPER_ADMIN;

    if (isAdmin && !canManageRoles && (targetIsAdmin || targetIsSuperAdmin)) {
      throw new ForbiddenException('You do not have permission to disable another administrator.');
    }


    return this.usersService.remove(parsedId);
  }
}
