import { Controller, Sse, UseGuards, Req, Header } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SseService } from '../services/sse.service';
import { Observable } from 'rxjs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @ApiOperation({ summary: 'Subscribe to Server-Sent Events' })
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @Header('Connection', 'keep-alive')
  @Sse()
  subscribeToEvents(@Req() req: any): Observable<{ data: any }> {
    return this.sseService.getEventStream(req.user.id);
  }
}
