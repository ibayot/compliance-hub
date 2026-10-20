import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Unit } from '../units/entities/unit.entity';
import { RoleDefinitionEntity } from './entities/role-definition.entity';
import { RoleCapability } from './entities/role-capability.entity';
import { RoleCapabilitiesService } from './role-capabilities.service';
import { EventBusModule } from '../../common/events/event-bus.module';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { Feedback } from './entities/feedback.entity';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackAttachment } from './entities/feedback-attachment.entity';
import { SecurityConfig } from './entities/security-config.entity';
import { SecurityConfigController } from './security-config.controller';
import { SecurityConfigService } from './security-config.service';
import { UserTrustedDevice } from './entities/user-trusted-device.entity';
import { UserUnitOverride } from './entities/user-unit-override.entity';
import { UnitSyncService } from './unit-sync.service';
import { StaffDirectoryStore } from '../../shared/staff-directory/staff-directory.store';
import { StaffDirectorySyncService } from './staff-directory-sync.service';
import { StaffUnitDirectoryService } from './staff-unit-directory.service';
import { StaffUnitDirectoryController } from './staff-unit-directory.controller';
import { StaffDirectoryManagementController, StaffDirectoryIntegrationController, StaffDirectoryKeyGuard } from './staff-directory.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Unit,
      RoleDefinitionEntity,
      RoleCapability,
      Feedback,
      FeedbackAttachment,
      SecurityConfig,
      UserTrustedDevice,
      UserUnitOverride,
    ]),
    EventBusModule,
  ],
  // Register the one-segment static directory route before UsersController's /users/:id.
  controllers: [SecurityConfigController, StaffUnitDirectoryController, UsersController, FeedbackController, StaffDirectoryManagementController, StaffDirectoryIntegrationController],
  providers: [
    UsersService,
    UnitSyncService,
    StaffDirectoryStore,
    StaffDirectorySyncService,
    StaffUnitDirectoryService,
    StaffDirectoryKeyGuard,
    RoleCapabilitiesService,
    FeedbackService,
    SecurityConfigService,
    CapabilityGuard,
  ],
  exports: [
    UsersService,
    UnitSyncService,
    RoleCapabilitiesService,
    FeedbackService,
    SecurityConfigService,
  ],
})
export class UsersModule {}
