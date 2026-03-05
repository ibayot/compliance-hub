import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateMovArtifactDto {
  @IsString()
  @IsNotEmpty()
  artifact_type: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  period_year: number;

  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  quarter?: number;

  @IsInt()
  @IsOptional()
  unit_id?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsNotEmpty()
  content_markdown: string;

  @IsObject()
  @IsOptional()
  metadata_json?: Record<string, any>;
}
