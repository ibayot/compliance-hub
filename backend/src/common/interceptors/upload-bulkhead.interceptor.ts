import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

/**
 * UploadBulkheadInterceptor — Phase M5
 *
 * Limits the number of concurrent document uploads to MAX_CONCURRENT_UPLOADS.
 * When the limit is reached, new requests receive HTTP 503 Service Unavailable
 * rather than queuing, which prevents memory exhaustion under burst load.
 *
 * Apply at the handler level:
 *   @UseInterceptors(UploadBulkheadInterceptor)
 */
@Injectable()
export class UploadBulkheadInterceptor implements NestInterceptor {
  private static activeUploads = 0;
  private static readonly MAX_CONCURRENT_UPLOADS = 5;

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (UploadBulkheadInterceptor.activeUploads >= UploadBulkheadInterceptor.MAX_CONCURRENT_UPLOADS) {
      throw new ServiceUnavailableException(
        `Upload capacity reached (limit: ${UploadBulkheadInterceptor.MAX_CONCURRENT_UPLOADS}). Retry shortly.`,
      );
    }

    UploadBulkheadInterceptor.activeUploads++;

    return next.handle().pipe(
      finalize(() => {
        UploadBulkheadInterceptor.activeUploads--;
      }),
    );
  }
}
