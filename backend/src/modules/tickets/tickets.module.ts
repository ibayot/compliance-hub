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
import { TicketService } from './services/ticket.service';
import { TicketSettingsService } from './services/ticket-settings.service';
import { TicketCronService } from './services/ticket-cron.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { AttendanceService } from './services/attendance.service';
import { EmailService } from './services/email.service';
import { AttendanceController } from './controllers/attendance.controller';
import { TicketController } from './controllers/ticket.controller';
import { TicketSettingsController } from './controllers/ticket-settings.controller';
import { KnowledgeBaseController } from './controllers/knowledge-base.controller';
import { User, RoleDefinitionEntity, Unit } from '../shared/entities';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { EventBusModule } from '../../common/events/event-bus.module';
import { CapabilityGuard } from '../../common/guards/capability.guard';

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
      User,
      Unit,
      RoleDefinitionEntity,
      // RoleCapability removed: now loaded via RoleCapabilitiesHttpClient → users-service HTTP API
    ]),
    HttpClientsModule,
    EventBusModule,
  ],
  controllers: [
    AttendanceController,
    TicketController,
    TicketSettingsController,
    KnowledgeBaseController,
  ],
  providers: [
    TicketService,
    TicketSettingsService,
    AttendanceService,
    EmailService,
    TicketCronService,
    KnowledgeBaseService,
    // Phase B: RoleCapabilitiesHttpClient provides all methods of RoleCapabilitiesService
    // without the TypeORM cross-DB View dependency.
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
  ],
  exports: [
    TicketService,
    TicketSettingsService,
    AttendanceService,
    EmailService,
    RoleCapabilitiesService,
    KnowledgeBaseService,
  ],
})
export class TicketsModule {}
