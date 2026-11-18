import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AuthorizeAccountAccessDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @IsUUID()
  tokenJti: string;
}
