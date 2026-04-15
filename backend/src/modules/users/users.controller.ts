import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateRoleDefinitionDto, UpdateRoleDefinitionDto, CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('roles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.REVIEWER, UserRole.COMPLIANCE_OFFICER)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.REVIEWER, UserRole.COMPLIANCE_OFFICER)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('federated')
  @Roles(UserRole.SUPER_ADMIN, UserRole.REVIEWER, UserRole.COMPLIANCE_OFFICER)
  getFederatedUsers() {
    return this.usersService.getFederatedUsers();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.REVIEWER, UserRole.COMPLIANCE_OFFICER)
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
