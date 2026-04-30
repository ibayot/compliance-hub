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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RoleCapabilitiesService } from './role-capabilities.service';
import { CreateRoleDefinitionDto, UpdateRoleDefinitionDto, CreateUserDto, UpdateUserDto, UpdateRoleCapabilityDto } from './dto';
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
  getRoles() {
    return this.usersService.getRoles();
  }

  @Post('roles')
  @Roles(UserRole.SUPER_ADMIN)
  createRole(@Body() createRoleDefinitionDto: CreateRoleDefinitionDto) {
    return this.usersService.createRoleDefinition(createRoleDefinitionDto);
  }

  @Patch('roles/:value')
  @Roles(UserRole.SUPER_ADMIN)
  updateRole(@Param('value') value: string, @Body() updateRoleDefinitionDto: UpdateRoleDefinitionDto) {
    return this.usersService.updateRoleDefinition(value, updateRoleDefinitionDto);
  }

  @Delete('roles/:value')
  @Roles(UserRole.SUPER_ADMIN)
  deleteRole(@Param('value') value: string) {
    return this.usersService.deleteRoleDefinition(value);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('search-email')
  @Roles(UserRole.SUPER_ADMIN)
  searchEmail(@Query('q') q: string) {
    return this.usersService.searchEmails(q);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('federated')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
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
  @Roles(UserRole.SUPER_ADMIN)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
