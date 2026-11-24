import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  APP_NOTIFICATION_REQUESTED_EVENT,
  AppNotificationRequestedPayload,
  EventBusService,
} from '../../../common/events/event-bus.service';
import { User } from '../../shared/entities';
import { TicketNotification } from '../entities/ticket-notification.entity';
import { SseService } from './sse.service';
import { WebPushService } from './web-push.service';
import { FcmService } from './fcm.service';
import { SlaSoundKind } from './sla-sound-kind';
import { UsersHttpClient } from '../../../common/http-clients/users.http-client';

export interface CreateAppNotificationInput {
  ticketId?: string | null;
  targetPath?: string | null;
  eventType: string;
  message: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(TicketNotification)
    private readonly notificationRepo: Repository<TicketNotification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly sseService: SseService,
    private readonly eventBus: EventBusService,
    @Optional() private readonly webPushService?: WebPushService,
    @Optional() private readonly fcmService?: FcmService,
    @Optional() private readonly usersClient?: UsersHttpClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.eventBus.subscribe<AppNotificationRequestedPayload>(
      APP_NOTIFICATION_REQUESTED_EVENT,
      (payload) => void this.createFromEvent(payload),
    );
  }

  private async createFromEvent(payload: AppNotificationRequestedPayload): Promise<void> {
    try {
      const userIds = new Set<number>((payload.userIds ?? []).map(Number).filter(Number.isInteger));
      if (payload.role) {
        const users = await this.userRepo.find({
          where: { role: payload.role as any, active: true } as any,
          select: ['id'],
        });
        users.forEach((user) => userIds.add(Number(user.id)));
      }
      await this.create([...userIds], payload);
    } catch (error: any) {
      this.logger.error(`Failed to create an event-bus notification: ${error?.message || error}`);
    }
  }

  async create(userIds: number[], input: CreateAppNotificationInput): Promise<void> {
    const ids = [...new Set(userIds.map(Number).filter(Number.isInteger))];
    if (ids.length === 0) return;

    const activeUsers = await this.userRepo.find({
      where: { id: In(ids), active: true } as any,
      select: ['id'],
    });
    const activeIds = new Set(activeUsers.map((user) => Number(user.id)));
    const notifications = ids
      .filter((id) => activeIds.has(id))
      .map((userId) =>
        this.notificationRepo.create({
          userId,
          ticketId: input.ticketId ?? null,
          targetPath: input.targetPath ?? (input.ticketId ? `/operations/tickets/${input.ticketId}` : null),
          eventType: input.eventType,
          message: input.message,
        }),
      );
    if (notifications.length === 0) return;

    await this.notificationRepo.save(notifications);
    notifications.forEach((notification) =>
      this.sseService.emitNotificationCreated(notification.userId),
    );
    // Push is best-effort: never delay or fail the in-app notification/SSE path.
    if (this.webPushService || this.fcmService) {
      void Promise.all(notifications.map(async notification => {
        let fcmAcceptedDeviceIds = new Set<string>();
        if (this.fcmService) {
          try {
            fcmAcceptedDeviceIds = await this.fcmService.sendForNotification(notification);
          } catch {
            this.logger.warn('An Android app alert could not be sent.');
          }
        }
        if (this.webPushService) {
          try {
            await this.webPushService.sendForNotification(notification, fcmAcceptedDeviceIds);
          } catch {
            this.logger.warn('A browser push alert could not be sent.');
          }
        }
      })).catch(() => this.logger.warn('One or more device alerts could not be sent.'));
    }
    this.logger.log(`Created ${notifications.length} app notification(s).`);
  }

  async createForRoles(roles: string[], input: CreateAppNotificationInput): Promise<void> {
    await this.create(await this.getActiveIdsForRoles(roles), input);
  }

  async getActiveIdsForRoles(roles: string[]): Promise<number[]> {
    const uniqueRoles = [...new Set(roles.filter(Boolean))];
    if (uniqueRoles.length === 0) return [];
    const users = await this.userRepo.find({
      where: { role: In(uniqueRoles) as any, active: true } as any,
      select: ['id'],
    });
    return users.map((user) => Number(user.id));
  }

  async sendSlaSounds(alerts: ReadonlyMap<number, SlaSoundKind>): Promise<void> {
    if (!alerts.size) return;
    const users = await this.userRepo.find({
      where: { id: In([...alerts.keys()]), active: true } as any,
      select: ['id'],
    });
    for (let offset = 0; offset < users.length; offset += 20) {
      await Promise.all(users.slice(offset, offset + 20).map(async user => {
        const kind = alerts.get(Number(user.id));
        if (!kind || !this.usersClient) return;
        try { await this.usersClient.requireAccountAccess(Number(user.id)); } catch { return; }
        this.sseService.emitSlaSound(Number(user.id), kind);
        const android = await this.fcmService?.sendSlaSound(Number(user.id), kind).catch(() => undefined);
        await this.webPushService?.sendSlaSound(Number(user.id), kind, android ?? new Set()).catch(() => undefined);
      }));
    }
  }
}
