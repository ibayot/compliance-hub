import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MetricStatus, MetricType } from '../entities/cybersecurity-metric.entity';

export class CreateCybersecurityMetricDto {
  @IsEnum(MetricType)
  metric_type: MetricType;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MetricStatus)
  status?: MetricStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  value?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsISO8601()
  last_checked?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  api_endpoint?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateCybersecurityMetricDto extends PartialType(CreateCybersecurityMetricDto) {}
