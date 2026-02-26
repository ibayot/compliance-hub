import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateRoleDefinitionDto {
  @IsEnum(UserRole)
  value: UserRole;

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