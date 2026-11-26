import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import { RequireCapability } from '../../common/decorators/require-capability.decorator';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DemoModeService } from './demo-mode.service';

class EnableDemoDto {
  @IsInt() @Min(1) requesterId: number;
  @IsInt() @Min(1) technicianId: number;
}

@Controller('demo-mode')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability('isSecuritySettingsAccess')
export class DemoModeController {
  constructor(private readonly mode: DemoModeService) {}

  @Get()
  get() { return this.mode.getState(); }

  @Post()
  enable(@Body() body: EnableDemoDto, @Req() request: { user: { id: number } }) {
    return this.mode.enable(body.requesterId, body.technicianId, request.user.id);
  }

  @Delete()
  disable() { return this.mode.disable(); }
}
