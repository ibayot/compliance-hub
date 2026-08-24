import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketCategoryConfig } from './entities/ticket-category.entity';
import { TicketKeywordRule } from './entities/ticket-keyword-rule.entity';
import { TicketIssueType } from './entities/ticket-issue-type.entity';
import { TechAttendance } from './entities/tech-attendance.entity';
import { OfficeDay } from './entities/office-day.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketEscalation } from './entities/ticket-escalation.entity';
import { EscalationFocalConfig } from './entities/escalation-focal-config.entity';
import { TicketingConfig } from './entities/ticketing-config.entity';
import { KnowledgeArticle } from './entities/knowledge-article.entity';
import { TicketNotification } from './entities/ticket-notification.entity';
import { DtrView } from './entities/dtr-view.entity';
import { TicketService } from './services/ticket.service';
import { TicketSettingsService } from './services/ticket-settings.service';
import { TicketCronService } from './services/ticket-cron.service';
import { TicketStatusJustification } from './entities/ticket-status-justification.entity';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { AttendanceService } from './services/attendance.service';
import { EmailService } from './services/email.service';
import { AttendanceController } from './controllers/attendance.controller';
import { TicketController } from './controllers/ticket.controller';
import { TicketSettingsController } from './controllers/ticket-settings.controller';
import { KnowledgeBaseController } from './controllers/knowledge-base.controller';
import { NotificationController } from './controllers/notification.controller';
import { SseController } from './controllers/sse.controller';
import { RealtimeModule } from '../../common/events/realtime.module';
import { AttendanceSseInterceptor } from './interceptors/attendance-sse.interceptor';
import { User, RoleDefinitionEntity, Unit } from '../shared/entities';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { EventBusModule } from '../../common/events/event-bus.module';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { DutyAssignment, DutyDailyCoverage, DutyException, DutyMeetingReservation, DutyRosterMembership } from './entities/duty.entity';
import { DutyService } from './services/duty.service';
import { DutyController } from './controllers/duty.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketComment,
      TicketCategoryConfig,
      TicketKeywordRule,
      TicketIssueType,
      TechAttendance,
      OfficeDay,
      TicketEvent,
      TicketEscalation,
      EscalationFocalConfig,
      TicketingConfig,
      KnowledgeArticle,
      DtrView,
      TicketStatusJustification,
      TicketNotification,
      User,
      Unit,
      RoleDefinitionEntity,
      DutyAssignment,
      DutyDailyCoverage,
      DutyException,
      DutyMeetingReservation,
      DutyRosterMembership,
      // RoleCapability removed: now loaded via RoleCapabilitiesHttpClient → users-service HTTP API
    ]),
    HttpClientsModule,
    EventBusModule,
    RealtimeModule,
  ],
  controllers: [
    AttendanceController,
    TicketController,
    TicketSettingsController,
    KnowledgeBaseController,
    NotificationController,
    SseController,
    DutyController,
  ],
  providers: [
    TicketService,
    TicketSettingsService,
    AttendanceService,
    EmailService,
    TicketCronService,
    KnowledgeBaseService,
    AttendanceSseInterceptor,
    // Phase B: RoleCapabilitiesHttpClient provides all methods of RoleCapabilitiesService
    // without the TypeORM cross-DB View dependency.
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
    DutyService,
  ],
  exports: [
    TicketService,
    TicketSettingsService,
    AttendanceService,
    EmailService,
    RoleCapabilitiesService,
    KnowledgeBaseService,
    DutyService,
  ],
})
export class TicketsModule {
  constructor(private readonly ticketCronService: TicketCronService) {}
}
