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
  private pubClient!: IORedis.default;
  private subClient!: IORedis.default;

  private readonly handlers = new Map<string, Array<(payload: unknown) => void>>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    const opts: IORedis.RedisOptions = {
      host,
      port,
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      lazyConnect: false,
    };

    this.pubClient = new (IORedis as any).default(opts);
    this.subClient = new (IORedis as any).default(opts);

    this.subClient.on('message', (channel: string, raw: string) => {
      const handlers = this.handlers.get(channel);
      if (!handlers?.length) return;
      try {
        const payload = JSON.parse(raw) as unknown;
        handlers.forEach((h) => h(payload));
      } catch {
        this.logger.warn(`Failed to parse event payload on channel "${channel}"`);
      }
    });

    this.subClient.on('error', (err: Error) =>
      this.logger.error(`EventBus sub error: ${err.message}`),
    );
    this.pubClient.on('error', (err: Error) =>
      this.logger.error(`EventBus pub error: ${err.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.pubClient?.quit(),
      this.subClient?.quit(),
    ]);
  }

  /** Publish a JSON-serialisable payload on a named channel. */
  async publish<T>(channel: string, payload: T): Promise<void> {
    try {
      await this.pubClient.publish(channel, JSON.stringify(payload));
    } catch (err: any) {
      this.logger.error(`EventBus publish error on "${channel}": ${err?.message}`);
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

    if (isFirstSubscriber) {
      await this.subClient.subscribe(channel);
    }
  }
}
