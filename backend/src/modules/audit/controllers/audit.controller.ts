import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService, AuditLogQueryDto } from '../services/audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';

@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequireCapability('isAuditAccess')
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditService.getAuditLogs(query);
  }

  @Get('tables')
  @RequireCapability('isAuditAccess')
  async getAuditedTables() {
    return this.auditService.getAuditedTables();
  }
}
