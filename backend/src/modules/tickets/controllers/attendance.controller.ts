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
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import {
  AttendanceService,
  SetAttendanceDto,
  SetOfficeDayDto,
} from '../services/attendance.service';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';

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
@UseGuards(JwtAuthGuard, CapabilityGuard)
@UseInterceptors(AttendanceSseInterceptor)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly roleCapSvc: RoleCapabilitiesService,
  ) {}

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
  @RequireCapability('isAttendanceManage')
  @HttpCode(HttpStatus.OK)
  async setAttendance(@Body() dto: SetAttendanceDto, @Request() req: any) {
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
  @RequireCapability('isAttendanceManage')
  @HttpCode(HttpStatus.OK)
  async deleteAttendance(@Param('userId') userId: string, @Param('date') date: string, @Request() req: any) {
    return this.attendanceService.deleteAttendance(Number(userId), date);
  }


  /** GET /attendance/technicians?ticketType= — list technicians (for attendance management) */
  @Get('technicians')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isAttendanceAccess')

  async listTechnicians(@Query('ticketType') ticketType?: string, @Request() req?: any) {
    return this.attendanceService.listTechnicians(ticketType, req?.user?.role);
  }

  // ── Office Days ─────────────────────────────────────────────────────────

  /** GET /attendance/office-days?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD */
  @Get('office-days')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isAttendanceAccess')

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
  @RequireCapability('isAttendanceManage')
  @HttpCode(HttpStatus.OK)
  async setOfficeDay(@Body() dto: SetOfficeDayDto, @Request() req: any) {
    return this.attendanceService.setOfficeDay(dto, req.user.id ?? req.user.userId);
  }


  /** GET /attendance/staff-logins?date=YYYY-MM-DD — staff login activity for a date */
  @Get('staff-logins')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isAttendanceAccess')

  async getStaffLogins(@Query('date') date?: string) {
    const target = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    return this.attendanceService.getStaffLoginsForDate(target);
  }

  /** GET /attendance/staff-logins-monthly?startDate=&endDate= — all non-tech staff with lastLogin for monthly grid */
  @Get('staff-logins-monthly')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isAttendanceAccess')

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
