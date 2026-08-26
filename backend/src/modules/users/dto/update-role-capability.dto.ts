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
  isSmtpSettingsAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isGlobalSettingsAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isSecuritySettingsAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isAllTickets?: boolean;

  @IsOptional()
  @IsBoolean()
  isTicketFocal?: boolean;

  @IsOptional()
  @IsBoolean()
  isTicketModuleAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isTicketReportsAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isTicketReportsManage?: boolean;

  @IsOptional()
  @IsBoolean()
  isKpiAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isKpiManage?: boolean;

  @IsOptional()
  @IsBoolean()
  isAttendanceAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isAttendanceManage?: boolean;

  @IsOptional()
  @IsBoolean()
  isReportsAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isReviewsAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isMovAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isDocumentsAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isRepositoryAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isIssuancesAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isMetricsAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isRoleCapabilitiesAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isSystemRolesAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isUserManagementAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  isUserManagementView?: boolean;

  @IsOptional()
  @IsBoolean()
  isDutyViewerAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isDutyAdminAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isAttendanceEligible?: boolean;

  @IsOptional()
  @IsBoolean()
  isAuditAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isUnitsAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isUnitsManage?: boolean;

  @IsOptional()
  @IsBoolean()
  isDocumentTypesManage?: boolean;

  @IsOptional()
  @IsBoolean()
  isMetricsManage?: boolean;

  @IsOptional()
  @IsBoolean()
  isUserManagementRolesManage?: boolean;

  @IsOptional()
  @IsBoolean()
  isDocumentsManage?: boolean;

  @IsOptional()
  @IsBoolean()
  isDocumentsDelete?: boolean;

  @IsOptional()
  @IsBoolean()
  isIssuancesManage?: boolean;

  @IsOptional()
  @IsBoolean()
  isMetricsDelete?: boolean;
}
