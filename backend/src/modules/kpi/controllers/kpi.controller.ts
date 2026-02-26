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
import { KpiService } from '../services/kpi.service';
import { CreateKpiMasterDto, UpdateKpiMasterDto } from '../dto/kpi-master.dto';
import { UpdateKpiMonitoringDto, UpsertKpiMonitoringDto } from '../dto/kpi-monitoring.dto';
import { UpsertKpiScoringRuleDto, UpsertKpiThresholdDto } from '../dto/kpi-lookups.dto';

@Controller('kpi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('master')
  @Roles('super_admin', 'reviewer', 'focal', 'auditor', 'technician', 'section_head')
  listKpiMaster(@Request() req: any) {
    return this.kpiService.listKpiMaster(req.user);
  }

  @Post('master')
  @Roles('super_admin', 'reviewer', 'section_head')
  createKpiMaster(@Request() req: any, @Body() dto: CreateKpiMasterDto) {
    return this.kpiService.createKpiMaster(req.user, dto);
  }

  @Patch('master/:code')
  @Roles('super_admin', 'reviewer', 'section_head')
  updateKpiMaster(@Request() req: any, @Param('code') code: string, @Body() dto: UpdateKpiMasterDto) {
    return this.kpiService.updateKpiMaster(req.user, code, dto);
  }

  @Delete('master/:code')
  @Roles('super_admin')
  removeKpiMaster(@Request() req: any, @Param('code') code: string) {
    return this.kpiService.removeKpiMaster(req.user, code);
  }

  @Get('monitoring')
  @Roles('super_admin', 'reviewer', 'focal', 'auditor', 'technician', 'section_head')
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
  @Roles('super_admin', 'reviewer', 'section_head')
  upsertMonitoring(@Request() req: any, @Body() dto: UpsertKpiMonitoringDto) {
    return this.kpiService.upsertMonitoring(req.user, dto);
  }

  @Patch('monitoring/:id')
  @Roles('super_admin', 'reviewer', 'section_head')
  updateMonitoring(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKpiMonitoringDto) {
    return this.kpiService.updateMonitoring(req.user, id, dto);
  }

  @Patch('monitoring/:id/lock')
  @Roles('super_admin', 'reviewer', 'section_head')
  lockMonitoring(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.kpiService.lockMonitoring(req.user, id);
  }

  @Get('dashboard/summary')
  @Roles('super_admin', 'reviewer', 'focal', 'auditor', 'technician', 'section_head')
  dashboardSummary(
    @Request() req: any,
    @Query('periodYear') periodYear: number,
    @Query('periodMonth') periodMonth: number,
  ) {
    return this.kpiService.dashboardSummary(req.user, periodYear, periodMonth);
  }

  @Get('dashboard/unit/:unitId')
  @Roles('super_admin', 'reviewer', 'focal', 'auditor', 'technician', 'section_head')
  dashboardUnit(
    @Request() req: any,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Query('periodYear') periodYear: number,
    @Query('periodMonth') periodMonth: number,
  ) {
    return this.kpiService.dashboardUnit(req.user, unitId, periodYear, periodMonth);
  }

  @Get('lookups/thresholds')
  @Roles('super_admin', 'reviewer', 'focal', 'auditor', 'technician', 'section_head')
  listThresholds() {
    return this.kpiService.listThresholds();
  }

  @Post('lookups/thresholds')
  @Roles('super_admin')
  createThreshold(@Request() req: any, @Body() dto: UpsertKpiThresholdDto) {
    return this.kpiService.upsertThreshold(req.user, null, dto);
  }

  @Patch('lookups/thresholds/:id')
  @Roles('super_admin')
  updateThreshold(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertKpiThresholdDto,
  ) {
    return this.kpiService.upsertThreshold(req.user, id, dto);
  }

  @Get('lookups/scoring-rules')
  @Roles('super_admin', 'reviewer', 'focal', 'auditor', 'technician', 'section_head')
  listScoringRules() {
    return this.kpiService.listScoringRules();
  }

  @Post('lookups/scoring-rules')
  @Roles('super_admin')
  createScoringRule(@Request() req: any, @Body() dto: UpsertKpiScoringRuleDto) {
    return this.kpiService.upsertScoringRule(req.user, null, dto);
  }

  @Patch('lookups/scoring-rules/:id')
  @Roles('super_admin')
  updateScoringRule(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertKpiScoringRuleDto,
  ) {
    return this.kpiService.upsertScoringRule(req.user, id, dto);
  }
}
