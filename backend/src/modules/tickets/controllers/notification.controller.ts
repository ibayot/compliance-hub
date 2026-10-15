import {
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TicketNotification } from '../entities/ticket-notification.entity';
import { ApiTags } from '@nestjs/swagger';
import { SseService } from '../services/sse.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    @InjectRepository(TicketNotification)
    private readonly notificationRepo: Repository<TicketNotification>,
    @Optional() private readonly sseService?: SseService,
  ) {}

  private userId(req: any): number {
    const userId = Number(req.user?.id ?? req.user?.userId);
    if (!Number.isSafeInteger(userId) || userId < 1) throw new UnauthorizedException('A valid signed-in account is required.');
    return userId;
  }

  @Get('summary')
  async getMyNotificationSummary(@Request() req: any) {
    const userId = this.userId(req);
    try {
      const [notifications, unreadCount] = await Promise.all([
        this.notificationRepo.find({
          where: { userId },
          order: { isRead: 'ASC', createdAt: 'DESC' },
          take: 20,
        }),
        this.notificationRepo.count({ where: { userId, isRead: false } }),
      ]);
      return { notifications, unreadCount };
    } catch (error: any) {
      this.logger.error(
        `Failed to load notification summary for user ${userId}: ${error?.message || error}`,
      );
      throw error;
    }
  }

  @Get('mine')
  async getMyNotifications(@Request() req: any) {
    const userId = this.userId(req);
    const notifications = await this.notificationRepo.find({
      where: { userId },
      order: { isRead: 'ASC', createdAt: 'DESC' },
      take: 20,
    });
    return notifications;
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = this.userId(req);
    const count = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  @Post('mark-read')
  async markAllRead(@Request() req: any) {
    const userId = this.userId(req);
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
    this.sseService?.emitNotificationsRead(Number(userId));
    return { success: true };
  }

  @Post(':id/mark-read')
  async markRead(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = this.userId(req);
    const result = await this.notificationRepo.update(
      { id, userId, isRead: false },
      { isRead: true },
    );
    if (result.affected) this.sseService?.emitNotificationsRead(Number(userId));
    return { success: (result.affected ?? 0) > 0 };
  }
}
