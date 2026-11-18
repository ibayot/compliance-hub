import { Controller, Get, Sse, UseGuards, Req, Header, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SseService } from '../services/sse.service';
import { Observable, defer, interval, merge } from 'rxjs';
import { exhaustMap, finalize, ignoreElements, share, tap } from 'rxjs/operators';
import { UsersHttpClient } from '../../../common/http-clients/users.http-client';
import { SseConnectionGuard } from '../guards/sse-connection.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ACCOUNT_ACCESS_BATCH_SIZE } from '../../../common/auth/account-access-batch';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class SseController {
  private readonly streamCounts = new Map<number, number>();
  private readonly approvals$: Observable<Map<number, boolean>> = interval(20_000).pipe(
    exhaustMap(() => this.checkOpenStreams()),
    share(),
  );

  constructor(private readonly sseService: SseService, private readonly usersHttpClient: UsersHttpClient) {}

  private async checkOpenStreams(): Promise<Map<number, boolean>> {
    const accountIds = [...this.streamCounts.keys()];
    const batches: number[][] = [];
    for (let i = 0; i < accountIds.length; i += ACCOUNT_ACCESS_BATCH_SIZE) {
      batches.push(accountIds.slice(i, i + ACCOUNT_ACCESS_BATCH_SIZE));
    }
    const decisions = new Map<number, boolean>();
    await Promise.all(batches.map(async batch => {
      const approved = await this.usersHttpClient.getApprovedStreamAccounts(batch);
      for (const id of batch) decisions.set(id, approved.has(id));
    }));
    return decisions;
  }

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
    const approval$ = defer(() => {
      this.streamCounts.set(userId, (this.streamCounts.get(userId) ?? 0) + 1);
      return this.approvals$.pipe(
        tap((decisions: Map<number, boolean>) => {
          if (decisions.get(userId) === false) {
            throw new UnauthorizedException('Application access could not be verified.');
          }
        }),
        ignoreElements(),
        finalize(() => {
          const count = this.streamCounts.get(userId) ?? 0;
          if (count <= 1) this.streamCounts.delete(userId);
          else this.streamCounts.set(userId, count - 1);
        }),
      );
    });
    return merge(this.sseService.getEventStream(userId, lastEventId), approval$);
  }
}
