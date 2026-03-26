import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketCategoryConfig } from './entities/ticket-category.entity';
import { TicketKeywordRule } from './entities/ticket-keyword-rule.entity';
import { TechAttendance } from './entities/tech-attendance.entity';
import { OfficeDay } from './entities/office-day.entity';
import { TicketService } from './services/ticket.service';
import { TicketSettingsService } from './services/ticket-settings.service';
import { AttendanceService } from './services/attendance.service';
import { EmailService } from './services/email.service';
import { TicketController } from './controllers/ticket.controller';
import { TicketSettingsController } from './controllers/ticket-settings.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { User } from '../users/entities/user.entity';
import { RoleDefinitionEntity } from '../users/entities/role-definition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketComment,
      TicketCategoryConfig,
      TicketKeywordRule,
      TechAttendance,
      OfficeDay,
      User,
      RoleDefinitionEntity,
    ]),
  ],
  controllers: [TicketController, TicketSettingsController, AttendanceController],
  providers: [TicketService, TicketSettingsService, AttendanceService, EmailService],
  exports: [TicketService, AttendanceService, EmailService],
})
export class TicketsModule {}

