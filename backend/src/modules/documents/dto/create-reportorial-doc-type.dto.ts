import { IsEnum, IsNumber, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { SubmissionFrequency } from '../entities/reportorial-document-type.entity';

export class CreateReportorialDocTypeDto {
  @IsNumber()
  unit_id: number;

  /**
   * Filename base. Must only contain letters, digits, and underscores.
   * E.g., "Incident_Report"
   */
  @IsString()
  @MinLength(2)
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'base_name may only contain letters, digits, and underscores',
  })
  base_name: string;

  @IsString()
  @MinLength(2)
  display_name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SubmissionFrequency)
  submission_frequency: SubmissionFrequency;
}
