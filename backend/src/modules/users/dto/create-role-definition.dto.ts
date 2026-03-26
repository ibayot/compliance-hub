import { IsBoolean, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateRoleDefinitionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9_]+$/, { message: 'Role code must be lowercase letters, digits, and underscores only' })
  value: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label: string;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  description: string;

  @IsBoolean()
  @IsOptional()
  assignable?: boolean;
}