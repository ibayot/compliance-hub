import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  ArrayMaxSize,
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
  @MinLength(12, { message: 'Password must be at least 12 characters long.' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&_-#).',
  })
  @NotContains('/', {
    message: 'Password cannot contain a forward slash (/).',
  })
  @NotContains('\\', {
    message: 'Password cannot contain a backslash (\\).',
  })
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
  @Matches(/^\d{10}$/, {
    message: 'Phone number must contain exactly 10 digits.',
  })
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

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsArray()
  @ArrayMaxSize(1, { message: 'A user can be assigned to only one unit.' })
  @IsNumber({}, { each: true })
  @IsOptional()
  unitIds?: number[];

  @IsBoolean()
  @IsOptional()
  autoAssignmentEligible?: boolean;
}
