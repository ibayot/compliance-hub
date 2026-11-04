import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateSecurityConfigDto {
  @IsOptional() @IsString() @MaxLength(100) defaultPassword?: string;
  @IsOptional() @IsBoolean() mfaTestMode?: boolean;
  @IsOptional() @IsBoolean() vaptMode?: boolean;
  @IsOptional() @IsIn(['full', 'ticketing_only', 'compliance_only']) appMode?: string;
  @IsOptional() @IsBoolean() googleSignInEnabled?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) allowedEmailDomains?: string[];
  @IsOptional() @IsInt() @Min(1) @Max(1440) idleLockMinutes?: number;
  @IsOptional() @IsBoolean() outboundEmailUnitRestrictionEnabled?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) outboundEmailAllowedUnitIds?: number[];
}
