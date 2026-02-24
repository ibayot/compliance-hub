import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsArray, IsNumber } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  unitIds?: number[];
}
