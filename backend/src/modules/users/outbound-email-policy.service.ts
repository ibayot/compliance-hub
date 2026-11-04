import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, MaxLength } from 'class-validator';
import { SecurityConfig } from './entities/security-config.entity';
import { User } from './entities/user.entity';

export class OutboundEmailRecipientDto {
  @IsEmail() @MaxLength(255) recipientEmail: string;
}

export type OutboundEmailDecision = {
  allowed: boolean;
  reason: 'restriction_disabled' | 'unit_allowed' | 'no_units_selected' | 'recipient_not_eligible' | 'unit_not_allowed' | 'policy_unavailable';
  recipientUserId?: number;
};

@Injectable()
export class OutboundEmailPolicyService {
  constructor(
    @InjectRepository(SecurityConfig) private readonly configRepository: Repository<SecurityConfig>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async decide(recipientEmail: string): Promise<OutboundEmailDecision> {
    const config = await this.configRepository.findOne({
      where: { id: 1 },
      select: { id: true, outboundEmailUnitRestrictionEnabled: true, outboundEmailAllowedUnitIds: true },
    });
    if (!config) return { allowed: false, reason: 'policy_unavailable' };
    if (config.outboundEmailUnitRestrictionEnabled === false) return { allowed: true, reason: 'restriction_disabled' };
    if (config.outboundEmailUnitRestrictionEnabled !== true || !Array.isArray(config.outboundEmailAllowedUnitIds)) return { allowed: false, reason: 'policy_unavailable' };
    const allowedIds = config.outboundEmailAllowedUnitIds;
    if (allowedIds.length === 0) return { allowed: false, reason: 'no_units_selected' };
    const email = recipientEmail.trim().toLowerCase();
    // Exact single-mailbox lookup; display names, comma lists and unknown recipients
    // cannot be used to smuggle another destination through a unit decision.
    const users = await this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.units', 'unit')
      .where('LOWER(user.email) = :email', { email })
      .andWhere('user.active = :active', { active: true })
      .getMany();
    if (users.length !== 1) return { allowed: false, reason: 'recipient_not_eligible' };
    const user = users[0];
    const allowed = user.units?.some(unit => unit.active && allowedIds.includes(unit.id)) === true;
    return { allowed, reason: allowed ? 'unit_allowed' : 'unit_not_allowed', recipientUserId: user.id };
  }
}
