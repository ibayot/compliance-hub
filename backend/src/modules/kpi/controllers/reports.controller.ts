import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { KpiService } from '../services/kpi.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, CapabilityGuard)
export class ReportsController {
  constructor(private readonly kpiService: KpiService) {}

  @Get()
  @RequireCapability('isReportsAccess')
  @ApiOperation({
    summary: 'Get the consolidated compliance report summary',
    description: 'Returns the authenticated user\'s consolidated KPI report summary for the selected period.',
  })
  getSummary(
    @Request() req: any,
    @Query('periodYear') periodYear?: string,
    @Query('periodMonth') periodMonth?: string,
  ) {
    const now = new Date();
    const year = periodYear === undefined || periodYear === '' ? now.getFullYear() : Number(periodYear);
    const month = periodMonth === undefined || periodMonth === '' ? now.getMonth() + 1 : Number(periodMonth);
    return this.kpiService.dashboardSummary(req.user, year, month);
  }
}
