import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from '../tickets/controllers/attendance.controller';
import { AttendanceService } from '../tickets/services/attendance.service';
import { TechAttendance } from '../tickets/entities/tech-attendance.entity';
import { OfficeDay } from '../tickets/entities/office-day.entity';
import { User } from './entities/user.entity';
import { RoleDefinitionEntity } from './entities/role-definition.entity';
import { RoleCapability } from './entities/role-capability.entity';
import { RoleCapabilitiesService } from './role-capabilities.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TechAttendance,
      OfficeDay,
      User,
      RoleDefinitionEntity,
      RoleCapability,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, RoleCapabilitiesService],
  exports: [AttendanceService, RoleCapabilitiesService],
})
export class AttendanceModule {}