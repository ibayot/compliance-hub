import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { AttendanceSseInterceptor } from '../interceptors/attendance-sse.interceptor';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  AttendanceService,
  SetAttendanceDto,
  BulkSetAttendanceDto,
  SetOfficeDayDto,
  BulkSetOfficeDaysDto,
} from '../services/attendance.service';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';

/** Roles that can manage technician attendance (set present/absent/etc.) */
const FOCAL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
  // v0.6.14 named roles
  UserRole.PANTAWID_ICT,
  UserRole.DESKTOP_SR,
  UserRole.IT_SUPPORT_SR,
  UserRole.DESKTOP_JR,
  UserRole.IT_SUPPORT_JR,
  UserRole.COMPLIANCE_OFFICER,
  UserRole.CYBERSEC,
  UserRole.INFOSEC,
  UserRole.LEAD_INFRA,
  UserRole.SERVER_ADMIN,
  UserRole.DB_ADMIN,
  UserRole.NETWORK_ADMIN,
  UserRole.PROJECT_MGR,
  UserRole.DEV_LEAD,
  UserRole.SQA_LEAD,
  UserRole.RECORDS_OFFICER,
  UserRole.HR_ID_OFFICER,
];

/** Strict role-only check (no roleCode fallback) for attendance mutation endpoints. */
const STRICT_ATTENDANCE_MANAGE_ROLES: string[] = [];

/** Strict role-only check (no roleCode fallback) for office-day mutation endpoints. */
const STRICT_OFFICEDAY_MANAGE_ROLES: string[] = [];

/** Roles that can manage office days (set/toggle office calendar) */
const OFFICE_DAY_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
  // v0.6.14 ITO focal-equivalent roles
  UserRole.COMPLIANCE_OFFICER,
  UserRole.CYBERSEC,
  UserRole.INFOSEC,
  UserRole.LEAD_INFRA,
  UserRole.SERVER_ADMIN,
  UserRole.DB_ADMIN,
  UserRole.NETWORK_ADMIN,
  UserRole.PROJECT_MGR,
  UserRole.DEV_LEAD,
  UserRole.SQA_LEAD,
  UserRole.RECORDS_OFFICER,
  UserRole.HR_ID_OFFICER,
  // Senior tech roles may also need to manage office days for their teams
  UserRole.DESKTOP_SR,
  UserRole.IT_SUPPORT_SR,
  UserRole.PANTAWID_ICT,
];

/** Roles that can read attendance */
const READ_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
  // v0.6.14 named roles
  UserRole.PANTAWID_ICT,
  UserRole.DESKTOP_SR,
  UserRole.IT_SUPPORT_SR,
  UserRole.DESKTOP_JR,
  UserRole.IT_SUPPORT_JR,
  UserRole.COMPLIANCE_OFFICER,
  UserRole.CYBERSEC,
  UserRole.INFOSEC,
  UserRole.LEAD_INFRA,
  UserRole.SERVER_ADMIN,
  UserRole.DB_ADMIN,
  UserRole.NETWORK_ADMIN,
  UserRole.PROJECT_MGR,
  UserRole.DEV_LEAD,
  UserRole.SQA_LEAD,
  UserRole.RECORDS_OFFICER,
  UserRole.HR_ID_OFFICER,
];

function mapUser(u: any) {
  if (!u) return u;
  return {
    id: u.id,
    firstName: u.firstName,
    middleName: u.middleName,
    lastName: u.lastName,
    suffix: u.suffix,
    role: u.role,
    active: u.active,
  };
}

