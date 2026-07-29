import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SecurityConfigService } from './security-config.service';
import { SecurityConfig } from './entities/security-config.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { RequireCapability } from '../../common/decorators/require-capability.decorator';

@ApiTags('users')
@Controller('users/security-config')
@UseGuards(JwtAuthGuard, CapabilityGuard)
export class SecurityConfigController {
  constructor(private readonly securityConfigService: SecurityConfigService) {}

  @Get()
  @RequireCapability('isSecuritySettingsAccess')
  async getConfig(): Promise<SecurityConfig> {
    return this.securityConfigService.getConfig();
  }

  @Put()
  @RequireCapability('isSecuritySettingsAccess')
  async updateConfig(
    @Body() body: { defaultPassword?: string; mfaTestMode?: boolean; vaptMode?: boolean; appMode?: string },
  ): Promise<SecurityConfig> {
    return this.securityConfigService.updateConfig(body);
  }
}
