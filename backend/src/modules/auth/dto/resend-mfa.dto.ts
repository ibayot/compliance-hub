import { IsJWT, MaxLength } from 'class-validator';

export class ResendMfaDto {
  @IsJWT()
  @MaxLength(4096)
  tempToken: string;
}
