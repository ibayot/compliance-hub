import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketCategoryConfig } from './entities/ticket-category.entity';
import { TicketKeywordRule } from './entities/ticket-keyword-rule.entity';
import { TechAttendance } from './entities/tech-attendance.entity';
import { OfficeDay } from './entities/office-day.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketEscalation } from './entities/ticket-escalation.entity';
import { EscalationFocalConfig } from './entities/escalation-focal-config.entity';
import { TicketService } from './services/ticket.service';
import { TicketSettingsService } from './services/ticket-settings.service';
import { AttendanceService } from './services/attendance.service';
import { EmailService } from './services/email.service';
import { AttendanceController } from './controllers/attendance.controller';
import { TicketController } from './controllers/ticket.controller';
import { TicketSettingsController } from './controllers/ticket-settings.controller';
import { User } from '../users/entities/user.entity';
import { RoleDefinitionEntity } from '../users/entities/role-definition.entity';
import { RoleCapability } from '../users/entities/role-capability.entity';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { Unit } from '../units/entities/unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketComment,
      TicketCategoryConfig,
      TicketKeywordRule,
      TechAttendance,
      OfficeDay,
      TicketEvent,
      TicketEscalation,
      EscalationFocalConfig,
      User,
      Unit,
      RoleDefinitionEntity,
      RoleCapability,
    ]),
  ],
  controllers: [AttendanceController, TicketController, TicketSettingsController],
  providers: [TicketService, TicketSettingsService, AttendanceService, EmailService, RoleCapabilitiesService, CapabilityGuard],
  exports: [TicketService, AttendanceService, EmailService, RoleCapabilitiesService],
})
export class TicketsModule {}
