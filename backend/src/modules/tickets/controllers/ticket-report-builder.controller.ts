import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { TicketReportBuilderService } from '../services/ticket-report-builder.service';
import { assertKeys } from '../services/ticket-report-builder.contract';

@ApiTags('ticket-report-builder')
@ApiBearerAuth()
@Controller('tickets/report-builder')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability('isTicketReportsAccess')
export class TicketReportBuilderController {
  constructor(private readonly builder: TicketReportBuilderService) {}
  private actor(req: any) { return { id: Number(req.user?.id ?? req.user?.userId), role: req.user?.role ?? '' }; }

  @Get('templates')
  @Header('Cache-Control', 'no-store')
  templates(@Request() req: any) { return this.builder.listTemplates(this.actor(req)); }

  @Get('staff-options')
  @RequireCapability('isTicketReportsManage')
  @Header('Cache-Control', 'no-store')
  staffOptions(@Request() req: any) { return this.builder.staffOptions(this.actor(req)); }

  @Post('templates')
  create(@Request() req: any, @Body() body: unknown) { return this.builder.saveTemplate(this.actor(req), body); }

  @Patch('templates/:id')
  update(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.builder.saveTemplate(this.actor(req), body, id);
  }

  @Delete('templates/:id')
  @HttpCode(204)
  async remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Query() query: unknown) {
    assertKeys(query, ['revision']);
    await this.builder.deleteTemplate(this.actor(req), id, typeof query.revision === 'string' && /^\d+$/.test(query.revision) ? Number(query.revision) : NaN);
  }

  @Post('preview')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  preview(@Request() req: any, @Body() body: unknown) { return this.builder.generate(this.actor(req), body); }
}
