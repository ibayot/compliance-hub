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

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Unit, RoleDefinitionEntity, RoleCapability]),
    EventBusModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, RoleCapabilitiesService],
  exports: [UsersService, RoleCapabilitiesService],
})
export class UsersModule {}
