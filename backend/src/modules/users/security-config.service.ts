import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityConfig } from './entities/security-config.entity';

@Injectable()
export class SecurityConfigService {
  private readonly logger = new Logger(SecurityConfigService.name);

  constructor(
    @InjectRepository(SecurityConfig)
    private readonly configRepository: Repository<SecurityConfig>,
  ) {}

  async getConfig(): Promise<SecurityConfig> {
    let config = await this.configRepository.findOne({ where: { id: 1 } });
    if (!config) {
      // Create a default config if none exists
      config = this.configRepository.create({ id: 1, defaultPassword: 'Changeme123!@#' });
      await this.configRepository.save(config);
    }
    return config;
  }

  async updateConfig(dto: {
    defaultPassword?: string;
    mfaTestMode?: boolean;
    vaptMode?: boolean;
    appMode?: string;
  }): Promise<SecurityConfig> {
    const config = await this.getConfig();
    if (dto.defaultPassword !== undefined) config.defaultPassword = dto.defaultPassword;
    if (dto.mfaTestMode !== undefined) config.mfaTestMode = dto.mfaTestMode;
    if (dto.vaptMode !== undefined) {
      config.vaptMode = dto.vaptMode;
      // Propagate to runtime env so gateway DDoS middleware can check it
      process.env.VAPT_MODE = dto.vaptMode ? 'true' : 'false';
    }
    if (dto.appMode !== undefined) config.appMode = dto.appMode;
    return this.configRepository.save(config);
  }
}
