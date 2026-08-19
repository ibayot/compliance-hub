import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { Observable, Subject, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { EventBusService } from './event-bus.service';

export const SSE_EVENT_CHANNEL = 'realtime.sse.events';

export interface SseEvent {
  id?: string;
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
  private readonly replayBuffer: SseEvent[] = [];
  private eventSequence = 0;
  private readonly tokenSecret: Buffer;
  private readonly connectionTicketTtlMs = 60_000;

  constructor(private readonly eventBus: EventBusService, configService: ConfigService) {
    const secret = configService.get<string>('SSE_TOKEN_SECRET') || configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('SSE_TOKEN_SECRET or JWT_SECRET must be configured.');
    this.tokenSecret = createHash('sha256').update(secret).digest();
  }

  createConnectionToken(userId: number): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.tokenSecret, iv);
    const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + this.connectionTicketTtlMs }));
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
  }

  validateConnectionToken(token: string): number | null {
    try {
      const [ivRaw, tagRaw, encryptedRaw] = String(token || '').split('.');
      if (!ivRaw || !tagRaw || !encryptedRaw) return null;
      const decipher = createDecipheriv('aes-256-gcm', this.tokenSecret, Buffer.from(ivRaw, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
      const payload = JSON.parse(Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64url')), decipher.final()]).toString('utf8'));
      if (!Number.isInteger(payload.sub) || payload.exp < Date.now()) return null;
      return payload.sub;
    } catch {
      return null;
    }
  }

  async onModuleInit(): Promise<void> {
    await this.eventBus.subscribe<SseEnvelope>(SSE_EVENT_CHANNEL, (message) => {
      if (!message || message.sourceId === this.instanceId || !message.event) {
        return;
      }

      this.eventSubject.next(message.event);
    });
  }

  getEventStream(userId: number, lastEventId?: string): Observable<{ id?: string; data: any }> {
    const replayStart = lastEventId
      ? this.replayBuffer.findIndex((event) => event.id === lastEventId)
      : -1;
    const replayEvents = replayStart >= 0 ? this.replayBuffer.slice(replayStart + 1) : [];
    const events$ = this.eventSubject.pipe(
      filter(
        (event) =>
          event.targetUserId == null || event.targetUserId === userId,
      ),
      map((event) => ({
        id: event.id,
        data: {
          type: event.type,
          payload: event.payload,
        },
      })),
    );

    const replay$ = new Observable<SseEvent>((subscriber) => {
      replayEvents.forEach((event) => subscriber.next(event));
      subscriber.complete();
    }).pipe(
      filter((event) => event.targetUserId == null || event.targetUserId === userId),
      map((event) => ({
        id: event.id,
        data: { type: event.type, payload: event.payload },
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

    return merge(replay$, events$, heartbeat$);
  }

  private emit(event: SseEvent) {
    event.id = `${++this.eventSequence}`;
    this.replayBuffer.push(event);
    if (this.replayBuffer.length > 1000) this.replayBuffer.shift();
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
