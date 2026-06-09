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
  private readonly serviceTokenMap: Record<string, string> = this.parseServiceTokenMap(
    process.env.INTERNAL_SERVICE_TOKENS,
  );

  private parseServiceTokenMap(rawValue: string | undefined): Record<string, string> {
    if (!rawValue?.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const mapped: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof value === 'string' && value.trim()) {
            mapped[key.trim()] = value.trim();
          }
        }
        return mapped;
      }
    } catch {
      // Fallback to key=value,key2=value2 format
    }

    const mapped: Record<string, string> = {};
    rawValue
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [key, ...valueParts] = pair.split('=');
        const value = valueParts.join('=').trim();
        if (key?.trim() && value) {
          mapped[key.trim()] = value;
        }
      });

    return mapped;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-service-token'] as string | undefined;
    const origin = (request.headers['x-service-origin'] as string | undefined)?.trim();
    const hasPerServiceConfig = Object.keys(this.serviceTokenMap).length > 0;
    const isProduction = process.env.NODE_ENV === 'production';

    if (hasPerServiceConfig) {
      const expectedToken = origin ? this.serviceTokenMap[origin] : undefined;

      if (expectedToken && token === expectedToken) {
        return true;
      }

      // Compatibility fallback: allow legacy shared secret while clients migrate.
      if (this.secret && token && token === this.secret) {
        return true;
      }

      this.logger.warn(
        `Rejected inter-service call to ${request.path} — invalid token for origin "${origin || 'unknown'}" from ${request.ip}`,
      );
      return false;
    }

    if (!this.secret) {
      if (isProduction) {
        this.logger.error(
          'INTERNAL_SERVICE_SECRET and INTERNAL_SERVICE_TOKENS are not set in production. ' +
            'Blocking internal endpoint access until a token configuration is provided.',
        );
        return false;
      }

      this.logger.warn(
        'INTERNAL_SERVICE_SECRET and INTERNAL_SERVICE_TOKENS are not set. Internal endpoint is unprotected. ' +
          'Set one of these env vars before deploying to production.',
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
