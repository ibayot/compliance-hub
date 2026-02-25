import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('roles')
  @Roles('super_admin', 'reviewer')
  getRoles() {
    return [
      {
        value: 'super_admin',
        label: 'Super Admin',
        description: 'Full system access: manage users, units, issuances, metrics, tickets, documents, and settings.',
        assignable: false,
        is_system: true,
      },
      {
        value: 'reviewer',
        label: 'Reviewer / Compliance Officer',
        description: 'Review and tag documents as compliant, non-compliant, or for revision. Manage issuances and tickets.',
        assignable: true,
        is_system: true,
      },
      {
        value: 'focal',
        label: 'Focal Person',
        description: 'Unit focal person responsible for uploading and submitting compliance documents on behalf of their unit.',
        assignable: true,
        is_system: true,
      },
      {
        value: 'technician',
        label: 'Technician',
        description: 'Technical operations staff who assist in document preparation and submission.',
        assignable: true,
        is_system: true,
      },
      {
        value: 'auditor',
        label: 'Auditor',
        description: 'Read-only audit access to view documents, reviews, and compliance records for inspection purposes.',
        assignable: true,
        is_system: true,
      },
    ];
  }

  @Post()
  @Roles('super_admin')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('super_admin', 'reviewer')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('super_admin', 'reviewer')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Roles('super_admin')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles('super_admin')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
