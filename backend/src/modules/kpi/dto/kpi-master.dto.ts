import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { KpiDirection, KpiFrequency, KpiType } from '../entities/kpi-master.entity';

export class CreateKpiMasterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  unitId: number;

  @IsEnum(KpiType)
  type: KpiType;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  unitOfMeasure?: string;

  @IsEnum(KpiDirection)
  direction: KpiDirection;

  @Type(() => Number)
  @IsNumber()
  targetValue: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight: number;

  @IsEnum(KpiFrequency)
  @IsOptional()
  frequency?: KpiFrequency;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateKpiMasterDto extends PartialType(CreateKpiMasterDto) {}
