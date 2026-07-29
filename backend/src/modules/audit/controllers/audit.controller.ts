import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService, AuditLogQueryDto } from '../services/audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('super_admin', 'compliance_officer')
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditService.getAuditLogs(query);
  }

  @Get('tables')
  @Roles('super_admin', 'compliance_officer')
  async getAuditedTables() {
    return this.auditService.getAuditedTables();
  }
}
