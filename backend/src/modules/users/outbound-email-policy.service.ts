import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import { SecurityConfig } from './entities/security-config.entity';
import { User } from './entities/user.entity';
import { RoleCapability } from './entities/role-capability.entity';

export class OutboundEmailRecipientDto {
  @IsEmail() @MaxLength(255) recipientEmail: string;
  @IsOptional() @IsIn(['routine', 'security']) purpose?: 'routine' | 'security';
}

export type OutboundEmailDecision = {
  allowed: boolean;
  reason: 'restriction_disabled' | 'unit_allowed' | 'security_admin_exempt' | 'no_units_selected' | 'recipient_not_eligible' | 'unit_not_allowed' | 'policy_unavailable';
  recipientUserId?: number;
};

@Injectable()
export class OutboundEmailPolicyService {
  constructor(
    @InjectRepository(SecurityConfig) private readonly configRepository: Repository<SecurityConfig>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  private getPolicy(): Promise<SecurityConfig | null> {
    return this.configRepository.findOne({
      where: { id: 1 },
      select: { id: true, outboundEmailUnitRestrictionEnabled: true, outboundEmailAllowedUnitIds: true },
    });
  }

  private async evaluateApproval(user: User, config: SecurityConfig, exemptSecurityManagers: boolean): Promise<OutboundEmailDecision> {
    if (exemptSecurityManagers) {
      // Read persisted authority: stale JWT claims or role-name assumptions cannot grant the exemption.
      const capability = await this.configRepository.manager.getRepository(RoleCapability).findOne({
        where: { roleValue: user.role }, select: { isSecuritySettingsAccess: true },
      });
      const grant: unknown = capability?.isSecuritySettingsAccess;
      if (grant === true || grant === 1) return { allowed: true, reason: 'security_admin_exempt', recipientUserId: user.id };
    }
    const allowedIds = config.outboundEmailAllowedUnitIds;
    if (!Array.isArray(allowedIds)) return { allowed: false, reason: 'policy_unavailable' };
    if (allowedIds.length === 0) return { allowed: false, reason: 'no_units_selected', recipientUserId: user.id };
    const allowed = user.units?.some(unit => unit.active && allowedIds.includes(unit.id)) === true;
    return { allowed, reason: allowed ? 'unit_allowed' : 'unit_not_allowed', recipientUserId: user.id };
  }

  async decideAccountAccess(userId: number): Promise<OutboundEmailDecision> {
    const config = await this.getPolicy();
    if (!config || typeof config.outboundEmailUnitRestrictionEnabled !== 'boolean') return { allowed: false, reason: 'policy_unavailable' };
    const user = await this.usersRepository.findOne({ where: { id: userId, active: true }, relations: ['units'] });
    if (!user) return { allowed: false, reason: 'recipient_not_eligible' };
    if (!config.outboundEmailUnitRestrictionEnabled) return { allowed: true, reason: 'restriction_disabled', recipientUserId: user.id };
    return this.evaluateApproval(user, config, true);
  }

  async assertAccountAccess(userId: number): Promise<void> {
    let decision: OutboundEmailDecision;
    try { decision = await this.decideAccountAccess(userId); }
    catch { throw new ServiceUnavailableException('Application access could not be verified. Please try again.'); }
    if (decision.reason === 'policy_unavailable') throw new ServiceUnavailableException('Application access could not be verified. Please try again.');
    if (!decision.allowed) throw new UnauthorizedException({
      statusCode: 401, code: 'UNIT_ACCESS_NOT_APPROVED',
      message: 'Application access is not approved for your account. Please contact your administrator.',
    });
  }

  async decide(recipientEmail: string, purpose: 'routine' | 'security' = 'routine'): Promise<OutboundEmailDecision> {
    const config = await this.getPolicy();
    if (!config) return { allowed: false, reason: 'policy_unavailable' };
    if (config.outboundEmailUnitRestrictionEnabled === false) return { allowed: true, reason: 'restriction_disabled' };
    if (config.outboundEmailUnitRestrictionEnabled !== true || !Array.isArray(config.outboundEmailAllowedUnitIds)) return { allowed: false, reason: 'policy_unavailable' };
    const allowedIds = config.outboundEmailAllowedUnitIds;
    if (allowedIds.length === 0 && purpose !== 'security') return { allowed: false, reason: 'no_units_selected' };
    const email = recipientEmail.trim().toLowerCase();
    // Exact single-mailbox lookup; display names, comma lists and unknown recipients
    // cannot be used to smuggle another destination through a unit decision.
    const users = await this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.units', 'unit')
      .where('LOWER(user.email) = :email', { email })
      .andWhere('user.active = :active', { active: true })
      .getMany();
    if (users.length !== 1) return { allowed: false, reason: 'recipient_not_eligible' };
    return this.evaluateApproval(users[0], config, purpose === 'security');
  }
}
