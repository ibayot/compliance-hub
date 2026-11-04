import { Transform } from 'class-transformer';
import { Equals, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UnlockMfaDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;

  @Equals(true, { message: 'Verify the account owner identity before unlocking MFA.' })
  identityVerified: boolean;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  expectedRecoveryVersion: string;
}
