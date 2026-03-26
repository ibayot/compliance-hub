import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  AttendanceService,
  SetAttendanceDto,
  BulkSetAttendanceDto,
  SetOfficeDayDto,
  BulkSetOfficeDaysDto,
} from '../services/attendance.service';

/** Roles that can manage technician attendance */
const FOCAL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.TECHNICIAN,         // focal-level technician
  UserRole.TECHNICIAN_DESKTOP,
  UserRole.TECHNICIAN_IT_SUPPORT,
  UserRole.TECHNICIAN_IT_STAFF,
  UserRole.TECHNICIAN_DESKTOP_STAFF,
];

/** Roles that can manage office days */
const OFFICE_DAY_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.REVIEWER,    // section head / alternate
  UserRole.FOCAL,       // compliance officer
];

/** Roles that can read attendance */
const READ_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.REVIEWER,
  UserRole.FOCAL,
  UserRole.TECHNICIAN,
  UserRole.TECHNICIAN_DESKTOP,
  UserRole.TECHNICIAN_IT_SUPPORT,
  UserRole.TECHNICIAN_IT_STAFF,
  UserRole.TECHNICIAN_DESKTOP_STAFF,
];

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ── Attendance ──────────────────────────────────────────────────────────

  /** GET /attendance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&ticketType= */
  @Get()
  @Roles(...READ_ROLES)
  async getAttendance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('ticketType') ticketType?: string,
  ) {
    if (!startDate || !endDate) {
      const today = new Date().toISOString().slice(0, 10);
      return this.attendanceService.getAttendanceForDate(today);
    }
    return this.attendanceService.getAttendance(startDate, endDate, ticketType);
  }

  /** POST /attendance — set a single attendance record */
  @Post()
  @Roles(...FOCAL_ROLES, ...OFFICE_DAY_ROLES)
  @HttpCode(HttpStatus.OK)
  async setAttendance(@Body() dto: SetAttendanceDto, @Request() req: any) {
    return this.attendanceService.setAttendance(dto, req.user.id ?? req.user.userId);
  }

  /** POST /attendance/bulk — set multiple attendance records */
  @Post('bulk')
  @Roles(...FOCAL_ROLES, ...OFFICE_DAY_ROLES)
  @HttpCode(HttpStatus.OK)
  async bulkSetAttendance(@Body() dto: BulkSetAttendanceDto, @Request() req: any) {
    return this.attendanceService.bulkSetAttendance(dto, req.user.id ?? req.user.userId);
  }

  /** GET /attendance/technicians?ticketType= — list technicians (for attendance management) */
  @Get('technicians')
  @Roles(...READ_ROLES)
  async listTechnicians(@Query('ticketType') ticketType?: string) {
    return this.attendanceService.listTechnicians(ticketType);
  }

  // ── Office Days ─────────────────────────────────────────────────────────

  /** GET /attendance/office-days?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD */
  @Get('office-days')
  @Roles(...READ_ROLES)
  async getOfficeDays(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      // Default to current month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      return this.attendanceService.getOfficeDays(start, end);
    }
    return this.attendanceService.getOfficeDays(startDate, endDate);
  }

  /** POST /attendance/office-days — set a single office day */
  @Post('office-days')
  @Roles(...OFFICE_DAY_ROLES)
  @HttpCode(HttpStatus.OK)
  async setOfficeDay(@Body() dto: SetOfficeDayDto, @Request() req: any) {
    return this.attendanceService.setOfficeDay(dto, req.user.id ?? req.user.userId);
  }

  /** POST /attendance/office-days/bulk — set multiple office days */
  @Post('office-days/bulk')
  @Roles(...OFFICE_DAY_ROLES)
  @HttpCode(HttpStatus.OK)
  async bulkSetOfficeDays(@Body() dto: BulkSetOfficeDaysDto, @Request() req: any) {
    return this.attendanceService.bulkSetOfficeDays(dto, req.user.id ?? req.user.userId);
  }

  /** GET /attendance/staff-logins?date=YYYY-MM-DD — staff login activity for a date */
  @Get('staff-logins')
  @Roles(...READ_ROLES, UserRole.AUDITOR)
  async getStaffLogins(@Query('date') date?: string) {
    const target = date || new Date().toISOString().slice(0, 10);
    return this.attendanceService.getStaffLoginsForDate(target);
  }
}
