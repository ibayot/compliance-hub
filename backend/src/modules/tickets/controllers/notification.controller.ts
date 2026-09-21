import { Controller, Get, Logger, Post, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TicketNotification } from '../entities/ticket-notification.entity';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    @InjectRepository(TicketNotification)
    private readonly notificationRepo: Repository<TicketNotification>,
  ) {}

  @Get('summary')
  async getMyNotificationSummary(@Request() req: any) {
    const userId = req.user.id ?? req.user.userId;
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
      this.logger.error(`Failed to load notification summary for user ${userId}: ${error?.message || error}`);
      throw error;
    }
  }

  @Get('mine')
  async getMyNotifications(@Request() req: any) {
    const userId = req.user.id ?? req.user.userId;
    const notifications = await this.notificationRepo.find({
      where: { userId },
      order: { isRead: 'ASC', createdAt: 'DESC' },
      take: 20,
    });
    return notifications;
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.id ?? req.user.userId;
    const count = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  @Post('mark-read')
  async markAllRead(@Request() req: any) {
    const userId = req.user.id ?? req.user.userId;
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true }
    );
    return { success: true };
  }
}
