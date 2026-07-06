import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as IORedis from 'ioredis';

export const CAPABILITIES_UPDATED_EVENT = 'capabilities.updated';

export interface CapabilitiesUpdatedPayload {
  role: string;
  updatedAt: string;
}

/**
 * EventBusService
 *
 * Thin Redis pub/sub wrapper.  Uses two separate ioredis connections — one for
 * publishing (pubClient) and one for subscribing (subClient) — because a
 * connection that has called SUBSCRIBE cannot issue regular commands.
 *
 * Usage:
 *   - Publisher:  eventBus.publish(CAPABILITIES_UPDATED_EVENT, payload)
 *   - Subscriber: eventBus.subscribe(CAPABILITIES_UPDATED_EVENT, handler)
 */
@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private pubClient: IORedis.default | null = null;
  private subClient: IORedis.default | null = null;
  private enabled = false;
  private lastPubErrorAt = 0;
  private lastSubErrorAt = 0;

  private readonly handlers = new Map<string, Array<(payload: unknown) => void>>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const eventBusEnabledRaw = String(this.configService.get<string>('EVENT_BUS_ENABLED', ''))
      .trim()
      .toLowerCase();
    const eventBusEnabled =
      eventBusEnabledRaw.length > 0
        ? !['0', 'false', 'off', 'no'].includes(eventBusEnabledRaw)
        : Boolean(host);

    if (!eventBusEnabled) {
      this.logger.warn(
        'Event bus disabled (set EVENT_BUS_ENABLED=true with REDIS_HOST/REDIS_PORT to enable pub/sub invalidation)',
      );
      return;
    }

    if (!host) {
      this.logger.warn('Event bus disabled: REDIS_HOST is not configured');
      return;
    }

    const opts: IORedis.RedisOptions = {
      host,
      port,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 2000,
      retryStrategy: (attempt: number) => (attempt > 3 ? null : Math.min(250 * attempt, 1000)),
    };

    const pubClient = new (IORedis as any).default(opts) as IORedis.default;
    const subClient = new (IORedis as any).default(opts) as IORedis.default;
    this.pubClient = pubClient;
    this.subClient = subClient;

    const [pubConnected, subConnected] = await Promise.allSettled([
      pubClient.connect(),
      subClient.connect(),
    ]);

    if (pubConnected.status === 'rejected' || subConnected.status === 'rejected') {
      this.logger.warn(
        `Event bus disabled: Redis connection failed (pub=${pubConnected.status}, sub=${subConnected.status})`,
      );
      await Promise.allSettled([this.pubClient?.disconnect(), this.subClient?.disconnect()]);
      this.pubClient = null;
      this.subClient = null;
      this.enabled = false;
      return;
    }

    subClient.on('message', (channel: string, raw: string) => {
      const handlers = this.handlers.get(channel);
      if (!handlers?.length) return;
      try {
        const payload = JSON.parse(raw) as unknown;
        handlers.forEach((h) => h(payload));
      } catch {
        this.logger.warn(`Failed to parse event payload on channel "${channel}"`);
      }
    });

    subClient.on('error', (err: unknown) => {
      const now = Date.now();
      if (now - this.lastSubErrorAt > 10_000) {
        this.lastSubErrorAt = now;
        this.logger.warn(`EventBus sub error: ${this.formatError(err)}`);
      }
    });

    pubClient.on('error', (err: unknown) => {
      const now = Date.now();
      if (now - this.lastPubErrorAt > 10_000) {
        this.lastPubErrorAt = now;
        this.logger.warn(`EventBus pub error: ${this.formatError(err)}`);
      }
    });

    this.enabled = true;
    this.logger.log(`Event bus connected: redis://${host}:${port}`);
  }

  private formatError(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === 'string' && err.trim()) return err;
    try {
      const asJson = JSON.stringify(err);
      if (asJson && asJson !== '{}') return asJson;
    } catch {
      // ignore serialization errors
    }
    return 'unknown error';
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.pubClient?.quit(), this.subClient?.quit()]);
  }

  /** Publish a JSON-serialisable payload on a named channel. */
  async publish<T>(channel: string, payload: T): Promise<void> {
    if (!this.enabled || !this.pubClient) {
      return;
    }

    try {
      await this.pubClient.publish(channel, JSON.stringify(payload));
    } catch (err: any) {
      this.logger.warn(`EventBus publish error on "${channel}": ${this.formatError(err)}`);
    }
  }

  /**
   * Register a handler for a channel.  Internally manages the SUBSCRIBE call —
   * calling this multiple times for the same channel is safe.
   */
  async subscribe<T>(channel: string, handler: (payload: T) => void): Promise<void> {
    const existing = this.handlers.get(channel) ?? [];
    const isFirstSubscriber = existing.length === 0;

    existing.push(handler as (payload: unknown) => void);
    this.handlers.set(channel, existing);

    if (isFirstSubscriber && this.enabled && this.subClient) {
      await this.subClient.subscribe(channel);
    }
  }
}
