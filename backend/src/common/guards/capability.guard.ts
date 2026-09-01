import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCapabilitiesService } from '../../modules/users/role-capabilities.service';
import { CAPABILITY_KEY } from '../decorators/require-capability.decorator';

/**
 * Guard that enforces role_capabilities flags on routes.
 * Must be registered alongside any module that uses it (i.e. the module must provide both
 * Reflector and RoleCapabilitiesService).
 *
 * Usage on a route handler:
 *   @RequireCapability('isTicketSettingsFocal')
 *   @UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard)
 *
 * Every role, including super_admin, is evaluated against its database row.
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleCapSvc: RoleCapabilitiesService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | string[]>(CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const role: string | undefined = request.user?.role;
    if (!role) return false;

    const capabilityCheckers: Record<string, (r: string) => boolean> = {
      isFocal: (r) => this.roleCapSvc.isFocal(r),
      isIto: (r) => this.roleCapSvc.isIto(r),
      isDesktop: (r) => this.roleCapSvc.isDesktop(r),
      isItSupport: (r) => this.roleCapSvc.isItSupport(r),
      isPantawidIct: (r) => this.roleCapSvc.isPantawidIct(r),
      isEscalationFocal: (r) => this.roleCapSvc.isEscalationFocal(r),
      isTicketSettingsFocal: (r) => this.roleCapSvc.isTicketSettingsFocal(r),
      isAllTickets: (r) => this.roleCapSvc.isAllTickets(r),
      isTicketFocal: (r) => this.roleCapSvc.isTicketFocal(r),
      isTicketModuleAccess: (r) => this.roleCapSvc.isTicketModuleAccess(r),
      isTicketReportsAccess: (r) => this.roleCapSvc.isTicketReportsAccess(r),
      isTicketReportsManage: (r) => this.roleCapSvc.isTicketReportsManage(r),
      isKpiAccess: (r) => this.roleCapSvc.isKpiAccess(r),
      isKpiManage: (r) => this.roleCapSvc.isKpiManage(r),
      isAttendanceAccess: (r) => this.roleCapSvc.isAttendanceAccess(r),
      isAttendanceManage: (r) => this.roleCapSvc.isAttendanceManage(r),
      isReportsAccess: (r) => this.roleCapSvc.isReportsAccess(r),
      isReviewsAccess: (r) => this.roleCapSvc.isReviewsAccess(r),
      isMovAccess: (r) => this.roleCapSvc.isMovAccess(r),
      isDocumentsAccess: (r) => this.roleCapSvc.isDocumentsAccess(r),
      isRepositoryAccess: (r) => this.roleCapSvc.isRepositoryAccess(r),
      isIssuancesAccess: (r) => this.roleCapSvc.isIssuancesAccess(r),
      isMetricsAccess: (r) => this.roleCapSvc.isMetricsAccess(r),
      isRoleCapabilitiesAccess: (r) => this.roleCapSvc.isRoleCapabilitiesAccess(r),
      isGlobalSettingsAccess: (r) => this.roleCapSvc.isGlobalSettingsAccess(r),
      isSystemRolesAccess: (r) => this.roleCapSvc.isSystemRolesAccess(r),
      isSmtpSettingsAccess: (r) => this.roleCapSvc.isSmtpSettingsAccess(r),
      isSecuritySettingsAccess: (r) => this.roleCapSvc.isSecuritySettingsAccess(r),
      isUserManagementAdmin: (r) => this.roleCapSvc.isUserManagementAdmin(r),
      isUserManagementView: (r) => this.roleCapSvc.isUserManagementView(r),
      isDutyViewerAccess: (r) => this.roleCapSvc.isDutyViewerAccess(r),
      isDutyAdminAccess: (r) => this.roleCapSvc.isDutyAdminAccess(r),
      isAuditAccess: (r) => this.roleCapSvc.isAuditAccess(r),
      isUnitsAccess: (r) => this.roleCapSvc.isUnitsAccess(r),
      isUnitsManage: (r) => this.roleCapSvc.isUnitsManage(r),
      isDocumentTypesManage: (r) => this.roleCapSvc.isDocumentTypesManage(r),
      isMetricsManage: (r) => this.roleCapSvc.isMetricsManage(r),
      isUserManagementRolesManage: (r) => this.roleCapSvc.isUserManagementRolesManage(r),
      isDocumentsManage: (r) => this.roleCapSvc.isDocumentsManage(r),
      isDocumentsDelete: (r) => this.roleCapSvc.isDocumentsDelete(r),
      isIssuancesManage: (r) => this.roleCapSvc.isIssuancesManage(r),
      isMetricsDelete: (r) => this.roleCapSvc.isMetricsDelete(r),
    };

    const requirements = Array.isArray(required) ? required : [required];
    if (requirements.length === 0) return false;
    return requirements.some((capability) => {
      const checker = capabilityCheckers[capability];
      return !!checker && checker(role);
    });
  }
}
