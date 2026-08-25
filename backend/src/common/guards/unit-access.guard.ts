import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RoleCapabilitiesService } from '../../modules/users/role-capabilities.service';

@Injectable()
export class UnitAccessGuard implements CanActivate {
  constructor(private readonly roleCapabilitiesService: RoleCapabilitiesService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const unitId = request.params.unitId || request.query.unitId || request.body.unitId;

    // Database-backed unit access permits global unit visibility.
    if (this.roleCapabilitiesService.isUnitsAccess(user.role)) {
      return true;
    }

    // Non-global users can only access their assigned units.
    if (user.role) {
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
