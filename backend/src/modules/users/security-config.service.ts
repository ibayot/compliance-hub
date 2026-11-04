import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SecurityConfig } from './entities/security-config.entity';
import { Unit } from '../units/entities/unit.entity';
import { UpdateSecurityConfigDto } from './dto/update-security-config.dto';

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
        idleLockMinutes: 15,
        outboundEmailUnitRestrictionEnabled: false,
        outboundEmailAllowedUnitIds: [],
        allowedEmailDomains: SecurityConfigService.DEFAULT_ALLOWED_EMAIL_DOMAINS,
      });
      await this.configRepository.save(config);
    }
    if (!Array.isArray(config.allowedEmailDomains) || config.allowedEmailDomains.length === 0) {
      config.allowedEmailDomains = [...SecurityConfigService.DEFAULT_ALLOWED_EMAIL_DOMAINS];
    }
    if (!Number.isInteger(config.idleLockMinutes) || config.idleLockMinutes < 1 || config.idleLockMinutes > 1440) {
      config.idleLockMinutes = 15;
    }
    return config;
  }

  async getEmailUnitOptions(): Promise<Array<Pick<Unit, 'id' | 'name' | 'active'>>> {
    return this.configRepository.manager.getRepository(Unit).find({ select: { id: true, name: true, active: true }, order: { name: 'ASC' } });
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

  async updateConfig(dto: UpdateSecurityConfigDto): Promise<SecurityConfig> {
    if (dto.idleLockMinutes !== undefined &&
      (!Number.isInteger(dto.idleLockMinutes) || dto.idleLockMinutes < 1 || dto.idleLockMinutes > 1440)) {
      throw new BadRequestException('Idle password prompt must be a whole number from 1 to 1440 minutes.');
    }
    const config = await this.getConfig();
    if (dto.outboundEmailUnitRestrictionEnabled !== undefined && typeof dto.outboundEmailUnitRestrictionEnabled !== 'boolean') throw new BadRequestException('The email unit restriction must be true or false.');
    if (dto.outboundEmailAllowedUnitIds !== undefined) {
      const ids = dto.outboundEmailAllowedUnitIds;
      if (!Array.isArray(ids) || ids.length > 1000 || ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length) throw new BadRequestException('Select valid, unique email unit IDs.');
      const units = ids.length ? await this.configRepository.manager.getRepository(Unit).findBy({ id: In(ids) }) : [];
      if (units.length !== ids.length || units.some(unit => !unit.active && !config.outboundEmailAllowedUnitIds?.includes(unit.id))) throw new BadRequestException('Some selected email units are unavailable. Reload the unit list and review the selection.');
      config.outboundEmailAllowedUnitIds = [...ids].sort((a,b) => a-b);
    }
    if (dto.outboundEmailUnitRestrictionEnabled !== undefined) config.outboundEmailUnitRestrictionEnabled = dto.outboundEmailUnitRestrictionEnabled;
    if (dto.idleLockMinutes !== undefined) config.idleLockMinutes = dto.idleLockMinutes;
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
