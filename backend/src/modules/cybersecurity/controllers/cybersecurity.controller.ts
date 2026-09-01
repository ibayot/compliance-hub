import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CybersecurityService } from '../services/cybersecurity.service';
import {
  CreateCybersecurityMetricDto,
  UpdateCybersecurityMetricDto,
} from '../dto/cybersecurity-metric.dto';

@ApiTags('cybersecurity')
@Controller('cybersecurity')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability('isIto')
export class CybersecurityController {
  constructor(private readonly cybersecurityService: CybersecurityService) {}

  @Get('metrics')
  @RequireCapability('isIto')
  async getAllMetrics() {
    return await this.cybersecurityService.findAll();
  }

  @Get('metrics/:id')
  @RequireCapability('isIto')
  async getMetric(@Param('id') id: number) {
    return await this.cybersecurityService.findOne(id);
  }

  @Post('metrics')
  @RequireCapability('isIto')
  async createMetric(@Body() createDto: CreateCybersecurityMetricDto) {
    return await this.cybersecurityService.create({
      ...createDto,
      last_checked: createDto.last_checked ? new Date(createDto.last_checked) : undefined,
    });
  }

  @Put('metrics/:id')
  @RequireCapability('isIto')
  async updateMetric(@Param('id') id: number, @Body() updateDto: UpdateCybersecurityMetricDto) {
    return await this.cybersecurityService.update(id, {
      ...updateDto,
      last_checked: updateDto.last_checked ? new Date(updateDto.last_checked) : undefined,
    });
  }

  @Delete('metrics/:id')
  @RequireCapability('isIto')
  async deleteMetric(@Param('id') id: number) {
    await this.cybersecurityService.delete(id);
    return { message: 'Metric deleted successfully' };
  }
}
