import { NestFactory } from '@nestjs/core';
import { TicketsModule } from './modules/tickets/tickets.module';
import { AttendanceService } from './modules/tickets/services/attendance.service';
import { UsersServiceAppModule } from './apps/users-service.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(UsersServiceAppModule);
  const attendanceService = app.get(AttendanceService);
  console.log('Running sync...');
  await attendanceService.syncAttendanceWithDTR();
  console.log('Sync complete.');
  await app.close();
}

bootstrap();
