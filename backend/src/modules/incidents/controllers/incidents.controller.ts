import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IncidentsService } from '../services/incidents.service';
import { SnapshotService } from '../services/snapshot.service';
import { Incident } from '../entities/incident.entity';

@ApiTags('incidents')
@Controller('incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly snapshotService: SnapshotService,
  ) {}

  @Post()
  async create(@Body() createDto: Partial<Incident>) {
    return await this.incidentsService.create(createDto);
  }

  @Get()
  async findAll() {
    return await this.incidentsService.findAll();
  }

  @Get('statistics')
  async getStatistics() {
    return await this.incidentsService.getStatistics();
  }

  @Get('today-stats')
  async getTodayStats() {
    const now = new Date();
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);

    return await this.incidentsService.getTodayStats(startTime, endTime);
  }

  @Get('period-stats')
  async getPeriodStats() {
    return await this.incidentsService.getPeriodStatistics();
  }

  @Get('snapshots/latest')
  async getLatestSnapshot() {
    return await this.snapshotService.getLatestSnapshot();
  }

  @Get('snapshots/:date')
  async getSnapshotsByDate(@Param('date') date: string) {
    return await this.snapshotService.getSnapshots(new Date(date));
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.incidentsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() updateDto: Partial<Incident>) {
    return await this.incidentsService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    await this.incidentsService.delete(id);
    return { message: 'Incident deleted successfully' };
  }
}
