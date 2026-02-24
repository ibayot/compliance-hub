import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
