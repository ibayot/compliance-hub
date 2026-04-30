import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * CorrelationIdMiddleware
 *
 * Attaches a unique X-Request-ID header to every request and response.
 * If the incoming request already carries an X-Request-ID (e.g., forwarded
 * from the API gateway), that value is preserved.
 *
 * Register in the application module's configure() using MiddlewareConsumer.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers['x-request-id'] as string | undefined)?.trim() || randomUUID();

    // Normalise — ensure downstream code can always read req.headers['x-request-id']
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    next();
  }
}
