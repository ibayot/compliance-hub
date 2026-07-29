import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { KpiMonitoringStatus } from '../entities/kpi-monitoring.entity';

export class UpsertKpiMonitoringDto {
  @IsString()
  @MaxLength(80)
  kpiMasterCode: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  unitId: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  periodYear: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodMonth: number;

  @Type(() => Number)
  @IsNumber()
  actualValue: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  remarks?: string;

  @IsEnum(KpiMonitoringStatus)
  @IsOptional()
  status?: KpiMonitoringStatus;
}

export class UpdateKpiMonitoringDto extends PartialType(UpsertKpiMonitoringDto) {}

export class LockKpiMonitoringDto {
  @IsEnum(KpiMonitoringStatus)
  status: KpiMonitoringStatus;
}
