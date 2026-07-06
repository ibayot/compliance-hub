import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { SubmissionFrequency } from '../entities/reportorial-document-type.entity';

export class UpdateReportorialDocTypeDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'base_name may only contain letters, digits, and underscores',
  })
  @IsOptional()
  base_name?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  display_name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SubmissionFrequency)
  @IsOptional()
  submission_frequency?: SubmissionFrequency;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
