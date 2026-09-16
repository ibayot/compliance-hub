import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
    } catch {
      this.logger.warn('Failed to create an event-bus notification.');
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
    this.logger.log(`Created ${notifications.length} app notification(s).`);
  }

  async createForRoles(roles: string[], input: CreateAppNotificationInput): Promise<void> {
    const uniqueRoles = [...new Set(roles.filter(Boolean))];
    if (uniqueRoles.length === 0) return;
    const users = await this.userRepo.find({
      where: { role: In(uniqueRoles) as any, active: true } as any,
      select: ['id'],
    });
    await this.create(users.map((user) => Number(user.id)), input);
  }
}
