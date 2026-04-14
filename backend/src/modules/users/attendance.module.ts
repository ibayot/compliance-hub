import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from '../tickets/controllers/attendance.controller';
import { AttendanceService } from '../tickets/services/attendance.service';
import { TechAttendance } from '../tickets/entities/tech-attendance.entity';
import { OfficeDay } from '../tickets/entities/office-day.entity';
import { User } from './entities/user.entity';
import { RoleDefinitionEntity } from './entities/role-definition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TechAttendance,
      OfficeDay,
      User,
      RoleDefinitionEntity,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}