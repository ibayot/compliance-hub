import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateRoleDefinitionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Role code must be lowercase letters, digits, and underscores only',
  })
  value: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label: string;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  description: string;

  @IsBoolean()
  @IsOptional()
  assignable?: boolean;

  /**
   * Optional: tag this role as a specific technician type so members are
   * automatically included in the attendance grid regardless of their role code.
   */
  @IsOptional()
  @IsIn(['it_support', 'desktop_support', 'pantawid_ict_support'])
  technicianType?: string | null;

  /**
   * Optional platform code that grants the user a specific feature set
   * regardless of the role's value string.
   * Known codes: 'compliance_officer', 'section_head'
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  roleCode?: string | null;
}
