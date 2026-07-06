import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContext } from './audit.context';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const email = user?.email ?? user?.username ?? 'system';

    // Attempt to extract IP (from proxy or raw socket)
    let ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    if (req.headers['x-forwarded-for']) {
      ipAddress = (req.headers['x-forwarded-for'] as string).split(',')[0];
    }

    const sessionId = req.headers['x-session-id'] || req.headers['x-request-id'] || 'unknown';

    return new Observable((observer) => {
      auditContext.run({ email, ipAddress, sessionId }, () => {
        next.handle().subscribe({
          next: (val) => observer.next(val),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }
}
