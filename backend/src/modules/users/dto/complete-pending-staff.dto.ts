import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CompletePendingStaffDto {
  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  role: string;
}
