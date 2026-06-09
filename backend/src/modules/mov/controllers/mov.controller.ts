import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { MovService } from '../services/mov.service';
import { CreateMovArtifactDto } from '../dto/create-mov-artifact.dto';
import { UpdateMovArtifactDto } from '../dto/update-mov-artifact.dto';
import { TemplateQueryDto } from '../dto/template-query.dto';

@Controller('mov')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovController {
  constructor(private readonly movService: MovService) {}

  @Get('artifacts')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  list(
    @Query('artifact_type') artifact_type?: string,
    @Query('period_year') period_year?: string,
    @Query('quarter') quarter?: string,
    @Query('scope') scope?: string,
    @Query('unit_id') unit_id?: string,
  ) {
    return this.movService.list({
      artifact_type,
      period_year: period_year ? Number(period_year) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      scope,
      unit_id: unit_id ? Number(unit_id) : undefined,
    });
  }

  @Get('artifacts/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  getById(@Param('id') id: string) {
    return this.movService.getById(id);
  }

  @Post('artifacts')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  create(@Body() dto: CreateMovArtifactDto, @Request() req: any) {
    return this.movService.create(dto, req.user?.id ?? req.user?.userId);
  }

  @Put('artifacts/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  update(@Param('id') id: string, @Body() dto: UpdateMovArtifactDto) {
    return this.movService.update(id, dto);
  }

  @Delete('artifacts/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  remove(@Param('id') id: string) {
    return this.movService.remove(id);
  }

  @Get('templates')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  getTemplate(@Query() query: TemplateQueryDto) {
    return this.movService.getTemplate(query);
  }

  @Get('register-columns')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  registerColumns() {
    return this.movService.getRegisterColumns();
  }

  @Get('reports/register')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  buildRegisterReport(
    @Query('year') year: string,
    @Query('quarter') quarter: string,
    @Query('scope') scope?: string,
    @Query('unit') unit?: string,
    @Query('register_type') register_type?: string,
  ) {
    return this.movService.generateRegisterReport({
      year: Number(year),
      quarter: Number(quarter),
      scope,
      unit,
      register_type,
    });
  }

  @Get('reports/monitoring-matrix')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  buildMonitoringMatrixReport(
    @Query('year') year: string,
    @Query('quarter') quarter: string,
    @Query('scope') scope?: string,
    @Query('unit') unit?: string,
  ) {
    return this.movService.generateMonitoringMatrixReport({
      year: Number(year),
      quarter: Number(quarter),
      scope,
      unit,
    });
  }

  @Get('reports/assessment')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  buildAssessmentReport(
    @Query('year') year: string,
    @Query('quarter') quarter: string,
    @Query('unit_id') unit_id?: string,
  ) {
    return this.movService.generateAssessmentReport({
      year: Number(year),
      quarter: Number(quarter),
      unit_id: unit_id ? Number(unit_id) : undefined,
    });
  }

  @Post('reports/assessment')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isMovAccess')
  buildAssessmentReportPost(
    @Body() body: {
      year: number;
      quarter: number;
      unit_id?: number;
      manual_remarks?: Record<string, string>;
    },
  ) {
    return this.movService.generateAssessmentReport({
      year: Number(body.year),
      quarter: Number(body.quarter),
      unit_id: body.unit_id ? Number(body.unit_id) : undefined,
      manual_remarks: body.manual_remarks || {},
    });
  }
}
