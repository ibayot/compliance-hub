import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SseService } from '../services/sse.service';

@Injectable()
export class SettingsSseInterceptor implements NestInterceptor {
  constructor(private readonly sseService: SseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    
    if (req.method === 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.sseService.emitGlobalSettingsUpdated();
      }),
    );
  }
}
