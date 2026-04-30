import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';

/**
 * Guards internal service-to-service endpoints.
 *
 * Enforcement:
 *  - When INTERNAL_SERVICE_SECRET is set, the caller MUST send:
 *      X-Service-Token: <INTERNAL_SERVICE_SECRET>
 *  - When the env var is absent (local dev without Docker), the endpoint
 *    is still accessible but a warning is logged.
 *
 * Usage: @UseGuards(InternalServiceGuard) replaces JwtAuthGuard on
 * controllers that are only called from peer services on the private network.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  private readonly logger = new Logger(InternalServiceGuard.name);
  private readonly secret: string | undefined = process.env.INTERNAL_SERVICE_SECRET;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-service-token'] as string | undefined;

    if (!this.secret) {
      this.logger.warn(
        'INTERNAL_SERVICE_SECRET is not set. Internal endpoint is unprotected. ' +
          'Set this env var before deploying to production.',
      );
      return true;
    }

    if (token && token === this.secret) {
      return true;
    }

    this.logger.warn(
      `Rejected inter-service call to ${request.path} — invalid or missing X-Service-Token from ${request.ip}`,
    );
    return false;
  }
}
