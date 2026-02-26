import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertKpiThresholdDto {
  @IsString()
  @MaxLength(40)
  band: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minScore: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxScore: number;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  color?: string;
}

export class UpsertKpiScoringRuleDto {
  @IsString()
  @IsOptional()
  @MaxLength(80)
  name?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  capScore?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  floorScore?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  yesScore?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  noScore?: number;
}
