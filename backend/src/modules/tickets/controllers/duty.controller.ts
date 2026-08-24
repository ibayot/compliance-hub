import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DutyExceptionType, DutyReservationStatus, DutyType } from '../entities/duty.entity';
import { DutyService } from '../services/duty.service';

class DutyLogDto {
  @IsDateString() dutyDate: string;
  @Type(() => Number) @IsInt() userId: number;
  @IsEnum(DutyType) dutyType: DutyType;
  @IsOptional() @IsString() @MaxLength(2000) remarks?: string;
}

class DutyExceptionDto {
  @IsDateString() exceptionDate: string;
  @Type(() => Number) @IsInt() userId: number;
  @IsOptional() @IsEnum(DutyType) dutyType?: DutyType;
  @IsEnum(DutyExceptionType) type: DutyExceptionType;
  @IsOptional() @IsString() @MaxLength(2000) remarks?: string;
}

class DutyRosterDto {
  @IsArray() @Type(() => Number) userIds: number[];
}

class DutyReservationDto {
  @IsDateString() meetingDate: string;
  @IsEnum(DutyType) venueType: DutyType;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsString() @MaxLength(255) purpose?: string;
  @IsOptional() @IsString() @MaxLength(2000) remarks?: string;
  @IsOptional() @IsEnum(DutyReservationStatus) status?: DutyReservationStatus;
}

@ApiTags('duties')
@Controller('duties')
@UseGuards(JwtAuthGuard)
export class DutyController {
  constructor(private readonly duty: DutyService) {}

  @Get('access') access(@Request() req: any) { return this.duty.getAccess(req.user); }
  @Get('dashboard') async dashboard(@Request() req: any, @Query('date') date?: string) { await this.duty.assertRead(req.user); return this.duty.getDashboard(date); }
  @Get('rotation') async rotation(@Request() req: any, @Query('date') date?: string) { await this.duty.assertRead(req.user); return this.duty.getRotation(date); }
  @Get('map') async map(@Request() req: any, @Query('year') year: string, @Query('month') month: string) { await this.duty.assertRead(req.user); return this.duty.getMap(Number(year), Number(month)); }
  @Post('reconcile') reconcile(@Request() req: any) { return this.duty.reconcile(req.user); }

  @Get('logs') async logs(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '10') {
    await this.duty.assertRead(req.user);
    return this.duty.listAssignments(Number(page), Number(limit));
  }
  @Post('logs') createLog(@Request() req: any, @Body() dto: DutyLogDto) { return this.duty.saveAssignment(req.user, dto); }
  @Patch('logs/:id') updateLog(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<DutyLogDto>) { return this.duty.saveAssignment(req.user, dto, id); }
  @Delete('logs/:id') deleteLog(@Request() req: any, @Param('id') id: string) { return this.duty.deleteAssignment(req.user, id); }

  @Get('exceptions') async exceptions(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '10') {
    await this.duty.assertRead(req.user);
    return this.duty.listExceptions(Number(page), Number(limit));
  }
  @Post('exceptions') createException(@Request() req: any, @Body() dto: DutyExceptionDto) { return this.duty.saveException(req.user, dto); }
  @Patch('exceptions/:id') updateException(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<DutyExceptionDto>) { return this.duty.saveException(req.user, dto, id); }
  @Delete('exceptions/:id') deleteException(@Request() req: any, @Param('id') id: string) { return this.duty.deleteException(req.user, id); }

  @Get('roster') async roster(@Request() req: any) { await this.duty.assertRead(req.user); return this.duty.getRoster(); }
  @Post('roster') replaceRoster(@Request() req: any, @Body() dto: DutyRosterDto) { return this.duty.replaceRoster(req.user, dto.userIds); }

  @Get('reservations') async reservations(@Request() req: any) { await this.duty.assertRead(req.user); return this.duty.listReservations(); }
  @Post('reservations') createReservation(@Request() req: any, @Body() dto: DutyReservationDto) { return this.duty.saveReservation(req.user, dto); }
  @Patch('reservations/:id') updateReservation(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<DutyReservationDto>) { return this.duty.saveReservation(req.user, dto, id); }
  @Delete('reservations/:id') deleteReservation(@Request() req: any, @Param('id') id: string) { return this.duty.deleteReservation(req.user, id); }
  @Post('coverages/:id/release') release(@Request() req: any, @Param('id') id: string) { return this.duty.releaseCoverage(req.user, id); }
  @Post('coverages/:id/activate') activate(@Request() req: any, @Param('id') id: string, @Body('userId') userId: number) { return this.duty.activateCoverage(req.user, id, Number(userId)); }
  @Post('coverages/:id/skip') skip(@Request() req: any, @Param('id') id: string, @Body('userId') userId: number) { return this.duty.skipCoverage(req.user, id, Number(userId)); }
}
