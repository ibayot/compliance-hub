import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for updating a role's capability flags.
 * All fields are optional — only supplied fields are updated.
 * roleValue, id, createdAt, updatedAt are managed by the system.
 */
export class UpdateRoleCapabilityDto {
  @IsOptional()
  @IsBoolean()
  isFocal?: boolean;

  @IsOptional()
  @IsBoolean()
  isDesktop?: boolean;

  @IsOptional()
  @IsBoolean()
  isItSupport?: boolean;

  @IsOptional()
  @IsBoolean()
  isPantawidIct?: boolean;

  @IsOptional()
  @IsBoolean()
  isIto?: boolean;

  @IsOptional()
  @IsBoolean()
  isEscalationFocal?: boolean;

  @IsOptional()
  @IsBoolean()
  isTicketSettingsFocal?: boolean;

  @IsOptional()
  @IsBoolean()
  isAllTickets?: boolean;

  @IsOptional()
  @IsBoolean()
  isTicketFocal?: boolean;
}
