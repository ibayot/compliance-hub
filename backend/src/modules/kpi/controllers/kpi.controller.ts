import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { KpiService } from '../services/kpi.service';
import { CreateKpiMasterDto, UpdateKpiMasterDto } from '../dto/kpi-master.dto';
import { UpdateKpiMonitoringDto, UpsertKpiMonitoringDto } from '../dto/kpi-monitoring.dto';
import { UpsertKpiScoringRuleDto, UpsertKpiThresholdDto } from '../dto/kpi-lookups.dto';

@Controller('kpi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('master')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.SECTION_HEAD, 'focal', 'technician')
  listKpiMaster(@Request() req: any) {
    return this.kpiService.listKpiMaster(req.user);
  }

  @Post('master')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.SECTION_HEAD)
  createKpiMaster(@Request() req: any, @Body() dto: CreateKpiMasterDto) {
    return this.kpiService.createKpiMaster(req.user, dto);
  }

  @Patch('master/:code')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.SECTION_HEAD)
  updateKpiMaster(@Request() req: any, @Param('code') code: string, @Body() dto: UpdateKpiMasterDto) {
    return this.kpiService.updateKpiMaster(req.user, code, dto);
  }

  @Delete('master/:code')
  @Roles(UserRole.SUPER_ADMIN)
  removeKpiMaster(@Request() req: any, @Param('code') code: string) {
    return this.kpiService.removeKpiMaster(req.user, code);
  }

  @Get('monitoring')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.SECTION_HEAD, 'focal', 'technician')
  listMonitoring(
    @Request() req: any,
    @Query('periodYear') periodYear?: number,
    @Query('periodMonth') periodMonth?: number,
    @Query('unitId') unitId?: number,
    @Query('kpiMasterCode') kpiMasterCode?: string,
  ) {
    return this.kpiService.listMonitoring(req.user, { periodYear, periodMonth, unitId, kpiMasterCode });
  }

  @Post('monitoring')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.SECTION_HEAD)
  upsertMonitoring(@Request() req: any, @Body() dto: UpsertKpiMonitoringDto) {
    return this.kpiService.upsertMonitoring(req.user, dto);
  }

  @Patch('monitoring/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.SECTION_HEAD)
  updateMonitoring(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKpiMonitoringDto) {
    return this.kpiService.updateMonitoring(req.user, id, dto);
  }

  @Patch('monitoring/:id/lock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.SECTION_HEAD)
  lockMonitoring(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.kpiService.lockMonitoring(req.user, id);
  }

  @Get('dashboard/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.SECTION_HEAD, 'focal', 'technician')
  dashboardSummary(
    @Request() req: any,
    @Query('periodYear') periodYear?: string,
    @Query('periodMonth') periodMonth?: string,
  ) {
    const parsedYear = periodYear === undefined || periodYear === '' ? undefined : Number(periodYear);
    const parsedMonth = periodMonth === undefined || periodMonth === '' ? undefined : Number(periodMonth);
    return this.kpiService.dashboardSummary(req.user, parsedYear, parsedMonth);
  }

  @Get('dashboard/unit/:unitId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.SECTION_HEAD, 'focal', 'technician')
  dashboardUnit(
    @Request() req: any,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Query('periodYear') periodYear?: string,
    @Query('periodMonth') periodMonth?: string,
  ) {
    const parsedYear = periodYear === undefined || periodYear === '' ? undefined : Number(periodYear);
    const parsedMonth = periodMonth === undefined || periodMonth === '' ? undefined : Number(periodMonth);
    return this.kpiService.dashboardUnit(req.user, unitId, parsedYear, parsedMonth);
  }

  @Get('dashboard/unit/:unitId/timeseries')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.SECTION_HEAD, 'focal', 'technician')
  dashboardUnitTimeseries(
    @Request() req: any,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Query('fromYear') fromYear?: number,
    @Query('fromMonth') fromMonth?: number,
    @Query('toYear') toYear?: number,
    @Query('toMonth') toMonth?: number,
  ) {
    return this.kpiService.dashboardUnitTimeseries(
      req.user, unitId,
      Number(fromYear), Number(fromMonth),
      Number(toYear), Number(toMonth),
    );
  }

  @Get('action-plans')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.SECTION_HEAD, 'focal', 'technician')
  generateActionPlans(
    @Request() req: any,
    @Query('periodYear') periodYear: string,
    @Query('periodMonth') periodMonth: string,
    @Query('unitId') unitId?: string,
  ) {
    const parsedYear = Number(periodYear);
    const parsedMonth = Number(periodMonth);
    const parsedUnitId = unitId === undefined || unitId === null || unitId === '' ? undefined : Number(unitId);

    return this.kpiService.generateActionPlans(req.user, parsedYear, parsedMonth, parsedUnitId);
  }

  @Get('lookups/thresholds')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.SECTION_HEAD, 'focal', 'technician')
  listThresholds() {
    return this.kpiService.listThresholds();
  }

  @Post('lookups/thresholds')
  @Roles(UserRole.SUPER_ADMIN)
  createThreshold(@Request() req: any, @Body() dto: UpsertKpiThresholdDto) {
    return this.kpiService.upsertThreshold(req.user, null, dto);
  }

  @Patch('lookups/thresholds/:id')
  @Roles(UserRole.SUPER_ADMIN)
  updateThreshold(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertKpiThresholdDto,
  ) {
    return this.kpiService.upsertThreshold(req.user, id, dto);
  }

  @Get('lookups/scoring-rules')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC, UserRole.SECTION_HEAD, 'focal', 'technician')
  listScoringRules() {
    return this.kpiService.listScoringRules();
  }

  @Post('lookups/scoring-rules')
  @Roles(UserRole.SUPER_ADMIN)
  createScoringRule(@Request() req: any, @Body() dto: UpsertKpiScoringRuleDto) {
    return this.kpiService.upsertScoringRule(req.user, null, dto);
  }

  @Patch('lookups/scoring-rules/:id')
  @Roles(UserRole.SUPER_ADMIN)
  updateScoringRule(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertKpiScoringRuleDto,
  ) {
    return this.kpiService.upsertScoringRule(req.user, id, dto);
  }
}
