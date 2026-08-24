import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CAPABILITY_KEY } from '../decorators/require-capability.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Capability-decorated routes use role_capabilities as the authority.
    // Legacy role lists must not reject dynamically-created roles first.
    const requiredCapability = this.reflector.getAllAndOverride<string>(CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredCapability) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(
      (role) => user?.role === role,
    );
  }
}
