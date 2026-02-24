import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CybersecurityService } from '../services/cybersecurity.service';
import { CybersecurityMetric } from '../entities/cybersecurity-metric.entity';

@Controller('cybersecurity')
@UseGuards(JwtAuthGuard)
export class CybersecurityController {
  constructor(private readonly cybersecurityService: CybersecurityService) {}

  @Get('metrics')
  async getAllMetrics() {
    return await this.cybersecurityService.findAll();
  }

  @Get('metrics/:id')
  async getMetric(@Param('id') id: number) {
    return await this.cybersecurityService.findOne(id);
  }

  @Post('metrics')
  async createMetric(@Body() createDto: Partial<CybersecurityMetric>) {
    return await this.cybersecurityService.create(createDto);
  }

  @Put('metrics/:id')
  async updateMetric(@Param('id') id: number, @Body() updateDto: Partial<CybersecurityMetric>) {
    return await this.cybersecurityService.update(id, updateDto);
  }

  @Delete('metrics/:id')
  async deleteMetric(@Param('id') id: number) {
    await this.cybersecurityService.delete(id);
    return { message: 'Metric deleted successfully' };
  }
}
