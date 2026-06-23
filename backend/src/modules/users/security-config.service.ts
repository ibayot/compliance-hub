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
      config = this.configRepository.create({ id: 1, defaultPassword: 'Changeme123!' });
      await this.configRepository.save(config);
    }
    return config;
  }

  async updateConfig(defaultPassword: string): Promise<SecurityConfig> {
    const config = await this.getConfig();
    config.defaultPassword = defaultPassword;
    return this.configRepository.save(config);
  }
}
