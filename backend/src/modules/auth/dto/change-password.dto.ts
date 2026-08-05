import { IsString, MinLength, Matches, NotContains } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(12)
  @ApiProperty({
    description: 'New password. Must be min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character. Forward slash (/) and backslash (\\) are strictly prohibited.',
    example: 'StrongPass123!',
  })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&_-#).',
  })
  @NotContains('/', {
    message: 'INVALID NEW PASSWORD! Escape characters (forward slash / and backslash \\) are strictly prohibited.',
  })
  @NotContains('\\', {
    message: 'INVALID NEW PASSWORD! Escape characters (forward slash / and backslash \\) are strictly prohibited.',
  })
  newPassword: string;
}
