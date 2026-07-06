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
import { Feedback } from './entities/feedback.entity';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { SecurityConfig } from './entities/security-config.entity';
import { SecurityConfigController } from './security-config.controller';
import { SecurityConfigService } from './security-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Unit,
      RoleDefinitionEntity,
      RoleCapability,
      Feedback,
      SecurityConfig,
    ]),
    EventBusModule,
  ],
  controllers: [SecurityConfigController, UsersController, FeedbackController],
  providers: [UsersService, RoleCapabilitiesService, FeedbackService, SecurityConfigService],
  exports: [UsersService, RoleCapabilitiesService, FeedbackService, SecurityConfigService],
})
export class UsersModule {}
