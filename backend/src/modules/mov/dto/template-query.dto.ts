import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TemplateQueryDto {
  @IsString()
  type: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;

  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  quarter?: number;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsOptional()
  unitName?: string;
}
