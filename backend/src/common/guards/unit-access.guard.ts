import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/** Roles that bypass per-unit access scoping and can see all units. */
const GLOBAL_ACCESS_ROLES = new Set([
  'super_admin',
  'reviewer',
  'compliance_officer',
  'cybersec',
  'infosec',
  'auditor',
]);

@Injectable()
export class UnitAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const unitId = request.params.unitId || request.query.unitId || request.body.unitId;

    // Roles (or roleCode mappings) with global unit visibility bypass per-unit restrictions
    if (
      GLOBAL_ACCESS_ROLES.has(user.role) ||
      (user.roleCode && GLOBAL_ACCESS_ROLES.has(user.roleCode))
    ) {
      return true;
    }

    // Focal users and technicians can only access their assigned units
    if (user.role === 'focal' || user.role === 'technician' || user.roleCode === 'focal' || user.roleCode === 'technician') {
      if (!unitId) {
        return true; // Let controller handle missing unitId
      }

      // Check if user has access to this unit (via user.units relationship)
      const hasAccess = user.units?.some((unit: any) => unit.id === parseInt(unitId));
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this unit');
      }
    }

    return true;
  }
}
