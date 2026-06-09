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
 * super_admin always passes (bypasses the flag check).
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleCapSvc: RoleCapabilitiesService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const role: string | undefined = request.user?.role;
    if (!role) return false;

    if (role === 'super_admin') return true;

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
    };

    const checker = capabilityCheckers[required];
    if (!checker) return false;
    return checker(role);
  }
}
