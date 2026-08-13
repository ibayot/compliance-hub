import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, Subject, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { EventBusService } from './event-bus.service';

export const SSE_EVENT_CHANNEL = 'realtime.sse.events';

export interface SseEvent {
  type: string;
  payload?: any;
  targetUserId?: number;
}

interface SseEnvelope {
  sourceId: string;
  event: SseEvent;
}

@Injectable()
export class SseService implements OnModuleInit {
  private readonly logger = new Logger(SseService.name);
  private readonly instanceId = randomUUID();
  private readonly eventSubject = new Subject<SseEvent>();

  constructor(private readonly eventBus: EventBusService) {}

  async onModuleInit(): Promise<void> {
    await this.eventBus.subscribe<SseEnvelope>(SSE_EVENT_CHANNEL, (message) => {
      if (!message || message.sourceId === this.instanceId || !message.event) {
        return;
      }

      this.eventSubject.next(message.event);
    });
  }

  getEventStream(userId: number): Observable<{ data: any }> {
    const events$ = this.eventSubject.pipe(
      filter(
        (event) =>
          event.targetUserId == null || event.targetUserId === userId,
      ),
      map((event) => ({
        data: {
          type: event.type,
          payload: event.payload,
        },
      })),
    );

    const heartbeat$ = interval(20_000).pipe(
      map(() => ({
        data: {
          type: 'HEARTBEAT',
          payload: {
            timestamp: Date.now(),
          },
        },
      })),
    );

    return merge(events$, heartbeat$);
  }

  private emit(event: SseEvent) {
    this.eventSubject.next(event);
    void this.eventBus.publish<SseEnvelope>(SSE_EVENT_CHANNEL, {
      sourceId: this.instanceId,
      event,
    });
  }

  emitTicketUpdated(ticketId?: string, targetUserId?: number) {
    this.logger.log(
      `[SSE EMIT] ${new Date().toISOString()} TICKET_UPDATED ${JSON.stringify({ ticketId, targetUserId })}`,
    );
    this.emit({
      type: 'TICKET_UPDATED',
      payload: { ticketId },
      targetUserId,
    });
  }

  emitSystemStatusChanged(isOnline: boolean) {
    this.emit({
      type: 'SYSTEM_STATUS_CHANGED',
      payload: { isOnline },
    });
  }

  emitAttendanceUpdated() {
    this.emit({
      type: 'ATTENDANCE_UPDATED',
    });
  }

  emitNotificationCreated(targetUserId: number) {
    this.logger.log(
      `[SSE EMIT] ${new Date().toISOString()} NOTIFICATION_CREATED ${JSON.stringify({ targetUserId })}`,
    );
    this.emit({
      type: 'NOTIFICATION_CREATED',
      targetUserId,
    });
  }

  emitGlobalSettingsUpdated() {
    this.emit({
      type: 'GLOBAL_SETTINGS_UPDATED',
    });
  }

  emitIncidentSnapshotCreated() {
    this.emit({
      type: 'INCIDENT_SNAPSHOT_CREATED',
    });
  }
}
