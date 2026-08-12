import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TicketNotification } from '../entities/ticket-notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    @InjectRepository(TicketNotification)
    private readonly notificationRepo: Repository<TicketNotification>,
  ) {}

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
