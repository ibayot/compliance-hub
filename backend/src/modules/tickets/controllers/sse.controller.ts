import { Controller, Get, Sse, UseGuards, Req, Header, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SseService } from '../services/sse.service';
import { Observable } from 'rxjs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class SseController {
  constructor(private readonly sseService: SseService) {}

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
  subscribeToEvents(@Req() req: any): Observable<{ data: any }> {
    const userId = this.sseService.validateConnectionToken(req.query?.ticket);
    if (!userId) throw new UnauthorizedException('Invalid or expired SSE connection ticket.');
    const lastEventId = req.headers?.['last-event-id'] || req.query?.lastEventId;
    return this.sseService.getEventStream(userId, lastEventId);
  }
}
