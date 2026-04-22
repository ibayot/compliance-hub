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

    // Delegates to the matching boolean helper on RoleCapabilitiesService
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (this.roleCapSvc as any)[required];
    if (typeof fn !== 'function') return false;
    return (fn as (r: string) => boolean).call(this.roleCapSvc, role);
  }
}
