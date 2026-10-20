import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { RequireCapability } from '../../common/decorators/require-capability.decorator';
import { StaffUnitDirectoryService } from './staff-unit-directory.service';

@ApiTags('users')
@Controller('users/unit-directory')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability('isStaffDirectoryAccess')
export class StaffUnitDirectoryController {
  constructor(private readonly directory: StaffUnitDirectoryService) {}

  @Get()
  @ApiOperation({ summary: 'Look up staff by current application unit (read-only)' })
  list(@Query('page') page?: string, @Query('limit') limit?: string,
    @Query('unitId') unitId?: string, @Query('search') search?: string) {
    return this.directory.list({ page, limit, unitId, search });
  }
}
