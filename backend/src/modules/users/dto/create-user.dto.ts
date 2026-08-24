import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  IsNumber,
  IsBoolean,
  Matches,
  NotContains,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @IsEmail()
  @Matches(/@(gmail\.com|dswd\.gov\.ph|yahoomail\.com|hotmail\.com|rocketmail\.com|outlook\.com|icloud\.com|aol\.com)$/i, {
    message: 'Email must belong to an approved domain (e.g. gmail.com, dswd.gov.ph)',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Password. Handled internally via default password.',
  })
  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  suffix?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  sex?: string;

  @IsString()
  @IsOptional()
  staffId?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  positionFull?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsBoolean()
  @IsOptional()
  ticketMainFocal?: boolean;

  @IsBoolean()
  @IsOptional()
  ticketTechnician?: boolean;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  unitIds?: number[];
}
