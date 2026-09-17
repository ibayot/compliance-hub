import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityConfig } from './entities/security-config.entity';

@Injectable()
export class SecurityConfigService {
  private readonly logger = new Logger(SecurityConfigService.name);

  static readonly DEFAULT_ALLOWED_EMAIL_DOMAINS = [
    'dswd.gov.ph',
    'gmail.com',
    'yahoo.com',
    'yahoomail.com',
    'hotmail.com',
    'rocketmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
  ];

  constructor(
    @InjectRepository(SecurityConfig)
    private readonly configRepository: Repository<SecurityConfig>,
  ) {}

  async getConfig(): Promise<SecurityConfig> {
    let config = await this.configRepository.findOne({ where: { id: 1 } });
    if (!config) {
      // Create a default config if none exists
      config = this.configRepository.create({
        id: 1,
        defaultPassword: 'Changeme123!@#',
        googleSignInEnabled: true,
        allowedEmailDomains: SecurityConfigService.DEFAULT_ALLOWED_EMAIL_DOMAINS,
      });
      await this.configRepository.save(config);
    }
    if (!Array.isArray(config.allowedEmailDomains) || config.allowedEmailDomains.length === 0) {
      config.allowedEmailDomains = [...SecurityConfigService.DEFAULT_ALLOWED_EMAIL_DOMAINS];
    }
    return config;
  }

  normalizeAllowedEmailDomains(domains: unknown): string[] {
    if (!Array.isArray(domains)) return [];
    return [...new Set(domains
      .map((domain) => String(domain ?? '').trim().toLowerCase().replace(/^@+/, ''))
      .filter((domain) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain))
    )].sort();
  }

  async isEmailDomainAllowed(email: string): Promise<boolean> {
    const domain = String(email ?? '').trim().toLowerCase().split('@').pop() || '';
    const config = await this.getConfig();
    return this.normalizeAllowedEmailDomains(config.allowedEmailDomains).includes(domain);
  }

  async updateConfig(dto: {
    defaultPassword?: string;
    mfaTestMode?: boolean;
    vaptMode?: boolean;
    appMode?: string;
    googleSignInEnabled?: boolean;
    allowedEmailDomains?: string[];
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
    if (dto.googleSignInEnabled !== undefined) config.googleSignInEnabled = dto.googleSignInEnabled;
    if (dto.allowedEmailDomains !== undefined) {
      const normalized = this.normalizeAllowedEmailDomains(dto.allowedEmailDomains);
      if (normalized.length === 0) {
        throw new BadRequestException('At least one valid allowed email domain is required.');
      }
      config.allowedEmailDomains = normalized;
    }
    return this.configRepository.save(config);
  }
}
