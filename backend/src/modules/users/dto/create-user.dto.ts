import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  IsNumber,
  IsBoolean,
  Matches,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  @Matches(/@(gmail\.com|dswd\.gov\.ph|yahoomail\.com|hotmail\.com|rocketmail\.com|outlook\.com|icloud\.com|aol\.com)$/i, {
    message: 'Email must belong to an approved domain (e.g. gmail.com, dswd.gov.ph)',
  })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(12)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
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

  @IsEnum(UserRole)
  role: UserRole;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  unitIds?: number[];
}