function mapAttendance(a: any) {
  if (!a) return a;
  return {
    id: a.id,
    userId: a.userId,
    date: a.date,
    status: a.status,
    setById: a.setById,
    clockInTime: a.clockInTime ?? null,
    isManualOverride: a.isManualOverride ?? false,
    user: mapUser(a.user),
    setBy: mapUser(a.setBy),
  };
}

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AttendanceSseInterceptor)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly roleCapSvc: RoleCapabilitiesService,
  ) {}

  private ensureStrictRole(actualRole: string | undefined, allowed: string[], action: string) {
    if (allowed.length === 0 && actualRole) {
      if (this.roleCapSvc.isAttendanceManage(actualRole)) {
        return;
      }
    }
    if (!actualRole || !allowed.includes(actualRole)) {
      throw new ForbiddenException(`Role '${actualRole || 'unknown'}' cannot ${action}.`);
    }
  }

  // ── Attendance ──────────────────────────────────────────────────────────

  /** GET /attendance/system-status */
  @Get('system-status')
  async getSystemStatus() {
    return this.attendanceService.getDtrSystemStatus();
  }

  /** GET /attendance/my-shift */
  @Get('my-shift')
  async getMyShift(@Request() req: any) {
    // The JwtAuthGuard populates req.user. We need the full user entity to get staffId
    // But req.user might already have it if it's in the JWT, else we can fetch it, 
    // Wait, the AttendanceService.getMyShift expects a User entity. Let's see how req.user is mapped.
    return this.attendanceService.getMyShift(req.user);
  }

  /** GET /attendance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&ticketType= */
  @Get()
  @UseGuards(CapabilityGuard)
  @RequireCapability('isAttendanceAccess')
  @Roles(...READ_ROLES)
  async getAttendance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('ticketType') ticketType?: string,
  ) {
    if (!startDate || !endDate) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const records = await this.attendanceService.getAttendanceForDate(today);
      return records.map(mapAttendance);
    }
    const records = await this.attendanceService.getAttendance(startDate, endDate, ticketType);
    return records.map(mapAttendance);
  }

  /** POST /attendance — set a single attendance record */
  @Post()
  @Roles(...FOCAL_ROLES, ...OFFICE_DAY_ROLES)
  @HttpCode(HttpStatus.OK)
  async setAttendance(@Body() dto: SetAttendanceDto, @Request() req: any) {
    this.ensureStrictRole(req.user?.role, STRICT_ATTENDANCE_MANAGE_ROLES, 'manage attendance');
    
    // Check if user is trying to set PRESENT manually
    if (dto.status === 'present' as any) {
      const systemStatus = this.attendanceService.getDtrSystemStatus();
      if (systemStatus.isOnline) {
        throw new ForbiddenException('Cannot manually set PRESENT while DTR sync is online. Please use the fallback override only when the system is down.');
      }
      if (!this.roleCapSvc.isAttendanceManage(req.user?.role)) {
        throw new ForbiddenException('Only Attendance Admins can use the fallback PRESENT override.');
      }
    }

    const record = await this.attendanceService.setAttendance(dto, req.user.id ?? req.user.userId, req.user.role);
    return mapAttendance(record);
  }

  /** DELETE /attendance/:userId/:date */
  @Delete(':userId/:date')
  @ApiTags('_test-only')
  @Roles(...FOCAL_ROLES)
  @HttpCode(HttpStatus.OK)
  async deleteAttendance(@Param('userId') userId: string, @Param('date') date: string, @Request() req: any) {
    this.ensureStrictRole(req.user?.role, STRICT_ATTENDANCE_MANAGE_ROLES, 'manage attendance');
    return this.attendanceService.deleteAttendance(Number(userId), date);
  }

  /** POST /attendance/bulk — set multiple attendance records */
  @Post('bulk')
  @Roles(...FOCAL_ROLES, ...OFFICE_DAY_ROLES)
  @HttpCode(HttpStatus.OK)
  async bulkSetAttendance(@Body() dto: BulkSetAttendanceDto, @Request() req: any) {
    this.ensureStrictRole(req.user?.role, STRICT_ATTENDANCE_MANAGE_ROLES, 'manage attendance');
    
    const hasPresent = dto.entries.some(e => e.status === 'present' as any);
    if (hasPresent) {
      const systemStatus = this.attendanceService.getDtrSystemStatus();
      if (systemStatus.isOnline) {
        throw new ForbiddenException('Cannot manually set PRESENT while DTR sync is online.');
      }
      if (!this.roleCapSvc.isAttendanceManage(req.user?.role)) {
        throw new ForbiddenException('Only Attendance Admins can use the fallback PRESENT override.');
      }
    }

    const records = await this.attendanceService.bulkSetAttendance(
      dto,
      req.user.id ?? req.user.userId,
      req.user.role,
    );
    return records.map(mapAttendance);
  }

  /** DELETE /attendance/all — super_admin only: clear all attendance records */
  @ApiTags('_test-only')
  @Delete('all')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async clearAllAttendance() {
    return this.attendanceService.clearAllAttendance();
  }

  /** GET /attendance/technicians?ticketType= — list technicians (for attendance management) */
  @Get('technicians')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isAttendanceAccess')
  @Roles(...READ_ROLES)
  async listTechnicians(@Query('ticketType') ticketType?: string, @Request() req?: any) {
    return this.attendanceService.listTechnicians(ticketType, req?.user?.role);
  }

  // ── Office Days ─────────────────────────────────────────────────────────

  /** GET /attendance/office-days?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD */
  @Get('office-days')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isAttendanceAccess')
  @Roles(...READ_ROLES)
  async getOfficeDays(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    if (!startDate || !endDate) {
      // Default to current month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      return this.attendanceService.getOfficeDays(start, end);
    }
    return this.attendanceService.getOfficeDays(startDate, endDate);
  }

  /** POST /attendance/office-days — set a single office day */
  @Post('office-days')
  @Roles(...OFFICE_DAY_ROLES)
  @HttpCode(HttpStatus.OK)
  async setOfficeDay(@Body() dto: SetOfficeDayDto, @Request() req: any) {
    this.ensureStrictRole(req.user?.role, STRICT_OFFICEDAY_MANAGE_ROLES, 'manage office days');
    return this.attendanceService.setOfficeDay(dto, req.user.id ?? req.user.userId);
  }

  /** POST /attendance/office-days/bulk — set multiple office days */
  @Post('office-days/bulk')
  @Roles(...OFFICE_DAY_ROLES)
  @HttpCode(HttpStatus.OK)
  async bulkSetOfficeDays(@Body() dto: BulkSetOfficeDaysDto, @Request() req: any) {
    this.ensureStrictRole(req.user?.role, STRICT_OFFICEDAY_MANAGE_ROLES, 'manage office days');
    return this.attendanceService.bulkSetOfficeDays(dto, req.user.id ?? req.user.userId);
  }

  /** GET /attendance/staff-logins?date=YYYY-MM-DD — staff login activity for a date */
  @Get('staff-logins')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isAttendanceAccess')
  @Roles(...READ_ROLES)
  async getStaffLogins(@Query('date') date?: string) {
    const target = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    return this.attendanceService.getStaffLoginsForDate(target);
  }

  /** GET /attendance/staff-logins-monthly?startDate=&endDate= — all non-tech staff with lastLogin for monthly grid */
  @Get('staff-logins-monthly')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isAttendanceAccess')
  @Roles(...READ_ROLES)
  async getStaffLoginsMonthly(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start =
      startDate ||
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const end =
      endDate ||
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    return this.attendanceService.getStaffLoginsMonthly(start, end);
  }
}
