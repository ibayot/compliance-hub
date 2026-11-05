import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersHttpClient } from '../../../common/http-clients/users.http-client';
import { SseService } from '../services/sse.service';

@Injectable()
export class SseConnectionGuard implements CanActivate {
  constructor(private readonly sseService: SseService, private readonly usersHttpClient: UsersHttpClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = this.sseService.validateConnectionToken(request.query?.ticket);
    if (!userId) throw new UnauthorizedException('Invalid or expired SSE connection ticket.');
    // Guards run before Nest opens the SSE response, preserving HTTP 401/503 on rejection.
    await this.usersHttpClient.requireAccountAccess(userId);
    request.sseUserId = userId;
    return true;
  }
}
