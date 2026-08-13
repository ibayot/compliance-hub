import { Module } from '@nestjs/common';
import { EventBusModule } from './event-bus.module';
import { SseService } from './sse.service';

@Module({
  imports: [EventBusModule],
  providers: [SseService],
  exports: [SseService],
})
export class RealtimeModule {}
