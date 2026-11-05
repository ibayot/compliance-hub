import { Controller, Get, Sse, UseGuards, Req, Header, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SseService } from '../services/sse.service';
import { Observable, from, merge, timer } from 'rxjs';
import { exhaustMap, ignoreElements } from 'rxjs/operators';
import { UsersHttpClient } from '../../../common/http-clients/users.http-client';
import { SseConnectionGuard } from '../guards/sse-connection.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class SseController {
  constructor(private readonly sseService: SseService, private readonly usersHttpClient: UsersHttpClient) {}

  @Get('token')
  @UseGuards(JwtAuthGuard)
  issueConnectionToken(@Req() req: any) {
    return { token: this.sseService.createConnectionToken(Number(req.user.id)) };
  }

  @ApiOperation({ summary: 'Subscribe to Server-Sent Events' })
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @Header('Connection', 'keep-alive')
  @Sse()
  @UseGuards(SseConnectionGuard)
  async subscribeToEvents(@Req() req: any): Promise<Observable<{ data: any }>> {
    const userId = req.sseUserId;
    if (!userId) throw new UnauthorizedException('Invalid or expired SSE connection ticket.');
    const lastEventId = req.headers?.['last-event-id'] || req.query?.lastEventId;
    // Recheck long-lived streams too; denial/unavailability closes the stream within one heartbeat.
    const approval$ = timer(20_000, 20_000).pipe(
      exhaustMap(() => from(this.usersHttpClient.requireAccountAccess(userId))),
      ignoreElements(),
    );
    return merge(this.sseService.getEventStream(userId, lastEventId), approval$);
  }
}
